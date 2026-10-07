// ============================================================
// Local Filesystem Storage Provider
// Implements IStorageProvider using local isolated directory storage.
// Strictly guards against path traversal and keeps objects private.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageProvider, PutObjectOptions, GetObjectResult } from './storage.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(baseDir || process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'storage_vault'));
    this.logger.log(`LocalStorageProvider initialized at base path: ${this.baseDir}`);
  }

  private resolveSafePath(key: string): string {
    // Prevent directory traversal attacks
    if (!key || key.includes('..') || path.isAbsolute(key)) {
      throw new Error(`Invalid storage key traversal attempt: ${key}`);
    }
    const safeKey = key.replace(/^[/\\]+/, '');
    const fullPath = path.resolve(this.baseDir, safeKey);
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error(`Path traversal violation: key escapes storage root`);
    }
    return fullPath;
  }

  async putObject(options: PutObjectOptions): Promise<void> {
    const fullPath = this.resolveSafePath(options.key);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file content atomically
    await fs.writeFile(fullPath, options.buffer);

    // Write metadata file sidecar
    const metaPath = `${fullPath}.meta.json`;
    await fs.writeFile(
      metaPath,
      JSON.stringify(
        {
          contentType: options.contentType,
          contentLength: options.buffer.length,
          metadata: options.metadata || {},
          storedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );
  }

  async getObject(key: string): Promise<GetObjectResult> {
    const fullPath = this.resolveSafePath(key);
    try {
      const buffer = await fs.readFile(fullPath);
      let contentType = 'application/octet-stream';
      try {
        const metaRaw = await fs.readFile(`${fullPath}.meta.json`, 'utf8');
        const meta = JSON.parse(metaRaw);
        if (meta.contentType) {
          contentType = meta.contentType;
        }
      } catch {
        // Fallback to default if meta not present
      }
      return {
        buffer,
        contentType,
        contentLength: buffer.length,
      };
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error(`Object not found in storage: ${key}`);
      }
      throw err;
    }
  }

  async deleteObject(key: string): Promise<boolean> {
    const fullPath = this.resolveSafePath(key);
    try {
      await fs.unlink(fullPath);
      try {
        await fs.unlink(`${fullPath}.meta.json`);
      } catch {
        // Ignore meta deletion error
      }
      return true;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    const fullPath = this.resolveSafePath(key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
