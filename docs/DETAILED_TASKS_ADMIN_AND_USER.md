# 📋 ĐẶC TẢ CHI TIẾT DANH MỤC CÔNG VIỆC: PHÂN HỆ ADMIN & PHÂN HỆ USER
## DỰ ÁN: KIZUNA (絆) - HÀNH TRÌNH HỌC TIẾNG NHẬT ĐA NỀN TẢNG HỖ TRỢ BỞI AI
**Học phần:** CS2028 - AI Product Development: End to End  
**Trường:** Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU) - Đại học Đà Nẵng  
**Phiên bản tài liệu:** v2.1.0  
**Ngày lập:** 2026-09-17  

---

## 🧭 TỔNG QUAN HAI PHÂN HỆ HỆ THỐNG

Hệ sinh thái KIZUNA được phân định rõ rệt thành hai phân hệ trải nghiệm nhằm tối ưu hóa vai trò của từng nhóm người dùng:

`
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     HỆ SINH THÁI KIZUNA                                         │
└─────────────────────────────────┬──────────────────────────────────┬─────────────────────────────┘
                                  │                                  │
                                  ▼                                  ▼
      ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
      │         PHÂN HỆ ADMIN (WEB DESKTOP)      │    │    PHÂN HỆ USER (WEB & ANDROID APK)      │
      │         "Game Master & AI Supervisor"    │    │          "Lữ Khách Chinh Phục"           │
      ├──────────────────────────────────────────┤    ├──────────────────────────────────────────┤
      │ • Quản trị Lộ trình & Bản đồ vĩ mô       │    │ • Khám phá Bản đồ Hành trình 4 Chặng     │
      │ • Thiết lập Whitelist & Cân bằng Điểm số │    │ • Phòng luyện tập 4 Bài học tại Mốc      │
      │ • AI Prompt Studio & Audit câu AI chấm   │    │ • Tương tác Trợ lý AI Sensei chấm viết   │
      │ • Vận hành Học viên & Chống gian lận     │    │ • Ôn tập ngắt quãng hàng ngày (SM-2)     │
      │ • Phân tích Phễu Rơi Rụng học tập        │    │ • Đua top Bảng Xếp Hạng Điểm Năng Động   │
      └──────────────────────────────────────────┘    └──────────────────────────────────────────┘
`

---

# 🏛️ PHẦN A: PHÂN HỆ QUẢN TRỊ VIÊN (ADMIN WEB PORTAL)

Phân hệ Admin được thiết kế chuyên dụng cho màn hình máy tính (Web Desktop), tối ưu cho giáo viên, quản trị viên nội dung và giám sát mô hình AI.

---

## MODULE ADM-1: QUẢN TRỊ BẢN ĐỒ & ĐIỀU PHỐI MỐC HỌC (JOURNEY & MILESTONE ARCHITECT)

### 📌 Task ADM-01: Quản Trị Danh Mục Chặng & Mốc Học Tập
- **Mục tiêu:** Cho phép Admin quản lý cấu trúc vĩ mô của toàn bộ 4 Chặng và 28 Mốc mà không làm xáo trộn dữ liệu cốt lõi đã nạp.
- **Thành phần kỹ thuật:**
  - Backend API: GET /api/v1/admin/stages, PUT /api/v1/admin/milestones/{id}/status
  - Collection Firestore: stages, milestones
  - Frontend Screen: AdminMilestoneManagerView.vue / .tsx
- **Mô tả công việc chi tiết:**
  1. Hiển thị danh sách 4 Chặng và 28 Mốc dạng cây phân cấp (Tree View) hoặc bảng dữ liệu (Data Table).
  2. Nút chuyển đổi trạng thái mốc: **Bật/Tắt hiển thị (Active/Inactive Toggle)** để ẩn các mốc đang biên tập, chưa muốn công bố cho học viên.
  3. Cho phép chỉnh sửa tiêu đề tiếng Việt, phụ đề và bối cảnh giao tiếp của mốc mà vẫn giữ nguyên liên kết  `nejUnit`.
- **Tiêu chí nghiệm thu (DoD):**
  - Admin bấm Tắt 1 mốc -> Học viên ở app User sẽ thấy mốc đó biến mất hoặc hiển thị trạng thái "Bảo trì/Sắp ra mắt".

---

### 📌 Task ADM-02: Cân Bằng Gameplay & Điều Kiện Mở Khóa (Gamification Balance)
- **Mục tiêu:** Trao quyền cho Admin điều chỉnh độ khó và phần thưởng để tối ưu động lực học viên.
- **Thành phần kỹ thuật:**
  - Backend API: PUT /api/v1/admin/milestones/{id}/gameplay-config
  - Collection Firestore: milestones
- **Mô tả công việc chi tiết:**
  1. Form điều chỉnh số điểm kinh nghiệm (`xpReward`) và Điểm Năng Động (`activePointsReward`) cho từng mốc học (mặc định mốc sơ cấp 70 Active Points, mốc nâng cao có thể tăng lên 100-120 điểm).
  2. Thiết lập mốc điều kiện tiên quyết (`prerequisiteMilestoneId`): Chọn mốc nào học viên bắt buộc phải hoàn thành trước khi được mở mốc này.
  3. Cấu hình cờ mốc: Mốc cốt lõi (Core Unit) hoặc Nhánh chuyên biệt (Specialized Branch: Tiếng Nhật công sở, Phỏng vấn xin việc).
- **Tiêu chí nghiệm thu (DoD):**
  - Dữ liệu cấu hình mới được cập nhật tức thì lên Firestore và áp dụng ngay cho các phiên học tiếp theo của User.

---

### 📌 Task ADM-03: Quản Trị Ranh Giới Kiến Thức (Knowledge Whitelist Manager)
- **Mục tiêu:** Giám sát danh mục từ vựng, chữ Hán và cấu trúc ngữ pháp được dùng làm căn cứ chấm thi cho AI.
- **Thành phần kỹ thuật:**
  - Backend API: GET /api/v1/admin/milestones/{id}/whitelist, POST /api/v1/admin/milestones/{id}/whitelist/item
  - Collection Firestore: ocabulary_items, kanji_dictionary, grammar_items
- **Mô tả công việc chi tiết:**
  1. Màn hình hiển thị danh sách 26 từ vựng, Kanji và các mẫu câu của từng mốc.
  2. Cho phép gắn cờ **Trọng tâm (Core)** hoặc **Mở rộng (Supplementary)**.
  3. Nút thêm nhanh 1 từ vựng mới vào whitelist của mốc nếu giáo viên phát hiện thiếu sót trong quá trình giảng dạy.
- **Tiêu chí nghiệm thu (DoD):**
  - Whitelist này sẽ được tự động đính kèm vào System Prompt khi gọi AI chấm bài để đảm bảo AI không bắt lỗi vượt ngoài những gì mốc đã dạy.

---

### 📌 Task ADM-04: Sao Lưu & Đồng Bộ Dữ Liệu Giáo Trình (Curriculum Backup & Sync)
- **Mục tiêu:** Đảm bảo an toàn dữ liệu, chống mất mát hoặc lỗi cấu hình.
- **Thành phần kỹ thuật:**
  - Backend API: GET /api/v1/admin/curriculum/export, POST /api/v1/admin/curriculum/sync
- **Mô tả công việc chi tiết:**
  1. Nút "Xuất toàn bộ giáo trình ra JSON" (Export Master JSON) tải về file dự phòng tương đương docs/KIZUNA_NEJ_SEED_DATA.json.
  2. Nút "Khôi phục dữ liệu chuẩn" (Reset to Default Seed) để nạp lại dữ liệu gốc nếu có sự cố chỉnh sửa sai lệch.
- **Tiêu chí nghiệm thu (DoD):**
  - Tải về tệp JSON hợp lệ trong vòng dưới 2 giây; xác thực toàn vẹn 1,202 bản ghi.

---

## MODULE ADM-2: GIÁM SÁT & HUẤN LUYỆN TRỢ LÝ AI SENSEI (AI GOVERNANCE & AUDIT)
> *Đây là phân hệ cốt lõi thể hiện năng lực kiểm soát sản phẩm AI trong đồ án học phần CS2028.*

### 📌 Task ADM-05: AI Prompt Studio & Sandbox (Phòng Thử Nghiệm Prompt)
- **Mục tiêu:** Môi trường thử nghiệm trực tiếp để Admin kiểm tra chất lượng sinh bài và chấm điểm của Google Gemini trước khi phát hành tính năng.
- **Thành phần kỹ thuật:**
  - Backend API: POST /api/v1/admin/ai/sandbox-test
  - Integration: Google Gemini 1.5 Pro / Flash API
  - Frontend Screen: AdminAiSandboxView.vue / .tsx
- **Mô tả công việc chi tiết:**
  1. Giao diện thử nghiệm gồm 3 cột:
     - **Cột 1 (Cấu hình):** Chọn mốc học (tự động nạp Whitelist), chỉnh Temperature (0.0 - 1.0), chỉnh sửa System Prompt Template.
     - **Cột 2 (Đầu vào thử nghiệm):** Nhập đề bài và câu trả lời giả định của học viên (ví dụ câu có lỗi trợ từ, câu dùng từ lóng, câu đúng hoàn toàn).
     - **Cột 3 (Kết quả phản hồi):** Hiển thị JSON kết quả do Gemini sinh ra: Điểm số, lỗi sai được chỉ ra, gợi ý cách nói tự nhiên, thời gian xử lý (Latency tính bằng ms), số lượng token tiêu tốn.
  2. Nút "Lưu làm mẫu chuẩn" (Save as Production Prompt) khi đạt được chất lượng ưng ý.
- **Tiêu chí nghiệm thu (DoD):**
  - Chạy thử nghiệm thành công với Gemini API, hiển thị rõ ràng định dạng JSON kết quả và thời gian phản hồi thực tế.

---

### 📌 Task ADM-06: Trung Tâm Kiểm Duyệt Phán Quyết AI (Human-in-the-Loop Audit Center)
- **Mục tiêu:** Đảm bảo tính công bằng học thuật bằng cách để giáo viên can thiệp xử lý các trường hợp học viên khiếu nại AI chấm sai.
- **Thành phần kỹ thuật:**
  - Backend API: GET /api/v1/admin/ai/audit-queue, POST /api/v1/admin/ai/audit-queue/{id}/resolve
  - Collection Firestore: i_evaluation_audits
  - Frontend Screen: AdminAiAuditQueueView.vue / .tsx
- **Mô tả công việc chi tiết:**
  1. Danh sách các bài tập viết tự do bị học viên bấm cờ "Khiếu nại AI chấm chưa chuẩn" (Report Issue).
  2. Chi tiết khiếu nại thể hiện:
     - Đề bài thực hành tại mốc.
     - Câu trả lời gốc của học viên.
     - Lời phê bình và số điểm AI Sensei đã chấm.
     - Lý do học viên gửi kèm (ví dụ: *"Từ này người Nhật vẫn dùng trong đời thường nhưng AI bảo sai"*).
  3. Hai nút xử lý của Admin:
     - **Công nhận đúng (Approve & Reward):** Ghi đè kết quả của AI, cộng lại Điểm Năng Động cho học viên kèm thông báo xin lỗi từ hệ thống.
     - **Bác bỏ khiếu nại (Reject with Note):** Giữ nguyên phán quyết của AI kèm lời giải thích bổ sung từ Admin.
- **Tiêu chí nghiệm thu (DoD):**
  - Khi Admin bấm "Công nhận đúng", điểm của học viên lập tức được hoàn lại và bản ghi được lưu vào kho dữ liệu mẫu để tái huấn luyện Prompt.

---

### 📌 Task ADM-07: Giám Sát Chi Phí & Hạn Mức Token AI (Token & Latency Metrics)
- **Mục tiêu:** Kiểm soát chi phí vận hành và tính ổn định của hệ thống AI.
- **Thành phần kỹ thuật:**
  - Backend API: GET /api/v1/admin/ai/metrics
  - Metric Collector: Spring Boot Actuator / Micrometer
- **Mô tả công việc chi tiết:**
  1. Biểu đồ thống kê số lượt gọi Gemini API theo từng ngày/tuần.
  2. Thống kê chi phí token tiêu thụ ước tính.
  3. Cảnh báo lỗi: Tỉ lệ phản hồi quá hạn (> 5s) hoặc lỗi chạm giới hạn băng thông (HTTP 429 Rate Limit).
- **Tiêu chí nghiệm thu (DoD):**
  - Hiển thị trực quan biểu đồ hoạt động của API AI trong 7 ngày gần nhất.

---

## MODULE ADM-3: VẬN HÀNH HỌC VIÊN & CÔNG BẰNG HỆ THỐNG (USER OPERATIONS & FAIR PLAY)

### 📌 Task ADM-08: Quản Trị Tài Khoản Học Viên & Phân Quyền RBAC
- **Mục tiêu:** Quản lý toàn bộ danh sách người dùng và phân cấp bảo mật.
- **Thành phần kỹ thuật:**
  - Backend API: GET /api/v1/admin/users, PUT /api/v1/admin/users/{uid}/role, PUT /api/v1/admin/users/{uid}/status
  - Collection Firestore: users
- **Mô tả công việc chi tiết:**
  1. Bảng danh sách học viên có chức năng phân trang, tìm kiếm theo email, tên và cấp độ (N5, N4).
  2. Nút thăng cấp/hạ cấp tài khoản: Gán quyền ROLE_ADMIN hoặc hạ về ROLE_USER (tự động đồng bộ Firebase Custom Claims).
  3. Nút Khóa tài khoản (Ban) đối với người dùng vi phạm quy chuẩn ứng xử.
- **Tiêu chí nghiệm thu (DoD):**
  - Thay đổi quyền hạn có hiệu lực ngay lập tức trong phiên đăng nhập kế tiếp của người dùng.

---

### 📌 Task ADM-09: Kiểm Soát Bảng Xếp Hạng & Chống Gian Lận (Anti-Cheat Engine)
- **Mục tiêu:** Giữ vững giá trị thi đua công bằng của Điểm Năng Động (Active Points) và chuỗi học tập (Streak).
- **Thành phần kỹ thuật:**
  - Backend API: POST /api/v1/admin/users/{uid}/reset-streak, POST /api/v1/admin/users/{uid}/adjust-points
  - Collection Firestore: users, leaderboard
- **Mô tả công việc chi tiết:**
  1. Cảnh báo các tài khoản có hành vi bất thường: Tăng đột biến hàng ngàn Điểm Năng Động trong vài phút hoặc chuỗi ngày học vượt quá thực tế.
  2. Nút can thiệp:
     - Reset chuỗi Streak về 0 nếu phát hiện gian lận đổi giờ hệ thống.
     - Trừ bớt Điểm Năng Động ảo do spam bài tập.
- **Tiêu chí nghiệm thu (DoD):**
  - Thao tác can thiệp tự động cập nhật ngay trên Bảng xếp hạng toàn hệ thống.

---

### 📌 Task ADM-10: Thanh Tra Tiến Độ Học Tập Cá Nhân (Student Deep-Dive)
- **Mục tiêu:** Cho phép giáo viên theo dõi chi tiết quá trình học của một học viên cụ thể để hỗ trợ.
- **Thành phần kỹ thuật:**
  - Backend API: GET /api/v1/admin/users/{uid}/learning-dossier
- **Mô tả công việc chi tiết:**
  1. Xem bản đồ thu nhỏ của riêng học viên: Mốc nào đã xong, mốc nào đang học dở.
  2. Thống kê số lượng từ vựng và Kanji học viên đang tích lũy trong hàng đợi ôn tập SM-2.
  3. Xem danh sách những từ học viên hay làm sai nhất.
- **Tiêu chí nghiệm thu (DoD):**
  - Tải đầy đủ hồ sơ học tập của học viên chỉ trong 1 lần bấm.

---

## MODULE ADM-4: PHÂN TÍCH HỌC TẬP & PHỄU RƠI RỤNG (LEARNING ANALYTICS)

### 📌 Task ADM-11: Biểu Đồ Phễu Rơi Rụng Học Viên (Milestone Drop-Off Funnel)
- **Mục tiêu:** Nhận diện các điểm nghẽn khiến học viên bỏ cuộc trên lộ trình.
- **Thành phần kỹ thuật:**
  - Backend API: GET /api/v1/admin/analytics/drop-off-funnel
- **Mô tả công việc chi tiết:**
  1. Vẽ biểu đồ phễu trực quan thể hiện số lượng học viên hoàn thành từ Mốc 1 đến Mốc 28.
  2. Làm nổi bật các "mốc đỏ" có tỉ lệ học viên dừng lại không học tiếp cao bất thường (giúp giáo viên biết mốc đó đang quá khó hoặc quá dài để tinh chỉnh).
- **Tiêu chí nghiệm thu (DoD):**
  - Hiển thị phần trăm rơi rụng chính xác theo dữ liệu user_progress thực tế.

---

### 📌 Task ADM-12: Báo Cáo Từ Vựng & Chữ Hán "Tử Thần" (Hardest Items Report)
- **Mục tiêu:** Thống kê các kiến thức khó nhất đối với người Việt khi học tiếng Nhật.
- **Thành phần kỹ thuật:**
  - Backend API: GET /api/v1/admin/analytics/hardest-items
- **Mô tả công việc chi tiết:**
  1. Bảng xếp hạng Top 20 từ vựng có số lần trả lời sai cao nhất trong Cổng Gatekeeper.
  2. Bảng xếp hạng Top 10 chữ Hán thường xuyên bị đánh giá "Chưa thuộc" trong các bài Flashcard SRS.
- **Tiêu chí nghiệm thu (DoD):**
  - Báo cáo cập nhật theo chu kỳ ngày dựa trên dữ liệu lỗi sai tích lũy.

---

---

# 🎒 PHẦN B: PHÂN HỆ NGƯỜI HỌC (USER MULTI-PLATFORM CLIENT)

Phân hệ User được tối ưu cho giao diện cảm ứng đa nền tảng (Web Browser trên điện thoại/máy tính và file cài đặt Android APK đóng gói).

---

## MODULE USR-1: BẢN ĐỒ HÀNH TRÌNH & ĐỘNG LỰC GAMIFICATION

### 📌 Task USR-01: Giao Diện Bản Đồ Hành Trình 4 Chặng (Interactive Roadmap)
- **Mục tiêu:** Cung cấp trải nghiệm thị giác cuốn hút, biến việc học thành chuyến phiêu lưu mở khóa các vùng đất.
- **Thành phần kỹ thuật:**
  - Frontend Component: JourneyMapView.vue / .tsx
  - Backend API: GET /api/v1/journey/map
- **Mô tả công việc chi tiết:**
  1. Vẽ lộ trình dạng đường uốn lượn liên kết các nút mốc (Winding Path).
  2. Phân tách rõ 4 phân vùng Chặng với màu sắc và bối cảnh chủ đề riêng biệt.
  3. Hiển thị trực quan trạng thái từng mốc:
     - **Mốc đã hoàn thành:** Nút xanh lá có icon huy hiệu vương miện, đường nối sáng đèn.
     - **Mốc đang học hiện tại:** Nút nổi bật có hiệu ứng tỏa sáng (Pulse Animation), cắm cờ đại diện của học viên.
     - **Mốc chưa mở khóa:** Nút xám mờ kèm biểu tượng ổ khóa.
- **Tiêu chí nghiệm thu (DoD):**
  - Cuộn mượt mà trên màn hình cảm ứng di động; chạm vào từng mốc phản hồi tức thì.

---

### 📌 Task USR-02: Thanh Trạng Thái Gamification Đầu Trang (Player Status Bar)
- **Mục tiêu:** Nhắc nhở người học duy trì thói quen học mỗi ngày và thôi thúc tích lũy Điểm Năng Động.
- **Thành phần kỹ thuật:**
  - Frontend Component: GamificationHeader.vue / .tsx
- **Mô tả công việc chi tiết:**
  1. Hiển thị cố định ở đầu màn hình:
     - **Chuỗi học tập (Streak):** Icon ngọn lửa 🔥 + số ngày liên tục. Bấm vào hiển thị lịch chấm công các ngày đã học trong tuần.
     - **Điểm Năng Động (Active Points):** Icon sấm sét ⚡ + số điểm tích lũy dùng để leo bảng xếp hạng.
     - **Cấp độ (Level Badge):** Huy hiệu N5, N4.
     - **Avatar học viên:** Bấm vào mở menu cài đặt tài khoản.
- **Tiêu chí nghiệm thu (DoD):**
  - Khi hoàn thành bài học, số điểm và streak nhảy số với hiệu ứng số đếm sinh động.

---

### 📌 Task USR-03: Drawer Xem Trước & Khởi Động Mốc Học (Milestone Launch Drawer)
- **Mục tiêu:** Cung cấp thông tin tổng quan trước khi học viên chính thức bước vào phòng học.
- **Thành phần kỹ thuật:**
  - Frontend Component: MilestoneDetailDrawer.vue / .tsx
- **Mô tả công việc chi tiết:**
  1. Khi chạm vào một Mốc đang mở khóa trên bản đồ, trượt lên một bảng Drawer từ dưới màn hình:
     - Tiêu đề mốc và bài học tương ứng trong giáo trình NEJ.
     - Danh sách 4 bài học bắt buộc kèm icon tích xanh cho bài đã làm xong.
     - Phần thưởng dự kiến nhận được: Số XP và Điểm Năng Động.
     - Nút bấm lớn nổi bật: **"Vào Luyện Tập Ngay" (Start Quest)**.
- **Tiêu chí nghiệm thu (DoD):**
  - Bảng drawer mở ra với hiệu ứng trượt êm ái; tự động dẫn học viên vào đúng bài học đang dở dang.

---

## MODULE USR-2: PHÒNG LUYỆN TẬP 4 BÀI HỌC TẠI MỐC (QUEST ROOM UI)

### 📌 Task USR-04: Khung Điều Phối Bài Học (Quest Runner Shell)
- **Mục tiêu:** Tạo khung sườn thống nhất để điều phối học viên đi qua trọn vẹn 4 bài học mà không bị ngắt quãng.
- **Thành phần kỹ thuật:**
  - Frontend Component: QuestRunnerShell.vue / .tsx
  - Backend API: GET /api/v1/milestones/{id}/quests
- **Mô tả công việc chi tiết:**
  1. Header phòng học gồm: Nút "X" (Thoát kèm popup cảnh báo), thanh tiến trình 4 đoạn (25% - 50% - 75% - 100%).
  2. Điều phối chuyển màn hình tự động và mượt mà giữa Bài 1 $
->$ Bài 2 $
->$ Bài 3 $
->$ Bài 4.
- **Tiêu chí nghiệm thu (DoD):**
  - Học viên không thể "nhảy cóc" qua bài kế tiếp khi chưa hoàn thành bài trước.

---

### 📌 Task USR-05: Bài 1 - Thẻ Ghi Nhớ Cốt Lõi (SRS Flashcard Deck)
- **Mục tiêu:** Giúp học viên làm quen và ghi nhớ sâu toàn bộ 26 từ vựng và chữ Hán của mốc thông qua thẻ lật.
- **Thành phần kỹ thuật:**
  - Frontend Component: QuestFlashcardDeck.vue / .tsx
- **Mô tả công việc chi tiết:**
  1. Thẻ học lật 3D (3D Flip Card):
     - **Mặt trước:** Chữ viết chuẩn (Kanji/Kana) + Nút nghe phát âm loa chuẩn bản xứ.
     - **Mặt sau:** Cách đọc Hiragana, Âm Hán Việt viết hoa nổi bật (đối với từ có chữ Hán), định nghĩa tiếng Việt chuẩn ngữ cảnh, câu ví dụ Nhật - Việt.
     - **Thẻ Kanji chuyên biệt:** Hiển thị thêm số nét vẽ, bộ thủ, âm On/Kun và câu chuyện mẹo nhớ (Mnemonic Story).
  2. Hai nút tương tác dưới thẻ:
     - **"Chưa thuộc" (màu đỏ cam):** Thẻ sẽ được đưa vào hàng đợi ôn lại ngay trong phiên.
     - **"Đã thuộc" (màu xanh lá):** Chuyển sang thẻ tiếp theo.
- **Tiêu chí nghiệm thu (DoD):**
  - Khi xem hết 100% số thẻ, tự động kích hoạt nộp bài Quest 1 và mở nút sang Bài 2.

---

### 📌 Task USR-06: Bài 2 - Cổng Từ Vựng Phản Xạ 100% (Vocab Gatekeeper)
- **Mục tiêu:** Kiểm tra phản xạ nghĩa từ vựng với nguyên tắc bắt buộc đạt độ chính xác 100%.
- **Thành phần kỹ thuật:**
  - Frontend Component: QuestVocabGatekeeper.vue / .tsx
- **Mô tả công việc chi tiết:**
  1. Câu hỏi trắc nghiệm hiển thị từ vựng tiếng Nhật, học viên phải chọn nghĩa tiếng Việt chính xác trong 4 phương án đảo ngẫu nhiên.
  2. Cơ chế xử lý câu sai:
     - Chọn đúng: Âm thanh vui tai, thanh tiến trình tăng lên.
     - Chọn sai: Rung màn hình, hiện bảng giải thích âm Hán Việt và nghĩa đúng. **Câu này lập tức được đưa vào cuối hàng đợi** để học viên phải làm lại.
  3. Vòng lặp chỉ dừng lại khi học viên trả lời chính xác toàn bộ các câu trong hàng đợi (đạt chuẩn 100%).
- **Tiêu chí nghiệm thu (DoD):**
  - Không thể hoàn thành bài nếu còn sót bất kỳ từ nào chưa trả lời đúng; các từ từng làm sai được tự động lưu vào hàng đợi ôn tập ngắt quãng SM-2.

---

### 📌 Task USR-07: Bài 3 - Ghép Câu Ngữ Pháp & Bảng Tổng Kết (Scramble & Summary Board)
- **Mục tiêu:** Rèn luyện tư duy ngữ pháp tự nhiên thông qua ghép thẻ từ và đọng lại kiến thức qua bảng tổng kết chuyên sâu.
- **Thành phần kỹ thuật:**
  - Frontend Component: QuestGrammarScrambleBoard.vue / .tsx
- **Mô tả công việc chi tiết:**
  1. **Phần 1 - Ghép thẻ từ xáo trộn:**
     - Đề bài đưa ra câu tiếng Việt chuẩn.
     - Bên dưới là các thẻ từ xáo trộn (wordTokens). Học viên chạm vào thẻ để xếp vào dòng câu trả lời theo đúng trật tự ngữ pháp tiếng Nhật. Có nút chạm để trả thẻ về vị trí cũ.
     - Bấm "Kiểm Tra": Nếu đúng câu chuyển sang câu tiếp theo.
  2. **Phần 2 - Bảng Tổng Kết Ngữ Pháp Chuyên Sâu (grammarSummaryBoard):**
     - Khi ghép xong các câu, màn hình mở ra Bảng Tổng Kết Ngữ Pháp của Mốc học:
       - Tóm tắt công thức từng mẫu câu.
       - Giải thích rõ ràng **sắc thái tự nhiên và lý do người Nhật dùng cách nói này** trong giao tiếp thực tế.
       - Câu ví dụ mẫu chuẩn ngữ cảnh.
- **Tiêu chí nghiệm thu (DoD):**
  - Học viên phải xem qua Bảng Tổng Kết trước khi bấm nút hoàn thành Bài 3 để sang bài cuối cùng.

---

### 📌 Task USR-08: Bài 4 - Điền Khuyết Thực Chiến & Về Đích Mốc (Practice & Finish)
- **Mục tiêu:** Thực hành điền trợ từ có cơ chế phản hồi lỗi sai (hintOnError) và trải nghiệm cảm giác chiến thắng khi về đích.
- **Thành phần kỹ thuật:**
  - Frontend Component: QuestPracticeCompletion.vue / .tsx
  - Backend API: POST /api/v1/milestones/{id}/quests/{questId}/submit
- **Mô tả công việc chi tiết:**
  1. Câu hỏi điền trợ từ/từ nối vào chỗ trống trong đoạn văn thực tế.
  2. Cơ chế phản hồi lỗi thông minh: Nếu học viên chọn sai trợ từ, hệ thống hiển thị ngay hộp thoại giải thích chuyên biệt (hintOnError), ví dụ: *"Trợ từ に dùng để chỉ mốc thời gian cụ thể, trong khi で dùng để chỉ nơi chốn diễn ra hành động"*.
  3. Màn hình Chúc Mừng Về Đích (Victory Celebration):
     - Hiệu ứng pháo hoa rực rỡ và âm thanh vinh danh.
     - Hiển thị thông báo: Cộng XP, cộng **Điểm Năng Động (Active Points)** vào bảng xếp hạng.
     - Thông điệp: *"Chúc mừng bạn đã chinh phục mốc học! Mốc tiếp theo đã sẵn sàng trên bản đồ!"*.
- **Tiêu chí nghiệm thu (DoD):**
  - Trạng thái mốc kế tiếp trên bản đồ lập tức chuyển từ LOCKED sang UNLOCKED.

---

## MODULE USR-3: TRỢ LÝ AI SENSEI ĐỒNG HÀNH (AI SENSEI COACHING)

### 📌 Task USR-09: Thực Hành Viết Tự Do Theo Bối Cảnh (Free Writing Challenge)
- **Mục tiêu:** Tạo không gian cho học viên tự do diễn đạt câu chuyện cá nhân bằng tiếng Nhật theo bối cảnh mốc học.
- **Thành phần kỹ thuật:**
  - Frontend Component: AiWritingChallengeBox.vue / .tsx
- **Mô tả công việc chi tiết:**
  1. Đề bài đưa ra tình huống giao tiếp mở (ví dụ: *"Hãy viết 2-3 câu giới thiệu về gia đình bạn và nghề nghiệp của từng người"*).
  2. Khung soạn thảo văn bản hỗ trợ gõ bàn phím tiếng Nhật kèm gợi ý các từ khóa gợi ý nằm trong Whitelist của bài.
- **Tiêu chí nghiệm thu (DoD):**
  - Có bộ đếm ký tự và nút gửi bài [Nhờ AI Sensei Chấm Điểm].

---

### 📌 Task USR-10: Nhận Nhận Xét & Sửa Lỗi Tức Thời Từ AI Sensei
- **Mục tiêu:** Nhận phản hồi sư phạm ân cần, chỉ ra lỗi sai và gợi ý cách diễn đạt tự nhiên chuẩn bản xứ.
- **Thành phần kỹ thuật:**
  - Frontend Component: AiSenseiFeedbackModal.vue / .tsx
  - Backend API: POST /api/v1/ai/evaluate-writing
- **Mô tả công việc chi tiết:**
  1. Hộp thoại phản hồi hiển thị trong < 3 giây:
     - Avatar AI Sensei với lời động viên thân thiện bằng tiếng Việt.
     - Đánh giá câu viết của học viên: Tô màu xanh các đoạn viết tốt, tô màu vàng các đoạn dùng sai trợ từ kèm mũi tên sửa lại đúng.
     - Gợi ý câu viết tự nhiên hơn mà người Nhật hay nói trong thực tế.
  2. Nút bấm: **"Báo cáo nếu thấy AI chấm chưa đúng" (Report Issue)** để gửi phản hồi lên Admin Audit Center.
- **Tiêu chí nghiệm thu (DoD):**
  - Phản hồi định dạng đẹp mắt, rõ ràng, không sử dụng từ ngữ vượt cấp so với trình độ mốc học.

---

## MODULE USR-4: ÔN TẬP NGẮT QUÃNG & BẢNG XẾP HẠNG (SPACED REPETITION & SOCIAL)

### 📌 Task USR-11: Trung Tâm Ôn Tập Ngắt Quãng Hằng Ngày (Spaced Review Station)
- **Mục tiêu:** Giúp học viên củng cố kiến thức theo cơ chế lặp lại khoa học SuperMemo-2 (SM-2).
- **Thành phần kỹ thuật:**
  - Frontend Screen: SpacedReviewCenterView.vue / .tsx
  - Backend API: GET /api/v1/srs/today, POST /api/v1/srs/{id}/review
- **Mô tả công việc chi tiết:**
  1. Màn hình hiển thị số lượng thẻ từ vựng/kanji cần ôn tập hôm nay (các thẻ học viên từng làm sai ở các mốc trước đến hạn quay lại).
  2. Chế độ "Ôn tập nhanh 5 phút": Lần lượt ôn các thẻ và chọn mức độ nhớ từ 0 (Quên hoàn toàn) đến 5 (Nhớ rất rõ) để thuật toán tính toán lại ngày ôn tập tiếp theo (1 ngày, 3 ngày, 7 ngày, 14 ngày...).
- **Tiêu chí nghiệm thu (DoD):**
  - Hoàn thành lượt ôn tập hằng ngày giúp bảo vệ và gia tăng chuỗi Streak của học viên.

---

### 📌 Task USR-12: Bảng Vinh Danh Năng Động (Dynamic Leaderboard UI)
- **Mục tiêu:** Thúc đẩy động lực thi đua học tập lành mạnh thông qua Điểm Năng Động (Active Points).
- **Thành phần kỹ thuật:**
  - Frontend Screen: LeaderboardView.vue / .tsx
  - Backend API: GET /api/v1/leaderboard
- **Mô tả công việc chi tiết:**
  1. Bục vinh danh Top 3 nổi bật với huy chương Vàng, Bạc, Đồng và hiệu ứng vương miện.
  2. Bảng xếp hạng Top 50 hiển thị: Thứ hạng, Avatar, Tên học viên, Chuỗi ngày Streak, Tổng Điểm Năng Động.
  3. Thanh cố định ở đáy màn hình hiển thị chính xác vị trí thứ hạng của người dùng hiện tại và khoảng cách điểm số với người đứng ngay phía trên.
  4. Tab chuyển đổi: Bảng xếp hạng Tuần này vs Bảng xếp hạng Toàn thời gian.
- **Tiêu chí nghiệm thu (DoD):**
  - Cập nhật điểm số mượt mà, tải dữ liệu bảng xếp hạng dưới 500ms.

---

### 📌 Task USR-13: Hồ Sơ Học Viên & Huy Hiệu Thành Tựu (Profile & Achievements)
- **Mục tiêu:** Ghi nhận và trực quan hóa sự tiến bộ của người học sau từng chặng đường.
- **Thành phần kỹ thuật:**
  - Frontend Screen: UserProfileView.vue / .tsx
- **Mô tả công việc chi tiết:**
  1. Hiển thị tổng quan năng lực:
     - Số từ vựng đã làm chủ / 728 từ.
     - Số chữ Hán đã chinh phục / 300 chữ.
     - Số mốc học đã vượt qua / 28 mốc.
     - Kỷ lục chuỗi ngày học dài nhất (longestStreak).
  2. Bộ sưu tập Huy hiệu Thành Tựu (Badges):
     - Huy hiệu "Kẻ Khởi Đầu" (Xong Chặng 1).
     - Huy hiệu "Nhà Thám Hiểm N5" (Xong Chặng 2).
     - Huy hiệu "Chiến Binh Bền Bỉ" (Đạt chuỗi Streak 7 ngày liên tục).
- **Tiêu chí nghiệm thu (DoD):**
  - Dữ liệu thống kê phản ánh chính xác 100% tiến độ thực tế lưu trên Firestore.

---

## 📈 BẢNG MA TRẬN PHÂN BỔ NHIỆM VỤ THEO VAI TRÒ

| Mã Nhiệm Vụ | Tên Công Việc Chi Tiết | Phân Hệ | Độ Ưu Tiên | Phụ Thuộc Kỹ Thuật |
| :--- | :--- | :---: | :---: | :--- |
| **ADM-01** | Quản trị Danh mục Chặng & Mốc | Admin | High | Firestore stages, milestones |
| **ADM-02** | Cân bằng Gameplay & Điều kiện Mở khóa | Admin | Medium | Firestore milestones |
| **ADM-03** | Quản trị Whitelist Kiến thức | Admin | High | Firestore ocabulary_items, kanji_dictionary |
| **ADM-04** | Sao lưu & Đồng bộ Dữ liệu Giáo trình | Admin | Medium | File KIZUNA_NEJ_SEED_DATA.json |
| **ADM-05** | AI Prompt Studio & Sandbox | Admin | **Very High** | Google Gemini API (CS2028 Core) |
| **ADM-06** | Trung tâm Kiểm duyệt Phán quyết AI | Admin | **Very High** | Human-in-the-loop Queue |
| **ADM-07** | Giám sát Token & Latency AI | Admin | Low | Spring Boot Actuator |
| **ADM-08** | Quản trị Tài khoản & Phân quyền RBAC | Admin | High | Firebase Custom Claims |
| **ADM-09** | Chống Gian lận Bảng Xếp Hạng | Admin | Medium | Collection leaderboard |
| **ADM-10** | Thanh tra Tiến độ Học viên Cá nhân | Admin | Medium | Collection user_progress |
| **ADM-11** | Biểu đồ Phễu Rơi Rụng Học viên | Admin | Medium | Learning Analytics |
| **ADM-12** | Báo cáo Từ vựng & Kanji "Tử thần" | Admin | Low | Aggregate Queries |
| **USR-01** | Giao diện Bản đồ Hành trình 4 Chặng | User | **Highest** | SVG/Canvas Roadmap Component |
| **USR-02** | Thanh Gamification Header (Streak & Điểm) | User | High | Realtime User State |
| **USR-03** | Drawer Xem trước & Mở Mốc học | User | High | Milestone Launch Modal |
| **USR-04** | Khung Điều phối 4 Bài học | User | **Highest** | Sequential Quest Runner Shell |
| **USR-05** | Bài 1: Thẻ học Flashcard SRS 3D | User | High | 3D Flip Card Component |
| **USR-06** | Bài 2: Cổng Từ vựng Gatekeeper 100% | User | **Highest** | Retry Loop Engine |
| **USR-07** | Bài 3: Ghép câu & Bảng tổng kết ngữ pháp | User | **Highest** | Word Tokens & Summary Board |
| **USR-08** | Bài 4: Điền khuyết hintOnError & Về đích | User | **Highest** | Hint Engine & Victory Popup |
| **USR-09** | Viết tự do theo ngữ cảnh mốc | User | High | Japanese IME Input |
| **USR-10** | AI Sensei nhận xét & sửa lỗi tức thời | User | **Very High** | Gemini Coaching Integration |
| **USR-11** | Trung tâm Ôn tập Ngắt quãng SM-2 | User | High | Spaced Repetition Queue |
| **USR-12** | Bảng Vinh Danh Năng Động (Leaderboard) | User | High | Active Points Ranking |
| **USR-13** | Hồ sơ Học viên & Huy hiệu Thành tựu | User | Medium | Gamification Profile |
