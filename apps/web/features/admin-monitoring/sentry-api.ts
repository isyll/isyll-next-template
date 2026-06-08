import 'server-only'

import { env } from '@/env'

/**
 * Read-only Sentry REST API client for the admin monitoring dashboard. Uses an
 * internal auth token + org/project from env; everything degrades gracefully
 * (returns empty / disabled) when those aren't set, so the page renders a
 * "configure Sentry" state instead of erroring. Responses are cached for 60s to
 * avoid hammering the API.
 *
 * Docs: https://docs.sentry.io/api/
 */
const DEFAULT_BASE_URL = 'https://sentry.io'

function baseUrl(): string {
  return (env.SENTRY_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '')
}

export interface MonitoringConfig {
  enabled: boolean
  org?: string
  project?: string
  /** Deep link to the project's issue stream in Sentry. */
  issuesUrl?: string
}

/** Whether the monitoring API is configured (token + org + project all set). */
export function monitoringConfig(): MonitoringConfig {
  const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = env
  if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) {
    return { enabled: false }
  }
  return {
    enabled: true,
    org: SENTRY_ORG,
    project: SENTRY_PROJECT,
    issuesUrl: `${baseUrl()}/organizations/${SENTRY_ORG}/issues/?project=${SENTRY_PROJECT}`,
  }
}

async function sentryFetch<T>(path: string): Promise<T | null> {
  const token = env.SENTRY_AUTH_TOKEN
  if (!token) return null
  try {
    const response = await fetch(`${baseUrl()}/api/0${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export interface SentryIssue {
  id: string
  title: string
  culprit: string | null
  level: string
  events: number
  users: number
  permalink: string
  lastSeen: string
}

interface RawIssue {
  id: string
  title: string
  culprit: string | null
  level: string
  count: string
  userCount: number
  permalink: string
  lastSeen: string
}

/** Most recent unresolved issues for the project (last 24h). */
export async function fetchRecentIssues(limit = 10): Promise<SentryIssue[]> {
  const { org, project } = monitoringConfig()
  if (!org || !project) return []
  const raw = await sentryFetch<RawIssue[]>(
    `/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=24h&limit=${limit}`
  )
  return (raw ?? []).map((issue) => ({
    id: issue.id,
    title: issue.title,
    culprit: issue.culprit,
    level: issue.level,
    events: Number(issue.count) || 0,
    users: issue.userCount,
    permalink: issue.permalink,
    lastSeen: issue.lastSeen,
  }))
}

export interface EventStatPoint {
  /** Unix seconds. */
  ts: number
  count: number
}

/** Hourly received-event counts for the last 24h (for the bar chart). */
export async function fetchEventStats(): Promise<EventStatPoint[]> {
  const { org, project } = monitoringConfig()
  if (!org || !project) return []
  const raw = await sentryFetch<[number, number][]>(
    `/projects/${org}/${project}/stats/?stat=received&resolution=1h`
  )
  return (raw ?? []).map(([ts, count]) => ({ ts, count }))
}
