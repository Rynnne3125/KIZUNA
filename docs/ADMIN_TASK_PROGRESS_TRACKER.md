# 🛡️ Kế Hoạch & Tiến Trình Phát Triển Phân Hệ Admin (Admin Task Progress Tracker)
## DỰ ÁN: KIZUNA (绊) - PHÂN HỆ QUẢN TRỊ VIÊN & GIÁM SÁT AI
**Học phần:** CS2028 - AI Product Development: End to End  
**Đơn vị:** Trường Đại học Công nghệ Thông tin & Truyền thông Việt - Hàn (VKU)  
**Mục tiêu hệ thống:** Game Master & AI Supervisor Portal (Giao diện Web Desktop)  
**Phiên bản:** v2.1.0  
**Cập nhật lần cuối:** 2026-09-22  

---

## 📊 Tổng Quan Trạng Thái Tiến Độ Phân Hệ Admin

```
[████████████░░░░░░░░] 60% Hoàn Thành Toàn Diện Phân Hệ Admin
```

- **Backend Admin Core APIs (Phase ADM-BE):** [x] **80% HOÀN THÀNH** (Đã có CRUD Chặng, Mốc, Bài học, Từ vựng, Kanji, Whitelist, Phân quyền Role, Khóa User, Anti-cheat Reset Streak/Adjust Points, Learning Dossier, AI Audit Queue, Analytics Funnel; chỉ còn đấu nối Live Gemini Key).
- **Frontend Admin Shell & Tổng Quan (Phase ADM-FE-1):** [ ] 0% CHUẨN BỊ THỰC HIỆN.
- **Frontend Quản Trị Lộ Trình & Whitelist (Phase ADM-FE-2):** [ ] 0% CHƯA BẮT ĐẦU.
- **Frontend AI Prompt Studio & Audit Center (Phase ADM-FE-3):** [ ] 0% CHƯA BẮT ĐẦU (Trọng tâm đồ án CS2028).
- **Frontend Vận Hành Học Viên & Analytics (Phase ADM-FE-4):** [ ] 0% CHƯA BẮT ĐẦU.

---

## 🗺️ Chi Tiết Danh Mục Công Việc Admin: Cả Backend (BE) Lẫn Frontend (FE)

---

### 🟢 GIAI ĐOẠN ADM-BE: BACKEND DỊCH VỤ QUẢN TRỊ & GIÁM SÁT AI (ĐÃ HOÀN TẤT PHẦN LỚN)
> **Mục tiêu:** Xây dựng toàn bộ các API quản trị hệ thống, dữ liệu giáo trình, chống gian lận và giám sát mô hình AI.

- [x] **Task ADM-BE.1 - Quản Trị CRUD Giáo Trình Gốc (`AdminCurriculumController`):**
  - **Endpoints:**
    - `GET, POST, PUT, DELETE /api/v1/admin/stages`
    - `GET, POST, PUT, DELETE /api/v1/admin/milestones`
    - `GET, POST, PUT, DELETE /api/v1/admin/quests`
    - `GET, POST, PUT, DELETE /api/v1/admin/vocabulary`
    - `GET, POST, PUT, DELETE /api/v1/admin/kanji`
  - **Đã hoàn thành:** Cho phép Admin toàn quyền quản lý kho dữ liệu 4 Chặng, 28 Mốc, 112 Bài học, 728 Từ vựng, 300 Kanji mà không ảnh hưởng đến tiến độ người học.

- [x] **Task ADM-BE.2 - Cân Bằng Gameplay & Bật/Tắt Hiển Thị Mốc:**
  - **Endpoints:**
    - `PATCH /api/v1/admin/milestones/{id}/status`: Bật/tắt hiển thị mốc (`isActive: true/false`).
    - `PUT /api/v1/admin/milestones/{id}/gameplay-config`: Cân bằng `xpReward`, `activePointsReward`, `prerequisiteMilestoneId`.
  - **Đã hoàn thành:** Tích hợp trực tiếp và đã có test kiểm thử thành công.

- [x] **Task ADM-BE.3 - Quản Trị Whitelist Tri Thức Cho AI Sensei:**
  - **Endpoints:**
    - `GET /api/v1/admin/milestones/{id}/whitelist`: Trích xuất 26 từ vựng, kanji, mẫu câu của mốc.
    - `POST /api/v1/admin/milestones/{id}/whitelist/item`: Bổ sung nhanh từ vựng vào Whitelist.
  - **Đã hoàn thành:** Dữ liệu Whitelist sẵn sàng truyền vào Prompt để làm căn cứ chấm thi an toàn.

- [x] **Task ADM-BE.4 - Quản Trị Tài Khoản Học Viên & Phân Quyền RBAC (`AdminUserController`):**
  - **Endpoints:**
    - `GET, POST, PUT, DELETE /api/v1/admin/users`: CRUD tài khoản người dùng Firestore.
    - `PUT /api/v1/admin/users/{uid}/role`: Chuyển đổi vai trò `ROLE_ADMIN` $\leftrightarrow$ `ROLE_USER`.
    - `PUT /api/v1/admin/users/{uid}/status`: Khóa hoặc kích hoạt tài khoản (`enabled: true/false`).
  - **Đã hoàn thành:** Xác thực nghiêm ngặt qua Bearer Token JWT.

- [x] **Task ADM-BE.5 - Chống Gian Lận Bảng Xếp Hạng & Thanh Tra Hồ Sơ Học Tập:**
  - **Endpoints:**
    - `POST /api/v1/admin/users/{uid}/reset-streak`: Reset chuỗi streak về 0 khi phát hiện gian lận đổi giờ hệ thống.
    - `POST /api/v1/admin/users/{uid}/adjust-points`: Cộng hoặc trừ Điểm Năng Động (Active Points) ảo.
    - `GET /api/v1/admin/users/{uid}/learning-dossier`: Thanh tra toàn bộ tiến trình học, danh sách thẻ trong hàng đợi ôn tập SM-2 và từ hay làm sai của học viên.
  - **Đã hoàn thành:** Đồng bộ điểm phạt/thưởng tức thời lên `leaderboard`.

- [x] **Task ADM-BE.6 - AI Governance, Audit Queue & Phễu Rơi Rụng (`AdminAiController`):**
  - **Endpoints:**
    - `POST /api/v1/admin/ai/sandbox-test`: Thử nghiệm Prompt AI với Whitelist và đo độ trễ latency.
    - `GET /api/v1/admin/ai/audit-queue`: Danh sách học viên khiếu nại AI chấm sai.
    - `POST /api/v1/admin/ai/audit-queue/{id}/resolve`: Phê duyệt khiếu nại (hoàn Điểm Năng Động cho học viên) hoặc bác bỏ.
    - `GET /api/v1/admin/ai/metrics`: Giám sát thông số gọi API, chi phí token, lỗi 429.
    - `GET /api/v1/admin/analytics/drop-off-funnel`: Thống kê số lượng học viên hoàn thành từ mốc 1 đến mốc 28.
    - `GET /api/v1/admin/analytics/hardest-items`: Báo cáo từ vựng và Kanji có tỉ lệ chọn sai cao nhất.
  - **Đã hoàn thành:** Hoàn thành logic dịch vụ và tích hợp hoàn hảo.

- [ ] **Task ADM-BE.7 - Đấu Nối Trực Tiếp Google Gemini 1.5 Pro / Flash API (Tiếp Theo):**
  - **Mô tả:** Cấu hình biến môi trường `GEMINI_API_KEY` để gọi trực tiếp tới mô hình Gemini của Google thay vì mock phản hồi trong Sandbox.

---

### 🟡 GIAI ĐOẠN ADM-FE-1: KHUNG GIAO DIỆN ADMIN & DASHBOARD TỔNG QUAN (ADMIN DESKTOP SHELL)
> **Mục tiêu:** Xây dựng layout máy tính chuyên nghiệp, thanh Sidebar điều hướng phân hệ Admin, quản lý phiên làm việc của Quản trị viên.

- [ ] **Task ADM-FE.1 - Khung Giao Diện Admin Desktop (AdminLayoutShell):**
  - **Thành phần:** `AdminLayout.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`.
  - **Nội dung:**
    - Sidebar cố định bên trái gồm các mục: 📊 Tổng quan, 🗺️ Bản đồ & Mốc học, 📝 Quản trị Whitelist, 🤖 AI Prompt Studio & Sandbox, ⚖️ Kiểm duyệt phán quyết AI, 👥 Quản lý Học viên, 📈 Phân tích học tập.
    - Header bên trên: Hiển thị avatar Admin, huy hiệu `ROLE_ADMIN`, nút chuyển nhanh sang giao diện User để kiểm thử, nút Đăng xuất.
    - Axios Interceptor: Tự động đính kèm `Authorization: Bearer <adminToken>` cho toàn bộ request `/api/v1/admin/**`.

- [ ] **Task ADM-FE.2 - Màn Hình Dashboard Tổng Quan (AdminDashboardView):**
  - **Thành phần:** `frontend/src/admin/pages/AdminDashboardPage.tsx`.
  - **Nội dung:**
    - 4 Thẻ chỉ số chính (KPI Cards):
      1. 👥 Tổng số học viên đăng ký & học viên đang hoạt động trong ngày.
      2. 🗺️ Tổng số Mốc học (28 mốc) & Tỉ lệ mốc đang kích hoạt.
      3. ⚖️ Số ca khiếu nại AI đang chờ xử lý (`Pending Audits`).
      4. ⚡ Tổng Điểm Năng Động (Active Points) toàn hệ thống đã phát hành.
    - Biểu đồ tóm tắt hoạt động 7 ngày gần nhất.
    - Danh sách các ca khiếu nại AI mới nhất cần xử lý ngay.

---

### 🔵 GIAI ĐOẠN ADM-FE-2: QUẢN TRỊ LỘ TRÌNH, MỐC HỌC & WHITELIST KIẾN THỨC
> **Mục tiêu:** Trao quyền cho giáo viên biên tập nội dung, bật tắt mốc học và rà soát kiến thức giảng dạy.

- [ ] **Task ADM-FE.3 - Quản Lý Bản Đồ & Danh Mục Mốc Học (JourneyEditorView):**
  - **Thành phần:** `frontend/src/admin/pages/JourneyEditorPage.tsx`.
  - **Nội dung:**
    - Cấu trúc dạng cây phân cấp (Tree View) hoặc Bảng dữ liệu (Data Table): Chặng 1..4 $\rightarrow$ Mốc 1..28.
    - Công tắc chuyển trạng thái: **Bật/Tắt hiển thị (Active/Inactive Toggle)** kết nối trực tiếp API `PATCH /api/v1/admin/milestones/{id}/status`.
    - Nút chỉnh sửa nhanh tiêu đề tiếng Việt, phụ đề và bối cảnh giao tiếp của mốc.
    - Nút bấm xem 4 bài học Quests tương ứng của mốc.

- [ ] **Task ADM-FE.4 - Modal Cân Bằng Gameplay & Mở Khóa (GamificationBalanceModal):**
  - **Nội dung:**
    - Form nhập điểm thưởng: `xpReward` (mặc định 50) và `activePointsReward` (mặc định 70).
    - Chọn mốc điều kiện tiên quyết (`prerequisiteMilestoneId`).
    - Nút "Lưu Cân Bằng" gọi API `PUT /api/v1/admin/milestones/{id}/gameplay-config`.

- [ ] **Task ADM-FE.5 - Màn Hình Quản Trị Ranh Giới Kiến Thức (MilestoneWhitelistView):**
  - **Thành phần:** `frontend/src/admin/pages/MilestoneWhitelistPage.tsx`.
  - **Nội dung:**
    - Bộ chọn Mốc học (Dropdown chọn từ Mốc 1 đến 28).
    - 3 Tab hiển thị:
      1. **Từ vựng (26 từ):** Hiển thị từ Kanji, Hiragana, âm Hán Việt in hoa, nghĩa tiếng Việt, câu ví dụ Nhật - Việt.
      2. **Chữ Hán (Kanji):** Hiển thị số nét, bộ thủ, âm On/Kun, nghĩa, câu chuyện mẹo nhớ mnemonic.
      3. **Ngữ pháp:** Mẫu câu, lý do và sắc thái tự nhiên trong giao tiếp thực tế của người Nhật.
    - Form thêm nhanh 1 từ vựng mới vào Whitelist nếu giáo viên phát hiện thiếu sót (`POST /api/v1/admin/milestones/{id}/whitelist/item`).

---

### 🟣 GIAI ĐOẠN ADM-FE-3: AI PROMPT STUDIO & TRUNG TÂM KIỂM DUYỆT AI (TRỌNG TÂM CS2028)
> **Mục tiêu:** Môi trường kiểm nghiệm mô hình AI, tinh chỉnh Prompt và xử lý khiếu nại chấm điểm nhằm bảo đảm công bằng học thuật.

- [ ] **Task ADM-FE.6 - Giao Diện AI Prompt Studio & Sandbox (AdminAiSandboxView):**
  - **Thành phần:** `frontend/src/admin/pages/AdminAiSandboxPage.tsx`.
  - **Giao diện 3 cột chuyên dụng:**
    - **Cột 1 (Cấu hình thử nghiệm):** Chọn Mốc học (hệ thống tự động hiển thị Whitelist tương ứng), thanh trượt chỉnh Temperature (0.0 - 1.0), khung chỉnh sửa System Prompt Template.
    - **Cột 2 (Đầu vào mô phỏng):** Nhập câu tiếng Nhật thử nghiệm của học viên (câu có lỗi trợ từ, câu dùng từ lóng, câu đúng hoàn toàn).
    - **Cột 3 (Kết quả phản hồi tức thời):** Hiển thị JSON phán quyết: Điểm số (1-10), lời nhận xét sư phạm, chỉ ra lỗi trợ từ kèm mũi tên sửa lại đúng, thời gian phản hồi (Latency tính bằng ms), số lượng token tiêu tốn.

- [ ] **Task ADM-FE.7 - Trung Tâm Kiểm Duyệt Phán Quyết AI (Human-in-the-loop Audit Center):**
  - **Thành phần:** `frontend/src/admin/pages/AdminAiAuditQueuePage.tsx`.
  - **Nội dung:**
    - Bảng danh sách các ca học viên bấm cờ *"Báo cáo AI chấm chưa chuẩn"* (`status: PENDING`).
    - Xem chi tiết từng ca: Đề bài $\rightarrow$ Câu trả lời gốc của học viên $\rightarrow$ Nhận xét và điểm số AI Sensei đã chấm $\rightarrow$ Lý do khiếu nại của học viên.
    - Hai nút xử lý quyết định:
      - 🟢 **Công nhận đúng (Approve & Reward):** Ghi đè kết quả của AI, tự động hoàn trả Điểm Năng Động cho học viên.
      - 🔴 **Bác bỏ khiếu nại (Reject):** Giữ nguyên điểm số kèm lời giải thích bổ sung của Admin.

- [ ] **Task ADM-FE.8 - Giám Sát Chi Phí & Hạn Mức Token AI (AdminAiMetricsView):**
  - **Nội dung:**
    - Biểu đồ thống kê số lượt gọi API Gemini theo từng ngày trong tuần.
    - Biểu đồ đo độ trễ trung bình (Latency ms).
    - Chỉ số cảnh báo chi phí token tiêu thụ ước tính và tỷ lệ lỗi quá tải (HTTP 429).

---

### 🔴 GIAI ĐOẠN ADM-FE-4: VẬN HÀNH HỌC VIÊN, CHỐNG GIAN LẬN & PHÂN TÍCH HỌC TẬP
> **Mục tiêu:** Giám sát người dùng, xử lý gian lận điểm số và nhận diện điểm nghẽn của giáo trình.

- [ ] **Task ADM-FE.9 - Quản Trị Học Viên & Phân Quyền RBAC (AdminUserManagementView):**
  - **Thành phần:** `frontend/src/admin/pages/AdminUsersPage.tsx`.
  - **Nội dung:**
    - Bảng danh sách học viên có chức năng phân trang, tìm kiếm theo email, tên đăng nhập, cấp độ (N5, N4).
    - Dropdown chuyển đổi quyền hạn: Thăng cấp lên `ROLE_ADMIN` hoặc hạ cấp về `ROLE_USER`.
    - Nút Khóa tài khoản (Ban/Disable) đối với người dùng vi phạm quy chuẩn ứng xử.

- [ ] **Task ADM-FE.10 - Thanh Tra Hồ Sơ Học Viên & Chống Gian Lận (AdminStudentDossierDrawer):**
  - **Nội dung:**
    - Bấm vào một học viên mở Drawer/Modal xem chi tiết hồ sơ:
      - Danh sách các mốc đã hoàn thành, mốc đang học dở.
      - Số lượng thẻ đang ôn tập trong hàng đợi ngắt quãng SM-2.
      - Danh sách các từ học viên hay làm sai nhất.
    - Bộ công cụ can thiệp chống gian lận:
      - Nút **Reset Chuỗi Streak về 0** (nếu phát hiện sửa giờ thiết bị).
      - Ô nhập **Cộng/Trừ Điểm Năng Động** kèm lý do xử phạt/khen thưởng.

- [ ] **Task ADM-FE.11 - Biểu Đồ Phễu Rơi Rụng & Báo Cáo "Tử Thần" (LearningAnalyticsView):**
  - **Thành phần:** `frontend/src/admin/pages/AdminAnalyticsPage.tsx`.
  - **Nội dung:**
    - Biểu đồ phễu (Funnel Chart) trực quan hóa tỉ lệ học viên hoàn thành từ Mốc 1 đến Mốc 28; làm nổi bật các mốc có tỉ lệ bỏ cuộc cao để giáo viên điều chỉnh độ khó.
    - Bảng xếp hạng Top 20 từ vựng và Top 10 Kanji có số lần trả lời sai cao nhất trong toàn bộ hệ thống.

---

## 📅 BẢNG THỨ TỰ ƯU TIÊN THỰC THI CHO PHÂN HỆ ADMIN

| Giai Đoạn | Mã Task | Tên Công Việc | Vai Trò | Độ Ưu Tiên | Phụ Thuộc |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **ADM-BE** | ADM-BE.1 - BE.6 | Backend Admin CRUD, Anti-Cheat, Audit, Funnel | BE | **Hoàn tất 100%** | Spring Boot 3.4 Controller & Service |
| **ADM-BE** | ADM-BE.7 | Đấu nối trực tiếp Google Gemini API Key | BE | High | Google Cloud Gemini API |
| **ADM-FE-1**| ADM-FE.1 | Khung Giao Diện Admin Desktop (Sidebar, Header, Auth) | FE | **Highest** | React + TypeScript + React Router |
| **ADM-FE-1**| ADM-FE.2 | Dashboard Tổng Quan & KPI Cards | FE | High | Backend `/api/v1/admin/**` |
| **ADM-FE-2**| ADM-FE.3 | Quản lý Danh mục Chặng & Mốc (Bật/Tắt hiển thị) | FE | High | `AdminCurriculumController` |
| **ADM-FE-2**| ADM-FE.4 | Modal Cân bằng Gameplay & Điều kiện mở khóa | FE | Medium | `PUT /gameplay-config` |
| **ADM-FE-2**| ADM-FE.5 | Quản lý Whitelist Tri thức Mốc (Từ vựng, Kanji, Ngữ pháp) | FE | High | `GET /whitelist`, `POST /item` |
| **ADM-FE-3**| ADM-FE.6 | AI Prompt Studio & Sandbox 3 Cột | FE | **Very High** | CS2028 Core Requirement |
| **ADM-FE-3**| ADM-FE.7 | Trung tâm Kiểm duyệt Phán quyết AI (Audit Queue) | FE | **Very High** | Human-in-the-loop Resolution |
| **ADM-FE-3**| ADM-FE.8 | Biểu đồ Giám sát Token & Độ trễ AI | FE | Medium | `/api/v1/admin/ai/metrics` |
| **ADM-FE-4**| ADM-FE.9 | Quản trị Học viên & Phân quyền RBAC | FE | High | `AdminUserController` |
| **ADM-FE-4**| ADM-FE.10| Thanh tra Hồ sơ Học viên & Công cụ Chống gian lận | FE | Medium | Dossier & Anti-Cheat APIs |
| **ADM-FE-4**| ADM-FE.11| Biểu đồ Phễu Rơi Rụng & Báo cáo Kiến thức Khó nhất | FE | Medium | Drop-Off Funnel & Analytics APIs |

---

*Tài liệu này được đồng bộ cùng với [TASK_PROGRESS_TRACKER.md](file:///d:/Documents/KIZUNA/docs/TASK_PROGRESS_TRACKER.md), [DETAILED_TASKS_ADMIN_AND_USER.md](file:///d:/Documents/KIZUNA/docs/DETAILED_TASKS_ADMIN_AND_USER.md) và [ERD_DATABASE_DESIGN.md](file:///d:/Documents/KIZUNA/docs/ERD_DATABASE_DESIGN.md).*
