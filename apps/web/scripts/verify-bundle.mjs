import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUNDLE_BUDGET_BYTES = 500_000;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = process.env.BUNDLE_DIST_DIR
  ? path.resolve(process.env.BUNDLE_DIST_DIR)
  : path.resolve(scriptDirectory, '..', 'dist');
const indexPath = path.join(distDirectory, 'index.html');
const assetsDirectory = path.join(distDirectory, 'assets');

async function requireFile(filePath) {
  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error('not a file');
    }
  } catch {
    throw new Error(`Missing required bundle artifact: ${filePath}`);
  }
}

async function collectJavaScriptFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    throw new Error(`Missing required bundle artifact directory: ${directory}`);
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJavaScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }
  return files;
}

async function verifyBundle() {
  await requireFile(indexPath);
  const indexHtml = await readFile(indexPath, 'utf8');
  if (indexHtml.toLowerCase().includes('livekit')) {
    throw new Error('Initial index.html must not load or preload LiveKit.');
  }

  const javaScriptFiles = await collectJavaScriptFiles(assetsDirectory);
  if (javaScriptFiles.length === 0) {
    throw new Error(`Missing required bundle artifact: no JavaScript chunks in ${assetsDirectory}`);
  }

  for (const filePath of javaScriptFiles) {
    const fileStats = await stat(filePath);
    if (fileStats.size > BUNDLE_BUDGET_BYTES) {
      throw new Error(
        `Chunk ${path.basename(filePath)} is ${fileStats.size} bytes, exceeding the ${BUNDLE_BUDGET_BYTES}-byte budget.`,
      );
    }
  }

  console.log(
    `Bundle verification passed: ${javaScriptFiles.length} JavaScript chunks, each <= ${BUNDLE_BUDGET_BYTES} bytes.`,
  );
}

try {
  await verifyBundle();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Bundle verification failed: ${message}`);
  process.exitCode = 1;
}
