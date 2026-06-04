import {
  boolean,
  char,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
} from 'drizzle-orm/pg-core'

import { softDelete, timestamps } from './_helpers'

/**
 * Reference tables (`currencies`, `countries`, `timezones`) hold standards data
 * (ISO 4217 / 3166, IANA). Their rows are seeded inside the migrations and made
 * immutable at the database level, so they are read-only here.
 */
export const currencies = pgTable('currencies', {
  code: char('code', { length: 3 }).primaryKey(),
  numericCode: char('numeric_code', { length: 3 }).notNull(),
  name: text('name').notNull(),
  minorUnits: smallint('minor_units').notNull(),
})

export const countries = pgTable(
  'countries',
  {
    iso2: char('iso2', { length: 2 }).primaryKey(),
    iso3: char('iso3', { length: 3 }).notNull().unique(),
    numericCode: char('numeric_code', { length: 3 }).notNull(),
    name: text('name').notNull(),
    officialName: text('official_name').notNull(),
    region: text('region'),
    subregion: text('subregion'),
    capital: text('capital'),
    callingCode: text('calling_code'),
    flagEmoji: text('flag_emoji'),
    tld: text('tld'),
    currencyCode: char('currency_code', { length: 3 }).references(
      () => currencies.code
    ),
  },
  (table) => [
    index('countries_region_idx').on(table.region),
    index('countries_currency_code_idx').on(table.currencyCode),
  ]
)

export const timezones = pgTable(
  'timezones',
  {
    name: text('name').primaryKey(),
    countryCode: char('country_code', { length: 2 })
      .notNull()
      .references(() => countries.iso2),
    utcOffsetMinutes: integer('utc_offset_minutes').notNull(),
    dstOffsetMinutes: integer('dst_offset_minutes').notNull(),
  },
  (table) => [index('timezones_country_code_idx').on(table.countryCode)]
)

/**
 * Opt-in availability per country. Empty by default → the app is available
 * everywhere; populate it (with optional `launch_date`) to restrict access.
 * Unlike the reference tables above, this one is mutable.
 */
export const supportedCountries = pgTable('supported_countries', {
  countryCode: char('country_code', { length: 2 })
    .primaryKey()
    .references(() => countries.iso2, { onDelete: 'cascade' }),
  launchDate: date('launch_date'),
  isActive: boolean('is_active').notNull().default(true),
  ...softDelete,
  ...timestamps,
})
