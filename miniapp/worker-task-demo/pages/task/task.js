/* global Page */
const statusFlow = ['dispatched', 'accepted', 'arrived', 'processing', 'completed']

const statusLabels = {
  dispatched: '待接收',
  accepted: '已接收',
  arrived: '已到达',
  processing: '处理中',
  completed: '已完成',
  support: '请求支援',
  exception: '现场异常',
}

const timeline = [
  { id: 'dispatched', label: '任务已派发', timeLabel: '10:07' },
  { id: 'accepted', label: '工作人员已接收', timeLabel: '待操作' },
  { id: 'arrived', label: '已到达现场', timeLabel: '待操作' },
  { id: 'processing', label: '处理中', timeLabel: '待操作' },
  { id: 'completed', label: '已完成反馈', timeLabel: '待操作' },
]

function getTimelineState(stepId, currentStatus) {
  if (currentStatus === 'support' || currentStatus === 'exception') {
    return stepId === 'processing' ? 'current' : statusFlow.indexOf(stepId) < statusFlow.indexOf('processing') ? 'done' : 'pending'
  }

  const currentIndex = statusFlow.indexOf(currentStatus)
  const stepIndex = statusFlow.indexOf(stepId)

  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}

function buildTimeline(currentStatus) {
  return timeline.map((item) => ({
    ...item,
    state: getTimelineState(item.id, currentStatus),
    stateLabel: getTimelineState(item.id, currentStatus) === 'current' ? statusLabels[currentStatus] : item.timeLabel,
  }))
}

Page({
  data: {
    currentStatus: 'dispatched',
    statusLabel: statusLabels.dispatched,
    alertText: '',
    feedbackNote: '现场已完成分流，排队长度下降，建议继续观察备用通道压力。',
    task: {
      title: '入口 A 人流拥堵引导',
      location: 'A1 主入口 / 展馆入口 A',
      arriveWithin: '5 分钟内',
      priority: '高',
      source: '项目经理确认 / DispatchAgent 建议',
      contact: '现场项目经理',
      role: '入口引导员 A',
    },
    instructions: [
      '前往入口 A 外侧分流点',
      '引导观众至备用通道',
      '协助安保维持单向排队秩序',
      '到场后点击“我已到达”',
      '处理完成后提交反馈',
    ],
    buttons: [
      { action: 'accepted', label: '确认接收', primary: true },
      { action: 'arrived', label: '我已到达', primary: false },
      { action: 'processing', label: '开始处理', primary: false },
      { action: 'completed', label: '完成反馈', primary: false },
      { action: 'support', label: '请求支援', secondary: true },
      { action: 'exception', label: '现场异常', danger: true },
    ],
    timeline: buildTimeline('dispatched'),
    resultOptions: ['现场已完成分流', '排队长度下降', '需要继续观察'],
  },

  handleCommand(event) {
    const nextStatus = event.currentTarget.dataset.action

    if (nextStatus === 'support') {
      this.applyStatus(nextStatus, '已通知项目经理：需要安保协同支援。')
      return
    }

    if (nextStatus === 'exception') {
      this.applyStatus(nextStatus, '已上报现场异常：请保持安全距离，等待项目经理指令。')
      return
    }

    this.applyStatus(nextStatus, '')
  },

  handleNoteInput(event) {
    this.setData({ feedbackNote: event.detail.value })
  },

  resetDemo() {
    this.applyStatus('dispatched', '')
    this.setData({
      feedbackNote: '现场已完成分流，排队长度下降，建议继续观察备用通道压力。',
    })
  },

  applyStatus(nextStatus, alertText) {
    this.setData({
      currentStatus: nextStatus,
      statusLabel: statusLabels[nextStatus],
      alertText,
      timeline: buildTimeline(nextStatus),
      buttons: this.data.buttons.map((button) => ({
        ...button,
        primary: button.action === this.getNextPrimaryAction(nextStatus),
      })),
    })
  },

  getNextPrimaryAction(status) {
    if (status === 'dispatched') return 'accepted'
    if (status === 'accepted') return 'arrived'
    if (status === 'arrived') return 'processing'
    if (status === 'processing') return 'completed'
    return ''
  },
})
