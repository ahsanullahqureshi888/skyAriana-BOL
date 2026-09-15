import { mkdir, open, rename, unlink } from "node:fs/promises"
import path from "node:path"

export async function atomicWriteFile(targetPath: string, data: string | Buffer): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true })
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`,
  )
  const handle = await open(temporaryPath, "wx")
  try {
    await handle.writeFile(data)
    await handle.sync()
  } finally {
    await handle.close()
  }
  try {
    await rename(temporaryPath, targetPath)
  } finally {
    await unlink(temporaryPath).catch(() => undefined)
  }
}
