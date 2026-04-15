import Foundation
import React

@objc(TurboTransferModule)
class TurboTransferModule: RCTEventEmitter {

    // ─── TUNING KNOBS (matching Android) ───
    private static let BUFFER_SIZE = 512 * 1024          // 512 KB
    private static let SOCKET_BUFFER = 1 * 1024 * 1024   // 1 MB OS-level send/recv buffer
    private static let CONNECT_RETRY_COUNT = 5
    private static let CONNECT_RETRY_DELAY_MS: UInt32 = 200_000 // microseconds
    private static let CONNECT_TIMEOUT_S: Int = 5
    private static let ACCEPT_TIMEOUT_S: Int = 15
    private static let BIND_RETRY_COUNT = 8
    private static let BIND_RETRY_DELAY_MS: UInt32 = 120_000    // microseconds
    private static let PROGRESS_MIN_INTERVAL_MS: UInt64 = 400

    let appGroup = "group.com.shareanywhere.app"

    // Dedicated concurrent I/O queue
    private let ioQueue = DispatchQueue(label: "com.shareanywhere.turbo.io", qos: .userInitiated, attributes: .concurrent)
    private var activeTransfers = [String: Bool]()
    private var pausedTransfers = [String: Bool]()
    private let lock = NSLock()
    private var hasListeners = false

    // ─── RCTEventEmitter ────────────────────────────────────────────────────────

    override func supportedEvents() -> [String]! {
        return ["onTurboProgress", "onTurboComplete", "onTurboError"]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    @objc override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    /// Safe event emitter — only sends if JS listeners are attached
    private func safeEmit(_ eventName: String, body: [String: Any]) {
        guard hasListeners else { return }
        self.sendEvent(withName: eventName, body: body)
    }

    // Thread-safe helpers
    private func isActive(_ id: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return activeTransfers[id] == true
    }
    private func setActive(_ id: String, _ value: Bool) {
        lock.lock(); defer { lock.unlock() }
        activeTransfers[id] = value
    }
    private func removeActive(_ id: String) {
        lock.lock(); defer { lock.unlock() }
        activeTransfers.removeValue(forKey: id)
    }
    private func isPaused(_ id: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return pausedTransfers[id] == true
    }
    private func setPaused(_ id: String, _ value: Bool) {
        lock.lock(); defer { lock.unlock() }
        pausedTransfers[id] = value
    }

    // ─── STOP / PAUSE / RESUME ──────────────────────────────────────────────────

    @objc
    func stopTransfer(_ id: String) {
        setActive(id, false)
        setPaused(id, false)
        NSLog("[TurboTransfer] Stop signal received for: %@", id)
    }

    @objc
    func pauseTransfer(_ id: String) {
        setPaused(id, true)
        NSLog("[TurboTransfer] Pause signal received for: %@", id)
    }

    @objc
    func resumeTransfer(_ id: String) {
        setPaused(id, false)
        NSLog("[TurboTransfer] Resume signal received for: %@", id)
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  SENDER — TCP Client → stream file bytes to receiver (POSIX sockets)
    // ═══════════════════════════════════════════════════════════════════════════

    @objc
    func sendFile(_ id: String, path: String, host: String, port: NSNumber) {
        let portInt = port.intValue
        ioQueue.async { [weak self] in
            guard let self = self else { return }
            self.setActive(id, true)

            var socketFd: Int32 = -1
            var fileHandle: FileHandle? = nil

            defer {
                self.removeActive(id)
                if socketFd >= 0 { close(socketFd) }
                try? fileHandle?.close()
            }

            do {
                guard self.isActive(id) else { return }

                // Resolve file path
                var cleanPath = path
                if cleanPath.hasPrefix("file://") {
                    cleanPath = String(cleanPath.dropFirst(7))
                }
                cleanPath = cleanPath.removingPercentEncoding ?? cleanPath

                guard FileManager.default.fileExists(atPath: cleanPath) else {
                    throw NSError(domain: "TurboTransfer", code: 1, userInfo: [NSLocalizedDescriptionKey: "File not found at: \(cleanPath)"])
                }

                let attrs = try FileManager.default.attributesOfItem(atPath: cleanPath)
                let fileSize = (attrs[.size] as? Int64) ?? -1

                guard let fh = FileHandle(forReadingAtPath: cleanPath) else {
                    throw NSError(domain: "TurboTransfer", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot open file for reading: \(cleanPath)"])
                }
                fileHandle = fh

                NSLog("[TurboTransfer] SEND START: %@ (%lldKB) → %@:%d", (cleanPath as NSString).lastPathComponent, fileSize / 1024, host, portInt)

                // Connect with retry using POSIX sockets
                socketFd = try self.connectWithRetry(host: host, port: portInt, id: id)
                guard self.isActive(id) else { return }

                // Tune socket
                self.tuneSocket(fd: socketFd)

                let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: Self.BUFFER_SIZE)
                defer { buffer.deallocate() }

                var totalSent: Int64 = 0
                var lastProgressTime: UInt64 = 0

                while true {
                    // Pause loop
                    while self.isPaused(id) {
                        if !self.isActive(id) { break }
                        usleep(150_000)
                    }
                    guard self.isActive(id) else {
                        NSLog("[TurboTransfer] Interrupted during send: %@", id)
                        break
                    }

                    let data = fh.readData(ofLength: Self.BUFFER_SIZE)
                    if data.isEmpty { break } // EOF

                    // Send all bytes (handle partial writes)
                    let bytesSent = data.withUnsafeBytes { rawPtr -> Int in
                        guard let baseAddr = rawPtr.baseAddress else { return 0 }
                        let typedPtr = baseAddr.assumingMemoryBound(to: UInt8.self)
                        var sent = 0
                        while sent < data.count {
                            guard self.isActive(id) else { return sent }
                            let result = send(socketFd, typedPtr.advanced(by: sent), data.count - sent, 0)
                            if result < 0 {
                                return -1
                            }
                            sent += result
                        }
                        return sent
                    }

                    if bytesSent < 0 {
                        throw NSError(domain: "TurboTransfer", code: 4, userInfo: [NSLocalizedDescriptionKey: "send() failed (errno: \(errno))"])
                    }

                    totalSent += Int64(data.count)

                    let now = Self.currentTimeMs()
                    if now - lastProgressTime > Self.PROGRESS_MIN_INTERVAL_MS {
                        self.emitProgress(id: id, transferred: totalSent, total: fileSize, type: "send")
                        lastProgressTime = now
                    }
                }

                if self.isActive(id) {
                    let reportSize = fileSize > 0 ? fileSize : totalSent
                    self.emitProgress(id: id, transferred: reportSize, total: reportSize, type: "send")
                    self.safeEmit("onTurboComplete", body: [
                        "id": id,
                        "type": "send"
                    ])
                    NSLog("[TurboTransfer] SEND COMPLETE: %@ (%lldKB)", id, totalSent / 1024)
                }

            } catch {
                NSLog("[TurboTransfer] SEND ERROR [%@]: %@", id, error.localizedDescription)
                if self.isActive(id) {
                    self.safeEmit("onTurboError", body: [
                        "id": id,
                        "error": error.localizedDescription
                    ])
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  RECEIVER — TCP Server → accept connection, write to file
    // ═══════════════════════════════════════════════════════════════════════════

    @objc
    func receiveFile(_ id: String, path: String, port: NSNumber) {
        let portInt = port.intValue
        ioQueue.async { [weak self] in
            guard let self = self else { return }
            self.setActive(id, true)

            var serverFd: Int32 = -1
            var clientFd: Int32 = -1
            var fileHandle: FileHandle? = nil

            defer {
                self.removeActive(id)
                if clientFd >= 0 { close(clientFd) }
                if serverFd >= 0 { close(serverFd) }
                try? fileHandle?.close()
            }

            do {
                guard self.isActive(id) else { return }

                var cleanPath = path
                if cleanPath.hasPrefix("file://") {
                    cleanPath = String(cleanPath.dropFirst(7))
                }
                cleanPath = cleanPath.removingPercentEncoding ?? cleanPath

                // Ensure parent directory exists
                let dir = (cleanPath as NSString).deletingLastPathComponent
                try FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)

                // Create the file
                FileManager.default.createFile(atPath: cleanPath, contents: nil)
                guard let fh = FileHandle(forWritingAtPath: cleanPath) else {
                    throw NSError(domain: "TurboTransfer", code: 10, userInfo: [NSLocalizedDescriptionKey: "Cannot open file for writing: \(cleanPath)"])
                }
                fileHandle = fh

                NSLog("[TurboTransfer] RECV START: Binding to port %d for %@", portInt, id)

                // Bind with retry using POSIX sockets
                serverFd = try self.bindWithRetry(port: portInt)
                guard self.isActive(id) else { return }

                // Set accept timeout
                var tv = timeval(tv_sec: Self.ACCEPT_TIMEOUT_S, tv_usec: 0)
                setsockopt(serverFd, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))

                // Accept one connection
                var clientAddr = sockaddr_in()
                var addrLen = socklen_t(MemoryLayout<sockaddr_in>.size)
                clientFd = withUnsafeMutablePointer(to: &clientAddr) { ptr in
                    ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sPtr in
                        accept(serverFd, sPtr, &addrLen)
                    }
                }

                if clientFd < 0 {
                    if !self.isActive(id) { return }
                    throw NSError(domain: "TurboTransfer", code: 11, userInfo: [NSLocalizedDescriptionKey: "Accept failed or timed out (errno: \(errno))"])
                }

                // Close server socket — we only need the client connection
                close(serverFd)
                serverFd = -1

                // Tune client socket
                self.tuneSocket(fd: clientFd)
                NSLog("[TurboTransfer] RECV: Sender connected for %@", id)

                let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: Self.BUFFER_SIZE)
                defer { buffer.deallocate() }

                var totalReceived: Int64 = 0
                var lastProgressTime: UInt64 = 0

                while true {
                    // Pause loop
                    while self.isPaused(id) {
                        if !self.isActive(id) { break }
                        usleep(150_000)
                    }
                    guard self.isActive(id) else {
                        NSLog("[TurboTransfer] Interrupted during receive: %@", id)
                        break
                    }

                    let bytesRead = recv(clientFd, buffer, Self.BUFFER_SIZE, 0)
                    if bytesRead < 0 {
                        let err = errno
                        if err == EAGAIN || err == EWOULDBLOCK { continue }
                        throw NSError(domain: "TurboTransfer", code: 12, userInfo: [NSLocalizedDescriptionKey: "recv() failed (errno: \(err))"])
                    }
                    if bytesRead == 0 { break } // Connection closed — transfer complete

                    // Write to file safely (copy bytes to guarantee memory stability across ObjC bridge)
                    let data = Data(bytes: buffer, count: bytesRead)
                    if #available(iOS 13.4, *) {
                        try fh.write(contentsOf: data)
                    } else {
                        fh.write(data)
                    }

                    totalReceived += Int64(bytesRead)

                    let now = Self.currentTimeMs()
                    if now - lastProgressTime > Self.PROGRESS_MIN_INTERVAL_MS {
                        self.emitProgress(id: id, transferred: totalReceived, total: -1, type: "receive")
                        lastProgressTime = now
                    }
                }

                // Flush to disk
                try fh.synchronize()

                if self.isActive(id) {
                    self.emitProgress(id: id, transferred: totalReceived, total: -1, type: "receive")
                    self.safeEmit("onTurboComplete", body: [
                        "id": id,
                        "path": cleanPath,
                        "type": "receive"
                    ])
                    NSLog("[TurboTransfer] RECV COMPLETE: %@ (%lldKB)", cleanPath, totalReceived / 1024)
                }

            } catch {
                NSLog("[TurboTransfer] RECV ERROR [%@]: %@", id, error.localizedDescription)
                if self.isActive(id) {
                    self.safeEmit("onTurboError", body: [
                        "id": id,
                        "error": error.localizedDescription
                    ])
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  SHARED FILES (Share Extension handling)
    // ═══════════════════════════════════════════════════════════════════════════

    @objc
    func getInitialSharedFiles(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let defaults = UserDefaults(suiteName: appGroup)
        defaults?.synchronize()

        if let files = defaults?.array(forKey: "pendingFiles") as? [[String: Any]] {
            NSLog("[TurboTransfer] getInitialSharedFiles: Found %d files", files.count)
            for file in files {
                NSLog("[TurboTransfer] File: %@, size: %@", file["name"] as? String ?? "unknown", "\(file["size"] ?? 0)")
            }
            resolve(files)
        } else {
            NSLog("[TurboTransfer] getInitialSharedFiles: No pending files found")
            resolve([])
        }
    }

    @objc
    func clearSharedFiles(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let defaults = UserDefaults(suiteName: appGroup)
        defaults?.removeObject(forKey: "pendingFiles")
        defaults?.synchronize()

        // NOTE: Do NOT delete shared container files here!
        // They are still needed by processFile/sendChunkAck for the actual transfer.
        // Files will be overwritten on the next share or cleaned up by iOS.

        resolve(true)
    }

    // ─── Utility ────────────────────────────────────────────────────────

    @objc
    func readChunkBase64(_ path: String, position: NSNumber, length: NSNumber, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        var cleanPath = path
        if cleanPath.hasPrefix("file://") {
            cleanPath = String(cleanPath.dropFirst(7))
        }
        cleanPath = cleanPath.removingPercentEncoding ?? cleanPath
        
        do {
            let fileURL = URL(fileURLWithPath: cleanPath)
            let fh = try FileHandle(forReadingFrom: fileURL)
            defer { fh.closeFile() }
            
            fh.seek(toFileOffset: position.uint64Value)
            let data = fh.readData(ofLength: length.intValue)
            resolve(data.base64EncodedString())
        } catch {
            reject("READ_ERROR", error.localizedDescription, error)
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /// Connect to host:port with retry (POSIX sockets)
    private func connectWithRetry(host: String, port: Int, id: String) throws -> Int32 {
        var lastError: Error? = nil

        for attempt in 1...Self.CONNECT_RETRY_COUNT {
            let fd = socket(AF_INET, SOCK_STREAM, 0)
            guard fd >= 0 else {
                lastError = NSError(domain: "TurboTransfer", code: 20, userInfo: [NSLocalizedDescriptionKey: "socket() failed (errno: \(errno))"])
                continue
            }

            var addr = sockaddr_in()
            addr.sin_family = sa_family_t(AF_INET)
            addr.sin_port = UInt16(port).bigEndian

            // Resolve host to IP
            guard let hostCStr = host.cString(using: .ascii) else {
                close(fd)
                throw NSError(domain: "TurboTransfer", code: 21, userInfo: [NSLocalizedDescriptionKey: "Invalid host: \(host)"])
            }
            addr.sin_addr.s_addr = inet_addr(hostCStr)

            // If inet_addr failed (hostname instead of IP), try getaddrinfo
            if addr.sin_addr.s_addr == INADDR_NONE {
                var hints = addrinfo()
                hints.ai_family = AF_INET
                hints.ai_socktype = SOCK_STREAM
                var result: UnsafeMutablePointer<addrinfo>?
                if getaddrinfo(host, String(port), &hints, &result) == 0, let res = result {
                    let sockAddr = res.pointee.ai_addr!.withMemoryRebound(to: sockaddr_in.self, capacity: 1) { $0.pointee }
                    addr.sin_addr = sockAddr.sin_addr
                    freeaddrinfo(result)
                } else {
                    close(fd)
                    lastError = NSError(domain: "TurboTransfer", code: 21, userInfo: [NSLocalizedDescriptionKey: "Cannot resolve host: \(host)"])
                    if attempt < Self.CONNECT_RETRY_COUNT { usleep(Self.CONNECT_RETRY_DELAY_MS) }
                    continue
                }
            }

            let connectResult = withUnsafePointer(to: &addr) { ptr in
                ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sPtr in
                    Darwin.connect(fd, sPtr, socklen_t(MemoryLayout<sockaddr_in>.size))
                }
            }

            if connectResult == 0 {
                NSLog("[TurboTransfer] Connected to %@:%d on attempt %d", host, port, attempt)
                return fd
            }

            close(fd)
            lastError = NSError(domain: "TurboTransfer", code: 22, userInfo: [NSLocalizedDescriptionKey: "connect() failed on attempt \(attempt) (errno: \(errno))"])

            if attempt < Self.CONNECT_RETRY_COUNT {
                usleep(Self.CONNECT_RETRY_DELAY_MS)
            }
        }

        throw lastError ?? NSError(domain: "TurboTransfer", code: 23, userInfo: [NSLocalizedDescriptionKey: "Failed to connect to \(host):\(port) after \(Self.CONNECT_RETRY_COUNT) attempts"])
    }

    /// Bind a POSIX server socket with retry
    private func bindWithRetry(port: Int) throws -> Int32 {
        var lastError: Error? = nil

        for attempt in 1...Self.BIND_RETRY_COUNT {
            let fd = socket(AF_INET, SOCK_STREAM, 0)
            guard fd >= 0 else {
                lastError = NSError(domain: "TurboTransfer", code: 30, userInfo: [NSLocalizedDescriptionKey: "socket() failed (errno: \(errno))"])
                continue
            }

            // SO_REUSEADDR
            var reuseAddr: Int32 = 1
            setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &reuseAddr, socklen_t(MemoryLayout<Int32>.size))

            var addr = sockaddr_in()
            addr.sin_family = sa_family_t(AF_INET)
            addr.sin_port = UInt16(port).bigEndian
            addr.sin_addr.s_addr = INADDR_ANY

            let bindResult = withUnsafePointer(to: &addr) { ptr in
                ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sPtr in
                    bind(fd, sPtr, socklen_t(MemoryLayout<sockaddr_in>.size))
                }
            }

            if bindResult == 0 {
                // Listen with backlog of 1
                if listen(fd, 1) == 0 {
                    NSLog("[TurboTransfer] Bound to port %d (attempt %d)", port, attempt)
                    return fd
                } else {
                    lastError = NSError(domain: "TurboTransfer", code: 31, userInfo: [NSLocalizedDescriptionKey: "listen() failed (errno: \(errno))"])
                    close(fd)
                }
            } else {
                lastError = NSError(domain: "TurboTransfer", code: 32, userInfo: [NSLocalizedDescriptionKey: "bind() failed on port \(port) (errno: \(errno))"])
                close(fd)

                if attempt < Self.BIND_RETRY_COUNT {
                    NSLog("[TurboTransfer] Port %d busy, retrying...", port)
                    usleep(Self.BIND_RETRY_DELAY_MS)
                }
            }
        }

        throw lastError ?? NSError(domain: "TurboTransfer", code: 33, userInfo: [NSLocalizedDescriptionKey: "Failed to bind port \(port) after \(Self.BIND_RETRY_COUNT) attempts"])
    }

    /// Tune a connected socket for maximum throughput
    private func tuneSocket(fd: Int32) {
        var noDelay: Int32 = 1
        setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &noDelay, socklen_t(MemoryLayout<Int32>.size))

        var sendBuf: Int32 = Int32(Self.SOCKET_BUFFER)
        setsockopt(fd, SOL_SOCKET, SO_SNDBUF, &sendBuf, socklen_t(MemoryLayout<Int32>.size))

        var recvBuf: Int32 = Int32(Self.SOCKET_BUFFER)
        setsockopt(fd, SOL_SOCKET, SO_RCVBUF, &recvBuf, socklen_t(MemoryLayout<Int32>.size))

        var keepAlive: Int32 = 1
        setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, &keepAlive, socklen_t(MemoryLayout<Int32>.size))
    }

    /// Emit progress event
    private func emitProgress(id: String, transferred: Int64, total: Int64, type: String) {
        var body: [String: Any] = [
            "id": id,
            "type": type,
            "transferred": Double(transferred)
        ]
        if total > 0 {
            body["total"] = Double(total)
        }
        self.safeEmit("onTurboProgress", body: body)
    }

    /// Current time in milliseconds
    private static func currentTimeMs() -> UInt64 {
        return UInt64(Date().timeIntervalSince1970 * 1000)
    }
}

