import { PrismaClient } from '../generated/client';
import * as fs from 'fs';
import * as path from 'path';
import { AsyncLocalStorage } from 'async_hooks';

export const batchUploadStorage = new AsyncLocalStorage<boolean>();

const isServerless =
  process.platform !== 'win32' ||
  !!process.env.NETLIFY ||
  !!process.env.VERCEL ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  !!process.env.LAMBDA_TASK_ROOT;

const dbPath = isServerless ? '/tmp/dev.db' : path.join(process.cwd(), 'prisma', 'dev.db');
const dbUrl = `file:${dbPath}`;

process.env.DATABASE_URL = dbUrl;

function copyBundledDb(targetPath: string): boolean {
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

export async function ensureDb() {
  if (isServerless) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(dbPath) && fs.statSync(dbPath).size >= 10240) {
      return;
    }

    copyBundledDb(dbPath);
  } else {
    if (!fs.existsSync(dbPath)) {
      console.warn(`[db.ts] Local database not found at ${dbPath}.`);
    }
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

export const db = basePrisma.$extends({
  query: {
    $allOperations: async ({ model, operation, args, query }: any) => {
      await ensureDb();
      const result = await query(args);
      return result;
    },
  },
});
