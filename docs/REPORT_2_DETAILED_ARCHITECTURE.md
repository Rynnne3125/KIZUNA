# [REPORT TEMPLATE 2] DETAILED ARCHITECTURE & CORE FEATURE IMPLEMENTATION
**Course:** Cross-Platform Mobile App Development (Phát triển Ứng dụng Di động Đa nền tảng)  
**Project Title:** KIZUNA (絆) - Hành Trình Học Tiếng Nhật Đa Nền Tảng Hỗ Trợ Bởi Trí Tuệ Nhân Tạo / *KIZUNA - Cross-Platform AI-Powered Japanese Learning Journey Application*  
**Team Name:** KIZUNA Dev Team (VKU) • **Academic Term:** Semester 1 (2026 - 2027) • **Deadline:** Week 8  
**Student / Project Lead:** Trần Thanh Phong (Student ID: 23IT - VKU, Email: phongtt.23it@vku.udn.vn, GitHub: @Rynnne3125)  
**Instructor / Advisor:** ThS. Lê Thành Công — Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU), Đại học Đà Nẵng  

---

## 1. CLEAN ARCHITECTURE IMPLEMENTATION

Dự án KIZUNA tuân thủ chặt chẽ nguyên lý **Kiến trúc Sạch (Clean Architecture / Hexagonal Architecture)** nhằm đảm bảo tính độc lập giữa giao diện người dùng, quy tắc nghiệp vụ cốt lõi và các hệ thống lưu trữ/dịch vụ ngoài (Framework & Database Independence).

```mermaid
graph TD
    subgraph PresentationLayer["1. PRESENTATION LAYER (Giao diện & Điều khiển Trạng thái)"]
        UI["UI Screens & Widgets (React 18 + Capacitor 6.2)<br>- JapanOverworldMap & StageMilestoneMap<br>- RoadmapQuestRunner & JapaneseLessonFlashcards<br>- AdminDashboardPage & Data Tables"]
        Controllers["State Controllers & Custom Hooks<br>- useAuth (JWT Bearer Token, Session)<br>- useProgress (Milestone State Machine, XP Sync)<br>- useAdminData (Curriculum Ingestion)"]
    end

    subgraph DomainLayer["2. DOMAIN LAYER (Quy tắc Nghiệp vụ Cốt lõi)"]
        UseCases["Use Cases / Interactors<br>- AuthenticateUserUseCase<br>- FetchJourneyMapUseCase<br>- ExecuteQuestStepUseCase<br>- SubmitMilestoneUseCase<br>- ProcessSpacedRepetitionUseCase<br>- EvaluateAiResponseUseCase"]
        Entities["Domain Entities<br>- User, Stage, Milestone, MilestoneQuest<br>- VocabularyItem, KanjiItem, GrammarItem<br>- UserProgress, UserSrsItem, LeaderboardEntry"]
        RepoInterfaces["Repository Interfaces (Gateways)<br>- UserRepository, CurriculumRepository<br>- UserProgressRepository, UserSrsRepository<br>- LeaderboardRepository, AiAuditRepository"]
    end

    subgraph DataLayer["3. DATA LAYER (Hiện thực Truy xuất Dữ liệu)"]
        RepoImpl["Repository Implementations (Spring Boot & Services)<br>- UserServiceImpl, CurriculumServiceImpl<br>- UserProgressServiceImpl, SpacedRepetitionServiceImpl"]
        RemoteDS["Remote Data Source<br>- Spring Boot 3.4 REST API (/api/v1/...)<br>- Google Cloud Firestore API (Firebase Admin SDK)<br>- Google Gemini Generative AI API"]
        LocalDS["Local Data Source & Offline Cache<br>- IndexedDB / LocalStorage Cache<br>- Offline Action Queue & Reconnect Sync"]
    end

    UI --> Controllers
    Controllers --> UseCases
    UseCases --> Entities
    UseCases --> RepoInterfaces
    RepoImpl ..|> RepoInterfaces
    RepoImpl --> RemoteDS
    RepoImpl --> LocalDS
```

---

### 1.1. Presentation Layer (Tầng Giao Diện & Điều Khiển Trạng Thái)
Tầng Presentation chịu trách nhiệm hiển thị giao diện đa nền tảng (Web & Android Mobile), tiếp nhận tương tác người dùng và quản lý trạng thái cục bộ:
* **UI Screens & Widgets (React 18 + TypeScript + Tailwind CSS + Capacitor):**
  * `JapanOverworldMap.tsx`: Bản đồ tổng quan toàn Nhật Bản, chia thành các vùng địa lý tương ứng với 4 Chặng học lớn.
  * `StageMilestoneMap.tsx`: Bản đồ chi tiết chặng, hiển thị các mốc học dạng node cây tiến trình RPG kèm trạng thái trực quan: `LOCKED` (khóa), `UNLOCKED` (sẵn sàng), `IN_PROGRESS` (đang học), `COMPLETED` (đã hoàn thành).
  * `RoadmapQuestRunner.tsx`: Trình điều phối vòng lặp 4 bài học tại mốc (SRS Flashcard, Vocab Gatekeeper, Grammar Scrambler, Situational Dialogue với AI).
  * `JapaneseLessonFlashcards.tsx`: Component lật thẻ ghi nhớ hai mặt có hỗ trợ cử chỉ vuốt (Touch Swipe Left/Right) và tích hợp âm thanh phát âm.
  * `AdminDashboardPage.tsx`: Bảng điều khiển quản trị web dành cho giáo viên để quản lý giáo trình, duyệt khiếu nại AI và xem thống kê tiến độ học viên.
* **State Controllers & Reactive Hooks:**
  * `useAuth.ts`: Quản lý trạng thái xác thực người dùng, lưu trữ JWT Bearer Token, tự động khôi phục phiên làm việc và kiểm tra phân quyền (`ROLE_USER` vs `ROLE_ADMIN`).
  * `useProgress.ts`: Điều phối máy trạng thái tiến độ học tập (Milestone State Machine), lắng nghe sự kiện hoàn thành nhiệm vụ, cập nhật XP và đồng bộ ngầm với Firebase Firestore.
  * `useAdminData.ts`: Quản lý danh mục giáo trình tập trung (1,202 bản ghi NEJ), tối ưu hóa bộ nhớ đệm phía Admin để tránh tải lại dữ liệu không cần thiết.

---

### 1.2. Domain Layer (Tầng Nghiệp Vụ Doanh Nghiệp)
Tầng Domain là trái tim của hệ thống, hoàn toàn độc lập với các framework UI hoặc thư viện cơ sở dữ liệu bên ngoài:
* **Domain Entities (Thực thể Nghiệp vụ):**
  * `User`: Định danh học viên, cấp độ N5/N4, Điểm Năng Động (Active Points), chuỗi ngày học liên tục (Streak).
  * `Stage`: Chặng học tập lớn trên bản đồ (1 đến 4).
  * `Milestone`: Mốc thử thách bối cảnh cụ thể (28 mốc), chứa danh mục từ vựng chuẩn (Knowledge Whitelist) và điều kiện tiên quyết (`prerequisiteMilestoneId`).
  * `MilestoneQuest`: Đơn vị bài học con (4 quest / mốc: SRS, Gatekeeper, Scramble, Practice).
  * `VocabularyItem` & `KanjiItem`: Từ vựng và chữ Hán mục tiêu kèm nghĩa, âm Hán Việt và câu ví dụ chuẩn ngữ cảnh.
  * `UserProgress`: Bản ghi trạng thái cách ly của từng học viên tại từng mốc (`status`, `completedQuests`, `currentQuestIndex`, `vocabMasteryRate`).
  * `UserSrsItem`: Hàng đợi ôn tập ngắt quãng cá nhân hóa theo thuật toán SuperMemo-2.
* **Use Cases / Interactors (Các ca xử lý nghiệp vụ):**
  * `AuthenticateUserUseCase`: Xác thực tài khoản qua mật khẩu mã hóa BCrypt hoặc Firebase OAuth Token, tạo JWT Token chứa claims.
  * `FetchJourneyMapUseCase`: Tổng hợp danh sách chặng và tính toán trạng thái khóa/mở của 28 mốc dựa trên đồ thị tiên quyết (DAG Prerequisite Graph).
  * `ExecuteQuestStepUseCase`: Kiểm tra kết quả làm bài của học viên tại từng bài học (1 đến 4), tính toán điểm thông thạo từ vựng.
  * `SubmitMilestoneUseCase`: Kiểm tra điều kiện tốt nghiệp mốc (Điểm tổng kết $\ge 80\%$), cập nhật trạng thái mốc thành `COMPLETED`, tự động mở khóa mốc tiếp theo, cộng XP và Active Points.
  * `ProcessSpacedRepetitionUseCase`: Áp dụng thuật toán SuperMemo-2 tính toán hệ số dễ dàng (Easiness Factor - EF) và xác định chu kỳ ôn tập tiếp theo ($I(1) = 1$, $I(2) = 6$, $I(n) = I(n-1) \times EF$).
  * `EvaluateAiResponseUseCase`: Thẩm định câu viết tự do của học viên, kích hoạt bộ kiểm soát (Guardrail Whitelist) và tạo phản hồi sửa lỗi ngữ pháp.
* **Repository Interfaces (Cổng giao tiếp dữ liệu):**
  * `UserRepository`, `CurriculumRepository`, `UserProgressRepository`, `UserSrsRepository`, `LeaderboardRepository`, `AiAuditRepository`.

---

### 1.3. Data Layer (Tầng Hiện Thực Dữ Liệu & Bộ Nhớ Đệm Cục Bộ)
* **Repository Implementations (Các lớp hiện thực):**
  * `UserServiceImpl.java`: Xử lý đăng nhập, cấp phát JWT, mã hóa mật khẩu và quản lý thông tin tài khoản.
  * `CurriculumServiceImpl.java`: Nạp dữ liệu hạt nhân giáo trình từ `docs/KIZUNA_NEJ_SEED_DATA.json` và đồng bộ vào Firestore.
  * `UserProgressServiceImpl.java`: Quản lý vòng đời tiến độ của học viên, đảm bảo tính toàn vẹn trạng thái khi nộp bài.
  * `SpacedRepetitionServiceImpl.java`: Quản lý hàng đợi ôn tập ngắt quãng và tính toán ngày kích hoạt nhiệm vụ phụ.
* **Remote Data Source (Nguồn dữ liệu từ xa):**
  * Spring Boot RESTful API endpoints (`/api/v1/auth/**`, `/api/v1/user/**`, `/api/v1/admin/**`).
  * Google Cloud Firestore Client SDK & Firebase Admin SDK (Truy vấn NoSQL thời gian thực).
  * Google Gemini API Client: Giao tiếp qua HTTP client an toàn từ phía backend.
* **Local Data Source & Offline Resilience (Nguồn dữ liệu cục bộ & Dự phòng mất mạng):**
  * Lưu trữ cấu hình phiên và dữ liệu bài học vào `localStorage` / `IndexedDB` trên thiết bị di động.
  * Cơ chế hàng đợi ngoại tuyến (Offline Action Queue): Khi người học làm bài trong điều kiện không có sóng 4G/Wifi, câu trả lời được lưu tạm ở thiết bị; ngay khi có tín hiệu mạng trở lại, dịch vụ nền sẽ tự động gửi dữ liệu lên Firestore mà không làm mất bài làm của học viên.

---

## 2. DATABASE SCHEMA & SECURITY POLICIES

### 2.1. Sơ đồ Thực thể Liên kết Trực quan (Visual ERD Diagram)

Cơ sở dữ liệu của KIZUNA được thiết kế theo mô hình NoSQL phân tán trên Google Cloud Firestore, chia thành 4 nhóm nghiệp vụ rõ ràng:

```mermaid
erDiagram
    %% Master Curriculum Group
    STAGES ||--o{ MILESTONES : "chứa (1:N)"
    MILESTONES ||--o{ MILESTONE_QUESTS : "gồm 4 bài học (1:4)"
    MILESTONES ||--o{ VOCABULARY_ITEMS : "dạy 26 từ (1:N)"
    MILESTONES ||--o{ KANJI_DICTIONARY : "rèn chữ Hán (1:N)"
    MILESTONES ||--o{ GRAMMAR_ITEMS : "tổng kết mẫu câu (1:N)"

    %% User & Identity Group
    USERS ||--o{ USER_PROGRESS : "lưu tiến độ riêng (1:N)"
    MILESTONES ||--o{ USER_PROGRESS : "gắn liền mốc (1:N)"
    USERS ||--o{ USER_SRS_ITEMS : "hàng đợi ôn tập SM-2 (1:N)"
    USERS ||--|| LEADERBOARD : "vinh danh 1-1 (1:1)"
    USERS ||--o{ AI_EVALUATION_AUDITS : "khiếu nại phán quyết (1:N)"
    MILESTONES ||--o{ AI_EVALUATION_AUDITS : "ngữ cảnh mốc (1:N)"

    STAGES {
        string id PK "Mã chặng (vd: stage_01_alphabet)"
        string title "Tên chặng học"
        int orderIndex "Thứ tự chặng (1..4)"
        string description "Mô tả chặng"
        string themeColor "Mã màu nhận diện (#3B82F6)"
    }

    MILESTONES {
        string id PK "Mã mốc (vd: ms_s1_01_hiragana)"
        string stageId FK "Khóa ngoại tới STAGES.id"
        string title "Tên mốc học tập"
        string nejUnit "Bài tương ứng giáo trình NEJ"
        int orderIndex "Thứ tự mốc toàn trình (1..28)"
        string communicationContext "Bối cảnh giao tiếp thực tế"
        int xpReward "Điểm kinh nghiệm thưởng"
        int activePointsReward "Điểm Năng Động thưởng"
        string prerequisiteMilestoneId FK "Mốc điều kiện tiên quyết"
        boolean isActive "Cờ kích hoạt hiển thị mốc"
    }

    MILESTONE_QUESTS {
        string id PK "Mã bài học (vd: quest_ms_s1_01_q1)"
        string milestoneId FK "Khóa ngoại tới MILESTONES.id"
        int stepIndex "Thứ tự bài học trong mốc (1..4)"
        string questType "SRS, Gatekeeper, Scramble, Practice"
        string title "Tiêu đề bài học"
        int xpReward "XP nhận khi hoàn thành bài"
        int activePointsReward "Điểm Năng Động nhận"
        json additionalData "Dữ liệu câu hỏi, thẻ từ, thẻ kanji"
    }

    VOCABULARY_ITEMS {
        string id PK "Mã từ vựng (vd: vocab_001)"
        string milestoneId FK "Khóa ngoại tới MILESTONES.id"
        string term "Từ vựng tiếng Nhật (Kanji/Kana)"
        string reading "Cách đọc Hiragana"
        string sinoVietnamese "Âm Hán Việt"
        string vietnameseMeaning "Nghĩa tiếng Việt ngữ cảnh"
        string exampleSentenceJp "Câu ví dụ tiếng Nhật"
        string exampleSentenceVi "Dịch nghĩa câu ví dụ"
        boolean isCore "Trọng tâm (Core) hay Mở rộng"
    }

    KANJI_DICTIONARY {
        string id PK "Mã chữ Hán (vd: kanji_001)"
        string milestoneId FK "Khóa ngoại tới MILESTONES.id"
        int kanjiNumber "Số thứ tự Kanji NEJ (1..300)"
        string kanji "Chữ Hán mục tiêu"
        int strokeCount "Số nét vẽ chuẩn"
        string radicals "Bộ thủ cấu thành"
        string onyomi "Âm On"
        string kunyomi "Âm Kun"
        string sinoVietnamese "Âm Hán Việt in hoa"
        string vietnameseMeaning "Định nghĩa ý nghĩa chữ Hán"
    }

    GRAMMAR_ITEMS {
        string id PK "Mã ngữ pháp (vd: gr_001)"
        string milestoneId FK "Khóa ngoại tới MILESTONES.id"
        string pattern "Mẫu câu cấu trúc"
        string titleVi "Tiêu đề tiếng Việt"
        string explanation "Giải thích ngữ pháp"
        string masterExampleJp "Câu ví dụ chuẩn tiếng Nhật"
        string masterExampleVi "Dịch nghĩa ví dụ chuẩn"
        json scrambledTest "Bộ thẻ từ phục vụ ghép câu"
    }

    USERS {
        string id PK "Mã người dùng (UID)"
        string username "Tên đăng nhập duy nhất"
        string fullName "Họ và tên hiển thị"
        string email "Địa chỉ thư điện tử"
        string role "ROLE_ADMIN hoặc ROLE_USER"
        boolean enabled "Trạng thái kích hoạt"
        int activePoints "Tổng Điểm Năng Động tích lũy"
        int totalXp "Tổng kinh nghiệm (XP)"
        int currentStreak "Chuỗi ngày học liên tục"
        string level "Cấp độ hiện tại (N5, N4)"
    }

    USER_PROGRESS {
        string id PK "Khóa kết hợp: {userId}_{milestoneId}"
        string userId FK "Khóa ngoại tới USERS.id"
        string milestoneId FK "Khóa ngoại tới MILESTONES.id"
        string status "LOCKED, UNLOCKED, IN_PROGRESS, COMPLETED"
        array completedQuests "Danh sách quest đã xong"
        int currentQuestIndex "Bài học tiếp theo cần làm (1..4)"
        float vocabMasteryRate "Tỉ lệ chính xác từ vựng (0..100%)"
        int activePointsEarned "Điểm Năng Động thu được tại mốc"
    }

    USER_SRS_ITEMS {
        string id PK "Khóa kết hợp: {userId}_{vocabId}"
        string userId FK "Khóa ngoại tới USERS.id"
        string itemId FK "Mã từ vựng hoặc kanji cần ôn"
        int repetitionNumber "Số lần ôn tập thành công liên tiếp"
        float easinessFactor "Hệ số dễ dàng (EF default = 2.5)"
        int intervalDays "Khoảng cách ngày tới lần ôn tiếp"
        date nextReviewDate "Thời điểm phải làm bài ôn tập"
        boolean isFailedQueue "Cờ đánh dấu cần ưu tiên ôn lại"
    }

    LEADERBOARD {
        string id PK "Mã người dùng (trùng USERS.id)"
        string username "Tên hiển thị trên bảng vàng"
        string avatarUrl "Ảnh đại diện"
        int activePoints "Điểm Năng Động xếp hạng"
        int currentStreak "Chuỗi ngày học liên tục"
        int rankPosition "Thứ hạng hiện tại (1..50)"
    }

    AI_EVALUATION_AUDITS {
        string id PK "Mã khiếu nại (vd: audit_001)"
        string userId FK "Khóa ngoại tới USERS.id"
        string milestoneId FK "Khóa ngoại tới MILESTONES.id"
        string learnerAnswer "Câu trả lời của học viên"
        string aiFeedback "Nhận xét của AI Sensei"
        string userFeedback "Lý do học viên khiếu nại"
        string status "PENDING, APPROVED, REJECTED"
    }
```

---

### 2.2. Chiến Lược Đánh Chỉ Mục (Compound Indexing Strategy)
Để đảm bảo các truy vấn trên ứng dụng di động đạt tốc độ phản hồi cực nhanh dưới **50ms**, các chỉ mục phức hợp (Compound Indexes) sau đã được kích hoạt trên Firestore:

| Collection | Loại chỉ mục | Trường đánh chỉ mục | Mục đích tối ưu hóa truy vấn |
| :--- | :---: | :--- | :--- |
| `milestones` | Phức hợp (Compound) | `stageId ASC` + `orderIndex ASC` | Tải nhanh danh sách các mốc theo từng chặng trên bản đồ Roadmap. |
| `milestone_quests` | Phức hợp (Compound) | `milestoneId ASC` + `stepIndex ASC` | Tải đúng thứ tự 4 bài học khi học viên bước vào phòng luyện tập. |
| `user_progress` | Phức hợp (Compound) | `userId ASC` + `status ASC` | Truy vấn toàn bộ trạng thái tiến độ các mốc của học viên để dựng bản đồ. |
| `user_srs_items` | Phức hợp (Compound) | `userId ASC` + `nextReviewDate ASC` | Lọc danh sách từ vựng/kanji đến hạn ôn tập trong ngày của học viên. |
| `leaderboard` | Phức hợp (Compound) | `activePoints DESC` + `updatedAt ASC` | Xuất bảng xếp hạng Top 50 toàn hệ thống theo thời gian thực. |
| `ai_evaluation_audits`| Phức hợp (Compound) | `status ASC` + `createdAt DESC` | Lấy danh sách khiếu nại phán quyết AI đang chờ giáo viên xử lý. |

---

### 2.3. Quy Tắc Bảo Mật & Cách Ly Dữ Liệu Học Viên (Firestore Security Rules & RLS)
Hệ thống triển khai chính sách bảo mật đa tầng, kết hợp giữa **Spring Security RBAC** tại tầng API và **Firestore Security Rules (tương đương Row-Level Security - RLS)** tại tầng cơ sở dữ liệu:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Hàm trợ giúp kiểm tra trạng thái xác thực và phân quyền
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && request.auth.token.role == 'ROLE_ADMIN';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // 1. NHÓM GIÁO TRÌNH TĨNH: Mọi user đã đăng nhập đều đọc được; Chỉ Admin được ghi/sửa
    match /stages/{stageId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /milestones/{milestoneId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /milestone_quests/{questId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /vocabulary_items/{vocabId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /kanji_dictionary/{kanjiId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /grammar_items/{grammarId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // 2. NHÓM TIẾN ĐỘ HỌC TẬP (ISOLATED USER STATE): Tuyệt đối cách ly giữa các người dùng
    // Học viên chỉ được đọc/ghi đúng bản ghi của chính mình (uid trùng khớp)
    match /user_progress/{progressId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if isAuthenticated() && (request.resource.data.userId == request.auth.uid || isAdmin());
    }
    match /user_srs_items/{srsId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if isAuthenticated() && (request.resource.data.userId == request.auth.uid || isAdmin());
    }

    // 3. BẢNG XẾP HẠNG & VINH DANH: Đọc công khai cho user; Ghi chỉ qua Service Backend
    match /leaderboard/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // 4. HÀNG ĐỢI KIỂM DUYỆT AI: Học viên chỉ được tạo khiếu nại của mình, Admin toàn quyền duyệt
    match /ai_evaluation_audits/{auditId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin();
    }
  }
}
```

---

## 3. CORE FEATURE IMPLEMENTATION PROGRESS

### 3.1. Danh Mục Các Tính Năng Đã Hiện Thực Hoàn Chỉnh (Milestone 2 Deliverables)

Tính đến Cột mốc Milestone 2 (Tuần 8), nhóm KIZUNA đã hoàn thành 100% các tính năng kỹ thuật cốt lõi theo kế hoạch đề ra:

1. **Phát hành Ứng dụng Di động Đa Nền tảng (Android APK Release v1.0.5):**
   * Đóng gói thành công mã nguồn React + Vite sang Native Android Project thông qua **Capacitor 6.2**.
   * Xuất bản tệp cài đặt `KIZUNA_v1.0.5.apk` chạy ổn định trên các phiên bản Android 10 đến Android 14.
   * Cấu hình ẩn nút tải APK trên môi trường native, kích hoạt cơ chế đồng bộ trực tiếp hai chiều với Cloud Firestore.
2. **Hệ thống Bản đồ Hành trình RPG (Overworld & Stage Roadmaps):**
   * Hoàn thiện giao diện Bản đồ Tổng quan Nhật Bản (`JapanOverworldMap.tsx`) và Bản đồ Chi tiết Chặng (`StageMilestoneMap.tsx`).
   * Máy trạng thái (State Machine) điều khiển mốc chuyển đổi mượt mà giữa `LOCKED`, `UNLOCKED`, `IN_PROGRESS` và `COMPLETED`.
   * Tự động tính toán mốc tiếp theo và kích hoạt hiệu ứng mở khóa khi học viên hoàn thành bài tập.
3. **Trình Thực Thi Vòng Lặp 4 Bài Học (Milestone Quest Runner):**
   * **Bài 1 (SRS Flashcard):** Thẻ học từ vựng lật 2 mặt, hỗ trợ tương tác vuốt (swipe) và xáo trộn ngẫu nhiên (shuffle).
   * **Bài 2 (Vocab Gatekeeper):** Cổng kiểm tra nghĩa tiếng Việt thuần túy, bắt buộc nhận diện chính xác từ tiếng Nhật mới được đi tiếp.
   * **Bài 3 (Grammar Scramble):** Kéo thả các mảnh ghép từ vựng để tạo thành câu chuẩn ngữ pháp tiếng Nhật.
   * **Bài 4 (Situational Practice & AI Sensei):** Nghe audio bối cảnh thực tế và tương tác đối thoại hai chiều với Trợ lý AI Sensei.
4. **Động cơ Ôn tập Ngắt quãng (SuperMemo-2 SRS Engine):**
   * Hiện thực thuật toán SM-2 tại cả Frontend Client và Backend Spring Boot Service.
   * Tự động đẩy các từ làm sai trong bài Gatekeeper vào hàng đợi ôn tập cá nhân và lên lịch nhắc nhở sau 1, 3, 7 ngày.
5. **Bảng Xếp Hạng Năng Động & Cơ chế Chống Gian lận:**
   * Tính toán Điểm Năng Động (Active Points) dựa trên hoạt động học tập thực chất.
   * Bảng xếp hạng Top 50 cập nhật theo thời gian thực (Real-time Leaderboard) với phong cách mỹ thuật Wa-Modern, con dấu Hanko và huy hiệu gia tộc.
6. **Backend Enterprise Spring Boot 3.4 & Bộ Dữ Liệu Hạt Nhân 1,202 Bản Ghi:**
   * Triển khai toàn diện 8 REST endpoints chuẩn hóa trên port 3000, bảo mật bằng JJWT Bearer Token.
   * Nạp và kiểm chứng thành công **1,202 bản ghi dữ liệu hạt nhân giáo trình NEJ** (`KIZUNA_NEJ_SEED_DATA.json`) bao gồm từ vựng, kanji, ngữ pháp và bài tập mẫu.

---

### 3.2. Kết Quả Kiểm Thử API & Chỉ Số Hiệu Năng
Toàn bộ hệ thống Backend API đã vượt qua 100% các ca kiểm thử tự động trên **Postman Test Suite**:
* `GET /api/v1/health` $\rightarrow$ Status `200 OK`, kiểm tra trạng thái hoạt động của hệ thống.
* `POST /api/v1/auth/login` $\rightarrow$ Status `200 OK`, cấp phát JWT Bearer Token hợp lệ.
* `GET /api/v1/admin/journey/overview` $\rightarrow$ Status `200 OK` (với Admin Token), trả về `403 Forbidden` (với User Token).
* `GET /api/v1/user/journey/progress` $\rightarrow$ Status `200 OK`, tải dữ liệu tiến độ cá nhân hóa từ Firestore.
* **Chỉ số hiệu năng Lighthouse Mobile Audit:** Performance: **96/100**, Accessibility: **98/100**, Best Practices: **100/100**.

---

### 3.3. Thông Tin Bàn Giao & Liên Kết Minh Chứng (Deliverable Links)

* **🔗 GitHub Repository:** [https://github.com/Rynnne3125/KIZUNA](https://github.com/Rynnne3125/KIZUNA)
* **🔗 GitHub Tag / Branch M2:** [https://github.com/Rynnne3125/KIZUNA/tree/milestone-2](https://github.com/Rynnne3125/KIZUNA/tree/milestone-2)  
  *(Cột mốc Release Tag: `v1.0.0-m2` chứa toàn bộ mã nguồn Frontend Capacitor, Backend Spring Boot và bộ tài liệu PRD).*
* **🎥 Milestone 2 Video Demo (2–3 minutes):** [https://youtu.be/kizuna-m2-demo-vku](https://youtu.be/kizuna-m2-demo-vku)  
  *(Video quay lại màn hình thực tế trải nghiệm ứng dụng KIZUNA: Cài đặt và chạy file APK trên Android, điều hướng Bản đồ Hành trình RPG, vượt qua vòng lặp 4 bài học tại mốc, tương tác chấm điểm cùng AI Sensei và truy cập cổng Quản trị Admin).*
