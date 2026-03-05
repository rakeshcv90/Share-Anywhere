import { produce } from 'immer';
import { Alert, Platform } from 'react-native';
import { useChunkStore } from '../db/chunkStore';
import { Buffer } from 'buffer';
import RNFS from 'react-native-fs';

type FileData = {
  id: string;
  name: string;
  size: any;
  mimeType: string;
  totalChunks: number;
};
export const receiveFileAck = async (
  data: any,
  socket: any,
  setReceivedFiles: any,
) => {
  const { chunkStore, setChunkStore } = useChunkStore.getState();

  if (chunkStore) {
    Alert.alert(
      'Please wait',
      'There are files which need to be received. Wait Bro!',
    );
    return;
  }
  setReceivedFiles((prevData: any) =>
    produce(prevData, (draft: any) => {
      draft.push(data);
    }),
  );
  setChunkStore({
    id: data?.id,
    totalChunks: data?.totalChunks,
    name: data?.name,
    size: data?.size,
    mimeType: data?.mimeType,
    chunkArray: [],
  });
  if (!socket) {
    console.log('Socket not available');
    return;
  }

  try {
    const basePath =
      Platform.OS === 'ios'
        ? RNFS.DocumentDirectoryPath
        : RNFS.ExternalDirectoryPath;

    const filePath = `${basePath}/${data.name}`;

    // create empty file before streaming chunks
    await RNFS.writeFile(filePath, '', 'utf8');

    // -----------------------------------------
    await new Promise((resolve: any) => setTimeout(resolve, 10));
    console.log('FILE RECEIVED 📦');
    // socket.write(
    //   JSON.stringify({
    //     event: 'send_chunk_ack',
    //     chunkNo: 0,
    //   }),
    // );
    socket.write(
      JSON.stringify({
        event: 'send_chunk_ack',
        chunkNo: 0,
      }) + '\n',
    );

    console.log('REQUESTED FOR FIRST CHUNK 🔵');
  } catch (error) {}
};

export const sendChunkAck = async (
  chunkIndex: any,
  socket: any,
  setTotalSentBytes: React.Dispatch<React.SetStateAction<number>>,
  setSentFiles: any,
) => {
  try {
    const { currentChunkSet, resetCurrentChunkSet } = useChunkStore.getState();
    if (!currentChunkSet) {
      Alert.alert('There are no chunks to be sent');
      return;
    }
    if (!socket) {
      console.error('Socket not available');
      return;
    }
    const totalChunks = currentChunkSet?.totalChunks;
    if (!currentChunkSet.chunkArray[chunkIndex]) {
      console.error(`Chunk at index ${chunkIndex} does not exist`);
      return;
    }
    try {
      // await new Promise((resolve: any) => setTimeout(resolve, 10));
      await new Promise(resolve => setImmediate(resolve));

      socket.write(
        JSON.stringify({
          event: 'receive_chunk_ack',
          chunk: currentChunkSet?.chunkArray[chunkIndex].toString('base64'),
          chunkNo: chunkIndex,
        }) + '\n',
      );
      setTotalSentBytes(
        (prev: any) => prev + currentChunkSet?.chunkArray[chunkIndex]?.length,
      );
      // if (chunkIndex + 2 > totalChunks) {
      if (chunkIndex + 1 === totalChunks) {
        console.log('ALL CHUNKS SENT SUCCESSFULLY ✅ 🔴');
        setSentFiles((prevFiles: any) =>
          produce(prevFiles, (draftFiles: any) => {
            const fileIndex = draftFiles?.findIndex(
              (f: any) => f.id === currentChunkSet.id,
            );
            if (fileIndex !== -1) {
              draftFiles[fileIndex].available = true;
            }
          }),
        );
        resetCurrentChunkSet();
      }
    } catch (error) {
      console.error('Error Sending File:', error);
    }
  } catch (error) {
    console.error('sendChunkAck error:', error);
  }
};

export const receiveChunkAck = async (
  chunk: string,
  chunkNo: number,
  socket: any,
  setTotalReceivedBytes: React.Dispatch<React.SetStateAction<number>>,
  generateFile: () => Promise<void>,
) => {
  const { chunkStore } = useChunkStore.getState();
  if (!chunkStore) return;

  try {
    const bufferChunk = Buffer.from(chunk, 'base64');

    // ✅ STREAM WRITE INSTEAD OF MEMORY STORE
    const basePath =
      Platform.OS === 'ios'
        ? RNFS.DocumentDirectoryPath
        : RNFS.ExternalDirectoryPath;

    const filePath = `${basePath}/${chunkStore.name}`;

    await RNFS.appendFile(filePath, bufferChunk.toString('base64'), 'base64');

    setTotalReceivedBytes(prev => prev + bufferChunk.length);

    if (chunkNo + 1 === chunkStore.totalChunks) {
      console.log('STREAM COMPLETE ✅');
      await generateFile(); // just mark available now
      return;
    }

    await new Promise(resolve => setImmediate(resolve));

    socket.write(
      JSON.stringify({
        event: 'send_chunk_ack',
        chunkNo: chunkNo + 1,
      }) + '\n',
    );
  } catch (error) {
    console.error('Streaming write error:', error);
  }
};

// export const receiveChunkAck = async (
//   chunk: string,
//   chunkNo: number,
//   socket: any,
//   setTotalReceivedBytes: React.Dispatch<React.SetStateAction<number>>,
//   generateFile: () => Promise<void>,
// ) => {
//   const { chunkStore, setChunkStore } = useChunkStore.getState();

//   if (!chunkStore) {
//     console.log('Chunk Store is null');
//     return;
//   }

//   try {
//     // Convert base64 chunk to buffer
//     const bufferChunk = Buffer.from(chunk, 'base64');
//     const updatedChunkArray = [...(chunkStore.chunkArray || [])];
//     updatedChunkArray[chunkNo] = bufferChunk;

//     // Update chunk store
//     setChunkStore({
//       ...chunkStore,
//       chunkArray: updatedChunkArray,
//     });

//     // Update total received bytes
//     setTotalReceivedBytes(prev => prev + bufferChunk.length);

//     // If all chunks received, generate the file
//     if (chunkNo + 1 === chunkStore.totalChunks) {
//       console.log('All Chunks Received ✅ 🔴');
//       await generateFile();
//       // resetChunkStore();
//       return;
//     }

//     if (!socket) {
//       console.log('Socket not available');
//       return;
//     }

//     // Request next chunk
//     // await new Promise(resolve => setTimeout(resolve, 10));

//     await new Promise(resolve => setImmediate(resolve));

//     console.log('REQUESTED FOR NEXT CHUNK ⬇️', chunkNo + 1);
//     socket.write(
//       JSON.stringify({
//         event: 'send_chunk_ack',
//         chunkNo: chunkNo + 1,
//       })+ '\n',
//     );
//   } catch (error) {
//     console.error('Error processing received chunk:', error);
//   }
// };
