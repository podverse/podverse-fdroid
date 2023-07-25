package com.podverse.fdroid;

import com.facebook.react.ReactActivity;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

import android.os.Bundle;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;

import org.json.JSONException;
import org.json.JSONObject;

public class MainActivity extends ReactActivity {
    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "podverse";
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(null);

        if(getResources().getBoolean(R.bool.portrait_only)){
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        Intent intent = new Intent("onConfigurationChanged");
        intent.putExtra("newConfig", newConfig);
        this.sendBroadcast(intent);
    }

    @Override
    public void onNewIntent(Intent intent) {
        if (intent == null || intent.getExtras() == null) {
            super.onNewIntent(intent);
            return;
        }

        Bundle extras = intent.getExtras();

        int messageId = extras.getInt("pv_message_id", -1);
        if (messageId == -1) {
            super.onNewIntent(intent);
            return;
        }

        String instance = extras.getString("up_instance", null);
        if (instance == null) {
            super.onNewIntent(intent);
            return;
        }

        String notificationString = PVUnifiedPushModule.popNotification(this, messageId);
        JSONObject notificationJson;
        try {
            notificationJson = new JSONObject(notificationString);
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }

        WritableMap eventMap = new WritableNativeMap();
        try {
            eventMap.putMap("data", PVUnifiedPushModule.jsonToReact(notificationJson));
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }

        PVUnifiedPushModule.setInitialNotification(eventMap);

        PVUnifiedPushModule.emitEvent(this, "UnifiedPushMessage", instance, notificationString);
    }
}
