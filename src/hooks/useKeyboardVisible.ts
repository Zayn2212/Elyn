import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

/**
 * Reports whether the on-screen keyboard is currently visible.
 *
 * On native platforms (iOS / Android) this subscribes to Capacitor's
 * keyboardWillShow / keyboardWillHide events — these fire *before* the
 * keyboard finishes animating, so UI that depends on `visible` updates
 * in lockstep with the keyboard animation, not after a jarring delay.
 *
 * On web it falls back to detecting a >= 15% drop in window.innerHeight,
 * the same heuristic used by BottomNav for auto-hide.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      const baseline = window.innerHeight;
      const onResize = () => {
        setVisible(window.innerHeight < baseline * 0.85);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    // Listen to both `will` and `did` events. Android's implementation of the
    // "will" events is best-effort (Android doesn't expose an IME pre-show
    // callback), so `did*` is the reliable signal there. iOS fires `will` first
    // which gives us a head start before the keyboard animation. Using both
    // covers both platforms without timing branches.
    const showWill = Keyboard.addListener("keyboardWillShow", () =>
      setVisible(true),
    );
    const showDid = Keyboard.addListener("keyboardDidShow", () =>
      setVisible(true),
    );
    const hideWill = Keyboard.addListener("keyboardWillHide", () =>
      setVisible(false),
    );
    const hideDid = Keyboard.addListener("keyboardDidHide", () =>
      setVisible(false),
    );
    return () => {
      showWill.then((l) => l.remove());
      showDid.then((l) => l.remove());
      hideWill.then((l) => l.remove());
      hideDid.then((l) => l.remove());
    };
  }, []);

  return visible;
}
