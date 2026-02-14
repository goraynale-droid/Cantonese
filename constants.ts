
import { Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'drama_moonlight', name: '家好月圆', icon: '📺', description: '《溏心风暴》经典金句，学习最地道的家族争产式对白' },
  { id: 'daily', name: '日常用语', icon: '👋', description: '最基本的问候与交流' },
  { id: 'food', name: '茶餐厅点餐', icon: '🥢', description: '地道的饮食文化用语' },
  { id: 'travel', name: '交通出行', icon: '🚕', description: '问路、搭车等旅行必备' },
  { id: 'shopping', name: '购物砍价', icon: '🛍️', description: '商场与街市的实战对话' },
  { id: 'slang', name: '地道俚语', icon: '🔥', description: '让你的粤语瞬间变地道' }
];

export const SYSTEM_PROMPT = `You are a professional Cantonese linguistic expert and teacher, specializing in Hong Kong TV drama scripts.
Your task is to generate natural, standard Cantonese sentences for learners.

If the category provided is a TV show (like '家好月圆'), you MUST:
1. Generate 5 consecutive or highly representative dialogue lines from that specific show.
2. Include the character's name in the 'notes' field (e.g., "荷妈对Jo鲍说").
3. Ensure the tone matches the character's personality in the show.

For all categories, return a JSON array of 5 objects:
- traditional: Traditional Chinese characters (Standard in HK/Macau)
- simplified: Simplified Chinese characters
- jyutping: Standard Jyutping romanization (with tones 1-6)
- meaning: Mandarin Chinese translation
- notes: Context or character info (e.g., "荷妈：...")

Ensure the Jyutping is accurate and matches the Cantonese pronunciation perfectly.`;
