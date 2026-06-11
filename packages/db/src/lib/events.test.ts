import { describe, expect, it } from 'vitest'

import { buildOutboxEvent, type DomainEvent } from './events'

describe('buildOutboxEvent', () => {
  it('maps a user event to the user aggregate', () => {
    const event: DomainEvent = {
      type: 'user.registered',
      userId: 'user-1',
      email: 'a@example.test',
      name: 'A',
    }
    expect(buildOutboxEvent(event)).toMatchObject({
      eventType: 'user.registered',
      aggregateId: 'user-1',
      aggregateType: 'user',
      payload: event,
    })
  })

  it('maps a feature-flag event to the feature_flag aggregate keyed by flag key', () => {
    const event: DomainEvent = {
      type: 'feature_flag.changed',
      key: 'billing.enabled',
      enabled: true,
      change: 'updated',
      actorId: 'operator-9',
    }
    expect(buildOutboxEvent(event)).toMatchObject({
      eventType: 'feature_flag.changed',
      aggregateId: 'billing.enabled',
      aggregateType: 'feature_flag',
    })
  })

  it('maps a billing webhook to the billing aggregate keyed by Stripe event id', () => {
    const event: DomainEvent = {
      type: 'billing.webhook',
      stripeEventId: 'evt_123',
      stripeEventType: 'customer.subscription.updated',
      object: { id: 'sub_1' },
    }
    expect(buildOutboxEvent(event)).toMatchObject({
      eventType: 'billing.webhook',
      aggregateId: 'evt_123',
      aggregateType: 'billing',
    })
  })
})
