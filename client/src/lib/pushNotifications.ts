import { Capacitor } from "@capacitor/core";

/**
 * Register for push notifications and route taps to the correct in-app screen.
 * Call once on app startup after the user is confirmed authenticated.
 *
 * Requires:
 *  - iOS: APNs certificate uploaded to App Store Connect
 *  - Android: google-services.json added to android/app/
 *  - Server: FIREBASE_SERVICE_ACCOUNT or APNS_KEY env vars for sending
 */
export async function initPushNotifications(onNavigate: (path: string) => void): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return;

    await PushNotifications.register();

    // Send device token to backend so server can send targeted pushes
    PushNotifications.addListener("registration", async ({ value: token }) => {
      try {
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
        });
      } catch {}
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] registration error:", err);
    });

    // When user taps a notification, navigate to the relevant screen
    PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const data = notification.data as Record<string, string> | undefined;
      if (!data) return;
      if (data.matchId) onNavigate(`/chat/${data.matchId}`);
      else if (data.path) onNavigate(data.path);
      else onNavigate("/matches");
    });
  } catch (err) {
    console.error("[push] init failed:", err);
  }
}
