
import { create } from 'zustand';

interface FigmaState {
  fileKey: string;
  token: string;
  html: string;
  css: string;
  setFileKey: (key: string) => void;
  setToken: (token: string) => void;
  setResult: (html: string, css: string) => void;
}

export const useFigmaStore = create<FigmaState>((set) => ({
  fileKey: '',
  token: '',
  html: '',
  css: '',
  setFileKey: (key) => set({ fileKey: key }),
  setToken: (token) => set({ token }),
  setResult: (html, css) => set({ html, css }),
}));

