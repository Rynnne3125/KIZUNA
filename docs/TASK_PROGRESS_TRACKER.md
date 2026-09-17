# 📋 Kế Hoạch & Tiến Trình Phát Triển Dự Án KIZUNA (绊)
**Học phần:** CS2028 - AI Product Development: End to End  
**Đơn vị:** Trường Đại học Công nghệ Thông tin & Truyền thông Việt - Hàn (VKU)  
**Hệ thống:** KIZUNA - Ứng dụng Học Tiếng Nhật Đa Nền Tảng Hỗ Trợ Bởi AI  
**Phiên bản:** v2.1.0  
**Cập nhật lần cuối:** 2026-09-17  

---

## 📊 Tổng Quan Trạng Thái Tiến Độ Dự Án

`
[██████████░░░░░░░░░░] 50% Hoàn Thành Toàn Diện
`

- **Phase 0 (Khung Dữ Liệu & Chuẩn Bị):** [x] 100% HOÀN TẤT (Firestore Seed: 4 Chặng, 28 Mốc, 728 Từ vựng, 300 Kanji, 112 Quests).
- **Phase 1 (Backend Core Learning API):** [ ] 0% CHUẨN BỊ THỰC HIỆN.
- **Phase 2 (Frontend Bản Đồ Hành Trình):** [ ] 0% CHƯA BẮT ĐẦU.
- **Phase 3 (Frontend Phòng Luyện Tập 4 Bài Học):** [ ] 0% CHƯA BẮT ĐẦU.
- **Phase 4 (Tích Hợp AI Sensei Gemini):** [ ] 0% CHƯA BẮT ĐẦU.
- **Phase 5 (Leaderboard, Mobile Package & Demo):** [ ] 0% CHƯA BẮT ĐẦU.

---

## 🗺️ Chi Tiết Các Giai Đoạn & Danh Sách Từng Task Cụ Thể

---

### 🟢 GIAI ĐOẠN 0: NỀN TẢNG HỆ THỐNG & DỮ LIỆU GIÁO TRÌNH (ĐÃ HOÀN TẤT)

- [x] **Task 0.1 - Kiến trúc Dự án & Xác thực Backend:**
  - Khởi tạo Spring Boot 3.4 kết hợp Firebase Admin SDK.
  - Xây dựng module User Management CRUD, tích hợp bảo mật RBAC (ROLE_ADMIN vs ROLE_USER).
  - Viết Integration Tests xác thực thành công các chức năng người dùng.
- [x] **Task 0.2 - Thiết kế Cấu trúc Database & Sơ đồ ERD:**
  - Định hình mô hình dữ liệu lai (Hybrid Architecture) trên Firestore.
  - Hoàn thiện ERD 10 Collection liên kết và cập nhật vào docs/PRD_KIZUNA.md và docs/3.5_FEATURE_SPECIFICATIONS.md.
- [x] **Task 0.3 - Số Hóa & Cào Dữ Liệu Giáo Trình NEJ Vol 1 & 2:**
  - Bóc tách toàn bộ 24 Unit sách NEJ kết hợp bảng chữ cái và mốc cầu nối thành 4 Chặng và 28 Mốc học.
  - Số hóa trọn vẹn **300 chữ Hán mục tiêu NEJ** (Trang 2 & 3 Vol 1) với số nét, bộ thủ, On/Kun, Hán Việt, Mnemonic, từ ghép.
  - Mở rộng kho từ vựng lên **728 từ vựng** (26 từ/mốc) có âm Hán Việt, câu ví dụ Nhật - Việt.
  - Thiết kế chuẩn hóa **112 Quests** (4 bài học/mốc: SRS Flashcard, Vocab Gatekeeper 100%, Ngữ pháp ghép câu & Bảng tổng kết, Điền khuyết hintOnError & Điểm Năng Động).
- [x] **Task 0.4 - Nạp Dữ Liệu Lên Firestore:**
  - Viết kịch bản `frontend/seed_kizuna_full_nej.mjs` sử dụng Firebase Web SDK v10 batch write.
  - Đẩy thành công toàn bộ 1,202 documents lên Firestore project `ebook-fdc02`.
  - Tạo tệp lưu trữ dữ liệu tổng thể tại `docs/KIZUNA_NEJ_SEED_DATA.json`.

---

### 🟡 GIAI ĐOẠN 1: BACKEND SERVICE LAYER CHO NGHIỆP VỤ HỌC TẬP (CORE LEARNING API)
> **Mục tiêu:** Xây dựng các API nghiệp vụ phục vụ việc điều phối bản đồ hành trình, nộp bài, tính điểm năng động và quản lý thuật toán lặp lại ngắt quãng SM-2.

- [ ] **Task 1.1 - Journey Map Service & Controller:**
  - **Mô tả:** Xây dựng API trả về toàn bộ bản đồ hành trình kèm trạng thái cá nhân hóa của học viên.
  - **Endpoint:** GET /api/v1/journey/map
  - **Logic:**
    - Đọc dữ liệu 4 chặng (stages) và 28 mốc (milestones).
    - Nối với bảng tiến độ học viên user_progress theo userId.
    - Trả về từng mốc kèm cờ: LOCKED, UNLOCKED, IN_PROGRESS, COMPLETED, số bài học đã hoàn thành / 4.
  - **Tiêu chí nghiệm thu (Acceptance Criteria):** Học viên mới vào thấy Mốc 1 mở khóa, các mốc sau khóa; học viên đã học hiển thị đúng tiến độ.

- [ ] **Task 1.2 - Milestone Quest Detail API:**
  - **Mô tả:** Lấy thông tin chi tiết mốc và nội dung 4 bài học để học viên vào phòng học.
  - **Endpoint:** GET /api/v1/milestones/{milestoneId}/quests
  - **Logic:**
    - Kiểm tra quyền truy cập: mốc phải ở trạng thái UNLOCKED hoặc COMPLETED.
    - Trả về danh sách 4 bài học: Bài 1 (SRS Deck), Bài 2 (Gatekeeper), Bài 3 (Scramble & Board), Bài 4 (Practice).
    - Đính kèm thông tin quest hiện tại học viên cần làm tiếp.

- [ ] **Task 1.3 - Quest Submission & Progress Evaluator API:**
  - **Mô tả:** Nhận kết quả nộp bài của từng bài học, chấm điểm, tích lũy Điểm Năng Động và mở khóa mốc tiếp theo.
  - **Endpoint:** POST /api/v1/milestones/{milestoneId}/quests/{questId}/submit
  - **Logic:**
    - **Bài 1 (SRS):** Ghi nhận đã xem hết các thẻ từ vựng/kanji -> Thưởng 25 XP, 10 Active Points.
    - **Bài 2 (Gatekeeper):** Kiểm tra đạt 100% (vòng lặp hoàn tất) -> Thưởng 35 XP, 15 Active Points. Nếu có từ sai trong quá trình làm, tự động đẩy vào hàng đợi user_srs_items.
    - **Bài 3 (Grammar):** Kiểm tra các câu ghép thẻ từ -> Thưởng 45 XP, 20 Active Points.
    - **Bài 4 (Practice & Về đích):** Kiểm tra câu hỏi điền khuyết -> Thưởng 50 XP, 25 Active Points.
    - **Tự động chuyển trạng thái:** Khi hoàn tất Bài 4:
      - Đánh dấu mốc hiện tại là COMPLETED.
      - Tự động chuyển mốc kế tiếp sang UNLOCKED trong user_progress.
      - Cập nhật tổng ctivePoints, 	otalXp, và chuỗi currentStreak trong collection users.

- [ ] **Task 1.4 - Spaced Repetition (SM-2) Engine Service:**
  - **Mô tả:** Xây dựng thuật toán ngắt quãng khoa học SuperMemo-2 cho các từ vựng và chữ Hán học viên từng làm sai.
  - **Endpoints:**
    - GET /api/v1/srs/today: Lấy danh sách thẻ đến hạn ôn tập hôm nay (
extReviewDate <= now).
    - POST /api/v1/srs/{itemId}/review: Gửi kết quả nhớ thẻ (Điểm chất lượng nhớ 0-5) -> Tính toán lại intervalDays, easeFactor, và 
extReviewDate mới.

- [ ] **Task 1.5 - Leaderboard Service & Dynamic Ranking API:**
  - **Mô tả:** Cung cấp bảng xếp hạng học viên theo Điểm Năng Động và chuỗi học tập bền bỉ.
  - **Endpoint:** GET /api/v1/leaderboard (Hỗ trợ lọc theo weekly hoặc ll-time).
  - **Logic:** Lấy Top 50 học viên sắp xếp theo ctivePoints DESC, trả về vị trí hạng, tên, avatar, streak.

- [ ] **Task 1.6 - Automated Backend Integration Tests:**
  - **Mô tả:** Viết test suite giả lập luồng học hoàn chỉnh: Học viên mới -> Xem map -> Làm bài 1, 2, 3, 4 -> Mở mốc mới -> Kiểm tra điểm năng động và bảng xếp hạng.

---

### 🔵 GIAI ĐOẠN 2: GIAO DIỆN FRONTEND - BẢN ĐỒ HÀNH TRÌNH (JOURNEY MAP UI)
> **Mục tiêu:** Dựng giao diện bản đồ học tập trực quan sinh động trên Web và Mobile, kích thích cảm giác phiêu lưu khám phá.

- [ ] **Task 2.1 - Kiến Trúc State & Firestore/API Client Frontend:**
  - Cấu hình Axios / Firebase Client kết nối Backend Spring Boot.
  - Lưu trạng thái đăng nhập, User Profile, Active Points và tiến độ mốc.

- [ ] **Task 2.2 - Thiết Kế Giao Diện Bản Đồ Trực Quan (Interactive Roadmap Map):**
  - Hiển thị 4 phân vùng Chặng với màu sắc đặc trưng.
  - Vẽ các Mốc học tập dạng nút tròn liên kết bằng các đường cong uốn lượn (Winding Path/Roadmap).
  - Trạng thái trực quan:
    - Mốc đã hoàn thành: Màu xanh lá, icon dấu tích hoặc vương miện.
    - Mốc đang học: Hiệu ứng tỏa sáng (Glowing Pulse Animation), cờ định vị nhân vật.
    - Mốc chưa mở: Màu xám, biểu tượng ổ khóa.

- [ ] **Task 2.3 - Header Gamification & Widget Trạng Thái:**
  - Hiển thị thanh trên cùng cố định:
    - Chuỗi học tập: Icon ngọn lửa 🔥 + Số ngày streak.
    - Điểm Năng Động: Icon sấm sét ⚡ + Điểm Active Points.
    - Cấp độ hiện tại: Huy hiệu N5 / N4.
    - Ảnh đại diện & Menu cá nhân.

- [ ] **Task 2.4 - Modal Chi Tiết Mốc (Milestone Launch Drawer):**
  - Khi học viên click vào một Mốc mở khóa trên bản đồ:
    - Bật popup/drawer hiển thị tiêu đề mốc, bài học NEJ tương ứng.
    - Danh sách 4 bài học kèm trạng thái đã làm / chưa làm.
    - Điểm năng động và XP sẽ nhận được.
    - Nút lớn: **"Vào bài học ngay" (Start Quest)**.

---

### 🟣 GIAI ĐOẠN 3: PHÒNG LUYỆN TẬP 4 BÀI HỌC TẠI MỐC (QUEST ROOM UI)
> **Mục tiêu:** Xây dựng trải nghiệm tương tác liền mạch cho 4 bài học mà hệ thống đã chuẩn hóa.

- [ ] **Task 3.1 - Khung Điều Phối Bài Học (Quest Runner Shell):**
  - Header bài học: Nút thoát có xác nhận lưu tiến độ, thanh tiến trình hiển thị 4 bước (25% - 50% - 75% - 100%).
  - Cơ chế tự động chuyển bài mượt mà khi hoàn tất một quest.

- [ ] **Task 3.2 - Màn Hình Bài 1: Thẻ Học Ghi Nhớ Cốt Lõi (SRS Flashcards):**
  - Thẻ học có hiệu ứng lật 3D mượt mà (Flip Card):
    - Mặt trước: Chữ viết (Kanji/Kana) + Nút loa phát âm.
    - Mặt sau: Cách đọc Hiragana, Âm Hán Việt in hoa nổi bật, Nghĩa tiếng Việt, Câu ví dụ ngữ cảnh.
    - Nếu là thẻ Kanji: Hiển thị thêm số nét, bộ thủ, âm On/Kun và câu chuyện mẹo nhớ (Mnemonic).
  - Hai nút đánh giá: "Chưa nhớ" (Đẩy vào hàng đợi ôn lại) vs "Đã nhớ".

- [ ] **Task 3.3 - Màn Hình Bài 2: Cổng Từ Vựng Phản Xạ (Vocab Gatekeeper 100%):**
  - Câu hỏi trắc nghiệm phản xạ từ vựng với 4 phương án lựa chọn đảo ngẫu nhiên.
  - Khi chọn đúng: Hiệu ứng âm thanh vui tươi, tích điểm.
  - Khi chọn sai: Rung màn hình, hiển thị giải thích chi tiết, tự động đưa câu này vào cuối hàng đợi làm lại.
  - Chỉ khi trả lời chính xác 100% danh sách từ mới được kết thúc bài.

- [ ] **Task 3.4 - Màn Hình Bài 3: Ngữ Pháp Ghép Câu & Bảng Tổng Kết (Scramble & Summary Board):**
  - **Phần 1 - Ghép câu:** Hiển thị câu tiếng Việt mẫu; học viên chạm vào các thẻ từ xáo trộn (wordTokens) để xếp thành câu tiếng Nhật hoàn chỉnh.
  - **Phần 2 - Bảng Tổng Kết Ngữ Pháp Chuyên Sâu (grammarSummaryBoard):**
    - Trình bày dạng thẻ học trực quan giải thích công thức, lý do người Nhật dùng cách nói này trong giao tiếp thực tế và câu ví dụ chuẩn.

- [ ] **Task 3.5 - Màn Hình Bài 4: Điền Khuyết Thực Chiến & Về Đích Mốc:**
  - Câu hỏi trắc nghiệm điền trợ từ/từ vào chỗ trống.
  - Có cơ chế **Gợi ý khi chọn sai (hintOnError)** giúp học viên hiểu ngay bản chất trợ từ.
  - Màn hình chiến thắng về đích: Hiệu ứng pháo hoa, popup thông báo cộng Điểm Năng Động (Active Points) và âm thanh mở khóa mốc tiếp theo trên bản đồ.

---

### 🟠 GIAI ĐOẠN 4: TÍCH HỢP ĐỘNG CƠ AI SENSEI (GOOGLE GEMINI API)
> **Mục tiêu:** Hiện thực hóa tính năng cốt lõi của đồ án AI Product Development - AI Sensei chấm chữa câu viết tự do trong phạm vi Whitelist an toàn.

- [ ] **Task 4.1 - Backend Gemini Client & Rate Limiter:**
  - Tích hợp Google Gemini Pro API thông qua REST / Spring AI Client.
  - Cấu hình API Key, Timeout và cơ chế Rate Limiting bảo vệ chi phí.

- [ ] **Task 4.2 - Prompt Engineering & Quality Guardrails:**
  - Thiết kế System Prompt đóng vai giáo viên tiếng Nhật bản xứ thân thiện, kiên nhẫn.
  - Truyền Whitelist từ vựng và ngữ pháp của mốc học vào Prompt để AI không chấm dùng từ vượt cấp.
  - Định dạng JSON Output nghiêm ngặt: Điểm số (1-10), nhận xét ngữ pháp, sửa lỗi trợ từ, gợi ý cách nói tự nhiên hơn.

- [ ] **Task 4.3 - API Chấm Câu Viết Tự Do (POST /api/v1/ai/evaluate-writing):**
  - Tiếp nhận câu viết tiếng Nhật của học viên từ bài tập mở rộng của mốc.
  - Gọi Gemini xử lý và trả về phản hồi tức thời trong < 3 giây.

- [ ] **Task 4.4 - Giao Diện Hộp Thoại AI Sensei:**
  - Widget AI Sensei dạng chatbox / popup góp ý ngay sau khi học viên nộp câu tự viết.
  - Tô màu trực quan các từ bị sai chính tả/trợ từ kèm mũi tên sửa lại đúng.

---

### 🔴 GIAI ĐOẠN 5: BẢNG XẾP HẠNG, ÔN TẬP SM-2 & ĐÓNG GÓI BẢO VỆ ĐỒ ÁN
> **Mục tiêu:** Hoàn thiện trải nghiệm người dùng, đóng gói ứng dụng di động và chuẩn bị kịch bản demo kết thúc môn.

- [ ] **Task 5.1 - Màn Hình Bảng Xếp Hạng Năng Động (Leaderboard UI):**
  - Vinh danh Top 3 học viên với bục nhận giải (Vàng, Bạc, Đồng).
  - Danh sách thứ hạng hiển thị avatar, tên, số ngày streak, và điểm Active Points.
  - Vị trí hiện tại của chính học viên luôn được ghim ở thanh dưới cùng.

- [ ] **Task 5.2 - Trung Tâm Ôn Tập Ngắt Quãng Hằng Ngày (Spaced Review Center):**
  - Màn hình tập trung hiển thị các thẻ từ vựng và Kanji đến hạn ôn tập hôm nay.
  - Nút "Ôn tập nhanh 5 phút" kích hoạt luồng ôn thẻ nhanh để duy trì streak.

- [ ] **Task 5.3 - Tối Ưu Mobile-First & Đóng Gói Android APK:**
  - Tinh chỉnh CSS/Responsive cho màn hình cảm ứng điện thoại di động.
  - Cấu hình Capacitor / PWA để đóng gói mã nguồn thành file APK chạy thử nghiệm mượt mà trên điện thoại Android thật.

- [ ] **Task 5.4 - Kịch Bản & Dữ Liệu Demo Bảo Vệ Đồ Án (Demo Script):**
  - Soạn kịch bản demo 5 bước theo đúng Mục 6 của PRD:
    1. Đăng nhập học viên -> Xem Bản đồ Hành trình sống động.
    2. Chinh phục 1 mốc học trải qua trọn vẹn 4 bài học.
    3. Thử thách viết tự do có AI Sensei chấm điểm tức thì.
    4. Thấy Mốc tiếp theo tự động mở khóa và Điểm Năng Động nhảy vọt trên Bảng xếp hạng.
    5. Trình diễn thẻ nhớ quay lại ôn tập theo thuật toán SM-2.
