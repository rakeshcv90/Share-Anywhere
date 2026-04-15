import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    let appGroup = "group.com.shareanywhere.app"
    let urlScheme = "shareanywhere://share"

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.01)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        handleSharedContent()
    }

    private func handleSharedContent() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments, !attachments.isEmpty else {
            completeExtension()
            return
        }

        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else {
            completeExtension()
            return
        }

        try? FileManager.default.createDirectory(at: containerURL, withIntermediateDirectories: true, attributes: nil)

        let dispatchGroup = DispatchGroup()
        var sharedFiles: [[String: Any]] = []
        let lock = NSLock()

        for attachment in attachments {
            dispatchGroup.enter()

            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                loadAttachment(attachment: attachment, containerURL: containerURL, typeIdentifier: UTType.image.identifier) { fileInfo in
                    if let info = fileInfo {
                        lock.lock()
                        sharedFiles.append(info)
                        lock.unlock()
                    }
                    dispatchGroup.leave()
                }
            } else if attachment.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
                loadAttachment(attachment: attachment, containerURL: containerURL, typeIdentifier: UTType.movie.identifier) { fileInfo in
                    if let info = fileInfo {
                        lock.lock()
                        sharedFiles.append(info)
                        lock.unlock()
                    }
                    dispatchGroup.leave()
                }
            } else if attachment.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
                loadAttachment(attachment: attachment, containerURL: containerURL, typeIdentifier: UTType.fileURL.identifier) { fileInfo in
                    if let info = fileInfo {
                        lock.lock()
                        sharedFiles.append(info)
                        lock.unlock()
                    }
                    dispatchGroup.leave()
                }
            } else if attachment.hasItemConformingToTypeIdentifier(UTType.item.identifier) {
                loadAttachment(attachment: attachment, containerURL: containerURL, typeIdentifier: UTType.item.identifier) { fileInfo in
                    if let info = fileInfo {
                        lock.lock()
                        sharedFiles.append(info)
                        lock.unlock()
                    }
                    dispatchGroup.leave()
                }
            } else {
                dispatchGroup.leave()
            }
        }

        dispatchGroup.notify(queue: .main) {
            if sharedFiles.count > 0 {
                self.saveToSharedStorage(files: sharedFiles)
                self.openContainingApp()
            } else {
                self.completeExtension()
            }
        }
    }

    // MARK: - Load Attachment
    private func loadAttachment(attachment: NSItemProvider, containerURL: URL, typeIdentifier: String, completion: @escaping ([String: Any]?) -> Void) {
        attachment.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { (item, error) in
            guard error == nil else {
                print("[ShareExtension] loadItem error: \(error!)")
                completion(nil)
                return
            }

            if let url = item as? URL {
                self.copyFileToContainer(sourceURL: url, containerURL: containerURL, typeIdentifier: typeIdentifier, completion: completion)
            } else if let image = item as? UIImage {
                let ts = Int(Date().timeIntervalSince1970 * 1000)
                let fileName = "shared_image_\(ts).jpg"
                let destURL = containerURL.appendingPathComponent(fileName)

                if let data = image.jpegData(compressionQuality: 0.9) {
                    do {
                        try data.write(to: destURL)
                        completion([
                            "name": fileName,
                            "path": destURL.path,
                            "size": Int64(data.count),
                            "type": "public.jpeg"
                        ])
                    } catch {
                        completion(nil)
                    }
                } else {
                    completion(nil)
                }
            } else if let data = item as? Data {
                let ext = UTType(typeIdentifier)?.preferredFilenameExtension ?? "dat"
                let ts = Int(Date().timeIntervalSince1970 * 1000)
                let fileName = "shared_file_\(ts).\(ext)"
                let destURL = containerURL.appendingPathComponent(fileName)

                do {
                    try data.write(to: destURL)
                    completion([
                        "name": fileName,
                        "path": destURL.path,
                        "size": Int64(data.count),
                        "type": typeIdentifier
                    ])
                } catch {
                    completion(nil)
                }
            } else {
                completion(nil)
            }
        }
    }

    // MARK: - Copy File to Container
    private func copyFileToContainer(sourceURL: URL, containerURL: URL, typeIdentifier: String, completion: @escaping ([String: Any]?) -> Void) {
        let fileName = sourceURL.lastPathComponent
        let destinationURL = containerURL.appendingPathComponent(fileName)

        let accessing = sourceURL.startAccessingSecurityScopedResource()
        defer { if accessing { sourceURL.stopAccessingSecurityScopedResource() } }

        do {
            try? FileManager.default.removeItem(at: destinationURL)
            try FileManager.default.copyItem(at: sourceURL, to: destinationURL)

            let attributes = try FileManager.default.attributesOfItem(atPath: destinationURL.path)
            let fileSize = attributes[.size] as? Int64 ?? 0

            completion([
                "name": fileName,
                "path": destinationURL.path,
                "size": fileSize,
                "type": typeIdentifier
            ])
        } catch {
            print("[ShareExtension] Copy error: \(error)")
            completion(nil)
        }
    }

    // MARK: - Save to UserDefaults
    private func saveToSharedStorage(files: [[String: Any]]) {
        let defaults = UserDefaults(suiteName: appGroup)
        defaults?.set(files, forKey: "pendingFiles")
        defaults?.synchronize()
    }

    // MARK: - Open Containing App
    private func openContainingApp() {
        guard let url = URL(string: urlScheme) else {
            completeExtension()
            return
        }

        // iOS Share Extension reliable openURL via responder chain
        // Walk up the responder chain to find an object that responds to openURL:
        let selectorOpenURL = sel_registerName("openURL:")
        var responder: UIResponder? = self

        while let current = responder {
            if current.responds(to: selectorOpenURL) {
                current.perform(selectorOpenURL, with: url)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    self.completeExtension()
                }
                return
            }
            responder = current.next
        }

        // If responder chain fails, just complete — the app will pick up files on next foreground
        completeExtension()
    }

    // MARK: - Complete
    private func completeExtension() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
