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

## Notifications
Notifications are saved in MongoDB and delivered in-app over authenticated Socket.IO. Team invitations are sent by email and also appear in the recipient's dashboard inbox; recipients can accept or reject them there. Admin announcements are saved as notifications for verified participants and also sent by email.

- Run the backend as a persistent Node service (`npm start`) for live Socket.IO delivery. The serverless `backend/api` wrapper does not host Socket.IO.
- Set `FRONTEND_URL` on the backend to the deployed frontend origin(s), comma-separated if needed. It configures API/Socket.IO CORS and invitation email links.
- Set `BACKEND_URL` on the frontend for the `/api/*` Next.js rewrite. `NEXT_PUBLIC_API_URL` may override the Socket.IO backend origin; the dashboard otherwise connects to `https://kle.onrender.com`.
- Browser push is optional. In `backend/`, run `npx web-push generate-vapid-keys` and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` on the backend. Keep the private key secret. Users enable browser permission from the dashboard; in-app notifications work without VAPID keys.
- Authenticated notification endpoints are under `/api/notifications`: `GET /` (paginated inbox), `GET /unread-count`, `PATCH /:id/read`, `PATCH /read-all`, `DELETE /:id`, and `DELETE /clear`. Push subscription endpoints are `/push/public-key`, `/push/subscribe` (`POST`/`DELETE`).
- Socket.IO authenticates using the existing participant JWT in the handshake `auth.token`. Events are `notification:new` and `notification:updated`.

## 3D redesign (v2)
All 3D lives in `frontend/public`: `kle3d.js` (main scene), `k3d-util.js` (shaders, trophy, holo screens, circuit boards), `bg3d.js` (portal/admin backdrop), `kle-loader.js` (loads GSAP + three), `kle3d.css`, `kle-ui.js`.
Scene: extruded chrome "HACKATHON 2K26", gold trophy, holographic code screens, circuit boards, glass panels, energy rings, light shafts, bloom, scroll-driven camera, mouse parallax, hover (letters/trophy/portal), warp transition into the portal pages.
Tuning knobs are at the top of `kle3d.js` (quality `Q`, layout numbers in `buildPath()` / `heroLayout()`); in the browser console `KLE3D.bloom.strength`, `KLE3D.renderer.toneMappingExposure` etc. can be changed live.
If WebGL is unavailable the page automatically falls back to the original CSS title on a dark gradient.
