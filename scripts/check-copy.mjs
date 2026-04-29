#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('D:/code/expopilot-demo')

const files = [
  'index.html',
  'README.md',
  'DESIGN.md',
  'docs/iteration-log.md',
  'docs/pilot-script.md',
  'docs/token-budget.md',
  'src/app-config.ts',
  'src/components/AppFrame.tsx',
  'src/components/DispatchPage.tsx',
  'src/components/EventCenterPage.tsx',
  'src/components/ExplainPage.tsx',
  'src/components/LivePage.tsx',
  'src/components/LoginPage.tsx',
  'src/components/PeoplePage.tsx',
  'src/components/ProjectsPage.tsx',
  'src/components/ReplayPage.tsx',
  'src/components/SettingsPage.tsx',
  'src/components/StaffPage.tsx',
  'src/components/StrategiesPage.tsx',
  'src/domain/bootstrap.json',
  'public/data/bootstrap.json',
]

const checks = [
  { label: '替换字符', pattern: /\uFFFD/ },
  { label: '旧产品口径 Alpha', pattern: /\bAlpha\b/i },
]

const violations = []

for (const relativePath of files) {
  const fullPath = path.join(root, relativePath)
  const content = await readFile(fullPath, 'utf8')

  for (const check of checks) {
    const match = content.match(check.pattern)
    if (!match) continue

    const index = match.index ?? 0
    const before = content.slice(0, index)
    const lineNumber = before.split('\n').length
    const line = content.split('\n')[lineNumber - 1]?.trim() ?? ''
    if (line.startsWith('import ') || line.startsWith('export ')) continue
    violations.push(`${relativePath}:${lineNumber} [${check.label}] ${line}`)
  }
}

if (violations.length > 0) {
  console.error('发现需清理的用户可见文案或编码问题：')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exitCode = 1
} else {
  console.log('文案扫描通过：未发现已知乱码、旧产品口径或旧展示词。')
}
