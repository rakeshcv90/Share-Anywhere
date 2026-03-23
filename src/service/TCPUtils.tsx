import { Alert, Platform } from 'react-native';
import { useChunkStore } from '../db/chunkStore';
import RNFS from 'react-native-fs';

export const receiveFileAck = async (
  data: any,
  socket: any,
  setReceivedFiles: any,
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

  await RNFS.writeFile(filePath, '', 'utf8');

  setChunkStore({
    id: data.id,
    totalChunks: data.totalChunks,
    name: data.name,
    size: data.size,
    mimeType: data.mimeType,
    chunkArray: [],
  });

  if (!socket) return;

  socket.write(
    JSON.stringify({
      event: 'send_chunk_ack',
      chunkNo: 0,
      windowSize: 256,
    }) + '\n',
  );
};

/* ---------------------------------------------------- */
/* SEND CHUNK WINDOW                                     */
/* ---------------------------------------------------- */

export const sendChunkAck = async (
  startChunkIndex: number,
  windowSize: number,
  socket: any,
  setTotalSentBytes: any,
  setSentFiles: any,
) => {
  const { currentChunkSet, resetCurrentChunkSet } = useChunkStore.getState();

  if (!currentChunkSet) return;

  const { totalChunks } = currentChunkSet;

  const end = Math.min(startChunkIndex + windowSize, totalChunks);

  for (let chunkIndex = startChunkIndex; chunkIndex < end; chunkIndex++) {
    // Yield to the UI thread every 2 chunks (since chunks are now 256KB, 4x larger)
    // the app responsive without adding excessive delay.
    if (chunkIndex % 2 === 0) {
      await new Promise<void>(resolve => setImmediate(() => resolve()));
    }

    let base64Chunk = '';
    let byteLength = 0;

    if (currentChunkSet.filePath) {
      const { filePath, chunkSize } = currentChunkSet as any;

      const position = chunkIndex * chunkSize;

      try {
        base64Chunk = await RNFS.read(filePath, chunkSize, position, 'base64');
      } catch (err) {
        console.log('Error reading chunk at position:', position, err);
        continue; // Skip this chunk or handle error appropriately
      }

      byteLength = (base64Chunk.length * 3) / 4;
    } else {
      const chunkBuf = currentChunkSet.chunkArray[chunkIndex];

      if (!chunkBuf) continue;

      base64Chunk = chunkBuf.toString('base64');

      byteLength = chunkBuf.length;
    }

    const packet = `{"event":"receive_chunk_ack","chunk":"${base64Chunk}","chunkNo":${chunkIndex},"windowSize":${windowSize}}\n`;

    socket.write(packet);

    setTotalSentBytes((prev: any) => prev + byteLength);

    if (chunkIndex + 1 === totalChunks) {
      console.log('ALL CHUNKS SENT SUCCESSFULLY ✅');
    }
  }
};

/* ---------------------------------------------------- */
/* RECEIVE CHUNK                                         */
/* ---------------------------------------------------- */

export const receiveChunkAck = async (
  chunk: string,
  chunkNo: number,
  socket: any,
  setTotalReceivedBytes: any,
  generateFile: () => Promise<void>,
  windowSize: number,
) => {
  const { chunkStore } = useChunkStore.getState();

  if (!chunkStore) return;

  const basePath =
    Platform.OS === 'ios'
      ? RNFS.DocumentDirectoryPath
      : RNFS.ExternalDirectoryPath;

  const filePath = `${basePath}/.tmp_${chunkStore.name}`;
  const byteLength = (chunk.length * 3) / 4;
  const isLastChunk = chunkNo === chunkStore.totalChunks - 1;

  // Write each chunk individually — DO NOT batch-join base64 strings.
  // 64KB chunks encode with == padding at the end (65536 % 3 ≠ 0).
  // Joining "abc==" + "def==" → "abc==def==" is INVALID base64 and
  // corrupts the file. Each appendFile call decodes its chunk correctly.
  await RNFS.appendFile(filePath, chunk, 'base64');

  setTotalReceivedBytes((prev: any) => prev + byteLength);

  if (isLastChunk) {
    console.log('STREAM COMPLETE ✅');
    await generateFile();
    return;
  }

  const nextChunkNo = chunkNo + 1;

  // Only request next window at real window boundaries.
  const isWindowEnd = nextChunkNo % windowSize === 0;

  if (isWindowEnd) {
    socket.write(
      JSON.stringify({
        event: 'send_chunk_ack',
        chunkNo: nextChunkNo,
        windowSize,
      }) + '\n',
    );
  }
};
