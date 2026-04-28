import { Capacitor } from "@capacitor/core";

// Set these in your RevenueCat dashboard after creating the app in
// App Store Connect and Google Play Console.
// Add VITE_REVENUECAT_IOS_KEY and VITE_REVENUECAT_ANDROID_KEY to your
// environment variables / .env file.
const RC_IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;
const RC_ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined;

// Must match the subscription product ID you create in App Store Connect
// (Subscriptions) and Google Play Console (Subscriptions).
export const PREMIUM_PRODUCT_ID = "com.gustilk.premium.monthly";

let initialized = false;

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initPurchases(): Promise<void> {
  if (!isNative() || initialized) return;
  const apiKey = Capacitor.getPlatform() === "ios" ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey) {
    console.warn("[purchases] RevenueCat API key not set — IAP will not work");
    return;
  }
  try {
    const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({ apiKey });
    initialized = true;
  } catch (err) {
    console.error("[purchases] init failed:", err);
  }
}

export async function purchasePremium(): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
  if (!isNative()) return { success: false, error: "IAP only available in the native app" };
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { current } = await Purchases.getOfferings();
    if (!current) {
      return { success: false, error: "No offerings available. Check App Store Connect / Google Play Console configuration." };
    }
    const pkg =
      current.availablePackages.find(p => p.product.identifier === PREMIUM_PRODUCT_ID) ??
      current.availablePackages[0];
    if (!pkg) return { success: false, error: "Premium package not found in store." };

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const isActive = !!customerInfo.entitlements.active["premium"];
    return { success: isActive };
  } catch (err: any) {
    if (err?.userCancelled) return { success: false, cancelled: true };
    return { success: false, error: err?.message ?? "Purchase failed." };
  }
}

export async function restoreIAPPurchases(): Promise<{ restored: boolean; error?: string }> {
  if (!isNative()) return { restored: false, error: "IAP only available in the native app" };
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.restorePurchases();
    const isActive = !!customerInfo.entitlements.active["premium"];
    return { restored: isActive };
  } catch (err: any) {
    return { restored: false, error: err?.message ?? "Restore failed." };
  }
}
