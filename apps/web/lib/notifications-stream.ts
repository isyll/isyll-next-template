import 'server-only'

import { getRedis } from '@/lib/redis'

/**
 * Realtime fan-out for the notification inbox over Redis pub/sub. A change
 * (new notification, read, delete) publishes a lightweight signal on a
 * per-user channel; SSE connections subscribe and re-read the unread count.
 *
 * Degrades safely: without `REDIS_URL`, publishing is a no-op and subscribers
 * fall back to periodic polling (the relay/web run as separate processes, so
 * pub/sub is what bridges them in production).
 */
function channel(userId: string): string {
  return `notifications:${userId}`
}

/** Signal that a user's notifications changed. No-op without Redis. */
export async function publishNotificationChange(userId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  await redis.publish(channel(userId), '1')
}

/**
 * Subscribe to a user's notification changes on a dedicated connection (ioredis
 * requires a separate client for subscriptions). Returns an unsubscribe function,
 * or `null` when Redis is unconfigured (caller should poll instead).
 */
export function subscribeNotificationChanges(
  userId: string,
  onChange: () => void
): (() => void) | null {
  const redis = getRedis()
  if (!redis) return null

  const subscriber = redis.duplicate()
  void subscriber.subscribe(channel(userId))
  subscriber.on('message', () => {
    onChange()
  })

  return () => {
    void subscriber.unsubscribe()
    void subscriber.quit()
  }
}
