# 나이테 개발 정리

## 1. 구현 범위

플립북 15장 기준으로 구현한 것과 남은 것입니다.

| 플립북 | 상태 | 비고 |
|---|---|---|
| 03 시작일 | 구현 | 오늘 / 올해 1월 1일 중 선택, 1,826개의 오늘 표시 |
| 04 습관 설정 | 구현 | 알림 시간(30분 단위), 질문 방식, **비밀번호 잠금**(Face ID 대신) |
| 05 오늘 탭 | 구현 | 다섯 칸 스택, 연도 색, 좌우 스와이프, 날짜 길게 눌러 오늘로 |
| 06 쓰기 | 구현 | 자동 저장, 300자 권장, 작년 답 접힘, 태그 추천, 기분, 사진 1장, 질문 바꾸기, 새벽 3시 기준 |
| 07 저장 순간 | 구현 | 나이테 애니메이션(동작 줄이기 대응), 올해 기록 일수, 겹친 말 |
| 08 지난 해 읽기·답장 | 구현 | 7일 후 원문 잠금, 답장(쓴 해의 색), ↑↓ 다른 해 이동 |
| 09 나이테 보기 | 구현 | 5겹 원, 누르면 그 날짜로 이동, 기록 일수·다섯 칸이 찬 날·빈 달 |
| 10 반복 발견 | 구현 | 반복 태그·연속 해, 기분 그래프, 같은 질문의 답, 1년 전 이번 주 |
| 11 연례 행사 | 일부 | 정확히 / ±7일 범위 구현. **요일 규칙(셋째 주말)·음력은 미구현** |
| 12 놓친 날 | 구현 | 7일 이내 채우기(나중에 씀 표시), 그 이전은 한 줄 기억 메모 |
| 13 완주 | 일부 | 연도 회고 카드, 5년 이후 다음 사이클 자동 시작. **PDF 책 만들기·인쇄 주문은 미구현** |
| 14 데이터 | 일부 | 로컬 저장, JSON 내보내기. **클라우드 백업·가져오기는 미구현** |
| 06 날씨·동네 자동 기록 | 미구현 | 위치 권한과 날씨 API가 필요해서 제외 |
| 종이 다이어리 사진 가져오기 | 미구현 | |

## 2. 네이티브 프로젝트 (Android Studio / Xcode)

`android/`와 `ios/`는 `npx expo prebuild`로 만든 네이티브 프로젝트이고, 저장소에 커밋돼 있습니다.

| 도구 | 여는 방법 |
|---|---|
| Android Studio | `npm install` 후 `android/` 폴더를 열기. Gradle 동기화가 끝나면 ▶ 실행 |
| Xcode (Mac) | `npm install` → `npm run ios:open` (`pod install` 후 `ios/app.xcworkspace`를 엶). 직접 열 때도 `.xcodeproj`가 아니라 `.xcworkspace`를 여세요. 실기기 실행은 Signing & Capabilities에서 Team을 고르기 |

iOS는 React Native를 미리 빌드된 파일로 받지 않고 소스에서 빌드합니다(`app.json`의 `expo-build-properties` → `ios.buildReactNativeFromSource`). 회사망이나 VPN에서 `pod install`이 `React-Core-prebuilt` 다운로드에서 멈추는 문제를 피하려는 설정입니다. 대신 Xcode 첫 빌드가 10~20분 더 걸립니다. 다운로드가 잘 되는 환경이면 이 값을 지우고 prebuild를 다시 실행하면 빨라집니다.

JavaScript 엔진 Hermes도 같은 이유로 Maven에서 내려받지 않고, GitHub의 `facebook/hermes` 소스(React Native가 정한 태그)를 받아 빌드합니다. `plugins/with-ios-hermes-from-source.js`가 `Podfile.properties.json`에 `ios.buildHermesFromSource`를 넣고, `Podfile`에서 `RCT_BUILD_HERMES_FROM_SOURCE=true`를 켭니다. 이 빌드에는 **CMake**가 필요합니다(`brew install cmake`).

이 두 소스 빌드 설정은 **로컬 Mac에서만** 적용됩니다. GitHub Actions(`app-release.yml`)와 EAS Build(`eas.json`)에서는 `pod install` 전에 `RCT_USE_RN_DEP=1`, `RCT_USE_PREBUILT_RNCORE=1`, `RCT_BUILD_HERMES_FROM_SOURCE=false`를 넣어 미리 빌드된 파일을 씁니다. `Podfile`이 이 값들을 `||=`로 정해서, 미리 넣은 환경변수가 우선합니다. 로컬에서도 빠르게 빌드하고 싶으면 같은 환경변수를 붙여 `pod install`을 실행하세요. 끄려면 `app.json`의 plugins에서 이 플러그인을 `["./plugins/with-ios-hermes-from-source", { "enabled": false }]`로 바꾸고 prebuild를 다시 실행하세요.

두 도구 모두 개발용 JS 번들을 받아오려면 터미널에서 `npx expo start`를 먼저 켜 두세요. 또는 `npm run android` / `npm run ios`로 빌드와 실행을 한 번에 할 수 있습니다.

`app.xcodeproj`만 열면 빌드되지 않습니다. React Native와 대부분의 Expo 모듈이 CocoaPods로만 연결되고, CocoaPods는 `pod install` 때 만드는 `app.xcworkspace`를 통해서만 프로젝트에 붙습니다.

`app.json`에서 이름·아이콘·권한·플러그인 같은 네이티브 설정을 바꿨다면 `npx expo prebuild --platform all --no-install`로 프로젝트 파일에 반영하고 그 변경을 커밋하세요. 네이티브 폴더를 직접 고친 뒤에는 `--clean`을 쓰지 마세요. 직접 고친 내용이 지워집니다.

### 반응형 화면

화면 폭 768px 이상(태블릿, 가로 화면, 데스크톱 브라우저)에서는 넓은 레이아웃을 씁니다. 기준값과 콘텐츠 최대 폭은 `src/hooks/use-layout.ts`에 있습니다.

| 화면 | 폰 | 넓은 화면 |
|---|---|---|
| 오늘 | 다섯 칸을 세로로 | 왼쪽에 날짜·질문·올해 칸, 오른쪽에 다른 해 (본문 4~6줄까지) |
| 나이테 | 원 아래 통계 | 1000px 이상이거나 가로 화면이면 원과 통계를 나란히, 세로 태블릿은 큰 원 아래 통계 |
| 발견 | 카드를 세로로 | 카드를 두 열로 (`Columns`) |
| 나머지 | 전체 폭 | 읽기 좋은 폭(560~720px)으로 가운데 정렬 |

iPad와 가로 회전을 지원합니다(`app.json`의 `ios.supportsTablet`, `orientation: "default"`).

## 3. 데이터베이스

서버 DB는 없습니다. 모든 기록은 기기 안의 SQLite 파일 `naite.db`(expo-sqlite)에 저장됩니다. 스키마는 `src/lib/db.ts`의 `MIGRATIONS` 배열로 관리하고 `PRAGMA user_version`으로 버전을 추적합니다. 스키마를 바꿀 때는 기존 항목을 고치지 말고 배열 끝에 새 마이그레이션을 추가하세요.

| 테이블 | 키 | 내용 |
|---|---|---|
| `entries` | `date` (YYYY-MM-DD) | 하루 기록. `md`(MM-DD), `year`, `kind`(`entry`/`memo`), `question`(쓸 때의 질문), `text`, `mood`(1~5), `tags`(JSON 배열), `photo`(앱 내부 파일 URI), `late`, `written_at`(7일 잠금 기준), `updated_at` |
| `replies` | `id` | 지난 기록에 단 답장. `date`, `from_year`, `text` |
| `anniversaries` | `id` | 연례 행사. `title`, `md`, `kind`(`exact`/`range`), `range_days`, `source_date` |
| `custom_questions` | `md` | 사용자가 바꾼 질문. 다음 해에도 유지 |
| `settings` | `key` | 시작일, 알림, 질문 방식, 잠금 여부 등 |

- 사진은 DB가 아니라 앱 문서 폴더 `photos/`에 복사해 두고 경로만 저장합니다.
- 비밀번호는 DB에 넣지 않습니다. 솔트를 붙여 SHA-256을 300번 반복한 해시만 iOS Keychain / Android Keystore(expo-secure-store)에 저장합니다. 5번 틀리면 30초부터 최대 15분까지 대기 시간이 늘어납니다.
- 비밀번호를 잊으면 복구할 수 없습니다(서버가 없어서). 앱을 삭제 후 재설치하면 새로 시작됩니다.

## 4. 배포 (EAS)

빌드·서명·스토어 제출은 Expo의 EAS로 합니다. 설정은 `eas.json`, 실행은 GitHub Actions의 **Release** 워크플로(수동 실행)입니다. 아래는 계정 소유자만 할 수 있어서 직접 해야 하는 일입니다.

### 한 번만 하면 되는 준비

1. **Expo 계정** 만들기 → 로컬에서 `npx eas-cli@latest login` → `npx eas-cli@latest init`  
   `app.json`에 `extra.eas.projectId`가 추가됩니다. 이 변경을 커밋하세요.
2. **Apple Developer Program** 가입(연 USD 99) → App Store Connect에서 번들 ID `com.hbyim.naite`로 앱 생성.  
   `npx eas-cli@latest credentials -p ios`로 인증서·프로비저닝 프로파일을 EAS에 등록하고, 제출용 App Store Connect API 키를 등록합니다.
3. **Google Play Console** 가입(1회 USD 25) → 패키지 `com.hbyim.naite`로 앱 생성.  
   Google은 **첫 AAB 업로드를 콘솔에서 직접** 해야 합니다(`eas build -p android --profile production` 결과물). 이후 자동 제출용 서비스 계정 JSON 키를 만들어 `npx eas-cli@latest credentials -p android`로 등록합니다.
4. **GitHub 저장소 시크릿** `EXPO_TOKEN` 추가(Expo 웹 → Account settings → Access tokens).
5. 번들 ID/패키지 이름을 바꾸고 싶으면 2·3번 전에 `app.json`에서 바꾸세요. 스토어에 한 번 올리면 바꿀 수 없습니다.

### 배포하기

- GitHub → Actions → **Release (EAS build + store submit)** → Run workflow  
  - `production`: 스토어용 빌드 후 자동 제출 (iOS는 TestFlight, Android는 내부 테스트 트랙에 초안으로)  
  - `preview`: 내부 배포용 빌드(Android APK, iOS 등록 기기용)
- 심사 제출은 App Store Connect / Play Console에서 직접 합니다.

### 스토어 심사에 필요한 것

- 개인정보처리방침 URL (수집 항목 없음, 모든 데이터 기기 저장으로 작성)
- iOS 개인정보 라벨: "데이터를 수집하지 않음"
- Google Play 데이터 보안 양식: 수집·공유 없음
- 스크린샷(6.7"/6.5" iPhone, Android 휴대폰), 앱 설명, 지원 URL
- 사진 권한 문구는 `app.json`의 `expo-image-picker` 설정에 있습니다.

### 설치 파일 (GitHub Releases)

`.github/workflows/app-release.yml`이 GitHub의 빌드 서버에서 두 가지를 만듭니다. Expo 계정이나 스토어 계정은 필요 없습니다.

| 파일 | 내용 |
|---|---|
| `naite-<버전>-android.apk` | Android 폰에 바로 설치할 수 있는 APK (React Native 기본 디버그 키로 서명) |
| `naite-<버전>-ios-simulator.zip` | Mac의 iOS 시뮬레이터용 앱. Apple 서명이 없어서 실제 iPhone에는 설치되지 않음 |

- PR을 열면 두 파일을 빌드만 하고, 실행 결과의 Artifacts에 첨부합니다.
- Actions → **App builds (GitHub Releases)** → Run workflow(main)를 실행하거나 `v1.0.1` 같은 태그를 푸시하면 Release를 만들어 파일을 올립니다. 수동 실행의 태그 이름은 `app.json`의 `version`을 따르므로, 새 Release를 만들려면 버전을 먼저 올리세요.
- APK는 Play 스토어 앱과 서명 키가 다릅니다. 나중에 Play 스토어 버전을 설치하려면 APK 버전을 먼저 지워야 합니다.
- 실제 iPhone에 설치하려면 Apple Developer 계정으로 TestFlight를 거쳐야 합니다(아래 EAS 절차).

### 웹 체험판 (GitHub Pages)

`main`에 푸시될 때마다 `.github/workflows/pages.yml`이 웹 버전을 빌드해 `gh-pages` 브랜치에 올리고, https://hbyim.github.io/diary/ 에서 열립니다. 주소가 열리지 않으면 저장소 Settings → Pages에서 Source를 **Deploy from a branch**, 브랜치를 **gh-pages / (root)** 로 지정하세요. 저장소 이름을 바꾸면 `app.json`의 `experiments.baseUrl`도 함께 바꿔야 합니다.

웹 버전은 휴대폰 앱과 이렇게 다릅니다.

| 기능 | 앱 | 웹 |
|---|---|---|
| 저장 | SQLite (`db.ts`) | 브라우저 localStorage (`db.web.ts`), 약 5MB |
| 비밀번호 해시 | Keychain/Keystore (`secure-kv.ts`) | localStorage (`secure-kv.web.ts`) |
| 사진 | 앱 폴더에 복사 | 900px로 줄여 기록 안에 저장 (`photos.web.ts`) |
| 내보내기 | 공유 시트 | 파일 다운로드 (`export-file.web.ts`) |
| 알림 | 있음 | 없음 |

## 5. 알아둘 점

- **백업:** iOS는 앱 문서 폴더가 iCloud 기기 백업에 포함되고, Android는 자동 백업에 DB가 포함될 수 있습니다. 단 비밀번호 해시는 Keystore 특성상 복원되지 않을 수 있어서, 복원 후 잠금이 풀리지 않으면 재설치 시 새 비밀번호를 설정해야 합니다. 이 부분은 실제 기기 복원으로 검증이 필요합니다.
- **알림:** 매일 알림 1개 + 연례 행사마다 매년 알림 1개를 예약합니다. iOS는 예약 알림이 64개로 제한되므로 연례 행사는 60개 이내로 두세요.
- **날짜 기준:** 새벽 3시 전에 쓰면 전날 칸에 들어갑니다(`DAY_CUTOFF_HOUR`).
- **2월 29일:** 윤년에만 칸이 생기고, 나이테 원에서는 2월 28일 자리에 함께 표시됩니다.

## 6. 검증 상태

- `npm run typecheck`, `npm run lint`, `npm test`(날짜·사이클·잠금·질문·텍스트 분석 22개) 통과
- `npx expo export --platform ios --platform android` 번들 생성 통과
- 실제 기기·시뮬레이터 실행은 아직 하지 않았습니다. 첫 실행 때 온보딩 → 쓰기 → 저장 → 잠금 → 알림 순서로 확인하세요.
