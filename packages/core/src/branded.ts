/**
 * Branded (nominal) types. Use these to make structurally-identical primitives
 * (an order id vs a user id, both `string`) incompatible at the type level.
 *
 * @example
 *   type UserId = Brand<string, 'UserId'>
 *   const id = 'abc' as UserId // explicit at the boundary, safe everywhere else
 */

declare const __brand: unique symbol

export type Brand<T, B extends string> = T & { readonly [__brand]: B }

export type Branded<T, B extends string> = Brand<T, B>

/** Strip the brand back to its underlying primitive. */
export function unbrand<T, B extends string>(value: Brand<T, B>): T {
  return value
}
