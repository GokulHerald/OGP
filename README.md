# Online Gaming Platform (OGP)

Full-stack MERN app for esports tournaments.

## Structure
- `client/`: Vite + React app
- `server/`: Express API

## Environment
- Copy `server/.env.example` to `server/.env` and fill values.

## Run locally (two terminals)

1. **API** (must be running for login / data — default port **5001**):

   ```bash
   cd server && npm start
   ```

   You should see `MongoDB connected` and `Server listening on 5001`.

   Sanity check (must return JSON `{"ok":true,...}`): open `http://localhost:5001/api/v1/ping` in the browser. If you get HTML “Cannot GET …” or a non-JSON 404, **another app** is bound to that port — stop it and restart this API (`npm start` from `server/`).

2. **Client** (Vite):

   ```bash
   cd client && npm run dev
   ```

If the browser shows `ERR_CONNECTION_REFUSED` for `:5001`, the API is not started or `PORT` in `server/.env` points elsewhere.

**`VITE_API_URL`:** Use the full API prefix, e.g. `http://localhost:5001/api/v1`. If you set only `http://localhost:5001`, the client will automatically append `/api/v1`. A 404 on `POST …/auth/login` (missing `api/v1` in the path) means the base URL was wrong.

