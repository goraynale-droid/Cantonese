
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Transcription } from '../types';

// 编码工具
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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
  const dataInt16 = new Int16Array(data.buffer);
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

interface LiveChatViewProps {
  onClose: () => void;
}

const LiveChatView: React.FC<LiveChatViewProps> = ({ onClose }) => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputLevel, setInputLevel] = useState(0); 
  const [micError, setMicError] = useState<string | null>(null);
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 初始化音量分析循环
  const startLevelAnalysis = (analyser: AnalyserNode) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      setInputLevel(Math.min(100, average * 2)); // 映射到 0-100
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  };

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initLiveSession = async () => {
      try {
        setIsConnecting(true);
        setMicError(null);

        // 1. 请求权限
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
        } catch (e) {
          setMicError("无法访问麦克风，请检查浏览器权限设置。");
          return;
        }
        
        // 2. 初始化上下文 (必须在用户交互后的事件流中)
        audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        if (audioContextInRef.current.state === 'suspended') {
          await audioContextInRef.current.resume();
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: `你是“粤语学堂”的AI导师。你会识别普通话和粤语。
            如果是问发音：用标准粤语读，给粤拼。
            如果是聊天：用地道港式粤语交流。
            在回复文本中，对于关键词，请标注粤拼，如：“你好（nei5 hou2）”。`,
          },
          callbacks: {
            onopen: () => {
              setIsConnecting(false);
              if (!stream || !audioContextInRef.current) return;

              const ctx = audioContextInRef.current;
              const source = ctx.createMediaStreamSource(stream);
              
              // 分析器用于视觉反馈
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 256;
              source.connect(analyser);
              startLevelAnalysis(analyser);

              // 处理器用于发送音频
              const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                  const s = Math.max(-1, Math.min(1, inputData[i]));
                  int16[i] = s < 0 ? s * 32768 : s * 32767;
                }
                
                const pcmBlob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                
                sessionPromise.then(s => {
                  try { s.sendRealtimeInput({ media: pcmBlob }); } catch (err) {}
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(ctx.destination);
            },
            onmessage: async (msg) => {
              const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioData && audioContextOutRef.current) {
                setIsSpeaking(true);
                const ctx = audioContextOutRef.current;
                if (ctx.state === 'suspended') await ctx.resume();
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                try {
                  const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(ctx.destination);
                  source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) setIsSpeaking(false);
                  };
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);
                } catch (e) {}
              }

              if (msg.serverContent?.inputTranscription) {
                const text = msg.serverContent.inputTranscription.text;
                if (text.trim()) {
                  setTranscriptions(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.type === 'user' && (Date.now() - last.timestamp < 3000)) {
                      return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                    }
                    return [...prev, { text, type: 'user', timestamp: Date.now() }];
                  });
                }
              }
              if (msg.serverContent?.outputTranscription) {
                const text = msg.serverContent.outputTranscription.text;
                if (text.trim()) {
                  setTranscriptions(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.type === 'ai' && (Date.now() - last.timestamp < 5000)) {
                      return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                    }
                    return [...prev, { text, type: 'ai', timestamp: Date.now() }];
                  });
                }
              }
              
              if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsSpeaking(false);
              }
            },
            onclose: () => onClose(),
            onerror: () => setIsConnecting(false),
          },
        });
        sessionRef.current = await sessionPromise;
      } catch (err) {
        setMicError("连接失败，请刷新页面重试。");
        setIsConnecting(false);
      }
    };

    initLiveSession();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      sessionRef.current?.close();
      audioContextInRef.current?.close();
      audioContextOutRef.current?.close();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col text-white animate-in fade-in zoom-in duration-300">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${micError ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
          </div>
          <span className="font-bold tracking-wide">AI 实时对话</span>
        </div>
        <button 
          onClick={onClose}
          className="bg-slate-800 hover:bg-red-500/20 hover:text-red-400 p-2 rounded-full transition-all active:scale-90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col-reverse">
        <div className="space-y-6">
          {micError ? (
            <div className="text-center py-20 px-6">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-400 font-medium">{micError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-6 bg-slate-800 px-6 py-2 rounded-xl text-sm hover:bg-slate-700 transition-colors"
              >
                刷新页面重试
              </button>
            </div>
          ) : transcriptions.length === 0 && !isConnecting && (
            <div className="text-center py-20 opacity-30 select-none animate-in fade-in duration-1000">
              <p className="text-xl italic">“喂？AI导师，我想学粤语...”</p>
              <p className="text-sm mt-2">试试直接对他说话</p>
            </div>
          )}
          
          {transcriptions.map((t, i) => (
            <div 
              key={t.timestamp + i} 
              className={`flex flex-col ${t.type === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl ${
                t.type === 'user' 
                ? 'bg-slate-800 text-slate-200 rounded-tr-none' 
                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 rounded-tl-none'
              }`}>
                <p className="text-lg leading-relaxed whitespace-pre-wrap">{t.text}</p>
              </div>
              <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest opacity-60">
                {t.type === 'user' ? '你' : 'AI 导师'}
              </span>
            </div>
          ))}
          
          {isConnecting && !micError && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <div className="w-16 h-16 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
              <p className="font-medium tracking-wide animate-pulse">正在接通 AI 导师...</p>
            </div>
          )}
        </div>
      </div>

      {/* Visualizer & Mic Feedback */}
      {!micError && (
        <div className="p-8 flex flex-col items-center justify-center border-t border-slate-800 bg-slate-900/90 backdrop-blur-xl">
          <div className="flex items-center gap-12 w-full max-w-md justify-center">
            
            {/* My Voice (Left) */}
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="h-10 flex items-end gap-1">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 rounded-full transition-all duration-75 ${inputLevel > 5 ? 'bg-emerald-400' : 'bg-slate-700'}`}
                    style={{ height: `${Math.max(4, inputLevel * (1.2 - Math.abs(2-i)*0.2))}px` }}
                  ></div>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">我的音量</span>
            </div>

            {/* Mic Button Icon */}
            <div className={`relative p-5 rounded-full transition-all duration-300 ${
              inputLevel > 5 ? 'bg-emerald-500/20 ring-4 ring-emerald-500/10' : 'bg-slate-800'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${inputLevel > 5 ? 'text-emerald-500' : 'text-slate-600'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </div>

            {/* AI Voice (Right) */}
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="h-10 flex items-end gap-1">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 rounded-full transition-all duration-150 ${isSpeaking ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    style={{ 
                      height: isSpeaking ? `${20 + Math.random() * 20}px` : '4px',
                      animationDelay: `${i * 0.1}s` 
                    }}
                  ></div>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">AI 响应</span>
            </div>
          </div>
          
          <p className="mt-8 text-slate-400 text-sm font-medium h-5">
            {isConnecting ? '' : isSpeaking ? 'AI 正在回应...' : inputLevel > 5 ? '正在倾听...' : '请开始说话 (请确保麦克风已开启)'}
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveChatView;
