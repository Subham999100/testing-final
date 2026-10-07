// ============================================================
// File Validation Utilities for Organisation Application Documents
// Enforces:
// 1. Extension checking
// 2. MIME type whitelist
// 3. Magic bytes inspection
// 4. Maximum file size
// 5. Filename sanitization
// 6. Content safety (rejecting HTML, SVG, script, executables)
// ============================================================

import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024; // 10MB max per document

export interface ValidatedFileResult {
  sanitizedFileName: string;
  extension: string;
  detectedMimeType: string;
  fileSize: number;
}

export interface AllowedTypeConfig {
  extensions: string[];
  mimeTypes: string[];
  magicCheck: (buffer: Buffer) => boolean;
}

export const ALLOWED_DOC_TYPES: Record<string, AllowedTypeConfig> = {
  pdf: {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    magicCheck: (buf: Buffer) => {
      // PDF header: %PDF- (hex: 25 50 44 46 2D)
      if (buf.length < 5) return false;
      return buf.slice(0, 5).toString('ascii') === '%PDF-';
    },
  },
  png: {
    extensions: ['.png'],
    mimeTypes: ['image/png'],
    magicCheck: (buf: Buffer) => {
      // PNG header: 89 50 4E 47 0D 0A 1A 0A
      if (buf.length < 8) return false;
      const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      return pngSig.every((byte, idx) => buf[idx] === byte);
    },
  },
  jpeg: {
    extensions: ['.jpg', '.jpeg'],
    mimeTypes: ['image/jpeg', 'image/jpg'],
    magicCheck: (buf: Buffer) => {
      // JPEG header: FF D8 FF
      if (buf.length < 3) return false;
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    },
  },
  doc: {
    extensions: ['.doc'],
    mimeTypes: ['application/msword', 'application/octet-stream'],
    magicCheck: (buf: Buffer) => {
      // OLE2 / Compound File Binary format: D0 CF 11 E0 A1 B1 1A E1
      if (buf.length < 8) return false;
      const oleSig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
      return oleSig.every((byte, idx) => buf[idx] === byte);
    },
  },
  docx: {
    extensions: ['.docx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
    ],
    magicCheck: (buf: Buffer) => {
      // ZIP header (OOXML container): PK\x03\x04 (hex: 50 4B 03 04)
      if (buf.length < 4) return false;
      return buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
    },
  },
};

/**
 * Sanitizes an untrusted filename, stripping directory paths, null bytes,
 * control characters, and dangerous characters.
 */
export function sanitizeFileName(originalName: string): string {
  if (!originalName || typeof originalName !== 'string') {
    throw new BadRequestException('A valid filename is required');
  }

  // Strip path traversal characters and directory indicators
  const base = path.basename(originalName);

  // Replace null bytes and control chars
  const clean = base
    .replace(/\0/g, '')
    .replace(/[^\w\d_.\-\s]/gi, '_')
    .replace(/\s+/g, '_')
    .replace(/\.{2,}/g, '.') // no multiple dots
    .trim();

  if (!clean || clean === '.' || clean === '_') {
    throw new BadRequestException('Invalid or dangerous filename provided');
  }

  // Cap filename length
  if (clean.length > 255) {
    const ext = path.extname(clean);
    return clean.slice(0, 255 - ext.length) + ext;
  }

  return clean;
}

/**
 * Inspects buffer content for dangerous scripts, executable signatures,
 * HTML tags, and SVG content.
 */
export function assertSafeContent(buffer: Buffer): void {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('Document file content cannot be empty');
  }

  // 1. Check for Executable header signatures
  // Windows PE: 'MZ' (hex 4D 5A)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    throw new BadRequestException('Executable files (PE/EXE) are strictly prohibited');
  }

  // ELF: 0x7F 'ELF' (hex 7F 45 4C 46)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    throw new BadRequestException('Executable files (ELF) are strictly prohibited');
  }

  // Mach-O: 0xFEEDFACE or 0xFEEDFACF or 0xCAFEBABE
  if (buffer.length >= 4) {
    const first4Hex = buffer.slice(0, 4).toString('hex').toLowerCase();
    if (
      first4Hex === 'feedface' ||
      first4Hex === 'feedfacf' ||
      first4Hex === 'cefaedfe' ||
      first4Hex === 'cffaedfe'
    ) {
      throw new BadRequestException('Executable binary files are strictly prohibited');
    }
  }

  // Shell script check: #!/
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    throw new BadRequestException('Shell scripts are strictly prohibited');
  }

  // 2. Scan initial slice (up to 4KB) for HTML / SVG / JS script injections
  const sampleLength = Math.min(buffer.length, 4096);
  const sample = buffer.slice(0, sampleLength).toString('utf8').toLowerCase();

  const forbiddenPatterns = [
    '<script',
    '<html',
    '<body',
    '<!doctype html',
    '<svg',
    'javascript:',
    'onload=',
    'onerror=',
    '<?php',
  ];

  for (const pattern of forbiddenPatterns) {
    if (sample.includes(pattern)) {
      throw new BadRequestException(`Dangerous content detected: "${pattern}" is prohibited`);
    }
  }
}

/**
 * Performs end-to-end secure document validation:
 * - Size check
 * - Filename sanitization
 * - Prohibited extension rejection
 * - Extension matching with allowed configuration
 * - Magic byte inspection
 * - Cross-checking client MIME vs recognized MIME
 */
export function validateDocumentFile(
  originalFileName: string,
  buffer: Buffer,
  clientMimeType?: string,
): ValidatedFileResult {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('File buffer is empty');
  }

  if (buffer.length > MAX_DOCUMENT_FILE_SIZE) {
    throw new BadRequestException(
      `File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed limit of ${MAX_DOCUMENT_FILE_SIZE / (1024 * 1024)}MB`,
    );
  }

  // Sanitize filename
  const sanitizedFileName = sanitizeFileName(originalFileName);
  const extension = path.extname(sanitizedFileName).toLowerCase();

  if (!extension) {
    throw new BadRequestException('File must have a valid extension');
  }

  // Reject executable or script extensions immediately
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.sh', '.bin', '.js', '.ts', '.html', '.htm',
    '.svg', '.php', '.phtml', '.py', '.rb', '.ps1', '.vbs', '.jar', '.com',
  ];
  if (dangerousExtensions.includes(extension)) {
    throw new BadRequestException(`Files with extension "${extension}" are strictly prohibited`);
  }

  // Content inspection for malicious scripts / binary execs
  assertSafeContent(buffer);

  // Match extension against allowed whitelist
  let matchedConfig: AllowedTypeConfig | undefined;
  for (const [, config] of Object.entries(ALLOWED_DOC_TYPES)) {
    if (config.extensions.includes(extension)) {
      matchedConfig = config;
      break;
    }
  }

  if (!matchedConfig) {
    throw new BadRequestException(
      `File extension "${extension}" is not supported. Supported extensions: .pdf, .doc, .docx, .jpg, .jpeg, .png`,
    );
  }

  // Magic byte validation
  const magicMatches = matchedConfig.magicCheck(buffer);
  if (!magicMatches) {
    throw new BadRequestException(
      `File content magic-bytes do not match the expected format for extension "${extension}"`,
    );
  }

  // Canonical MIME resolution (never trust client blindly)
  let resolvedMimeType = matchedConfig.mimeTypes[0];
  if (clientMimeType) {
    const normalizedClientMime = clientMimeType.trim().toLowerCase();
    if (matchedConfig.mimeTypes.includes(normalizedClientMime)) {
      resolvedMimeType = normalizedClientMime;
    }
  }

  return {
    sanitizedFileName,
    extension,
    detectedMimeType: resolvedMimeType,
    fileSize: buffer.length,
  };
}
