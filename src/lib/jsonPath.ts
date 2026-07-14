export type PathSegment = string | number

export function buildJsonPath(segments: PathSegment[]): string {
  if (segments.length === 0) return '$'

  return segments.reduce<string>((acc, seg, i) => {
    if (typeof seg === 'number') return `${acc}[${seg}]`
    return i === 0 ? seg : `${acc}.${seg}`
  }, '')
}
