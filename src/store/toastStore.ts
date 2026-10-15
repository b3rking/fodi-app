import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastData {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastState {
  toast: ToastData | null;
  show: (message: string, action?: ToastAction) => void;
  dismiss: () => void;
}

let nextId = 1;

/** File de notification : un seul toast visible à la fois, auto-masqué. */
export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message, action) => set({ toast: { id: nextId++, message, action } }),
  dismiss: () => set({ toast: null }),
}));
