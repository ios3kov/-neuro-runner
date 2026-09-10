# Neuro Runner

Cyberpunk retro-OS game shell built with React, TypeScript, Vite and Zustand.

## Run locally

Prerequisites: Node.js 20+ (Node.js 22 recommended).

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production build

```bash
npm run typecheck
npm run build
npm run preview
```

The preview server also listens on port 3000.

## Notes

- No Gemini/API key is required by the current application. `OMNI.AI` is currently implemented as an in-app scripted experience and does not call an external AI API.
- Telegram WebApp integration activates automatically when the app is opened inside Telegram; normal browser mode remains supported for development.
- The visual shell currently loads Tailwind CSS and web fonts from CDNs, so an internet connection is required for full styling unless those assets are bundled locally in a future production pass.
