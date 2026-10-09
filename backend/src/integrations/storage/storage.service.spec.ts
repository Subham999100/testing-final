import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CloudStorageService } from './storage.service';
import { validateDocumentFile, MAX_DOCUMENT_FILE_SIZE } from './document-validator.util';
import { LocalStorageProvider } from './local-storage.provider';

describe('Secure Document Storage & Validation (Milestone 2)', () => {
  const testStorageDir = path.join(process.cwd(), 'test_storage_vault');
  let storageService: CloudStorageService;
  let configService: ConfigService;

  beforeAll(async () => {
    configService = new ConfigService({
      STORAGE_PROVIDER: 'local',
      STORAGE_LOCAL_DIR: testStorageDir,
    });
    storageService = new CloudStorageService(configService);
  });

  afterAll(async () => {
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe('File Validation', () => {
    it('should accept valid PDF file with %PDF- magic bytes', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
      const result = validateDocumentFile('company_registration.pdf', pdfBuffer, 'application/pdf');

      expect(result.sanitizedFileName).toBe('company_registration.pdf');
      expect(result.extension).toBe('.pdf');
      expect(result.detectedMimeType).toBe('application/pdf');
      expect(result.fileSize).toBe(pdfBuffer.length);
    });

    it('should accept valid PNG image with PNG signature', () => {
      // 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00]);
      const result = validateDocumentFile('payment_screenshot.png', pngBuffer, 'image/png');

      expect(result.sanitizedFileName).toBe('payment_screenshot.png');
      expect(result.extension).toBe('.png');
      expect(result.detectedMimeType).toBe('image/png');
    });

    it('should accept valid JPEG image with JPEG magic bytes', () => {
      // FF D8 FF
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const result = validateDocumentFile('tax_certificate.jpg', jpegBuffer, 'image/jpeg');

      expect(result.sanitizedFileName).toBe('tax_certificate.jpg');
      expect(result.extension).toBe('.jpg');
      expect(result.detectedMimeType).toBe('image/jpeg');
    });

    it('should accept valid DOC file with OLE2 header', () => {
      // D0 CF 11 E0 A1 B1 1A E1
      const docBuffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
      const result = validateDocumentFile('authorization.doc', docBuffer, 'application/msword');

      expect(result.sanitizedFileName).toBe('authorization.doc');
      expect(result.extension).toBe('.doc');
      expect(result.detectedMimeType).toBe('application/msword');
    });

    it('should accept valid DOCX file with ZIP/OOXML header', () => {
      // PK\x03\x04
      const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
      const result = validateDocumentFile(
        'business_license.docx',
        docxBuffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );

      expect(result.sanitizedFileName).toBe('business_license.docx');
      expect(result.extension).toBe('.docx');
      expect(result.detectedMimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should reject oversized file exceeding limit', () => {
      const oversizedBuffer = Buffer.alloc(MAX_DOCUMENT_FILE_SIZE + 1024);
      // Give valid PDF header to isolate size validation
      oversizedBuffer.write('%PDF-1.4');

      expect(() => {
        validateDocumentFile('large_file.pdf', oversizedBuffer);
      }).toThrow(BadRequestException);
      expect(() => {
        validateDocumentFile('large_file.pdf', oversizedBuffer);
      }).toThrow(/exceeds maximum allowed limit/);
    });

    it('should reject invalid or unsupported extensions (e.g. .exe, .sh, .txt)', () => {
      const fakeBuffer = Buffer.from('hello world');

      expect(() => {
        validateDocumentFile('malicious.exe', fakeBuffer);
      }).toThrow(/strictly prohibited/);

      expect(() => {
        validateDocumentFile('script.sh', fakeBuffer);
      }).toThrow(/strictly prohibited/);

      expect(() => {
        validateDocumentFile('notes.txt', fakeBuffer);
      }).toThrow(/is not supported/);
    });

    it('should reject files where magic-bytes do not match the declared extension', () => {
      // Claiming to be PDF but actually containing random ASCII text
      const fakePdfBuffer = Buffer.from('This is clearly plain text, not a pdf');

      expect(() => {
        validateDocumentFile('fake.pdf', fakePdfBuffer, 'application/pdf');
      }).toThrow(/magic-bytes do not match/);
    });

    it('should reject malicious content containing scripts, HTML, or PHP', () => {
      const maliciousBuffer = Buffer.from('%PDF-1.4\n<script>alert("xss")</script>');
      expect(() => {
        validateDocumentFile('exploit.pdf', maliciousBuffer);
      }).toThrow(/Dangerous content detected/);

      const htmlBuffer = Buffer.from('%PDF-1.4\n<html><body>malicious</body></html>');
      expect(() => {
        validateDocumentFile('exploit.pdf', htmlBuffer);
      }).toThrow(/Dangerous content detected/);

      const phpBuffer = Buffer.from('%PDF-1.4\n<?php echo system($_GET["c"]); ?>');
      expect(() => {
        validateDocumentFile('exploit.pdf', phpBuffer);
      }).toThrow(/Dangerous content detected/);
    });

    it('should sanitize dangerous filenames containing traversal and control characters', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\nvalid pdf');
      const result = validateDocumentFile('../../../etc/passwd_certificate.pdf', pdfBuffer);

      expect(result.sanitizedFileName).toBe('passwd_certificate.pdf');
      expect(result.sanitizedFileName).not.toContain('..');
      expect(result.sanitizedFileName).not.toContain('/');
    });
  });

  describe('Storage Key Generation & Path Traversal Defense', () => {
    it('should generate opaque server-side key with applications/{applicationId}/{documentId}', () => {
      const appId = 'app-12345';
      const docId = 'doc-67890';
      const key = storageService.generateApplicationDocumentKey(appId, docId);

      expect(key).toBe('applications/app-12345/doc-67890');
    });

    it('should strip traversal characters from key generation', () => {
      const key = storageService.generateApplicationDocumentKey('../../app1', '../../doc1');
      expect(key).toBe('applications/app1/doc1');
      expect(key).not.toContain('..');
    });

    it('LocalStorageProvider should reject path traversal attempts during put or get', async () => {
      const provider = new LocalStorageProvider(testStorageDir);

      await expect(
        provider.putObject({
          key: '../outside.pdf',
          buffer: Buffer.from('%PDF-1.4'),
          contentType: 'application/pdf',
        }),
      ).rejects.toThrow(/traversal/i);

      await expect(provider.getObject('../outside.pdf')).rejects.toThrow(/traversal/i);
    });
  });

  describe('Private Document Storage & Retrieval Operations', () => {
    it('should store and retrieve private document successfully', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\nCorporate By-Laws Content\n%%EOF');
      const appId = '0b8a6a12-8f12-4299-9b92-4eb942f27591';
      const docId = 'c7e09154-2067-4a0b-9dfc-57682f4d8521';

      const stored = await storageService.storeApplicationDocument({
        applicationId: appId,
        documentId: docId,
        originalFileName: 'corporate_docs (1).pdf',
        buffer: pdfBuffer,
        clientMimeType: 'application/pdf',
      });

      expect(stored.storageKey).toBe(`applications/${appId}/${docId}`);
      expect(stored.fileName).toBe('corporate_docs__1_.pdf');
      expect(stored.fileSize).toBe(pdfBuffer.length);
      expect(stored.mimeType).toBe('application/pdf');

      // Retrieve private object
      const retrieved = await storageService.retrievePrivateObject(stored.storageKey);
      expect(retrieved.buffer.toString('utf8')).toBe(pdfBuffer.toString('utf8'));
      expect(retrieved.contentType).toBe('application/pdf');
      expect(retrieved.contentLength).toBe(pdfBuffer.length);

      // Clean up / Delete private object
      const deleted = await storageService.deletePrivateObject(stored.storageKey);
      expect(deleted).toBe(true);

      // Subsequent retrieve should throw missing object error
      await expect(storageService.retrievePrivateObject(stored.storageKey)).rejects.toThrow(
        /not found in storage/,
      );
    });

    it('should throw error when retrieving non-existent document key', async () => {
      await expect(
        storageService.retrievePrivateObject('applications/non-existent/doc-999'),
      ).rejects.toThrow(/not found in storage/);
    });
  });
});
