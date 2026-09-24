# AgileBoard – Frontend

React (Vite) sprint performance dashboard, based on the Lovable design. Charts use Recharts.

## Setup
```bash
npm install
npm run dev      # http://localhost:5173
```
In development, `/api` requests are proxied to the backend at `http://localhost:4000` (see `vite.config.js`).
To point at another API, set `VITE_API_URL` in `.env.local`.

## Sections
1. Sprint executive summary: 7 cards: time elapsed (working days passed ÷ sprint working days), predictability, completion, velocity, spillover, unplanned work, and P1 - Blocker (open P1 - Blocker issues, linked to Jira)
2. Sprint delivery: committed vs completed story points; velocity trend (committed vs completed velocity with rolling average); completion vs business value (business value = stories completed ÷ total stories in the sprint)
3. Flow metrics: cycle time, throughput, WIP, blocked work
4. Scope stability: completed / added / spillover per sprint
5. Quality: defects created vs closed, UAT and Prod share; defect rate (stories ÷ bugs created in the sprint) and defect density (achieved velocity ÷ bugs created in the sprint)
6. Sprint health: each metric against its target
7. Sprint burndown: ideal vs actual remaining
8. Process compliance: DoR, DoD, acceptance criteria, code review, tests, automation

Filters: project, team, quarter, sprint, release and assignee. **Quarter** (Q1–Q4, by sprint start date) limits the sprint list and the trend charts to that quarter's sprints. Each dropdown only lists options for the selection above it: teams for the project, and sprints and assignees for the team. **Refresh** pulls the latest data from Jira through the backend. **Export** downloads a CSV of the headline numbers.

## Structure
- `src/App.jsx` – page layout and filter state
- `src/api/client.js` – API calls
- `src/components/` – filter bar, cards, tables, insights
- `src/components/charts/` – Recharts charts
- `src/lib/` – formatting and CSV export
