declare module 'zstd-codec' {
    namespace Zstd {
        export class Simple {
            compress(contentBytes: Uint8Array, compressionLevel?: number): Uint8Array<ArrayBuffer>
            decompress(contentBytes: Uint8Array): Uint8Array<ArrayBuffer>
        }
        
        export class Streaming {
            compress(contentBytes: Uint8Array, compressionLevel?: number): Uint8Array<ArrayBuffer>
            decompress(contentBytes: Uint8Array): Uint8Array<ArrayBuffer>
            
            compressChunks(chunks: Iterable<Uint8Array>, sizeHint?: number, compressionLevel?: number): Uint8Array<ArrayBuffer>
            decompressChunks(chunks: Iterable<Uint8Array>, sizeHint?: number): Uint8Array<ArrayBuffer>
        }
        
        export const Dict = "Not implemented into declaration yet"
    }
    
    
    export namespace ZstdCodec {
        export function run(callbackfn: (zstd: typeof Zstd) => void): void
    }
}
