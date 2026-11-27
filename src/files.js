// Writing a file whole or not at all: the text goes to a temporary file beside it, renamed over
// it, so a failure halfway never leaves a truncated file behind.

import { randomUUID } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** The last write to each file, so the next waits for it. */
const writing = new Map();

/**
 * Writes `text` to `file` through a temporary file named for this write alone, one write to a
 * file at a time in this process. A host that runs several writers in one process (the Raycast
 * extension does) gave them one temporary file when it was named by the pid, and every rename
 * but the first found it gone; and on Windows two renames onto one file at once fail even with
 * names of their own. A failed write takes its temporary file with it.
 */
export function replaceFile(file, text) {
  const key = path.resolve(file);
  const write = (writing.get(key) ?? Promise.resolve()).then(async () => {
    const tmp = `${file}.tmp-${process.pid}-${randomUUID()}`;
    try {
      await writeFile(tmp, text);
      await rename(tmp, file);
    } catch (error) {
      await rm(tmp, { force: true });
      throw error;
    }
  });
  // The next write waits for this one whether it succeeds or not, and the map keeps only the last.
  const settled = write.catch(() => {});
  writing.set(key, settled);
  settled.then(() => writing.get(key) === settled && writing.delete(key));
  return write;
}
