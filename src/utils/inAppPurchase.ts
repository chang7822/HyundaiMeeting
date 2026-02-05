/**
 * 인앱결제 (RevenueCat) 유틸리티
 * 
 * 설치 완료: @revenuecat/purchases-capacitor@12.1.1
 * 
 * 나중에 활성화 방법:
 * 1. RevenueCat 대시보드에서 프로젝트 생성 및 API 키 발급
 * 2. App Store Connect / Google Play Console에서 상품 등록
 * 3. 이 파일의 initialize() 함수에서 주석 해제
 * 4. 웹 서버 업데이트만 하면 자동 반영! (앱 재배포 불필요)
 */

import { Capacitor } from '@capacitor/core';

// RevenueCat 타입 및 모듈 (동적 import)
let Purchases: any = null;
let LOG_LEVEL: any = null;

/**
 * 인앱결제 시스템 초기화
 * @param enabled - 서버에서 받은 활성화 플래그
 * @param apiKey - RevenueCat API 키 (iOS/Android 공통)
 */
export const initializeIAP = async (enabled: boolean, apiKey?: string) => {
  // 네이티브 앱이 아니면 초기화 안 함
  if (!Capacitor.isNativePlatform()) {
    console.log('[IAP] Web platform - IAP not available');
    return false;
  }

  // 서버에서 비활성화했으면 초기화 안 함
  if (!enabled) {
    console.log('[IAP] IAP feature disabled by server');
    return false;
  }

  // API 키가 없으면 초기화 안 함
  if (!apiKey) {
    console.log('[IAP] API key not provided');
    return false;
  }

  try {
    // RevenueCat 모듈 동적 로드
    const module = await import('@revenuecat/purchases-capacitor');
    Purchases = module.Purchases;
    LOG_LEVEL = module.LOG_LEVEL;

    // 디버그 모드 설정 (프로덕션에서는 WARNING으로 변경)
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

    // RevenueCat 초기화
    await Purchases.configure({
      apiKey: apiKey,
      // appUserID는 선택사항 (자동으로 익명 ID 생성됨)
      // appUserID: userId
    });

    console.log('[IAP] ✅ RevenueCat initialized successfully');
    return true;
  } catch (error) {
    console.error('[IAP] ❌ Failed to initialize RevenueCat:', error);
    return false;
  }
};

/**
 * 사용 가능한 상품 목록 가져오기
 * @returns 상품 목록 (Offerings)
 */
export const getOfferings = async () => {
  if (!Purchases) {
    console.warn('[IAP] Not initialized');
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    console.log('[IAP] Available offerings:', offerings);
    return offerings;
  } catch (error) {
    console.error('[IAP] Failed to get offerings:', error);
    return null;
  }
};

/**
 * 상품 구매
 * @param packageToPurchase - 구매할 패키지
 * @returns 구매 결과
 */
export const purchasePackage = async (packageToPurchase: any) => {
  if (!Purchases) {
    console.warn('[IAP] Not initialized');
    return null;
  }

  try {
    const purchaseResult = await Purchases.purchasePackage({
      aPackage: packageToPurchase,
    });
    
    console.log('[IAP] ✅ Purchase successful:', purchaseResult);
    return purchaseResult;
  } catch (error: any) {
    if (error?.userCancelled) {
      console.log('[IAP] User cancelled purchase');
    } else {
      console.error('[IAP] ❌ Purchase failed:', error);
    }
    return null;
  }
};

/**
 * 구매 복원 (이전에 구매한 항목 복원)
 * @returns 복원 결과
 */
export const restorePurchases = async () => {
  if (!Purchases) {
    console.warn('[IAP] Not initialized');
    return null;
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log('[IAP] ✅ Purchases restored:', customerInfo);
    return customerInfo;
  } catch (error) {
    console.error('[IAP] ❌ Failed to restore purchases:', error);
    return null;
  }
};

/**
 * 현재 사용자의 구독/구매 정보 가져오기
 * @returns 고객 정보
 */
export const getCustomerInfo = async () => {
  if (!Purchases) {
    console.warn('[IAP] Not initialized');
    return null;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('[IAP] Customer info:', customerInfo);
    return customerInfo;
  } catch (error) {
    console.error('[IAP] Failed to get customer info:', error);
    return null;
  }
};

/**
 * 사용자 ID 설정 (로그인 후 호출)
 * @param userId - 사용자 ID
 */
export const identifyUser = async (userId: string) => {
  if (!Purchases) {
    console.warn('[IAP] Not initialized');
    return false;
  }

  try {
    await Purchases.logIn({ appUserID: userId });
    console.log('[IAP] ✅ User identified:', userId);
    return true;
  } catch (error) {
    console.error('[IAP] Failed to identify user:', error);
    return false;
  }
};

/**
 * 로그아웃 (익명 사용자로 전환)
 */
export const logoutUser = async () => {
  if (!Purchases) {
    console.warn('[IAP] Not initialized');
    return false;
  }

  try {
    await Purchases.logOut();
    console.log('[IAP] ✅ User logged out');
    return true;
  } catch (error) {
    console.error('[IAP] Failed to logout user:', error);
    return false;
  }
};

/* 
 * ========================================
 * 나중에 활성화할 때 사용 예시
 * ========================================
 * 
 * 1. App.tsx 또는 AuthContext에서 초기화:
 * 
 * useEffect(() => {
 *   const initIAP = async () => {
 *     // 서버에서 기능 플래그 가져오기
 *     const settings = await systemApi.getFeatureFlags();
 *     
 *     if (settings.inAppPurchase?.enabled) {
 *       await initializeIAP(true, settings.inAppPurchase.apiKey);
 *     }
 *   };
 *   
 *   initIAP();
 * }, []);
 * 
 * 2. 상품 목록 표시:
 * 
 * const offerings = await getOfferings();
 * const currentOffering = offerings?.current;
 * 
 * if (currentOffering) {
 *   currentOffering.availablePackages.forEach(pkg => {
 *     console.log(`상품: ${pkg.product.title} - ${pkg.product.priceString}`);
 *   });
 * }
 * 
 * 3. 구매 처리:
 * 
 * const handlePurchase = async (pkg) => {
 *   const result = await purchasePackage(pkg);
 *   if (result) {
 *     // 구매 성공! 백엔드에 알려서 별 지급
 *     await starApi.purchaseComplete(result);
 *   }
 * };
 * 
 * 4. 로그인 시 사용자 연동:
 * 
 * await identifyUser(user.id);
 * 
 * 5. 로그아웃 시:
 * 
 * await logoutUser();
 */
