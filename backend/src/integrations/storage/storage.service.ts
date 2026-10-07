// ============================================================
// Clyptus Job Portal - Platform Super Admin & Organisation Verification
// Integration: Cloud Storage Service (AWS S3 / Cloudflare R2 / Local Vault)
// ============================================================

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IStorageProvider, PutObjectOptions, GetObjectResult } from './storage.interface';
import { LocalStorageProvider } from './local-storage.provider';
import { validateDocumentFile, ValidatedFileResult } from './document-validator.util';

export interface UploadFileOptions {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  folder?: string;
}

export interface StoreApplicationDocumentOptions {
  applicationId: string;
  documentId: string;
  originalFileName: string;
  buffer: Buffer;
  clientMimeType?: string;
}

export interface StoredDocumentResult {
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

@Injectable()
export class CloudStorageService {
  private readonly logger = new Logger(CloudStorageService.name);
  private readonly provider: IStorageProvider;
  private readonly configuredProviderType: string;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.configuredProviderType = (this.configService.get<string>('STORAGE_PROVIDER') || 'local').toLowerCase();
    this.bucketName = this.configService.get<string>('STORAGE_BUCKET') || 'clyptus-platform-assets';

    // Check if an S3/R2 client is configured with real credentials or fallback to local provider
    const accessKey = this.configService.get<string>('STORAGE_ACCESS_KEY');
    const secretKey = this.configService.get<string>('STORAGE_SECRET_KEY');

    if ((this.configuredProviderType === 's3' || this.configuredProviderType === 'r2') && accessKey && !accessKey.includes('placeholder')) {
      // In production with real AWS/Cloudflare credentials, an S3 compatible provider would be instantiated here.
      // Because AWS SDK is not in dependencies, we gracefully use LocalStorageProvider and log infrastructure warning.
      this.logger.warn(`Storage provider is configured as [${this.configuredProviderType}], but @aws-sdk/client-s3 is not bundled. Operating in secure local vault mode.`);
      this.provider = new LocalStorageProvider();
    } else {
      this.logger.log(`Storage Service initialized using LocalStorageProvider vault [Provider: ${this.configuredProviderType}, Bucket: ${this.bucketName}]`);
      this.provider = new LocalStorageProvider();
    }
  }

  /**
   * Generates a deterministic, opaque server-side storage key for an application document.
   * Path: applications/{applicationId}/{documentId}
   * Never incorporates the applicant's original untrusted filename into the key path.
   */
  generateApplicationDocumentKey(applicationId: string, documentId: string): string {
    if (!applicationId || !documentId) {
      throw new InternalServerErrorException('Application ID and Document ID are required for key generation');
    }
    // Validate UUID format or safe alphanumeric string to prevent traversal
    const safeAppId = applicationId.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeDocId = documentId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeAppId || !safeDocId) {
      throw new InternalServerErrorException('Invalid characters in application or document identifier');
    }
    return `applications/${safeAppId}/${safeDocId}`;
  }

  /**
   * Validates and securely stores an OrganisationApplication document.
   * Files are validated for extension, magic bytes, size, and malicious contents
   * before writing to private isolated storage.
   */
  async storeApplicationDocument(options: StoreApplicationDocumentOptions): Promise<StoredDocumentResult> {
    const { applicationId, documentId, originalFileName, buffer, clientMimeType } = options;

    // 1. Rigorous file validation
    const validation: ValidatedFileResult = validateDocumentFile(originalFileName, buffer, clientMimeType);

    // 2. Generate opaque key: applications/{applicationId}/{documentId}
    const storageKey = this.generateApplicationDocumentKey(applicationId, documentId);

    // 3. Put into private storage
    const putOptions: PutObjectOptions = {
      key: storageKey,
      buffer,
      contentType: validation.detectedMimeType,
      metadata: {
        applicationId,
        documentId,
        sanitizedFileName: validation.sanitizedFileName,
        fileSize: String(validation.fileSize),
      },
    };

    await this.provider.putObject(putOptions);

    this.logger.log(`Stored private document for App: ${applicationId}, Doc: ${documentId} at key: ${storageKey}`);

    return {
      storageKey,
      fileName: validation.sanitizedFileName,
      fileSize: validation.fileSize,
      mimeType: validation.detectedMimeType,
    };
  }

  /**
   * Retrieves a private object buffer and content type by its opaque storageKey.
   */
  async retrievePrivateObject(storageKey: string): Promise<GetObjectResult> {
    if (!storageKey) {
      throw new InternalServerErrorException('Storage key is required to retrieve object');
    }
    return this.provider.getObject(storageKey);
  }

  /**
   * Deletes a private object by storageKey.
   */
  async deletePrivateObject(storageKey: string): Promise<boolean> {
    if (!storageKey) return false;
    return this.provider.deleteObject(storageKey);
  }

  /**
   * Legacy helper retained for backward compatibility with existing tests/integrations.
   */
  async uploadFile(options: UploadFileOptions): Promise<{ url: string; key: string }> {
    const key = `${options.folder || 'platform'}/${Date.now()}-${options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await this.provider.putObject({
      key,
      buffer: options.buffer,
      contentType: options.mimeType,
    });
    // In secure private mode, do not expose a public URL
    return { url: `private://${key}`, key };
  }

  /**
   * Legacy helper retained for backward compatibility.
   */
  async deleteFile(key: string): Promise<boolean> {
    return this.provider.deleteObject(key);
  }

  /**
   * Returns current active storage provider description for diagnostics.
   */
  getStorageProviderType(): string {
    return this.configuredProviderType;
  }
}
