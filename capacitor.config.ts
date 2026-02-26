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
