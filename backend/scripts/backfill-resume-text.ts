// ============================================================
// Clyptus Job Portal - Resume Text Backfill Script
// Idempotent resume text extraction for existing candidate resumes.
// Dry-run by default. Requires explicit --apply flag to commit changes.
// ============================================================

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import { LocalStorageProvider } from '../src/integrations/storage/local-storage.provider';

const prisma = new PrismaClient();
const storage = new LocalStorageProvider();

const MAX_CHARACTERS = 200_000;
const TIMEOUT_MS = 10_000;

interface ExtractedResult {
  text: string | null;
  error?: string;
}

/**
 * Extracts text from PDF buffer with strict timeout and character cap.
 * Never throws; returns null on extraction failure. Never logs text.
 */
async function extractPdfText(buffer: Buffer): Promise<ExtractedResult> {
  let timer: NodeJS.Timeout;
  try {
    // Dynamic import to support pluggable installation
    const pdfParse = require('pdf-parse');
    const parsePromise = pdfParse(buffer);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Extraction timed out after 10s')), TIMEOUT_MS);
    });

    const data: any = await Promise.race([parsePromise, timeoutPromise]);
    clearTimeout(timer!);

    const rawText = data?.text || '';
    const cleanText = rawText.trim().slice(0, MAX_CHARACTERS);
    return { text: cleanText || null };
  } catch (err: any) {
    clearTimeout(timer!);
    return { text: null, error: err.message };
  }
}

/**
 * Extracts text from DOCX buffer with strict timeout and character cap.
 */
async function extractDocxText(buffer: Buffer): Promise<ExtractedResult> {
  let timer: NodeJS.Timeout;
  try {
    const mammoth = require('mammoth');
    const parsePromise = mammoth.extractRawText({ buffer });
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Extraction timed out after 10s')), TIMEOUT_MS);
    });

    const result: any = await Promise.race([parsePromise, timeoutPromise]);
    clearTimeout(timer!);

    const rawText = result?.value || '';
    const cleanText = rawText.trim().slice(0, MAX_CHARACTERS);
    return { text: cleanText || null };
  } catch (err: any) {
    clearTimeout(timer!);
    return { text: null, error: err.message };
  }
}

async function run() {
  const isApply = process.argv.includes('--apply') || process.env.APPLY === 'true';
  const modeLabel = isApply ? 'LIVE EXECUTION' : 'DRY RUN (no DB modifications)';

  console.log('================================================================');
  console.log(`Starting Resume Text Backfill Script [Mode: ${modeLabel}]`);
  console.log('================================================================\n');

  // Query candidate profiles with uploaded resume storage key but missing resume text
  const candidates = await prisma.candidateProfile.findMany({
    where: {
      resumeStorageKey: { not: null },
      OR: [
        { resumeText: null },
        { resumeText: '' },
      ],
    },
    select: {
      id: true,
      userId: true,
      resumeStorageKey: true,
      resumeFileName: true,
      resumeMimeType: true,
    },
  });

  console.log(`Found ${candidates.length} candidate profiles needing text extraction.\n`);

  let processedCount = 0;
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const candidate of candidates) {
    const key = candidate.resumeStorageKey!;
    const cleanKey = key.replace(/^private:\/\//, '').replace(/^[/\\]+/, '');
    const ext = path.extname(candidate.resumeFileName || cleanKey).toLowerCase();

    console.log(`[${++processedCount}/${candidates.length}] User: ${candidate.userId} | File: ${candidate.resumeFileName || cleanKey} (${ext})`);

    let objectResult: { buffer: Buffer; contentType: string };
    try {
      objectResult = await storage.getObject(cleanKey);
    } catch (readErr: any) {
      console.warn(`  --> Skipped: storage object not found (${readErr.message})`);
      skippedCount++;
      continue;
    }

    let extraction: ExtractedResult = { text: null };

    if (ext === '.pdf' || objectResult.contentType === 'application/pdf') {
      extraction = await extractPdfText(objectResult.buffer);
    } else if (
      ext === '.docx' ||
      objectResult.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      extraction = await extractDocxText(objectResult.buffer);
    } else if (ext === '.txt' || objectResult.contentType === 'text/plain') {
      extraction = { text: objectResult.buffer.toString('utf8').slice(0, MAX_CHARACTERS) };
    } else {
      console.log(`  --> Unsupported extension for extraction: ${ext}`);
      skippedCount++;
      continue;
    }

    if (!extraction.text) {
      console.warn(`  --> Extraction yielded no text (${extraction.error || 'Empty document'})`);
      failedCount++;
      continue;
    }

    const charCount = extraction.text.length;
    console.log(`  --> Extracted ${charCount} characters successfully.`);

    if (isApply) {
      // 1. Update candidate_profiles
      await prisma.candidateProfile.update({
        where: { id: candidate.id },
        data: { resumeText: extraction.text },
      });

      // 2. Sync to org-scoped candidates rows linked by userId (candidate-owned field only)
      const updatedCandidates = await prisma.candidate.updateMany({
        where: { userId: candidate.userId },
        data: { resumeText: extraction.text },
      });

      console.log(`  --> Committed to candidate_profiles and updated ${updatedCandidates.count} org candidate records.`);
    } else {
      console.log(`  --> [DRY RUN] Would update candidate_profiles and linked org candidates.`);
    }

    successCount++;
  }

  console.log('\n================================================================');
  console.log('Backfill Summary:');
  console.log(`  Mode:           ${modeLabel}`);
  console.log(`  Total Scanned:  ${candidates.length}`);
  console.log(`  Extracted:      ${successCount}`);
  console.log(`  Failed:         ${failedCount}`);
  console.log(`  Skipped:        ${skippedCount}`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('Fatal backfill error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
