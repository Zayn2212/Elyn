package com.elyn.aiassistant;

import androidx.appcompat.app.AppCompatDelegate;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Small bridge exposing AppCompatDelegate night-mode control to the web layer.
 *
 * BiometricPrompt renders with the Activity's current night mode, which is
 * driven by AppCompatDelegate.getDefaultNightMode(). Calling setDefaultNightMode
 * from JS right before we show the biometric prompt lets the prompt render in
 * the same light/dark theme the user picked inside the React app, rather than
 * whatever the device OS happens to be set to.
 *
 * We run on the UI thread because AppCompatDelegate documents that requirement.
 */
@CapacitorPlugin(name = "ThemeMode")
public class ThemeModePlugin extends Plugin {

    @PluginMethod
    public void setDarkMode(PluginCall call) {
        final boolean dark = call.getBoolean("dark", false);
        getActivity()
            .runOnUiThread(
                () -> {
                    AppCompatDelegate.setDefaultNightMode(
                        dark
                            ? AppCompatDelegate.MODE_NIGHT_YES
                            : AppCompatDelegate.MODE_NIGHT_NO
                    );
                    call.resolve();
                }
            );
    }
}
