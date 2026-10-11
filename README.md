# AgileBoard – Frontend

Branded as **AgileMetrix**. Logo files are in `public/`: `logo.svg` (horizontal logo), `logo-icon.svg` (icon only), `favicon.svg` and `apple-touch-icon.png`. All SVGs are flat vector with transparent backgrounds; brand colours are deep blue `#1E3A8A` and teal `#14B8A6`.

React (Vite) sprint performance dashboard, based on the Lovable design. Charts use Recharts.

## Setup
```bash
npm install
npm run dev      # http://localhost:5173
```
In development, `/api` requests are proxied to the backend at `http://localhost:4000` (see `vite.config.js`).
To point at another API, set `VITE_API_URL` in `.env.local`.

## Sections
1. Sprint executive summary: 6 cards: time elapsed (working days passed ÷ sprint working days), predictability, velocity, spillover, unplanned work, and P1 - Blocker (open P1 - Blocker issues, linked to Jira)
2. Sprint delivery: committed vs completed story points; velocity trend (committed vs completed velocity with rolling average); completion vs business value (business value = stories completed ÷ total stories in the sprint)
3. Flow metrics: cycle time, throughput, WIP, blocked work; cycle time trend (average, median and 85th percentile per sprint)
4. Scope stability: completed / added / spillover per sprint; Issues by Type (stories, tasks, bugs, sub-tasks: planned, added, completed)
5. Quality: defects created vs closed; defect rate (stories ÷ bugs created in the sprint) and defect density (achieved velocity ÷ bugs created in the sprint)
6. Sprint health: each metric against its target
7. Sprint burndown: ideal vs actual remaining
8. Process compliance: DoR, DoD, acceptance criteria, code review, tests, automation

Filters: project, team, quarter, sprint, release and assignee. **Quarter** (Q1–Q4, by sprint start date) limits the sprint list and the trend charts to that quarter's sprints. Each dropdown only lists options for the selection above it: teams for the project, and sprints and assignees for the team. **Settings → Appearance** switches between Light, Dark and System themes (saved per browser). **Refresh** pulls the latest data from Jira through the backend. **Export** downloads a CSV of the headline numbers, and every chart has its own **PNG** (image of the chart) and **CSV** (the chart's data) download buttons.

## Structure
- `src/App.jsx` – page layout and filter state
- `src/api/client.js` – API calls
- `src/components/` – filter bar, cards, tables, insights
- `src/components/charts/` – Recharts charts
- `src/lib/` – formatting and CSV export
