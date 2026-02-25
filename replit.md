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
3. **Discover** — card-based profile browsing with like/dislike
4. **Matches** — mutual like creates a match
5. **Messaging** — real-time chat with matches
6. **Premium** — $5/month subscription (UI ready, payment integration pending)
7. **Verification** — status display (admin-driven)

## Database Schema
- `users` — profiles with caste, gender, country, photos, etc.
- `likes` — unique per (fromUserId, toUserId)
- `dislikes` — unique per (fromUserId, toUserId)
- `matches` — created when two users mutually like each other
- `messages` — within a match conversation

## Design System
- **Colors**: Deep purple/plum background (#1a0a2e, #0d0618), gold accent (#c9a84c)
- **Typography**: Playfair Display (headings), Open Sans (body)
- **Theme**: Dark mode by default

## Demo Account
- Email: demo@gustilk.com
- Password: demo1234

## Seed Data
5 seed users across Sheikh and Pir castes with realistic profiles.

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Express session secret

## Running
```bash
npm run dev
```
Server + frontend served on port 5000.
