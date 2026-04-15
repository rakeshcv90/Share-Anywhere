#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(TurboTransferModule, RCTEventEmitter)

// ─── File Transfer ──────────────────────────────────────────────────────────

RCT_EXTERN_METHOD(sendFile:(NSString *)transferId
                  path:(NSString *)path
                  host:(NSString *)host
                  port:(nonnull NSNumber *)port)

RCT_EXTERN_METHOD(receiveFile:(NSString *)transferId
                  path:(NSString *)path
                  port:(nonnull NSNumber *)port)

// ─── Transfer Control ───────────────────────────────────────────────────────

RCT_EXTERN_METHOD(stopTransfer:(NSString *)transferId)
RCT_EXTERN_METHOD(pauseTransfer:(NSString *)transferId)
RCT_EXTERN_METHOD(resumeTransfer:(NSString *)transferId)

// ─── Share Extension ────────────────────────────────────────────────────────

RCT_EXTERN_METHOD(getInitialSharedFiles:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearSharedFiles:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// ─── Utility ────────────────────────────────────────────────────────
RCT_EXTERN_METHOD(readChunkBase64:(NSString *)path
                  position:(nonnull NSNumber *)position
                  length:(nonnull NSNumber *)length
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
