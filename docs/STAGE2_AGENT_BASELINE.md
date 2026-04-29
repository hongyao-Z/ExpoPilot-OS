# Stage 2 + 8C-5 Baseline

## 文档目的

这份文档不是 PRD，也不是下一阶段方案。它只做一件事：

**把当前仓库已经冻结的两条 baseline 正式定义清楚。**

当前冻结内容：

- 阶段 2 视觉感知基线版
- 8C-5 Agent 控制面基线版

后续任何 2.1、2G、8C-6 或更后续扩展，都应从这份 baseline 出发，而不是重新理解当前代码。

## 一、当前冻结基线

### 1. 阶段 2 视觉感知基线版

当前视觉主链为：

`camera replay -> detection/tracking replay -> metrics -> entrance_congestion -> 主链路`

已经冻结的层：

- `vision-config.ts`
  - 输入与阈值配置
- `vision-detector.ts`
  - detection replay 接口
- `vision-tracker.ts`
  - tracking replay 接口
- `vision-metrics.ts`
  - 指标层
- `vision-event-adapter.ts`
  - 基于 metrics 的事件判定
- `VisionReplayPanel.tsx`
  - replay 展示层
- `VisionDebugPanel.tsx`
  - debug 展示层

当前冻结能力：

- 单摄像头
- 单区域
- 单事件 `entrance_congestion`
- 单主链路接入
- 连续窗口确认
- 冷却去重

明确不在当前 baseline 内：

- 第二事件类型
- 真实摄像头 live
- 多摄像头融合
- 复杂行为识别

### 2. 8C-5 Agent 控制面基线版

当前 Agent 主链为：

`AgentContext -> AgentDecision -> Risk / Takeover / Rollback -> Tool Execution Bridge -> Audit -> ViewModel -> Cockpit`

已经冻结的层：

- `agent-context-builder.ts`
- `agent-decision-config.ts`
- `agent-decision-providers.ts`
- `agent-decision-adapter.ts`
- `agent-risk-policy.ts`
- `agent-takeover-policy.ts`
- `agent-rollback.ts`
- `agent-execution-bridge.ts`
- `agent-audit.ts`
- `agent-audit-store.ts`
- `agent-audit-persistence.ts`
- `agent-view-model.ts`
- `AgentCockpitPanel.tsx`

当前冻结能力：

- producer switch
- 风控与审批边界
- 工具执行桥接
- 审计持久化
- 人工接管与回滚语义

明确不在当前 baseline 内：

- 真实远端 Agent
- 新的自动执行范围
- 后端审计系统
- 复杂审批工作流

## 二、页面与装配边界

### `LivePage.tsx`

`LivePage` 当前只允许承担：

- 视觉 replay/debug 的页面挂载
- Agent context/decision/view-model 的装配
- 页面级动作触发
- 将既有主链路能力挂到同一页面进行演示

`LivePage` 明确不能回退为：

- 视觉算法中心
- 风控规则中心
- takeover / rollback 规则中心
- 审计存储实现层

### `AgentCockpitPanel.tsx`

`AgentCockpitPanel` 当前固定为展示层，只负责显示：

- mode / state
- explanations / logs
- risk / controls / takeover status
- audit summary

不负责：

- decision 生成
- risk 判断
- tool execution 判断
- audit store 读取策略

### `agent-view-model.ts`

`agent-view-model` 当前固定为 UI adapter。

它只负责：

- 将 `AgentDecision + auditRecords` 转为展示字段

它不再承担：

- decision producer
- risk policy
- execution policy
- audit store

## 三、不能再回头混写的层

### 视觉主链不能混写

- detector / tracker 只管输入规范化
- metrics 只管指标
- event-adapter 只管事件判定
- replay/debug panel 只管展示

禁止再把：

- 指标阈值判断
- 事件触发判断
- 主链路注入逻辑

混回页面层或调试组件。

### Agent 主链不能混写

- context-builder 只管输入标准化
- decision-providers / config 只管 producer 来源
- decision-adapter 只管统一组装
- risk-policy 只管风控与审批边界
- takeover-policy 只管接管边界
- rollback 只管回退语义
- execution-bridge 只管工具执行桥接结果
- audit 层只管记录与持久化

禁止再把：

- 风险判断
- 审批判断
- takeover / rollback 判断
- 审计写入细节

散回 `LivePage` 或 `AgentCockpitPanel`。

## 四、当前基线对外输出什么

当前版本可对外稳定表述为：

> ExpoPilot OS 已完成一版双基线：视觉侧可将 camera replay 经过 detection/tracking replay、metrics 和事件判定接入现有主链路；Agent 控制面可对该事件完成决策、风控、审批、执行桥接、审计、接管与回退。

这一定义比“已做了很多功能”更重要，因为它明确了当前版本：

- 能演示什么
- 不能演示什么
- 下一阶段从哪里继续

## 五、下一阶段从哪里继续

后续扩展必须沿现有冻结层继续，而不是回头打散：

- 第二视觉事件：
  - 从 `vision-metrics.ts` 和 `vision-event-adapter.ts` 扩，不从页面扩
- 真实摄像头接入准备：
  - 从输入与配置层扩，不从 `LivePage` 临时接
- Agent 解释来源增强：
  - 从 producer / decision source 层扩，不从 UI 层扩

## 六、当前 baseline 验收口径

只要以下事实继续成立，就说明 baseline 仍有效：

1. camera replay 能进入主链路
2. `entrance_congestion` 仍由 metrics 驱动稳定触发
3. Agent 驾驶舱仍消费统一 `AgentDecision`
4. 风控、审批、执行桥接、审计、接管、回退链路仍成立
5. 页面层和展示层没有重新吞回主链判断逻辑
