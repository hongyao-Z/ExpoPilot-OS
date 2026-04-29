import type { NotificationGateway, NotificationReceipt, ReminderChannel } from '../domain/types'

function now() {
  return new Date().toISOString()
}

function nextReceiptId(channel: ReminderChannel) {
  return `receipt-${channel}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function receiptForChannel(taskId: string, channel: ReminderChannel, retryCount: number): NotificationReceipt {
  const sentAt = now()

  if (channel === 'wearable') {
    return {
      receipt_id: nextReceiptId(channel),
      task_id: taskId,
      channel,
      provider_name: 'wearable-reserved',
      status: 'failed_fallback',
      detail: '可穿戴接口未接入，当前保留为回退边界。',
      sent_at: sentAt,
      updated_at: sentAt,
      retry_count: retryCount,
      fallback_channel: 'mobile',
    }
  }

  return {
    receipt_id: nextReceiptId(channel),
    task_id: taskId,
    channel,
    provider_name: channel === 'mobile' ? 'mobile-push-sandbox' : 'web-runtime-banner',
    status: retryCount > 0 ? 'retrying' : channel === 'mobile' ? 'delivered' : 'sent',
    detail:
      retryCount > 0
        ? `第 ${retryCount} 次重试已经发出，等待一线回执。`
        : channel === 'mobile'
          ? '移动端提醒已送达，等待工作人员接收。'
          : '后台提醒已写入运行台，等待查看。',
    sent_at: sentAt,
    updated_at: sentAt,
    retry_count: retryCount,
  }
}

export const localNotificationGateway: NotificationGateway = {
  descriptor: {
    provider: 'local-notify-mock',
    delivery_mode: 'receipt-simulator',
  },
  createReceipts(taskId, channels, retryCount = 0) {
    return channels.map((channel) => receiptForChannel(taskId, channel, retryCount))
  },
  syncReceipts(receipts, status) {
    const updatedAt = now()
    return receipts.map((receipt) => {
      if (receipt.status === 'failed_fallback') {
        return receipt
      }

      if (status === 'received') {
        return {
          ...receipt,
          status: 'accepted',
          detail: '工作人员已接收任务。',
          updated_at: updatedAt,
        }
      }

      if (status === 'processing') {
        return {
          ...receipt,
          status: 'read',
          detail: '工作人员已开始处理任务。',
          updated_at: updatedAt,
        }
      }

      if (status === 'completed') {
        return {
          ...receipt,
          status: 'read',
          detail: '工作人员已完成任务，回执已同步到后台。',
          updated_at: updatedAt,
        }
      }

      if (status === 'exception') {
        return {
          ...receipt,
          status: 'read',
          detail: '一线已回传异常状态，后台需要继续处理。',
          updated_at: updatedAt,
        }
      }

      return receipt
    })
  },
}
