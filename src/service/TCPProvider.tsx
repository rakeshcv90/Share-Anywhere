import 'react-native-get-random-values';
import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
  FC,
} from 'react';
import DeviceInfo from 'react-native-device-info';
import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';
import ReactNativeBlobUtil from 'react-native-blob-util';
import RNFS from 'react-native-fs';
import {
  receiveChunkAck,
  initNativeFileAck,
  receiveFileAck,
  sendChunkAck,
} from './TCPUtils';
import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  Linking,
  AppState,
} from 'react-native';
const TurboTransfer =
  NativeModules.TurboTransfer || NativeModules.TurboTransferModule;
const turboEvents = TurboTransfer
  ? new NativeEventEmitter(TurboTransfer)
  : null;
import { useChunkStore } from '../db/chunkStore';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

const CHUNK_SIZE = 512 * 1024; // 🚀 512 KB per chunk (Turbo Optimized)
const WINDOW_SIZE = 24; // 🚀 24 chunks in-flight (12MB) — Dynamic safety for iPhone receivers
interface TCPContextType {
  server: any;
  client: any;
  isConnected: boolean;
  connectedDevice: any;
  sentFiles: any;
  receivedFiles: any;
  totalSentBytes: number;
  totalReceivedBytes: number;
  activeFileId: string | null;
  activeFileTotalSize: number;
  activeFileTransferredBytes: number;
  batchTotalFiles: number;
  batchTotalSize: number;
  startServer: (port: number) => void;
  connectToServer: (host: string, port: number, deviceName: string) => void;
  sendMessage: (message: any) => void;
  sendFileAck: (file: any, type: 'file' | 'image' | 'video' | 'audio') => void;
  sendBatchAck: (
    files: any[],
    type: 'image' | 'file' | 'video' | 'audio',
  ) => void;
  disconnect: () => void;
  setReceivedFiles: React.Dispatch<React.SetStateAction<any[]>>;
  setSentFiles: React.Dispatch<React.SetStateAction<any[]>>;
  setTotalSentBytes: React.Dispatch<React.SetStateAction<number>>;
  setTotalReceivedBytes: React.Dispatch<React.SetStateAction<number>>;
  togglePause: () => void;
  isPaused: boolean;
  pendingSharedFiles: any[];
  checkSharedFiles: () => Promise<void>;
  setPendingSharedFiles: React.Dispatch<React.SetStateAction<any[]>>;
}

const TCPContext = createContext<TCPContextType | undefined>(undefined);

export const useTCP = (): TCPContextType => {
  const context = useContext(TCPContext);
  if (!context) {
    throw new Error('useTCP must be used within TCPProvider');
  }
  return context;
};

export const TCPProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [server, setServer] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [serverSocket, setServerSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const [sentFiles, setSentFiles] = useState<any[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<any[]>([]);
  const [totalSentBytes, setTotalSentBytes] = useState(0);
  const [totalReceivedBytes, setTotalReceivedBytes] = useState(0);
  const [batchTotalFiles, setBatchTotalFiles] = useState(0);
  const [batchTotalSize, setBatchTotalSize] = useState(0);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFileTotalSize, setActiveFileTotalSize] = useState(0);
  const [activeFileTransferredBytes, setActiveFileTransferredBytes] =
    useState(0);
  const {
    currentChunkSet,
    setCurrentChunkSet,
    setChunkStore,
    resetCurrentChunkSet,
    resetChunkStore,
    isPaused,
  } = useChunkStore();
  const [pendingSharedFiles, setPendingSharedFiles] = useState<any[]>([]);

  const activeSocket = useRef<any>(null);
  const sentFilesRef = useRef<any[]>([]);
  const tempPathsRef = useRef<Record<string, string>>({});
  const handlePacketRef = useRef<any>(null);
  const safetyTimeoutRef = useRef<any>(null);
  const nativeTransferredRef = useRef<number>(0);
  const lastTurboUIUpdate = useRef<number>(0);

  useEffect(() => {
    activeSocket.current = client || serverSocket;
  }, [client, serverSocket]);

  useEffect(() => {
    sentFilesRef.current = sentFiles;
  }, [sentFiles]);

  // 🛡️ NATIVE PROTECTION: Pause/Resume native threads when user toggles pause
  useEffect(() => {
    if (activeFileId && TurboTransfer) {
      if (isPaused) {
        console.log(
          `--- NATIVE: Pausing active native transfer for: ${activeFileId}`,
        );
        if (TurboTransfer.pauseTransfer) {
          TurboTransfer.pauseTransfer(activeFileId);
        } else {
          TurboTransfer.stopTransfer(activeFileId);
        }
      } else {
        // 🔥 RESUME FIX: Unblock the native thread's spin-wait loop
        console.log(
          `--- NATIVE: Resuming active native transfer for: ${activeFileId}`,
        );
        if (TurboTransfer.resumeTransfer) {
          TurboTransfer.resumeTransfer(activeFileId);
        }
      }
    }
  }, [isPaused, activeFileId]);

  // 🔥 iOS Files App Refresh Trick & Cleanup Caches
  // 🔥 Aggressive Cache Cleanup
  const cleanupCache = useCallback(async () => {
    try {
      const cacheDir = RNFS.CachesDirectoryPath;
      const exists = await RNFS.exists(cacheDir);
      if (!exists) return;

      const files = await RNFS.readDir(cacheDir);
      console.log(`--- Cache sweep: Found ${files.length} items in cache`);

      let deletedCount = 0;
      for (const file of files) {
        // Delete any file that is not a directory and matches our temp patterns
        // or just delete any file in the cache that isn't a known system file
        if (file.isFile()) {
          const path =
            Platform.OS === 'android'
              ? file.path.replace('file://', '')
              : file.path;
          await RNFS.unlink(path).catch(() => {});
          deletedCount++;
        }
      }
      if (deletedCount > 0) {
        console.log(`--- Cache sweep: Deleted ${deletedCount} files ✅`);
      }

      // Also cleanup shared_files directory
      const sharedDir = `${RNFS.CachesDirectoryPath}/shared_files`;
      if (await RNFS.exists(sharedDir)) {
        await RNFS.unlink(sharedDir).catch(() => {});
        console.log('--- Cache sweep: Deleted shared_files directory ✅');
      }
    } catch (err) {
      console.log('--- Cache sweep error:', err);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const dummyPath = `${RNFS.DocumentDirectoryPath}/.readme.txt`;
      RNFS.writeFile(
        dummyPath,
        'TransferQueen received files will appear here.',
        'utf8',
      )
        .then(() =>
          console.log('--- iOS: Files app initialization successful.'),
        )
        .catch(err =>
          console.log('--- iOS: Files app initialization failed:', err),
        );
    }
    cleanupCache();
  }, [cleanupCache]);

  const checkSharedFiles = useCallback(async (retryCount = 0) => {
    console.log(
      `--- SHARE CHECK: Attempt ${
        retryCount + 1
      }, TurboTransfer available: ${!!TurboTransfer}`,
    );
    if (TurboTransfer) {
      try {
        const files = await TurboTransfer.getInitialSharedFiles();
        console.log(
          `--- SHARE CHECK: Got ${files?.length || 0} files from native`,
        );
        if (files && files.length > 0) {
          console.log(
            '--- SHARE CHECK: Files found!',
            JSON.stringify(
              files.map((f: any) => ({ name: f.name, size: f.size })),
            ),
          );
          setPendingSharedFiles(files);
        } else if (Platform.OS === 'ios' && retryCount < 5) {
          // UserDefaults sync between extension and main app can be delayed
          console.log(
            `--- SHARE CHECK: No files yet, retrying in 400ms... (attempt ${
              retryCount + 2
            })`,
          );
          setTimeout(() => {
            checkSharedFiles(retryCount + 1);
          }, 400);
        }
      } catch (err) {
        console.log('--- SHARE CHECK: Error:', err);
      }
    }
  }, []);

  const getSocket = useCallback(() => activeSocket.current, []);

  const getSocketStatus = useCallback((socket: any) => {
    if (!socket) return false;
    // react-native-tcp-socket specific property
    if (socket.destroyed) return false;
    return true;
  }, []);

  const safeSocketCall = useCallback(
    (socket: any, method: string, ...args: any[]) => {
      if (!getSocketStatus(socket)) {
        console.log(
          `--- TCP: Skipping ${method} - Socket not valid or destroyed.`,
        );
        return false;
      }
      try {
        if (typeof socket[method] === 'function') {
          socket[method](...args);
          return true;
        }
      } catch (error) {
        console.log(`--- TCP: Error in ${method}:`, error);
      }
      return false;
    },
    [getSocketStatus],
  );

  const safeWrite = useCallback(
    (socket: any, data: any) => {
      return safeSocketCall(socket, 'write', data);
    },
    [safeSocketCall],
  );

  const sendMessage = useCallback(
    (message: any) => {
      const socket = getSocket();
      if (!socket) return;
      safeWrite(socket, `${JSON.stringify(message)}\n`);
    },
    [getSocket, safeWrite],
  );

  const generateFile = useCallback(async () => {
    const { chunkStore, resetChunkStore: storeReset } =
      useChunkStore.getState();
    if (!chunkStore) return;

    const basePath =
      Platform.OS === 'ios'
        ? RNFS.DocumentDirectoryPath
        : RNFS.ExternalDirectoryPath;

    const tempPath = `${basePath}/.tmp_${chunkStore.name}`;
    const finalPath = `${basePath}/${chunkStore.name}`;

    let finalUri = finalPath;
    console.log('--- Finalizing file:', chunkStore.name);
    try {
      // If downloaded via JS Fallback, move the temp file to finalPath first
      if (await RNFS.exists(tempPath)) {
        await RNFS.moveFile(tempPath, finalPath);
      }

      // Proceed to organize the file (both JS Fallback and Native Turbo end up at finalPath)
      if (await RNFS.exists(finalPath)) {
        // Media Scanning for Android Gallery
        if (Platform.OS === 'android') {
          const lowerName = chunkStore.name.toLowerCase();
          const isMedia =
            lowerName.endsWith('.jpg') ||
            lowerName.endsWith('.jpeg') ||
            lowerName.endsWith('.png') ||
            lowerName.endsWith('.mp4') ||
            lowerName.endsWith('.mkv') ||
            lowerName.endsWith('.mov');

          if (isMedia) {
            try {
              // Move to public Pictures folder for Gallery visibility
              const publicDir = `${RNFS.ExternalStorageDirectoryPath}/Pictures/Share-Anywhere`;
              const publicPath = `${publicDir}/${chunkStore.name}`;

              await RNFS.mkdir(publicDir);
              await RNFS.moveFile(finalPath, publicPath);
              finalUri = publicPath;

              console.log(
                '--- Android: Saved and Moved to public Gallery:',
                publicPath,
              );
              ReactNativeBlobUtil.fs
                .scanFile([{ path: publicPath }])
                .catch(err => console.log('Gallery Scan Error:', err));
            } catch (err) {
              console.log('Error moving to public gallery:', err);
              // Fallback to scanning the original file if move fails
              ReactNativeBlobUtil.fs
                .scanFile([{ path: finalPath }])
                .catch(scanErr => console.log('Gallery Scan Error:', scanErr));
            }
          } else {
            // Non-media files (PDF, ZIP, DOCX, Audio) to Downloads folder
            try {
              const downloadDir = `${RNFS.ExternalStorageDirectoryPath}/Download/Share-Anywhere`;
              const downloadPath = `${downloadDir}/${chunkStore.name}`;

              await RNFS.mkdir(downloadDir);
              await RNFS.moveFile(finalPath, downloadPath);
              finalUri = downloadPath;

              console.log(
                '--- Android: Saved and Moved to Downloads folder:',
                downloadPath,
              );
              ReactNativeBlobUtil.fs
                .scanFile([{ path: downloadPath }])
                .catch(err => console.log('Download Scan Error:', err));
            } catch (err) {
              console.log('Error moving to downloads:', err);
            }
          }
        }

        // 🔥 NEW: iOS Gallery Auto-Save
        if (Platform.OS === 'ios') {
          const lowerName = chunkStore.name.toLowerCase();
          const isImage =
            lowerName.endsWith('.jpg') ||
            lowerName.endsWith('.jpeg') ||
            lowerName.endsWith('.png') ||
            lowerName.endsWith('.heic');
          const isVideo =
            lowerName.endsWith('.mp4') ||
            lowerName.endsWith('.mov') ||
            lowerName.endsWith('.m4v');

          if (isImage || isVideo) {
            try {
              const mediaType = isImage ? 'photo' : 'video';
              console.log(
                `--- iOS: Requesting Photos permission for: ${chunkStore.name}`,
              );

              // 1. Ensure path exists
              const fileExists = await RNFS.exists(finalPath);
              if (!fileExists) {
                console.log('--- iOS: Final path does not exist:', finalPath);
                return;
              }

              // 2. Save using standard CameraRoll method
              console.log(`--- iOS: Saving ${mediaType} to Photos library...`);
              await CameraRoll.save(`file://${finalPath}`, { type: mediaType });
              console.log('--- iOS: Saved to Photos library ✅');
            } catch (err) {
              console.log('--- iOS: Error saving to Photos:', err);
            }
          }
        }
      }
    } catch (e) {
      console.log('Error finalizing file:', e);
    }

    setReceivedFiles(prev =>
      prev.map(file =>
        file.id === chunkStore.id
          ? { ...file, uri: finalUri, available: true }
          : file,
      ),
    );

    const fileId = chunkStore.id;
    storeReset();
    setActiveFileId(null);
    setActiveFileTotalSize(0);
    setActiveFileTransferredBytes(0);
    nativeTransferredRef.current = 0;
    sendMessage({ event: 'file_completed', id: fileId });
    console.log('--- File completed and signal sent.');
  }, [sendMessage, setReceivedFiles]);

  const nativeTransferActive = useRef<string | null>(null);
  const turboFallbackTimer = useRef<any>(null);
  const baseTurboPort = useRef(8085);

  const handleNativeComplete = useCallback(() => {
    generateFile();
  }, [generateFile]);

  // 🏎️ NATIVE TURBO EVENT HANDLERS
  useEffect(() => {
    if (!turboEvents) return;

    const subProgress = turboEvents.addListener(
      'onTurboProgress',
      (data: any) => {
        // 🚀 Clear fallback timer because we have activity!
        if (turboFallbackTimer.current) {
          clearTimeout(turboFallbackTimer.current);
          turboFallbackTimer.current = null;
        }

        const transferred = data.transferred || 0;
        const delta = transferred - nativeTransferredRef.current;
        nativeTransferredRef.current = transferred;

        // Use explicit type passed from Native Module
        if (data.type === 'send') {
          setTotalSentBytes((prev: number) => prev + delta);
        } else if (data.type === 'receive') {
          setTotalReceivedBytes((prev: number) => prev + delta);
        } else {
          // Fallback if data.type is missing but we shouldn't hit this
          if (activeSocket.current === client) {
            setTotalSentBytes((prev: number) => prev + delta);
          } else {
            setTotalReceivedBytes((prev: number) => prev + delta);
          }
        }

        // 🚀 UI THROTTLE: Only update progress bar state every 400ms to prevent bridge flooding
        // Native side now also throttles to 400ms, so we won't miss meaningful updates
        const now = Date.now();
        if (now - lastTurboUIUpdate.current > 400) {
          setActiveFileTransferredBytes(transferred);
          lastTurboUIUpdate.current = now;
        }
      },
    );

    const subComplete = turboEvents.addListener(
      'onTurboComplete',
      (data: any) => {
        console.log(`--- NATIVE TURBO COMPLETE: ${data.id} [${data.type}]`);
        if (data.type === 'send') {
          // Sender: cleanup handled by file_completed signal
          // Ensure sender shows 100% if throttle missed it
          setActiveFileTransferredBytes(activeFileTotalSize);
        } else if (data.type === 'receive') {
          // Receiver: finalize file
          handleNativeComplete();
        } else {
          // Fallback if type is missing (e.g. old build)
          if (activeSocket.current === client) {
            setActiveFileTransferredBytes(activeFileTotalSize);
          } else {
            handleNativeComplete();
          }
        }
        nativeTransferActive.current = null;
      },
    );

    const subError = turboEvents.addListener('onTurboError', (data: any) => {
      console.log(`--- NATIVE TURBO ERROR: ${data.id}, ${data.error}`);
      nativeTransferActive.current = null;

      // 🚀 Fallback: Resume JS loop
      if (turboFallbackTimer.current) {
        clearTimeout(turboFallbackTimer.current);
        turboFallbackTimer.current = null;
      }

      const socket = activeSocket.current;
      if (socket) {
        console.log('--- NATIVE ERROR: Falling back to JS loop.');
        sendChunkAck(
          0,
          WINDOW_SIZE,
          socket,
          setTotalSentBytes,
          setSentFiles,
          setActiveFileTransferredBytes,
        );
      }
    });

    return () => {
      subProgress.remove();
      subComplete.remove();
      subError.remove();
    };
  }, [client, generateFile]);

  const handlePacket = useCallback(
    async (parsedData: any, socket: any) => {
      if (
        parsedData?.event !== 'receive_chunk_ack' ||
        parsedData?.chunkNo % 20 === 0
      ) {
        console.log(
          '--- TCP Packet Received:',
          parsedData?.event,
          parsedData?.id || parsedData?.chunkNo || '',
        );
      }

      if (parsedData?.event === 'connect') {
        setIsConnected(true);
        setConnectedDevice(parsedData?.deviceName);
      }

      switch (parsedData.event) {
        case 'file_queued': {
          console.log('--- file_queued received:', parsedData.file.name);
          setReceivedFiles((prev: any[]) => [...prev, parsedData.file]);
          break;
        }
        case 'batch_stats': {
          console.log(
            '--- batch_stats received:',
            parsedData.totalFiles,
            parsedData.totalSize,
          );
          setBatchTotalFiles(parsedData.totalFiles);
          setBatchTotalSize(parsedData.totalSize);
          break;
        }
        // NOTE: 'turbo_start' event removed — it was a duplicate of the file_ack → turbo_ready
        // flow and caused double receiveFile() calls. All native turbo logic is now handled
        // exclusively via the file_ack handler below.
        case 'file_ack': {
          console.log(
            `--- TCP: Handshake Success! Starting transfer for: ${parsedData.file?.name}`,
          );
          setActiveFileId(parsedData.file?.id);
          setActiveFileTotalSize(parsedData.file?.size || 0);

          // 🏁 TURBO NEGOTIATION (Receiver Side)
          // Native turbo is supported on both Android and iOS now.
          const senderIsNativeCapable = true;
          const isNativeTurbo =
            !!TurboTransfer &&
            parsedData.file.size >= 0 &&
            senderIsNativeCapable;

          if (isNativeTurbo) {
            console.log(
              '--- TCP: Skipping JS fallback streams. Native Turbo is selected.',
            );
            initNativeFileAck(
              parsedData.file,
              setReceivedFiles,
              setActiveFileTotalSize,
              setActiveFileTransferredBytes,
            );

            let turboPort = baseTurboPort.current;
            baseTurboPort.current = turboPort >= 8200 ? 8085 : turboPort + 1;
            let myIp = await DeviceInfo.getIpAddress();

            // 💡 IP Stability Fix: If getting private/useless IP, try using socket remote address
            if (myIp === '127.0.0.1' || myIp === '::1' || !myIp) {
              const addr = socket.address();
              if (addr?.address && addr.address !== '127.0.0.1') {
                myIp = addr.address;
              }
            }

            console.log(
              `--- NATIVE: Signalling turbo readiness for ${parsedData.file.id} on ${myIp}:${turboPort}`,
            );

            const basePath =
              Platform.OS === 'ios'
                ? RNFS.DocumentDirectoryPath
                : RNFS.ExternalDirectoryPath;
            const filePath = `${basePath}/${parsedData.file.name}`;

            // 🔥 IMPORTANT RESET FOR NATIVE MODE:
            nativeTransferActive.current = parsedData.file.id;
            nativeTransferredRef.current = 0;
            lastTurboUIUpdate.current = 0;
            setActiveFileTransferredBytes(0);

            TurboTransfer.receiveFile(parsedData.file.id, filePath, turboPort);
            sendMessage({
              event: 'turbo_ready',
              id: parsedData.file.id,
              port: turboPort,
              ip: myIp,
            });
          } else {
            // 🌍 STANDARD MODE (JS Fallback)
            setActiveFileTransferredBytes(0);
            receiveFileAck(
              parsedData.file,
              socket,
              setReceivedFiles,
              setActiveFileTotalSize,
              setActiveFileTransferredBytes,
            );
          }
          break;
        }
        case 'send_chunk_ack': {
          console.log(
            '--- Event: send_chunk_ack, chunkNo:',
            parsedData.chunkNo,
          );
          if (
            nativeTransferActive.current === (parsedData.id || activeFileId)
          ) {
            console.log(
              '--- TCP: Skipping JS send_chunk_ack - Native Turbo is handling this file.',
            );
            return;
          }
          sendChunkAck(
            parsedData.chunkNo,
            parsedData.windowSize ?? 1,
            socket,
            setTotalSentBytes,
            setSentFiles,
            setActiveFileTransferredBytes,
          );
          break;
        }
        case 'receive_chunk_ack': {
          if (parsedData.chunkNo % 20 === 0) {
            console.log(
              '--- Event: receive_chunk_ack, chunkNo:',
              parsedData.chunkNo,
            );
          }
          if (nativeTransferActive.current === activeFileId) {
            console.log(
              '--- TCP: Skipping JS receive_chunk_ack - Native Turbo is handling this file.',
            );
            return;
          }
          receiveChunkAck(
            parsedData.chunk,
            parsedData.chunkNo,
            socket,
            setTotalReceivedBytes,
            generateFile,
            setActiveFileTransferredBytes,
            parsedData.windowSize ?? WINDOW_SIZE,
          );
          break;
        }
        case 'file_completed': {
          console.log('--- Event: file_completed, target id:', parsedData.id);
          // Clear safety timeout since transfer completed successfully
          if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
          }
          const tempPath = tempPathsRef.current[parsedData.id];
          if (tempPath) {
            const cleanPath =
              Platform.OS === 'android'
                ? tempPath.replace('file://', '')
                : tempPath;

            console.log('--- ID Match! Cleaning up:', cleanPath);
            RNFS.unlink(cleanPath)
              .then(() => {
                console.log('--- Success: Temp file deleted ✅');
                delete tempPathsRef.current[parsedData.id];
              })
              .catch(err =>
                console.log('--- Error: Unlink failed ❌:', err?.message),
              );
          } else {
            console.log(
              '--- No direct ref for ID:',
              parsedData.id,
              '. Checking sentFiles...',
            );
            const completedFile = sentFilesRef.current?.find(
              f => f.id === parsedData.id,
            );
            if (
              completedFile?.uri &&
              completedFile.uri.includes(RNFS.CachesDirectoryPath)
            ) {
              const cleanPath =
                Platform.OS === 'android'
                  ? completedFile.uri.replace('file://', '')
                  : completedFile.uri;
              console.log('--- Found in sentFiles, unlinking:', cleanPath);
              RNFS.unlink(cleanPath).catch(() => {});
            }
          }
          setSentFiles((prev: any[]) =>
            prev.map(file =>
              file.id === parsedData.id ? { ...file, available: true } : file,
            ),
          );

          // 🛡️ BATCH STABILITY COOL-DOWN
          // Delay resetting chunk state so the SENDER waits 500ms before starting next item
          console.log(
            '--- TCP: Cooldown before processing next item in batch...',
          );
          setTimeout(() => {
            resetCurrentChunkSet();
            setActiveFileId(null);
            setActiveFileTotalSize(0);
            setActiveFileTransferredBytes(0);
          }, 500);
          break;
        }
        case 'turbo_ready': {
          console.log(
            `--- TURBO READY SIGNAL RECEIVED. Original provided IP: ${parsedData.ip}:${parsedData.port}`,
          );
          // 🔥 Use Zustand store (always up-to-date) instead of React state (can be stale in closures)
          const turboChunkSet = useChunkStore.getState().currentChunkSet;
          const turboActiveId = turboChunkSet?.id;
          // Both Android and iOS now use Native Turbo for SENDING.
          if (TurboTransfer && turboActiveId === parsedData.id) {
            if (turboChunkSet && turboChunkSet.filePath) {
              nativeTransferActive.current = parsedData.id;

              // 🚀 NATIVE IP FIX: ALWAYS use socket.remoteAddress if available over parsed IP to prevent Hotspot Creator fallback logic issues
              let realTargetIp = parsedData.ip;
              const socketRemote = socket?.remoteAddress;
              // If it's a valid remote address and the parsed IP is broken or local loopback
              if (
                socketRemote &&
                socketRemote !== '127.0.0.1' &&
                socketRemote !== '::1'
              ) {
                realTargetIp = socketRemote;
              }

              // 🚀 RESET PROGRESS REFS for new file
              nativeTransferredRef.current = 0;
              lastTurboUIUpdate.current = 0;
              setActiveFileTransferredBytes(0);

              // 🚀 Fallback Safety: If no progress in 6s, assume Turbo failed
              if (turboFallbackTimer.current)
                clearTimeout(turboFallbackTimer.current);
              turboFallbackTimer.current = setTimeout(() => {
                if (nativeTransferActive.current === parsedData.id) {
                  console.log('--- NATIVE TIMEOUT: Reverting to JS mode.');
                  nativeTransferActive.current = null;
                  sendChunkAck(
                    0,
                    WINDOW_SIZE,
                    socket,
                    setTotalSentBytes,
                    setSentFiles,
                    setActiveFileTransferredBytes,
                  );
                }
              }, 6000);

              console.log(
                `--- NATIVE: Starting turbo-speed send reliably routed to: ${realTargetIp}:${parsedData.port}`,
              );
              TurboTransfer.sendFile(
                parsedData.id,
                turboChunkSet.filePath,
                realTargetIp,
                parsedData.port,
              );
            }
          } else if (turboActiveId === parsedData.id) {
            // 🍎 iOS SENDER FALLBACK: Use JS chunk-based sending
            console.log('--- iOS: Using JS chunk fallback for sending.');
            sendChunkAck(
              0,
              WINDOW_SIZE,
              socket,
              setTotalSentBytes,
              setSentFiles,
              setActiveFileTransferredBytes,
            );
          }
          break;
        }
        case 'pause_transfer': {
          console.log('--- TCP: Pause signal received from remote.');
          useChunkStore.getState().setPaused(true);

          // 🛡️ NATIVE PROTECTION: Immediately stop any native transfer threads
          if (TurboTransfer && activeFileId) {
            console.log(
              `--- NATIVE: Remote paused. Pausing local native thread for: ${activeFileId}`,
            );
            if (TurboTransfer.pauseTransfer)
              TurboTransfer.pauseTransfer(activeFileId);
          }
          break;
        }
        case 'resume_transfer': {
          console.log('--- TCP: Resume signal received from remote.');
          useChunkStore.getState().setPaused(false);

          // If we are native, unpause the thread
          if (TurboTransfer && activeFileId && TurboTransfer.resumeTransfer) {
            console.log(
              `--- NATIVE: Resuming native thread for: ${activeFileId}`,
            );
            TurboTransfer.resumeTransfer(activeFileId);
          } else {
            // Fallback for JS
            const state = useChunkStore.getState();
            if (
              state.currentChunkSet &&
              state.currentChunkSet.lastChunkNo !== undefined
            ) {
              console.log(
                `--- TCP: Resuming sender from chunk: ${state.currentChunkSet.lastChunkNo}`,
              );
              sendChunkAck(
                state.currentChunkSet.lastChunkNo,
                WINDOW_SIZE,
                socket,
                setTotalSentBytes,
                setSentFiles,
                setActiveFileTransferredBytes,
              );
            }
          }
          break;
        }
      }
    },
    [
      setIsConnected,
      setConnectedDevice,
      setReceivedFiles,
      setTotalSentBytes,
      setTotalReceivedBytes,
      setActiveFileId,
      generateFile,
      setSentFiles,
      resetCurrentChunkSet,
      setBatchTotalFiles,
      setBatchTotalSize,
      activeFileId,
      sentFiles,
      receivedFiles,
      isConnected,
      connectedDevice,
      batchTotalFiles,
      batchTotalSize,
    ],
  );

  // Sync the listener Ref to the latest handler to prevent stale closures
  useEffect(() => {
    handlePacketRef.current = handlePacket;
  }, [handlePacket]);

  const makeFramedReader = useCallback(
    (socket: any) => {
      let buffer = Buffer.alloc(0);

      socket.on('data', (newData: any) => {
        // Ensure we're working with a Buffer for binary safety
        const chunk = Buffer.isBuffer(newData) ? newData : Buffer.from(newData);
        buffer = Buffer.concat([buffer, chunk]);

        let offset = 0;
        let newlineIndex;

        while ((newlineIndex = buffer.indexOf(10, offset)) !== -1) {
          // Found a full packet frame!
          const line = buffer.toString('utf8', offset, newlineIndex).trim();
          offset = newlineIndex + 1;

          if (line) {
            try {
              const parsed = JSON.parse(line);
              // Always use the LATEST logic provided by the Ref
              handlePacketRef.current?.(parsed, socket);
            } catch (e) {
              console.log(
                '--- TCP JSON Parse Error (likely partial packet):',
                e,
              );
            }
          }
        }

        // Only slice the buffer once at the END for the remaining fragment
        if (offset > 0) {
          buffer = buffer.slice(offset);
        }

        // Safety Lock: Keep the buffer size under 24MB to avoid iOS OOM
        if (buffer.length > 24 * 1024 * 1024) {
          console.log('--- TCP: Discarding overflow buffer burst (24MB+)');
          buffer = Buffer.alloc(0);
        }
      });
    },
    [handlePacket],
  );

  const startServer = useCallback(
    (port: number) => {
      if (server) return;

      setBatchTotalFiles(0);
      setBatchTotalSize(0);
      setTotalReceivedBytes(0);
      setTotalSentBytes(0);
      setActiveFileId(null);

      const newServer = TcpSocket.createServer(socket => {
        console.log('Client connected');
        setServerSocket(socket);

        // Configure socket safely inside the callback
        if (socket) {
          console.log('--- TCP: Configuring incoming server socket...');
          safeSocketCall(socket, 'setNoDelay', true);
          safeSocketCall(socket, 'setKeepAlive', true);
          safeSocketCall(socket, 'setTimeout', 0);
        }
        makeFramedReader(socket);

        socket.on('close', () => {
          console.log('Client disconnected (socket closed)');
          setIsConnected(false);
          setConnectedDevice(null);
          setReceivedFiles([]);
          setSentFiles([]);
          setBatchTotalFiles(0);
          setBatchTotalSize(0);
          setTotalReceivedBytes(0);
          setTotalSentBytes(0);
          setActiveFileId(null);
          cleanupCache(); // Trigger cleanup when disconnected
        });

        socket.on('error', err => {
          console.log('Server socket error:', err);
          setIsConnected(false);
          setConnectedDevice(null);
          setReceivedFiles([]);
          setSentFiles([]);
          setBatchTotalFiles(0);
          setBatchTotalSize(0);
          setTotalReceivedBytes(0);
          setTotalSentBytes(0);
          setActiveFileId(null);
        });
      });

      newServer.listen({ port, host: '0.0.0.0' }, () => {
        const address = newServer.address();
        console.log(`Server running on ${address?.address}:${address?.port}`);
      });

      newServer.on('error', error => console.log('Server error:', error));

      setServer(newServer);
    },
    [server, makeFramedReader, setReceivedFiles, setSentFiles],
  );

  const connectToServer = useCallback(
    (host: string, port: number, deviceName: string) => {
      if (client) return;

      setBatchTotalFiles(0);
      setBatchTotalSize(0);
      setTotalReceivedBytes(0);
      setTotalSentBytes(0);
      setActiveFileId(null);

      const newClient = TcpSocket.connect({ host, port }, () => {
        console.log('Connected to server');
        setIsConnected(true);
        setConnectedDevice(deviceName);

        const myDeviceName = DeviceInfo.getDeviceNameSync();
        const msg = {
          event: 'connect',
          deviceName: myDeviceName,
        };
        newClient.write(JSON.stringify(msg) + '\n');
      });

      // Configure socket safely
      if (newClient) {
        console.log('--- TCP: Configuring client socket...');
        safeSocketCall(newClient, 'setNoDelay', true);
        safeSocketCall(newClient, 'setKeepAlive', true);
        safeSocketCall(newClient, 'setTimeout', 0);
      }
      makeFramedReader(newClient);

      newClient.on('close', () => {
        console.log('Connected to server (socket closed)');
        setIsConnected(false);
        setConnectedDevice(null);
        setClient(null);
        setReceivedFiles([]);
        setSentFiles([]);
        setBatchTotalFiles(0);
        setBatchTotalSize(0);
        setTotalReceivedBytes(0);
        setTotalSentBytes(0);
        setActiveFileId(null);
        cleanupCache(); // Trigger cleanup when disconnected
      });

      newClient.on('error', err => {
        console.log('Client socket error:', err);
        setIsConnected(false);
        setClient(null);
        setReceivedFiles([]);
        setSentFiles([]);
        setBatchTotalFiles(0);
        setBatchTotalSize(0);
        setTotalReceivedBytes(0);
        setTotalSentBytes(0);
        setActiveFileId(null);
      });

      setClient(newClient);
    },
    [client, makeFramedReader, setReceivedFiles, setSentFiles],
  );

  const disconnect = useCallback(() => {
    if (client) {
      client.removeAllListeners();
      client.destroy();
    }
    if (serverSocket) {
      serverSocket.removeAllListeners();
      serverSocket.destroy?.();
    }
    if (server) {
      server.removeAllListeners?.();
      server.close();
    }
    setClient(null);
    setServer(null);
    setServerSocket(null);
    setIsConnected(false);
    setConnectedDevice(null);
    setSentFiles([]);
    setReceivedFiles([]);
    setTotalReceivedBytes(0);
    setTotalSentBytes(0);
    setBatchTotalFiles(0);
    setBatchTotalSize(0);
    setActiveFileId(null);
    setActiveFileTotalSize(0);
    setActiveFileTransferredBytes(0);
    setCurrentChunkSet(null);
    setChunkStore(null);
    isProcessing.current = false;
    sendQueue.current = [];
    cleanupCache(); // Trigger cleanup when disconnecting
    useChunkStore.getState().setPaused(false); // Reset pause on disconnect
    console.log('--- TCP State Disconnected & Reset');
  }, [client, server, serverSocket, setCurrentChunkSet, setChunkStore]);

  const togglePause = useCallback(() => {
    const { isPaused: currentPaused, togglePause: toggle } =
      useChunkStore.getState();
    toggle();
    const nextPaused = !currentPaused;

    console.log(`--- TCP: Toggling pause to: ${nextPaused}`);
    sendMessage({
      event: nextPaused ? 'pause_transfer' : 'resume_transfer',
    });

    // If we resumed, restart the transfer
    if (!nextPaused) {
      // 🔥 NATIVE TURBO RESUME: Directly unblock the native thread
      if (TurboTransfer && activeFileId) {
        console.log(
          `--- TCP: Resuming native Turbo transfer for: ${activeFileId}`,
        );
        if (TurboTransfer.resumeTransfer) {
          TurboTransfer.resumeTransfer(activeFileId);
        }
      }

      // JS FALLBACK RESUME: Trigger the next chunk window
      const state = useChunkStore.getState();
      const socket = getSocket();
      if (
        state.currentChunkSet &&
        state.currentChunkSet.lastChunkNo !== undefined &&
        socket
      ) {
        console.log(
          `--- TCP: Resuming JS sender loop from: ${state.currentChunkSet.lastChunkNo}`,
        );
        sendChunkAck(
          state.currentChunkSet.lastChunkNo,
          WINDOW_SIZE,
          socket,
          setTotalSentBytes,
          setSentFiles,
          setActiveFileTransferredBytes,
        );
      }
    }
  }, [
    sendMessage,
    getSocket,
    setTotalSentBytes,
    setSentFiles,
    setActiveFileTransferredBytes,
    activeFileId,
  ]);

  // isPaused is already extracted via useChunkStore above

  const getFileExtension = useCallback((file: any) => {
    const name = file?.name || file?.fileName || '';
    if (name.includes('.')) {
      return '.' + name.split('.').pop().toLowerCase();
    }
    if (file?.type?.includes('/')) {
      return '.' + file.type.split('/').pop().toLowerCase();
    }
    return '.bin';
  }, []);

  const sendQueue = useRef<any[]>([]);
  const isProcessing = useRef(false);

  useEffect(() => {
    console.log(
      '--- currentChunkSet changed to:',
      currentChunkSet ? 'PAYLOAD' : 'NULL',
    );
    if (currentChunkSet === null) {
      isProcessing.current = false;
      setActiveFileId(null);
      setActiveFileTotalSize(0);
      setActiveFileTransferredBytes(0);
      if (sendQueue.current.length > 0) {
        processNextInQueue();
      } else {
        // Queue is empty, can perform a broad cleanup if needed
        cleanupCache();
      }
    }
  }, [currentChunkSet]);

  const processNextInQueue = useCallback(() => {
    console.log(
      '--- processNextInQueue called. Queue size:',
      sendQueue.current.length,
      'isProcessing:',
      isProcessing.current,
    );
    if (sendQueue.current.length === 0 || isProcessing.current) return;

    const nextItem = sendQueue.current.shift();
    if (nextItem) {
      console.log('--- Processing next from queue:', nextItem.name);
      isProcessing.current = true;
      processFile(nextItem);
    }
  }, []);

  const sendFileAck = useCallback(
    (file: any, type: 'image' | 'file' | 'video' | 'audio') => {
      const activeUri = file?.fileCopyUri || file?.uri;
      if (!activeUri) return;

      const rawData = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name:
          type === 'file'
            ? file?.name
            : file?.fileName || file?.name || 'Unknown',
        size:
          type === 'file'
            ? Number(file?.size)
            : Number(file?.fileSize || file?.size || 0),
        mimeType: getFileExtension(file),
        type,
        uri: file?.copyToPath || file?.fileCopyUri || activeUri,
        copyToPath: file?.copyToPath,
        fileCopyUri: file?.fileCopyUri,
        available: false,
      };

      console.log('--- sendFileAck added to queue:', rawData.name);
      // Safety check for NaN
      if (isNaN(rawData.size)) {
        rawData.size = 0;
      }
      setSentFiles((prev: any[]) => [rawData, ...prev]);
      sendQueue.current.push({ ...rawData, file });
      sendMessage({ event: 'file_queued', file: rawData });

      // Sync batch stats with receiver
      const newTotalFiles = (sentFiles?.length || 0) + 1;
      const newTotalSize =
        (sentFiles?.reduce((acc, f) => acc + (f.size || 0), 0) || 0) +
        rawData.size;
      setBatchTotalFiles(newTotalFiles);
      setBatchTotalSize(newTotalSize);
      sendMessage({
        event: 'batch_stats',
        totalFiles: newTotalFiles,
        totalSize: newTotalSize,
      });

      if (!isProcessing.current) {
        processNextInQueue();
      }
    },
    [getSocket, sendMessage, processNextInQueue, sentFiles],
  );

  const sendBatchAck = useCallback(
    (files: any[], type: 'image' | 'file' | 'video' | 'audio') => {
      if (!files || !Array.isArray(files) || files.length === 0) {
        console.log(
          '--- TCP: sendBatchAck called with empty or invalid files array',
        );
        return;
      }

      console.log(`--- TCP: sendBatchAck called for ${files.length} ${type}s`);
      const rawFilesData = files
        .map(file => {
          if (!file) return null;
          const name =
            type === 'file'
              ? file?.name
              : file?.fileName || file?.name || 'Unknown';
          const size =
            type === 'file'
              ? Number(file?.size)
              : Number(file?.fileSize || file?.size || 0);

          const rawData = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            name,
            size: isNaN(size) ? 0 : size,
            mimeType: getFileExtension(file),
            type,
            uri:
              file?.copyToPath || file?.fileCopyUri || file?.uri || file?.path,
            copyToPath: file?.copyToPath,
            fileCopyUri: file?.fileCopyUri,
            available: false,
          };

          if (rawData.uri && rawData.uri.includes(RNFS.CachesDirectoryPath)) {
            tempPathsRef.current[rawData.id] = rawData.uri;
          }
          return { ...rawData, file };
        })
        .filter(Boolean);

      if (rawFilesData.length === 0) {
        console.log('--- TCP: sendBatchAck: No valid files after mapping');
        return;
      }

      setSentFiles((prev: any[]) => [
        ...rawFilesData
          .map(d => {
            if (!d) return null;
            const { file, ...rest } = d;
            return rest;
          })
          .filter(Boolean),
        ...prev,
      ]);

      sendQueue.current.push(...rawFilesData);
      console.log(
        `--- TCP: Queue updated. Current size: ${sendQueue.current.length}`,
      );

      // 🔄 RESET STATS FOR NEW BATCH: Ensure previous transfer totals don't bloat new ones.
      setTotalSentBytes(0);
      setTotalReceivedBytes(0);

      setBatchTotalFiles(prevFiles => {
        const newTotalFiles = prevFiles + rawFilesData.length;
        setBatchTotalSize(prevSize => {
          const newTotalSize =
            prevSize +
            rawFilesData.reduce((acc, f: any) => acc + (f?.size || 0), 0);

          sendMessage({
            event: 'batch_stats',
            totalFiles: newTotalFiles,
            totalSize: newTotalSize,
          });

          return newTotalSize;
        });
        return newTotalFiles;
      });

      const sendQueuedFiles = async () => {
        // Send in reverse order so the receiver prepends them into the correct order [A, B, C]
        for (let i = rawFilesData.length - 1; i >= 0; i--) {
          const d = rawFilesData[i];
          if (!d) continue;
          const { file, ...rest } = d;
          sendMessage({ event: 'file_queued', file: rest });
          await new Promise<void>(resolve => setTimeout(resolve, 10));
        }

        if (!isProcessing.current) {
          processNextInQueue();
        }
      };
      sendQueuedFiles();
    },
    [
      getFileExtension,
      sendMessage,
      processNextInQueue,
      setSentFiles,
      setBatchTotalFiles,
      setBatchTotalSize,
    ],
  );

  // 🚀 SHARED FILES MONITOR: Auto-start transfer if connection is established and files are pending
  useEffect(() => {
    if (isConnected && pendingSharedFiles.length > 0) {
      console.log(
        `--- TCP: Connection detected! Auto-sending ${pendingSharedFiles.length} shared files.`,
      );
      const filesToBatch = [...pendingSharedFiles];
      setPendingSharedFiles([]); // Clear pending state
      if (TurboTransfer) TurboTransfer.clearSharedFiles(); // Clear native static list

      // Small delay to ensure handshake is fully settled
      setTimeout(() => {
        sendBatchAck(filesToBatch, 'file');
      }, 1000);
    }
  }, [isConnected, pendingSharedFiles, sendBatchAck]);

  // 🔗 SHARE EXTENSION LIFECYCLE: Detect when app is opened via share sheet
  // This handles BOTH iOS (URL scheme shareanywhere://share) and Android (intent-based)
  useEffect(() => {
    // 1. Handle deep link URL opens (iOS Share Extension triggers shareanywhere://share)
    const handleDeepLink = (event: { url: string }) => {
      console.log('--- SHARE LIFECYCLE: Deep link received:', event.url);
      if (event.url?.includes('share')) {
        // Delay to allow UserDefaults sync between extension and main app
        setTimeout(() => {
          checkSharedFiles();
        }, 500);
      }
    };

    // Check if app was opened with a URL (cold start)
    Linking.getInitialURL()
      .then(url => {
        if (url?.includes('share')) {
          console.log(
            '--- SHARE LIFECYCLE: App cold-started with share URL:',
            url,
          );
          setTimeout(() => {
            checkSharedFiles();
          }, 800);
        }
      })
      .catch(() => {});

    // Listen for URL opens while app is running (warm start)
    const linkingSub = Linking.addEventListener('url', handleDeepLink);

    // 2. Handle AppState changes (app foregrounded after share extension ran)
    const handleAppState = (nextState: string) => {
      if (nextState === 'active') {
        console.log(
          '--- SHARE LIFECYCLE: App became active, checking for shared files...',
        );
        checkSharedFiles();
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppState);

    // 3. Initial check on mount (handles Android intent-based sharing)
    setTimeout(() => {
      checkSharedFiles();
    }, 1000);

    return () => {
      linkingSub.remove();
      appStateSub.remove();
    };
  }, [checkSharedFiles]);

  const processFile = async (item: any) => {
    const { file, id, name, size, mimeType } = item;

    // Prevent redundant handshake if already sent for this ID
    if (activeFileId === id && isProcessing.current) {
      console.log('--- TCP: Skipping redundant processFile for ID:', id);
      return;
    }

    console.log('--- processFile started for:', name, 'ID:', id);
    const socket = getSocket();
    if (!socket) {
      console.log('--- processFile: No socket available!');
      isProcessing.current = false;
      setActiveFileId(null);
      setActiveFileTotalSize(0);
      setActiveFileTransferredBytes(0);
      processNextInQueue();
      return;
    }

    // Priority order for resolving actual file path:
    // 1. copyToPath — set by react-native-image-picker when copyTo: 'caches' is used (iOS ph:// → local file)
    // 2. fileCopyUri — set by @react-native-documents/picker when copyTo: 'cachesDirectory' is used
    // 3. uri / path — fallback (works for Android file:// directly, but NOT for iOS ph://)
    let currentFilePath: string | undefined =
      item.copyToPath || item.fileCopyUri || item.uri || item.path;

    console.log('--- processFile: Raw URI fields:', {
      copyToPath: item.copyToPath,
      fileCopyUri: item.fileCopyUri,
      uri: item.uri,
      path: item.path,
      resolved: currentFilePath,
    });

    // 🍎 iOS URI STABILITY FIX:
    // Any URI that isn't already a direct local path starts with a copy to our stable cache.
    if (
      Platform.OS === 'ios' &&
      (currentFilePath?.startsWith('ph://') ||
        (!currentFilePath?.startsWith('/') &&
          !currentFilePath?.startsWith('file:///')))
    ) {
      try {
        const tempPath = `${RNFS.CachesDirectoryPath}/transfer_${id}_${name}`;
        console.log(
          '--- iOS: Stability Copy started:',
          currentFilePath,
          '->',
          tempPath,
        );

        // Use ReactNativeBlobUtil for ph:// resolution if possible, otherwise fallback to RNFS
        if (currentFilePath?.startsWith('ph://')) {
          // Special handling for ph:// - we use the asset resolution logic
          await ReactNativeBlobUtil.fs.cp(currentFilePath, tempPath);
        } else {
          await RNFS.copyFile(currentFilePath!, tempPath);
        }

        currentFilePath = tempPath;
        tempPathsRef.current[id] = tempPath;
      } catch (err) {
        console.log(
          '--- iOS: Stability Copy failed (fallback to direct read):',
          err,
        );
        // 🛡️ FALLBACK: If the original URI was ph:// and copy failed,
        // try using CameraRoll or native readChunkBase64 which can handle ph:// URIs.
        // For now, log and continue — the processFile exists() check below will catch this.
      }
    } else if (Platform.OS === 'ios' && currentFilePath?.includes('AppIcon')) {
      // Special handling for app icons/assets
      try {
        const tempPath = `${RNFS.CachesDirectoryPath}/transfer_icon_${id}_${name}`;
        await RNFS.copyFile(currentFilePath!, tempPath);
        currentFilePath = tempPath;
        tempPathsRef.current[id] = tempPath;
      } catch (e) {}
    }

    // 🔗 iOS SHARED FILE PATH FIX: Check if file is in app group container
    // Share extension saves files to the app group shared container which is
    // accessible but at a different path than Documents/Caches. The RNFS bridge
    // sometimes fails to stat/read files outside the direct sandbox.
    // We explicitly copy it to our CachesDirectory to ensure read permissions.
    if (
      Platform.OS === 'ios' &&
      currentFilePath &&
      currentFilePath.includes('AppGroup')
    ) {
      try {
        const cleanOriginalPath = currentFilePath.replace(/^file:\/\//, '');
        const tempPath = `${RNFS.CachesDirectoryPath}/share_${id}_${name}`;
        console.log(
          '--- iOS: Migrating Shared AppGroup file to sandbox:',
          cleanOriginalPath,
          '->',
          tempPath,
        );

        // We use ReactNativeBlobUtil to safely copy cross-container
        if (await ReactNativeBlobUtil.fs.exists(cleanOriginalPath)) {
          await ReactNativeBlobUtil.fs.cp(cleanOriginalPath, tempPath);
          currentFilePath = tempPath;
          tempPathsRef.current[id] = tempPath;
          console.log('--- iOS: Successfully staged Shared file into sandbox.');
        } else {
          console.log(
            '--- iOS: AppGroup file does not exist at:',
            cleanOriginalPath,
          );
        }
      } catch (e) {
        console.log('--- iOS: Failed to migrate Shared AppGroup file:', e);
      }
    }

    // 🚀 TURBO FAST-PATH: Android content:// URIs with native Turbo available
    // Skip the expensive JS-side file copy! The native module reads content:// directly
    // via ContentResolver. This eliminates 10-20 seconds of delay for large videos.
    const isAndroidContentUri =
      Platform.OS === 'android' && currentFilePath?.startsWith('content://');
    const isNativeTurboAvailable = !!TurboTransfer;

    if (isAndroidContentUri && isNativeTurboAvailable) {
      console.log(
        `--- 🚀 TURBO FAST-PATH: Skipping JS file copy for content:// URI`,
      );
      // Use picker metadata size directly — native will query ContentResolver for exact size
      let fileSize = Number(size);
      if (!fileSize || isNaN(fileSize)) {
        fileSize = 0;
      }

      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE) || 1;
      const rawDataForAck = { id, name, size: fileSize, mimeType, totalChunks };

      const chunkSetPayload = {
        id,
        totalChunks,
        chunkArray: [],
        filePath: currentFilePath, // Pass content:// URI directly!
        fileSize,
        chunkSize: CHUNK_SIZE,
        name,
      };

      setCurrentChunkSet(chunkSetPayload);
      setActiveFileId(id);
      setActiveFileTotalSize(rawDataForAck.size);
      setActiveFileTransferredBytes(0);

      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      safetyTimeoutRef.current = setTimeout(() => {
        if (isProcessing.current && activeFileId === id) {
          console.log(
            '--- SAFETY: Handshake/Transfer timeout. Resetting queue for:',
            name,
          );
          isProcessing.current = false;
          setActiveFileId(null);
          setCurrentChunkSet(null);
          processNextInQueue();
        }
      }, 30000);

      try {
        console.log('--- Sending handshake for (turbo fast-path):', name);
        safeWrite(
          socket,
          JSON.stringify({
            event: 'file_ack',
            file: rawDataForAck,
            senderPlatform: Platform.OS,
          }) + '\n',
        );
        console.log('FILE ACKNOWLEDGE SENT ✅ (turbo fast-path):', name);
      } catch (error) {
        console.log('Error Sending Handshake:', error);
        isProcessing.current = false;
        setActiveFileId(null);
        processNextInQueue();
      }
      return; // 🚀 Done — native module handles the rest
    }

    // ── STANDARD PATH: content:// copy for JS fallback (non-Turbo) ──
    if (isAndroidContentUri) {
      try {
        const tempPath = `${
          RNFS.CachesDirectoryPath
        }/temp_${Date.now()}_${name}`;
        console.log(`--- Creating temp copy (ID: ${id}) at: ${tempPath}`);
        await RNFS.copyFile(currentFilePath!, tempPath);
        currentFilePath = tempPath;
        tempPathsRef.current[id] = tempPath;
        console.log(`--- Recorded in Ref Map: ${id} -> ${tempPath}`);
      } catch (err) {
        console.log('Error copying content URI:', err);
      }
    }

    let normalizedPath = currentFilePath;
    if (Platform.OS === 'ios') {
      normalizedPath = currentFilePath?.replace(/^file:\/\//, '');
      if (normalizedPath) {
        normalizedPath = decodeURIComponent(normalizedPath);
      }
    }

    console.log('--- processFile: normalizedPath:', normalizedPath);

    if (!normalizedPath) {
      console.log('--- ERROR: Could not resolve a valid path for file:', name);
      isProcessing.current = false;
      setActiveFileId(null);
      processNextInQueue();
      return;
    }

    if (!(await RNFS.exists(normalizedPath))) {
      console.log('--- ERROR: File does not exist at path:', normalizedPath);
      const decoded = decodeURIComponent(normalizedPath);
      if (decoded !== normalizedPath && (await RNFS.exists(decoded))) {
        normalizedPath = decoded;
        console.log(
          '--- FIXED: File found after extra decoding:',
          normalizedPath,
        );
      } else if (Platform.OS === 'ios') {
        // 🍎 iOS VIDEO COPY FALLBACK: When launchImageLibrary's copyTo fails silently
        // for large videos (100MB+), the copyToPath is dangling. Recover by re-copying
        // from the original ph:// URI via ReactNativeBlobUtil which handles Apple Photos
        // asset resolution natively.
        const originalUri = item.uri || file?.uri;
        const isPhotoLibraryUri =
          originalUri?.startsWith('ph://') ||
          originalUri?.includes('PHAsset') ||
          originalUri?.includes('assets-library://');

        if (originalUri && isPhotoLibraryUri) {
          console.log(
            '--- iOS FALLBACK: copyTo failed, attempting ph:// recovery:',
            originalUri,
          );
          const fallbackPath = `${RNFS.CachesDirectoryPath}/recovery_${id}_${name}`;
          try {
            await ReactNativeBlobUtil.fs.cp(originalUri, fallbackPath);
            if (await RNFS.exists(fallbackPath)) {
              normalizedPath = fallbackPath;
              tempPathsRef.current[id] = fallbackPath;
              console.log(
                '--- iOS FALLBACK: ✅ Recovery successful:',
                fallbackPath,
              );
            } else {
              throw new Error(
                'Copy completed but file not found at destination',
              );
            }
          } catch (copyErr) {
            console.log(
              '--- iOS FALLBACK: ReactNativeBlobUtil cp failed, trying CameraRoll save...',
              copyErr,
            );
            // Last resort: use CameraRoll to get a usable local URI
            try {
              const assetData = await CameraRoll.iosGetImageDataById(
                originalUri,
                { convertHeicImages: false },
              );
              const localUri =
                assetData?.node?.image?.filepath || assetData?.node?.image?.uri;
              if (localUri) {
                const cleanLocalUri = localUri.replace(/^file:\/\//, '');
                if (await RNFS.exists(cleanLocalUri)) {
                  normalizedPath = cleanLocalUri;
                  console.log(
                    '--- iOS FALLBACK: ✅ CameraRoll resolution successful:',
                    cleanLocalUri,
                  );
                } else {
                  throw new Error(
                    'CameraRoll URI does not point to a readable file',
                  );
                }
              } else {
                throw new Error('CameraRoll returned no usable local URI');
              }
            } catch (cameraRollErr) {
              console.log(
                '--- iOS FALLBACK: ❌ All recovery paths exhausted:',
                cameraRollErr,
              );
              isProcessing.current = false;
              setActiveFileId(null);
              processNextInQueue();
              return;
            }
          }
        } else {
          console.log(
            '--- ERROR: No ph:// fallback available. Original URI:',
            originalUri,
          );
          isProcessing.current = false;
          setActiveFileId(null);
          processNextInQueue();
          return;
        }
      } else {
        isProcessing.current = false;
        setActiveFileId(null);
        processNextInQueue();
        return;
      }
    }

    let chunkSetPayload: any;
    let fileSize = Number(size);

    // 🔥 ALWAYS stat the actual file to get accurate size.
    try {
      const stat = await RNFS.stat(normalizedPath!);
      const statSize = Number(stat.size);
      if (statSize > 0) {
        if (fileSize > 0 && fileSize !== statSize) {
          console.log(
            `--- processFile: Size mismatch! metadata=${fileSize}, actual=${statSize}. Using actual.`,
          );
        }
        fileSize = statSize;
      }
    } catch (statErr) {
      console.log('--- processFile: stat error, using metadata size:', statErr);
      if (!fileSize || isNaN(fileSize)) {
        fileSize = 0;
      }
    }

    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE) || 1;
    const rawDataForAck = { id, name, size: fileSize, mimeType, totalChunks };

    chunkSetPayload = {
      id,
      totalChunks,
      chunkArray: [], // Keep empty to signal disk mode
      filePath: normalizedPath,
      fileSize,
      chunkSize: CHUNK_SIZE,
      name,
    };

    setCurrentChunkSet(chunkSetPayload);
    setActiveFileId(id);
    setActiveFileTotalSize(rawDataForAck.size);
    setActiveFileTransferredBytes(0);

    // Safety timeout: if no progress for 30s, reset isProcessing
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
    }
    safetyTimeoutRef.current = setTimeout(() => {
      if (isProcessing.current && activeFileId === id) {
        console.log(
          '--- SAFETY: Handshake/Transfer timeout. Resetting queue for:',
          name,
        );
        isProcessing.current = false;
        setActiveFileId(null);
        setCurrentChunkSet(null);
        processNextInQueue();
      }
    }, 30000);

    try {
      // 🌉 BATCH COOL-DOWN:
      // Give the iOS/Android disk 250ms to finish flushes from the last file.
      await new Promise<void>(resolve => setTimeout(() => resolve(), 250));

      console.log('--- Sending handshake for:', name);
      safeWrite(
        socket,
        JSON.stringify({
          event: 'file_ack',
          file: rawDataForAck,
          senderPlatform: Platform.OS,
        }) + '\n',
      );
      console.log('FILE ACKNOWLEDGE SENT ✅:', name);
    } catch (error) {
      console.log('Error Sending Handshake:', error);
      isProcessing.current = false;
      setActiveFileId(null);
      processNextInQueue();
    }
  };

  return (
    <TCPContext.Provider
      value={{
        server,
        client,
        isConnected,
        connectedDevice,
        sentFiles,
        receivedFiles,
        totalSentBytes,
        totalReceivedBytes,
        activeFileId,
        activeFileTotalSize,
        activeFileTransferredBytes,
        batchTotalFiles,
        batchTotalSize,
        startServer,
        connectToServer,
        sendMessage,
        sendFileAck,
        sendBatchAck,
        disconnect,
        setReceivedFiles,
        setSentFiles,
        setTotalSentBytes,
        setTotalReceivedBytes,
        togglePause,
        isPaused,
        pendingSharedFiles,
        checkSharedFiles,
        setPendingSharedFiles,
      }}
    >
      {children}
    </TCPContext.Provider>
  );
};
