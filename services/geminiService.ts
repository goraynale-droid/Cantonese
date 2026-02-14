
import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { CantoneseSentence } from "../types";
import { SYSTEM_PROMPT } from "../constants";

// 音频解码工具
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  if (!data || data.byteLength === 0) throw new Error("Audio data is empty");
  const validLength = Math.floor(data.byteLength / 2) * 2;
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, validLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

let globalAudioCtx: AudioContext | null = null;

export const fetchSentences = async (category: string): Promise<CantoneseSentence[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = category.includes('月圆') 
    ? `请提供5句《溏心风暴之家好月圆》中的经典台词或对话片段。请确保包含角色语气，并在notes中注明角色。格式要求为JSON。`
    : `Generate 5 common Cantonese sentences for the category: ${category}. Return JSON format.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            traditional: { type: Type.STRING },
            simplified: { type: Type.STRING },
            jyutping: { type: Type.STRING },
            meaning: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["traditional", "simplified", "jyutping", "meaning"]
        }
      }
    }
  });

  return JSON.parse(response.text.trim());
};

/**
 * 备选方案：使用浏览器原生语音合成
 */
const speakWithWebSpeech = (text: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve(false);
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const cantoneseVoice = voices.find(v => v.lang.includes('HK') || v.lang.toLowerCase().includes('cantonese'));
    
    if (cantoneseVoice) {
      utterance.voice = cantoneseVoice;
    } else {
      utterance.lang = 'zh-HK';
    }
    
    utterance.rate = 0.9;
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
};

export const speakCantonese = async (text: string): Promise<{success: boolean; reason?: string}> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    if (globalAudioCtx.state === 'suspended') {
      await globalAudioCtx.resume();
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      },
    });

    const candidate = response.candidates?.[0];
    let base64Audio: string | undefined;
    
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          base64Audio = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Audio) {
      const audioBuffer = await decodeAudioData(decode(base64Audio), globalAudioCtx, 24000, 1);
      const source = globalAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(globalAudioCtx.destination);
      source.start();
      return { success: true };
    }
  } catch (error) {
    console.warn("Gemini TTS 调用失败，尝试兜底:", error);
  }

  const webSpeechSuccess = await speakWithWebSpeech(text);
  return { success: webSpeechSuccess };
};
