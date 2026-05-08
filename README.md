# ExpoPilot OS / 场脉系统

ExpoPilot OS 是面向会展现场运营的智能控制台原型。当前版本已经收口为可路演、可扫码、可演示的交付基线：桌面端提供运营总览、实时监控、Agent 驾驶舱和审计复盘；移动端提供 `/#/mobile` H5 展演入口；OpenClaw 作为外部解释来源接入 Agent 解释链。

## 当前支持能力

- 黑 / 橙 / 白 UI baseline：Dashboard、LivePage、AgentCockpitPanel、ReplayPage、登录页和移动端 H5 已统一。
- 视觉感知演示链：camera replay、detection / tracking replay、metrics、`entrance_congestion`、`booth_heatup` 展示。
- Agent 控制面：AgentContext、AgentDecision、ToolCall、ExecutionResult、risk-policy、audit persistence、takeover / rollback。
- 解释来源：`fallback_template`、`mock_reasoner`、`OpenClaw Adapter`。
- OpenClaw 本地解释源：Gateway `18789`、Adapter `8010`、ExpoPilot `5173`。
- 移动端 H5 展演页：`http://localhost:5173/#/mobile`。

## 页面入口

- 登录页：`http://localhost:5173/#/login`
- Dashboard：`http://localhost:5173/#/projects`
- 实时监控：`http://localhost:5173/#/project/project-spring-2026/live`
- 审计复盘：`http://localhost:5173/#/project/project-spring-2026/replay`
- 移动端 H5：`http://localhost:5173/#/mobile`

## 本地运行

安装依赖：

```powershell
npm install
```

启动开发服务：

```powershell
npm run dev
```

构建验证：

```powershell
npm run build
```

## OpenClaw 一键启动

推荐使用一键启动器：

```powershell
D:\openclaw-explanation-adapter\start-all.bat
```

或：

```powershell
powershell -ExecutionPolicy Bypass -File D:\openclaw-explanation-adapter\start-all.ps1
```

启动器会检查 / 启动：

- OpenClaw Gateway：`127.0.0.1:18789`
- OpenClaw Adapter：`http://127.0.0.1:8010`
- ExpoPilot：`http://localhost:5173`
- healthcheck：`D:\openclaw-explanation-adapter\healthcheck.ps1`

成功后打开 LivePage。浏览器 Network 应能看到 `/explanations 200`，Agent 驾驶舱应显示解释来源为 `OpenClaw Adapter`，且未 fallback。

## 移动端二维码

本地演示二维码指向：

```text
http://localhost:5173/#/mobile
```

部署后二维码指向：

```text
https://你的部署地址/#/mobile
```

如果用手机扫本地地址，手机必须能访问运行 ExpoPilot 的机器；本机 `localhost` 只对本机有效。现场建议使用公网部署、同一局域网 IP，或临时隧道工具。

## 当前不支持范围

- 不接真实摄像头 live 输入。
- 不接真实远端任务派发后端。
- 不把 OpenClaw 接成 decision source 或 executor。
- 不绕过本地 risk / audit / takeover / rollback。
- 不做复杂权限系统、后端审批流或多设备同步。
- 不把移动端 H5 当成完整移动后台。

## 交付文档

- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)
- [DEMO_SCENARIO.md](./docs/DEMO_SCENARIO.md)
- [QR_POSTER_GUIDE.md](./docs/QR_POSTER_GUIDE.md)
- [OPENCLAW_RUNBOOK.md](./docs/OPENCLAW_RUNBOOK.md)
- [DELIVERY_CHECKLIST.md](./docs/DELIVERY_CHECKLIST.md)
- [STAGE2_AGENT_BASELINE.md](./docs/STAGE2_AGENT_BASELINE.md)

## Stage 5 Demo Scenario

Stage 5 uses a fixed 09:55-10:40 demonstration scenario:

| Step | Entry | Purpose |
|---:|---|---|
| 1 | `/#/projects` | Open project overview |
| 2 | `/#/project/project-spring-2026/live` | Show multi-monitor red alerts, focused monitor, EventReviewAgent, DispatchAgent, manager confirmation, task lifecycle, and staff feedback |
| 3 | `/#/mobile` | Show staff feedback demo states after dispatch confirmation |
| 4 | `/#/project/project-spring-2026/replay` | Replay monitor source, alert, EventReviewAgent review, DispatchAgent recommendation, manager confirmation, task feedback, and audit context |

EventReviewAgent and DispatchAgent are local deterministic demo models. They do not call a real LLM, do not execute tasks, and do not bypass project manager confirmation.

OpenClaw remains explanation source only. It only fills `why_event`, `why_action`, `why_assignee`, and `why_state`; it is not the decision source or executor and does not bypass risk, audit, takeover, or rollback.

## Agent Knowledge Architecture

ExpoPilot OS now includes a local event-operations knowledge layer for demo stability:

| Module | Purpose |
|---|---|
| `src/lib/event-operations-knowledge.ts` | Local professional knowledge for event evidence, escalation rules, recommended actions, forbidden actions, roles, manager checklist, staff instructions, and replay summary templates |
| `src/lib/event-review-agent.ts` | Rule-based EventReviewAgent; reviews event evidence, risk, missing evidence, and manager checklist |
| `src/lib/dispatch-agent.ts` | Rule-based DispatchAgent; recommends action, primary assignee, backup assignee, candidate score, fallback action, and dispatch checklist |
| `src/lib/agent-collaboration-model.ts` | Collaboration record model for signal, review, dispatch, manager confirmation, staff feedback, and replay reporting |

Agent boundaries:

- EventReviewAgent does not recommend assignees.
- DispatchAgent does not create tasks and does not change task state.
- Project manager confirmation remains mandatory.
- LLM/RAG is optional and disabled by default:

```env
VITE_AGENT_KNOWLEDGE_SOURCE=local
VITE_AGENT_LLM_ENABLED=false
VITE_AGENT_RAG_ENABLED=false
```

Local camera input can support a local demo path, but production-grade multi-camera deployment is outside the current demo scope.
