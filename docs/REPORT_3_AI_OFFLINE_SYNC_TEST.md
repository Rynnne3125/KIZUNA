# Report 3 — AI Integration, Offline Sync & Test Report

| Field | Value |
| --- | --- |
| Course | Cross-Platform Mobile App Development |
| Project title | KIZUNA (絆) — Cross-platform Japanese learning |
| Team name | KIZUNA Team |
| Academic term | Semester 1 (2026–2027) |
| Deadline | Week 11 |
| Milestone | M3 (15%) |
| Verification date | 12 November 2026 |

## 1. Artificial intelligence capabilities and benchmarks

### Model backbone

KIZUNA uses **Gemini 3.5 Flash-Lite** through the Gemini REST API. The Spring Boot endpoint `POST /api/v1/placement/assessment` calls the model and validates its structured JSON response. The key is supplied to the backend as `GEMINI_API_KEY`. The frontend calls the KIZUNA endpoint and sends no Gemini key. Docker Compose passes the server environment variables to the backend. On Firebase Hosting or Capacitor, set the public backend URL in `VITE_PLACEMENT_API_URL` before building. [Model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) · [Structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output)

1. The app scores the adaptive quiz by JLPT tier and estimates proficiency using the highest consecutive tier passed.
2. The request includes correct and total counts by tier and question category. Incorrect counts are derived as total minus correct. Candidate lessons come from Firestore and contain a milestone ID, tier, stage title, lesson title and learning objective. The request omits the learner's account ID, contact details and individual answers.
3. Gemini selects one candidate milestone and returns a confidence label. Both the backend and frontend check the selected ID against the request's candidate list. A lesson may be in the middle of any stage at or below the estimated tier. For example, a learner estimated at N4 may be directed to an N5 review lesson or to an N4 lesson.
4. The app opens every milestone in the tiers already passed and makes the selected milestone accessible. The roadmap's next-stage action opens the furthest accessible stage, while the Gemini recommendation can point to an earlier lesson for review. The quiz score controls the estimated tier and the model does not write progress or award completion. If Gemini is unavailable or returns an invalid candidate, the first available lesson in the estimated tier is used as the placement recommendation. Learners who skip the quiz begin at N5 without a model request.

The backend defaults to 100 provider requests per UTC day and two concurrent provider requests per running instance. The provider timeout is five seconds. A deployment with no Gemini key uses the deterministic recommendation.

### Performance benchmarks

| Metric | Verification result |
| --- | --- |
| Live inference latency | Pending. The server returns `latencyMs` for successful calls. A live key and a benchmark run are required to report median and p95. |
| Recommendation accuracy | Pending. A labeled set of attempts and acceptable candidate lessons is required to assess model quality. |
| Device RAM footprint | Pending. The model runs on the server. The Android app's memory still needs before-and-after profiling. |
| Routing and tier constraints | Automated tests covered a middle-of-stage choice, a valid lower-tier recommendation, and rejection of a recommendation above the estimated tier. |

## 2. Offline-first synchronization engine

The React/Capacitor client caches the Firestore stage and milestone catalog in **IndexedDB**. After the catalog has been loaded once while online, the user can complete a quiz and obtain a deterministic recommendation while offline. The app saves the latest pending result per user before attempting network writes and displays a pending-sync message when the result remains on the device.

When connectivity returns or the app opens with an active session, it retries the pending result. A Firestore transaction updates `users.placementDetails` and the starting milestone in `user_progress` together. It merges progress fields so recorded milestone completions remain intact. The queue entry is removed after a successful commit or when Firestore already has a newer result. [Firestore transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions)

The conflict strategy is **Last-Write-Wins by attempt timestamp**. Attempt IDs break equal timestamp ties. A result that reaches the server late cannot replace a result with a later attempt timestamp. The ordering depends on device clocks. This milestone covers placement results and the placement catalog. Other lesson data follows the app's existing storage behavior.

## 3. Automated test suite and performance profiling

| Check | Result |
| --- | --- |
| Frontend automated tests | **8 passed** using the real placement modules, simulated IndexedDB, and mocked Firestore and Gemini responses. |
| Coverage of the instrumented placement test bundle | **98.82% line**, **84.45% branch**, **88.89% function** on the isolated PR snapshot. The bundle includes the static question bank. This is scoped coverage for the placement modules and is not whole-application coverage. |
| Backend API unit tests | **3 passed** covering request validation, response parsing, and rejection when the key or request budget is unavailable. |
| Frontend production build | Passed with Vite. The separate project-wide TypeScript check still reports pre-existing Admin type errors. |
| Frame rate | Pending Android profiling. The template's 58–60 FPS range is a target, not a measurement. |
| Internal testing APK | Pending a signed build from the version containing these changes and a verified release URL. |

### Reproduce the automated checks

```powershell
cd frontend
npm.cmd test
npm.cmd run build
cd ..\backend
.\gradlew.bat test --tests com.kizuna.controller.PlacementAssessmentControllerTest
```

### Device and live-model measurement plan

1. Run the signed internal APK on a documented device and Android version. Capture an online placement run and a repeat after disconnecting and reconnecting.
2. Record `latencyMs` for each live provider response and report the sample count, median and p95. Score recommendation accuracy against acceptable lesson IDs reviewed by a Japanese-language instructor.
3. Profile the placement and roadmap screens with Android Studio or Perfetto. Record app RAM before and after the flow and measure frame rate on the same device. Attach the signed APK release link after it has been verified.
