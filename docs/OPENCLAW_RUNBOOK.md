# OpenClaw Runbook

## 当前定位

OpenClaw 当前只作为 ExpoPilot 的 external explanation source。

它不负责：

- decision source
- tool executor
- risk policy
- audit writer
- takeover / rollback controller
- vision runtime

所有执行、风控、审计、接管和回滚仍由 ExpoPilot 本地控制面负责。

## 端口

- OpenClaw native Gateway：`127.0.0.1:18789`
- OpenClaw explanation Adapter：`http://127.0.0.1:8010`
- ExpoPilot dev server：`http://localhost:5173`

## 一键启动

双击：

```text
D:\openclaw-explanation-adapter\start-all.bat
```

或运行：

```powershell
powershell -ExecutionPolicy Bypass -File D:\openclaw-explanation-adapter\start-all.ps1
```

脚本会：

1. 检查 Gateway `18789`。
2. 检查 Adapter `8010`。
3. 检查 ExpoPilot `.env.local` 中的 OpenClaw 变量。
4. 启动 ExpoPilot。
5. 执行 healthcheck。
6. 成功后打开 LivePage。

## Healthcheck

运行：

```powershell
powershell -ExecutionPolicy Bypass -File D:\openclaw-explanation-adapter\healthcheck.ps1
```

通过标准：

```text
Gateway: ok
Adapter health: ok
Explanations: ok
[OK] OpenClaw explanation stack healthcheck passed
```

`/explanations` 必须返回严格四字段 JSON：

```json
{
  "why_event": "string",
  "why_action": "string",
  "why_assignee": "string",
  "why_state": "string"
}
```

## 浏览器验收

打开：

```text
http://localhost:5173/#/project/project-spring-2026/live
```

DevTools Network 中应看到：

- `POST /explanations`
- status `200`

Agent 驾驶舱应显示：

- explanation source：`OpenClaw Adapter`
- fallback：未 fallback

## 常见状态码

### 400

含义：请求或响应 schema 不符合四字段 JSON 契约。

处理：

- 检查 adapter 日志。
- 确认 OpenClaw 没有返回 markdown、代码块、额外字段或嵌套对象。
- 确认 JSON guard 仍只允许四字段。

### 502

含义：Adapter 无法从 OpenClaw Gateway 得到可用解释结果。

处理：

- 检查 `18789` 是否监听。
- 检查 OpenClaw Gateway 窗口日志。
- 重启 Gateway，再运行 healthcheck。

### 504

含义：解释请求超时。

处理：

- 检查 OpenClaw 是否卡住。
- 确认 `VITE_AGENT_CLAW_TIMEOUT_MS=90000`。
- 必要时重启 Adapter 和 Gateway。

## fallback 说明

如果 OpenClaw 不可用或返回非法数据，ExpoPilot 会回退到 `fallback_template`。这是预期保护，不是系统崩溃。

fallback 时检查：

1. `healthcheck.ps1` 是否通过。
2. Network 是否有 `/explanations 200`。
3. Agent 面板 explanation source 是否仍显示 `OpenClaw Adapter`。
4. Adapter 日志中是否有 invalid payload / timeout / unavailable。

## 停止服务

```powershell
powershell -ExecutionPolicy Bypass -File D:\openclaw-explanation-adapter\kill-openclaw-stack.ps1
```

停止脚本只处理本机 `18789` 和 `8010` 监听进程，不删除文件。

## 不使用 AutoClaw GUI

当前路演链路使用原生 OpenClaw Gateway + 本地 Adapter。不要用 AutoClaw GUI 替代这条链路，避免解释源、端口和权限状态混乱。
