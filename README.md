# Mythic-Madness

Rune Drift is a fast 2D survival game built with HTML5 Canvas and Vite.

## Gameplay

- Move with `WASD` or Arrow Keys
- Dash with `Shift` (has cooldown)
- Blast nearby enemies with `Space`
- Collect golden runes for points and small healing
- Survive as long as possible while waves intensify

## Run Locally

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite (usually `http://localhost:5173`).

## Scripts

- `npm run dev` or `npm start`: start local development server
- `npm run build`: create production build in `dist/`
- `npm run preview`: preview production build locally

## Deploy To Vercel

This project is ready for direct Vercel import.

1. Push this repo to GitHub.
2. In Vercel, click Add New Project and import the repository.
3. Use these settings if Vercel does not auto-detect them:
	- Framework Preset: Vite
	- Build Command: npm run build
	- Output Directory: dist
	- Install Command: npm install
4. Click Deploy.

For future changes, pushing to `main` will trigger a new deployment.
