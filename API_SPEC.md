# API_SPEC.md

## 说明
本文件描述的是 **ExpoPilot OS 当前 MVP 的前端契约与 mock 接口语义**。

当前仓库是已有的 Vite + React + TypeScript 前端原型，本文件用于统一页面、mock 数据和后续真实接口的字段语义，不代表当前必须落地真实后端。

## 当前主链路
事件识别 -> 任务下发 -> 执行反馈 -> 项目复盘

## 固定场景
- 项目：春季消费展
- 区域：入口区、主通道区、展台 A、展台 B
- 角色：项目经理、执行人员 1、展台接待 1
- 事件：`entrance_congestion`
- 任务：补位
- 反馈：`processing -> completed`

## 数据模型约束

### EventType
- `entrance_congestion`
- `booth_heatup`
- `zone_imbalance`

### TaskType
- 补位
- 支援接待
- 导流
- 待命

### TaskStatus
- `created`
- `received`
- `processing`
- `completed`
- `exception`

## Projects

### GET /projects
返回项目列表。

### POST /projects
创建项目。

请求示例：
```json
{
  "name": "春季消费展",
  "venue_name": "1 号馆",
  "start_time": "2026-04-20T09:00:00+08:00",
  "end_time": "2026-04-20T18:00:00+08:00"
}
```

## Zones

### GET /projects/{project_id}/zones
获取区域配置。

### POST /projects/{project_id}/zones
新增区域。

请求示例：
```json
{
  "name": "入口区",
  "zone_type": "entrance",
  "x": 10,
  "y": 20,
  "width": 180,
  "height": 80
}
```

## Event Signals

### GET /projects/{project_id}/signals
获取原始信号列表。

### POST /projects/{project_id}/signals
注入 mock 或手工信号。

请求示例：
```json
{
  "source_type": "mock",
  "raw_type": "crowd_density_high",
  "zone_name": "入口区",
  "payload_json": {
    "level": 0.92,
    "note": "入口密度上升"
  }
}
```

## Events

### GET /projects/{project_id}/events
获取事件列表。

### GET /events/{event_id}
获取单个事件详情。

事件返回示例：
```json
{
  "id": "evt-001",
  "event_type": "entrance_congestion",
  "priority": "high",
  "zone_name": "入口区",
  "trigger_reason": "短时间内入口密度持续升高",
  "status": "active"
}
```

## Tasks

### GET /projects/{project_id}/tasks
获取项目任务列表。

### GET /staff/{staff_id}/tasks
获取工作人员任务列表。

### POST /events/{event_id}/dispatch
根据事件创建任务。

派发返回示例：
```json
{
  "task_id": "task-001",
  "assignee_name": "执行人员 1",
  "task_type": "补位",
  "status": "created"
}
```

### PATCH /tasks/{task_id}/status
更新任务状态。

请求示例：
```json
{
  "status": "processing",
  "note": "已到达入口区"
}
```

允许状态：
- `created`
- `received`
- `processing`
- `completed`
- `exception`

## Review Report

### POST /projects/{project_id}/review/generate
生成项目复盘。

### GET /projects/{project_id}/review
获取项目复盘。

返回示例：
```json
{
  "project_id": "project-001",
  "metrics": {
    "total_events": 1,
    "total_tasks": 1,
    "completion_rate": 1,
    "completed_feedback_count": 1
  },
  "timeline": [
    {
      "time": "2026-04-20T10:10:00+08:00",
      "event_type": "entrance_congestion",
      "task_type": "补位",
      "task_status": "completed"
    }
  ]
}
```

## 当前约束
- 本文件用于统一前端和 mock 契约
- 当前不要求真实 JWT、WebSocket、数据库或服务端实现
- 后续若接真实接口，必须优先保持这里的事件、任务和状态语义不变
