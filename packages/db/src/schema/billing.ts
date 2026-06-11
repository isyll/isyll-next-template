import {
  boolean,
  index,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { timestamps } from './_helpers'
import { appSchema, users } from './auth'

/**
 * Maps an end user to their Stripe customer (one per user). Stripe is the source
 * of truth for billing; this is the local join. Drizzle mirror of the pure-SQL
 * migration.
 */
export const billingCustomers = appSchema.table(
  'billing_customers',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('billing_customers_stripe_id_unique').on(
      table.stripeCustomerId
    ),
  ]
)

/**
 * Local mirror of Stripe subscriptions, kept in sync by webhook events routed
 * through the outbox. PK is the Stripe subscription id; `status` is free text
 * (Stripe's status set evolves).
 */
export const subscriptions = appSchema.table(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    status: text('status').notNull(),
    priceId: text('price_id'),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('subscriptions_user_idx').on(table.userId)]
)

export type BillingCustomerRow = typeof billingCustomers.$inferSelect
export type SubscriptionRow = typeof subscriptions.$inferSelect
export type NewSubscriptionRow = typeof subscriptions.$inferInsert
