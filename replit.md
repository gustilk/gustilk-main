# Gûstîlk — Dating App for Yezidies

A culturally sensitive dating platform designed exclusively for the Yezidi community, respecting traditional values and the caste system.

## Overview

**App Name**: Gûstîlk (means "Ring" in Kurdish — symbolizing commitment)
**Purpose**: Connect Yezidi singles within their caste (Sheikh, Pir, Mirid)

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
- Session-based auth (express-session + connect-pg-simple)
- **PostgreSQL** via Drizzle ORM
- **@simplewebauthn/server** v13 for WebAuthn/Passkeys biometric auth

## Social OAuth
Configured via environment secrets. Providers activate automatically when keys are set:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` → Google OAuth (passport-google-oauth20)
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` → Facebook OAuth (passport-facebook)
- `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` → Instagram manual OAuth
- `SNAPCHAT_CLIENT_ID` / `SNAPCHAT_CLIENT_SECRET` → Snapchat manual OAuth
Callback URLs: `https://<domain>/api/auth/<provider>/callback`
New social users (empty city) are shown `SocialSetupPage` to fill caste, gender, country, city.

## Key Features
1. **Caste-based matching** — users only see profiles from their own caste
2. **Profile management** — photos, bio, occupation, languages
3. **Discover** — card-based profile browsing with like/dislike, location pin, swipe animation
4. **Matches** — matches row + conversations list; non-premium users see blurred/hidden identities
5. **Messaging** — real-time chat; locked behind premium (both GET and POST blocked server-side)
6. **Premium** — $5/month; Iraq = free (IP-verified); Russia = Card+MIR only
7. **Verification** — selfie upload flow → admin approval; /verify and /pending-verification pages
8. **Events** — community event listing with RSVP (Cultural / Meetup / Online filter tabs)
9. **Reports** — ReportModal in chat; `POST /api/reports`; admin can view/resolve at /admin > Reports tab
10. **Community guidelines** — checkbox required at registration with collapsible guidelines
11. **Admin Panel** — verification queue + reports tab with approve/reject/ban/resolve actions
12. **Match Modal** — dual-avatar display when match occurs
13. **Internationalization (i18n)** — 7 languages fully supported (en, ar, ku, de, sv, hy, ru); first-launch language picker; changeable from Profile settings; Arabic/Kurdish use RTL layout. All pages use `useTranslation()`. All locale files fully updated with keys for: community guidelines modal (`agreement.sections` as returnObjects array, `agreement.guidelinesTitle/readCarefully/scrollToContinue/agreeButton/readFirst/footerWarning/footerHonour/guidelinesButtonTitle/guidelinesButtonAgreed/guidelinesButtonRequired/truthfulCheckbox`), setup form (`setup.detected/selectCountry/stateProvince/selectState/couldNotSave/minAge18/step2Title/step2Subtitle/profilePhotosLabel/photosRequired/photoBothRequired/selfieAdminNote/takeSelfie/selfieVisible/adminOnly/saving/selfieReady/selfieRequiredStatus`), auth toasts (`auth.errorTitle/codeSentTitle/codeSentDesc`). CommunityGuidelinesModal uses `t()` for all content. All hardcoded English strings replaced with `t()` calls in SocialSetupPage and LandingPage.

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

## Internationalisation (i18n)
All 7 languages fully translated — keys are in `client/src/i18n/locales/<lang>.ts`.
Each locale file contains these top-level sections: `lang`, `languagePicker`, `common`, `landing`, `auth`, `agreement`, `setup`, `discover`, `matches`, `chat`, `premium`, `profile`, `events`, `nav`, `admin`, `verification`, `report`, `settings`.

The `settings` section (added session 2025-02) covers: Settings page UI (menu titles, section headers), Notifications subscreen (toggle labels, toast messages), Community Guidelines subscreen (intro + 8th section — Account Suspension), Privacy Policy subscreen (intro + 5 policy sections).
The `profile` section now includes: `edit`, `preview`, `occupation`, `languages`, `savePhotos`, `savingPhotos`, `mainPhoto`, `aboutMe`, `howOthersSeeYou`, `previewNote`, `photoInstruction`, `photosUpdated`, `couldNotSavePhotos`.

## Running
```bash
npm run dev
```
Server + frontend served on port 5000.
