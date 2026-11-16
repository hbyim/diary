# 나이테 — 5년 다이어리

같은 날짜 위에 다섯 해를 겹쳐 쓰는 다이어리 앱(iOS / Android). 오늘을 기록하면 1년 전·2년 전·3년 전의 같은 날이 바로 아래에 보입니다.

- **앱 내려받기: [Releases](https://github.com/hbyim/diary/releases/latest)** (Android APK, iOS 시뮬레이터 빌드)
- **웹 체험판: https://hbyim.github.io/diary/** (기록은 그 브라우저에만 저장, 알림 없음)
- 기획: [`docs/flipbook.html`](docs/flipbook.html) (UI/UX 플립북)
- 개발·DB·배포 정리: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)

## 기술 스택

Expo SDK 58 · React Native 0.88 · TypeScript · Expo Router · expo-sqlite (로컬 DB) · expo-secure-store (비밀번호 해시) · expo-notifications · EAS Build/Submit

## 개발

```bash
npm install
npx expo run:ios       # 또는 npx expo run:android (개발 빌드, Xcode/Android Studio 필요)
npm run typecheck && npm run lint && npm test
```

Expo Go에는 이 앱이 쓰는 네이티브 모듈이 모두 들어 있어서 `npx expo start` 후 Expo Go로도 열 수 있지만, 알림은 개발 빌드에서 확인하세요.

## 화면 구성

| 탭/화면 | 파일 |
|---|---|
| 오늘 (한 날짜의 다섯 칸) | `src/app/(tabs)/index.tsx` |
| 나이테 (5년 원형 지도·통계) | `src/app/(tabs)/rings.tsx` |
| 발견 (같은 날 비교·반복 태그·기분) | `src/app/(tabs)/discover.tsx` |
| 나 (알림·질문·잠금·내보내기·초기화) | `src/app/(tabs)/me.tsx` |
| 쓰기 / 저장 직후 / 지난 기록·답장 | `src/app/write.tsx`, `saved.tsx`, `entry.tsx` |
| 달력·놓친 날 / 연례 행사 / 비밀번호 / 온보딩 | `src/app/calendar.tsx`, `anniversaries.tsx`, `passcode.tsx`, `onboarding.tsx` |
