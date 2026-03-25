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
import { receiveChunkAck, receiveFileAck, sendChunkAck } from './TCPUtils';
import { Platform } from 'react-native';
import { useChunkStore } from '../db/chunkStore';

// const CHUNK_SIZE = 1024 * 1024; // 1 MB per chunk
// const WINDOW_SIZE = 8;
const CHUNK_SIZE = 256 * 1024; // 🔥 256KB (best balance)
const WINDOW_SIZE = 64; // 🔥 was 16 → now 64 (BIG BOOST)
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
  } = useChunkStore();

  const activeSocket = useRef<any>(null);

  useEffect(() => {
    activeSocket.current = client || serverSocket;
  }, [client, serverSocket]);

  const getSocket = useCallback(() => activeSocket.current, []);

  const safeWrite = useCallback((socket: any, data: any) => {
    if (!socket) return;
    try {
      socket.write(data);
    } catch (error) {
      console.log('Error writing to socket:', error);
    }
  }, []);

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

    console.log('--- Finalizing file:', chunkStore.name);
    try {
      if (await RNFS.exists(tempPath)) {
        await RNFS.moveFile(tempPath, finalPath);

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
            ReactNativeBlobUtil.fs
              .scanFile([{ path: finalPath }])
              .catch(err => console.log('Gallery Scan Error:', err));
          }
        }
      }
    } catch (e) {
      console.log('Error finalizing file:', e);
    }

    setReceivedFiles(prev =>
      prev.map(file =>
        file.id === chunkStore.id
          ? { ...file, uri: finalPath, available: true }
          : file,
      ),
    );

    const fileId = chunkStore.id;
    storeReset();
    setActiveFileId(null);
    setActiveFileTotalSize(0);
    setActiveFileTransferredBytes(0);
    sendMessage({ event: 'file_completed', id: fileId });
    console.log('--- File completed and signal sent.');
  }, [sendMessage, setReceivedFiles]);

  const handlePacket = useCallback(
    (parsedData: any, socket: any) => {
      console.log('--- TCP Event Received:', parsedData?.event);

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
        case 'file_ack': {
          setActiveFileId(parsedData.file?.id);
          setActiveFileTotalSize(parsedData.file?.size || 0);
          setActiveFileTransferredBytes(0);
          receiveFileAck(
            parsedData.file,
            socket,
            setReceivedFiles,
            setActiveFileTotalSize,
            setActiveFileTransferredBytes,
          );
          break;
        }
        case 'send_chunk_ack': {
          console.log(
            '--- Event: send_chunk_ack, chunkNo:',
            parsedData.chunkNo,
          );
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
          console.log('--- Event: file_completed, id:', parsedData.id);
          setSentFiles((prev: any[]) =>
            prev.map(file =>
              file.id === parsedData.id ? { ...file, available: true } : file,
            ),
          );
          resetCurrentChunkSet();
          setActiveFileId(null);
          setActiveFileTotalSize(0);
          setActiveFileTransferredBytes(0);
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
    ],
  );

  const makeFramedReader = useCallback(
    (socket: any) => {
      let accumulation = '';

      socket.on('data', (data: any) => {
        accumulation += data.toString('utf8');

        let index;
        while ((index = accumulation.indexOf('\n')) !== -1) {
          const line = accumulation.substring(0, index).trim();
          accumulation = accumulation.substring(index + 1);

          if (line) {
            try {
              const parsed = JSON.parse(line);
              handlePacket(parsed, socket);
            } catch (e) {
              console.log('--- TCP JSON Parse Error', e);
            }
          }
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

        if (socket) {
          try {
            socket.setNoDelay(true);
            socket.setKeepAlive(true);
            socket.setTimeout(0);
          } catch (e) {
            console.log('Error configuring server socket:', e);
          }
        }
        makeFramedReader(socket);

        socket.on('close', () => {
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

      if (newClient) {
        try {
          newClient.setNoDelay(true);
          newClient.setKeepAlive(true);
          newClient.setTimeout(0);
        } catch (e) {
          console.log('Error configuring client socket:', e);
        }
      }
      makeFramedReader(newClient);

      newClient.on('close', () => {
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
  }, [client, server, serverSocket, setCurrentChunkSet, setChunkStore]);

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
      }
    }
  }, [currentChunkSet]);

  const processNextInQueue = useCallback(() => {
    if (sendQueue.current.length === 0 || isProcessing.current) return;

    const nextItem = sendQueue.current.shift();
    if (nextItem) {
      console.log('--- Processing next from queue:', nextItem.name);
      isProcessing.current = true;
      processFile(nextItem);
    }
  }, []);

  const sendFileAck = (
    file: any,
    type: 'image' | 'file' | 'video' | 'audio',
  ) => {
    if (!file?.uri) return;

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
      uri: file.uri,
      available: false,
    };

    console.log('--- sendFileAck added to queue:', rawData.name);
    // Safety check for NaN
    if (isNaN(rawData.size)) {
      rawData.size = 0;
    }
    setSentFiles((prev: any[]) => [...prev, rawData]);
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
  };

  const sendBatchAck = (
    files: any[],
    type: 'image' | 'file' | 'video' | 'audio',
  ) => {
    if (!files || files.length === 0) return;

    const rawFilesData = files.map(file => {
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
        uri: file.uri,
        available: false,
      };
      return { ...rawData, file };
    });

    setSentFiles((prev: any[]) => [
      ...prev,
      ...rawFilesData.map(d => {
        const { file, ...rest } = d;
        return rest;
      }),
    ]);

    sendQueue.current.push(...rawFilesData);

    // Sync batch stats with receiver
    setBatchTotalFiles(prevFiles => {
      const newTotalFiles = prevFiles + files.length;

      setBatchTotalSize(prevSize => {
        const newTotalSize =
          prevSize + rawFilesData.reduce((acc, f) => acc + (f.size || 0), 0);

        // Send the updated stats to the receiver
        sendMessage({
          event: 'batch_stats',
          totalFiles: newTotalFiles,
          totalSize: newTotalSize,
        });

        return newTotalSize;
      });

      return newTotalFiles;
    });

    rawFilesData.forEach(d => {
      const { file, ...rest } = d;
      sendMessage({ event: 'file_queued', file: rest });
    });

    if (!isProcessing.current) {
      processNextInQueue();
    }
  };

  const processFile = async (item: any) => {
    const { file, id, name, size, mimeType } = item;
    const socket = getSocket();
    if (!socket) {
      isProcessing.current = false;
      setActiveFileId(null);
      setActiveFileTotalSize(0);
      setActiveFileTransferredBytes(0);
      processNextInQueue();
      return;
    }

    let currentFilePath = file?.uri;
    if (
      Platform.OS === 'android' &&
      currentFilePath?.startsWith('content://')
    ) {
      try {
        const tempPath = `${
          RNFS.CachesDirectoryPath
        }/temp_${Date.now()}_${name}`;
        console.log('Copying content URI to temp path:', tempPath);
        await RNFS.copyFile(currentFilePath, tempPath);
        currentFilePath = tempPath;
      } catch (err) {
        console.log('Error copying content URI:', err);
      }
    }

    const normalizedPath =
      Platform.OS === 'ios'
        ? currentFilePath?.replace('file://', '')
        : currentFilePath;

    let chunkSetPayload: any;
    let rawDataForAck = { id, name, size, mimeType, totalChunks: 0 };

    if (Platform.OS === 'ios') {
      try {
        const fileData = await RNFS.readFile(normalizedPath, 'base64');
        const buffer = Buffer.from(fileData, 'base64');
        let offset = 0;
        const chunkArray: Buffer[] = [];
        while (offset < buffer.length) {
          chunkArray.push(buffer.slice(offset, offset + CHUNK_SIZE));
          offset += CHUNK_SIZE;
        }
        rawDataForAck.size = buffer.length;
        rawDataForAck.totalChunks = chunkArray.length;
        chunkSetPayload = { id, totalChunks: chunkArray.length, chunkArray };
      } catch (err) {
        console.log('iOS read error:', err);
        isProcessing.current = false;
        setActiveFileId(null);
        setActiveFileTotalSize(0);
        setActiveFileTransferredBytes(0);
        processNextInQueue();
        return;
      }
    } else {
      let fileSize = Number(size);
      if (!fileSize || isNaN(fileSize)) {
        try {
          const stat = await RNFS.stat(normalizedPath);
          fileSize = Number(stat.size);
        } catch {
          fileSize = 1;
        }
      }
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE) || 1;
      rawDataForAck.size = fileSize;
      rawDataForAck.totalChunks = totalChunks;
      chunkSetPayload = {
        id,
        totalChunks,
        chunkArray: [],
        filePath: normalizedPath,
        fileSize,
        chunkSize: CHUNK_SIZE,
      };
    }

    setCurrentChunkSet(chunkSetPayload);
    setActiveFileId(id);
    setActiveFileTotalSize(rawDataForAck.size);
    setActiveFileTransferredBytes(0);

    try {
      console.log('FILE ACKNOWLEDGE SENT ✅:', name);
      safeWrite(
        socket,
        JSON.stringify({ event: 'file_ack', file: rawDataForAck }) + '\n',
      );
    } catch (error) {
      console.log('Error Sending File:', error);
      isProcessing.current = false;
      setActiveFileId(null);
      setActiveFileTotalSize(0);
      setActiveFileTransferredBytes(0);
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
      }}
    >
      {children}
    </TCPContext.Provider>
  );
};
