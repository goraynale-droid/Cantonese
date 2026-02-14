
import React from 'react';

const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-emerald-500 font-bold text-xs uppercase tracking-widest">
          粤
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-slate-600 font-medium text-lg">正在准备学习内容...</h3>
        <p className="text-slate-400 text-sm">正在联系您的专属粤语导师</p>
      </div>
    </div>
  );
};

export default LoadingState;
