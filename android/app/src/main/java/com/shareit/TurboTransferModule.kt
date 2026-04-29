package com.shareanywhere.app

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.net.Uri
import android.util.Log
import java.io.*
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.nio.ByteBuffer
import java.nio.channels.FileChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class TurboTransferModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    companion object {
        private const val TAG = "TurboTransfer"

        // ─── TUNING KNOBS ───
        private const val BUFFER_SIZE = 512 * 1024          // 512 KB — 4× original, matches modern WiFi
        private const val SOCKET_BUFFER = 1 * 1024 * 1024   // 1 MB OS-level send/recv buffer
        private const val CONNECT_RETRY_COUNT = 5
        private const val CONNECT_RETRY_DELAY_MS = 200L
        private const val CONNECT_TIMEOUT_MS = 5000
        private const val ACCEPT_TIMEOUT_MS = 15000          // 15s — more generous for slow negotiation
        private const val BIND_RETRY_COUNT = 8
        private const val BIND_RETRY_DELAY_MS = 120L

        // Progress throttle: emit at most every 400ms to prevent JS bridge flooding
        private const val PROGRESS_MIN_INTERVAL_MS = 400L
    }

    // Dedicated fixed-size I/O pool — predictable thread count, no thread explosion
    private val ioPool: ExecutorService = Executors.newFixedThreadPool(4)
    private val activeTransfers = ConcurrentHashMap<String, Boolean>()
    private val pausedTransfers = ConcurrentHashMap<String, Boolean>()

    override fun getName(): String = "TurboTransfer"

    init {
        reactContext.addLifecycleEventListener(this)
    }

    // ─── LIFECYCLE ──────────────────────────────────────────────────────────────

    override fun onHostResume() {}
    override fun onHostPause() {}
    override fun onHostDestroy() {
        Log.d(TAG, "Host destroyed — shutting down I/O pool")
        activeTransfers.keys().toList().forEach { activeTransfers[it] = false }
        ioPool.shutdownNow()
        try { ioPool.awaitTermination(2, TimeUnit.SECONDS) } catch (_: Exception) {}
    }

    // ─── STOP ───────────────────────────────────────────────────────────────────

    @ReactMethod
    fun stopTransfer(id: String) {
        activeTransfers[id] = false
        pausedTransfers[id] = false 
        // Also stop any specific threads for this ID
        activeTransfers.keys.forEach { if (it.startsWith("$id|")) activeTransfers[it] = false }
        Log.d(TAG, "Stop signal received for: $id")
    }

    @ReactMethod
    fun pauseTransfer(id: String) {
        pausedTransfers[id] = true
        Log.d(TAG, "Pause signal received for: $id")
    }

    @ReactMethod
    fun resumeTransfer(id: String) {
        pausedTransfers[id] = false
        Log.d(TAG, "Resume signal received for: $id")
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  SENDER — NIO FileChannel + Direct ByteBuffer for zero-copy speed
    // ═══════════════════════════════════════════════════════════════════════════

    @ReactMethod
    fun sendFile(id: String, path: String, host: String, port: Int) {
        val transferKey = "$id|$host|$port"
        ioPool.execute {
            activeTransfers[transferKey] = true
            var socket: Socket? = null
            var channel: FileChannel? = null
            var inputStream: InputStream? = null
            var output: BufferedOutputStream? = null

            try {
                if (activeTransfers[transferKey] != true || activeTransfers[id] == false) return@execute

                val isContentUri = path.startsWith("content://")
                var fileSize: Long = -1

                if (isContentUri) {
                    // ── CONTENT URI PATH: Use ContentResolver (no file copy needed!) ──
                    val uri = Uri.parse(path)
                    val resolver = reactContext.contentResolver

                    // Query file size from ContentResolver
                    resolver.query(uri, null, null, null, null)?.use { cursor ->
                        if (cursor.moveToFirst()) {
                            val sizeIndex = cursor.getColumnIndex(android.provider.OpenableColumns.SIZE)
                            if (sizeIndex != -1 && !cursor.isNull(sizeIndex)) {
                                fileSize = cursor.getLong(sizeIndex)
                            }
                        }
                    }

                    inputStream = BufferedInputStream(
                        resolver.openInputStream(uri) ?: throw Exception("Cannot open content URI: $path"),
                        BUFFER_SIZE
                    )
                    Log.d(TAG, "SEND START [content://]: id=$id (${if (fileSize > 0) "${fileSize / 1024}KB" else "unknown size"}) → $host:$port")
                } else {
                    // ── FILE PATH: Use NIO FileChannel (zero-copy) ──
                    val cleanPath = if (path.startsWith("file://")) path.substring(7) else path
                    val file = File(cleanPath)
                    if (!file.exists()) throw Exception("File not found at: $cleanPath")
                    fileSize = file.length()
                    channel = FileInputStream(file).channel
                    Log.d(TAG, "SEND START [file]: ${file.name} (${fileSize / 1024}KB) → $host:$port")
                }

                // ── Connect with retry instead of blanket sleep ──
                socket = connectWithRetry(host, port)
                if (activeTransfers[transferKey] != true || activeTransfers[id] == false) return@execute

                tuneSocket(socket)

                output = BufferedOutputStream(socket.getOutputStream(), BUFFER_SIZE)

                // ── Pre-allocate reusable transfer array (avoids 512KB garbage per iteration) ──
                val transferArray = ByteArray(BUFFER_SIZE)
                var totalSent: Long = 0
                var lastProgressTime: Long = 0

                if (channel != null) {
                    // ── NIO FileChannel path (file:// URIs) ──
                    val directBuffer = ByteBuffer.allocateDirect(BUFFER_SIZE)
                    while (channel.read(directBuffer) != -1) {
                        while (pausedTransfers[id] == true) {
                            if (activeTransfers[transferKey] != true || activeTransfers[id] == false) break
                            Thread.sleep(150)
                        }
                        if (activeTransfers[transferKey] != true || activeTransfers[id] == false) {
                            Log.d(TAG, "Interrupted during send: $id")
                            break
                        }

                        directBuffer.flip()
                        val bytesRead = directBuffer.remaining()
                        directBuffer.get(transferArray, 0, bytesRead)
                        output.write(transferArray, 0, bytesRead)
                        totalSent += bytesRead
                        directBuffer.clear()

                        val now = System.currentTimeMillis()
                        if (now - lastProgressTime > PROGRESS_MIN_INTERVAL_MS) {
                            emitProgress(id, totalSent, fileSize, "send")
                            lastProgressTime = now
                        }
                    }
                } else if (inputStream != null) {
                    // ── ContentResolver InputStream path (content:// URIs) ──
                    var bytesRead: Int
                    while (inputStream.read(transferArray).also { bytesRead = it } != -1) {
                        while (pausedTransfers[id] == true) {
                            if (activeTransfers[transferKey] != true || activeTransfers[id] == false) break
                            Thread.sleep(150)
                        }
                        if (activeTransfers[transferKey] != true || activeTransfers[id] == false) {
                            Log.d(TAG, "Interrupted during send: $id")
                            break
                        }

                        output.write(transferArray, 0, bytesRead)
                        totalSent += bytesRead

                        val now = System.currentTimeMillis()
                        if (now - lastProgressTime > PROGRESS_MIN_INTERVAL_MS) {
                            emitProgress(id, totalSent, fileSize, "send")
                            lastProgressTime = now
                        }
                    }
                }

                output.flush()

                if (activeTransfers[transferKey] == true && activeTransfers[id] != false) {
                    val reportSize = if (fileSize > 0) fileSize else totalSent
                    emitProgress(id, reportSize, reportSize, "send")
                    emitEvent("onTurboComplete", Arguments.createMap().apply {
                        putString("id", id)
                        putString("type", "send")
                    })
                    Log.d(TAG, "SEND COMPLETE: $id (${totalSent / 1024}KB)")
                }

            } catch (e: Exception) {
                Log.e(TAG, "SEND ERROR [$id]: ${e.message}", e)
                if (activeTransfers[transferKey] == true && activeTransfers[id] != false) {
                    emitEvent("onTurboError", Arguments.createMap().apply {
                        putString("id", id)
                        putString("error", e.message ?: "Unknown Sender Error")
                    })
                }
            } finally {
                activeTransfers.remove(transferKey)
                try { channel?.close() } catch (_: Exception) {}
                try { inputStream?.close() } catch (_: Exception) {}
                try { output?.close() } catch (_: Exception) {}
                try { socket?.close() } catch (_: Exception) {}
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  RECEIVER — BufferedInputStream + FileChannel for fast sequential writes
    // ═══════════════════════════════════════════════════════════════════════════

    @ReactMethod
    fun receiveFile(id: String, path: String, port: Int) {
        ioPool.execute {
            activeTransfers[id] = true
            var serverSocket: ServerSocket? = null
            var socket: Socket? = null
            var channel: FileChannel? = null
            var fos: FileOutputStream? = null

            try {
                if (activeTransfers[id] != true) return@execute

                val cleanPath = if (path.startsWith("file://")) path.substring(7) else path
                val file = File(cleanPath)
                file.parentFile?.mkdirs()

                Log.d(TAG, "RECV START: Binding to port $port for $id")

                // ── Robust bind with retries ──
                serverSocket = bindWithRetry(port)
                if (activeTransfers[id] != true) return@execute

                serverSocket.soTimeout = ACCEPT_TIMEOUT_MS

                socket = try {
                    serverSocket.accept()
                } catch (timeout: Exception) {
                    if (activeTransfers[id] != true) return@execute
                    throw timeout
                }

                tuneSocket(socket)
                Log.d(TAG, "RECV: Sender connected from ${socket.remoteSocketAddress}")

                val input = BufferedInputStream(socket.getInputStream(), BUFFER_SIZE)

                // ── NIO FileChannel for fast sequential writes ──
                fos = FileOutputStream(file)
                channel = fos.channel

                val buffer = ByteArray(BUFFER_SIZE)
                val writeBuffer = ByteBuffer.allocateDirect(BUFFER_SIZE)
                var totalReceived: Long = 0
                var lastProgressTime: Long = 0
                var bytesRead: Int

                while (input.read(buffer).also { bytesRead = it } != -1) {
                    // STALL LOOP FOR PAUSE
                    while (pausedTransfers[id] == true) {
                        if (activeTransfers[id] != true) break
                        Thread.sleep(150)
                    }

                    if (activeTransfers[id] != true) {
                        Log.d(TAG, "Interrupted during receive: $id")
                        break
                    }

                    // Write via FileChannel for maximum I/O throughput
                    writeBuffer.clear()
                    writeBuffer.put(buffer, 0, bytesRead)
                    writeBuffer.flip()
                    while (writeBuffer.hasRemaining()) {
                        channel.write(writeBuffer)
                    }

                    totalReceived += bytesRead

                    // ── Smart progress throttle ──
                    val now = System.currentTimeMillis()
                    if (now - lastProgressTime > PROGRESS_MIN_INTERVAL_MS) {
                        emitProgress(id, totalReceived, -1, "receive")
                        lastProgressTime = now
                    }
                }

                // Force flush to disk
                channel.force(true)

                if (activeTransfers[id] == true) {
                    emitProgress(id, totalReceived, -1, "receive")
                    emitEvent("onTurboComplete", Arguments.createMap().apply {
                        putString("id", id)
                        putString("path", cleanPath)
                        putString("type", "receive")
                    })
                    Log.d(TAG, "RECV COMPLETE: $cleanPath (${totalReceived / 1024}KB)")
                }

            } catch (e: Exception) {
                Log.e(TAG, "RECV ERROR [$id]: ${e.message}", e)
                if (activeTransfers[id] == true) {
                    emitEvent("onTurboError", Arguments.createMap().apply {
                        putString("id", id)
                        putString("error", e.message ?: "Unknown Receiver Error")
                    })
                }
            } finally {
                activeTransfers.remove(id)
                try { channel?.close() } catch (_: Exception) {}
                try { fos?.close() } catch (_: Exception) {}
                try { socket?.close() } catch (_: Exception) {}
                try { serverSocket?.close() } catch (_: Exception) {}
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  SHARED FILES (Direct Share / Intent handling)
    // ═══════════════════════════════════════════════════════════════════════════

    @ReactMethod
    fun getInitialSharedFiles(promise: Promise) {
        val files = Arguments.createArray()
        for (uriString in MainActivity.sharedFiles) {
            try {
                val uri = Uri.parse(uriString)
                val resolvedPath = getPathFromUri(uri)
                if (resolvedPath != null) {
                    val map = Arguments.createMap().apply {
                        putString("uri", uriString)
                        putString("path", resolvedPath)
                        val file = File(resolvedPath)
                        putString("name", file.name)
                        putDouble("size", file.length().toDouble())
                        putString("type", reactContext.contentResolver.getType(uri) ?: "*/*")
                    }
                    files.pushMap(map)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error resolving shared file: ${e.message}")
            }
        }
        promise.resolve(files)
    }

    @ReactMethod
    fun clearSharedFiles() {
        MainActivity.sharedFiles.clear()
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Connect with intelligent retry instead of a blanket Thread.sleep(800).
     * Total worst-case latency: ~1s (5 × 200ms) vs old 800ms + one attempt.
     * Best case: connects on first try with zero extra delay.
     */
    private fun connectWithRetry(host: String, port: Int): Socket {
        var lastException: Exception? = null

        for (attempt in 1..CONNECT_RETRY_COUNT) {
            try {
                val socket = Socket()
                socket.connect(InetSocketAddress(host, port), CONNECT_TIMEOUT_MS)
                Log.d(TAG, "Connected to $host:$port on attempt $attempt")
                return socket
            } catch (e: Exception) {
                lastException = e
                if (attempt < CONNECT_RETRY_COUNT) {
                    Thread.sleep(CONNECT_RETRY_DELAY_MS)
                }
            }
        }
        throw lastException ?: Exception("Failed to connect to $host:$port after $CONNECT_RETRY_COUNT attempts")
    }

    /**
     * Bind server socket with retries to handle port reuse delay in batch transfers.
     */
    private fun bindWithRetry(port: Int): ServerSocket {
        var lastException: Exception? = null

        for (attempt in 1..BIND_RETRY_COUNT) {
            try {
                val serverSocket = ServerSocket()
                serverSocket.reuseAddress = true
                serverSocket.bind(InetSocketAddress(port))
                Log.d(TAG, "Bound to port $port (attempt $attempt)")
                return serverSocket
            } catch (e: java.net.BindException) {
                lastException = e
                if (attempt < BIND_RETRY_COUNT) {
                    Log.d(TAG, "Port $port busy, retrying in ${BIND_RETRY_DELAY_MS}ms...")
                    Thread.sleep(BIND_RETRY_DELAY_MS)
                }
            }
        }
        throw lastException ?: Exception("Failed to bind port $port after $BIND_RETRY_COUNT attempts")
    }

    /**
     * Tune a connected socket for maximum throughput.
     */
    private fun tuneSocket(socket: Socket) {
        socket.tcpNoDelay = true                    // Disable Nagle's algorithm
        socket.keepAlive = true
        socket.sendBufferSize = SOCKET_BUFFER       // 1MB send buffer
        socket.receiveBufferSize = SOCKET_BUFFER    // 1MB receive buffer
        socket.soTimeout = 0                        // No read timeout during transfer
    }

    /**
     * Emit progress to JS with minimal overhead.
     */
    private fun emitProgress(id: String, transferred: Long, total: Long, type: String) {
        val map = Arguments.createMap().apply {
            putString("id", id)
            putString("type", type)
            putDouble("transferred", transferred.toDouble())
            if (total > 0) putDouble("total", total.toDouble())
        }
        emitEvent("onTurboProgress", map)
    }

    private fun emitEvent(eventName: String, params: WritableMap) {
        try {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit event $eventName: ${e.message}")
        }
    }

    // ─── URI RESOLUTION ─────────────────────────────────────────────────────────

    private fun getPathFromUri(uri: Uri): String? {
        if (uri.scheme == "file") {
            return uri.path
        }

        return try {
            val contentResolver = reactContext.contentResolver
            val fileName = getFileName(uri) ?: "shared_file_${System.currentTimeMillis()}"
            val tempFile = File(reactContext.cacheDir, "shared_files/$fileName")
            tempFile.parentFile?.mkdirs()

            contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(tempFile).use { output ->
                    val buffer = ByteArray(BUFFER_SIZE)
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                    }
                }
            }
            tempFile.absolutePath
        } catch (e: Exception) {
            Log.e(TAG, "Error resolving URI: ${e.message}")
            null
        }
    }

    private fun getFileName(uri: Uri): String? {
        var result: String? = null
        if (uri.scheme == "content") {
            val cursor = reactContext.contentResolver.query(uri, null, null, null, null)
            try {
                if (cursor != null && cursor.moveToFirst()) {
                    val index = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                    if (index != -1) {
                        result = cursor.getString(index)
                    }
                }
            } finally {
                cursor?.close()
            }
        }
        if (result == null) {
            result = uri.path
            val cut = result?.lastIndexOf('/')
            if (cut != null && cut != -1) {
                result = result?.substring(cut + 1)
            }
        }
        return result
    }
}
