package com.fycsstudyhub.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static String pendingUri = null;
    private static String pendingType = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register Javascript Interface for cold starts
        getBridge().getWebView().post(new Runnable() {
            @Override
            public void run() {
                getBridge().getWebView().addJavascriptInterface(new Object() {
                    @android.webkit.JavascriptInterface
                    public String getPendingShare() {
                        if (pendingUri != null) {
                            String result = pendingUri + "|" + pendingType;
                            pendingUri = null;
                            pendingType = null;
                            return result;
                        }
                        return null;
                    }
                }, "AndroidShareHandler");
            }
        });

        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            Uri fileUri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (fileUri != null) {
                pendingUri = fileUri.toString();
                pendingType = type;

                // Also trigger event in case app is already running
                final String js = "window.dispatchEvent(new CustomEvent('appSendIntent', { detail: { uri: '" + pendingUri + "', type: '" + pendingType + "' } }));";
                getBridge().getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        getBridge().getWebView().evaluateJavascript(js, null);
                    }
                });
            }
        }
    }
}

