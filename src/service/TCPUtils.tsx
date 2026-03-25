import { Alert, Platform } from 'react-native';
import { useChunkStore } from '../db/chunkStore';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';

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

  // Window size 16 for better stability on iOS bridge
  socket.write(
    JSON.stringify({
      event: 'send_chunk_ack',
      chunkNo: 0,
      windowSize: 16,
    }) + '\n',
  );
};

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

  // 🔥 Await write for data integrity
  if (chunkStore.stream) {
    await chunkStore.stream.write(chunk);
  }

  setTotalReceivedBytes((prev: any) => prev + byteLength);
  setActiveFileTransferredBytes((prev: any) => prev + byteLength);

  if (isLastChunk) {
    console.log('STREAM COMPLETE ✅');
    try {
      await chunkStore.stream.close();
    } catch (e) {
      console.log('Error closing stream:', e);
    }
    await generateFile();
    return;
  }

  const nextChunkNo = chunkNo + 1;

  // Request next window at window boundaries
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

/**
 * Standard sendChunkAck with a robust read-once-and-slice approach for iOS to bypass bridge bugs.
 */
export const sendChunkAck = async (
  startChunkIndex: number,
  windowSize: number,
  socket: any,
  setTotalSentBytes: any,
  setSentFiles: any,
  setActiveFileTransferredBytes: any,
) => {
  const { currentChunkSet, setCurrentChunkSet } = useChunkStore.getState();
  if (!currentChunkSet) return;

  const { filePath, chunkSize, totalChunks, fileData } = currentChunkSet as any;
  const activeChunkSize = Math.floor(Number(chunkSize || 262144));

  // --- iOS Path: Uses readFile once and then slices in JavaScript ---
  // This is the most "FOOLPROOF" way to bypass the RNFS.read bridge error.
  if (Platform.OS === 'ios') {
    let activeData = fileData;

    if (!activeData && startChunkIndex === 0) {
      console.log(`--- iOS: Reading whole file into memory for slicing...`);
      try {
        activeData = await ReactNativeBlobUtil.fs.readFile(filePath, 'base64');
        setCurrentChunkSet({ ...currentChunkSet, fileData: activeData });
      } catch (err) {
        console.log('--- iOS: Error reading file entirely:', err);
        return;
      }
    }

    if (activeData) {
      const end = Math.min(startChunkIndex + windowSize, totalChunks);
      let accumulatedBytes = 0;

      // Base64 string length is roughly 4/3 of binary size.
      // A 256KB chunk is exactly 349525 characters in base64 if padded.
      // But it's easier to calculate binary offset and then map to base64.
      // better yet: just slice based on characters.
      // 256KB = 256 * 1024 bytes = 262144 bytes.
      // Base64 chars = Math.ceil(bytes / 3) * 4.
      const charsPerChunk = Math.ceil(activeChunkSize / 3) * 4;

      for (let i = startChunkIndex; i < end; i++) {
        const startChar = i * charsPerChunk;
        const endChar = Math.min(startChar + charsPerChunk, activeData.length);
        const chunk = activeData.substring(startChar, endChar);

        if (!chunk) continue;

        const packet = JSON.stringify({
          event: 'receive_chunk_ack',
          chunk,
          chunkNo: i,
          windowSize,
        }) + '\n';

        socket.write(packet);
        accumulatedBytes += (chunk.length * 3) / 4;
      }

      setTotalSentBytes((prev: any) => prev + accumulatedBytes);
      setActiveFileTransferredBytes((prev: any) => prev + accumulatedBytes);

      if (end === totalChunks) {
        console.log('--- iOS: ALL CHUNKS SENT SUCCESSFULLY ✅');
        // Clear memory
        setCurrentChunkSet({ ...currentChunkSet, fileData: undefined });
      }
      return;
    }
  }

  // --- Android/Fallback Path: Uses traditional RNFS.read bits ---
  const activeFileSize = Math.floor(Number(currentChunkSet.fileSize || 0));
  const end = Math.min(startChunkIndex + windowSize, totalChunks);
  let accumulatedBytes = 0;
  const readPromises: Promise<string>[] = [];

  try {
    for (let i = startChunkIndex; i < end; i++) {
       const position = (i * activeChunkSize) | 0;
       const readLength = Math.min(activeChunkSize, activeFileSize - position) | 0;
       if (readLength <= 0) continue;
       readPromises.push(RNFS.read(filePath, readLength, position, 'base64'));
    }

    const chunks = await Promise.all(readPromises);
    for (let i = 0; i < chunks.length; i++) {
      const chunkIndex = startChunkIndex + i;
      const base64Chunk = chunks[i];
      if (!base64Chunk) continue;

      const packet = JSON.stringify({
        event: 'receive_chunk_ack',
        chunk: base64Chunk,
        chunkNo: chunkIndex,
        windowSize,
      }) + '\n';

      socket.write(packet);
      accumulatedBytes += (base64Chunk.length * 3) / 4;
    }
  } catch (err) {
    console.log('--- CRITICAL: sendChunkAck Error:', err);
    return;
  }

  setTotalSentBytes((prev: any) => prev + accumulatedBytes);
  setActiveFileTransferredBytes((prev: any) => prev + accumulatedBytes);
};
