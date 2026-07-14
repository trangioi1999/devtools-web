export function escapeJsonString(text: string): string {
  return JSON.stringify(text)
}

export function unescapeJsonString(text: string): { ok: true; result: string } | { ok: false; error: string } {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return { ok: false, error: `Not valid JSON: ${(err as Error).message}` }
  }

  if (typeof parsed !== 'string') {
    return { ok: false, error: 'Parsed JSON is not a string — nothing to unescape.' }
  }

  return { ok: true, result: parsed }
}
