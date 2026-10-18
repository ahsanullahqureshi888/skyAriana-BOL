const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
let ts
try {
  ts = require('typescript')
} catch {
  try {
    ts = require(path.resolve(__dirname, '../node_modules/.pnpm/typescript@5.7.3/node_modules/typescript'))
  } catch {
    ts = require(path.resolve(__dirname, '../node_modules/.ignored_typescript'))
  }
}

module.exports = function loadTypescript(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relativePath)
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const subject = new Module(filename, module)
  subject.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = subject.require.bind(subject)
  
  subject.require = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name]
    if (name.startsWith('@/')) {
      const sub = name.slice(2)
      const absTs = path.resolve(__dirname, '..', `${sub}.ts`)
      const absTsx = path.resolve(__dirname, '..', `${sub}.tsx`)
      if (fs.existsSync(absTs)) return loadTypescript(`${sub}.ts`, mocks)
      if (fs.existsSync(absTsx)) return loadTypescript(`${sub}.tsx`, mocks)
      return originalRequire(path.resolve(__dirname, '..', sub))
    }
    if (name.startsWith('.')) {
      const dir = path.dirname(filename)
      const targetTs = path.resolve(dir, `${name}.ts`)
      const targetTsx = path.resolve(dir, `${name}.tsx`)
      if (fs.existsSync(targetTs)) {
        const rel = path.relative(path.resolve(__dirname, '..'), targetTs)
        return loadTypescript(rel, mocks)
      }
      if (fs.existsSync(targetTsx)) {
        const rel = path.relative(path.resolve(__dirname, '..'), targetTsx)
        return loadTypescript(rel, mocks)
      }
    }
    try {
      return originalRequire(name)
    } catch (err) {
      try {
        const pnpmDir = path.resolve(__dirname, '../node_modules/.pnpm')
        if (fs.existsSync(pnpmDir)) {
          const entries = fs.readdirSync(pnpmDir)
          for (const entry of entries) {
            if (entry.startsWith(name + '@') || entry.startsWith(name.replace('/', '+') + '@') || entry.includes(`+${name}@`)) {
              const candidate = path.resolve(pnpmDir, entry, 'node_modules', name)
              if (fs.existsSync(candidate)) {
                return originalRequire(candidate)
              }
            }
          }
        }
      } catch {}
      try {
        const ignoredCandidate = path.resolve(__dirname, `../node_modules/.ignored_${name}`)
        if (fs.existsSync(ignoredCandidate)) {
          return originalRequire(ignoredCandidate)
        }
      } catch {}
      throw err
    }
  }

  subject._compile(compiled, filename)
  return subject.exports
}
