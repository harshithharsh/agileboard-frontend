# AgileBoard – Frontend

React (Vite) client for AgileBoard.

## Setup
```bash
npm install
npm run dev      # http://localhost:5173
```
In development, `/api` requests are proxied to the backend at `http://localhost:4000` (see `vite.config.js`).
To point at another API, set `VITE_API_URL` in `.env.local`.

## Structure
- `src/api/client.js` – API calls
- `src/components/Board.jsx` – sprint board with drag-and-drop between columns
- `src/components/IssueCard.jsx` – issue card
