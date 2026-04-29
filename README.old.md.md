# ExpoPilot OS

ExpoPilot OS 是面向会务执行团队、主办方和品牌参展方的现场运营智能体系统。当前交付包含：

- Web 后台：项目首页、现场配置、实时态势、事件中心、任务调度、人员状态、复盘分析、策略库、设置与权限
- 工作人员移动端：当前任务、实时提醒、一键反馈、历史任务与我的状态
- 本地命令行工具：用于后续智能体、自动化脚本和契约验证

## 运行

本机可用 Node 路径：

`C:\Program Files\AutoClaw\resources\node\node.exe`

开发预览：

```powershell
& 'C:\Program Files\AutoClaw\resources\node\node.exe' .\node_modules\vite\bin\vite.js --host
```

构建：

```powershell
& 'C:\Program Files\AutoClaw\resources\node\node.exe' .\node_modules\typescript\bin\tsc -b
& 'C:\Program Files\AutoClaw\resources\node\node.exe' .\node_modules\vite\bin\vite.js build
```

测试：

```powershell
& 'C:\Program Files\AutoClaw\resources\node\node.exe' .\scripts\check-contract.mjs
& 'C:\Program Files\AutoClaw\resources\node\node.exe' .\scripts\test-state-machine.mjs
& 'C:\Program Files\AutoClaw\resources\node\node.exe' --experimental-strip-types .\scripts\test-ui-services.mts
```

CLI 示例：

```powershell
& 'C:\Program Files\AutoClaw\resources\node\node.exe' .\scripts\expopilot.mjs seed-project --project project-os-2026
& 'C:\Program Files\AutoClaw\resources\node\node.exe' .\scripts\expopilot.mjs simulate-signals --project project-os-2026
& 'C:\Program Files\AutoClaw\resources\node\node.exe' .\scripts\expopilot.mjs create-event --project project-os-2026 --zone zone-nebula --summary "人工补录测试"
& 'C:\Program Files\AutoClaw\resources\node\node.exe' .\scripts\expopilot.mjs explain --event evt-002
```

## 当前边界

- 不接真实鉴权服务
- 不接真实视觉感知服务
- 不接真实通知服务
- 不接第三方平台正式联调
- 不接服务端 PDF 管道

以上能力都已保留前端边界、共享数据结构和命令行语义，便于后续接入真实智能体和服务端。
