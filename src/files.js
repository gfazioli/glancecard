// Writing a file whole or not at all: the text goes to a temporary file beside it, renamed over
// it, so a failure halfway never leaves a truncated file behind.

import { randomUUID } from "node:crypto";
import { rename, writeFile } from "node:fs/promises";

/**
 * Writes `text` to `file` through a temporary file named for this write alone. The pid is no
 * such name: a host that runs several writers in one process (the Raycast extension does) gave
 * them one temporary file, and every rename but the first found it gone.
 */
export async function replaceFile(file, text) {
  const tmp = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(tmp, text);
  await rename(tmp, file);
}
