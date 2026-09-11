import { readFile, stat } from "@tauri-apps/plugin-fs";

function fileNameFromPath(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || "file";
}

function guessMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return "text/plain";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

/** Convert absolute filesystem paths from Tauri drag-drop into File objects. */
export async function pathsToFiles(paths: string[]): Promise<File[]> {
  const files: File[] = [];

  for (const path of paths) {
    try {
      const info = await stat(path);
      if (info.isDirectory) {
        continue;
      }
      const bytes = await readFile(path);
      const name = fileNameFromPath(path);
      // Copy into a plain ArrayBuffer-backed Uint8Array for File/Blob
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      files.push(new File([copy], name, { type: guessMime(name) }));
    } catch (err) {
      console.error("Failed to read dropped path", path, err);
      throw new Error(
        `Cannot read dropped file: ${fileNameFromPath(path)}. ${
          err instanceof Error ? err.message : ""
        }`.trim(),
      );
    }
  }

  return files;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
