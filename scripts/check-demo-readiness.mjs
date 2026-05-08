import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const rootDir = resolve(import.meta.dirname, '..')

const requiredFiles = [
  'docs/DOMESTIC_DEPLOYMENT.md',
  'docs/POSTER_QR_GUIDE.md',
  'docs/OFFLINE_DEMO_RUNBOOK.md',
  'docs/MOBILE_REAL_DEVICE_CHECKLIST.md',
  'docs/DEMO_ACCOUNT_SECURITY.md',
  'docs/AGENT_EVAL_REPORT.md',
  'miniapp/worker-task-demo/app.json',
  'scripts/prepare-demo-release.mjs',
]

const requiredRoutes = [
  '#/login',
  '#/mobile',
  '#/project/project-spring-2026/live',
  '#/project/project-spring-2026/replay',
]

const forbiddenTextPatterns = [
  /�/,
  /鎶|绂|涓|鏄|鍦|鐧|浜|棰|浠|骞|缁|妫|瑙|娴|鍥|鍚|闇|顬|鹃/,
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function readProjectFile(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8')
}

for (const file of requiredFiles) {
  assert(existsSync(join(rootDir, file)), `missing required file: ${file}`)
}

const packageJson = JSON.parse(readProjectFile('package.json'))
assert(packageJson.scripts?.build, 'package.json missing build script')
assert(packageJson.scripts?.['release:demo'], 'package.json missing release:demo script')
assert(packageJson.scripts?.['test:demo-readiness'], 'package.json missing test:demo-readiness script')

const routerSource = readProjectFile('src/lib/router.ts')
for (const page of ['login', 'mobile', 'live', 'replay']) {
  assert(routerSource.includes(`'${page}'`), `router page missing: ${page}`)
}

const releaseScript = readProjectFile('scripts/prepare-demo-release.mjs')
assert(releaseScript.includes('DEMO_LINKS.json'), 'release script must write DEMO_LINKS.json')
assert(releaseScript.includes('qr-targets.txt'), 'release script must write qr-targets.txt')
assert(releaseScript.includes('DEPLOYMENT_NOTES.md'), 'release script must write DEPLOYMENT_NOTES.md')
assert(releaseScript.includes('expopilot.cn'), 'release script must include production origin default')

const deploymentDoc = readProjectFile('docs/DOMESTIC_DEPLOYMENT.md')
assert(deploymentDoc.includes('https://expopilot.cn/#/mobile'), 'deployment doc missing mobile HTTPS target')
assert(deploymentDoc.includes('npm run release:demo'), 'deployment doc missing release command')

const qrDoc = readProjectFile('docs/POSTER_QR_GUIDE.md')
assert(qrDoc.includes('https://expopilot.cn/#/mobile'), 'poster QR doc missing production mobile URL')

const securityDoc = readProjectFile('docs/DEMO_ACCOUNT_SECURITY.md')
assert(securityDoc.includes('pilot@expopilot.cn'), 'demo account doc missing demo account')

const scannedFiles = [
  'scripts/prepare-demo-release.mjs',
  'docs/DOMESTIC_DEPLOYMENT.md',
  'docs/DELIVERY_CHECKLIST.md',
]

for (const file of scannedFiles) {
  const content = readProjectFile(file)
  for (const pattern of forbiddenTextPatterns) {
    assert(!pattern.test(content), `possible mojibake in ${file}: ${pattern}`)
  }
}

console.log('demo-readiness-ok')
console.log(`files=${requiredFiles.length}`)
console.log(`routes=${requiredRoutes.length}`)
