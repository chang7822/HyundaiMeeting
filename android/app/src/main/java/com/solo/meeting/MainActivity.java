package com.solo.meeting;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsCompat.Type;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import com.getcapacitor.WebViewListener;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;
import com.solo.meeting.AppSettingsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // WebView 디버깅 활성화 (항상 활성화)
        WebView.setWebContentsDebuggingEnabled(true);
        android.util.Log.d("MainActivity", "WebView 디버깅 활성화됨");

        registerPlugin(AppSettingsPlugin.class);

        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(android.webkit.WebView webView) {
                injectSafeAreaInsets(webView);
            }
        });

        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        // 상태바·네비바 흰색 (SafeArea 플러그인 initialViewportFitCover: false로 구간 분리)
        applyWhiteSystemBars();
        getWindow().getDecorView().post(() -> applyWhiteSystemBars());
        getWindow().getDecorView().postDelayed(() -> applyWhiteSystemBars(), 100);
        getWindow().getDecorView().postDelayed(() -> applyWhiteSystemBars(), 300);
        getWindow().getDecorView().postDelayed(() -> applyWhiteSystemBars(), 800);

        android.util.Log.d("MainActivity", "MainActivity onCreate 완료");
    }
    
    @Override
    public void onStart() {
        super.onStart();
        
        // AdMob SDK 초기화 (WebView 로드 전에 초기화)
        try {
            MobileAds.initialize(this, new OnInitializationCompleteListener() {
                @Override
                public void onInitializationComplete(InitializationStatus initializationStatus) {
                    android.util.Log.d("MainActivity", "AdMob SDK 초기화 완료");
                }
            });
            android.util.Log.d("MainActivity", "AdMob SDK 초기화 시작");
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "AdMob SDK 초기화 실패", e);
        }
    }
    
    @Override
    public void onResume() {
        super.onResume();
        applyWhiteSystemBars();
        getWindow().getDecorView().post(() -> applyWhiteSystemBars());
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                Bridge bridge = getBridge();
                if (bridge != null) {
                    WebView webView = bridge.getWebView();
                    if (webView != null) {
                        injectSafeAreaInsets(webView);
                        android.webkit.WebSettings webSettings = webView.getSettings();
                        if (webSettings != null) {
                            webSettings.setJavaScriptEnabled(true);
                            webSettings.setDomStorageEnabled(true);
                            webSettings.setDatabaseEnabled(true);
                        }
                    }
                }
            } catch (Exception e) {
                android.util.Log.e("MainActivity", "WebView 확인 중 오류 (onResume)", e);
            }
        }, 0);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyWhiteSystemBars();
    }

    private void applyWhiteSystemBars() {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            w.setStatusBarColor(Color.WHITE);
            w.setNavigationBarColor(Color.WHITE);
        }
    }

    private void injectSafeAreaInsets(WebView webView) {
        injectSafeAreaInsets(webView, 0);
    }

    private void injectSafeAreaInsets(WebView webView, int retry) {
        if (webView == null) return;
        View decorView = getWindow().getDecorView();
        float density = getResources().getDisplayMetrics().density;

        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decorView);
        int top = 0, bottom = 0, left = 0, right = 0;
        if (insets != null) {
            Insets systemBars = insets.getInsets(Type.systemBars() | Type.displayCutout());
            top = (int) (systemBars.top / density);
            bottom = (int) (systemBars.bottom / density);
            left = (int) (systemBars.left / density);
            right = (int) (systemBars.right / density);
        } else {
            top = (int) (decorView.getPaddingTop() / density);
            bottom = (int) (decorView.getPaddingBottom() / density);
        }
        if (top == 0 && bottom == 0 && retry < 5) {
            new Handler(Looper.getMainLooper()).postDelayed(() -> injectSafeAreaInsets(webView, retry + 1), 250);
            return;
        }
        if (top > 80) top = 24;
        if (bottom > 96) bottom = 48;

        String js = "document.documentElement.style.setProperty('--native-safe-area-inset-top','" + top + "px');"
                + "document.documentElement.style.setProperty('--native-safe-area-inset-bottom','" + bottom + "px');"
                + "document.documentElement.style.setProperty('--native-safe-area-inset-left','" + left + "px');"
                + "document.documentElement.style.setProperty('--native-safe-area-inset-right','" + right + "px');";
        webView.evaluateJavascript(js, null);
    }
}
