const STORAGE_KEY = 'devtools:json-viewer:content'
const DEFAULT_CONTENT = '{\n  "hello": "world"\n}'

export function loadJsonViewerContent(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CONTENT
}

export function saveJsonViewerContent(text: string): void {
  localStorage.setItem(STORAGE_KEY, text)
}
