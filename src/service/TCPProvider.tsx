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
import RNFS from 'react-native-fs';
import { receiveChunkAck, receiveFileAck, sendChunkAck } from './TCPUtils';
import { Platform } from 'react-native';
import { useChunkStore } from '../db/chunkStore';

const CHUNK_SIZE = 1024 * 256; // 256 KB per chunk
const WINDOW_SIZE = 256;

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
  startServer: (port: number) => void;
  connectToServer: (host: string, port: number, deviceName: string) => void;
  sendMessage: (message: any) => void;
  sendFileAck: (file: any, type: 'file' | 'image' | 'video' | 'audio') => void;
  disconnect: () => void;
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
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

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

      if (parsedData.event === 'file_queued') {
        console.log('--- Event: file_queued for:', parsedData.file?.name);
        setReceivedFiles((prev: any[]) => {
          const exists = prev.some(f => f.id === parsedData.file?.id);
          if (exists) return prev;
          return [...prev, parsedData.file];
        });
      }

      if (parsedData.event === 'file_ack') {
        console.log('--- Event: file_ack for:', parsedData.file?.name);
        setActiveFileId(parsedData.file?.id);
        receiveFileAck(parsedData.file, socket, setReceivedFiles);
      }

      if (parsedData.event === 'send_chunk_ack') {
        console.log('--- Event: send_chunk_ack, chunkNo:', parsedData.chunkNo);
        sendChunkAck(
          parsedData.chunkNo,
          parsedData.windowSize ?? 1,
          socket,
          setTotalSentBytes,
          setSentFiles,
        );
      }

      if (parsedData.event === 'receive_chunk_ack') {
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
          parsedData.windowSize ?? WINDOW_SIZE,
        );
      }

      if (parsedData.event === 'file_completed') {
        console.log('--- Event: file_completed, id:', parsedData.id);
        setSentFiles((prev: any[]) =>
          prev.map(file =>
            file.id === parsedData.id ? { ...file, available: true } : file,
          ),
        );
        resetCurrentChunkSet();
        setActiveFileId(null);
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
    ],
  );

  const makeFramedReader = useCallback(
    (socket: any) => {
      let chunks: string[] = [];
      let hasNewline = false;

      socket.on('data', (data: any) => {
        const str: string = data.toString('utf8');
        chunks.push(str);
        if (!hasNewline && str.includes('\n')) hasNewline = true;

        if (!hasNewline) return;

        const combined = chunks.join('');
        chunks = [];
        hasNewline = false;

        let start = 0;
        let boundary: number;
        while ((boundary = combined.indexOf('\n', start)) !== -1) {
          const packet = combined.slice(start, boundary);
          start = boundary + 1;

          if (!packet.trim()) continue;

          try {
            const parsed = JSON.parse(packet);
            handlePacket(parsed, socket);
          } catch {
            console.log('Invalid JSON packet');
          }
        }

        if (start < combined.length) {
          chunks.push(combined.slice(start));
        }
      });
    },
    [handlePacket],
  );

  const startServer = useCallback(
    (port: number) => {
      if (server) return;

      const newServer = TcpSocket.createServer(socket => {
        console.log('Client connected');
        setServerSocket(socket);

        socket.setNoDelay(true);
        socket.setKeepAlive(true);
        socket.setTimeout(0);
        makeFramedReader(socket);

        socket.on('close', () => {
          setIsConnected(false);
          setConnectedDevice(null);
          setReceivedFiles(prev => prev.filter(f => f.available));
          setSentFiles(prev => prev.filter(f => f.available));
        });

        socket.on('error', err => {
          console.log('Server socket error:', err);
          setIsConnected(false);
          setConnectedDevice(null);
          setReceivedFiles(prev => prev.filter(f => f.available));
          setSentFiles(prev => prev.filter(f => f.available));
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

      const newClient = TcpSocket.connect({ host, port }, () => {
        console.log('Connected to server');
        setIsConnected(true);
        setConnectedDevice(deviceName);

        const myDeviceName = DeviceInfo.getDeviceNameSync();
        newClient.write(
          JSON.stringify({
            event: 'connect',
            deviceName: myDeviceName,
          }) + '\n',
        );
      });

      newClient.setNoDelay(true);
      newClient.setKeepAlive(true);
      newClient.setTimeout(0);
      makeFramedReader(newClient);

      newClient.on('close', () => {
        setIsConnected(false);
        setConnectedDevice(null);
        setClient(null);
        setReceivedFiles(prev => prev.filter(f => f.available));
        setSentFiles(prev => prev.filter(f => f.available));
      });

      newClient.on('error', err => {
        console.log('Client socket error:', err);
        setIsConnected(false);
        setClient(null);
        setReceivedFiles(prev => prev.filter(f => f.available));
        setSentFiles(prev => prev.filter(f => f.available));
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
    setTotalSentBytes(0);
    setTotalReceivedBytes(0);
    setCurrentChunkSet(null);
    setChunkStore(null);
  }, [client, server, serverSocket, setCurrentChunkSet, setChunkStore]);

  const getFileExtension = useCallback((file: any) => {
    const name = file?.name || file?.fileName || '';
    if (name.includes('.')) {
      return '.' + name.split('.').pop().toLowerCase();
    }
    if (file?.type?.includes('/')) {
      return '.' + file.type.split('/').pop();
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

    if (!isProcessing.current && currentChunkSet === null) {
      processNextInQueue();
    }
  };

  const processFile = async (item: any) => {
    const { file, id, name, size, mimeType } = item;
    const socket = getSocket();
    if (!socket) {
      isProcessing.current = false;
      setActiveFileId(null);
      processNextInQueue();
      return;
    }

    let currentFilePath = file?.uri;
    if (Platform.OS === 'android' && currentFilePath?.startsWith('content://')) {
      try {
        const tempPath = `${RNFS.CachesDirectoryPath}/temp_${Date.now()}_${name}`;
        console.log('Copying content URI to temp path:', tempPath);
        await RNFS.copyFile(currentFilePath, tempPath);
        currentFilePath = tempPath;
      } catch (err) {
        console.log('Error copying content URI:', err);
      }
    }

    const normalizedPath =
      Platform.OS === 'ios' ? currentFilePath?.replace('file://', '') : currentFilePath;

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
        startServer,
        connectToServer,
        sendMessage,
        sendFileAck,
        disconnect,
      }}
    >
      {children}
    </TCPContext.Provider>
  );
};
