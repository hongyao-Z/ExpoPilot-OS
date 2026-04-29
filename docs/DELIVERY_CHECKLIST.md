# Delivery Checklist

## 交付基线

- [ ] 黑橙白 UI baseline 完成。
- [ ] Dashboard 可打开。
- [ ] LivePage 可打开。
- [ ] AgentCockpitPanel 可展示解释、风控、审批、执行、审计、接管信息。
- [ ] ReplayPage 可展示审计复盘。
- [ ] 登录页视觉已收口。
- [ ] `/mobile` H5 展演页可打开。
- [ ] OpenClaw Adapter 可作为 explanation source。
- [ ] `npm run build` 通过。

## 需要打开的窗口

推荐使用一键启动：

```text
D:\openclaw-explanation-adapter\start-all.bat
```

成功后应至少有：

- OpenClaw Gateway 窗口。
- OpenClaw Adapter 窗口。
- ExpoPilot Vite 窗口。
- 浏览器 LivePage。

## 路演前 10 分钟检查

1. 运行 `D:\openclaw-explanation-adapter\start-all.bat`。
2. 运行或确认 `D:\openclaw-explanation-adapter\healthcheck.ps1` 全 ok。
3. 打开 `http://localhost:5173/#/projects`。
4. 打开 `http://localhost:5173/#/project/project-spring-2026/live`。
5. Network 中确认 `/explanations 200`。
6. Agent 面板确认 OpenClaw Adapter 未 fallback。
7. 打开 `http://localhost:5173/#/project/project-spring-2026/replay`。
8. 打开 `http://localhost:5173/#/mobile`。
9. 确认二维码指向正确地址。
10. 关闭不必要的浏览器标签和无关终端。

## 演示路径

1. 登录页。
2. Dashboard。
3. LivePage。
4. camera replay / mock event。
5. Agent 驾驶舱。
6. OpenClaw Adapter `/explanations 200`。
7. ReplayPage。
8. 手机扫码 `/mobile`。
9. 总结系统价值。

## 常见故障处理

### LivePage 无解释请求

- 确认进入的是 `/#/project/project-spring-2026/live`。
- 确认 Agent 驾驶舱已加载 decision。
- 触发 camera replay 或 mock event。

### OpenClaw fallback

- 运行 `healthcheck.ps1`。
- 检查 `18789` 和 `8010` 是否监听。
- 查看 Adapter 日志是否有 400 / 502 / 504。
- fallback 不阻断演示，可说明系统有本地模板兜底。

### 手机扫不开

- 不要用 `localhost` 给手机扫。
- 用公网部署地址或局域网 IP。
- 检查手机和电脑是否同一网络。
- 检查防火墙和 Vite `--host`。

### 构建失败

```powershell
npm run build
```

优先看 TypeScript 报错文件，不要为了修构建改业务主链。

## 当前不做

- 不接真实摄像头。
- 不接后端任务派发。
- 不把 OpenClaw 变成执行器。
- 不新增自动执行范围。
- 不做完整移动后台。
