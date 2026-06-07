# Stop Decide Go Prototype

This project is a deployable prototype for the Stop Decide Go emotional support flow.

It includes:

- Figma-inspired web app shell
- AR breathing module
- AR grounding module with Gemini detection API
- DECIDE guided AI companion with OpenAI
- Research admin dashboard
- Anonymous session and event tracking for study data

## Main Files

- `index.html` - main learner-facing prototype
- `styles.css` - main UI styling
- `app.js` - front-end flow, DECIDE interaction, research event tracking
- `admin.html` - research admin dashboard
- `admin.css` - admin dashboard styling
- `admin.js` - admin dashboard data loading and CSV export
- `api/decide.js` - OpenAI DECIDE guidance API
- `api/detect.js` - Gemini grounding detection API
- `api/session.js` - research session and event tracking API
- `api/admin.js` - password-protected research admin API
- `api/_db.js` - Postgres connection and schema setup
- `modules/ar-ball/` - AR breathing module
- `modules/ar-grounding/` - AR grounding module

## Required Vercel Environment Variables

```text
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
DATABASE_URL=your_postgres_database_url
ADMIN_PASSWORD=your_admin_dashboard_password
```

If Vercel or Neon gives you `POSTGRES_URL` instead of `DATABASE_URL`, that works too.

## Research Dashboard

After deployment, open:

```text
https://your-vercel-domain.vercel.app/admin.html
```

The dashboard shows:

- total sessions
- completed sessions
- sessions in the last 7 days
- completion rate
- recent sessions
- common selected choices
- event type counts
- session event timeline
- CSV export

The dashboard is protected by `ADMIN_PASSWORD`.

## Data Model

The app creates two database tables automatically on first API use:

- `research_sessions`
- `research_events`

The current tracking design stores anonymous session data only. Do not put student names, phone numbers, school IDs, or other directly identifying information into the participant field unless your research protocol explicitly allows it.

## Local Preview

You can open `index.html` directly for UI preview. AI, grounding detection, and research tracking require Vercel API routes and environment variables, so they work best after deployment.

## Deploy

1. Push the full project to GitHub.
2. Import the repo into Vercel.
3. Set the environment variables listed above.
4. Deploy.
5. Test the main app at the production URL.
6. Test the dashboard at `/admin.html`.
