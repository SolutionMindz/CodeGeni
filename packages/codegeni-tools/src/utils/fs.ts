import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export async function atomicWrite(
  targetPath: string,
  content: string | Buffer,
  encoding: BufferEncoding = "utf-8"
): Promise<void> {
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
  const tmpName = `.codegeni-${crypto.randomUUID()}`;
  const tmpPath = path.join(dir, tmpName);
  await fs.writeFile(tmpPath, content, { encoding });
  await fs.rename(tmpPath, targetPath);
}
