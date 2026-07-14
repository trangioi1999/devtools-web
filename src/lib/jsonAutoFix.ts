import { parse, parseTree, ParseError, ParseErrorCode, printParseErrorCode } from 'jsonc-parser'

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

export function autoFixJson(text: string): AutoFixResult {
  // Preprocess to handle single quotes and unquoted keys
  const preprocessed = preprocessJson(text)

  const errors: ParseError[] = []
  const tree = parseTree(preprocessed, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  })

  if (!tree) {
    return { fixed: null, changed: false }
  }

  const parseErrors: ParseError[] = []
  const value = parse(preprocessed, parseErrors, {
    allowTrailingComma: true,
    disallowComments: false,
  })

  if (parseErrors.length > 0) {
    return { fixed: null, changed: false }
  }

  const fixed = JSON.stringify(value, null, 2)
  const changed = fixed !== text

  return { fixed, changed }
}
