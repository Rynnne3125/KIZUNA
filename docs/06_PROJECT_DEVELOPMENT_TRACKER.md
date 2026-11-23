# 📋 KẾ HOẠCH PHÁT TRIỂN & THEO DÕI TIẾN ĐỘ DỰ ÁN (PROJECT DEVELOPMENT TRACKER)
## DỰ ÁN: KIZUNA (絆) - HỆ THỐNG HỌC TIẾNG NHẬT ĐA NỀN TẢNG HỖ TRỢ BỞI AI
**Hệ thống:** KIZUNA Unified Task Tracker  
**Phiên bản:** v3.0.0 (Bản Hợp Nhất & Chuẩn Hóa Toàn Diện)  
**Ngày cập nhật:** 2026-11-23  

---

## 📊 1. BẢNG TỔNG QUAN TIẾN ĐỘ THỰC HIỆN THEO GIAI ĐOẠN

```
[████████████████░░░░] 80% Hoàn Thành Toàn Diện Dự Án
```

| Giai Đoạn | Trọng Tâm Nghiệp Vụ | Trạng Thái | Minh Chứng & Kết Quả Đạt Được |
| :---: | :--- | :---: | :--- |
| **Giai đoạn 0** | Khung Dữ liệu & Số hóa Giáo trình NEJ | **100% Hoàn tất** | Số hóa 4 Chặng, 28 Mốc, 728 Từ vựng, 300 Kanji, 112 Quests $\rightarrow$ nạp 1,202 documents lên Firestore. |
| **Giai đoạn 1** | Backend Core Service & Phân quyền RBAC | **100% Hoàn tất** | Spring Boot 3.4 + JJWT + RBAC; 23/23 Automated Integration Tests Pass 100%. |
| **Giai đoạn 2** | Frontend Bản Đồ Hành Trình (Journey Map) | **100% Hoàn tất** | Bản đồ 4 Chặng uốn lượn, phân cấp trạng thái Locked/Unlocked/Completed, Player Status Bar. |
| **Giai đoạn 3** | Phòng Luyện Tập 4 Bài Học (Quests Room) | **100% Hoàn tất** | Quest Runner: Flashcard SRS, Gatekeeper 100%, Ngữ pháp và Bài tập Về đích. |
| **Giai đoạn 4** | Tích Hợp Live Gemini AI Xếp Lớp | **100% Hoàn tất** | Đấu nối trực tiếp Gemini API chẩn đoán năng lực, rate limit 100 calls/ngày, Semaphore = 2. |
| **Giai đoạn 5** | Phân Hệ Admin Desktop Suite | **85% Hoàn tất** | Đã có CRUD Giáo trình, User Inspector Drawer, Anti-Cheat, Funnel Analytics; Đang hoàn thiện AI Placement Monitor. |
| **Giai đoạn 6** | Đóng Gói Mobile Android APK & PWA | **100% Hoàn tất** | Tích hợp Capacitor Android, cấu hình Gradle, xuất bản file APK cài đặt và deploy Web Hosting. |

---

## 🏛️ 2. PHÂN RÃ CHI TIẾT NHIỆM VỤ QUẢN TRỊ VIÊN (ADMIN TASKS)

### Module ADM-1: Quản Trị Bản Đồ & Điều Phối Mốc Học (Journey Architect)
* [x] **Task ADM-01: Quản trị Danh mục Chặng & Mốc Học:** CRUD 4 chặng và 28 mốc; nút Bật/Tắt hiển thị (`isActive`) để bảo trì mốc chưa công bố.
* [x] **Task ADM-02: Cân bằng Gameplay & Điều kiện Mở khóa:** Form chỉnh sửa `xpReward` (mặc định 50), `activePointsReward` (mặc định 70) và mốc tiên quyết (`prerequisiteMilestoneId`).
* [x] **Task ADM-03: Quản trị Ranh giới Kiến thức (Knowledge Whitelist):** Trích xuất danh mục 26 từ vựng & mẫu câu của mốc, nút thêm nhanh từ vào Whitelist.
* [ ] **Task ADM-04: Sao lưu & Đồng bộ Giáo trình Nhanh:** Nút Export Master JSON và nút Restore dữ liệu gốc từ `KIZUNA_NEJ_SEED_DATA.json`.

### Module ADM-2: Giám Sát AI & Phán Quyết Học Thuật (AI Governance)
* [x] **Task ADM-05: Backend Đấu Nối Google Gemini Live API:** Tích hợp `PlacementAssessmentController` gọi live Gemini chẩn đoán mốc học, khống chế hạn mức 100 calls/ngày.
* [ ] **Task ADM-06: Bảng Giám sát Hạn mức AI (AI Placement & Quota Monitor):** Dashboard hiển thị thanh tiến trình quota ngày (`callsToday/dailyLimit`), tỷ lệ tin cậy High/Mod/Low, và độ trễ Latency trung bình.
* [ ] **Task ADM-07: Human-in-the-loop Audit Center:** Khi mở tính năng viết câu tự do bên User, gắn sự kiện duyệt/từ chối thật kèm tự động hoàn điểm cho học viên.

### Module ADM-3: Vận Hành Học Viên & Chống Gian Lận (User Operations & Fair Play)
* [x] **Task ADM-08: Quản trị Tài khoản & Phân quyền RBAC:** Bảng danh sách học viên, lọc theo quyền (`ROLE_ADMIN` / `ROLE_USER`), nút Ban tài khoản vi phạm.
* [x] **Task ADM-09: Kiểm soát Gian lận Bảng Xếp Hạng:** Nút Reset chuỗi Streak về 0, ô nhập cộng/trừ Điểm Năng Động ảo kèm lý do xử phạt.
* [x] **Task ADM-10: Thanh tra Hồ sơ Học tập Cá nhân (Student Dossier):** Tra cứu các mốc đã xong, số lượng thẻ trong hàng đợi ôn tập SM-2, và danh sách từ hay làm sai.

### Module ADM-4: Phân Tích Học Tập & Phễu Rơi Rụng (Learning Analytics)
* [x] **Task ADM-11: Biểu đồ Phễu Rơi Rụng (Milestone Drop-Off Funnel):** Vẽ biểu đồ tỷ lệ hoàn thành từ Mốc 1 đến 28, tự động phát hiện mốc nghẽn (`isBottleneck`) khi tỷ lệ rơi rụng $\ge 20\%$.
* [x] **Task ADM-12: Báo cáo Từ vựng & Kanji "Tử Thần":** Bảng xếp hạng Top từ vựng và Kanji có tỷ lệ chọn sai cao nhất từ dữ liệu SRS thực tế.

---

## 🎒 3. PHÂN RÃ CHI TIẾT NHIỆM VỤ NGƯỜI HỌC (USER TASKS)

### Module USR-1: Bản Đồ Hành Trình & Gamification
* [x] **Task USR-01: Giao diện Bản đồ Hành trình 4 Chặng:** Đường uốn lượn trực quan, phân định 4 vùng chặng, hiển thị trạng thái Locked/Unlocked/Completed.
* [x] **Task USR-02: Thanh Trạng Thái Gamification Cố Định:** Hiển thị chuỗi Streak ngọn lửa 🔥, Điểm Năng Động tia sét ⚡, Huy hiệu cấp độ, và Avatar học viên.
* [x] **Task USR-03: Modal Tóm Tắt Mốc Học:** Bấm vào mốc hiển thị bối cảnh giao tiếp, mục tiêu năng lực Can-do, và nút bắt đầu bài học.

### Module USR-2: Vòng Lặp Luyện Tập 4 Bài Học (Quest Micro-Loop)
* [x] **Task USR-04: Quest 1 - Thẻ Ghi Nhớ Cốt Lõi (SRS Flashcard):** Nạp 26 từ vựng & Kanji của mốc, lật thẻ 2 mặt có âm Hán Việt và câu ví dụ.
* [x] **Task USR-05: Quest 2 - Cổng Kiểm Soát Từ Vựng (Gatekeeper):** Bài kiểm tra trắc nghiệm phản xạ 100%, tự động nạp từ sai vào hàng đợi ôn tập SM-2.
* [x] **Task USR-06: Quest 3 - Phân Tích Ngữ Pháp & Cấu Trúc:** Học 2-3 mẫu câu trọng tâm, giải thích ngữ cảnh và sắc thái tự nhiên.
* [x] **Task USR-07: Quest 4 - Thử Thách Về Đích:** Điền khuyết có gợi ý (`hintOnError`), hoàn thành mốc, nhận thưởng XP và mở khóa mốc kế tiếp.

### Module USR-3: Ôn Tập Ngắt Quãng & Chẩn Đoán Đầu Vào
* [x] **Task USR-08: Hàng Đợi Ôn Tập SuperMemo SM-2:** Quét các từ đến hạn ôn hôm nay, đánh giá 0-5 sao, tự động tính lại $EF$ và khoảng cách ngày $I$.
* [x] **Task USR-09: Khảo Sát & Xếp Lớp Đầu Vào Bằng AI:** Khảo sát mục tiêu, làm bài test trắc nghiệm thích ứng, Gemini AI gợi ý mốc xuất phát và tự động mở khóa lộ trình phù hợp.

### Module USR-4: Đua Top & Đa Nền Tảng
* [x] **Task USR-10: Bảng Xếp Hạng Điểm Năng Động:** Bảng vinh danh Top 50 học viên chăm chỉ nhất, tự động đồng bộ theo tuần và toàn thời gian.
* [x] **Task USR-11: Hỗ Trợ Đa Nền Tảng & Offline Fallback:** Đồng bộ thời gian thực qua Firestore, hỗ trợ lưu trữ tạm thời LocalStorage khi mất kết nối mạng.
