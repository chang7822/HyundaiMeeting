package com.solo.meeting;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // WebView 디버깅 활성화 (항상 활성화)
        WebView.setWebContentsDebuggingEnabled(true);
        android.util.Log.d("MainActivity", "WebView 디버깅 활성화됨");
        
        super.onCreate(savedInstanceState);
        
        // AdMob SDK 초기화는 onStart()에서 WebView가 완전히 로드된 후에 수행
        
        // API URL 확인을 위한 로그
        android.util.Log.d("MainActivity", "MainActivity onCreate 완료");
        
        // 상태바 높이만큼 CoordinatorLayout에 패딩 추가
        View rootView = findViewById(android.R.id.content);
        if (rootView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, windowInsets) -> {
                Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
                int statusBarHeight = insets.top;
                
                // CoordinatorLayout 찾아서 패딩 추가
                if (rootView instanceof ViewGroup) {
                    ViewGroup rootGroup = (ViewGroup) rootView;
                    for (int i = 0; i < rootGroup.getChildCount(); i++) {
                        View child = rootGroup.getChildAt(i);
                        if (child instanceof CoordinatorLayout) {
                            CoordinatorLayout coordinatorLayout = (CoordinatorLayout) child;
                            if (statusBarHeight > 0) {
                                coordinatorLayout.setPadding(
                                    coordinatorLayout.getPaddingLeft(),
                                    statusBarHeight,
                                    coordinatorLayout.getPaddingRight(),
                                    coordinatorLayout.getPaddingBottom()
                                );
                            }
                            break;
                        }
                    }
                }
                
                return windowInsets;
            });
        }
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
        
        // WebView가 완전히 로드된 후 JavaScript 인터페이스 명시적 활성화
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                try {
                    Bridge bridge = getBridge();
                    if (bridge != null) {
                        WebView webView = bridge.getWebView();
                        if (webView != null) {
                            android.util.Log.d("MainActivity", "WebView 인스턴스 확인됨 (onResume)");
                            
                            // WebView JavaScript 인터페이스 명시적 활성화
                            android.webkit.WebSettings webSettings = webView.getSettings();
                            if (webSettings != null) {
                                webSettings.setJavaScriptEnabled(true);
                                webSettings.setDomStorageEnabled(true);
                                webSettings.setDatabaseEnabled(true);
                                android.util.Log.d("MainActivity", "WebView JavaScript 및 스토리지 활성화 완료");
                            }
                            
                            // WebView가 완전히 로드되었는지 확인
                            if (webView.getUrl() != null && !webView.getUrl().isEmpty()) {
                                android.util.Log.d("MainActivity", "WebView URL: " + webView.getUrl());
                                android.util.Log.d("MainActivity", "WebView 준비 완료 - AdMob 플러그인 사용 가능");
                            } else {
                                android.util.Log.w("MainActivity", "WebView URL이 아직 설정되지 않음");
                            }
                        } else {
                            android.util.Log.w("MainActivity", "WebView 인스턴스를 가져올 수 없음 (onResume)");
                        }
                    } else {
                        android.util.Log.w("MainActivity", "Bridge 인스턴스를 가져올 수 없음 (onResume)");
                    }
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "WebView 확인 중 오류 (onResume)", e);
                }
            }
        }, 1000); // 1초 후 WebView 확인
    }
}
