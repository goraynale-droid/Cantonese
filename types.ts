
export interface CantoneseSentence {
  traditional: string;
  simplified: string;
  jyutping: string;
  meaning: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PRACTICING = 'PRACTICING',
  LIVE_CHAT = 'LIVE_CHAT',
  ERROR = 'ERROR'
}

export interface Transcription {
  text: string;
  type: 'user' | 'ai';
  timestamp: number;
}
