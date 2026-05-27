# GitHub Pages follow-up note

## Optional hardening

The current Pages workflow is basically correct for a Vite app. For clarity and closer alignment with the recommended Pages pattern, consider adding `actions/configure-pages@v5` before upload/deploy.

Suggested workflow:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - uses: actions/configure-pages@v5

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## If the site deploys but assets are broken

Because this is a Vite app, if the repo is published at `https://graphwright.github.io/ner-annotator/`, you may need a Vite base path in `vite.config.*`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ner-annotator/',
})
```

## Bottom line

The immediate fix for the failing job is still to enable GitHub Pages for the repository and set the source to GitHub Actions. This note is only for follow-up hardening and troubleshooting if the deployment later succeeds but the site does not load correctly.
