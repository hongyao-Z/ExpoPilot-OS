# ExpoPilot OS / 场脉 Stage 5 演示话术

## 演示目标

用一条固定故事线展示：

```text
多监控源 -> 异常告红 -> 焦点监控 -> EventReviewAgent -> DispatchAgent -> 项目经理确认 -> 任务状态 -> 工作人员反馈 -> 复盘
```

Stage 5 的重点不是增加真实后端，而是把现场异常发现和人工确认过程讲清楚。

## 演示前检查

```powershell
D:\openclaw-explanation-adapter\start-all.bat
npm run build
npm run dev
```

| 检查项 | 期望 |
|---|---|
| ExpoPilot | `http://localhost:5173` 可访问 |
| LivePage | `http://localhost:5173/#/project/project-spring-2026/live` 可访问 |
| Mobile H5 | `http://localhost:5173/#/mobile` 可访问 |
| ReplayPage | `http://localhost:5173/#/project/project-spring-2026/replay` 可访问 |
| OpenClaw Adapter | 在线时提供解释；离线时 fallback 只影响解释文本 |

## 固定演示顺序

| 时间 | 页面 | 操作 | 讲解重点 |
|---|---|---|---|
| 09:55 | Dashboard | 打开项目总览 | 系统是会展现场控制台，统一承载项目、监控和复盘入口 |
| 10:00 | LivePage | 展示观众入场 | 多个监控源同时进入运营视图 |
| 10:03 | LivePage | 点击入口 A 告红卡片 | 总监控面板发现异常，项目经理定位到区域 |
| 10:05 | LivePage | 展示焦点监控 | 入口拥堵被识别，但不会自动执行任务 |
| 10:06 | LivePage | 展示 EventReviewAgent | 审核发生了什么、证据、风险等级、是否需要处理 |
| 10:06 | LivePage | 展示 DispatchAgent | 推荐动作、主执行人、备选执行人和派发原因 |
| 10:07 | LivePage | 展示项目经理确认 | 派发建议必须经过人工确认 |
| 10:07 | Mobile / LivePage | 展示工作人员反馈 | 任务进入现场执行状态 |
| 10:10 | LivePage | 展示拥堵缓解 | 任务状态和反馈形成演示闭环 |
| 10:20 | LivePage | 展示展台 512 热度升高 | 多监控源、多区域异常共用同一套处理表达 |
| 10:30 | LivePage | 展示设备异常检查 | critical 告警和技术支持建议 |
| 10:40 | ReplayPage | 展示复盘 | 双 Agent、确认、任务和反馈可以回看 |

## 页面话术

### Dashboard

“这里是 ExpoPilot OS 的会展现场控制台。演示从开馆前检查开始，项目、实时监控和复盘入口都在同一个系统里。”

### LivePage 总监控

“LivePage 现在不是只看单个事件，而是同时展示多个监控源。入口 A、展台 512、舞台设备这些区域都可以作为独立监控源进入总监控面板。”

“入口 A 告红后，项目经理点击异常监控卡片，页面进入该区域的焦点监控。这里展示的是异常来源、区域、时间、证据摘要和处理状态。”

### EventReviewAgent

“事件审核 Agent 负责回答四件事：发生了什么，证据是什么，风险等级是多少，是否需要处理。它是本地规则型 demo，不接真实 LLM，也不审批任务。”

### DispatchAgent

“派发建议 Agent 负责给出推荐动作、推荐执行人、备选执行人和派发原因。它只给建议，不创建任务，不绕过项目经理确认。”

### 项目经理确认

“确认权在项目经理手里。只有确认后，建议才进入任务状态展示。这里保留人工确认，是为了保证现场处理不被 Agent 直接执行。”

### Mobile H5 / 反馈摘要

“工作人员反馈用于表达现场执行状态。到达、处理中、需要支援、完成或无法处理，都会进入后续复盘视图。”

### ReplayPage

“复盘页展示完整处理过程：监控源发现问题，告警生成，EventReviewAgent 审核，DispatchAgent 建议，项目经理确认，任务执行反馈，最后进入审计记录。”

“这里增强的是展示视角，不改 audit store，不接真实后端。”

## OpenClaw 边界话术

“OpenClaw 在本系统里只作为 explanation source。它只输出 `why_event`、`why_action`、`why_assignee`、`why_state`。”

“OpenClaw 不是主决策源，不是执行器，不绕过 risk、audit、takeover、rollback。即使 OpenClaw 离线，系统也只是切换解释来源，不改变控制边界。”

## 失败处理

| 问题 | 处理 |
|---|---|
| OpenClaw 不通 | 说明 fallback 只替换解释来源，继续演示 |
| 入口告警没有处于焦点 | 点击 Entrance A 或 High 告警卡片 |
| EventReviewAgent 未显示目标事件 | 重新点击入口 A 监控源 |
| DispatchAgent 候选人过长 | 只讲主执行人和备选执行人 |
| 手机无法访问 localhost | 在桌面浏览器打开 `/#/mobile` |
| ReplayPage 日志较少 | 聚焦双 Agent 复盘面板和任务详情 |
| dev server 未启动 | 执行 `npm run dev` |

## 成功标准

| 标准 | 结果 |
|---|---|
| LivePage 展示总监控、焦点监控、双 Agent、确认和反馈 | 必须满足 |
| ReplayPage 展示双 Agent 处理过程复盘 | 必须满足 |
| 明确说明双 Agent 是本地 demo，不直接执行 | 必须满足 |
| 明确说明 OpenClaw 只提供解释来源 | 必须满足 |
| 不改 OpenClaw / Agent 主链 / Vision / services / selectors / audit store | 必须满足 |
| `npm run build` 通过 | 必须满足 |
