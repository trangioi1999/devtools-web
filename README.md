# DevTools Web

Internal developer tools: a JSON Viewer and an API Client, deployed statically to GitHub Pages. No backend — all state (environments, tokens, editor content) is kept in your browser's `localStorage`.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview   # serve the production build locally
```

## Tests

```bash
npm run test
```

## Configuring the repo name

This app is served from a GitHub Pages subpath (`https://<org>.github.io/<repo-name>/`). If you fork or rename the repo, update `base` in `vite.config.ts`:

```ts
export default defineConfig({
  base: '/<repo-name>/',
  // ...
})
```

## Enabling GitHub Pages

1. Push to `main` — this triggers `.github/workflows/deploy.yml`.
2. In the repo, go to **Settings → Pages → Source** and select **GitHub Actions**.
3. The site will be published at `https://<org>.github.io/devtools-web/`.

Note: a private repo requires GitHub Pro/Team to enable Pages; a public repo is free.

## CORS note (API Client)

Requests are sent directly from your browser via `fetch`. If the target API doesn't allow the GitHub Pages origin via CORS, requests will fail — ask the backend to allow the origin, or put an external proxy (e.g. a Cloudflare Worker) in front of the API.
