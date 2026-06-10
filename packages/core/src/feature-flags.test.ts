import { describe, expect, it } from 'vitest'

import {
  bucketFor,
  CONDITION_OPERATORS,
  evaluateFlag,
  type FlagDefinition,
  flagDefinitionSchema,
  isFlagValueOfType,
  matchesCondition,
  type TargetingCondition,
} from './feature-flags'

// Helpers

function condition(
  attribute: string,
  operator: TargetingCondition['operator'],
  values: (string | number | boolean)[] = []
): TargetingCondition {
  return { attribute, operator, values }
}

const boolFlag = (overrides: Partial<FlagDefinition> = {}): FlagDefinition => ({
  key: 'demo',
  type: 'boolean',
  enabled: true,
  variants: { on: true, off: false },
  defaultVariant: 'off',
  offVariant: 'off',
  rules: [],
  ...overrides,
})

describe('bucketFor', () => {
  it('is deterministic for the same seed', () => {
    expect(bucketFor('user-1')).toBe(bucketFor('user-1'))
  })

  it('stays within [0, 100)', () => {
    for (let i = 0; i < 500; i++) {
      const bucket = bucketFor(`subject-${i}`)
      expect(bucket).toBeGreaterThanOrEqual(0)
      expect(bucket).toBeLessThan(100)
    }
  })

  it('spreads different seeds across the range', () => {
    const low = bucketFor('aaa')
    const high = bucketFor('zzz')
    expect(low).not.toBe(high)
  })

  it('handles the empty seed without throwing', () => {
    expect(bucketFor('')).toBeGreaterThanOrEqual(0)
  })
})

describe('isFlagValueOfType', () => {
  it('matches booleans', () => {
    expect(isFlagValueOfType(true, 'boolean')).toBe(true)
    expect(isFlagValueOfType('true', 'boolean')).toBe(false)
  })

  it('matches strings', () => {
    expect(isFlagValueOfType('x', 'string')).toBe(true)
    expect(isFlagValueOfType(1, 'string')).toBe(false)
  })

  it('matches finite numbers only', () => {
    expect(isFlagValueOfType(3.14, 'number')).toBe(true)
    expect(isFlagValueOfType(Number.NaN, 'number')).toBe(false)
    expect(isFlagValueOfType(Number.POSITIVE_INFINITY, 'number')).toBe(false)
    expect(isFlagValueOfType('1', 'number')).toBe(false)
  })

  it('accepts any defined value as json', () => {
    expect(isFlagValueOfType({ a: 1 }, 'json')).toBe(true)
    expect(isFlagValueOfType(null, 'json')).toBe(true)
    expect(isFlagValueOfType(undefined, 'json')).toBe(false)
  })
})

describe('matchesCondition', () => {
  const context = {
    targetingKey: 'user-42',
    attributes: {
      plan: 'pro',
      seats: 12,
      beta: true,
      roles: ['admin', 'editor'],
      country: 'FR',
    },
  }

  it('covers every declared operator', () => {
    // Guards against an operator being added without a matching switch arm.
    expect(CONDITION_OPERATORS).toHaveLength(13)
    for (const operator of CONDITION_OPERATORS) {
      expect(() =>
        matchesCondition(condition('plan', operator, ['pro']), context)
      ).not.toThrow()
    }
  })

  it('in / notIn against scalars and arrays', () => {
    expect(
      matchesCondition(condition('plan', 'in', ['pro', 'team']), context)
    ).toBe(true)
    expect(matchesCondition(condition('plan', 'in', ['free']), context)).toBe(
      false
    )
    expect(
      matchesCondition(condition('roles', 'in', ['editor']), context)
    ).toBe(true)
    expect(
      matchesCondition(condition('plan', 'notIn', ['free']), context)
    ).toBe(true)
    // notIn is true when the attribute is absent.
    expect(
      matchesCondition(condition('missing', 'notIn', ['x']), context)
    ).toBe(true)
  })

  it('equals / notEquals with representation drift', () => {
    expect(matchesCondition(condition('seats', 'equals', [12]), context)).toBe(
      true
    )
    expect(
      matchesCondition(condition('seats', 'equals', ['12']), context)
    ).toBe(true)
    expect(
      matchesCondition(condition('seats', 'notEquals', [13]), context)
    ).toBe(true)
    expect(matchesCondition(condition('plan', 'equals', []), context)).toBe(
      false
    )
    expect(
      matchesCondition(condition('missing', 'notEquals', ['x']), context)
    ).toBe(true)
  })

  it('string contains / startsWith / endsWith', () => {
    expect(
      matchesCondition(condition('country', 'contains', ['R']), context)
    ).toBe(true)
    expect(
      matchesCondition(condition('plan', 'startsWith', ['pr']), context)
    ).toBe(true)
    expect(
      matchesCondition(condition('plan', 'endsWith', ['o']), context)
    ).toBe(true)
    expect(
      matchesCondition(condition('plan', 'startsWith', ['x']), context)
    ).toBe(false)
  })

  it('numeric comparisons coerce strings and reject non-numbers', () => {
    expect(
      matchesCondition(condition('seats', 'greaterThan', [10]), context)
    ).toBe(true)
    expect(
      matchesCondition(condition('seats', 'greaterThanOrEqual', [12]), context)
    ).toBe(true)
    expect(
      matchesCondition(condition('seats', 'lessThan', [20]), context)
    ).toBe(true)
    expect(
      matchesCondition(condition('seats', 'lessThanOrEqual', [12]), context)
    ).toBe(true)
    expect(
      matchesCondition(condition('seats', 'greaterThan', [99]), context)
    ).toBe(false)
    // Non-numeric attribute → false.
    expect(
      matchesCondition(condition('plan', 'greaterThan', [1]), context)
    ).toBe(false)
    // Missing operand → false.
    expect(
      matchesCondition(condition('seats', 'greaterThan', []), context)
    ).toBe(false)
  })

  it('exists / notExists treat null and absent as absent', () => {
    expect(matchesCondition(condition('plan', 'exists'), context)).toBe(true)
    expect(matchesCondition(condition('missing', 'exists'), context)).toBe(
      false
    )
    expect(matchesCondition(condition('missing', 'notExists'), context)).toBe(
      true
    )
    expect(
      matchesCondition(condition('n', 'exists'), { attributes: { n: null } })
    ).toBe(false)
  })

  it('matches the special targetingKey attribute', () => {
    expect(
      matchesCondition(
        condition('targetingKey', 'equals', ['user-42']),
        context
      )
    ).toBe(true)
  })
})

describe('evaluateFlag', () => {
  it('serves the off variant when disabled (kill switch)', () => {
    const result = evaluateFlag(boolFlag({ enabled: false }))
    expect(result).toMatchObject({
      value: false,
      reason: 'DISABLED',
      variant: 'off',
    })
  })

  it('serves the default variant when enabled and no rule matches', () => {
    const result = evaluateFlag(boolFlag({ defaultVariant: 'off' }))
    expect(result).toMatchObject({
      value: false,
      reason: 'DEFAULT',
      variant: 'off',
    })
  })

  it('serves a pinned variant on a targeting match (first rule wins)', () => {
    const flag = boolFlag({
      rules: [
        {
          conditions: [condition('plan', 'equals', ['free'])],
          outcome: { kind: 'variant', variant: 'off' },
        },
        {
          conditions: [condition('plan', 'equals', ['pro'])],
          outcome: { kind: 'variant', variant: 'on' },
        },
      ],
    })
    const result = evaluateFlag(flag, { attributes: { plan: 'pro' } })
    expect(result).toMatchObject({
      value: true,
      reason: 'TARGETING_MATCH',
      variant: 'on',
      ruleIndex: 1,
    })
  })

  it('treats an empty condition list as a global rule', () => {
    const flag = boolFlag({
      rules: [{ conditions: [], outcome: { kind: 'variant', variant: 'on' } }],
    })
    expect(evaluateFlag(flag, {}).value).toBe(true)
  })

  it('splits a percentage rollout deterministically and stably', () => {
    const flag = boolFlag({
      rules: [
        {
          conditions: [],
          outcome: { kind: 'rollout', weights: { on: 50, off: 50 } },
        },
      ],
    })
    let on = 0
    for (let i = 0; i < 2000; i++) {
      const key = `subject-${i}`
      const first = evaluateFlag(flag, { targetingKey: key })
      const second = evaluateFlag(flag, { targetingKey: key })
      expect(first.value).toBe(second.value) // sticky
      expect(first.reason).toBe('SPLIT')
      if (first.value === true) on++
    }
    // Roughly balanced — generous bounds to avoid flakiness.
    expect(on).toBeGreaterThan(700)
    expect(on).toBeLessThan(1300)
  })

  it('buckets by a custom attribute when bucketBy is set', () => {
    const flag = boolFlag({
      rules: [
        {
          conditions: [],
          outcome: {
            kind: 'rollout',
            bucketBy: 'orgId',
            weights: { on: 100, off: 0 },
          },
        },
      ],
    })
    const result = evaluateFlag(flag, {
      targetingKey: 'user-x',
      attributes: { orgId: 'org-1' },
    })
    expect(result.value).toBe(true)
    expect(result.reason).toBe('SPLIT')
  })

  it('reports ERROR for a rollout with no positive weights', () => {
    const flag = boolFlag({
      rules: [
        {
          conditions: [],
          outcome: { kind: 'rollout', weights: { on: 0, off: 0 } },
        },
      ],
    })
    const result = evaluateFlag(flag, { targetingKey: 'u' })
    expect(result.reason).toBe('ERROR')
    expect(result.errorCode).toBe('PARSE_ERROR')
    expect(result.value).toBeUndefined()
  })

  it('reports ERROR when a referenced variant is undefined', () => {
    const flag = boolFlag({ defaultVariant: 'ghost' })
    const result = evaluateFlag(flag)
    expect(result.reason).toBe('ERROR')
    expect(result.value).toBeUndefined()
    expect(result.errorMessage).toContain('ghost')
  })

  it('supports multivariate non-boolean flags', () => {
    const flag: FlagDefinition = {
      key: 'theme',
      type: 'string',
      enabled: true,
      variants: { blue: 'blue', green: 'green', control: 'gray' },
      defaultVariant: 'control',
      offVariant: 'control',
      rules: [
        {
          conditions: [condition('country', 'in', ['FR'])],
          outcome: { kind: 'variant', variant: 'blue' },
        },
      ],
    }
    expect(evaluateFlag(flag, { attributes: { country: 'FR' } }).value).toBe(
      'blue'
    )
    expect(evaluateFlag(flag, { attributes: { country: 'US' } }).value).toBe(
      'gray'
    )
  })
})

describe('flagDefinitionSchema', () => {
  it('parses a well-formed definition', () => {
    expect(flagDefinitionSchema.safeParse(boolFlag()).success).toBe(true)
  })

  it('rejects an unknown value type', () => {
    expect(
      flagDefinitionSchema.safeParse(boolFlag({ type: 'date' as never }))
        .success
    ).toBe(false)
  })

  it('rejects a rollout weight below zero', () => {
    const bad = boolFlag({
      rules: [
        { conditions: [], outcome: { kind: 'rollout', weights: { on: -1 } } },
      ],
    })
    expect(flagDefinitionSchema.safeParse(bad).success).toBe(false)
  })
})
