
// import { create } from 'zustand';
// import { Buffer } from 'buffer';

// interface ChunkState {
//   chunkStore: {
//     id: string | null;
//     name: string;
//     totalChunks: number;
//     chunkArray: Buffer[];
//   } | null;

//   currentChunkSet: {
//     id: string | null;
//     totalChunks: number;
//     chunkArray: Buffer[];
//   } | null;

//   setChunkStore: (chunkStore: any) => void;
//   resetChunkStore: () => void;

//   setCurrentChunkSet: (currentChunkSet: any) => void;
//   resetCurrentChunkSet: () => void;
// }

// export const useChunkStore = create<ChunkState>(set => ({
//   chunkStore: null,
//   currentChunkSet: null,

//   setChunkStore: chunkStore =>
//     set(() => ({ chunkStore })),

//   resetChunkStore: () =>
//     set(() => ({ chunkStore: null })),

//   setCurrentChunkSet: currentChunkSet =>
//     set(() => ({ currentChunkSet })),

//   resetCurrentChunkSet: () =>
//     set(() => ({ currentChunkSet: null })),
// }));


import { create } from 'zustand';
import { Buffer } from 'buffer';

/* ---------- TYPES ---------- */

export interface ChunkStoreData {
  id: string | null;
  name: string;
  totalChunks: number;
  chunkArray: Buffer[];
}

export interface CurrentChunkSetData {
  id: string | null;
  totalChunks: number;
  chunkArray: Buffer[];
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

