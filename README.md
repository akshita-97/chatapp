# ChatApp

Full-stack real-time chat (mini WhatsApp Web).

## Stack
- Frontend: Next.js (React) + Tailwind CSS
- Backend: Node.js (Express) + Socket.IO
- Database: MySQL
- Cache/Presence: Redis (optional, falls back to in-memory)
- Media: local uploads (or S3-compatible)

## Setup

### Backend
```
cd backend
npm install
cp .env.example .env   # edit DB credentials
npm run dev
```
MySQL service must be running. The app auto-creates the `chatapp` database and tables.

### Frontend
```
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Environment variables (backend/.env)
See `.env.example`.

### Environment variables (frontend/.env.local)
See `.env.local.example`.


## Run the whole stack with Docker
```bash
docker compose up --build
```
This starts MySQL, Redis, backend (4000) and frontend (3000). Open http://localhost:3000.

## Deploy globally (public)
**Easiest free stack:**
- Frontend -> Vercel (import repo, root = `frontend`, set `NEXT_PUBLIC_API_URL` & `NEXT_PUBLIC_WS_URL` to your backend URL)
- Backend -> Render / Railway / Fly.io (root = `backend`, start = `npm start`, set DB/Redis/JWT env vars)
- Database -> PlanetScale / Aiven / Supabase (managed MySQL)
- Redis -> Upstash (managed Redis)
- Media -> Cloudflare R2 / AWS S3 (update `backend/src/routes/media.js`)

Set `CLIENT_ORIGIN` on the backend to your Vercel URL, and `JWT_SECRET` to a strong random value.
