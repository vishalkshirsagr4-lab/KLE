# KLE Hackathon 2K26 (Next.js + Node.js + Brevo)
- `backend/` Express + MongoDB API (your original server). Email now uses **Brevo** (OTP code, registration confirmation, and NEW: announcement emails to all verified participants).
- `frontend/` Next.js app. All your original pages/3D/features live in `frontend/public` (index, portal, admin) and are served by Next; `/api/*` is proxied to the backend.
- Team leaders invite verified participants from **My Team**; invited participants must accept before they are added. Direct member assignment is rejected by the API.

## Run
1. backend: `cd backend && cp .env.example .env` (fill in) `&& npm i && npm start`  (port 5000)
2. frontend: `cd frontend && npm i && npm run dev` (npm i also copies three.js + GSAP into `public/vendor`; if that folder is missing the page falls back to jsDelivr)  -> http://localhost:3000
3. Test Brevo: `cd backend && npm run test-mail -- you@example.com`

## GitHub
git init; git add .; git commit -m "KLE hackathon"; git branch -M main; git remote add origin <repo-url>; git push -u origin main
.env is git-ignored.

## Deploy
Backend: Render/Railway/Vercel (root `backend`, set env vars, Atlas 0.0.0.0/0; set `FRONTEND_URL` to the deployed frontend URL for links in invitation emails). Frontend: Vercel (root `frontend`, env BACKEND_URL = backend URL).

## 3D redesign (v2)
All 3D lives in `frontend/public`: `kle3d.js` (main scene), `k3d-util.js` (shaders, trophy, holo screens, circuit boards), `bg3d.js` (portal/admin backdrop), `kle-loader.js` (loads GSAP + three), `kle3d.css`, `kle-ui.js`.
Scene: extruded chrome "HACKATHON 2K26", gold trophy, holographic code screens, circuit boards, glass panels, energy rings, light shafts, bloom, scroll-driven camera, mouse parallax, hover (letters/trophy/portal), warp transition into the portal pages.
Tuning knobs are at the top of `kle3d.js` (quality `Q`, layout numbers in `buildPath()` / `heroLayout()`); in the browser console `KLE3D.bloom.strength`, `KLE3D.renderer.toneMappingExposure` etc. can be changed live.
If WebGL is unavailable the page automatically falls back to the original CSS title on a dark gradient.
