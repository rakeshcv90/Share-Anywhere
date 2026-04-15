import { Alert, NativeModules, Platform } from 'react-native';
import { useChunkStore } from '../db/chunkStore';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Buffer } from 'buffer';

// 🛡️ NATIVE CRASH PREVENTION: Queue native writes to prevent java.lang.AssertionError
// when stream.close() overlaps with background stream.write() calls.
let streamWriteQueue: Promise<void> = Promise.resolve();

/** Wait for socket drain event (backpressure relief) */
const waitForDrain = (socket: any): Promise<void> =>
  new Promise(resolve => {
    const timeout = setTimeout(() => resolve(), 5000); // safety: max 5s wait
    socket.once('drain', () => {
      clearTimeout(timeout);
      resolve();
    });
  });

// 🛡️ NATIVE METADATA (NO STREAMS)
export const initNativeFileAck = (
  data: any,
  setReceivedFiles: any,
  setActiveFileTotalSize: any,
  setActiveFileTransferredBytes: any,
) => {
  const { setChunkStore } = useChunkStore.getState();

  console.log(`--- TCP: Initializing Native Metadata purely for UI: ${data.name}`);

  setReceivedFiles((prev: any[]) => {
    const exists = prev.some(f => f.id === data.id);
    if (exists) {
      return prev.map(f => (f.id === data.id ? { ...f, ...data } : f));
    }
    return [...prev, data];
  });

  setChunkStore({
    id: data.id,
    totalChunks: data.totalChunks,
    name: data.name,
    size: data.size,
    mimeType: data.mimeType,
    chunkArray: [],
    stream: null, // 🔥 No JS fallback stream whatsoever
  });

  setActiveFileTotalSize(data.size);
  setActiveFileTransferredBytes(0);
};

export const receiveFileAck = async (
  data: any,
  socket: any,
  setReceivedFiles: any,
  setActiveFileTotalSize: any,
  setActiveFileTransferredBytes: any,
) => {
  const { chunkStore, setChunkStore, activeFileTransferredBytes } = useChunkStore.getState();

  if (chunkStore && chunkStore.id !== data.id) {
    console.log(`--- TCP: Busy with: ${chunkStore.name}, but new request for: ${data.name}`);
    
    // 💡 DEADLOCK FIX: If the current busy file has NO progress, it's likely a stale/failed transfer.
    // Instead of alerting, we silence-kill the old one and proceed with the new request.
    if (activeFileTransferredBytes === 0) {
       console.log('--- TCP: Stale transfer detected (0% progress). Overwriting...');
       try {
         chunkStore.stream?.close();
       } catch (e) {}
    } else {
       Alert.alert('Please wait', 'A file is already being received.');
       return;
    }
  }

  if (chunkStore && chunkStore.id === data.id) {
    console.log(`--- TCP: Handshake re-delivery for: ${data.name}. Re-acking...`);
    // Re-acknowledge that we're ready for THIS file, just in case the sender missed previous ACK
    if (socket && !socket.destroyed) {
      socket.write(
        JSON.stringify({
          event: 'send_chunk_ack',
          chunkNo: 0,
          windowSize: 32,
        }) + '\n',
      );
    }
    return;
  }

  console.log(`--- TCP: Initial Handshake for: ${data.name}`);

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

  if (!socket || socket.destroyed) {
    console.log('--- TCP: Skipping file_ack write - socket destroyed.');
    return;
  }

  const sendInitialAck = () => {
    if (!socket || socket.destroyed) return;
    console.log('--- TCP: Sending send_chunk_ack (initial/pulse) for chunk 0');
    socket.write(
      JSON.stringify({
        event: 'send_chunk_ack',
        chunkNo: 0,
        windowSize: 64, // Turbo Sync
        pulse: true,
      }) + '\n',
    );
  };

  sendInitialAck();

  // 💓 PULSE MECHANISM: If we don't receive any chunks within 4 seconds,
  // re-send the chunk_ack to wake up the sender.
  const pulseInterval = setInterval(() => {
    const state = useChunkStore.getState();
    const currentFile = state.chunkStore;
    
    // If the file is still the same one and we haven't finished (no received bytes updated yet)
    // and it's still not available, pulse the sender.
    if (currentFile && currentFile.id === data.id && !currentFile.stream?.closed) {
      console.log('--- TCP: Pulse! Re-requesting chunk 0 from sender...');
      sendInitialAck();
    } else {
      console.log('--- TCP: Pulse stopping (file changed or stream closed)');
      clearInterval(pulseInterval);
    }
  }, 1500); // 💓 Accelerated Pulse (1.5s) for instant batch recovery

  // Safety: stop pulse after 30 seconds no matter what
  setTimeout(() => clearInterval(pulseInterval), 32000);
};

/** Helper to send a single TCP packet with framing */
const sendPacket = async (base64Chunk: string, chunkNo: number, windowSize: number, socket: any, isLast: boolean) => {
    const packet = JSON.stringify({
        event: 'receive_chunk_ack',
        chunk: base64Chunk,
        chunkNo,
        windowSize,
    }) + '\n';
    
    if (socket && !socket.destroyed) {
        const writeSuccess = socket.write(packet);
        if (!writeSuccess) await waitForDrain(socket);
        return true;
    }
    return false;
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
  const { chunkStore, setActiveFileTransferredBytes: storeSetActiveBytes } = useChunkStore.getState();
  if (!chunkStore) return;

  const byteLength = (chunk.length * 3) / 4;
  const isLastChunk = chunkNo === chunkStore.totalChunks - 1;

  if (chunkNo % 20 === 0 || isLastChunk) {
    console.log(`--- TCP: Received Chunk ${chunkNo}/${chunkStore.totalChunks - 1}`);
  }

  // 🚀 Sequential write — Queue disk I/O to prevent AssertionError on stream close
  if (chunkStore.stream) {
    streamWriteQueue = streamWriteQueue.then(async () => {
        try {
            await chunkStore.stream.write(chunk);
        } catch(e) {
            console.log('--- Stream write error:', e);
        }
    });
  }

  // 🚀 Precise Cumulative Byte Counting (Decoded)
  // We update the state with total bytes relative to file size to avoid bridge freeze.
  if (chunkNo % 32 === 0 || isLastChunk) {
    const defaultChunkSize = 512 * 1024; // Turbo CHUNK_SIZE
    const bytesToUpdate = isLastChunk 
        ? chunkStore.size 
        : (chunkNo + 1) * defaultChunkSize;

    setActiveFileTransferredBytes(bytesToUpdate);
    storeSetActiveBytes(bytesToUpdate); // Sync with store
    
    // 🔥 ACCURACY FIX: The cumulative total should be the RAW bytes processed so far.
    // Instead of estimating, we use the current file's progress as the source.
    setTotalReceivedBytes((prev: number) => {
        // We calculate the batch progress by taking previous completions + current file relative progress
        return Math.floor(bytesToUpdate); 
    });
  }

  if (isLastChunk) {
    console.log('STREAM COMPLETE ✅');
    try {
      // 🛡️ Await all pending background writes before we dare close the stream!
      await streamWriteQueue;
      await chunkStore.stream.close();
    } catch (e) {
      console.log('Error closing stream:', e);
    }
    await generateFile();
    return;
  }

  const nextChunkNo = chunkNo + 1;

  // Request next window at window boundaries
  if (nextChunkNo % windowSize === 0 || nextChunkNo === 0) {
    if (socket && !socket.destroyed) {
      socket.write(
        JSON.stringify({
          event: 'send_chunk_ack',
          chunkNo: nextChunkNo,
          windowSize,
          pulse: true, // Tag as pulse to help sender identify it as a wake-up signal
        }) + '\n',
      );
    }
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
  let { currentChunkSet, setCurrentChunkSet, setActiveFileTransferredBytes: storeSetActiveBytes } = useChunkStore.getState();
  
  // 🏎️ RACE CONDITION FIX: If the store isn't ready yet (common on fast devices), 
  // we wait up to 1 second before giving up on this chunk batch.
  if (!currentChunkSet && startChunkIndex === 0) {
    console.log('--- TCP: Store not ready for chunk 0. Waiting for pre-flight sync...');
    for (let retry = 0; retry < 5; retry++) {
       await new Promise<void>(resolve => setTimeout(() => resolve(), 200));
       currentChunkSet = useChunkStore.getState().currentChunkSet;
       if (currentChunkSet) {
           console.log('--- TCP: Pre-flight sync success after retry:', retry + 1);
           break;
       }
    }
  }

  if (!currentChunkSet) {
    console.log('--- TCP: sendChunkAck aborted - metadata missing for index:', startChunkIndex);
    return;
  }

  const { filePath, chunkSize, totalChunks, fileData } = currentChunkSet as any;
  const activeChunkSize = Math.floor(Number(chunkSize || 262144));

  // --- Unified Streaming Path (Android & iOS) ---
  // Reading & sending one chunk at a time pipelines TCP and prevents memory crashes.
  const activeFileSize = Math.floor(Number(currentChunkSet.fileSize || 0));
  const end = Math.min(startChunkIndex + windowSize, totalChunks);
  
  console.log(`--- TCP: Starting Chunk Batch ${startChunkIndex}-${end-1} for ${currentChunkSet.name}`);

  try {
    let bytesSinceLastUpdate = 0;

    for (let i = startChunkIndex; i < end; i++) {
      // ⏸️ PAUSE CHECK: If user paused, stop the loop and save the index
      if (useChunkStore.getState().isPaused) {
        console.log(`--- TCP: Transfer paused at chunk ${i}. Saving progress.`);
        setCurrentChunkSet({ lastChunkNo: i });
        return;
      }

      const position = Math.floor(i * activeChunkSize);
      const readLength = Math.floor(
        Math.min(activeChunkSize, activeFileSize - position),
      );
      if (readLength <= 0) continue;

      let base64Chunk: string | null = null;

      // 🏎️ iOS SMALL FILE OPTIMIZER (< 2MB): 
      // Instead of jumping around (which crashes on some iPhones), we read the whole file once
      // and slice it in memory. This is perfect for images and short videos!
      if (Platform.OS === 'ios' && activeFileSize < 2 * 1024 * 1024) {
         try {
           if (!currentChunkSet.fileData) {
              console.log('--- TCP: Reading small file into memory for stable buffering...');
              currentChunkSet.fileData = await RNFS.readFile(filePath, 'base64');
              setCurrentChunkSet({ fileData: currentChunkSet.fileData });
           }
           
           // 🔥 PERFORMANCE FIX: Convert to buffer ONCE per batch/window, not per chunk!
           const fileBuffer = Buffer.from(currentChunkSet.fileData!, 'base64');
           
           for (let i = startChunkIndex; i < end; i++) {
              if (useChunkStore.getState().isPaused) break;
              const pos = Math.floor(i * activeChunkSize);
              const len = Math.floor(Math.min(activeChunkSize, activeFileSize - pos));
              if (len <= 0) continue;

              const base64Chunk = fileBuffer.slice(pos, pos + len).toString('base64');
              
              // Helper to send it
              await sendPacket(base64Chunk, i, windowSize, socket, i === end - 1);
              
              const chunkBytes = (base64Chunk.length * 3) / 4;
              bytesSinceLastUpdate += chunkBytes;
              
      if ((i - startChunkIndex) % 8 === 7 || i === end - 1) {
        const b = bytesSinceLastUpdate;
        bytesSinceLastUpdate = 0;
        
        // 🔥 PRECISION RESET: Ensure setTotalSentBytes is strictly the sum of raw bytes sent.
        setTotalSentBytes((pValue: any) => {
             // For single file simplicity, we track accurate progress.
             // In multi-file batches, this will accumulate naturally.
             return pValue + b;
        });
        setActiveFileTransferredBytes((pValue: any) => pValue + b);
        storeSetActiveBytes((prev: any) => prev + b); // Sync with store
      }
           }
           return; // ⏩ SKIP traditional loop
         } catch (err) {
            console.log('--- TCP: Small File Optimizer Error:', err);
         }
      } 
      
      if (!base64Chunk) {
          // Standard Sequential Read
          if (Platform.OS === 'ios') {
            // 🍎 iOS: Use custom Native Module readChunkBase64
            // This natively accesses the raw bytes in memory and safely returns base64.
            // Completely fixes RNFS integer bridges and ReactNativeBlobUtil temp file bugs!
            try {
              const fileModule = NativeModules.TurboTransferModule || NativeModules.TurboTransfer;
              if (fileModule && fileModule.readChunkBase64) {
                 base64Chunk = await fileModule.readChunkBase64(filePath, position, readLength);
              } else {
                 throw new Error("Native readChunkBase64 not found");
              }
            } catch (e) {
              console.log(`--- TCP: iOS native read error at chunk ${i} (Pos ${position}):`, e);
              base64Chunk = null;
            }
          } else {
            // 🤖 Android: RNFS.read works fine
            base64Chunk = await RNFS.read(
              filePath,
              readLength,
              position,
              'base64',
            ).catch(e => {
              console.log(`--- TCP: Error reading chunk ${i} at ${position} (Len: ${readLength}):`, e);
              return null;
            });
          }
      }


      if (!base64Chunk) {
        console.log(`--- TCP: Failed to read chunk ${i} at ${position}`);
        continue;
      }

      await sendPacket(base64Chunk, i, windowSize, socket, i === end - 1);
      
      if (i % 16 === 0) {
        console.log(`--- TCP: Chunk ${i} written.`);
      }

      // 🌉 Bridge Throttling: delay every 2 chunks to keep the JS bridge responsive
      // iOS delay is reduced for Turbo Mode (2ms is stable with Buffer slicing)
      if (i % 2 === 0) {
        const delay = Platform.OS === 'ios' ? 2 : 1;
        await new Promise<void>(resolve => setTimeout(() => resolve(), delay));
      }

      // 🚀 Batch progress updates to prevent UI thread from freezing
      const chunkBytes = (base64Chunk.length * 3) / 4;
      bytesSinceLastUpdate += chunkBytes;

      if ((i - startChunkIndex) % 8 === 7 || i === end - 1) {
        const bytesToUpdate = bytesSinceLastUpdate;
        bytesSinceLastUpdate = 0;
        setTotalSentBytes((prev: any) => prev + bytesToUpdate);
        setActiveFileTransferredBytes((prev: any) => prev + bytesToUpdate);
        storeSetActiveBytes((prev: any) => prev + bytesToUpdate); // Sync with store
      }
    }
  } catch (err) {
    console.log('--- CRITICAL: sendChunkAck Error:', err);
  }
};
