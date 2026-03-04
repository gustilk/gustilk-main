# Gûstîlk — Dating App for Yezidies

A culturally sensitive dating platform designed exclusively for the Yezidi community, respecting traditional values and the caste system.

## User Preferences
- **Testing**: User tests all changes manually — skip automated e2e testing

## Recent Changes
- **Lottie animations**: Installed `lottie-react`. 20 Lottie JSON files placed in `client/public/lottie/`. Created `LottieAnimation` component (`client/src/components/LottieAnimation.tsx`). Replaced static PNG gift images with Lottie animations in the gift picker and gift bubbles (ChatPage). MatchModal now shows `celebration.json` confetti + `valentine-hearts.json` between avatars. DiscoverPage shows `filling-heart.json` / `cute-broken-heart.json` overlay on like/dislike. LandingPage logo now has a floating `valentine-hearts.json` Lottie near the title. Removed `logo-flip` CSS animation from index.css.
- **Test users created**: layla.test@gustilk.com, sara.test@gustilk.com, dara.test@gustilk.com (all password: test1234). A match between admin and Layla is seeded in the DB.
- **Admin routing fixed (UserDetailPage)**: The root cause was wouter v3's wildcard route (`/admin/:rest*`) silently creating a nested routing context that stripped `/admin` from all paths seen by `useLocation`/`useRoute` inside AdminLayout. Fixed by rendering the admin panel **outside** the wouter Switch/Route entirely via a direct `isAdminRoute` location check in AppShell. AdminLayout now uses `useRoute()` hooks (not string parsing) for reliable sub-page matching.
- **Full Admin Panel (28 sub-pages)**: Lazy-loaded at `/admin/*`. Includes Dashboard, Users (paginated), User Detail, Approvals, Verification Queue, Reports, Moderation, Blacklist, Duplicates, Analytics (with daily bar chart), Payments, Promo Codes, Referrals, Notifications, Announcements, Email Templates, Feedback, Caste Management, Events, Success Stories, Translations, Team, Audit Logs, App Settings, App Store, Export (CSV), System Health, Backups. All backed by `server/admin-routes.ts` with 6 new DB tables.
- **Block feature complete**: Users can block/unblock others via ReportModal and from Settings → Blocked Users list. Routes: `POST /api/users/:userId/block`, `DELETE /api/users/:userId/block`, `GET /api/blocks`.

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
11. **Admin Panel** — verification queue + reports tab + photo moderation with rejection reason input + approve/reject/ban/resolve actions
12. **Match Modal** — dual-avatar display when match occurs
13. **Internationalization (i18n)** — 5 languages fully supported (en, ar, de, hy, ru); first-launch language picker; changeable from Profile settings; Arabic uses RTL layout. All pages use `useTranslation()`. All locale files fully updated with keys for: community guidelines modal (`agreement.sections` as returnObjects array, `agreement.guidelinesTitle/readCarefully/scrollToContinue/agreeButton/readFirst/footerWarning/footerHonour/guidelinesButtonTitle/guidelinesButtonAgreed/guidelinesButtonRequired/truthfulCheckbox`), setup form (`setup.detected/selectCountry/stateProvince/selectState/couldNotSave/minAge18/step2Title/step2Subtitle/profilePhotosLabel/photosRequired/photoBothRequired/selfieAdminNote/takeSelfie/selfieVisible/adminOnly/saving/selfieReady/selfieRequiredStatus`), auth toasts (`auth.errorTitle/codeSentTitle/codeSentDesc`). CommunityGuidelinesModal uses `t()` for all content. All hardcoded English strings replaced with `t()` calls in SocialSetupPage and LandingPage.

## Pages / Routes
- `/discover` — Swipeable profile cards
- `/matches` — New matches bubbles + conversation list (locked for non-premium)
- `/chat/:matchId` — Chat screen (locked overlay for non-premium)
- `/events` — Events list with type filter
- `/events/:eventId` — Event detail with RSVP
- `/profile` — My profile with photoSlots grid (approved/pending/rejected sections), settings menu
- `/profile/edit` — Edit profile
- `/premium` — Premium subscription with Iraq detection
- `/admin` — Admin verification queue, photo moderation, reports (isAdmin users only)
- **PendingApprovalPage** — inline page shown when profile is complete but no photos approved yet

## Photo System
- `photoSlots: PhotoSlot[]` — JSONB column on `users` table
- `PhotoSlot`: `{ url, status: "pending"|"approved"|"rejected", reason?, isMain? }`
- `mainPhotoUrl` — approved photo URL shown on discover cards
- `profileVisible` — set to `true` on first photo approval; gates discover feed
- Admin Photos tab: shows pending slots per user, optional rejection reason input, approve/reject sends email
- Profile page: 6-slot grid (approved + new uploads) + separate pending and rejected sections
- Setup: 3-slot grid, min 1 photo required

## Database Schema
- `users` — profiles with caste, gender, country, photos, photoSlots (JSONB), mainPhotoUrl, profileVisible, isPremium, isAdmin, verificationSelfie
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
All 5 languages fully translated — keys are in `client/src/i18n/locales/<lang>.ts`.
Each locale file contains these top-level sections: `lang`, `languagePicker`, `common`, `landing`, `auth`, `agreement`, `setup`, `discover`, `matches`, `chat`, `premium`, `profile`, `events`, `nav`, `admin`, `verification`, `report`, `settings`.

The `settings` section (added session 2025-02) covers: Settings page UI (menu titles, section headers), Notifications subscreen (toggle labels, toast messages), Community Guidelines subscreen (intro + 8th section — Account Suspension), Privacy Policy subscreen (intro + 5 policy sections).
The `profile` section now includes: `edit`, `preview`, `occupation`, `languages`, `savePhotos`, `savingPhotos`, `mainPhoto`, `aboutMe`, `howOthersSeeYou`, `previewNote`, `photoInstruction`, `photosUpdated`, `couldNotSavePhotos`.

## Running
```bash
npm run dev
```
Server + frontend served on port 5000.

## Deployment
- **Target**: VM (always-running, needed for WebSocket/real-time features)
- **Build command**: `npm run build`
- **Run command**: `bash -c "NODE_ENV=production node dist/index.cjs"`
- **Port**: 5000
- **Configured and ready to deploy**

## Native Mobile Apps (Capacitor)
Capacitor v7.5.0 is configured to wrap the web app as a native iOS/Android app.
- **Config**: `capacitor.config.ts` (app ID: `com.gustilk.app`)
- **Strategy**: `server.url: 'https://gustilk.com'` — WebView loads live server, all API calls work automatically
- **Web dir**: `dist/public` (output of `npm run build`)
- **Full local setup guide**: `MOBILE_SETUP.md`
- **To add native targets locally**: `npx cap add ios` (macOS only) / `npx cap add android`
- **To sync after build**: `npx cap sync`
- **To open in Xcode**: `npx cap open ios`
- **To open in Android Studio**: `npx cap open android`
- Packages installed: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/status-bar`, `@capacitor/splash-screen`

## Production Notes
- Session cookies use `Secure: true` in production (requires HTTPS, handled by Replit)
- Photo moderation uses OpenAI Vision via Replit AI Integrations
- Face detection for verification selfies uses OpenAI Vision
- Geo-IP country detection uses ipapi.co (free tier, no API key required)
- WebAuthn/biometric auth works on HTTPS (deployed app URL or gustilk.com)
