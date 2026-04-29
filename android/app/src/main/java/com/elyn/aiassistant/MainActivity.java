package com.elyn.aiassistant;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins before super.onCreate so Capacitor can wire
        // them into the bridge during its own init.
        registerPlugin(ThemeModePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
