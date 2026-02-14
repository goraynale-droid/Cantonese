
import React, { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from './constants';
import { AppStatus, CantoneseSentence, Category } from './types';
import { fetchSentences } from './services/geminiService';
import SentenceCard from './components/SentenceCard';
import LoadingState from './components/LoadingState';
import LiveChatView from './components/LiveChatView';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [sentences, setSentences] = useState<CantoneseSentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTraditional, setIsTraditional] = useState(true);

  const startPractice = useCallback(async (category: Category) => {
    setStatus(AppStatus.LOADING);
    setCurrentCategory(category);
    setCurrentIndex(0);
    try {
      const data = await fetchSentences(category.name);
      setSentences(data);
      setStatus(AppStatus.PRACTICING);
    } catch (error) {
      console.error(error);
      setStatus(AppStatus.ERROR);
    }
  }, []);

  const nextSentence = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setStatus(AppStatus.IDLE);
    }
  };

  const prevSentence = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => setStatus(AppStatus.IDLE)}
          >
            <div className="bg-emerald-500 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200">
              粤
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">粤语学堂</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium">
              <button 
                onClick={() => setIsTraditional(true)}
                className={`px-3 py-1.5 rounded-md transition-all ${isTraditional ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
              >
                繁
              </button>
              <button 
                onClick={() => setIsTraditional(false)}
                className={`px-3 py-1.5 rounded-md transition-all ${!isTraditional ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
              >
                简
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-8">
        {status === AppStatus.IDLE && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Live Mode Promo */}
            <div className="mb-10 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-emerald-200/20 group">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  新功能: 实时交流
                </div>
                <h2 className="text-3xl font-bold mb-3">AI 粤语导师实时通话</h2>
                <p className="text-slate-400 mb-6 max-w-md">无论是询问“这个用粤语怎么说”，还是想找人练练口语，AI导师随时待命。支持普通话/粤语双语识别。</p>
                <button 
                  onClick={() => setStatus(AppStatus.LIVE_CHAT)}
                  className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-emerald-400 hover:text-white transition-all transform active:scale-95 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  立即开始对话
                </button>
              </div>
              {/* Background Glow */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-all"></div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">学习关卡</h2>
              <p className="text-slate-500">挑选一个你感兴趣的场景开始沉浸式练习</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => startPractice(cat)}
                  className={`bg-white p-6 rounded-2xl shadow-sm border text-left hover:shadow-md transition-all group relative overflow-hidden ${
                    cat.id.startsWith('drama') ? 'border-amber-200 hover:border-amber-400' : 'border-slate-100 hover:border-emerald-300'
                  }`}
                >
                  {cat.id.startsWith('drama') && (
                    <div className="absolute top-0 right-0 bg-amber-400 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">
                      剧集素材
                    </div>
                  )}
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{cat.icon}</div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{cat.name}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {status === AppStatus.LIVE_CHAT && (
          <LiveChatView onClose={() => setStatus(AppStatus.IDLE)} />
        )}

        {status === AppStatus.LOADING && <LoadingState />}

        {status === AppStatus.PRACTICING && currentCategory && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setStatus(AppStatus.IDLE)}
                className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回首页
              </button>
              <div className={`text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                currentCategory.id.startsWith('drama') ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {currentCategory.name}
              </div>
              <div className="text-slate-400 text-sm font-medium">
                {currentIndex + 1} / {sentences.length}
              </div>
            </div>

            <div className="relative h-[480px]">
               <SentenceCard 
                key={currentIndex}
                sentence={sentences[currentIndex]} 
                isTraditional={isTraditional} 
              />
            </div>

            <div className="mt-8 flex justify-between items-center gap-4">
              <button 
                onClick={prevSentence}
                disabled={currentIndex === 0}
                className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-all border-2 ${
                  currentIndex === 0 
                  ? 'border-slate-200 text-slate-300' 
                  : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50 active:scale-95'
                }`}
              >
                上一句
              </button>
              <button 
                onClick={nextSentence}
                className="flex-[2] py-4 px-6 rounded-2xl bg-slate-800 text-white font-bold hover:bg-slate-900 active:scale-95 shadow-lg shadow-slate-200 transition-all"
              >
                {currentIndex === sentences.length - 1 ? '完成练习' : '下一句'}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-10 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  currentCategory.id.startsWith('drama') ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${((currentIndex + 1) / sentences.length) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🏜️</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">哎呀，网络出了点问题</h3>
            <p className="text-slate-500 mb-8">暂时无法连接到翻译引擎，请稍后再试。</p>
            <button 
              onClick={() => setStatus(AppStatus.IDLE)}
              className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all"
            >
              重试一下
            </button>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-auto pt-12 pb-6 text-center text-slate-400 text-xs">
        <p>© 2024 粤语学堂 (Cantonese Master) · 由 Gemini AI 驱动</p>
        <p className="mt-2">标准粤语拼音 (Jyutping) 标注系统</p>
      </footer>
    </div>
  );
};

export default App;
