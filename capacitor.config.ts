import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gustilk.app",
  appName: "Gûstîlk",
  webDir: "dist/public",

  server: {
    url: "https://gustilk.com",
    cleartext: false,
  },

  plugins: {
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0d0618",
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0d0618",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    Camera: {
      // Prompt text shown on iOS when requesting camera/photo library access
      ios: {
        usageDescription: "Gûstîlk uses your camera for profile photos, verification selfies, and video calls.",
        photoLibraryUsageDescription: "Gûstîlk accesses your photo library so you can upload profile photos.",
        photoLibraryAddOnlyUsageDescription: "Gûstîlk can save photos to your library.",
        microphoneUsageDescription: "Gûstîlk uses your microphone for video calls with your matches.",
      },
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },

  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#0d0618",
  },

  android: {
    backgroundColor: "#0d0618",
  },
};

export default config;
