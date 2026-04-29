import type { VisionMetricsFrame } from '../lib/vision-metrics'
import type { VisionEventCandidate, VisionThresholdConfig, VisionZoneHint } from '../lib/vision-types'

export interface VisionDebugPanelProps {
  currentFrame?: VisionMetricsFrame | null
  frameIndex: number
  totalFrames: number
  zoneType: VisionZoneHint
  thresholds: VisionThresholdConfig
  frameSatisfied: boolean
  consecutiveMatches: number
  cooldownActive: boolean
  cooldownMessage: string
  eventCandidate: VisionEventCandidate | null
}

function boolLabel(value: boolean) {
  return value ? '是' : '否'
}

export function VisionDebugPanel(props: VisionDebugPanelProps) {
  const eventLabel = props.zoneType === 'booth' ? '展台热度升高' : '入口拥堵'

  return (
    <article className="panel panel-span">
      <div className="panel-head">
        <h3>视觉调试</h3>
        <span>帧 {props.totalFrames === 0 ? 0 : props.frameIndex + 1} / {props.totalFrames}</span>
      </div>

      {props.currentFrame ? (
        <>
          <div className="metrics-row summary-strip">
            <div className="metric-card">
              <span>时间</span>
              <strong>{props.currentFrame.timestamp}</strong>
            </div>
            <div className="metric-card">
              <span>人数</span>
              <strong>{props.currentFrame.peopleCount}</strong>
            </div>
            <div className="metric-card">
              <span>密度</span>
              <strong>{props.currentFrame.densityScore}</strong>
            </div>
            <div className="metric-card">
              <span>平均速度</span>
              <strong>{props.currentFrame.avgSpeed}</strong>
            </div>
            {props.zoneType === 'booth' ? (
              <>
                <div className="metric-card">
                  <span>驻留人数</span>
                  <strong>{props.currentFrame.dwellCount}</strong>
                </div>
                <div className="metric-card">
                  <span>停留占比</span>
                  <strong>{props.currentFrame.lingerRatio}</strong>
                </div>
              </>
            ) : (
              <>
                <div className="metric-card">
                  <span>排队长度</span>
                  <strong>{props.currentFrame.queueLength}</strong>
                </div>
                <div className="metric-card">
                  <span>外溢</span>
                  <strong>{boolLabel(props.currentFrame.spillover)}</strong>
                </div>
              </>
            )}
          </div>

          {props.zoneType === 'booth' ? (
            <div className="chip-row">
              <span className="chip">人数 ≥ {props.thresholds.peopleCountThreshold ?? 0}：{boolLabel(props.currentFrame.peopleCount >= (props.thresholds.peopleCountThreshold ?? 0))}</span>
              <span className="chip">密度 ≥ {props.thresholds.densityThreshold}：{boolLabel(props.currentFrame.densityScore >= props.thresholds.densityThreshold)}</span>
              <span className="chip">平均速度 ≤ {props.thresholds.avgSpeedThreshold}：{boolLabel(props.currentFrame.avgSpeed <= props.thresholds.avgSpeedThreshold)}</span>
              <span className="chip">驻留人数 ≥ {props.thresholds.dwellCountThreshold ?? 0}：{boolLabel(props.currentFrame.dwellCount >= (props.thresholds.dwellCountThreshold ?? 0))}</span>
              <span className="chip">停留占比 ≥ {props.thresholds.lingerRatioThreshold ?? 0}：{boolLabel(props.currentFrame.lingerRatio >= (props.thresholds.lingerRatioThreshold ?? 0))}</span>
              <span className="chip">单帧条件命中：{boolLabel(props.frameSatisfied)}</span>
            </div>
          ) : (
            <div className="chip-row">
              <span className="chip">排队长度 ≥ {props.thresholds.queueLengthThreshold}：{boolLabel(props.currentFrame.queueLength >= props.thresholds.queueLengthThreshold)}</span>
              <span className="chip">密度 ≥ {props.thresholds.densityThreshold}：{boolLabel(props.currentFrame.densityScore >= props.thresholds.densityThreshold)}</span>
              <span className="chip">平均速度 ≤ {props.thresholds.avgSpeedThreshold}：{boolLabel(props.currentFrame.avgSpeed <= props.thresholds.avgSpeedThreshold)}</span>
              <span className="chip">外溢 = {boolLabel(props.thresholds.spilloverRequired)}：{boolLabel(props.currentFrame.spillover === props.thresholds.spilloverRequired)}</span>
              <span className="chip">单帧条件命中：{boolLabel(props.frameSatisfied)}</span>
            </div>
          )}

          <div className="chip-row">
            <span className="chip">连续命中 {props.consecutiveMatches} / {props.thresholds.consecutiveWindowsRequired}</span>
            <span className="chip">冷却：{props.cooldownActive ? '进行中' : '未生效'}</span>
          </div>

          <p className="helper-line">{props.cooldownMessage}</p>

          {props.eventCandidate ? (
            <div className="config-card">
              <div className="config-head">
                <strong>最终事件已生成</strong>
                <span>{props.eventCandidate.signal.timestamp}</span>
              </div>
              <p>{props.eventCandidate.signal.summary}</p>
              <div className="chip-row">
                {props.eventCandidate.triggerPoints.map((point) => (
                  <span className="chip" key={point}>{point}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="empty-copy">当前尚未生成 {eventLabel}。继续观察指标时间线的连续命中状态。</p>
          )}
        </>
      ) : (
        <p className="empty-copy">当前没有可展示的指标帧。</p>
      )}
    </article>
  )
}
