# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains two things:
1. `index.html` — A static privacy policy page for a Facebook Graph API integration app.
2. `app/` — A Node.js dashboard for scheduling and auto-publishing content to Facebook Pages via the Graph API.

## Running the App

```bash
cp .env.example .env      # fill in FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN
npm install
npm start                 # http://localhost:3000
```

Login password is set via `DASHBOARD_PASSWORD` in `.env` (default: `926696`).

## Architecture

```
app/
├── server.js             # Express entry point, session middleware, cron scheduler
├── routes/
│   ├── auth.js           # POST /auth/login, POST /auth/logout
│   └── posts.js          # CRUD API + Facebook Graph API publishing logic
├── data/posts.json       # Persistent post store (JSON file, auto-created)
├── uploads/              # Temp storage for uploaded images (deleted after publishing)
└── public/
    ├── login.html        # Password login page
    └── dashboard.html    # SPA dashboard (vanilla JS, no framework)
```

**Scheduling:** `node-cron` runs every minute and calls `publishPendingPosts()`, which finds all posts with `status: "pending"` whose `scheduledAt` is in the past and publishes them to Facebook.

**Facebook API endpoints used:**
- Text posts → `POST /{page-id}/feed`
- Image posts → `POST /{page-id}/photos` (accepts file upload or `url`)

## Key Conventions

- All dashboard styling is inline CSS (no external stylesheets or frameworks) — consistent with `index.html`.
- Posts are stored in `app/data/posts.json`. Do not add a database unless the volume requires it.
- `app/uploads/` holds image files only temporarily; they are deleted immediately after a successful publish.
- The contact email for data deletion in `index.html` is `onesetforu@gmail.com`.
- Update the `Last updated` date in `index.html` whenever the privacy policy content changes.

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default: 3000) |
| `SESSION_SECRET` | Express session secret (change in production) |
| `DASHBOARD_PASSWORD` | Dashboard login password |
| `FB_PAGE_ID` | Facebook Page ID to publish to |
| `FB_PAGE_ACCESS_TOKEN` | Long-lived Page Access Token from Meta for Developers |
