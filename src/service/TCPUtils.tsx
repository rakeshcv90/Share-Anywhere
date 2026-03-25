import { Alert, Platform } from 'react-native';
import { useChunkStore } from '../db/chunkStore';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Buffer } from 'buffer';

export const receiveFileAck = async (
  data: any,
  socket: any,
  setReceivedFiles: any,
  setActiveFileTotalSize: any,
  setActiveFileTransferredBytes: any,
) => {
  const { chunkStore, setChunkStore } = useChunkStore.getState();

  if (chunkStore) {
    Alert.alert('Please wait', 'A file is already being received.');
    return;
  }

  // ✅ Update UI immediately BEFORE any async disk I/O
  setReceivedFiles((prev: any[]) => {
    const exists = prev.some(f => f.id === data.id);
    if (exists) {
      return prev.map(f => (f.id === data.id ? { ...f, ...data } : f));
    }
    return [...prev, data];
  });

  const basePath =
    Platform.OS === 'ios'
      ? RNFS.DocumentDirectoryPath
      : RNFS.ExternalDirectoryPath;

  const filePath = `${basePath}/.tmp_${data.name}`;

  // Use ReactNativeBlobUtil writeStream for high-performance sequential writing
  const stream = await ReactNativeBlobUtil.fs.writeStream(
    filePath,
    'base64',
    false,
  );

  setChunkStore({
    id: data.id,
    totalChunks: data.totalChunks,
    name: data.name,
    size: data.size,
    mimeType: data.mimeType,
    chunkArray: [],
    stream: stream,
  });
  setActiveFileTotalSize(data.size);
  setActiveFileTransferredBytes(0);

  if (!socket) return;

  socket.write(
    JSON.stringify({
      event: 'send_chunk_ack',
      chunkNo: 0,
      windowSize: 64,
    }) + '\n',
  );
};

// export const sendChunkAck = async (
//   startChunkIndex: number,
//   windowSize: number,
//   socket: any,
//   setTotalSentBytes: any,
//   setSentFiles: any,
//   setActiveFileTransferredBytes: any,
// ) => {
//   const { currentChunkSet, resetCurrentChunkSet } = useChunkStore.getState();

//   if (!currentChunkSet) return;

//   const { totalChunks } = currentChunkSet;

//   const { filePath, chunkSize } = currentChunkSet as any;
//   const end = Math.min(startChunkIndex + windowSize, totalChunks);
//   let accumulatedBytes = 0;

//   // PIPELINING: Start reading the first chunk immediately
//   let nextChunkPromise = RNFS.read(
//     filePath,
//     chunkSize,
//     startChunkIndex * chunkSize,
//     'base64',
//   );

//   for (let chunkIndex = startChunkIndex; chunkIndex < end; chunkIndex++) {
//     try {
//       // Yield once per window to keep UI thread alive
//       if (chunkIndex % 4 === 0 && chunkIndex !== startChunkIndex) {
//         await new Promise<void>(resolve => setImmediate(() => resolve()));
//       }

//       const base64Chunk = await nextChunkPromise;

//       // START READING THE NEXT CHUNK IMMEDIATELY (Parallel work)
//       if (chunkIndex + 1 < end) {
//         const nextPosition = (chunkIndex + 1) * chunkSize;
//         nextChunkPromise = RNFS.read(
//           filePath,
//           chunkSize,
//           nextPosition,
//           'base64',
//         );
//       }

//       const packet =
//         JSON.stringify({
//           event: 'receive_chunk_ack',
//           chunk: base64Chunk,
//           chunkNo: chunkIndex,
//           windowSize: windowSize,
//         }) + '\n';

//       socket.write(packet);

//       const byteLength = (base64Chunk.length * 3) / 4;
//       accumulatedBytes += byteLength;

//       if (
//         chunkIndex % 8 === 0 ||
//         chunkIndex + 1 === end ||
//         chunkIndex + 1 === totalChunks
//       ) {
//         const toUpdate = accumulatedBytes;
//         accumulatedBytes = 0;
//         setTotalSentBytes((prev: any) => prev + toUpdate);
//         setActiveFileTransferredBytes((prev: any) => prev + toUpdate);
//       }
//     } catch (err) {
//       console.log('--- sendChunkAck Error:', err);
//       break;
//     }
//   }

//   if (end === totalChunks) {
//     console.log('ALL CHUNKS SENT SUCCESSFULLY ✅');
//   }
// };

// export const receiveChunkAck = async (
//   chunk: string,
//   chunkNo: number,
//   socket: any,
//   setTotalReceivedBytes: any,
//   generateFile: () => Promise<void>,
//   setActiveFileTransferredBytes: any,
//   windowSize: number,
// ) => {
//   const { chunkStore } = useChunkStore.getState();

//   if (!chunkStore) return;

//   const basePath =
//     Platform.OS === 'ios'
//       ? RNFS.DocumentDirectoryPath
//       : RNFS.ExternalDirectoryPath;

//   const filePath = `${basePath}/.tmp_${chunkStore.name}`;
//   const byteLength = (chunk.length * 3) / 4;
//   const isLastChunk = chunkNo === chunkStore.totalChunks - 1;

//   // Write using high-performance stream if available
//   if (chunkStore.stream) {
//     await chunkStore.stream.write(chunk);
//   } else {
//     // Fallback to appendFile if stream isn't ready
//     await RNFS.appendFile(filePath, chunk, 'base64');
//   }

//   setTotalReceivedBytes((prev: any) => prev + byteLength);
//   setActiveFileTransferredBytes((prev: any) => prev + byteLength);

//   if (isLastChunk) {
//     console.log('STREAM COMPLETE ✅');
//     if (chunkStore.stream) {
//       try {
//         await chunkStore.stream.close();
//       } catch (e) {
//         console.log('Error closing stream:', e);
//       }
//     }
//     await generateFile();
//     return;
//   }

//   const nextChunkNo = chunkNo + 1;

//   // Only request next window at real window boundaries.
//   const isWindowEnd = nextChunkNo % windowSize === 0;

//   if (isWindowEnd) {
//     socket.write(
//       JSON.stringify({
//         event: 'send_chunk_ack',
//         chunkNo: nextChunkNo,
//         windowSize,
//       }) + '\n',
//     );
//   }
// };

export const receiveChunkAck = async (
  chunk: string,
  chunkNo: number,
  socket: any,
  setTotalReceivedBytes: any,
  generateFile: () => Promise<void>,
  setActiveFileTransferredBytes: any,
  windowSize: number,
) => {
  const { chunkStore } = useChunkStore.getState();
  if (!chunkStore) return;

  const byteLength = (chunk.length * 3) / 4;
  const isLastChunk = chunkNo === chunkStore.totalChunks - 1;

  // 🔥 DO NOT await every write (huge speed boost)
  if (chunkStore.stream) {
    chunkStore.stream.write(chunk);
  }

  setTotalReceivedBytes((prev: any) => prev + byteLength);
  setActiveFileTransferredBytes((prev: any) => prev + byteLength);

  if (isLastChunk) {
    console.log('STREAM COMPLETE ✅');

    try {
      await chunkStore.stream.close();
    } catch (e) {}

    await generateFile();
    return;
  }

  const nextChunkNo = chunkNo + 1;

  // 🔥 Request next window ONLY occasionally
  if (nextChunkNo % windowSize === 0) {
    socket.write(
      JSON.stringify({
        event: 'send_chunk_ack',
        chunkNo: nextChunkNo,
        windowSize,
      }) + '\n',
    );
  }
};

export const sendChunkAck = async (
  startChunkIndex: number,
  windowSize: number,
  socket: any,
  setTotalSentBytes: any,
  setSentFiles: any,
  setActiveFileTransferredBytes: any,
) => {
  const { currentChunkSet } = useChunkStore.getState();
  if (!currentChunkSet) return;

  const { totalChunks, filePath, chunkSize } = currentChunkSet as any;

  const end = Math.min(startChunkIndex + windowSize, totalChunks);

  let accumulatedBytes = 0;

  // 🔥 Preload multiple chunks (parallel read)
  const readPromises: Promise<string>[] = [];

  for (let i = startChunkIndex; i < end; i++) {
    readPromises.push(RNFS.read(filePath, chunkSize, i * chunkSize, 'base64'));
  }

  const chunks = await Promise.all(readPromises);

  // 🔥 Send ALL chunks without waiting
  for (let i = 0; i < chunks.length; i++) {
    const chunkIndex = startChunkIndex + i;
    const base64Chunk = chunks[i];

    const packet =
      JSON.stringify({
        event: 'receive_chunk_ack',
        chunk: base64Chunk,
        chunkNo: chunkIndex,
        windowSize,
      }) + '\n';

    socket.write(packet);

    const byteLength = (base64Chunk.length * 3) / 4;
    accumulatedBytes += byteLength;
  }

  // 🔥 Single UI update (VERY IMPORTANT)
  setTotalSentBytes((prev: any) => prev + accumulatedBytes);
  setActiveFileTransferredBytes((prev: any) => prev + accumulatedBytes);

  if (end === totalChunks) {
    console.log('ALL CHUNKS SENT SUCCESSFULLY ✅');
  }
};
