# Android APK/AAB 빌드 및 Google Play Store 등록 가이드

## 📋 사전 준비사항

1. **Java JDK 설치** (Java 21 필요)
2. **Android Studio 설치** (선택사항, 명령줄로도 가능)
3. **Google Play Console 계정** (등록비 $25 일회성)

---

## 1단계: 서명 키 생성

Google Play Store에 앱을 등록하려면 서명 키가 필요합니다.

### Windows에서 키 생성:

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release-key.jks -alias release-key -keyalg RSA -keysize 2048 -validity 10000
```

**참고:** `keytool`이 PATH에 없으면 JDK 설치 경로에서 실행:
```bash
"C:\Program Files\Java\jdk-21\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore release-key.jks -alias release-key -keyalg RSA -keysize 2048 -validity 10000
```

**입력 정보:**
- 비밀번호: 안전한 비밀번호 입력 (나중에 필요하니 반드시 기록!)
- 이름, 조직 등: 앱 정보 입력

**⚠️ 중요:** `release-key.jks` 파일과 비밀번호는 **절대 분실하면 안 됩니다!** Google Play Store 업데이트 시 계속 필요합니다.

### 키 정보를 안전하게 보관:
- `release-key.jks` 파일 백업
- 비밀번호 안전한 곳에 기록
- `.gitignore`에 이미 추가되어 있음 (확인됨)

---

## 2단계: 서명 설정 파일 생성

`android/keystore.properties` 파일을 생성하세요:

```properties
storeFile=app/release-key.jks
keyAlias=release-key
storePassword=여기에_비밀번호_입력
keyPassword=여기에_비밀번호_입력
```

또는 (호환성을 위해):

```properties
MYAPP_RELEASE_STORE_FILE=app/release-key.jks
MYAPP_RELEASE_KEY_ALIAS=release-key
MYAPP_RELEASE_STORE_PASSWORD=여기에_비밀번호_입력
MYAPP_RELEASE_KEY_PASSWORD=여기에_비밀번호_입력
```

**⚠️ 보안:** 이 파일은 `.gitignore`에 추가되어 있어야 합니다. (이미 추가됨)

---

## 3단계: build.gradle에 서명 설정 추가

`android/app/build.gradle` 파일 상단에 다음을 추가:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

그리고 `android` 블록 내부에 `signingConfigs` 추가 (이미 추가됨)

---

## 4단계: 웹 빌드 및 Capacitor 동기화

```bash
# 1. 웹 앱 빌드
npm run build

# 2. Capacitor로 Android 프로젝트에 복사
npx cap sync android
```

---

## 5단계: APK 또는 AAB 빌드

### 방법 A: 명령줄로 빌드 (권장)

#### Release APK 빌드:

**Windows:**
```bash
cd android
gradlew.bat assembleRelease
```

**Mac/Linux:**
```bash
cd android
./gradlew assembleRelease
```

빌드된 APK 위치:
- `android/app/build/outputs/apk/release/app-release.apk`

#### Release AAB 빌드 (Google Play Store 권장):

**Windows:**
```bash
cd android
gradlew.bat bundleRelease
```

**Mac/Linux:**
```bash
cd android
./gradlew bundleRelease
```

빌드된 AAB 위치:
- `android/app/build/outputs/bundle/release/app-release.aab`

### 방법 B: Android Studio로 빌드

1. Android Studio에서 `android` 폴더 열기
2. **Build** → **Generate Signed Bundle / APK**
3. **Android App Bundle** 선택 (또는 APK)
4. 서명 키 정보 입력
5. 빌드 완료

---

## 6단계: Google Play Console 설정

### 6-1. Google Play Console 접속
- https://play.google.com/console 접속
- 개발자 계정 생성 ($25 일회성)

### 6-2. 앱 생성
1. **앱 만들기** 클릭
2. 앱 이름: "직쏠공"
3. 기본 언어: 한국어
4. 앱 또는 게임: 앱
5. 무료 또는 유료: 선택

### 6-3. 앱 정보 입력
- **앱 액세스 권한**: 필요한 권한 설정
- **광고**: AdMob 사용 중이면 "예" 선택
- **콘텐츠 등급**: 설문 작성 (일반적으로 "12세 이상")
- **대상 사용자 및 콘텐츠**: 설정

### 6-4. 스토어 등록 정보
- **앱 이름**: "직쏠공"
- **짧은 설명**: (50자 이내)
- **전체 설명**: (4000자 이내)
- **그래픽 자산**:
  - 앱 아이콘: 512x512px PNG
  - 기능 그래픽: 1024x500px (선택)
  - 스크린샷: 최소 2개 (휴대전화용)
  - 고해상도 아이콘: 512x512px

### 6-5. 앱 버전 관리
- **버전 코드**: `android/app/build.gradle`의 `versionCode` (현재: 1)
- **버전 이름**: `versionName` (현재: "1.0")

---

## 7단계: AAB 업로드

1. Google Play Console → **프로덕션** (또는 **내부 테스트**)
2. **새 버전 만들기** 클릭
3. **AAB 파일 업로드** 클릭
4. `app-release.aab` 파일 선택
5. **릴리스 노트** 작성 (선택사항)
6. **저장** → **검토 후 출시**

---

## 8단계: 앱 검토 및 출시

### 검토 과정:
- Google이 앱을 검토합니다 (보통 1-3일)
- 정책 위반 사항이 없으면 승인됩니다

### 출시:
- 검토 통과 후 **출시** 버튼 클릭
- 앱이 Google Play Store에 게시됩니다!

---

## 🔄 업데이트 시 절차

앱을 업데이트할 때마다:

1. `android/app/build.gradle`에서 버전 업데이트:
   ```gradle
   versionCode 2  // 이전보다 큰 숫자
   versionName "1.1"  // 사용자에게 보이는 버전
   ```

2. 웹 빌드 및 동기화:
   ```bash
   npm run build
   npx cap sync android
   ```

3. AAB 빌드:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

4. Google Play Console에 새 버전 업로드

---

## ⚠️ 주의사항

1. **서명 키 보관**: `release-key.jks` 파일과 비밀번호는 절대 분실하면 안 됩니다!
2. **버전 코드**: 항상 이전 버전보다 큰 숫자여야 합니다.
3. **테스트**: 내부 테스트 트랙에서 먼저 테스트하세요.
4. **정책 준수**: Google Play 정책을 확인하세요.
5. **개인정보 처리방침**: 앱에서 수집하는 데이터가 있으면 개인정보 처리방침 URL이 필요합니다.

---

## 🐛 문제 해결

### 빌드 오류:
```bash
# Gradle 캐시 정리
cd android
./gradlew clean
```

### 서명 오류:
- `keystore.properties` 파일 경로 확인
- 비밀번호 확인
- 키 파일 경로 확인

### Capacitor 동기화 오류:
```bash
npx cap sync android --force
```

---

## 📚 참고 자료

- [Google Play Console](https://play.google.com/console)
- [Capacitor Android 가이드](https://capacitorjs.com/docs/android)
- [Android 앱 서명](https://developer.android.com/studio/publish/app-signing)

