const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

module.exports = function loadTypescript(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relativePath)
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const subject = new Module(filename, module)
  subject.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = subject.require.bind(subject)
  subject.require = name => Object.hasOwn(mocks, name) ? mocks[name] : originalRequire(name)
  subject._compile(compiled, filename)
  return subject.exports
}
