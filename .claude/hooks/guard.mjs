#!/usr/bin/env node
/**
 * PreToolUse guard for Edit/Write/MultiEdit. Pre-blocks the highest-confidence
 * AGENTS.md violations *before* they land, so an agent gets immediate feedback
 * instead of discovering them at lint/CI time. Mirrors (does not replace) the
 * ESLint rules and dependency-cruiser boundaries.
 *
 * Contract: read the hook JSON on stdin; exit 0 to allow, exit 2 to block
 * (stderr is shown back to the agent). Fail OPEN — any parsing/internal error
 * exits 0 so the guard can never wedge legitimate work.
 */
let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  raw += chunk
})
process.stdin.on('end', () => {
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    process.exit(0)
  }

  const input = payload?.tool_input ?? {}
  const file = typeof input.file_path === 'string' ? input.file_path : ''
  if (!file) process.exit(0)

  // Collect the text being introduced (Write.content, Edit.new_string,
  // MultiEdit.edits[].new_string).
  let added = ''
  if (typeof input.content === 'string') added += `${input.content}\n`
  if (typeof input.new_string === 'string') added += `${input.new_string}\n`
  if (Array.isArray(input.edits)) {
    for (const edit of input.edits) {
      if (edit && typeof edit.new_string === 'string') {
        added += `${edit.new_string}\n`
      }
    }
  }
  if (!added.trim()) process.exit(0)

  const violations = []
  const inWebApp = file.includes('/apps/web/')
  const isEnvModule = /(^|\/)env\.ts$/.test(file)
  const isConfigFile = /\.config\.[cm]?[tj]s$/.test(file)
  const isDataAccess =
    /(^|\/)(queries|dal)\.ts$/.test(file) || /\.(queries|dal)\.ts$/.test(file)

  if (
    inWebApp &&
    !isEnvModule &&
    !isConfigFile &&
    /\bprocess\.env\b/.test(added)
  ) {
    violations.push(
      'apps/web must read configuration via the validated `@/env`, never `process.env` directly (AGENTS.md rule #4).'
    )
  }

  if (isDataAccess && /['"]use client['"]/.test(added)) {
    violations.push(
      'Data-access files (queries/dal) are server-only — never add `"use client"` to them (AGENTS.md rule #1).'
    )
  }

  if (violations.length > 0) {
    process.stderr.write(
      `Repo guard blocked this edit:\n- ${violations.join('\n- ')}\nAdjust and retry.\n`
    )
    process.exit(2)
  }

  process.exit(0)
})
