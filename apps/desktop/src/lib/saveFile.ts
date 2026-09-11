import { isTauri } from "./tauriDrop";

/** Save bytes to disk. Uses Tauri save dialog in the app; falls back to browser download. */
export async function saveBytesToDisk(
  filename: string,
  bytes: Uint8Array,
): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    const path = await save({
      defaultPath: filename,
      title: "Save file",
    });
    if (!path) return false;

    await writeFile(path, bytes);
    return true;
  }

  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function confirmAction(message: string): Promise<boolean> {
  if (isTauri()) {
    const { ask } = await import("@tauri-apps/plugin-dialog");
    return ask(message, { title: "SimpleDir", kind: "warning" });
  }
  return window.confirm(message);
}
