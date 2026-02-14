
import React, { useState } from 'react';
import { CantoneseSentence } from '../types';
import { speakCantonese } from '../services/geminiService';

interface SentenceCardProps {
  sentence: CantoneseSentence;
  isTraditional: boolean;
}

const SentenceCard: React.FC<SentenceCardProps> = ({ sentence, isTraditional }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMeaning, setShowMeaning] = useState(true);

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    // 现在的 speakCantonese 内部自带了双重保障逻辑
    await speakCantonese(sentence.traditional);
    
    setIsPlaying(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-emerald-100 transition-all hover:shadow-2xl flex flex-col h-full relative">
      <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
        {/* Jyutping Annotation */}
        <div className="mb-4">
          <span className="jyutping text-emerald-600 font-medium tracking-wider text-sm md:text-base bg-emerald-50 px-3 py-1 rounded-full">
            {sentence.jyutping}
          </span>
        </div>

        {/* Character Display */}
        <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-8 leading-relaxed font-serif">
          {isTraditional ? sentence.traditional : sentence.simplified}
        </h2>

        {/* Translation Section */}
        <div className={`transition-opacity duration-300 ${showMeaning ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-xl text-slate-500 font-medium mb-2">
            {sentence.meaning}
          </p>
          {sentence.notes && (
            <p className="text-sm text-slate-400 italic">
              注：{sentence.notes}
            </p>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-50 p-6 flex justify-between items-center border-t border-slate-100">
        <button 
          onClick={() => setShowMeaning(!showMeaning)}
          className="text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            {showMeaning ? (
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
            ) : (
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            )}
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          {showMeaning ? '隐藏翻译' : '显示翻译'}
        </button>

        <button 
          onClick={handlePlay}
          disabled={isPlaying}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isPlaying 
            ? 'bg-emerald-100 text-emerald-400' 
            : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-110 active:scale-95 shadow-emerald-200'
          }`}
        >
          {isPlaying ? (
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-emerald-400 animate-bounce"></div>
              <div className="w-1 h-6 bg-emerald-400 animate-bounce [animation-delay:-0.1s]"></div>
              <div className="w-1 h-4 bg-emerald-400 animate-bounce [animation-delay:-0.2s]"></div>
            </div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 14.657a8.962 8.962 0 000-12.728 1 1 0 111.414 1.414 6.962 6.962 0 010 9.899 1 1 0 11-1.414 1.414zM12.535 12.535a4.975 4.975 0 000-7.07 1 1 0 011.414 1.414 2.975 2.975 0 010 4.242 1 1 0 11-1.414 1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default SentenceCard;
