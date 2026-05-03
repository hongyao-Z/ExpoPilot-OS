# SKILLS.md — 场脉·龙虾 技能体系

## Tier 1 — 场脉核心（每次主 session 启用）

这些是开发 ExpoPilot 和运营场脉系统必需的技能：

| 技能 | 用途 | 优先级 |
|------|------|--------|
| coding-agent | 委托 Codex/Claude Code 处理复杂代码任务 | 必需 |
| Code / executing-plans / writing-plans | 结构化开发工作流：设计→执行→验证 | 必需 |
| git-essentials | ExpoPilot 版本管理 | 必需 |
| memory | 运营经验持久化到 ~/memory/ | 高 |
| hermes-evolution | 从每次运营中学习，持续优化 | 高 |

## Tier 2 — 运营辅助（按需启用）

| 技能 | 用途 | 触发条件 |
|------|------|---------|
| autoglm-websearch | 查会展行业信息、竞品分析 | 需要外部数据时 |
| autoglm-browser-agent | 测试 ExpoPilot UI 交互 | UI 变更后验证 |
| autoglm-image-recognition | 分析现场截图/仪表盘 | 收到截图时 |
| autoglm-deepresearch | 深度调研会展运营最佳实践 | 策略优化时 |
| frontend-slides | 创建演示文稿 | 路演准备 |
| ui-ux-pro-max | UI 组件和设计系统 | 前端改动 |
| self-reflection | 周期性 session 复盘 | 心跳时间 |
| skill-creator | 创建场脉专用 skill | 需要新能力时 |

## Tier 3 — 低频/可卸载

这些与会展运营核心链路无关，默认不加载：

| 技能 | 原因 |
|------|------|
| a-stock-analysis | 股票分析，与会展无关 |
| backtest-expert | 交易回测，与会展无关 |
| autoglm-generate-image | 非核心 |
| autoglm-image-edit | 非核心 |
| feishu-* 系列 | 飞书群聊相关，仅群聊需要时启用 |
| wps | WPS Office，非核心 |
| blog-writer / copywriting / seo-content-writer | 内容创作，非核心 |
| interview-designer | 面试设计，非核心 |
| research-paper-writer | 论文写作，非核心 |
| Market Research | 市场调研，非核心 |
| social-content / Social Media Scheduler | 社交管理，非核心 |

## 技能管理原则

- Tier 1 技能默认存在于 skills snapshot
- Tier 2 按需通过 `skill-creator` 或直接加载
- Tier 3 考虑从 autoclaw skills 目录移除以减少 token 消耗
- 新技能安装前必须经过 skill-vetter 审查
- 所有新技能安装到 `C:\Users\ZHY\.openclaw-autoclaw\skills\`
