type NotificationScheduleResponse = {
  id: string
  status: 'pending'
}

export async function saveNotificationSchedule(input: {
  pushSubscriptionId: string
  tripId: string
  departureAt: Date
  notifyAt: Date
}): Promise<NotificationScheduleResponse> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
  const response = await fetch(`${baseUrl}/api/notification-schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pushSubscriptionId: input.pushSubscriptionId,
      tripId: input.tripId,
      departureAt: input.departureAt.toISOString(),
      notifyAt: input.notifyAt.toISOString(),
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? '通知予定を保存できませんでした。')
  }

  return response.json() as Promise<NotificationScheduleResponse>
}
