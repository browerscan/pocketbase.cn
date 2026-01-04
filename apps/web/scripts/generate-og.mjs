import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outPath = path.resolve(__dirname, "..", "public", "og-image.png");

const fallbackPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6Z0+QAAAAASUVORK5CYII=";

await fs.mkdir(path.dirname(outPath), { recursive: true });

try {
  await fs.access(outPath);
  console.log(`OG image already exists: ${outPath}`);
} catch {
  const png = Buffer.from(fallbackPngBase64, "base64");
  await fs.writeFile(outPath, png);
  console.log(`Generated fallback OG image: ${outPath}`);
}
