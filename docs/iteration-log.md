# ExpoPilot OS 迭代日志

## 重构说明

- 旧的展会中控计划已归档。
- 当前版本以 `ExpoPilot_OS_PRD_V1.0.docx` 为唯一产品依据。
- 本轮目标是把原来的展会中控原型重构成 ExpoPilot OS 现场运营智能体系统首版。

## v12

- 目标：按新 PRD 重建信息架构、共享模型和核心页面。
- 关键改动：
  - 顶层叙事统一为 ExpoPilot OS。
  - 共享模型重构为 `Project / Zone / DataSource / EventSignal / Event / Task / Feedback / Strategy / ReviewReport`。
  - 后台重排为项目首页、现场配置、实时态势、事件中心、任务调度、人员状态、复盘分析、策略库、设置与权限。
  - 工作人员端重排为当前任务、提醒设置、一键反馈和历史任务。
  - CLI 语义切换到 `seed-project / create-event / dispatch-task / explain / replay-report / save-strategy`。
  - 本地快照与前端 UI 统一切到同一份 OS schema。
- 自测：
  - `tsc -b`
  - `vite build`
  - `check-contract.mjs`
  - `test-state-machine.mjs`
  - `test-ui-services.mts`
- 自评分：95/100
- 当前遗留：
  - 未接真实视觉服务、通知服务和第三方平台。
  - 品牌方视角仍以前端过滤为主，尚未接真实服务端权限。
  - 可穿戴提醒接口仅做前端边界预留。
- 下一步：
  - 接真实服务端代理与鉴权。
  - 补第三方同步与排班联动。
  - 接入可穿戴提醒和策略执行日志。
