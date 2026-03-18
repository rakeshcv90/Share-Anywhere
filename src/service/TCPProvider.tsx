import 'react-native-get-random-values';
import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  FC,
} from 'react';
import DeviceInfo from 'react-native-device-info';
import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';
import RNFS from 'react-native-fs';
// import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { receiveChunkAck, receiveFileAck, sendChunkAck } from './TCPUtils';
import { Alert, Platform } from 'react-native';
import { useChunkStore } from '../db/chunkStore';

// Larger chunks = fewer JSON packets = much faster throughput, but heavier individual frames
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

  const { currentChunkSet, setCurrentChunkSet, setChunkStore } =
    useChunkStore();

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

  const handlePacket = useCallback(
    (parsedData: any, socket: any) => {
      if (parsedData?.event === 'connect') {
        setIsConnected(true);
        setConnectedDevice(parsedData?.deviceName);
      }

      if (parsedData.event === 'file_ack') {
        receiveFileAck(parsedData.file, socket, setReceivedFiles);
      }

      if (parsedData.event === 'send_chunk_ack') {
        sendChunkAck(
          parsedData.chunkNo,
          parsedData.windowSize ?? 1,
          socket,
          setTotalSentBytes,
          setSentFiles,
        );
      }

      if (parsedData.event === 'receive_chunk_ack') {
        receiveChunkAck(
          parsedData.chunk,
          parsedData.chunkNo,
          socket,
          setTotalReceivedBytes,
          generateFile,
          parsedData.windowSize ?? WINDOW_SIZE,
        );
      }
    },

    [],
  );

  const makeFramedReader = useCallback(
    (socket: any) => {
      let chunks: string[] = [];
      let hasNewline = false;

      socket.on('data', (data: any) => {
        const str: string = data.toString('utf8');
        chunks.push(str);
        if (!hasNewline && str.includes('\n')) hasNewline = true;

        // Only pay the cost of join + split when we have at least one boundary
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

        // Keep any incomplete tail for the next data event
        if (start < combined.length) {
          chunks.push(combined.slice(start));
        }
      });
    },
    [handlePacket],
  );
  const startServer = useCallback(
    (port: number) => {
      if (server) {
        console.log('Server already running');
        return;
      }

      const newServer = TcpSocket.createServer(socket => {
        console.log('Client connected');
        setServerSocket(socket);

        socket.setNoDelay(true);

        socket.setKeepAlive(true);
        socket.setTimeout(0);
        makeFramedReader(socket);

        // ✅ FIX: Don't disconnect on close — just mark as disconnected.
        socket.on('close', () => {
          console.log('Client disconnected');
          setIsConnected(false);
          setConnectedDevice(null);
          // Cleanup partial transfers from the UI list
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

      newServer.on('error', error => {
        console.log('Server error:', error);
      });

      setServer(newServer);
    },
    [server, makeFramedReader],
  );

  const connectToServer = useCallback(
    (host: string, port: number, deviceName: string) => {
      if (client) {
        console.log('Already connected');
        return;
      }

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

      // newClient.setNoDelay(true);
      newClient.setNoDelay(true);
      newClient.setKeepAlive(true);
      newClient.setTimeout(0);
      makeFramedReader(newClient);

      // ✅ FIX: Don't call disconnect() on close. Just update state.
      newClient.on('close', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
        setConnectedDevice(null);
        setClient(null); // ← clear so next scan can reconnect
        setReceivedFiles(prev => prev.filter(f => f.available));
        setSentFiles(prev => prev.filter(f => f.available));
      });

      newClient.on('error', err => {
        console.log('Client socket error:', err);
        setIsConnected(false);
        setClient(null); // ← clear on error too so reconnect works
        setReceivedFiles(prev => prev.filter(f => f.available));
        setSentFiles(prev => prev.filter(f => f.available));
      });

      setClient(newClient);
    },
    [client, makeFramedReader],
  );

  const generateFile = async () => {
    const { chunkStore, resetChunkStore } = useChunkStore.getState();
    if (!chunkStore) return;

    const basePath =
      Platform.OS === 'ios'
        ? RNFS.DocumentDirectoryPath
        : RNFS.ExternalDirectoryPath;

    const tempPath = `${basePath}/.tmp_${chunkStore.name}`;
    const finalPath = `${basePath}/${chunkStore.name}`;

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
    resetChunkStore();
  };
  const getSocket = () => client ?? serverSocket;
  const safeWrite = useCallback(
    (socket: any, data: any) => {
      if (!socket) return;
      if (!data || (typeof data === 'string' && data.trim() === '')) {
         console.log('Skipping empty socket write');
         return;
      }
      try {
        socket.write(data);
      } catch (err) {
        console.log('Socket write error:', err);
      }
    },
    [],
  );

  const sendMessage = useCallback(
    (message: any) => {
      if (!message || (typeof message === 'object' && Object.keys(message).length === 0)) {
        console.log('Skipping empty message send');
        return;
      }
      
      const socket = getSocket();
      if (!socket) return;

      safeWrite(socket, `${JSON.stringify(message)}\n`);
    },
    [client, serverSocket, safeWrite],
  );
  const getFileExtension = (file: any) => {
    const name = file?.name || file?.fileName || '';

    if (name.includes('.')) {
      return name.split('.').pop().toLowerCase();
    }

    if (file?.type?.includes('/')) {
      return file.type.split('/').pop();
    }

    return file?.type || 'file';
  };
  const sendFileAck = async (
    file: any,
    type: 'image' | 'file' | 'video' | 'audio',
  ) => {
    if (currentChunkSet !== null) {
      Alert.alert('Wait for current file to be sent!');
      return;
    }

    if (!file?.uri) {
      console.log('Invalid file object:', file);
      Alert.alert('Invalid file selected');
      return;
    }

    const normalizedPath =
      Platform.OS === 'ios' ? file?.uri?.replace('file://', '') : file?.uri;
    const socket = getSocket();
    // const socket = client || serverSocket;
    if (!socket) return;

    let chunkSetPayload: any;
    let rawData: any;

    if (Platform.OS === 'ios') {
      // ─── iOS: read the whole file into memory and pre-slice ───────────
      console.log('iOS sender: loading file into memory…');
      const fileData = await RNFS.readFile(normalizedPath, 'base64');
      const buffer = Buffer.from(fileData, 'base64');

      let offset = 0;
      const chunkArray: Buffer[] = [];
      while (offset < buffer.length) {
        chunkArray.push(buffer.slice(offset, offset + CHUNK_SIZE));
        offset += CHUNK_SIZE;
      }

      // rawData = {
      //   // id: uuidv4(),
      //   id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      //   name: type === 'file' ? file?.name : file?.fileName,
      //   size: type === 'file' ? file?.size : file?.fileSize,
      //   mimeType: type === 'file' ? 'file' : '.jpg',
      //   totalChunks: chunkArray.length,
      // };
      rawData = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: type === 'file' ? file?.name : file?.fileName,
        size: type === 'file' ? file?.size : file?.fileSize,
        mimeType: getFileExtension(file),
        totalChunks: chunkArray.length,
      };

      chunkSetPayload = {
        id: rawData.id,
        totalChunks: chunkArray.length,
        chunkArray,
      };
    } else {
      console.log('Android sender: streaming from disk…');

      // Use the size already provided by the file picker if available
      let fileSize = type === 'file' ? file?.size : file?.fileSize;
      fileSize = Number(fileSize);

      if (!fileSize || isNaN(fileSize)) {
        try {
          // Fallback to RNFS if size is completely missing
          const stat = await RNFS.stat(normalizedPath);
          fileSize = Number(stat.size);
        } catch (err) {
          console.error('Failed to stat file, ignoring to prevent crash:', err);
          fileSize = 1; // Prevent NaN or divide by zero
        }
      }

      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

      // rawData = {
      //   // id: uuidv4(),
      //   id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      //   name: type === 'file' ? file?.name : file?.fileName,
      //   size: type === 'file' ? file?.size : file?.fileSize,
      //   mimeType: type === 'file' ? 'file' : '.jpg',
      //   totalChunks,
      // };
      rawData = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: type === 'file' ? file?.name : file?.fileName,
        size: type === 'file' ? file?.size : file?.fileSize,
        mimeType: getFileExtension(file),
        totalChunks,
      };
      chunkSetPayload = {
        id: rawData.id,
        totalChunks,
        chunkArray: [],
        filePath: normalizedPath,
        fileSize,
        chunkSize: CHUNK_SIZE,
      };
    }

    setSentFiles((prevData: any[]) => [
      ...prevData,
      { ...rawData, uri: file?.uri },
    ]);

    setCurrentChunkSet(chunkSetPayload);

    try {
      console.log('FILE ACKNOWLEDGE SENT ✅');
      safeWrite(socket, JSON.stringify({ event: 'file_ack', file: rawData }) + '\n');
    } catch (error) {
      console.log('Error Sending File:', error);
    }
  };

  return (
    <TCPContext.Provider
      value={{
        server,
        client,
        connectedDevice,
        sentFiles,
        receivedFiles,
        totalReceivedBytes,
        totalSentBytes,
        isConnected,
        startServer,
        connectToServer,
        disconnect,
        sendMessage,
        sendFileAck,
      }}
    >
      {children}
    </TCPContext.Provider>
  );
};
