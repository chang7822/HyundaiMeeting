package com.solo.meeting;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
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
}
