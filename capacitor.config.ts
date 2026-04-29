import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.elyn.aiassistant",
  appName: "Elyn",
  webDir: "dist",
  server: {
    // ! IMPORTANT - FOR MIC TO WORK HOT RELOAD MUST BE DISABLED
    androidScheme: "https",
    iosScheme: "https",
    // url: "http://192.168.100.50:8080", // Dev server — uncomment only for UI live reload (breaks mic/getUserMedia on Android; must be commented out for release/device builds)
    cleartext: true,
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
    Keyboard: {
      // "native" resizes the WebView when the soft keyboard appears, so that
      // `100dvh` / `window.innerHeight` / `fixed inset-0` all reflect the
      // reduced viewport. This is what lets modals with `max-h-[100dvh]` +
      // `overflow-y-auto` automatically keep their content above the keyboard
      // without per-modal JS.
      resize: "native",
      // Fixes an Android bug where fullscreen activities (splash, edge-to-edge)
      // don't receive keyboard height correctly without this flag.
      resizeOnFullScreen: true,
    },
  },
};

export default config;
