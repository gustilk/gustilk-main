# Gûstîlk — Native Mobile App Setup (Capacitor)

This guide explains how to build the native iOS and Android apps from this codebase using [Capacitor](https://capacitorjs.com/).

---

## How it works

The native app is a thin native shell (WebView) that loads **https://gustilk.com** directly. This means:
- All API calls go to the live production server automatically
- No backend code changes needed
- App Store / Google Play distribution ready
- Looks and behaves identically to the web version

---

## Prerequisites

| Requirement | iOS | Android |
|---|---|---|
| Operating System | **macOS only** | macOS, Windows, or Linux |
| Tool required | Xcode 15+ | Android Studio (latest) |
| Account needed | Apple Developer ($99/yr) | Google Play Console ($25 one-time) |

> **iOS can only be built on a Mac.** There is no workaround — this is an Apple requirement.

---

## One-time local setup

### 1. Clone and install dependencies

```bash
git clone <your-replit-repo-url> gustilk
cd gustilk
npm install
```

### 2. Build the web frontend

```bash
npm run build
```

This produces `dist/public/` — the web files Capacitor packages into the native app.

### 3. Add the native platforms (first time only)

```bash
# iOS (macOS only)
npx cap add ios

# Android (any OS)
npx cap add android
```

This creates `ios/` and `android/` folders with the native Xcode/Gradle projects.

### 4. Sync web assets into the native projects

```bash
npx cap sync
```

Run this every time you change the web code (after `npm run build`).

---

## Building for iOS

```bash
npx cap open ios
```

This opens the project in **Xcode**. Then:

1. Select your Apple Developer Team in **Signing & Capabilities**
2. Change the bundle ID if needed (currently `com.gustilk.app`)
3. Select a device or simulator
4. Click the **Play ▶** button to build and run

**To submit to App Store:**
- Set version number in Xcode
- Product → Archive
- Upload via Xcode Organizer or Transporter

---

## Building for Android

```bash
npx cap open android
```

This opens the project in **Android Studio**. Then:

1. Wait for Gradle sync to finish
2. Click **Run ▶** to run on a device or emulator

**To submit to Google Play:**
- Build → Generate Signed Bundle/APK
- Choose "Android App Bundle" (AAB format, required by Google Play)
- Sign with your keystore
- Upload to Google Play Console

---

## Updating the app after code changes

Whenever you push new code to production (gustilk.com), the native app automatically serves the updated version — no app store update required, because the WebView loads live from the server.

If you change native config (icons, splash screen, permissions, plugins):

```bash
npm run build
npx cap sync
# Then rebuild in Xcode / Android Studio
```

---

## App Store / Play Store assets needed

- **App icon**: 1024×1024 PNG (no transparency for iOS)
- **Splash screen**: Various sizes — Capacitor auto-generates from source images
- **Screenshots**: At least 3 per device type
- **Privacy policy URL**: Required (you can host at gustilk.com/privacy)
- **Age rating**: 17+ (dating app)
- **Category**: Social Networking or Lifestyle

---

## Useful Capacitor commands

```bash
npx cap sync          # Sync web build → native projects
npx cap open ios      # Open Xcode
npx cap open android  # Open Android Studio
npx cap run ios       # Build and run on connected iOS device
npx cap run android   # Build and run on connected Android device
npx cap doctor        # Diagnose your environment setup
```

---

## Bundle ID / App ID

Current setting: **`com.gustilk.app`**

If you need to change it, edit `capacitor.config.ts` and update the bundle ID in Xcode (ios/App/App.xcodeproj) and Android (android/app/build.gradle) before the first build.

---

## Troubleshooting

**`npx cap sync` fails** → Make sure `dist/public` exists (`npm run build` first)

**iOS simulator doesn't show the app** → Check that Xcode Command Line Tools are installed (`xcode-select --install`)

**Android Gradle sync fails** → Open Android Studio's SDK Manager and install the required SDK version

**App shows blank screen** → gustilk.com must be deployed and accessible; the app loads from it
