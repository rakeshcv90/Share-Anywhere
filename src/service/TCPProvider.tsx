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
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { receiveChunkAck, receiveFileAck, sendChunkAck } from './TCPUtils';
import { Alert, Platform } from 'react-native';
import { useChunkStore } from '../db/chunkStore';

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
  sendFileAck: (file: any, type: 'file' | 'image') => void;
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

  // ---------------- DISCONNECT ----------------

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
  }, [client, server, serverSocket]);

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

        // socket.on('data', data => {
        //   let buffer = '';
        //   buffer += data.toString();
        //   try {
        //     // const parsedData = JSON.parse(data.toString());
        //     const parsedData = JSON.parse(buffer);
        //     buffer = '';

        //     if (parsedData?.event === 'connect') {
        //       setIsConnected(true);
        //       setConnectedDevice(parsedData?.deviceName);
        //     }

        //     if (parsedData.event === 'file_ack') {
        //       receiveFileAck(parsedData.file, socket, setReceivedFiles);
        //     }

        //     if (parsedData.event === 'send_chunk_ack') {
        //       sendChunkAck(
        //         parsedData.chunkNo,
        //         socket,
        //         setTotalSentBytes,
        //         setSentFiles,
        //       );
        //     }

        //     if (parsedData.event === 'receive_chunk_ack') {
        //       receiveChunkAck(
        //         parsedData.chunk,
        //         parsedData.chunkNo,
        //         socket,
        //         setTotalReceivedBytes,
        //         generateFile,
        //       );
        //     }
        //   } catch (err) {
        //     console.log('Invalid JSON received');
        //   }
        // });

        let buffer = ''; // ✅ keep buffer OUTSIDE listener

        socket.on('data', data => {
          buffer += data.toString();

          // Split messages using newline framing
          const packets = buffer.split('\n');
          buffer = packets.pop() || ''; // keep incomplete packet

          packets.forEach(packet => {
            if (!packet.trim()) return;

            try {
              const parsedData = JSON.parse(packet);

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
                );
              }
            } catch (err) {
              console.log('Invalid JSON received');
            }
          });
        });

        socket.on('close', () => {
          console.log('Client disconnected');
          disconnect();
        });

        socket.on('error', err => {
          console.log('Server socket error:', err);
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
    [server, disconnect],
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

      newClient.setNoDelay(true);
      let buffer = '';
      newClient.on('data', data => {
        buffer += data.toString();
        const packets = buffer.split('\n');
        buffer = packets.pop() || ''; // keep incomplete packet

        packets.forEach(packet => {
          if (!packet.trim()) return;

          try {
            // const parsedData = JSON.parse(data.toString());
            const parsedData = JSON.parse(packet);

            if (parsedData.event === 'file_ack') {
              receiveFileAck(parsedData.file, newClient, setReceivedFiles);
            }

            if (parsedData.event === 'send_chunk_ack') {
              sendChunkAck(
                parsedData.chunkNo,
                newClient,
                setTotalSentBytes,
                setSentFiles,
              );
            }

            if (parsedData.event === 'receive_chunk_ack') {
              receiveChunkAck(
                parsedData.chunk,
                parsedData.chunkNo,
                newClient,
                setTotalReceivedBytes,
                generateFile,
              );
            }
          } catch (err) {
            console.log('Invalid JSON from server');
          }
        });
      });

      newClient.on('close', () => {
        console.log('Disconnected from server');
        disconnect();
      });

      newClient.on('error', err => {
        console.log('Client socket error:', err);
      });

      setClient(newClient);
    },
    [client, disconnect],
  );

  // const generateFile = async () => {
  //   const { chunkStore, resetChunkStore } = useChunkStore.getState();
  //   if (!chunkStore) return;

  //   if (chunkStore.totalChunks !== chunkStore.chunkArray.length) return;

  //   const combinedChunks = Buffer.concat(chunkStore.chunkArray);

  //   // const basePath =
  //   //   Platform.OS === 'ios'
  //   //     ? RNFS.DocumentDirectoryPath
  //   //     : RNFS.DownloadDirectoryPath;

  //   const basePath =
  //     Platform.OS === 'ios'
  //       ? RNFS.DocumentDirectoryPath
  //       : RNFS.ExternalDirectoryPath;

  //   const filePath = `${basePath}/${chunkStore.name}`;

  //   await RNFS.writeFile(filePath, combinedChunks.toString('base64'), 'base64');

  //   setReceivedFiles(prev =>
  //     produce(prev, draft => {
  //       const index = draft.findIndex(f => f.id === chunkStore.id);
  //       if (index !== -1) {
  //         draft[index].uri = filePath;
  //         draft[index].available = true;
  //       }
  //     }),
  //   );

  //   resetChunkStore();
  // };

  const generateFile = async () => {
    const { chunkStore, resetChunkStore } = useChunkStore.getState();
    if (!chunkStore) return;

    const basePath =
      Platform.OS === 'ios'
        ? RNFS.DocumentDirectoryPath
        : RNFS.ExternalDirectoryPath;

    const filePath = `${basePath}/${chunkStore.name}`;

    setReceivedFiles(prev =>
      produce(prev, draft => {
        const index = draft.findIndex(f => f.id === chunkStore.id);
        if (index !== -1) {
          draft[index].uri = filePath;
          draft[index].available = true;
        }
      }),
    );

    resetChunkStore();
  };

  const sendMessage = useCallback(
    (message: any) => {
      const socket = client || serverSocket;
      if (!socket) return;

      try {
        socket.write(JSON.stringify(message) + '\n'); // ✅ add newline framing
      } catch (err) {
        console.log('Send message error:', err);
      }
    },
    [client, serverSocket],
  );

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
    const fileData = await RNFS.readFile(normalizedPath, 'base64');
    const buffer = Buffer.from(fileData, 'base64');

    const CHUNK_SIZE = 1024 * 8;
    let totalChunks = 0;
    let offset = 0;
    let chunkArray = [];

    while (offset < buffer?.length) {
      const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
      totalChunks += 1;
      chunkArray.push(chunk);
      offset += chunk.length;
    }
    const rawData = {
      id: uuidv4(),
      name: type === 'file' ? file?.name : file?.fileName,
      size: type === 'file' ? file?.size : file?.fileSize,
      mimeType: type === 'file' ? 'file' : '.jpg',
      totalChunks,
    };

    setCurrentChunkSet({
      id: rawData?.id,
      chunkArray,
      totalChunks,
    });
    setSentFiles((prevData: any) =>
      produce(prevData, (draft: any) => {
        draft.push({
          ...rawData,
          uri: file?.uri,
        });
      }),
    );
    const socket = client || serverSocket;
    if (!socket) return;

    try {
      console.log('FILE ACKNOWLEDGE DONE✅');
      // socket.write(
      //   JSON.stringify({
      //     event: 'file_ack',
      //     file: rawData,
      //   }),
      // );

      socket.write(
        JSON.stringify({
          event: 'file_ack',
          file: rawData,
        }) + '\n', // ✅ VERY IMPORTANT
      );
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
