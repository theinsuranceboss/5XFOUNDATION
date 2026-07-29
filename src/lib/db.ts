import { PrismaClient } from '../generated/client';
import { supabase } from './supabase';
import * as fs from 'fs';
import * as path from 'path';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage storage context for bypassing auto-upload on write operations
export const batchUploadStorage = new AsyncLocalStorage<boolean>();

// Determine if we are running inside a serverless environment (Netlify/Vercel/AWS Lambda)
const isServerless =
  process.platform !== 'win32' ||
  !!process.env.NETLIFY ||
  !!process.env.VERCEL ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  !!process.env.LAMBDA_TASK_ROOT;

// SQLite file path
const dbPath = isServerless ? '/tmp/dev.db' : path.join(process.cwd(), 'prisma', 'dev.db');
const dbUrl = `file:${dbPath}`;

// Force override process.env.DATABASE_URL to make sure Prisma Client uses the resolved path
// and ignores any conflicting DATABASE_URL variables set in the Netlify site settings.
process.env.DATABASE_URL = dbUrl;

let lastCheckedTime = 0;

/**
 * Tries to copy the bundled dev.db to the target path.
 * Returns true if successful.
 */
function copyBundledDb(targetPath: string): boolean {
  // Multiple candidate locations — Netlify sets cwd to /var/task
  const candidates = [
    path.join(process.cwd(), 'prisma', 'dev.db'),
    path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
    path.join(__dirname, '..', '..', '..', 'prisma', 'dev.db'),
    path.join(__dirname, 'prisma', 'dev.db'),
    '/var/task/prisma/dev.db',
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).size >= 10240) {
        fs.copyFileSync(candidate, targetPath);
        console.log(`[db.ts] Initialized ${targetPath} from bundled template: ${candidate}`);
        return true;
      }
    } catch (_) { /* skip */ }
  }

  console.error(`[db.ts] No bundled dev.db template found. Tried: ${candidates.join(', ')}`);
  return false;
}

// Helper to ensure database is downloaded locally from Supabase Storage
export async function ensureDb() {
  if (isServerless) {
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckedTime;

    // Avoid re-checking Supabase more than once every 2 seconds
    if (fs.existsSync(dbPath) && fs.statSync(dbPath).size >= 10240 && timeSinceLastCheck < 2000) {
      return;
    }

    lastCheckedTime = now;
    console.log(`[db.ts] Ensuring database is up-to-date at ${dbPath}...`);

    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // If we already have a valid local copy, no need to re-download
    if (fs.existsSync(dbPath) && fs.statSync(dbPath).size >= 10240) {
      console.log(`[db.ts] Local database copy already exists and is valid.`);
      return;
    }

    // Attempt to download from Supabase Storage
    let downloadedFromSupabase = false;
    try {
      console.log(`[db.ts] Attempting to download dev.db from Supabase Storage...`);

      const listResult = await supabase.storage.from('5x_assets').list('', { limit: 1, search: 'dev.db' });
      const remoteDb = listResult.data?.find((f) => f.name === 'dev.db');

      if (remoteDb) {
        const { data, error } = await supabase.storage.from('5x_assets').download('dev.db');
        if (!error && data) {
          const buffer = Buffer.from(await data.arrayBuffer());
          if (buffer.length >= 10240) {
            fs.writeFileSync(dbPath, buffer);
            console.log(`[db.ts] Downloaded dev.db from Supabase Storage (${buffer.length} bytes).`);
            downloadedFromSupabase = true;
          }
        } else {
          console.warn(`[db.ts] Supabase download error: ${error?.message}`);
        }
      } else {
        console.warn(`[db.ts] dev.db not found in Supabase Storage bucket.`);
      }
    } catch (err: any) {
      console.warn(`[db.ts] Supabase Storage unavailable: ${err?.message || err}`);
    }

    // Fall back to bundled template when Supabase is unavailable
    if (!downloadedFromSupabase) {
      console.log(`[db.ts] Falling back to bundled dev.db template...`);
      copyBundledDb(dbPath);
    }
  } else {
    // In local development, ensure the file is present
    if (!fs.existsSync(dbPath)) {
      console.warn(`[db.ts] Local database not found at ${dbPath}.`);
    }
  }
}

// Helper to upload SQLite database back to Supabase Storage (best-effort)
export async function uploadDbToSupabase() {
  if (!fs.existsSync(dbPath)) {
    console.warn(`[db.ts] Database file does not exist at ${dbPath}, skipping upload.`);
    return;
  }

  try {
    console.log(`[db.ts] Uploading ${dbPath} to Supabase Storage bucket '5x_assets' as 'dev.db'...`);
    const buffer = fs.readFileSync(dbPath);

    const { error: uploadError } = await supabase.storage.from('5x_assets').upload('dev.db', buffer, {
      contentType: 'application/x-sqlite3',
      upsert: true,
    });

    if (uploadError) {
      console.warn(`[db.ts] Supabase upload failed: ${uploadError.message} — skipping.`);
    } else {
      console.log(`[db.ts] Database successfully uploaded to Supabase.`);
      lastCheckedTime = Date.now();
    }
  } catch (err) {
    console.warn('[db.ts] Error uploading database (non-fatal):', err);
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

// Extended client to automatically handle download/upload of SQLite database
export const db = basePrisma.$extends({
  query: {
    $allOperations: async ({ model, operation, args, query }: any) => {
      // Ensure the database exists locally (downloads from Supabase if serverless)
      await ensureDb();

      // Execute the database query
      const result = await query(args);

      // If this query was a write mutation, upload the database back to Supabase (best-effort)
      const isWrite = ['create', 'update', 'delete', 'updateMany', 'deleteMany', 'createMany', 'upsert'].includes(
        operation
      );
      const isBatch = batchUploadStorage.getStore() === true;
      if (isWrite && !isBatch) {
        uploadDbToSupabase().catch((e) => console.warn('[db.ts] Background upload failed:', e?.message));
      }

      return result;
    },
  },
});
