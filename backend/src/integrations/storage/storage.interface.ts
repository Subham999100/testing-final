// ============================================================
// Secure Storage Interface for Clyptus Platform
// Supports AWS S3, Cloudflare R2, and local filesystem abstraction
// ============================================================

export interface StorageObjectMetadata {
  contentType: string;
  contentLength: number;
  metadata?: Record<string, string>;
}

export interface PutObjectOptions {
  key: string;
  buffer: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface GetObjectResult {
  buffer: Buffer;
  contentType: string;
  contentLength: number;
}

export interface IStorageProvider {
  putObject(options: PutObjectOptions): Promise<void>;
  getObject(key: string): Promise<GetObjectResult>;
  deleteObject(key: string): Promise<boolean>;
  objectExists(key: string): Promise<boolean>;
}
