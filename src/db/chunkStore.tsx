

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
}

export interface CurrentChunkSetData {
  id: string | null;
  totalChunks: number;
  chunkArray: Buffer[];
  // Streaming fields — set when sending so we read from disk, not RAM
  filePath?: string;
  fileSize?: number;
  chunkSize?: number;
}

interface ChunkState {
  chunkStore: ChunkStoreData | null;
  currentChunkSet: CurrentChunkSetData | null;

  setChunkStore: (data: ChunkStoreData | null) => void;
  resetChunkStore: () => void;

  setCurrentChunkSet: (data: CurrentChunkSetData | null) => void;
  resetCurrentChunkSet: () => void;
}

/* ---------- STORE ---------- */

export const useChunkStore = create<ChunkState>((set) => ({
  chunkStore: null,
  currentChunkSet: null,

  setChunkStore: (data) =>
    set({ chunkStore: data }),

  resetChunkStore: () =>
    set({ chunkStore: null }),

  setCurrentChunkSet: (data) =>
    set({ currentChunkSet: data }),

  resetCurrentChunkSet: () =>
    set({ currentChunkSet: null }),
}));

