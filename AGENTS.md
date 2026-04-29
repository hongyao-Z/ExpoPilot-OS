# AGENTS.md

## Project
ExpoPilot OS 是面向会务执行公司的现场运营 Agent 系统。

当前仓库不是从 0 开始的新项目，而是一个已经存在的前端原型。所有工作默认在现有仓库上继续推进，不重建项目。

## Real Stack
- Frontend: Vite + React + TypeScript
- Styling: 现有 CSS 与组件样式体系
- State and routing: 当前仓库内的 `src/App.tsx`、`src/services`、`src/selectors`、`src/domain`
- Data source: 本地 mock 数据与前端快照驱动

## Do Not Migrate
以下内容默认不做，除非产品要求明确变化：
- 不迁移到 Next.js
- 不迁移到 monorepo
- 不引入 FastAPI
- 不引入 PostgreSQL
- 不因为旧文档而重建前后端分层

## MVP Goal
本轮唯一目标是跑通一条最小闭环：

**事件识别 -> 任务下发 -> 执行反馈 -> 项目复盘**

## MVP Scope

### 后台端
- 项目列表
- 项目创建
- 区域配置
- 实时态势页
- 事件中心页
- 任务调度页
- 复盘分析页

### 工作人员端
- 当前任务
- 任务详情
- 状态反馈
- 历史任务

### 事件类型
- `entrance_congestion`
- `booth_heatup`
- `zone_imbalance`

### 任务类型
- 补位
- 支援接待
- 导流
- 待命

### 任务状态流
- `created`
- `received`
- `processing`
- `completed`
- `exception`

## Fixed Demo Scenario
- 项目：春季消费展
- 区域：入口区、主通道区、展台 A、展台 B
- 角色：项目经理、执行人员 1、展台接待 1
- 事件：`entrance_congestion`
- 任务：给执行人员 1 下发“补位”
- 反馈：`processing -> completed`
- 复盘：1 个入口拥堵事件、1 个补位任务、1 次完成反馈

## Explicitly Out of Scope
- 报名注册系统
- CRM
- lead capture
- 完整展商系统
- 真正复杂 CV 模型训练
- 深度可穿戴设备接入
- 大而全会展平台能力

## Reuse First
优先复用以下目录和现有页面组织方式：
- `src/App.tsx`
- `src/domain/*`
- `src/services/*`
- `src/selectors/*`
- `src/components/*`

## Do Not Touch By Default
以下内容默认不要主动修改，除非出现明确阻塞并先记录原因：
- `vite.config*`
- `tsconfig*`
- `eslint.config*`
- `dist/`
- 构建脚本
- 非核心图片资源

## Non-MVP Pages
超出本次范围的页面处理规则固定为：
- 从主导航移除
- 可保留路由
- 标记为“后续版本预留”
- 不新增复杂交互逻辑

## Working Style
1. 先修正文档和仓库规则，再动页面
2. 先打通后台主链路，再改工作人员端
3. 优先做 MVP 收口，不扩张范围
4. 同步维护 `README.md`、`MVP_SCOPE.md`、`PRD.md`、`DEMO_SCRIPT.md`、`API_SPEC.md`
