const fs = require('fs')
const path = require('path')

const target = path.join(__dirname, '..', 'components', 'header.tsx')
let content = fs.readFileSync(target, 'utf8')

content = content.replace(
  '  Database,\n  Zap,',
  '  Database,\n  Zap,\n  ShieldCheck,'
)

const tmp = target + '.tmp'
fs.writeFileSync(tmp, content, 'utf8')
fs.renameSync(tmp, target)
console.log('Added ShieldCheck to header.tsx!')
