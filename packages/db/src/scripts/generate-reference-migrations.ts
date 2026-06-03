import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import ct from 'countries-and-timezones'
import cc from 'currency-codes'
import worldCountries from 'world-countries'

const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', 'migrations')

function sql(value: string | null): string {
  return value === null ? 'NULL' : `'${value.replace(/'/g, "''")}'`
}

function valuesBlock(rows: string[][]): string {
  return rows.map((row) => `  (${row.join(', ')})`).join(',\n')
}

function immutability(table: string): string {
  return `CREATE TRIGGER ${table}_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON ${table}
  FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT ON ${table} TO app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT ON ${table} TO admin_service;
  END IF;
END;
$$;
`
}

function write(version: string, name: string, up: string, down: string): void {
  const base = join(MIGRATIONS_DIR, `${version}_${name}`)
  writeFileSync(`${base}.up.sql`, `${up.trimEnd()}\n`)
  writeFileSync(`${base}.down.sql`, `${down.trimEnd()}\n`)
}

function callingCode(idd: { root: string; suffixes: string[] }): string | null {
  if (idd.root.length === 0) return null
  return idd.suffixes.length === 1 ? `${idd.root}${idd.suffixes[0]}` : idd.root
}

// --- currencies (ISO 4217) ---
const currencyRecords = cc
  .codes()
  .map((code) => cc.code(code))
  .filter((record): record is NonNullable<typeof record> =>
    Boolean(record?.number)
  )
  .sort((a, b) => a.code.localeCompare(b.code))

const currencyCodes = new Set(currencyRecords.map((record) => record.code))

const currencyRows = currencyRecords.map((record) => [
  sql(record.code),
  sql(record.number),
  sql(record.currency),
  String(record.digits),
])

write(
  '000003',
  'create_currencies',
  `CREATE TABLE currencies (
  code         char(3) PRIMARY KEY,
  numeric_code char(3) NOT NULL,
  name         text NOT NULL,
  minor_units  smallint NOT NULL CHECK (minor_units >= 0)
);

INSERT INTO currencies (code, numeric_code, name, minor_units) VALUES
${valuesBlock(currencyRows)};

${immutability('currencies')}`,
  `DROP TABLE IF EXISTS currencies;`
)

// --- countries (ISO 3166) ---
const countryRows = [...worldCountries]
  .sort((a, b) => a.cca2.localeCompare(b.cca2))
  .map((country) => {
    const currency = Object.keys(country.currencies)[0]
    const currencyCode =
      currency && currencyCodes.has(currency) ? currency : null
    return [
      sql(country.cca2),
      sql(country.cca3),
      sql(country.ccn3),
      sql(country.name.common),
      sql(country.name.official),
      sql(country.region.length > 0 ? country.region : null),
      sql(country.subregion.length > 0 ? country.subregion : null),
      sql(country.capital[0] ?? null),
      sql(callingCode(country.idd)),
      sql(country.flag.length > 0 ? country.flag : null),
      sql(country.tld[0] ?? null),
      sql(currencyCode),
    ]
  })

write(
  '000004',
  'create_countries',
  `CREATE TABLE countries (
  iso2          char(2) PRIMARY KEY,
  iso3          char(3) NOT NULL UNIQUE,
  numeric_code  char(3) NOT NULL,
  name          text NOT NULL,
  official_name text NOT NULL,
  region        text,
  subregion     text,
  capital       text,
  calling_code  text,
  flag_emoji    text,
  tld           text,
  currency_code char(3) REFERENCES currencies (code)
);

CREATE INDEX countries_region_idx ON countries (region);
CREATE INDEX countries_currency_code_idx ON countries (currency_code);
CREATE INDEX countries_name_trgm_idx ON countries USING gin (name gin_trgm_ops);

INSERT INTO countries (iso2, iso3, numeric_code, name, official_name, region, subregion, capital, calling_code, flag_emoji, tld, currency_code) VALUES
${valuesBlock(countryRows)};

${immutability('countries')}`,
  `DROP TABLE IF EXISTS countries;`
)

// --- timezones (canonical IANA zones, linked to their primary country) ---
const timezoneRows = Object.values(ct.getAllTimezones({ deprecated: false }))
  .filter((timezone) => !timezone.aliasOf)
  .sort((a, b) => a.name.localeCompare(b.name))
  .flatMap((timezone) => {
    const country = timezone.countries[0]
    if (!country) return []
    return [
      [
        sql(timezone.name),
        sql(country),
        String(timezone.utcOffset),
        String(timezone.dstOffset),
      ],
    ]
  })

write(
  '000005',
  'create_timezones',
  `CREATE TABLE timezones (
  name               text PRIMARY KEY,
  country_code       char(2) NOT NULL REFERENCES countries (iso2),
  utc_offset_minutes integer NOT NULL,
  dst_offset_minutes integer NOT NULL
);

CREATE INDEX timezones_country_code_idx ON timezones (country_code);

INSERT INTO timezones (name, country_code, utc_offset_minutes, dst_offset_minutes) VALUES
${valuesBlock(timezoneRows)};

${immutability('timezones')}`,
  `DROP TABLE IF EXISTS timezones;`
)

console.info(
  `Generated reference migrations: ${currencyRows.length} currencies, ${countryRows.length} countries, ${timezoneRows.length} timezones.`
)
