import path from "node:path"

/** Server-side writable data root. Electron sets SKY_DATA_DIR to app.getPath("userData")/data. */
export function getDataPath(fileName: string): string {
  const root = process.env.SKY_DATA_DIR ? path.resolve(process.env.SKY_DATA_DIR) : process.cwd()
  return path.join(root, path.basename(fileName))
}

/** Writable generated-file root, kept beside desktop data when packaged. */
export function getUploadPath(...segments: string[]): string {
  const root = process.env.SKY_DATA_DIR
    ? path.join(path.resolve(process.env.SKY_DATA_DIR), "uploads")
    : path.join(process.cwd(), "public", "uploads")
  const names = segments.map((segment) => {
    const name = path.basename(segment)
    if (!name || name === "." || name === ".." || /[\u0000:]/.test(name)) {
      throw new Error("Invalid upload path segment")
    }
    return name
  })
  return path.join(root, ...names)
}
