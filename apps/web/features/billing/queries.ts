import 'server-only'

import { db, schema } from '@workspace/db'
import { and, desc, eq, inArray } from 'drizzle-orm'

const { billingCustomers, subscriptions } = schema

/** Subscription statuses that grant access to paid features. */
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'] as const

export interface SubscriptionDTO {
  id: string
  status: string
  priceId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

type SubscriptionRow = typeof subscriptions.$inferSelect

function toDto(row: SubscriptionRow): SubscriptionDTO {
  return {
    id: row.id,
    status: row.status,
    priceId: row.priceId,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  }
}

/** The user's Stripe customer id, or null if they have none yet. */
export async function getStripeCustomerId(
  userId: string
): Promise<string | null> {
  const [row] = await db
    .select({ stripeCustomerId: billingCustomers.stripeCustomerId })
    .from(billingCustomers)
    .where(eq(billingCustomers.userId, userId))
    .limit(1)
  return row?.stripeCustomerId ?? null
}

/** Reverse lookup used by the webhook handler. */
export async function getUserIdByStripeCustomer(
  stripeCustomerId: string
): Promise<string | null> {
  const [row] = await db
    .select({ userId: billingCustomers.userId })
    .from(billingCustomers)
    .where(eq(billingCustomers.stripeCustomerId, stripeCustomerId))
    .limit(1)
  return row?.userId ?? null
}

/** Link a user to their Stripe customer (idempotent). */
export async function upsertBillingCustomer(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await db
    .insert(billingCustomers)
    .values({ userId, stripeCustomerId })
    .onConflictDoUpdate({
      target: billingCustomers.userId,
      set: { stripeCustomerId },
    })
}

/** The user's current access-granting subscription, if any. */
export async function getActiveSubscription(
  userId: string
): Promise<SubscriptionDTO | null> {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, [...ACTIVE_STATUSES])
      )
    )
    .orderBy(desc(subscriptions.currentPeriodEnd))
    .limit(1)
  return row ? toDto(row) : null
}

export interface UpsertSubscriptionInput {
  id: string
  userId: string
  stripeCustomerId: string
  status: string
  priceId: string | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

/** Insert or update a subscription mirror row from a webhook event. */
export async function upsertSubscription(
  input: UpsertSubscriptionInput
): Promise<void> {
  await db
    .insert(subscriptions)
    .values(input)
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: {
        status: input.status,
        priceId: input.priceId,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      },
    })
}
