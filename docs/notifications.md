# Notifications

In-app notifications for end users: a `app.notifications` table + DAL, a bell
with a **live unread badge**, an inbox with mark-read / delete, and **per-channel
preferences**. Realtime updates use **Server-Sent Events** backed by Redis
pub/sub, with a polling fallback when Redis is absent.

## Pieces

| Piece               | Location                                                             |
| ------------------- | -------------------------------------------------------------------- |
| DAL                 | `apps/web/features/notifications/queries.ts`                         |
| Delivery (gated)    | `apps/web/features/notifications/service.ts` (`deliverNotification`) |
| Channels + helpers  | `apps/web/features/notifications/channels.ts` (client-safe, pure)    |
| Preferences DAL     | `apps/web/features/notifications/preferences.ts`                     |
| Realtime pub/sub    | `apps/web/lib/notifications-stream.ts`                               |
| SSE endpoint        | `apps/web/app/api/notifications/stream/route.ts`                     |
| Bell                | `apps/web/components/notification-bell.tsx`                          |
| Inbox + preferences | `apps/web/app/dashboard/notifications/`                              |

## Sending a notification

From server code (event handlers, jobs), prefer `deliverNotification` over the
raw DAL insert — it respects the user's channel preference and pushes a realtime
signal:

```ts
import { deliverNotification } from '@/features/notifications/service'

await deliverNotification({
  userId,
  type: 'order.shipped',
  title: 'Your order shipped',
  body: 'Track it from your dashboard.',
  data: { orderId },
})
// → inserts only if the user's `in_app` channel is enabled, then publishes a
//   change so open inboxes/bells update live.
```

## Realtime

`publishNotificationChange(userId)` publishes on a per-user Redis channel; the
SSE route subscribes (on a dedicated connection) and streams an `unread` event
with the new count. The bell opens one `EventSource` and updates its badge. With
no `REDIS_URL`, the SSE route polls the unread count instead (the web app and the
outbox worker are separate processes, so pub/sub is what bridges them in prod).

## Preferences

`app.notification_preferences` stores one row per `(user, channel)`; a missing
row means **enabled**. Channels are defined in `channels.ts`
(`in_app`, `email`). `isChannelEnabled(userId, channel)` is the gate senders
consult — `deliverNotification` uses it for `in_app`, and email senders should
check `'email'` before sending. The inbox page exposes per-channel toggles.
