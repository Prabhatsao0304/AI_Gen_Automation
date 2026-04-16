import fs from 'fs/promises';
import path from 'path';

const runtimeDir = path.resolve(process.cwd(), 'reports', 'runtime');
const poContextFilePath = path.join(runtimeDir, 'po-context.json');

export function getPoContextFilePath() {
  return poContextFilePath;
}

export async function saveLatestPoContext({ poNumber, source = 'unknown', poDetailUrl = '' }) {
  const normalizedPoNumber = String(poNumber || '').trim();
  if (!normalizedPoNumber) {
    throw new Error('Cannot save PO context: poNumber is empty.');
  }
  const normalizedPoDetailUrl = String(poDetailUrl || '').trim();

  const payload = {
    latestPoNumber: normalizedPoNumber,
    poDetailUrl: normalizedPoDetailUrl,
    source,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(runtimeDir, { recursive: true });
  await fs.writeFile(poContextFilePath, JSON.stringify(payload, null, 2), 'utf8');

  return { filePath: poContextFilePath, payload };
}

export async function readLatestPoContext() {
  try {
    const raw = await fs.readFile(poContextFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
