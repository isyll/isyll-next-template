import { userAuth } from '@workspace/auth'
import { headers } from 'next/headers'

import { getUnreadNotificationCount } from '@/features/notifications/queries'
import { subscribeNotificationChanges } from '@/lib/notifications-stream'

/**
 * Server-Sent Events stream of the current user's unread notification count.
 * Pushes an `unread` event on connect and whenever the count changes — driven
 * by Redis pub/sub when available, else by polling. Used by the notification
 * bell to keep its badge live.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POLL_INTERVAL_MS = 15_000
const KEEPALIVE_MS = 25_000

export async function GET(request: Request): Promise<Response> {
  const session = await userAuth.api.getSession({ headers: await headers() })
  if (!session) return new Response('Unauthorized', { status: 401 })

  const userId = session.user.id
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      let lastCount = -1
      // Read through a function so control-flow analysis doesn't assume `closed`
      // stays false across the `await` (it can flip via `cleanup`).
      const open = (): boolean => !closed

      const send = async (): Promise<void> => {
        if (!open()) return
        const count = await getUnreadNotificationCount(userId)
        if (!open() || count === lastCount) return
        lastCount = count
        controller.enqueue(
          encoder.encode(`event: unread\ndata: ${String(count)}\n\n`)
        )
      }

      const unsubscribe = subscribeNotificationChanges(userId, () => {
        void send()
      })
      const poll = unsubscribe
        ? null
        : setInterval(() => {
            void send()
          }, POLL_INTERVAL_MS)
      const keepalive = setInterval(() => {
        if (open()) controller.enqueue(encoder.encode(': keepalive\n\n'))
      }, KEEPALIVE_MS)

      const cleanup = (): void => {
        if (closed) return
        closed = true
        clearInterval(keepalive)
        if (poll) clearInterval(poll)
        unsubscribe?.()
        try {
          controller.close()
        } catch {
          // Stream already closed by the client — nothing to do.
        }
      }

      request.signal.addEventListener('abort', cleanup)
      void send()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
