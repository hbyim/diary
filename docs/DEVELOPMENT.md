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

## 2. 데이터베이스

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

## 3. 배포 (EAS)

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

## 4. 알아둘 점

- **백업:** iOS는 앱 문서 폴더가 iCloud 기기 백업에 포함되고, Android는 자동 백업에 DB가 포함될 수 있습니다. 단 비밀번호 해시는 Keystore 특성상 복원되지 않을 수 있어서, 복원 후 잠금이 풀리지 않으면 재설치 시 새 비밀번호를 설정해야 합니다. 이 부분은 실제 기기 복원으로 검증이 필요합니다.
- **알림:** 매일 알림 1개 + 연례 행사마다 매년 알림 1개를 예약합니다. iOS는 예약 알림이 64개로 제한되므로 연례 행사는 60개 이내로 두세요.
- **날짜 기준:** 새벽 3시 전에 쓰면 전날 칸에 들어갑니다(`DAY_CUTOFF_HOUR`).
- **2월 29일:** 윤년에만 칸이 생기고, 나이테 원에서는 2월 28일 자리에 함께 표시됩니다.

## 5. 검증 상태

- `npm run typecheck`, `npm run lint`, `npm test`(날짜·사이클·잠금·질문·텍스트 분석 22개) 통과
- `npx expo export --platform ios --platform android` 번들 생성 통과
- 실제 기기·시뮬레이터 실행은 아직 하지 않았습니다. 첫 실행 때 온보딩 → 쓰기 → 저장 → 잠금 → 알림 순서로 확인하세요.
