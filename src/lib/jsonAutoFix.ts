import { parse, parseTree, printParseErrorCode } from 'jsonc-parser'
import type { ParseError, ParseErrorCode } from 'jsonc-parser'

export interface StrictParseError {
  message: string
  line: number
  column: number
}

export type StrictParseResult =
  | { ok: true; value: unknown }
  | { ok: false; errors: StrictParseError[] }

function toLineColumn(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset)
  const lines = before.split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}

function preprocessJson(text: string): string {
  // Replace single quotes with double quotes
  let result = text.replace(/'/g, '"')

  // Add quotes around unquoted keys
  // Matches: (start or after { or ,) + optional whitespace + unquoted key + optional whitespace + colon
  result = result.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')

  return result
}

export function parseJsonStrict(text: string): StrictParseResult {
  const errors: ParseError[] = []
  const value = parse(text, errors, { allowTrailingComma: false })

  if (errors.length === 0) {
    return { ok: true, value }
  }

  return {
    ok: false,
    errors: errors.map((e) => ({
      message: printParseErrorCode(e.error as ParseErrorCode),
      ...toLineColumn(text, e.offset),
    })),
  }
}

export type AutoFixResult = { fixed: string; changed: boolean } | { fixed: null; changed: false }

function tryParse(text: string): { value: unknown } | null {
  const errors: ParseError[] = []
  const tree = parseTree(text, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  })

  if (!tree || errors.length > 0) {
    return null
  }

  const parseErrors: ParseError[] = []
  const value = parse(text, parseErrors, {
    allowTrailingComma: true,
    disallowComments: false,
  })

  if (parseErrors.length > 0) {
    return null
  }

  return { value }
}

export function autoFixJson(text: string): AutoFixResult {
  // First, try parsing the raw input untouched. jsonc-parser already
  // tolerates valid JSON plus JSONC comments/trailing commas, so any
  // already-valid input (including strings containing apostrophes or
  // colons) is parsed directly and never touched by the regex-based
  // preprocessing below, which is not string-boundary-aware and can
  // corrupt valid JSON (e.g. "It's broken" or "Name, Age: unknown").
  const rawResult = tryParse(text)
  if (rawResult) {
    const fixed = JSON.stringify(rawResult.value, null, 2)
    const changed = fixed !== text
    return { fixed, changed }
  }

  // Raw parse failed: fall back to preprocessing for genuinely malformed
  // input (single-quoted JSON5, unquoted keys) and retry.
  const preprocessed = preprocessJson(text)
  const preprocessedResult = tryParse(preprocessed)
  if (!preprocessedResult) {
    return { fixed: null, changed: false }
  }

  const fixed = JSON.stringify(preprocessedResult.value, null, 2)
  return { fixed, changed: true }
}
