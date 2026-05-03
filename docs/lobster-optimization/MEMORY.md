---
summary: "场脉系统运营记忆 — ExpoPilot 项目、区域、人员、策略"
autoclaw.schema: "agent-profile/v1"
human.name: "老大"
human.call: "老大"
human.timezone: "Asia/Shanghai"
agent.name: "场脉·龙虾"
agent.role: "ExpoPilot 现场运营 Agent"
agent.emoji: "🦞"
---

# MEMORY.md — 场脉运营记忆

## 当前活跃项目

### 春季消费展 (project-spring-2026)
- **代码仓库**: `D:\code\expopilot-demo`
- **技术栈**: Vite 7 + React 19 + TypeScript 5.9
- **运行端口**: `http://localhost:5173`
- **数据**: localStorage 快照 (`expopilot-os-snapshot-v1`)，bootstrap 从 `public/data/bootstrap.json`

### 四个运营区域
| 区域 | zone_type | 特征 |
|------|-----------|------|
| 入口区 | entry | 易拥堵，队列敏感，需快速补位 |
| 主通道区 | stage | 人流枢纽，需导流管理 |
| 展台 A | booth | 高热度，需支援接待 |
| 展台 B | booth | 中等热度，正常经营 |

### 人员池
| 人员 | 岗位 | 绑定区域 | 技能 | 通道 |
|------|------|---------|------|------|
| 执行人员 1 (staff-01) | 现场执行 | 入口区 | 补位、导流 | mobile, browser |
| 展台接待 1 (staff-02) | 展台接待 | 展台 A | 支援接待 | mobile, wearable |

### 关键阈值
- 入口拥堵触发: heat > 75, density > 0.7, queue_minutes > 8
- 展台升温触发: heat > 80, density > 0.75
- auto 模式 confidence 门槛: 0.75

## 安全架构（不可修改）
- `agent-risk-policy.ts` — 风险边界 + auto 降级逻辑
- `agent-takeover-policy.ts` — 接管策略 + 控制锁定
- `agent-rollback.ts` — 失败回滚到 assist
- `agent-execution-bridge.ts` — 最终执行门

## 关联系统
- **OpenClaw Gateway**: `127.0.0.1:18789` (token 认证)
- **OpenClaw Adapter**: `127.0.0.1:8010` (explanations endpoint)
- **ExpoPilot 解释源 workspace**: `D:\OpenClawData`

## 已接入 LLM
- `VITE_AGENT_DECISION_PRODUCER=llm` → 启用 LLM 决策
- `VITE_AGENT_EXPLANATION_SOURCE=llm` → 启用 LLM 解释
- 通过 OpenClaw 代理走智谱 GLM 模型
- 失败自动 fallback: llm → mock_agent → local_rule_based

## 已沉淀教训
1. confirm 后再执行更安全——critical 事件默认 requires_confirmation=true
2. sandbox 来源事件置信度应低于 realtime
3. 任务状态流转不能跳过 received → processing → completed
4. 敏感凭证不写入 MEMORY.md 或 daily notes
