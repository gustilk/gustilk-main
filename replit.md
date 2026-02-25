# Gûstîlk — Dating App for Yezidies

A culturally sensitive dating platform designed exclusively for the Yezidi community, respecting traditional values and the caste system.

## Overview

**App Name**: Gûstîlk (means "Ring" in Kurdish — symbolizing commitment)
**Purpose**: Connect Yezidi singles within their caste (Sheikh, Pir, Murid)

## Architecture

### Frontend
- **React** with TypeScript
- **Wouter** for routing
- **TanStack Query** for data fetching
- **Shadcn/UI** components
- **Tailwind CSS** with custom dark purple/gold theme
- Mobile-first design (max-width centered layout)

### Backend
- **Express.js** with TypeScript
- **Passport.js** (local strategy) + express-session
- **PostgreSQL** via Drizzle ORM
- **connect-pg-simple** for session storage

## Key Features
1. **Caste-based matching** — users only see profiles from their own caste
2. **Profile management** — photos, bio, occupation, languages
3. **Discover** — card-based profile browsing with like/dislike, location pin, swipe animation
4. **Matches** — "Neue Matches" bubbles row + conversations list
5. **Messaging** — real-time chat; locked behind premium for non-subscribers
6. **Premium** — $5/month; country-specific payment (SEPA/iDEAL/Klarna/Bancontact/Card); free for Iraq
7. **Verification** — selfie upload flow → admin approval; /verify and /pending-verification pages
8. **Events** — community event listing with RSVP (Cultural / Meetup / Online filter tabs)
9. **Reports** — ReportModal in chat; `POST /api/reports`; admin can view/resolve at /admin > Reports tab
10. **Community guidelines** — checkbox required at registration with collapsible guidelines
11. **Admin Panel** — verification queue + reports tab with approve/reject/ban/resolve actions
12. **Match Modal** — dual-avatar display when match occurs

## Pages / Routes
- `/discover` — Swipeable profile cards
- `/matches` — New matches bubbles + conversation list (locked for non-premium)
- `/chat/:matchId` — Chat screen (locked overlay for non-premium)
- `/events` — Events list with type filter
- `/events/:eventId` — Event detail with RSVP
- `/profile` — My profile + settings menu (Language, Notifications, Community Guidelines, Admin)
- `/profile/edit` — Edit profile
- `/premium` — Premium subscription with Iraq detection
- `/admin` — Admin verification queue (isAdmin users only)

## Database Schema
- `users` — profiles with caste, gender, country, photos, isPremium, isAdmin, verificationSelfie
- `likes` — unique per (fromUserId, toUserId)
- `dislikes` — unique per (fromUserId, toUserId)
- `matches` — created when two users mutually like each other
- `messages` — within a match conversation
- `events` — community events (type, date, location, attendeeCount)
- `eventAttendees` — RSVP join table

## Design System
- **Colors**: Deep ink background (#0d0618), gold accent (#c9a84c), plum (#7b3fa0), rose (#d4608a), cream (#fdf8f0)
- **Typography**: Playfair Display (headings), Open Sans (body)
- **Theme**: Dark mode by default

## Demo Accounts
- **Demo user**: demo@gustilk.com / demo1234 (sheikh, Hannover, Germany)
- **Admin**: admin@gustilk.com / admin1234 (isAdmin: true — can access /admin)

## Seed Data
- 6 users: 5 community members + 1 admin, across Sheikh and Pir castes
- 6 events: 2 cultural, 2 meetup, 2 online across Germany, Sweden, Iraq, International

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Express session secret
- `TWILIO_ACCOUNT_SID` — Twilio Account SID (for SMS OTP delivery)
- `TWILIO_AUTH_TOKEN` — Twilio Auth Token
- `TWILIO_PHONE_NUMBER` — Twilio sender phone number (e.g. +14155552671)
  - NOTE: Twilio Replit integration was dismissed. Add credentials as secrets manually, or re-authorize the integration.

## Running
```bash
npm run dev
```
Server + frontend served on port 5000.
