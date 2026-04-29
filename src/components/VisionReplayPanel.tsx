import type { VisionInputSource } from '../lib/vision-types'

export interface VisionReplayPanelProps {
  cameraId: string
  sourceLabel: string
  detectionSource: VisionInputSource
  trackingSource: VisionInputSource
  status: 'idle' | 'loading' | 'ready' | 'error'
  errorMessage?: string
  detectionFrameCount: number
  trackingFrameCount: number
  metricsFrameCount: number
  onReload: () => void
}

function statusLabel(status: VisionReplayPanelProps['status']) {
  switch (status) {
    case 'loading':
      return '加载中'
    case 'ready':
      return '已加载'
    case 'error':
      return '加载失败'
    case 'idle':
    default:
      return '未加载'
  }
}

export function VisionReplayPanel(props: VisionReplayPanelProps) {
  return (
    <article className="panel panel-span">
      <div className="panel-head">
        <h3>视觉回放</h3>
        <span>{statusLabel(props.status)}</span>
      </div>

      <div className="metrics-row summary-strip">
        <div className="metric-card">
          <span>回放源</span>
          <strong>{props.sourceLabel}</strong>
        </div>
        <div className="metric-card">
          <span>摄像头</span>
          <strong>{props.cameraId}</strong>
        </div>
        <div className="metric-card">
          <span>检测帧数</span>
          <strong>{props.detectionFrameCount}</strong>
        </div>
        <div className="metric-card">
          <span>追踪帧数</span>
          <strong>{props.trackingFrameCount}</strong>
        </div>
        <div className="metric-card">
          <span>指标帧数</span>
          <strong>{props.metricsFrameCount}</strong>
        </div>
      </div>

      <p className="helper-line">当前调试展示优先使用回放兜底，不依赖实时摄像头。</p>

      <div className="chip-row">
        <span className="chip">{props.detectionSource.label}</span>
        <span className="chip">{props.trackingSource.label}</span>
      </div>

      {props.errorMessage ? <p className="helper-line">{props.errorMessage}</p> : null}

      <div className="inline-actions">
        <button className="ghost-button" onClick={props.onReload}>重新加载视觉回放</button>
      </div>
    </article>
  )
}
