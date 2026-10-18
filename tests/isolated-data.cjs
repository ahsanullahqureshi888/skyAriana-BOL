const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

// Call before loading application modules: several capture paths at import time.
module.exports = function isolatedData() {
  const originalCwd = process.cwd()
  const tempRoot = path.resolve(os.tmpdir())
  const root = fs.mkdtempSync(path.join(tempRoot, 'sky-isolated-qa-'))
  process.chdir(root)
  for (const [key, folder] of Object.entries({
    DATABASE_PATH: 'data', SKY_DATA_DIR: 'data', UPLOAD_PATH: 'uploads',
    BACKUP_PATH: 'backups', TEMP: 'tmp', TMP: 'tmp', TMPDIR: 'tmp',
  })) {
    process.env[key] = path.join(root, folder)
    fs.mkdirSync(process.env[key], { recursive: true })
  }
  delete process.env.BLOB_READ_WRITE_TOKEN
  test.after(() => {
    process.chdir(originalCwd)
    if (path.dirname(root) !== tempRoot || !path.basename(root).startsWith('sky-isolated-qa-')) {
      throw new Error('Unsafe test cleanup path')
    }
    fs.rmSync(root, { recursive: true, force: true })
  })
  return root
}
