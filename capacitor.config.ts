import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.elyn.aiassistant",
  appName: "Elyn",
  webDir: "dist",
  server: {
    // ! IMPORTANT - FOR MIC TO WORK HOT RELOAD MUST BE DISABLED
    androidScheme: "https",
    iosScheme: "https",
    url: "http://192.168.100.30:8080", // Localhost always works — no mixed content
    cleartext: true,
    // url: "http://192.168.100.30:8080", // HTTP blocks getUserMedia — uncomment only for UI live reload (breaks mic)
    // url: "http://192.168.100.27:8080", // Dev server — uncomment only for live reload (breaks mic/getUserMedia on Android)
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#041230",
      showSpinner: false,
      launchFadeOutDuration: 500,
      splashImmersive: true,
      splashFullScreen: true,
    },
  },
};

export default config;
