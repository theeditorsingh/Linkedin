# LinkedIn Content Autopilot — PRD, Design Stack & Tech Stack
**Internal Personal Tool | Version 1.0 | June 2026**

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [User Workflows](#3-user-workflows)
4. [Feature Specification](#4-feature-specification)
5. [Tech Stack](#5-tech-stack)
6. [Design Stack](#6-design-stack)
7. [System Architecture](#7-system-architecture)
8. [Data Model](#8-data-model)
9. [Integration Constraints & Compliance](#9-integration-constraints--compliance)
10. [Roadmap](#10-roadmap)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Future Ideas](#12-future-ideas)

---

## 1. Product Overview

LinkedIn Content Autopilot is a **free, self-hosted personal tool** that turns any information source (blog post, article, newsletter, or pasted text) into a ready-to-publish LinkedIn post written in the owner's personal style.

The system generates the post body, hashtags, first comment, and an **AI image generation prompt** (not the image itself). The owner generates the image manually using ChatGPT's image model, uploads it back into the system, then approves and schedules the post via Slack. Approved posts auto-publish to LinkedIn at the scheduled time.

**Design principle:** Every external API used must have a free tier sufficient for personal use (~1–3 posts/day).

---

## 2. Goals & Non-Goals

### Goals
- Reduce time from "found a good source" to "scheduled LinkedIn post" to under 2 minutes of active human effort.
- Every post matches the owner's authentic writing style (trained on past posts).
- Nothing publishes without explicit human approval (Slack or in-app).
- Single calendar view of everything drafted, scheduled, and published.
- **Zero or near-zero monthly cost** for personal use volume.
- **Mobile-first UX** — the entire tool must be fully usable on a Samsung Galaxy S23 Ultra 5G with one hand.

### Non-Goals (v1)
- Multi-tenant SaaS, billing, or public sign-up.
- Other social networks (X, Instagram) — architecture allows later, out of scope now.
- Scraping LinkedIn posts automatically (ToS violation).
- Automatic AI image generation (owner generates images manually via ChatGPT).
- Engagement automation (auto-likes, auto-comments).
- Native iOS/Android app — PWA on Samsung Galaxy S23 Ultra is sufficient.
- Desktop-optimized layout — desktop works but is not the design priority.

---

## 3. User Workflows

### Workflow A — Repurpose a Source (Core Loop)

```
1. FEED SOURCE
   └─ Paste a URL (blog/article/news) OR paste raw text OR RSS feed auto-push

2. EXTRACT
   └─ App fetches the page → extracts title, body text, author, og:image URL

3. GENERATE (LLM)
   └─ Drafts LinkedIn post in owner's voice (Style Profile)
   └─ Suggests first comment with source link
   └─ Generates 3–5 hashtags
   └─ Generates a detailed image prompt for ChatGPT image model

4. SLACK ALERT — "Post Ready, Image Needed"
   └─ Message contains:
       • Post body preview
       • Suggested hashtags
       • Image prompt (copy-ready for ChatGPT)
       • Upload link → [Upload Image]

5. OWNER GENERATES IMAGE
   └─ Owner copies prompt → pastes into ChatGPT image generator
   └─ Downloads image → uploads via link in Slack (or in-app)

6. SYSTEM RECEIVES IMAGE
   └─ Draft moves to "In Review" on kanban
   └─ Slack message updates: image thumbnail shown + Approve / Reject / Regenerate buttons

7. SLACK APPROVAL
   └─ Approve → post moves to Approved/Scheduled
   └─ Reject → card moves to Rejected
   └─ Regenerate → new post body generated, same image kept (or re-prompt)

8. AUTO-PUBLISH
   └─ Worker fires at scheduled time
   └─ Posts to LinkedIn via API (text + image)
   └─ Auto-posts first comment with source link
   └─ Card moves to Published
   └─ Slack thread updated with live post URL
```

### Workflow B — Manual Write & Schedule

```
1. Owner writes post in the editor (AI polish/assist available)
2. Requests an image prompt → generates prompt → owner creates + uploads image
3. Picks a date/time on the calendar (or accepts suggested slot)
4. Same Slack review gate applies
5. Can toggle "Publish without review" to skip Slack approval
```

---

## 4. Feature Specification

### 4.1 MVP (Phase 1)

| Feature | Specification |
|---------|--------------|
| **Source ingestion** | URL fetch + readability parser; raw text paste. One source → one draft. |
| **Style Profile** | Seeded with 20–50 of owner's past LinkedIn posts. Stored as structured style guide (tone, hooks, sentence length, emoji/hashtag habits, CTA patterns) + few-shot examples injected into generation prompt. |
| **Post generation** | LLM (Gemini Flash free tier). Output: post body (≤3,000 chars), first comment with source link, hashtags (3–5), image generation prompt. "Regenerate" and tone controls (shorter/longer/more casual). |
| **Image prompt** | Detailed, copy-ready prompt optimized for ChatGPT image model. Contextual to the post topic. Includes style guidance (e.g., "clean professional LinkedIn aesthetic, no text overlay"). |
| **Image upload** | Owner uploads image after generating in ChatGPT. Stored in Cloudflare R2. Supported formats: JPG, PNG, WebP. |
| **Kanban board** | Columns: Ideas → Drafting → In Review → Approved/Scheduled → Published → Rejected. Drag-and-drop. |
| **Calendar** | Month/week view; drag to reschedule; suggested best-time slots (default: Tue–Thu 8–10 am). |
| **Slack integration** | Slack app with Block Kit: post preview + image thumbnail + Approve / Reject / Regenerate buttons. Separate alert for "image needed" step. |
| **Publishing** | LinkedIn API (OAuth, `w_member_social`): text + image posts to member profile. Scheduler worker fires at scheduled minute. Auto-posts first comment after publish. |
| **Audit log** | Who approved what, when; full version history of each draft. |

### 4.2 Phase 2

| Feature | Specification |
|---------|--------------|
| **RSS / newsletter watch** | Watch feeds and keyword alerts; auto-create draft cards from new items. |
| **Analytics loop** | Pull post impressions/reactions/comments; weekly Slack digest; feed top performers back into Style Profile. |
| **Best-time engine** | Learn posting times from own engagement data instead of static defaults. |
| **Carousel / document posts** | Generate multi-slide PDF carousels from long sources. |
| **Chrome extension** | Right-click "Send this page to Autopilot" from any browser tab. |
| **Slack inline edit** | Edit post text directly inside a Slack modal before approving. |

---

## 5. Tech Stack

> **Guiding principle:** Everything runs on free tiers. Estimated monthly cost = $0.

### Infrastructure

| Layer | Technology | Why / Free Tier |
|-------|-----------|-----------------|
| **Frontend** | Next.js 15 (App Router) | Free on Vercel; SSR + API routes in one project |
| **Hosting** | Vercel (free tier) | 100GB bandwidth/mo, sufficient for personal tool |
| **Database** | Supabase (PostgreSQL) | Free: 500MB DB, 1GB file storage, built-in auth |
| **Queue / Jobs** | Upstash QStash | Free: 500 messages/day — enough for 1–3 posts/day |
| **Redis (cache)** | Upstash Redis | Free: 10k commands/day |
| **Image storage** | Supabase Storage | Free: 1GB included in existing Supabase project — no extra account needed |
| **Cron / Scheduler** | Vercel Cron Jobs | Free: 2 cron jobs on free tier |

### AI & Integrations

| Service | Technology | Why / Free Tier |
|---------|-----------|-----------------|
| **LLM (post generation)** | Google Gemini 2.0 Flash (`gemini-2.0-flash`) | Free API: 1,500 req/day, 1M tokens/min |
| **Image generation** | **ChatGPT (manual by owner)** | No API cost — owner generates manually |
| **Image prompt generation** | Same Gemini call | Included in post generation call, no extra cost |
| **Slack** | Slack API (Bot) | Free: `chat:write`, `users:read`, Block Kit interactive messages |
| **LinkedIn** | LinkedIn API OAuth 2.0 | Free with `w_member_social` scope (owner has access) |

### Development Tools

| Tool | Purpose |
|------|---------|
| TypeScript | Type safety across full stack |
| Prisma ORM | Database schema + migrations (works with Supabase) |
| Zod | Runtime validation for API inputs |
| Tailwind CSS | Styling |
| shadcn/ui | Pre-built accessible UI components |
| `@dnd-kit` | Drag-and-drop for kanban |
| `date-fns` | Date handling for calendar/scheduler |

### Gemini SDK Setup (Post Generation)
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
```

---

## 6. Design Stack

### Primary Device
> **Samsung Galaxy S23 Ultra 5G**
> - Screen: 6.8" Dynamic AMOLED 2X, 3088 × 1440px, 120Hz
> - Usage: Primary and majority device — all UX decisions default to this screen
> - Interaction: Touch + S Pen (occasional)
> - This is NOT a "also works on mobile" afterthought — mobile IS the primary experience

### Core Mobile UX Rules (non-negotiable)
| Rule | Implementation |
|------|---------------|
| **Thumb-zone first** | All primary actions (Approve, Reject, New Post) in bottom 40% of screen |
| **Bottom navigation bar** | Main nav at bottom — never top hamburger menu |
| **Large touch targets** | Minimum 48×48dp for all tappable elements; CTA buttons at least 56dp tall |
| **Bottom sheets** | Use bottom sheet drawers instead of center modals for all overlays |
| **Swipe gestures** | Swipe cards left/right on kanban to change status; swipe to delete |
| **No hover-dependent UI** | Nothing requires hover — every action must be tap-accessible |
| **Dark mode default** | AMOLED display — true black (`#000000`) background saves battery and looks sharp |
| **Single-column layouts** | No multi-column grids on mobile; everything stacks vertically |
| **Sticky action bar** | Post editor has a sticky bottom bar with Save / Generate / Publish buttons |
| **Large readable text** | Base font size 16px minimum; line-height 1.6 for post preview |

### PWA (Progressive Web App) — Critical
- The app **must be installable as a PWA** on the home screen (no App Store needed)
- Add `manifest.json` with app name, icons, `display: standalone`
- Service worker for offline draft viewing
- "Add to Home Screen" prompt on first visit
- Feels like a native app once installed — no browser chrome visible

### UI Framework & Libraries

| Concern | Decision |
|---------|----------|
| **UI Framework** | shadcn/ui (Radix UI primitives + Tailwind) — mobile-friendly out of the box |
| **Design language** | Minimal, professional. **Dark mode default** (true black for AMOLED). LinkedIn blue `#0A66C2` accents. |
| **Kanban (mobile)** | Horizontal scroll with snap — one column visible at a time on mobile; `@dnd-kit` for drag-and-drop |
| **Calendar** | Week view default on mobile (month view too small); `react-big-calendar` |
| **Bottom navigation** | Custom bottom nav bar — Home (kanban), Calendar, New Post, Settings |
| **Bottom sheets** | `vaul` library — drawer component built for mobile |
| **Icons** | `lucide-react` (free, consistent, sharp at all sizes) |
| **Fonts** | Inter (system font stack, zero load cost) |
| **Toasts / Alerts** | `sonner` — appears at top on mobile (avoids bottom nav overlap) |
| **Forms** | `react-hook-form` + `zod` resolver; large inputs, no tiny fields |
| **Wireframing** | Canva / Excalidraw (free) |

### Mobile Kanban UX
```
Mobile view: horizontal scroll, snap to each column
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  In Review   │→ │  Scheduled   │→ │  Published   │
│  [card]      │  │  [card]      │  │  [card]      │
│  [card]      │  │              │  │  [card]      │
│              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
← swipe to see more columns →

Tap card → bottom sheet opens with full post + action buttons
```

### Slack as Mobile Approval Hub
- Since the owner uses the phone primarily, **Slack is the main approval interface**
- Slack mobile app on S23 Ultra handles all Approve/Reject/Regenerate actions natively
- The web app is for creating, scheduling, and reviewing — Slack is for quick decisions on the go
- Slack Block Kit messages are already mobile-optimized — no extra work needed

### UI Pages (Mobile-First Layout)

| Page | Mobile Layout |
|------|--------------|
| **Dashboard (Kanban)** | Horizontal swipe columns, snap scroll, FAB (+) to add new post |
| **Calendar** | Week view default; tap slot → bottom sheet to create/view post |
| **New Post** | Full-screen form; large textarea; generated content shown in expandable cards |
| **Image Prompt** | Full-screen card with copy button (one tap to copy prompt for ChatGPT) |
| **Image Upload** | Camera roll / file picker button; large upload target area |
| **Style Profile** | Scrollable list of example posts; tap to edit/remove |
| **Settings** | Simple list; LinkedIn and Slack connect buttons prominent |
| **Analytics (P2)** | Card-based metrics; no complex charts on small screen |

---

## 7. System Architecture

A **modular Next.js monolith** with Upstash QStash for background jobs. No separate server process needed.

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   Pages /   │  │  API Routes  │  │  Cron Jobs │  │
│  │  Components │  │  (handlers)  │  │ (Vercel)   │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────┘
         │                  │                │
         ▼                  ▼                ▼
   Supabase DB        Upstash QStash    Upstash Redis
   (PostgreSQL)       (job queue)       (cache/locks)
         │
         ├──── Cloudflare R2 (images)
         ├──── Gemini API (generation)
         ├──── Slack API (alerts + approval)
         └──── LinkedIn API (publish)
```

### Pipeline (Happy Path)

```
Source URL/text
  → [extract job] → article text + og:image URL
  → [generate job: Gemini + Style Profile]
      → post body + first comment + hashtags + image prompt
  → Slack alert: "Image needed" + image prompt + upload link
  → Owner generates image in ChatGPT → uploads via link
  → System stores image in R2
  → Draft card moves to "In Review"
  → Slack message updates: image preview + Approve/Reject/Regenerate buttons
  → Owner approves
  → Status: Approved/Scheduled
  → [publish job fires at scheduled time]
      → LinkedIn Posts API (text + image)
      → LinkedIn Comments API (first comment)
  → Card → Published
  → Slack thread updated with live post URL
```

---

## 8. Data Model

### Core Tables

```sql
-- Users
users (
  id              UUID PRIMARY KEY,
  name            TEXT,
  email           TEXT UNIQUE,
  slack_user_id   TEXT,
  linkedin_member_urn TEXT,
  settings        JSONB   -- timezone, default posting times, etc.
)

-- Style Profile
style_profiles (
  id          UUID PRIMARY KEY,
  user_id     UUID REFERENCES users,
  guide_json  JSONB,  -- tone, hooks, sentence length, emoji habits, CTA patterns
  example_posts TEXT[] -- few-shot examples for LLM prompt
)

-- Sources
sources (
  id              UUID PRIMARY KEY,
  url             TEXT,
  type            TEXT,  -- 'url' | 'text' | 'rss'
  title           TEXT,
  extracted_text  TEXT,
  og_image_url    TEXT,
  fetched_at      TIMESTAMP
)

-- Posts
posts (
  id                UUID PRIMARY KEY,
  user_id           UUID REFERENCES users,
  source_id         UUID REFERENCES sources,
  body              TEXT,
  first_comment     TEXT,
  hashtags          TEXT[],
  image_prompt      TEXT,   -- generated prompt for ChatGPT image model
  image_asset_url   TEXT,   -- R2 URL after owner uploads
  status            TEXT,   -- idea|drafting|image_needed|in_review|approved|scheduled|published|rejected|failed
  scheduled_at      TIMESTAMP,
  published_at      TIMESTAMP,
  linkedin_post_urn TEXT
)

-- Post Versions (audit trail)
post_versions (
  id          UUID PRIMARY KEY,
  post_id     UUID REFERENCES posts,
  body        TEXT,
  created_by  TEXT,  -- 'ai' | 'user'
  created_at  TIMESTAMP
)

-- Approvals
approvals (
  id        UUID PRIMARY KEY,
  post_id   UUID REFERENCES posts,
  actor     TEXT,
  action    TEXT,    -- 'approve' | 'reject' | 'regenerate'
  channel   TEXT,    -- 'slack' | 'app'
  acted_at  TIMESTAMP
)

-- OAuth Tokens
oauth_tokens (
  user_id       UUID REFERENCES users,
  provider      TEXT,   -- 'linkedin' | 'slack'
  access_token  TEXT,   -- encrypted at rest
  expires_at    TIMESTAMP,
  refresh_token TEXT
)

-- Post Metrics (Phase 2)
post_metrics (
  post_id     UUID REFERENCES posts,
  impressions INT,
  reactions   INT,
  comments    INT,
  fetched_at  TIMESTAMP
)
```

### Post Status Flow

```
idea → drafting → image_needed → in_review → approved → scheduled → published
                                           ↘ rejected
                                           ↘ failed
```

---

## 9. Integration Constraints & Compliance

### LinkedIn API
- Publishing via Posts API with `w_member_social` scope — officially supported for member's own profile.
- Access tokens last ~60 days — build token-refresh reminder (Slack alert 7 days before expiry).
- Rate limits: posting cadence stays human-like (max 1–2 posts/day); every post is human-approved.

### No LinkedIn Scraping
- Automated scraping of LinkedIn content violates ToS and risks account restriction.
- LinkedIn-post sources are **manual copy-paste only**.
- Automated ingestion is for external sources only: blogs, news, RSS, newsletters.

### Image Rights
- System generates a prompt; owner generates and owns the image.
- If reusing og:image from source, attribute in first comment.

### Slack
- Standard Slack app; free tier sufficient.
- Bot scopes: `chat:write`, `users:read`, `files:write`.
- Interactivity endpoint must verify Slack request signatures.

### Security
- Encrypt OAuth tokens at rest (Supabase column-level encryption or app-level AES-256).
- Restrict app access to owner only (no public signup).
- Log all publish actions in the approvals table.

---

## 10. Roadmap

| Phase | Scope | Duration |
|-------|-------|----------|
| **0 — Setup** | Repo, Supabase schema, LinkedIn dev app + OAuth flow, Slack app, Gemini API key, style-profile seeding from 20–50 past posts | Week 1 |
| **1 — Core Pipeline** | URL/text ingestion → extraction → Gemini generation (post + image prompt) → Slack "image needed" alert → image upload → manual publish-now button | Weeks 2–3 |
| **2 — Workflow** | Kanban board, calendar view, scheduling worker (Vercel Cron + QStash), Slack approval Block Kit, auto-publish, audit log | Weeks 4–5 |
| **3 — Hardening** | Token refresh flow, retry logic, failure alerts to Slack, QA with real posts | Week 6 |
| **4 — Phase 2** | RSS watch, post analytics, best-time engine, carousels, Chrome extension | Ongoing |

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| LinkedIn token expiry (~60 days) breaks publishing silently | Expiry monitor + Slack reminder 7 days before; re-auth link in Slack message |
| AI drafts drift from authentic voice | Few-shot style profile + mandatory human review; owner can flag bad examples |
| Owner forgets to generate/upload image; post stays stuck | Reminder Slack ping after 6h if status is still `image_needed` |
| Vercel free tier limits hit | Cron job + QStash job counts monitored; 1–3 posts/day is well within limits |
| Gemini free tier limits hit | 1,500 req/day free — at 3 posts/day each using ~2–3 calls = ~9 calls/day, well under limit |
| Source extraction fails on paywalled/JS-heavy pages | Manual text paste always available as fallback |
| Slack approval missed, post stays stuck | Reminder ping after 12h; nothing publishes unapproved (fail-safe default) |

---

## 12. Future Ideas

- **Chrome extension** — "Send this page to Autopilot" right-click from any browser tab.
- **Weekly content-ideas digest** in Slack from watched RSS feeds.
- **A/B hook testing** — generate 3 different opening hooks, pick via Slack poll.
- **Repurpose one source into multiple formats** — post, carousel, poll — in one run.
- **Voice notes → post** — record a thought, transcribe via Whisper API, draft in style.
- **Expand to other networks** — X/Twitter, Threads — architecture supports it with a new publisher module.
- **Analytics-driven style updates** — top-performing posts automatically added to Style Profile examples.
- **LinkedIn Articles** — long-form article drafts (API support limited; may require manual paste step).

---

*Document maintained by: Owner | Last updated: June 2026*
*Stack decisions are locked for v1. Changes should be discussed and versioned here before implementation.*
