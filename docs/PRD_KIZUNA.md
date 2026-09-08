# 📜 TÀI LIỆU YÊU CẦU SẢN PHẨM (PRD - PRODUCT REQUIREMENTS DOCUMENT)
## DỰ ÁN: KIZUNA (絆) - ỨNG DỤNG HỌC TIẾNG NHẬT ĐA NỀN TẢNG HỖ TRỢ BỞI AI
**Học phần:** CS2028 - Chuyên đề 4: AI Product Development: End to End  
**Trường:** Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU) - Đại học Đà Nẵng  
**Giảng viên phụ trách:** ThS. Lê Thành Công  
**Phiên bản tài liệu:** v1.0.0 (Cột mốc Chương 3: AI trong Phân tích Yêu cầu & Sản phẩm)  

---

## 1. KHÁM PHÁ SẢN PHẨM (PRODUCT DISCOVERY - MỤC 3.1)

### 1.1. Bối cảnh & Vấn đề thực tế (Problem Statement)
Người học tiếng Nhật tại Việt Nam (đặc biệt là sinh viên ngành CNTT chuẩn bị làm việc với đối tác Nhật Bản) thường gặp các rào cản lớn:
- **Khối lượng Hán tự (Kanji) và từ vựng quá lớn:** Dễ học trước quên sau nếu không có cơ chế lặp lại ngắt quãng (Spaced Repetition).
- **Thiếu môi trường tương tác và phản hồi:** Các ứng dụng truyền thống (Anki, Quizlet) chỉ đơn thuần là flashcard tĩnh, không giải thích ngữ cảnh dùng từ tự nhiên hoặc giải đáp thắc mắc ngữ pháp theo từng câu hỏi cụ thể.
- **Rời rạc giữa nền tảng Web và Mobile:** Người học muốn học bài dài trên Laptop (Web) và tranh thủ ôn flashcard 5-10 phút trên điện thoại (Mobile/PWA), nhưng tiến độ thường không đồng bộ mượt mà thời gian thực.

### 1.2. Tuyên ngôn giá trị (Value Proposition)
**KIZUNA (絆 - Sự gắn kết)** là nền tảng học tiếng Nhật đa nền tảng kết hợp sức mạnh của **Trí tuệ nhân tạo (AI-Native Learning Companion)** và **Thuật toán Spaced Repetition (SuperMemo SM-2)**:
- Học từ vựng, ngữ pháp và Kanji chuẩn lộ trình JLPT (N5 -> N1).
- Trợ lý học tập AI (AI Sensei) giải thích ngữ cảnh chi tiết, sửa lỗi đặt câu và sinh bài tập theo năng lực cá nhân hóa.
- Đồng bộ đa nền tảng tức thời thông qua đám mây Google Firestore và Firebase Auth.

### 1.3. Chân dung người dùng mục tiêu (User Personas)
1. **Persona 1 - Sinh viên IT định hướng làm việc tại Nhật (Primary Persona)**
   - *Tên:* Nguyễn Văn An (21 tuổi, sinh viên năm 3 CNTT).
   - *Mục tiêu:* Đạt JLPT N3/N2 trong vòng 1 năm để phỏng vấn kỹ sư cầu nối (BrSE).
   - *Điểm đau (Pain point):* Thiếu thời gian, học Kanji rất nhanh nản, cần ví dụ thực tế liên quan đến chuyên ngành và đời sống Nhật Bản.
2. **Persona 2 - Người đi làm tự học tiếng Nhật (Secondary Persona)**
   - *Tên:* Trần Thị Mai (25 tuổi, nhân viên văn phòng).
   - *Mục tiêu:* Giao tiếp cơ bản và thi đỗ JLPT N5-N4.
   - *Điểm đau:* Thích học trên điện thoại khi đi xe buýt hoặc giải lao, cần lộ trình chia nhỏ 15 phút mỗi ngày.

---

## 2. PHẠM VI SẢN PHẨM & YÊU CẦU HỆ THỐNG (MỤC 3.2 & 3.3)

### 2.1. Yêu cầu Chức năng (Functional Requirements - FR)
- **FR-01: Xác thực & Quản lý Hồ sơ Đa Nền Tảng (Authentication & Profile)**
  - Đăng nhập một chạm bằng Google, Apple, hoặc Email/Password thông qua Firebase Authentication.
  - Tự động đồng bộ hồ sơ, chuỗi ngày học (Daily Streak), cấp độ mục tiêu JLPT và điểm kinh nghiệm (XP) vào Firestore.
- **FR-02: Kho Tri thức Tiếng Nhật (Kanji & Vocabulary Hub)**
  - Tra cứu và lọc Hán tự theo cấp độ JLPT (N5 -> N1), xem âm On/Kun, số nét, bộ thủ và từ ghép ví dụ.
  - Học từ vựng theo chủ đề và bài học, hỗ trợ Furigana, Romaji và phát âm mẫu.
- **FR-03: Ôn tập Thông minh (Spaced Repetition System - SRS)**
  - Áp dụng thuật toán SuperMemo SM-2 đánh giá chất lượng ghi nhớ (thang điểm 0 - 5).
  - Tự động lên lịch ôn tập cho từng thẻ (`nextReviewDate`), thông báo các thẻ đến hạn trong ngày.
- **FR-04: Trợ lý Học tập AI (AI Sensei - Generative AI Feature)**
  - Tích hợp mô hình LLM (Gemini/OpenAI API) đóng vai trò gia sư AI:
    - Giải thích ngữ pháp và phân biệt các từ đồng nghĩa (ví dụ: phân biệt 「みる」, 「観る」, 「診る」).
    - Đặt câu ví dụ tự động phù hợp với trình độ người học.
    - Chữa lỗi ngữ pháp và giải thích cặn kẽ tại sao sai.
- **FR-05: Thống kê & Gamification**
  - Bảng thống kê tiến độ học tập: Số từ đã thuộc, số từ đang học, biểu đồ duy trì streak.

### 2.2. Yêu cầu Phi chức năng (Non-Functional Requirements - NFR)
- **NFR-01: Tính đa nền tảng (Cross-Platform Compatibility):** Giao diện Responsive tối ưu cho cả Web Browser (Desktop/Tablet) và Mobile WebView (PWA/Capacitor).
- **NFR-02: Hiệu năng (Performance):** Thời gian phản hồi API trung bình $\le 200\text{ms}$; truy vấn Firestore được đánh chỉ mục (index) tối ưu.
- **NFR-03: Bảo mật (Security):** Kiến trúc Stateless API bảo vệ bởi Spring Security; xác thực mọi request nhạy cảm bằng Firebase ID Token JWT.
- **NFR-04: Độ tin cậy của AI (AI Reliability & Hallucination Mitigation):**
  - Áp dụng kỹ thuật Prompt Engineering chặt chẽ: System prompt định hình persona giáo viên tiếng Nhật chuẩn mực, ép đầu ra dạng JSON có cấu trúc (`Structured Outputs`), hạn chế tối đa ảo giác thông tin (Hallucination).

---

## 3. USER STORIES VÀ TIÊU CHÍ CHẤP NHẬN (USER STORIES & ACCEPTANCE CRITERIA - MỤC 3.4)

Tuân thủ nguyên tắc **INVEST** và định dạng tiêu chí chấp nhận theo cú pháp **Gherkin (Given - When - Then)**:

### User Story 1: Đăng nhập và Đồng bộ Đa Nền Tảng (US-01)
* **Là một:** Người học tiếng Nhật  
* **Tôi muốn:** Đăng nhập vào KIZUNA bằng tài khoản Google trên cả máy tính lẫn điện thoại  
* **Để:** Lưu trữ toàn bộ dữ liệu học tập và chuỗi ngày học xuyên suốt các thiết bị mà không cần nhớ mật khẩu mới.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  ```gherkin
  Scenario: Đăng nhập thành công lần đầu bằng Google
    Given Người dùng truy cập vào ứng dụng Web hoặc Mobile chưa đăng nhập
    When Người dùng nhấn nút "Đăng nhập với Google" và xác thực thành công qua Firebase
    Then Client nhận được Firebase ID Token
    And Gửi request GET /api/v1/auth/me với header "Authorization: Bearer <token>"
    And Hệ thống tự động tạo mới bản ghi UserProfile trên Firestore với targetJlptLevel="N5", streak=1
    And Trả về HTTP 200 kèm thông tin hồ sơ người dùng.

  Scenario: Truy cập tài nguyên bảo mật khi Token không hợp lệ hoặc hết hạn
    Given Người dùng gửi request kèm Token đã hết hạn hoặc giả mạo
    When Request đến bộ lọc FirebaseAuthenticationFilter của Backend
    Then Hệ thống từ chối xác thực
    And Trả về mã lỗi HTTP 401 Unauthorized với format JSON ApiResponse chuẩn.
  ```

### User Story 2: Ôn tập Thẻ Từ vựng / Kanji với Thuật toán SRS (US-02)
* **Là một:** Người học  
* **Tôi muốn:** Được ôn lại các thẻ từ vựng đến hạn và tự chấm điểm mức độ nhớ từ 0 đến 5  
* **Để:** Não bộ ghi nhớ lâu dài theo quy luật đường cong lãng quên của Ebbinghaus.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  ```gherkin
  Scenario: Ôn tập thẻ thành công với mức nhớ tốt (Quality = 4)
    Given Người dùng đang mở một thẻ từ vựng "先生" (せんせい)
    When Người dùng lật mặt sau và chọn mức đánh giá Quality = 4
    And Gửi POST /api/v1/progress kèm itemId="先生", itemType="VOCABULARY", quality=4
    Then Thuật toán SM-2 tính toán intervalDays tăng lên (ví dụ: từ 1 ngày lên 6 ngày)
    And Thuộc tính nextReviewDate được cập nhật sang 6 ngày tiếp theo
    And Điểm kinh nghiệm XP của người dùng được cộng thêm 10 điểm
    And Trả về HTTP 200 kèm UserProgress mới nhất.

  Scenario: Đánh giá không nhớ từ (Quality = 1)
    Given Người dùng không nhớ nghĩa từ vựng
    When Chọn mức đánh giá Quality = 1
    Then Thuật toán SM-2 reset repetitionCount về 0 và intervalDays về 1 ngày
    And Thẻ được xếp vào danh sách cần học lại trong ngày hôm sau.
  ```

### User Story 3: Nhận giải thích từ Trợ lý AI Sensei (US-03)
* **Là một:** Người học tiếng Nhật  
* **Tôi muốn:** Hỏi AI Sensei về sự khác biệt giữa hai mẫu ngữ pháp hoặc nhờ đặt câu ví dụ  
* **Để:** Hiểu sâu bản chất ngôn ngữ thay vì chỉ học vẹt nghĩa tiếng Việt.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  ```gherkin
  Scenario: Yêu cầu AI phân tích từ vựng trong ngữ cảnh
    Given Người dùng bấm vào nút "Hỏi AI Sensei" tại thẻ Kanji "日"
    When Client gửi yêu cầu hỏi AI giải thích cách dùng âm On và âm Kun trong thực tế
    Then AI phản hồi câu trả lời súc tích, có giải nghĩa Kanji, Furigana, và ví dụ song ngữ Nhật - Việt
    And Định dạng trả về đúng cấu trúc JSON quy định, không bị chèn văn bản rác.
  ```

---

## 4. ĐẶC TẢ TÍNH NĂNG & THIẾT KẾ KỸ THUẬT (FEATURE SPECIFICATION - MỤC 3.5)

### 4.1. Kiến trúc Tổng thể Đa Nền Tảng (Fullstack Architecture)
- **Frontend Layer:** React 18/19 + TypeScript + Vite + Tailwind CSS + Lucide Icons. Sẵn sàng đóng gói sang Mobile qua Capacitor hoặc Progressive Web App (PWA).
- **API Gateway & Backend Service:** Java 17 + Spring Boot 3.4.2 (Clean Layered Architecture: Controller -> Service -> Repository -> Firestore Driver).
- **Database & Identity:** Google Cloud Firestore (NoSQL Document Store) + Firebase Authentication.
- **AI Integration (LLM Engine):** Tích hợp qua Google Gemini API / Vertex AI SDK với Prompt Templates được thiết kế theo tiêu chuẩn Chương 2.

### 4.2. Cấu trúc Tài liệu Dữ liệu Firestore (Collections Schema)
1. Collection `users`: Khóa tài liệu = `uid`. Chứa thông tin tài khoản, streak, xp, targetJlptLevel.
2. Collection `kanji`: Khóa tài liệu = ký tự Kanji (ví dụ: `日`, `本`). Chứa meanings, onyomi, kunyomi, strokeCount, jlptLevel, examples.
3. Collection `vocabularies`: Khóa tài liệu = `UUID`. Chứa term, reading, meanings, wordType, jlptLevel, audioUrl, examples.
4. Collection `user_progress`: Khóa tài liệu = `{userId}_{itemType}_{itemId}`. Chứa intervalDays, easeFactor, repetitionCount, nextReviewDate.
