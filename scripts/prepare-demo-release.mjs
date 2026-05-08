import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const rootDir = resolve(import.meta.dirname, '..')
const distDir = join(rootDir, 'dist')
const outputDir = join(rootDir, 'output', 'release')

if (!existsSync(distDir)) {
  throw new Error('dist directory not found. Run npm run build first.')
}

mkdirSync(outputDir, { recursive: true })

const productionOrigin = process.env.EXPOPILOT_PUBLIC_ORIGIN || 'https://expopilot.cn'
const githubOrigin = 'https://hongyao-z.github.io/ExpoPilot-OS'
const buildStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')
const zipPath = join(outputDir, `expopilot-os-static-${buildStamp}.zip`)

const demoLinks = {
  production: {
    login: `${productionOrigin}/#/login`,
    live: `${productionOrigin}/#/project/project-spring-2026/live`,
    mobile: `${productionOrigin}/#/mobile`,
    replay: `${productionOrigin}/#/project/project-spring-2026/replay`,
  },
  githubPages: {
    login: `${githubOrigin}/#/login`,
    live: `${githubOrigin}/#/project/project-spring-2026/live`,
    mobile: `${githubOrigin}/#/mobile`,
    replay: `${githubOrigin}/#/project/project-spring-2026/replay`,
  },
}

writeFileSync(join(distDir, 'DEMO_LINKS.json'), `${JSON.stringify(demoLinks, null, 2)}\n`, 'utf8')

writeFileSync(
  join(distDir, 'qr-targets.txt'),
  [
    'ExpoPilot OS / 场脉二维码入口',
    '',
    `正式移动端：${demoLinks.production.mobile}`,
    `正式登录页：${demoLinks.production.login}`,
    `备用移动端：${demoLinks.githubPages.mobile}`,
    `备用登录页：${demoLinks.githubPages.login}`,
    '',
    '海报主二维码建议使用正式移动端地址。',
    '如果正式域名未完成备案或解析，可临时使用 GitHub Pages 备用地址。',
  ].join('\n'),
  'utf8',
)

writeFileSync(
  join(distDir, 'DEPLOYMENT_NOTES.md'),
  [
    '# ExpoPilot OS 静态部署说明',
    '',
    '上传本目录内容到国内静态网站托管平台、对象存储静态站点，或 Nginx Web 根目录。',
    '',
    '## 验收地址',
    '',
    `- 登录页：${demoLinks.production.login}`,
    `- LivePage：${demoLinks.production.live}`,
    `- Mobile H5：${demoLinks.production.mobile}`,
    `- ReplayPage：${demoLinks.production.replay}`,
    '',
    '## 说明',
    '',
    '- 项目使用 Hash 路由，通常不需要额外 rewrite。',
    '- 如果使用 Nginx，建议保留 `try_files $uri $uri/ /index.html;`。',
    '- 演示账号：pilot@expopilot.cn / ExpoPilot2026。',
    '- 沙盒快速登录可用于无账号演示。',
    '- EventReviewAgent 和 DispatchAgent 默认使用本地规则模型，不依赖真实 LLM。',
    '- OpenClaw 仍只作为 explanation source，不是执行器。',
    '',
    '## 二维码建议',
    '',
    `- 海报二维码：${demoLinks.production.mobile}`,
    `- 备用二维码：${demoLinks.githubPages.mobile}`,
  ].join('\n'),
  'utf8',
)

writeFileSync(
  join(distDir, 'nginx.expopilot.conf'),
  [
    'server {',
    '  listen 80;',
    '  server_name expopilot.cn www.expopilot.cn;',
    '',
    '  root /usr/share/nginx/html;',
    '  index index.html;',
    '',
    '  location / {',
    '    try_files $uri $uri/ /index.html;',
    '  }',
    '',
    '  location /assets/ {',
    '    expires 7d;',
    '    add_header Cache-Control "public, max-age=604800";',
    '  }',
    '}',
    '',
  ].join('\n'),
  'utf8',
)

if (existsSync(zipPath)) rmSync(zipPath, { force: true })

const compressResult = spawnSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    `Compress-Archive -Path '${distDir.replaceAll("'", "''")}\\*' -DestinationPath '${zipPath.replaceAll("'", "''")}' -Force`,
  ],
  { encoding: 'utf8' },
)

if (compressResult.status !== 0) {
  throw new Error(`Compress-Archive failed: ${compressResult.stderr || compressResult.stdout}`)
}

const totalBytes = readdirSync(distDir).reduce((sum, name) => {
  const filePath = join(distDir, name)
  return sum + (statSync(filePath).isFile() ? statSync(filePath).size : 0)
}, 0)

console.log('demo-release-ok')
console.log(`origin=${productionOrigin}`)
console.log(`dist=${distDir}`)
console.log(`zip=${zipPath}`)
console.log(`topLevelBytes=${totalBytes}`)
