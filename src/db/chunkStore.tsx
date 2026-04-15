import { create } from 'zustand';
import { Buffer } from 'buffer';

/* ---------- TYPES ---------- */

export interface ChunkStoreData {
  id: string | null;
  name: string;
  size?: any;
  mimeType?: string;
  totalChunks: number;
  chunkArray: Buffer[];
  stream?: any;
}

export interface CurrentChunkSetData {
  id: string | null;
  totalChunks: number;
  chunkArray: Buffer[];

  filePath?: string;
  fileSize?: number;
  chunkSize?: number;
  readStream?: any;
  fileData?: string;
  name?: string;
  lastChunkNo?: number;
}

interface ChunkState {
  chunkStore: ChunkStoreData | null;
  currentChunkSet: CurrentChunkSetData | null;
  isPaused: boolean;
  activeFileTransferredBytes: number;

  setChunkStore: (data: ChunkStoreData | null) => void;
  resetChunkStore: () => void;

  setCurrentChunkSet: (data: Partial<CurrentChunkSetData> | null) => void;
  resetCurrentChunkSet: () => void;

  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  setActiveFileTransferredBytes: (bytes: number | ((prev: number) => number)) => void;
}

/* ---------- STORE ---------- */

export const useChunkStore = create<ChunkState>(set => ({
  chunkStore: null,
  currentChunkSet: null,
  isPaused: false,
  activeFileTransferredBytes: 0,

  setChunkStore: data => set({ chunkStore: data }),

  resetChunkStore: () => set({ chunkStore: null }),

  setCurrentChunkSet: data =>
    set(state => ({
      currentChunkSet:
        data === null
          ? null
          : state.currentChunkSet
          ? { ...state.currentChunkSet, ...data }
          : (data as CurrentChunkSetData),
    })),

  resetCurrentChunkSet: () => set({ currentChunkSet: null }),

  togglePause: () => set(state => ({ isPaused: !state.isPaused })),
  setPaused: (paused: boolean) => set({ isPaused: paused }),
  setActiveFileTransferredBytes: bytes =>
    set(state => ({
      activeFileTransferredBytes:
        typeof bytes === 'function'
          ? bytes(state.activeFileTransferredBytes)
          : bytes,
    })),
}));
