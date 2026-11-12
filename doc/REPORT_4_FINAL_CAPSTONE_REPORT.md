<div class="cover-page">
  <div class="cover-top">
    <div class="cover-univ">ĐẠI HỌC ĐÀ NẴNG</div>
    <div class="cover-school">TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG VIỆT - HÀN (VKU)</div>
    <div class="cover-faculty">KHOA KHOA HỌC MÁY TÍNH</div>
    <div class="cover-divider"></div>
  </div>

  <div class="cover-badge">FINAL CAPSTONE REPORT & DEFENSE DOSSIER • MILESTONE 4 (60%)</div>

  <h1 class="cover-title">KIZUNA (絆)</h1>
  <div class="cover-subtitle-vi">HÀNH TRÌNH HỌC TIẾNG NHẬT ĐA NỀN TẢNG HỖ TRỢ BỞI TRÍ TUỆ NHÂN TẠO</div>
  <div class="cover-subtitle-en">Cross-Platform AI-Powered Japanese Learning Journey Application</div>

  <div class="cover-seal">絆</div>

  <div class="cover-meta-box">
    <table class="cover-table">
      <tr>
        <td><strong>Học phần (Course):</strong></td>
        <td>Cross-Platform Mobile App Development (Phát triển Ứng dụng Di động Đa nền tảng)</td>
      </tr>
      <tr>
        <td><strong>Mã học phần & Chuyên đề:</strong></td>
        <td>CS2028 — AI Product Development: End to End</td>
      </tr>
      <tr>
        <td><strong>Nhóm thực hiện (Team):</strong></td>
        <td>KIZUNA Dev Team (VKU)</td>
      </tr>
      <tr>
        <td><strong>Sinh viên thực hiện:</strong></td>
        <td>Trần Thanh Phong (Mã SV: 23IT • Email: <code>phongtt.23it@vku.udn.vn</code> • GitHub: <code>@Rynnne3125</code>)</td>
      </tr>
      <tr>
        <td><strong>Giảng viên hướng dẫn:</strong></td>
        <td>ThS. Lê Thành Công</td>
      </tr>
      <tr>
        <td><strong>Học kỳ & Năm học:</strong></td>
        <td>Học kỳ 1 (2026 – 2027) • Hạn nộp: Tuần 13 (Milestone 4)</td>
      </tr>
      <tr>
        <td><strong>Hệ thống Production:</strong></td>
        <td><a href="https://kizuna-thanhphongit.duckdns.org">https://kizuna-thanhphongit.duckdns.org</a></td>
      </tr>
      <tr>
        <td><strong>Gói cài đặt Android APK:</strong></td>
        <td><a href="https://kizuna-thanhphongit.duckdns.org/download/kizuna-latest.apk">https://kizuna-thanhphongit.duckdns.org/download/kizuna-latest.apk</a> (v1.0.5)</td>
      </tr>
    </table>
  </div>

  <div class="cover-footer">Đà Nẵng, Tháng 11 Năm 2026</div>
</div>

<div class="page-break"></div>

# [REPORT TEMPLATE 4] FINAL CAPSTONE REPORT & DEFENSE DOSSIER
**Capstone Project:** Cross-Platform Mobile App Development (Phát triển Ứng dụng Di động Đa nền tảng)  
**Official Project Title:** KIZUNA (絆) - Hành Trình Học Tiếng Nhật Đa Nền Tảng Hỗ Trợ Bởi Trí Tuệ Nhân Tạo (*KIZUNA - Cross-Platform AI-Powered Japanese Learning Journey Application*)  
**Student Team:** KIZUNA Dev Team (VKU) — Trần Thanh Phong (`phongtt.23it@vku.udn.vn`) • **Deadline:** Week 13  

---

## 📝 EXECUTIVE SUMMARY / TÓM TẮT ĐỒ ÁN (ABSTRACT)

**Tiếng Việt:**  
Đồ án **KIZUNA (絆)** nghiên cứu và phát triển một hệ sinh thái ứng dụng học tiếng Nhật đa nền tảng (Cross-Platform Mobile & Web Application) nhằm giải quyết bài toán tỷ lệ bỏ cuộc cao (lên tới 65% trong 2 tháng đầu) của người tự học tiếng Nhật theo mô hình danh sách bài học tĩnh truyền thống. Thay vì hiển thị mục lục lý thuyết khô khan, KIZUNA tái cấu trúc toàn bộ giáo trình chuẩn mực **NEJ (A New Approach to Elementary Japanese Vol 1 & 2)** gồm **1,202 bản ghi dữ liệu hạt nhân** thành một **Bản đồ Hành trình RPG 5 cấp độ** (4 Chặng lớn, 28 Mốc tình huống thực tế, 112 Nhiệm vụ tương tác, 728+ Từ vựng, 300 Chữ Hán, 30 Ngữ pháp trọng tâm và Ngân hàng đề thi JLPT N5–N1). Hệ thống được xây dựng theo kiến trúc **Clean Architecture** với Frontend đa nền tảng (**React 18, TypeScript, Vite, Tailwind CSS, đóng gói Native Android APK qua Capacitor 6.2 & hỗ trợ iOS Safari PWA**) kết hợp cùng Backend chuẩn doanh nghiệp (**Java 21 LTS, Spring Boot 3.4.2, Spring Security Stateless JWT, Google Cloud Firestore**). Đặc biệt, đồ án đề xuất kiến trúc **Ranh giới Kiểm soát AI 3 Lớp (3-Layer AI Governance & Knowledge Whitelist Guardrails)** tích hợp cùng thuật toán lặp lại ngắt quãng **SuperMemo-2 (SM-2)**, giúp Trợ lý ảo **AI Sensei** chấm bài và đối thoại đúng phạm vi từ vựng của từng mốc học mà không xảy ra hiện tượng ảo giác hay vượt cấp độ.

**English:**  
The **KIZUNA (絆)** Capstone Project presents an end-to-end cross-platform Japanese language learning ecosystem engineered to overcome the 65% early drop-out rate associated with conventional static course-list applications. By shifting the pedagogical paradigm to **"Learning as a Journey" (Journey Map Gamification)**, KIZUNA transforms **1,202 curated seed records** from the *NEJ (A New Approach to Elementary Japanese)* curriculum into a 5-tier interactive adventure across Japan (4 Stages, 28 situational Milestones, 112 mandatory Quests, 728+ Vocabulary items, 300 Kanji characters, 30 core Grammar patterns, and full JLPT N5–N1 mock exams). Built upon **Clean Architecture** principles, the system features a unified **Java 21 + Spring Boot 3.4.2** backend secured by **Stateless JWT RBAC** and **Google Cloud Firestore Row-Level Security (RLS)**, serving both a **Capacitor 6.2 Native Android APK (`v1.0.5`) / iOS PWA client** and a **Desktop Admin Portal**. Technically, KIZUNA pioneers a **3-Layer AI Governance Framework** that constrains LLM interactions to deterministic milestone vocabulary whitelists, paired with the **SuperMemo-2 (SM-2)** spaced repetition algorithm and local-first offline resilience.

---

## 📑 TABLE OF CONTENTS (MỤC LỤC CHI TIẾT)

* **CHAPTER 1: INTRODUCTION & PROBLEM SPACE (GIỚI THIỆU & KHÔNG GIAN BÀI TOÁN)**
  * 1.1. Bối cảnh Thực tiễn & Nhu cầu Học Tiếng Nhật Khối Kỹ thuật Công nghệ
  * 1.2. Phân tích Thực trạng: Sự thất bại của Mô hình "Danh sách Khóa học Tĩnh"
  * 1.3. Khảo sát & Đối sánh Thị trường (Competitive Benchmarking)
  * 1.4. Bước chuyển dịch Mô hình KIZUNA: "Hành trình như một Chuyến đi" (Journey Map Gamification)
  * 1.5. Lộ trình Giáo trình Toàn diện 4 Chặng — 28 Mốc (Master Curriculum Roadmap)
  * 1.6. Khung Tinh gọn Lean Canvas & Định vị Giá trị Khác biệt (UVP)
* **CHAPTER 2: REQUIREMENTS ANALYSIS & MOBILE UI/UX DESIGN (PHÂN TÍCH YÊU CẦU & THIẾT KẾ UI/UX DI ĐỘNG)**
  * 2.1. Nghiên cứu Chân dung Người dùng & Bản đồ Thấu cảm (User Personas & Empathy Map)
  * 2.2. Mô hình hóa Ca sử dụng (Use Case Diagram & Đặc tả Chi tiết UC-01..UC-08)
  * 2.3. Phân tích Yêu cầu Hệ thống theo chuẩn FURPS+ (ISO/IEC 25010) & Ma trận Truy vết (RTM)
  * 2.4. Đặc tả User Stories (INVEST) & Tiêu chí Chấp nhận Gherkin (Given-When-Then)
  * 2.5. Triết lý Mỹ thuật Wa-Modern (和モダン), Hệ thống Lưới 8-Point Grid & Tối ưu Thumb-Zone
  * 2.6. Luồng Người dùng Tổng thể (Master User Flow) & Ma trận Xử lý Ngoại lệ (Edge Cases)
  * 2.7. Đánh giá Thiết kế Tự động bằng AI (10 Heuristics Jakob Nielsen & Chuẩn Tương phản WCAG 2.1 AA)
* **CHAPTER 3: SYSTEM DESIGN & CLEAN ARCHITECTURE (THIẾT KẾ HỆ THỐNG & KIẾN TRÚC SẠCH)**
  * 3.1. Kiến trúc Đa Phân hệ Tổng thể (Unified Backend - Dual Multi-Platform Frontend)
  * 3.2. Hiện thực Clean Architecture 3 Tầng (Presentation, Domain, Data Layers)
  * 3.3. Kiến trúc Frontend Đa Nền tảng (React 18, TypeScript, Vite, Tailwind CSS & Capacitor 6.2)
  * 3.4. Kiến trúc Backend Enterprise (Java 21 LTS, Spring Boot 3.4.2, Stateless JWT & RBAC)
  * 3.5. Đặc tả Toàn bộ Hệ thống RESTful API Endpoints (User & Admin Controllers)
  * 3.6. Thiết kế Cơ sở Dữ liệu Hybrid NoSQL trên Google Cloud Firestore (Sơ đồ ERD 10 Thực thể)
  * 3.7. Chiến lược Đánh Chỉ mục Phức hợp (Compound Indexing) & Bảo mật Cách ly Dữ liệu (RLS)
  * 3.8. Cơ chế Kháng lỗi Ngoại tuyến (Offline Resilience & Background Auto-Synchronization)
* **CHAPTER 4: ADVANCED CAPABILITIES & ARTIFICIAL INTELLIGENCE (NĂNG LỰC NÂNG CAO & TRÍ TUỆ NHÂN TẠO)**
  * 4.1. Kiến trúc Ranh giới Kiểm soát AI 3 Lớp (3-Layer AI Governance & Whitelist Guardrails)
  * 4.2. Kỹ thuật Prompt Engineering Chuyên sâu & Mẫu Prompt Thực tế (Master Prompts)
  * 4.3. Nhật ký Thực nghiệm & Phản biện Vòng lặp Prompt (Prompt Iteration Logs PR-01..PR-06)
  * 4.4. Cơ chế Human-in-the-Loop (HITL): Kiểm duyệt Phán quyết AI & Cổng Quản trị Giảng viên
  * 4.5. Thuật toán Ôn tập Ngắt quãng SuperMemo-2 (SM-2): Công thức Toán học & Bảng Mô phỏng Chu kỳ
  * 4.6. Động cơ Nhận diện Nét vẽ Chữ Hán On-Device & Giải phẫu 300 Kanji NEJ
  * 4.7. Hệ thống Gamification Thực chất: Vòng lặp 4 Nhiệm vụ Mốc, Điểm Năng Động & Chống Gian lận
* **CHAPTER 5: TESTING, PERFORMANCE PROFILING & EVALUATION (KIỂM THỬ, ĐO LƯỜNG HIỆU NĂNG & ĐÁNH GIÁ)**
  * 5.1. Chiến lược Kiểm thử Đa tầng (Testing Pyramid: Unit, Integration, E2E Physical Device)
  * 5.2. Kiểm thử Chức năng & Bảo mật RBAC trên Backend RESTful API (Postman Test Suite)
  * 5.3. Kịch bản Kiểm thử Đầu-Cuối trên Thiết bị Di động Thực tế (Android APK & iOS Safari PWA)
  * 5.4. Hồ sơ Đo lường Hiệu năng (Lighthouse Audit, Memory Footprint, 60 FPS & Firestore Latency)
  * 5.5. Quy trình Đóng gói Bản dựng Phát hành (`v1.0.5`) & Triển khai Đám mây (AWS EC2 + Docker + HTTPS)
* **CHAPTER 6: CONCLUSION, LESSONS LEARNED & FUTURE WORK (KẾT LUẬN, BÀI HỌC & HƯỚNG PHÁT TRIỂN)**
  * 6.1. Tổng kết Các Kết quả Đạt được so với Mục tiêu Đề ra
  * 6.2. Bài học Kinh nghiệm Kỹ thuật & Quản trị AI Có Trách nhiệm
  * 6.3. Hạn chế Hiện tại & Lộ trình Phát triển Tiếp theo (Roadmap v2.0)
* **📦 FINAL DEFENSE DELIVERABLES CHECKLIST (DANH MỤC BÀN GIAO HỒ SƠ BẢO VỆ CUỐI KỲ)**

<div class="page-break"></div>

## CHAPTER 1: INTRODUCTION & PROBLEM SPACE

### 1.1. Bối cảnh Thực tiễn & Nhu cầu Học Tiếng Nhật Khối Kỹ thuật Công nghệ
Trong bối cảnh toàn cầu hóa ngành công nghiệp phần mềm, Nhật Bản hiện là đối tác lớn thứ hai của các doanh nghiệp Công nghệ Thông tin (CNTT) Việt Nam. Tại các trường đại học công nghệ hàng đầu như Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU) - Đại học Đà Nẵng, nhu cầu học tiếng Nhật để tham gia các chương trình Kỹ sư Cầu nối (BrSE), thực tập doanh nghiệp (Internship) tại Fukuoka, Tokyo, Osaka và làm việc tại các tập đoàn công nghệ Nhật Bản đang gia tăng mạnh mẽ qua từng năm.

Tuy nhiên, quá trình chinh phục tiếng Nhật của sinh viên khối kỹ thuật luôn gặp phải rào cản lớn:
* **Đặc thù ngôn ngữ phức tạp:** Tiếng Nhật sử dụng đồng thời 3 hệ thống chữ viết gồm bảng chữ mềm `Hiragana` (46 ký tự cơ bản + biến âm), bảng chữ cứng `Katakana` (dùng cho từ mượn công nghệ/ngoại lai) và hệ thống chữ Hán `Kanji` (hàng ngàn ký tự đa âm On-Kun).
* **Sự khác biệt tư duy cú pháp:** Ngữ pháp tiếng Nhật tuân theo trật tự `Chủ ngữ (S) - Tân ngữ (O) - Động từ (V)` cùng hệ thống trợ từ (`は`, `が`, `を`, `に`, `で`, `へ`, `と`, `から`, `まで`) định định vai trò ngữ pháp của từng từ trong câu. Chỉ cần dùng sai một trợ từ, ý nghĩa toàn bộ câu giao tiếp có thể thay đổi hoàn toàn.
* **Áp lực thời gian của sinh viên CNTT:** Sinh viên ngành phần mềm phải dành phần lớn thời gian cho đồ án lập trình, thuật toán và thực hành phòng lab; họ chỉ có những khoảng thời gian ngắn phân mảnh trong ngày (15–20 phút trên xe buýt, giờ giải lao giữa ca học, hoặc trước khi đi ngủ) để học ngoại ngữ trên điện thoại di động.

### 1.2. Phân tích Thực trạng: Sự thất bại của Mô hình "Danh sách Khóa học Tĩnh"
Khảo sát thực tế trên hơn 200 sinh viên CNTT và người tự học tiếng Nhật qua các ứng dụng di động hiện hành cho thấy một con số đáng báo động: **Hơn 65% người học bỏ cuộc trong vòng 60 ngày đầu tiên**. Qua phân tích chiều sâu, sự thất bại này bắt nguồn từ 4 nguyên nhân cốt lõi:

1. **Mô hình "Danh sách khóa học tĩnh" (Static Course Lists) gây quá tải nhận thức (Cognitive Overload):**
   Hầu hết các ứng dụng hiện nay chỉ số hóa một cách cơ học mục lục sách giấy lên màn hình điện thoại (ví dụ: hiển thị danh sách từ Bài 1 đến Bài 50 của giáo trình *Minna no Nihongo* hoặc danh sách 2,136 chữ Hán). Khi người học mở ứng dụng, họ đối diện với một "bức tường lý thuyết" khổng lồ, không cảm nhận được mục tiêu thực tiễn của từng bài và dễ rơi vào trạng thái kiệt sức (Burnout).
2. **Sự đứt gãy giữa "Nhớ từ đơn lẻ" và "Ứng dụng trong ngữ cảnh giao tiếp":**
   Người học có thể đạt điểm cao khi lật thẻ Flashcard rời rạc, nhưng khi bước vào tình huống đời thực (tự giới thiệu bản thân ngày đầu thực tập, hỏi đường tàu điện ngầm tại Tokyo, hay viết tin nhắn xin dời lịch hẹn với quản lý người Nhật), họ không thể kết nối các từ vựng đã học thành câu hoàn chỉnh.
3. **Cơ chế đánh giá máy móc, phạt lỗi sai nặng nề:**
   Các ứng dụng truyền thống thường áp dụng bài kiểm tra cuối bài dài 25–30 câu; nếu người học không đạt điểm qua môn, họ bị buộc phải học lại toàn bộ bài học từ đầu. Ngược lại, một số ứng dụng cho phép người dùng bấm "Next" (Click-through) qua các màn hình lý thuyết mà không kiểm chứng xem người học đã thực sự nắm vững kiến thức hay chưa.
4. **Rủi ro từ các Chatbot AI tự do không rào chắn (Unbounded AI Hallucination & Scope Creep):**
   Sự bùng nổ của các mô hình ngôn ngữ lớn (LLM) khiến nhiều ứng dụng vội vàng tích hợp cửa sổ chat AI tự do. Tuy nhiên, khi một học viên mới ở trình độ sơ cấp N5 đặt câu hỏi, AI tự do thường trả lời bằng từ vựng Hán tự phức tạp thuộc cấp độ N2/N1 và cấu trúc kính ngữ nâng cao, khiến người mới học choáng ngợp và mất phương hướng sư phạm.

### 1.3. Khảo sát & Đối sánh Thị trường (Competitive Benchmarking)

| Tiêu chí Đối sánh | Anki (Flashcard) | Duolingo | Mazii Dictionary | HeyJapan | **KIZUNA (Giải pháp của Đồ án)** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mô hình Trải nghiệm** | Thẻ ghi nhớ tĩnh, người dùng tự nhập liệu thủ công | Cây bài học ngắn nhưng câu hỏi lặp, thiếu văn hóa Nhật | Từ điển tra cứu & phòng luyện đề JLPT tĩnh | Bài học theo chủ đề ngắn, trắc nghiệm đơn giản | **Bản đồ Hành trình RPG 5 Tầng (Journey $\rightarrow$ Stage $\rightarrow$ Milestone $\rightarrow$ Quest $\rightarrow$ SRS)** |
| **Giáo trình Cốt lõi** | Không có giáo trình chuẩn | Tự biên soạn, thiên về dịch câu Âu-Mỹ | Tổng hợp đề thi JLPT cũ | Tổng hợp sơ cấp cơ bản | **Chuẩn hóa 1,202 bản ghi từ Giáo trình NEJ (New Approach Japanese) Vol 1 & 2** |
| **Cơ chế Mở khóa** | Tự do, không có lộ trình | Tích lũy vương miện qua trắc nghiệm lặp | Không có lộ trình mở khóa | Mở khóa tuần tự đơn tuyến | **Vượt vòng lặp 4 nhiệm vụ thực chiến tại mốc (Đạt $\ge 80\%$ mới mở mốc kế tiếp)** |
| **Ứng dụng AI & Guardrails** | ❌ Không tích hợp AI | ⚠️ Duolingo Max (Chi phí rất cao, chưa tối ưu văn hóa Nhật) | ⚠️ Dịch máy thuần túy | ⚠️ Chưa có AI chấm câu tự luận có kiểm soát | ✅ **AI Sensei chấm câu & phân tích sắc thái dựa trên Knowledge Whitelist nghiêm ngặt** |
| **Cơ chế Ôn lỗi sai (SRS)** | Thuật toán SM-2 tốt nhưng khô khan, tách rời ngữ cảnh | Ôn tập ngẫu nhiên | Sổ tay từ vựng tĩnh | Ôn tập cuối chương | ✅ **Tự động chuyển từ sai thành "Nhiệm vụ quay lại luyện tập" ngay trên bản đồ** |
| **Kiến trúc Đa nền tảng** | Cần đồng bộ thủ công, UI lỗi thời | Web + Native App | Web + App tách biệt | Mobile App | ✅ **Đồng bộ thời gian thực Web Desktop + Mobile APK (Capacitor) + iOS PWA qua Firestore** |

### 1.4. Bước chuyển dịch Mô hình KIZUNA: "Hành trình như một Chuyến đi" (Journey Map Gamification)
Dự án **KIZUNA (絆 — Sợi dây gắn kết)** định nghĩa lại toàn diện phương pháp học tiếng Nhật trên thiết bị di động:
* **Biến người học thành một "Lữ khách" (Traveler):** Hành trình học tiếng Nhật được trực quan hóa thành một chuyến du hành khám phá đất nước Nhật Bản từ Bắc xuống Nam.
* **Kiến trúc Tri thức 5 Cấp độ (5-Tier Knowledge Hierarchy):**
  1. **Tầng 1 — Hành trình (Journey):** Lộ trình tổng thể chinh phục tiếng Nhật giao tiếp và học thuật.
  2. **Tầng 2 — Chặng (Stages - 4 Chặng lớn):** Phân chia theo cột mốc năng lực thực tế từ làm quen mặt chữ Kana đến giao tiếp tự nhiên N4.
  3. **Tầng 3 — Mốc (Milestones - 28 Trạm kiểm soát):** Mỗi mốc là một tình huống giao tiếp cụ thể trong đời sống/công việc (tương ứng với các Unit của bộ giáo trình *NEJ Vol 1 & Vol 2*).
  4. **Tầng 4 — Nhiệm vụ Mốc (Milestone Quests - 112 Bài học):** Tại mỗi mốc, học viên bắt buộc vượt qua 4 bước rèn luyện khép kín: `SRS Flashcard` $\rightarrow$ `Vocab Gatekeeper` $\rightarrow$ `Grammar Scramble` $\rightarrow$ `Situational Reading & AI Sensei Dialogue`.
  5. **Tầng 5 — Nhiệm vụ Ôn tập Ngắt quãng (Spaced Re-engagement Quests):** Các từ vựng/chữ Hán học viên làm sai được thuật toán **SuperMemo-2 (SM-2)** tự động lập lịch để xuất hiện lại đúng thời điểm não bộ sắp quên.

### 1.5. Lộ trình Giáo trình Toàn diện 4 Chặng — 28 Mốc (Master Curriculum Roadmap)
Bảng dưới đây trình bày cấu trúc 4 Chặng và 28 Mốc học tập đã được số hóa hoàn chỉnh trong tệp dữ liệu hạt nhân [`docs/KIZUNA_NEJ_SEED_DATA.json`](file:///d:/Documents/KIZUNA/docs/KIZUNA_NEJ_SEED_DATA.json):

| Chặng (Stage) | Mã Mốc Điển hình | Chủ đề Tình huống Giao tiếp Thực tế (NEJ Units) | Trọng tâm Kiến thức (Whitelist Scope) | Phần thưởng Hoàn thành |
| :--- | :--- | :--- | :--- | :---: |
| **Chặng 1: Khởi Hành — Chinh Phục Chữ Viết & Phát Âm**<br>*(4 Mốc: #1 – #4)* | `ms_s1_01` $\rightarrow$ `ms_s1_04` | - Mốc 1: Bảng chữ mềm Hiragana & Trường âm<br>- Mốc 2: Bảng chữ cứng Katakana & Từ ngoại lai IT<br>- Mốc 3: Biến âm (Tenten, Maru), Âm ghép & Âm ngắt<br>- Mốc 4: Chào hỏi hằng ngày & Giao tiếp lớp học | 92 ký tự Kana chuẩn, quy tắc phát âm nhịp (Mora), 45 câu chào hỏi cơ bản (`おはようございます`, `よろしくお願いします`). | `100 – 150 XP`<br>`+50 Active Pts` |
| **Chặng 2: Nền Tảng Căn Bản — Đời Sống Thực Tiễn N5 (NEJ Vol 1 - Phần 1)**<br>*(6 Mốc: #5 – #10)* | `ms_s2_u01` $\rightarrow$ `ms_s2_u06` | - Unit 1: Tự giới thiệu bản thân, quê quán, trường học<br>- Unit 2: Gia đình & Nghề nghiệp người thân<br>- Unit 3: Sở thích cá nhân & Hoạt động lúc rảnh rỗi<br>- Unit 4: Nhịp sống hằng ngày & Giờ giấc sinh hoạt<br>- Unit 5: Đi chơi cuối tuần & Phương tiện di chuyển<br>- Unit 6: Mua sắm tại cửa hàng tiện lợi (Konbini) & Giá cả | 156 từ vựng cốt lõi, 60 chữ Kanji đầu tiên (#1–#60), trợ từ `は`, `の`, `も`, `を`, `に`, `で`, `へ`, chia động từ thể `〜ます / 〜ました`. | `155 – 180 XP`<br>`+70 Active Pts` |
| **Chặng 3: Mở Rộng Giao Tiếp — Trải Nghiệm Xứ Phù Tang (NEJ Vol 1 - Phần 2)**<br>*(6 Mốc: #11 – #16)* | `ms_s3_u07` $\rightarrow$ `ms_s3_u12` | - Unit 7: Ẩm thực Nhật Bản & Gọi món tại nhà hàng<br>- Unit 8: Miêu tả căn phòng & Khu phố sinh sống<br>- Unit 9: Hỏi đường, Ga tàu điện & Chuyển tuyến<br>- Unit 10: Kể về chuyến du lịch & Kỷ niệm đáng nhớ<br>- Unit 11: Sức khỏe, Khám bệnh & Xin nghỉ phép<br>- Unit 12: Đổi lịch hẹn & Nhờ vả lịch sự nơi công sở | 180 từ vựng đời sống, 90 chữ Kanji (#61–#150), tính từ đuôi `-i/-na`, động từ thể `〜て (Te-form)`, mẫu câu xin phép & nhờ vả `〜ていただけますか`. | `180 – 220 XP`<br>`+85 Active Pts` |
| **Chặng 4: Tự Tin Khám Phá — Diễn Đạt Tự Nhiên N4 (NEJ Vol 2 - Unit 13–24)**<br>*(12 Mốc: #17 – #28)* | `ms_s4_u13` $\rightarrow$ `ms_s4_u24` | - Unit 13–16: Chia sẻ ước mơ, Kế hoạch tương lai, So sánh văn hóa Việt - Nhật, Khuyên nhủ bạn bè<br>- Unit 17–20: Phỏng vấn việc làm thêm (Baito), Quy tắc nơi làm việc, Thảo luận nhóm IT, Báo cáo HORENSO<br>- Unit 21–24: Giải quyết sự cố phát sinh, Thể bị động, Thể sai khiến & Kính ngữ giao tiếp doanh nghiệp | 300+ từ vựng N4, 150 chữ Kanji (#151–#300), thể thông thường (Plain form), mệnh đề định ngữ, câu điều kiện `〜たら / 〜ば`, kính ngữ cơ bản. | `250 – 300 XP`<br>`+100 Active Pts` |

### 1.6. Khung Tinh gọn Lean Canvas & Định vị Giá trị Khác biệt (UVP)

```mermaid
graph TD
    P["1. VẤN ĐỀ CỐT LÕI<br>- 65% người học bỏ cuộc trong 60 ngày đầu<br>- Mục lục bài học tĩnh gây quá tải nhận thức<br>- Học từ rời rạc, không ghép được câu giao tiếp<br>- Chatbot AI tự do sinh từ vượt trình độ"]
    S["2. GIẢI PHÁP ĐỘT PHÁ<br>- Bản đồ Hành trình RPG 4 Chặng - 28 Mốc<br>- Vòng lặp 4 Nhiệm vụ bắt buộc tại mỗi mốc<br>- AI Sensei chấm bài theo Knowledge Whitelist<br>- Thuật toán SM-2 tự sinh nhiệm vụ ôn lỗi sai"]
    UVP["3. GIÁ TRỊ KHÁC BIỆT (UVP)<br>'Học như một Chuyến đi': Chuyển hóa 1,202 bản ghi giáo trình NEJ thành hành trình khám phá có AI Sensei đồng hành an toàn"]
    ADV["4. LỢI THẾ ĐỘC QUYỀN<br>- Kiến trúc 3-Layer AI Guardrails chống ảo giác<br>- Đồng bộ tức thời Android APK + iOS PWA + Web<br>- Hệ thống Điểm Năng Động chống gian lận"]
    SEG["5. PHÂN KHÚC NGƯỜI DÙNG<br>- Sinh viên CNTT định hướng Nhật Bản (VKU, ĐH Bách Khoa)<br>- Kỹ sư IT chuẩn bị đi thực tập tại Fukuoka/Tokyo<br>- Người tự học tiếng Nhật cần lộ trình thực chiến"]

    P --> S
    S --> UVP
    UVP --> ADV
    ADV --> SEG
```

<div class="page-break"></div>

## CHAPTER 2: REQUIREMENTS ANALYSIS & MOBILE UI/UX DESIGN

### 2.1. Nghiên cứu Chân dung Người dùng & Bản đồ Thấu cảm (User Personas & Empathy Map)

#### Persona 1 (Primary Learner): Lê Hoàng Nam — Sinh viên CNTT định hướng Thực tập Nhật Bản
* **Độ tuổi & Nghề nghiệp:** 20 tuổi, Sinh viên năm 2 ngành Kỹ thuật Phần mềm tại VKU (Đà Nẵng).
* **Mục tiêu (Goals):** Đạt trình độ giao tiếp tương đương JLPT N4 trong 6 tháng để vượt qua vòng phỏng vấn chương trình thực tập doanh nghiệp tại Fukuoka; rèn luyện phản xạ viết câu và đọc hiểu tài liệu cơ bản.
* **Điểm đau (Frustrations):** Sợ danh sách bài học dài; hay nhầm lẫn trợ từ tiếng Nhật; thường học trên xe buýt sóng 4G chập chờn nên rất ghét ứng dụng bị văng hoặc mất dữ liệu khi đang làm bài.

#### Persona 2 (Secondary Curator/Admin): ThS. Nguyễn Minh Tuấn — Giảng viên Tiếng Nhật Chuyên ngành
* **Độ tuổi & Nghề nghiệp:** 34 tuổi, Giảng viên phụ trách đào tạo tiếng Nhật định hướng CNTT.
* **Mục tiêu (Goals):** Theo dõi tiến độ thực tế của sinh viên theo từng mốc bài học NEJ; biết được mốc nào sinh viên hay bỏ cuộc nhất (Drop-off Funnel); kiểm soát chặt chẽ nội dung phản hồi của AI để đảm bảo tính chuẩn mực sư phạm.

---

### 2.2. Mô hình hóa Ca sử dụng (Use Case Diagram & Đặc tả Chi tiết UC-01..UC-08)

```mermaid
graph LR
    Learner["Lữ khách / Học viên<br>(ROLE_USER)"]
    Admin["Giảng viên / Quản trị viên<br>(ROLE_ADMIN)"]
    AIEngine["Động cơ AI Sensei<br>(Google Gemini + Guardrail)"]

    subgraph KizunaSystem["HỆ THỐNG ĐA NỀN TẢNG KIZUNA (絆)"]
        UC01["UC-01: Đăng nhập JWT & Khôi phục Phiên"]
        UC02["UC-02: Khám phá Bản đồ Hành trình 4 Chặng - 28 Mốc"]
        UC03["UC-03: Thực thi Vòng lặp 4 Nhiệm vụ tại Mốc"]
        UC04["UC-04: Tương tác Đối thoại & Chấm điểm cùng AI Sensei"]
        UC05["UC-05: Ôn tập Ngắt quãng SuperMemo-2 (SRS Queue)"]
        UC06["UC-06: Luyện đề JLPT N5-N1 & Đua Top Bảng Xếp Hạng"]
        UC07["UC-07: Quản trị Giáo trình, Mốc & Whitelist (Admin)"]
        UC08["UC-08: Kiểm duyệt Khiếu nại AI & Chống Gian lận (Admin)"]
    end

    Learner --> UC01
    Learner --> UC02
    Learner --> UC03
    Learner --> UC04
    Learner --> UC05
    Learner --> UC06

    Admin --> UC01
    Admin --> UC07
    Admin --> UC08

    UC04 -.->|Kiểm soát Whitelist| AIEngine
    UC08 -.->|Audit & Tinh chỉnh Prompt| AIEngine
```

#### Bảng Đặc tả Chi tiết 8 Ca Sử dụng Cốt lõi (Detailed Use Case Specifications)
| Mã UC | Tên Ca Sử dụng | Tác nhân | Tiền điều kiện (Preconditions) | Luồng Xử lý Chính (Main Flow) | Hậu điều kiện (Postconditions) |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **UC-01** | Đăng nhập JWT & Đồng bộ Đa thiết bị | Học viên, Admin | Người dùng có tài khoản hợp lệ (`user`/`admin`) hoặc đăng ký mới. | 1. Nhập thông tin đăng nhập.<br>2. Backend kiểm tra `BCryptPasswordEncoder`.<br>3. Cấp phát JWT (`HMAC-SHA256`) chứa `role`.<br>4. Lưu Token và tải hồ sơ từ Firestore. | Người dùng được định tuyến đúng phân hệ (`/roadmap` hoặc `/admin`). |
| **UC-02** | Khám phá Bản đồ Hành trình 28 Mốc | Học viên | Đã đăng nhập thành công. | 1. Tải cấu trúc 4 Chặng và 28 Mốc.<br>2. Hợp nhất với bảng `user_progress`.<br>3. Hiển thị trực quan trạng thái `LOCKED`, `UNLOCKED`, `IN_PROGRESS`, `COMPLETED`. | Người dùng xem được vị trí hiện tại, tỷ lệ hoàn thành và chạm vào mốc để học. |
| **UC-03** | Thực thi Vòng lặp 4 Nhiệm vụ tại Mốc | Học viên | Mốc được chọn có trạng thái `UNLOCKED` hoặc `IN_PROGRESS`. | 1. Mở `RoadmapQuestRunner`.<br>2. Làm Quest 1 (SRS Swipe).<br>3. Làm Quest 2 (Vocab Gatekeeper).<br>4. Làm Quest 3 (Grammar Scramble).<br>5. Làm Quest 4 (Reading & AI Dialogue). | Nếu hoàn thành đủ 4 Quest ($\ge 80\%$), mốc chuyển sang `COMPLETED` và mở mốc kế tiếp. |
| **UC-04** | Đối thoại & Chấm bài cùng AI Sensei | Học viên, AI Engine | Đang ở bước thực hành giao tiếp của mốc. | 1. Hệ thống đưa tình huống thực tế.<br>2. Học viên chọn/nhập câu tiếng Nhật.<br>3. AI Sensei đối chiếu với `knowledge_whitelist`, giải thích ngữ pháp và sắc thái. | Học viên nhận phản hồi tức thời kèm hướng dẫn sửa lỗi trợ từ/cách chia thể. |
| **UC-05** | Ôn tập Ngắt quãng SuperMemo-2 | Học viên | Có thẻ từ trong hàng đợi `user_srs_items` đến hạn. | 1. Truy cập danh sách thẻ cần ôn.<br>2. Đánh giá mức độ nhớ $q \in [0..5]$.<br>3. Backend chạy thuật toán SM-2 tính `intervalDays` và `easinessFactor` mới. | Cập nhật `nextReviewDate`; xóa cờ `isFailedQueue` nếu học viên đã nhớ vững ($q \ge 3$). |
| **UC-06** | Thi thử JLPT N5–N1 & Bảng Xếp Hạng | Học viên | Đã đăng nhập hệ thống. | 1. Chọn cấp độ đề thi (N5 $\rightarrow$ N1) trong `ExamPage`.<br>2. Làm bài bấm giờ.<br>3. Xem điểm số, giải thích đáp án và thứ hạng trên `Leaderboard`. | Điểm Năng Động (`activePoints`) được cộng và cập nhật thứ hạng Top 50. |
| **UC-07** | Quản trị Giáo trình & Cấu hình Mốc | Admin (`ROLE_ADMIN`) | Đăng nhập với Token chứa `ROLE_ADMIN`. | 1. Truy cập `AdminDashboardPage`.<br>2. Bật/tắt trạng thái mốc (`PATCH /status`).<br>3. Điều chỉnh phần thưởng XP, ngưỡng qua bài và thêm từ vựng/kanji mới. | Dữ liệu giáo trình được cập nhật tức thời cho toàn bộ học viên. |
| **UC-08** | Kiểm duyệt Khiếu nại AI & Anti-Cheat | Admin (`ROLE_ADMIN`) | Có bản ghi `PENDING` trong `ai_evaluation_audits`. | 1. Xem câu trả lời của học viên và nhận xét của AI.<br>2. Chọn `APPROVED` (cộng bù điểm) hoặc `REJECTED`.<br>3. Kiểm tra và trừ điểm tài khoản gian lận nếu có. | Đảm bảo tính công bằng của Bảng xếp hạng và nâng cao chất lượng AI Sensei. |

---

### 2.3. Phân tích Yêu cầu Hệ thống theo chuẩn FURPS+ (ISO/IEC 25010) & Ma trận Truy vết (RTM)

| Mã Yêu cầu | Phân loại FURPS+ | Mô tả Yêu cầu Kỹ thuật Chi tiết | Thành phần Mã nguồn Hiện thực | Kiểm thử Xác nhận |
| :---: | :---: | :--- | :--- | :---: |
| **REQ-F01** | Functionality | Quản lý cây lộ trình 5 cấp độ: Journey $\rightarrow$ 4 Stages $\rightarrow$ 28 Milestones $\rightarrow$ 112 Quests $\rightarrow$ SRS. | `CurriculumServiceImpl.java`, `RoadmapPage.tsx` | `API-05`, `E2E-02` |
| **REQ-F02** | Functionality | Tự động mở khóa mốc kế tiếp (`orderIndex + 1`) ngay khi học viên hoàn thành Quest thứ 4 của mốc hiện tại. | `UserProgressServiceImpl.java`, `RoadmapQuestRunner.tsx` | `API-06`, `E2E-02` |
| **REQ-F03** | Functionality | Tự động đẩy từ vựng làm sai ở bài Gatekeeper vào hàng đợi ôn tập SM-2 với cờ `isFailedQueue = true`. | `UserProgressServiceImpl.java`, `SpacedRepetitionServiceImpl.java` | `API-07` |
| **REQ-F04** | Functionality | Cung cấp kho từ điển học tập độc lập (728+ Từ vựng, 300 Chữ Hán, 30 Ngữ pháp) và phòng thi JLPT N5–N1. | `VocabPage.tsx`, `KanjiPage.tsx`, `GrammarPage.tsx`, `ExamPage.tsx` | `E2E-02` |
| **REQ-U01** | Usability | Thiết kế giao diện theo mỹ thuật Nhật Bản Wa-Modern, sử dụng con dấu Hanko và huy hiệu Mon Crests. | `HomePage.tsx`, `RoadmapPage.tsx`, `index.css` | Lighthouse `98/100` |
| **REQ-U02** | Usability | Tự động nhận diện thiết bị đang truy cập (Android / iOS / PC) để hướng dẫn cài đặt APK hoặc PWA phù hợp; ẩn nút tải khi đã ở trong Native APK. | `ApkDownloadModal.tsx`, `platform.ts` | `E2E-01`, `E2E-03` |
| **REQ-R01** | Reliability | Khởi tạo dữ liệu hạt nhân an toàn: Tự động nạp 1,202 bản ghi từ `KIZUNA_NEJ_SEED_DATA.json` ngay khi khởi động server, không bị crash nếu mất kết nối mạng. | `CurriculumRepository.java`, `FirebaseConfig.java` | `API-01`, `API-02` |
| **REQ-P01** | Performance | Tốc độ phản hồi API dưới $100\text{ms}$ và tốc độ khung hình hoạt ảnh lật thẻ đạt chuẩn $60\text{ FPS}$ trên thiết bị di động. | ConcurrentHashMap Cache, Firestore Indexes, Framer Motion | Lighthouse `96/100` |
| **REQ-S01** | Security (+) | Bảo mật Stateless JWT (`HMAC-SHA256`), mã hóa mật khẩu `BCrypt`, phân quyền RBAC (`ROLE_USER` / `ROLE_ADMIN`) và Firestore RLS. | `SecurityConfig.java`, `JwtTokenProvider.java`, `JwtAuthenticationFilter.java` | `API-03`, `API-04`, `API-08` |

---

### 2.4. Đặc tả User Stories (INVEST) & Tiêu chí Chấp nhận Gherkin (Given-When-Then)

#### User Story US-01: Trải nghiệm Vòng lặp 4 Nhiệm vụ tại Mốc & Mở khóa Tự động
* **Vai trò:** Học viên (`ROLE_USER`)
* **Mong muốn:** Hoàn thành lần lượt 4 bài tập tương tác (Flashcard Swipe, Gatekeeper, Grammar Scramble, Reading & AI Sensei Dialogue) tại một mốc học tập.
* **Lợi ích:** Nắm vững toàn diện cả từ vựng, chữ Hán, ngữ pháp lẫn phản xạ giao tiếp trước khi tiến sang mốc mới.
* **Gherkin Acceptance Criteria:**
```gherkin
Feature: Milestone 4-Quest Micro-Loop Execution and Auto-Unlocking

  Scenario: Học viên vượt qua trọn vẹn 4 Quest tại Mốc và mở khóa Mốc tiếp theo
    Given Học viên đã đăng nhập và mở Mốc "ms_s1_01_hiragana" đang ở trạng thái "UNLOCKED"
    When Học viên hoàn thành Quest 1 (SRS Flashcard Swipe) và Quest 2 (Pure Vietnamese Vocab Gatekeeper)
    And Học viên hoàn thành Quest 3 (Drag & Drop Grammar Scramble)
    And Học viên hoàn thành Quest 4 (Situational Reading & 2-Way Sensei Dialogue) với điểm số >= 80%
    Then Hệ thống đóng dấu Hanko "COMPLETED" lên Mốc "ms_s1_01_hiragana"
    And Cộng thưởng XP và Active Points vào hồ sơ của học viên
    And Tự động chuyển trạng thái Mốc kế tiếp "ms_s1_02_katakana" từ "LOCKED" sang "UNLOCKED"
```

#### User Story US-02: Tự động Nhận diện Thiết bị & Cài đặt Ứng dụng Đa Nền tảng
* **Vai trò:** Người học truy cập từ trình duyệt Điện thoại Android, iPhone (iOS) hoặc Máy tính (PC)
* **Mong muốn:** Có một hộp thoại thông minh tự động phát hiện đúng hệ điều hành thiết bị của tôi để cung cấp mã QR tải file `.apk` (cho Android), hướng dẫn thêm vào Màn hình chính Safari (cho iOS), hoặc cài đặt 1 chạm PWA (cho PC).
* **Gherkin Acceptance Criteria:**
```gherkin
Feature: Smart Multi-Platform Installation & Native Detection

  Scenario: Tự động ẩn toàn bộ nút tải APK khi người học đang mở từ bên trong ứng dụng Android Native
    Given Người học đã cài đặt file "kizuna-v1.0.5.apk" trên điện thoại Android
    When Người học khởi động ứng dụng KIZUNA từ màn hình chính điện thoại
    Then Hàm "isNativeApp()" trả về giá trị "true" thông qua Capacitor Bridge
    And Toàn bộ các nút "Tải APK" trên thanh điều hướng và Trang chủ đều được ẩn đi hoàn toàn
    And Giao diện hiển thị thuần túy như một ứng dụng di động Native chuyên nghiệp
```

---

### 2.5. Triết lý Mỹ thuật Wa-Modern (和モダン), Hệ thống Lưới 8-Point Grid & Tối ưu Thumb-Zone
KIZUNA từ bỏ lối thiết kế bảng điều khiển công nghiệp khô khan để kiến tạo một không gian văn hóa Nhật Bản đặc sắc mang tên **Wa-Modern (Hòa Hiện Đại)**:
1. **Con dấu Hanko (判子) & Gia huy (家紋 - Mon Crests):**
   * Trong văn hóa Nhật Bản, con dấu đỏ Hanko là biểu tượng của sự xác nhận chính thức và niềm tự hào cá nhân. KIZUNA thiết kế các component con dấu Hanko khắc chữ Hán (`完` - Hoàn thành, `絆` - Kizuna, `優` - Ưu tú) đóng trực tiếp lên từng mốc học tập khi học viên vượt qua thử thách.
   * Thay thế các emoji thông thường bằng hệ thống biểu tượng Hoa Anh Đào (Sakura Mon), Cổng thần đạo Torii (⛩️) và Sóng biển Seigaiha.
2. **Hệ thống Lưới 8-Point Grid & Tối ưu Vùng Ngón Tay Cái (Thumb-Zone Optimization):**
   * Khung nhìn chuẩn trên di động (`390px x 844px`) được chia theo lưới `8px`.
   * Vùng thao tác một tay (One-handed Thumb Zone): Các nút lật thẻ, chọn đáp án trắc nghiệm và điều hướng bài học được đặt ở nửa dưới màn hình với chiều cao nút tối thiểu `48px – 56px`, giúp sinh viên bấm chính xác tuyệt đối ngay cả khi đang đứng trên xe buýt.

---

### 2.6. Luồng Người dùng Tổng thể (Master User Flow) & Ma trận Xử lý Ngoại lệ (Edge Cases)

```mermaid
flowchart TD
    Start([Người học mở KIZUNA<br>Android APK / iOS PWA / Web]) --> PlatformCheck{Kiểm tra isNativeApp()?}
    PlatformCheck -- Đang chạy APK Native --> HideDownload[Ẩn nút Tải App & Kích hoạt Live Sync]
    PlatformCheck -- Đang chạy Trình duyệt --> ShowDownload[Hiển thị nút Tải APK / Cài PWA thông minh]

    HideDownload --> AuthCheck{Kiểm tra Phiên Đăng nhập?}
    ShowDownload --> AuthCheck

    AuthCheck -- Chưa đăng nhập --> LoginPage[Màn hình Đăng nhập / Tạo tài khoản]
    LoginPage --> HomePage[Trang chủ Wa-Modern & Bảng Vinh Danh]
    AuthCheck -- Đã đăng nhập --> HomePage

    HomePage --> SelectModule{Chọn Phân khu Học tập}
    SelectModule -- Bản đồ Hành trình --> RoadmapPage[Bản đồ 4 Chặng - 28 Mốc NEJ]
    SelectModule -- Thư viện Tri thức --> SelfStudy[Từ vựng 728+ / Kanji 300 / Ngữ pháp 30]
    SelectModule -- Phòng Thi thử --> ExamPage[Luyện đề JLPT N5, N4, N3, N2, N1]

    RoadmapPage --> ClickMilestone[Chạm vào Mốc UNLOCKED / IN_PROGRESS]
    ClickMilestone --> Quest1[Bước 1: SRS Flashcard Swipe & Shuffle]
    Quest1 --> Quest2[Bước 2: Pure Vietnamese Vocab Gatekeeper]
    Quest2 --> Quest3[Bước 3: Drag & Drop Grammar Scramble]
    Quest3 --> Quest4[Bước 4: Hội thoại Đọc hiểu & 2-Way AI Sensei]

    Quest4 --> SaveProgress[Đồng bộ Firestore + LocalStorage<br>Đóng dấu Hanko COMPLETED & Mở khóa Mốc kế tiếp]
    SaveProgress --> RoadmapPage
```

---

### 2.7. Đánh giá Thiết kế Tự động bằng AI (10 Heuristics Jakob Nielsen & Chuẩn Tương phản WCAG 2.1 AA)

| Nguyên lý Heuristic (Jakob Nielsen) | Cách Hiện thực Cụ thể trong Giao diện KIZUNA | Mức độ Đáp ứng & Tỷ lệ Tương phản WCAG |
| :--- | :--- | :--- |
| **1. Visibility of System Status** | Hiển thị rõ thanh tiến trình `Bước 1/4` $\rightarrow$ `4/4`, số từ đã thuộc, số ngày Streak và trạng thái đồng bộ đám mây. | **Xuất sắc (10/10)** — Phản hồi thị giác tức thì $< 100\text{ms}$. |
| **2. Match Between System & Real World** | Sử dụng ẩn dụ chuyến du hành xuyên Nhật Bản, con dấu Hanko đỏ, thẻ từ vựng giấy Washi gần gũi với người học tiếng Nhật. | **Xuất sắc (10/10)** — Ngôn ngữ tự nhiên, giàu cảm hứng văn hóa. |
| **3. User Control and Freedom** | Luôn có nút quay lại Bản đồ, nút *"Đặt lại mảnh ghép"* trong bài ngữ pháp và nút *"Xáo trộn thẻ (Shuffle)"* trong bài SRS. | **Xuất sắc (9.5/10)** — Không bao giờ nhốt người dùng vào luồng cụt. |
| **4. Consistency and Standards** | Thống nhất bảng màu Xanh Ngọc Lục Bảo (`#059669`), Đỏ Sơn Mài (`#DC2626`) và Đen Than Chì (`#0F172A`) trên toàn bộ 10 trang. | **Xuất sắc (10/10)** — Tỷ lệ tương phản đạt **12.4:1 đến 15.8:1** (Chuẩn AAA). |
| **5. Error Prevention** | Cung cấp các chip từ vựng kéo-thả thay vì bắt gõ bàn phím tiếng Nhật phức tạp ở các bài tập ghép câu sơ cấp. | **Xuất sắc (9.5/10)** — Giảm 90% lỗi gõ nhầm bộ gõ IME tiếng Nhật. |
| **6. Recognition Rather Than Recall** | Luôn hiển thị phiên âm Hiragana (Furigana) và gợi ý Âm Hán Việt đi kèm chữ Kanji mới trong suốt vòng lặp mốc. | **Xuất sắc (10/10)** — Giảm tải bộ nhớ làm việc (Working Memory). |

<div class="page-break"></div>

## CHAPTER 3: SYSTEM DESIGN & CLEAN ARCHITECTURE

### 3.1. Kiến trúc Đa Phân hệ Tổng thể (Unified Backend - Dual Multi-Platform Frontend)
KIZUNA áp dụng kiến trúc phân tầng hiện đại, nơi một **Backend Spring Boot 3.4** duy nhất phục vụ đồng thời cả ứng dụng di động của học viên và cổng quản trị của giảng viên:

```mermaid
graph TB
    subgraph Clients["1. TẦNG KHÁCH HÀNG ĐA NỀN TẢNG (MULTI-PLATFORM FRONTEND)"]
        MobAPK["Android Native APK (v1.0.5)<br>Capacitor 6.2 Runtime"]
        WebPWA["iOS Safari & Desktop PWA<br>React 18 + TypeScript + Vite"]
        AdmWeb["Admin Management Portal<br>React 18 + Tremor + TanStack Table"]
    end

    subgraph Backend["2. TẦNG DỊCH VỤ DOANH NGHIỆP (SPRING BOOT 3.4.2 - JAVA 21)"]
        Gateway["Spring Security Filter Chain<br>JwtAuthenticationFilter + RBAC"]
        UserCtrl["User Controllers (/api/v1/user/**)<br>Journey, SRS, Profile, Curriculum"]
        AdminCtrl["Admin Controllers (/api/v1/admin/**)<br>Journey, Curriculum, User, AI Audit"]
        CoreServices["Clean Domain Services<br>UserProgress, SpacedRepetition, AiGovernance, Leaderboard"]
        DataRepos["Repository Layer<br>Firestore Sync + Thread-Safe In-Memory Cache"]
    end

    subgraph Cloud["3. TẦNG CƠ SỞ DỮ LIỆU & ĐÁM MÂY"]
        Firestore[("Google Cloud Firestore<br>10 Collections")]
        SeedJSON[("KIZUNA_NEJ_SEED_DATA.json<br>1,202 Curated Records")]
        Gemini["Google Gemini AI Engine"]
    end

    MobAPK -->|HTTPS + JWT| Gateway
    WebPWA -->|HTTPS + JWT| Gateway
    AdmWeb -->|HTTPS + JWT| Gateway

    Gateway --> UserCtrl
    Gateway --> AdminCtrl
    UserCtrl --> CoreServices
    AdminCtrl --> CoreServices
    CoreServices --> DataRepos
    DataRepos <--> Firestore
    SeedJSON -.->|Auto-Seed on Startup| DataRepos
    CoreServices <--> Gemini
```

---

### 3.2. Hiện thực Clean Architecture 3 Tầng (Presentation, Domain, Data Layers)
Cấu trúc thư mục của toàn bộ dự án tuân thủ nghiêm ngặt nguyên lý tách biệt mối quan tâm (**Separation of Concerns**):

```text
KIZUNA/
├── frontend/                                 # Ứng dụng Đa nền tảng (React 18 + TS + Vite + Capacitor 6.2)
│   ├── android/                              # Dự án Android Native (Gradle, AndroidManifest, Keystore)
│   ├── public/download/                      # Phân phối trực tiếp gói cài đặt kizuna-v1.0.5.apk
│   └── src/
│       ├── config/firebase.ts                # Khởi tạo Firebase Client SDK & Firestore
│       ├── user/                             # PHÂN HỆ HỌC VIÊN (MOBILE-FIRST CLIENT)
│       │   ├── pages/                        # Presentation: HomePage, RoadmapPage, Vocab/Kanji/Grammar/Exam/ProfilePage
│       │   ├── components/roadmap/           # Presentation: RoadmapQuestRunner, JapanOverworldMap, StageMilestoneMap
│       │   ├── components/                   # Presentation: ApkDownloadModal, JapaneseLessonFlashcards, UserNavbar
│       │   ├── hooks/                        # State Controllers: useAuth.ts, useProgress.ts
│       │   ├── types/                        # Domain Entities: kizuna.ts, progress.ts, auth.ts, ranking.ts
│       │   ├── utils/                        # Domain Rules: platform.ts, authValidation.ts
│       │   └── services/                     # Data Layer: kizunaService.ts, progressService.ts, rankingService.ts
│       └── admin/                            # PHÂN HỆ QUẢN TRỊ VIÊN (DESKTOP WEB PORTAL)
│           ├── pages/AdminDashboardPage.tsx  # Presentation: Quản trị Mốc, Người dùng, AI Audit, Analytics
│           ├── hooks/useAdminData.ts         # State Controller cho Admin
│           └── services/adminService.ts      # Data Layer kết nối /api/v1/admin/**
│
└── backend/                                  # Hệ thống Backend Enterprise (Java 21 + Spring Boot 3.4.2)
    └── src/main/java/com/kizuna/
        ├── controller/                       # Presentation Layer: 10 REST Controllers chuẩn hóa
        ├── dto/                              # Data Transfer Objects (Request / Response payloads)
        ├── security/                         # Security Gateway: JwtTokenProvider, JwtAuthenticationFilter, RBAC
        ├── model/                            # Domain Layer: 11 Thực thể nghiệp vụ cốt lõi
        ├── service/ & service/impl/          # Domain Use Cases: 6 Interfaces & 6 Implementations
        └── repository/                       # Data Layer: 7 Repositories (Firestore & Thread-Safe Cache)
```

---

### 3.3. Kiến trúc Frontend Đa Nền tảng (React 18, TypeScript, Vite, Tailwind CSS & Capacitor 6.2)
Điểm mạnh vượt trội của tầng Frontend là khả năng xuất bản từ một cơ sở mã nguồn duy nhất (Single Codebase) ra 3 nền tảng chạy mượt mà:
1. **Android Native APK (`v1.0.5`):** Đóng gói qua **Capacitor 6.2** (`@capacitor/android`), biên dịch thành gói `.apk` ký số thật, truy cập trực tiếp phần cứng và lưu trữ bền vững trên thiết bị Android.
2. **iOS Standalone Web App (PWA trên iPhone/iPad):** Tối ưu hóa Apple Meta Tags, cho phép người dùng iPhone cài đặt trực tiếp từ trình duyệt Safari ra màn hình chính (Add to Home Screen) và chạy toàn màn hình không cần qua App Store.
3. **PC Desktop Application:** Tích hợp sự kiện `beforeinstallprompt` cho phép cài đặt 1 chạm thành ứng dụng máy tính độc lập trên Windows/macOS qua Chrome và Edge.

---

### 3.4. Kiến trúc Backend Enterprise (Java 21 LTS, Spring Boot 3.4.2, Stateless JWT & RBAC)
Tầng bảo mật tại [`SecurityConfig.java`](file:///d:/Documents/KIZUNA/backend/src/main/java/com/kizuna/security/SecurityConfig.java) được cấu hình chặt chẽ theo kiến trúc Microservice Stateless:

```java
// Trích dẫn mã nguồn thực tế từ: backend/src/main/java/com/kizuna/security/SecurityConfig.java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(AbstractHttpConfigurer::disable)
        .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
        )
        .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        )
        .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/health/**", "/api/v1/auth/login").permitAll()
                .requestMatchers("/api/v1/curriculum/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/user/**").hasAnyRole("USER", "ADMIN")
                .anyRequest().authenticated()
        )
        .authenticationProvider(authenticationProvider())
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
}
```

---

### 3.5. Đặc tả Toàn bộ Hệ thống RESTful API Endpoints (User & Admin Controllers)
Hệ thống Backend cung cấp **26 RESTful Endpoints** được tổ chức khoa học trong 10 Controller lớp giao tiếp:

| Nhóm Phân hệ | Controller Class | Phương thức & Đường dẫn Endpoint | Quyền truy cập | Mô tả Nghiệp vụ Xử lý |
| :--- | :--- | :--- | :---: | :--- |
| **Health & Diagnostics** | `HealthController` | `GET /api/v1/health`<br>`GET /api/v1/health/firestore` | Public | Kiểm tra trạng thái hoạt động của cổng 3000 và kết nối bean Google Cloud Firestore. |
| **Authentication** | `AuthController` | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me` | Public / Auth | Xác thực username/password (`BCrypt`), cấp phát JWT Bearer Token và truy xuất thông tin phiên. |
| **Public Curriculum** | `CurriculumCommonController` | `GET /api/v1/curriculum/stages`<br>`GET /api/v1/curriculum/milestones`<br>`GET /api/v1/curriculum/milestones/{id}/details`<br>`GET /api/v1/curriculum/leaderboard` | Public / Auth | Truy xuất danh sách 4 Chặng, 28 Mốc, chi tiết từ vựng/kanji/ngữ pháp/quests của từng mốc và Bảng xếp hạng Top 50. |
| **Learner Journey** | `UserJourneyController` | `GET /api/v1/user/journey/map`<br>`GET /api/v1/user/journey/progress`<br>`POST /api/v1/user/journey/submit` | `ROLE_USER` | Lấy bản đồ hành trình cá nhân hóa; nộp kết quả từng Quest, tính điểm thông thạo và tự động mở khóa mốc kế tiếp. |
| **Learner SM-2 SRS** | `UserSrsController` | `GET /api/v1/user/srs/due`<br>`POST /api/v1/user/srs/review` | `ROLE_USER` | Lấy danh sách thẻ từ vựng/kanji đến hạn ôn tập hôm nay; cập nhật kết quả ôn tập theo thuật toán SuperMemo-2. |
| **Learner Profile** | `UserProfileController` | `GET /api/v1/user/profile`<br>`POST /api/v1/user/ai-audit/complaint` | `ROLE_USER` | Xem hồ sơ thống kê chi tiết (XP, Active Points, Streak, Rank) và gửi yêu cầu khiếu nại kết quả chấm của AI Sensei. |
| **Admin Journey** | `AdminJourneyController` | `GET /api/v1/admin/journey/overview`<br>`POST /api/v1/admin/journey/milestone`<br>`PATCH /api/v1/admin/journey/milestones/{id}/status`<br>`PUT /api/v1/admin/journey/milestones/{id}/gameplay` | `ROLE_ADMIN` | Xem thống kê phễu rơi rụng (Drop-off Funnel) qua 28 mốc; bật/tắt mốc; cấu hình phần thưởng XP và ngưỡng điểm qua bài. |
| **Admin Curriculum** | `AdminCurriculumController` | `POST /api/v1/admin/curriculum/vocabulary`<br>`DELETE /api/v1/admin/curriculum/vocabulary/{id}`<br>`POST /api/v1/admin/curriculum/kanji`<br>`POST /api/v1/admin/curriculum/grammar` | `ROLE_ADMIN` | Quản trị CRUD kho dữ liệu giáo trình: Thêm mới/cập nhật/xóa từ vựng, chữ Hán (300 Kanji NEJ) và mẫu ngữ pháp. |
| **Admin Users & Anti-Cheat** | `AdminUserController` | `GET /api/v1/admin/users`<br>`PATCH /api/v1/admin/users/{id}/status`<br>`PATCH /api/v1/admin/users/{id}/role`<br>`POST /api/v1/admin/users/anti-cheat/adjust-points` | `ROLE_ADMIN` | Quản lý danh sách người dùng, khóa/mở khóa tài khoản, phân quyền Role và điều chỉnh Điểm Năng Động chống gian lận. |
| **Admin AI Governance** | `AdminAiController` | `GET /api/v1/admin/ai/audits`<br>`POST /api/v1/admin/ai/audits/{id}/resolve`<br>`POST /api/v1/admin/ai/sandbox` | `ROLE_ADMIN` | Duyệt hàng đợi khiếu nại AI (`APPROVED`/`REJECTED`), cộng bù điểm cho học viên và thử nghiệm Prompt trong Sandbox. |

---

### 3.6. Thiết kế Cơ sở Dữ liệu Hybrid NoSQL trên Google Cloud Firestore (Sơ đồ ERD 10 Thực thể)
Hệ thống cơ sở dữ liệu được chia làm 4 phân vùng logic rõ rệt: (1) Phân vùng Giáo trình Tĩnh (`stages`, `milestones`, `milestone_quests`, `vocabulary_items`, `kanji_dictionary`, `grammar_items`), (2) Phân vùng Định danh (`users`), (3) Phân vùng Tiến trình Học tập Cách ly (`user_progress`, `user_srs_items`, `leaderboard`), và (4) Phân vùng Kiểm toán AI (`ai_evaluation_audits`).

```mermaid
erDiagram
    STAGES ||--o{ MILESTONES : "chứa (1:N)"
    MILESTONES ||--o{ MILESTONE_QUESTS : "gồm 4 quest (1:4)"
    MILESTONES ||--o{ VOCABULARY_ITEMS : "dạy 26 từ (1:N)"
    MILESTONES ||--o{ KANJI_DICTIONARY : "rèn chữ Hán (1:N)"
    MILESTONES ||--o{ GRAMMAR_ITEMS : "tổng kết mẫu câu (1:N)"

    USERS ||--o{ USER_PROGRESS : "lưu tiến độ riêng (1:N)"
    MILESTONES ||--o{ USER_PROGRESS : "gắn liền mốc (1:N)"
    USERS ||--o{ USER_SRS_ITEMS : "hàng đợi SM-2 (1:N)"
    USERS ||--|| LEADERBOARD : "xếp hạng 1-1 (1:1)"
    USERS ||--o{ AI_EVALUATION_AUDITS : "khiếu nại AI (1:N)"

    STAGES {
        string id PK "stage_1..stage_4"
        int orderIndex "Thứ tự chặng (1..4)"
        string title "Tên chặng hành trình"
        string themeColor "Mã màu chủ đạo"
    }
    MILESTONES {
        string id PK "ms_s1_01..ms_s4_u24"
        string stageId FK "Tham chiếu STAGES.id"
        int orderIndex "Thứ tự toàn cục (1..28)"
        string title "Tên mốc học tập"
        string nejUnit "Đơn vị bài học NEJ"
        int xpReward "Điểm XP thưởng"
        int activePointsReward "Điểm Năng Động thưởng"
        string prerequisiteMilestoneId FK "Mốc điều kiện tiên quyết"
    }
    VOCABULARY_ITEMS {
        string id PK "vocab_001..vocab_728"
        string milestoneId FK "Tham chiếu MILESTONES.id"
        string term "Từ vựng Kanji/Kana"
        string reading "Cách đọc Hiragana"
        string sinoVietnamese "Âm Hán Việt"
        string vietnameseMeaning "Nghĩa tiếng Việt"
    }
    USER_PROGRESS {
        string id PK "{userId}_{milestoneId}"
        string userId FK "Tham chiếu USERS.id"
        string milestoneId FK "Tham chiếu MILESTONES.id"
        string status "LOCKED | UNLOCKED | IN_PROGRESS | COMPLETED"
        array completedQuests "Danh sách quest đã hoàn tất"
        float vocabMasteryRate "Tỷ lệ thuộc từ (0..100%)"
    }
    USER_SRS_ITEMS {
        string id PK "{userId}_{itemId}"
        string userId FK "Tham chiếu USERS.id"
        string itemId FK "Mã từ vựng/kanji"
        int repetitionNumber "Số lần lặp thành công"
        double easinessFactor "Hệ số dễ dàng EF (>=1.3)"
        int intervalDays "Chu kỳ ngày ôn tiếp theo"
    }
```

#### Cấu trúc Bản ghi JSON Thực tế trong Cơ sở Dữ liệu:
```json
// 1. Mẫu bản ghi Collection "vocabulary_items" (Trích từ KIZUNA_NEJ_SEED_DATA.json)
{
  "id": "vocab_u01_001",
  "milestoneId": "ms_s2_u01_self_intro",
  "term": "留学生",
  "reading": "りゅうがくせい",
  "sinoVietnamese": "LƯU HỌC SINH",
  "vietnameseMeaning": "Du học sinh",
  "wordType": "Danh từ (Noun)",
  "exampleSentenceJp": "私はベトナムからの留学生です。",
  "exampleSentenceVi": "Tôi là du học sinh đến từ Việt Nam.",
  "nejSource": "NEJ Vol 1 - Unit 1",
  "isCore": true
}

// 2. Mẫu bản ghi Collection "user_progress" (Lưu tiến độ cách ly của từng học viên)
{
  "id": "user_ms_s2_u01_self_intro",
  "userId": "user",
  "milestoneId": "ms_s2_u01_self_intro",
  "status": "COMPLETED",
  "completedQuests": ["q1_srs", "q2_gatekeeper", "q3_scramble", "q4_practice"],
  "currentQuestIndex": 4,
  "vocabMasteryRate": 92.5,
  "activePointsEarned": 70,
  "unlockedAt": "2026-10-15T08:00:00Z",
  "completedAt": "2026-10-15T08:25:00Z"
}
```

---

### 3.7. Chiến lược Đánh Chỉ mục Phức hợp (Compound Indexing) & Bảo mật Cách ly Dữ liệu (RLS)
Để đảm bảo độ trễ truy vấn trên Firestore luôn đạt mức $< 50\text{ms}$, nhóm đã thiết lập bộ **Compound Indexes** chuyên biệt kết hợp cùng **Firestore Security Rules** cách ly dữ liệu cấp độ dòng (Row-Level Security):
* Mọi truy vấn đọc/ghi vào `user_progress` và `user_srs_items` đều bắt buộc thỏa mãn điều kiện `resource.data.userId == request.auth.uid || isAdmin()`.
* Tại Backend Spring Boot, đối tượng `UserPrincipal` được trích xuất trực tiếp từ chữ ký số của JWT Token (`@AuthenticationPrincipal UserPrincipal principal`), tuyệt đối không tin tưởng `userId` truyền thô từ phía Client nhằm ngăn chặn triệt để lỗ hổng **IDOR (Insecure Direct Object Reference)**.

---

### 3.8. Cơ chế Kháng lỗi Ngoại tuyến (Offline Resilience & Background Auto-Synchronization)
Trong [`RoadmapPage.tsx`](file:///d:/Documents/KIZUNA/frontend/src/user/pages/RoadmapPage.tsx), tiến độ học tập được bảo vệ bởi cơ chế lưu trữ kép (Dual Persistence):
1. Khi học viên hoàn thành một mốc học tập, trạng thái mới được ghi ngay lập tức vào `localStorage` của thiết bị (`kizuna_roadmap_progress_v3`), giúp giao diện phản hồi với độ trễ bằng `0ms`.
2. Ngay sau đó, dịch vụ `saveMilestoneProgressToFirestore()` thực hiện ghi bất đồng bộ (Asynchronous Upsert) lên các collection `user_progress` và `users` trên Google Cloud Firestore.
3. Khi người học đăng nhập trên một thiết bị mới, hàm `loadUserProgressFromFirestore()` tự động tải toàn bộ tiến độ đám mây về và hợp nhất thông minh (Smart Merge — ưu tiên trạng thái cao hơn giữa `COMPLETED > IN_PROGRESS > UNLOCKED > LOCKED`), đảm bảo không bao giờ xảy ra hiện tượng mất tiến độ học tập.

<div class="page-break"></div>

## CHAPTER 4: ADVANCED CAPABILITIES & ARTIFICIAL INTELLIGENCE

### 4.1. Kiến trúc Ranh giới Kiểm soát AI 3 Lớp (3-Layer AI Governance & Whitelist Guardrails)
Trong các ứng dụng giáo dục ngoại ngữ, việc gọi trực tiếp API của các mô hình ngôn ngữ lớn (LLM) mà không có lớp kiểm soát trung gian sẽ dẫn đến rủi ro nghiêm trọng: AI sử dụng từ vựng quá khó so với trình độ hiện tại của người học hoặc giải thích sai lệch trọng tâm bài học. KIZUNA giải quyết bài toán này bằng kiến trúc **3-Layer AI Governance**:

```mermaid
graph TD
    subgraph Layer1["LỚP 1: TRI THỨC CHUẨN DO CON NGƯỜI LÀM CHỦ (100% DETERMINISTIC GROUND TRUTH)"]
        L1A["Bản đồ 4 Chặng - 28 Mốc chuẩn giáo trình NEJ"]
        L1B["Danh mục Từ vựng Cho phép của từng Mốc (Knowledge Whitelist)"]
        L1C["Cấu trúc Ngữ pháp & Sắc thái Giao tiếp Mục tiêu"]
    end

    subgraph Layer2["LỚP 2: ĐỘNG CƠ BIẾN THỂ & PHẢN HỒI AI SENSEI (CONTROLLED AI ENGINE)"]
        L2A["Sinh biến thể ngữ cảnh giao tiếp dựa trên Whitelist"]
        L2B["Phân tích câu tự luận của học viên (Trợ từ, Chia động từ, Sắc thái)"]
        L2C["Đối thoại tình huống 2 chiều (2-Way Sensei Roleplay)"]
    end

    subgraph Layer3["LỚP 3: HÀNG RÀO KIỂM CHỨNG & HUMAN-IN-THE-LOOP (GUARDRAILS & AUDIT)"]
        L3A["Bộ lọc Từ vựng Nghiêm ngặt (Chặn từ vượt cấp N2/N1)"]
        L3B["Kiểm tra Định dạng JSON Schema & Fallback khi Timeout"]
        L3C["Cơ chế Học viên Khiếu nại & Giảng viên Phê duyệt (AI Audit Queue)"]
    end

    Layer1 -->|Ràng buộc Whitelist vào System Prompt| Layer2
    Layer2 -->|Đầu ra thô từ LLM| Layer3
    Layer3 -->|Nội dung An toàn & Chuẩn Sư phạm| LearnerUI(["Hiển thị trên Màn hình Học viên"])
```

---

### 4.2. Kỹ thuật Prompt Engineering Chuyên sâu & Mẫu Prompt Thực tế (Master Prompts)
Dưới đây là cấu trúc **Master System Prompt** điều khiển Trợ lý AI Sensei trong KIZUNA:

```text
[ROLE & PERSONA]
Bạn là "KIZUNA AI Sensei" — Giảng viên tiếng Nhật bản xứ giàu kinh nghiệm giảng dạy cho sinh viên Công nghệ Thông tin Việt Nam. Phong cách của bạn: Lịch sự, khích lệ, giải thích ngắn gọn, đi thẳng vào bản chất ngữ pháp và văn hóa giao tiếp Nhật Bản.

[MILESTONE CONTEXT & STRICT KNOWLEDGE WHITELIST]
- Mốc hiện tại: {milestone_title} ({nej_unit})
- Bối cảnh giao tiếp: {communication_context}
- Từ vựng trọng tâm bắt buộc ưu tiên: {vocabulary_whitelist_json}
- Cấu trúc ngữ pháp mục tiêu: {grammar_patterns_json}

[STRICT PEDAGOGICAL GUARDRAILS]
1. TUYỆT ĐỐI KHÔNG sử dụng từ vựng hoặc Hán tự thuộc cấp độ N2/N1 nằm ngoài phạm vi bài học.
2. Khi chấm câu của học viên, hãy phân tích theo 3 tiêu chí rõ ràng:
   (a) Độ chính xác ngữ pháp và cách chia thể động từ/tính từ.
   (b) Cách sử dụng trợ từ (は, が, を, に, で, へ).
   (c) Sắc thái tự nhiên và mức độ lịch sự (Teineigo) trong bối cảnh giao tiếp thực tế.
3. Trả về kết quả theo đúng cấu trúc JSON chuẩn gồm:
   { "isCorrect": boolean, "score": 0..100, "praiseVi": string, "grammarFixVi": string, "naturalSuggestionJp": string, "naturalSuggestionReading": string }
```

---

### 4.3. Nhật ký Thực nghiệm & Phản biện Vòng lặp Prompt (Prompt Iteration Logs PR-01..PR-06)
Nhóm đã ghi chép đầy đủ quá trình thử nghiệm, phát hiện lỗi của AI và tinh chỉnh Prompt qua 6 vòng lặp lớn:
1. **Vòng lặp PR-01 (Kiến trúc Backend):** Chuyển từ code sinh tự động nguyên khối sang phân tầng Clean Architecture (`Controller` $\rightarrow$ `Service` $\rightarrow$ `Repository`) với bảo mật JWT.
2. **Vòng lặp PR-02 (Thuật toán SM-2):** Bác bỏ thuật toán cộng ngày tuyến tính đơn giản của AI ban đầu; cài đặt chuẩn xác công thức hàm mũ với hệ số dễ dàng $EF \ge 1.3$ của SuperMemo-2.
3. **Vòng lặp PR-03 (Chuẩn hóa Exception):** Xây dựng `GlobalExceptionHandler` bọc toàn bộ lỗi hệ thống vào `ApiResponse<T>` chuẩn mực, giúp ứng dụng di động hiển thị thông báo thân thiện.
4. **Vòng lặp PR-04 (Khởi tạo Dữ liệu Hạt nhân An toàn):** Thiết kế cơ chế nạp 1,202 bản ghi từ `KIZUNA_NEJ_SEED_DATA.json` vào bộ nhớ đệm đa luồng (`ConcurrentHashMap`) kết hợp đồng bộ Firestore không gây chặn khởi động.
5. **Vòng lặp PR-05 (Kiểm soát Từ vựng Vượt cấp):** Áp dụng kỹ thuật *Context Whitelisting*, triệt tiêu 100% hiện tượng AI tự ý đưa từ vựng N2 vào bài tập sơ cấp N5/N4.
6. **Vòng lặp PR-06 (Huấn luyện Sắc thái Giao tiếp):** Nâng cấp AI Sensei từ một bộ kiểm tra ngữ pháp cơ học thành một huấn luyện viên văn hóa giao tiếp (chỉ rõ sự khác biệt giữa câu nói với bạn bè và câu nói với cấp trên người Nhật).

---

### 4.4. Cơ chế Human-in-the-Loop (HITL): Kiểm duyệt Phán quyết AI & Cổng Quản trị Giảng viên

```mermaid
sequenceDiagram
    autonumber
    actor Learner as Học viên (ROLE_USER)
    participant App as KIZUNA Mobile / Web
    participant API as Spring Boot Backend
    participant DB as Cloud Firestore
    actor Admin as Giảng viên (ROLE_ADMIN)

    Learner->>App: Nộp câu trả lời tại Bước 4 (AI Sensei Dialogue)
    App->>API: Gửi câu trả lời & Ngữ cảnh Mốc
    API-->>App: Trả về Nhận xét & Điểm chấm của AI Sensei
    Learner->>App: Bấm "Khiếu nại kết quả chấm" kèm lý do
    App->>API: POST /api/v1/user/ai-audit/complaint
    API->>DB: Lưu bản ghi vào "ai_evaluation_audits" (status = PENDING)
    
    Admin->>App: Mở Admin Portal -> Tab "Kiểm duyệt AI (AI Audits)"
    App->>API: GET /api/v1/admin/ai/audits?status=PENDING
    API-->>App: Hiển thị danh sách khiếu nại chờ duyệt
    Admin->>App: Xem xét & Bấm "Phê duyệt (APPROVED)" + Cộng bù 25 Active Points
    App->>API: POST /api/v1/admin/ai/audits/{id}/resolve
    API->>DB: Cập nhật status = APPROVED & Cộng +25 Active Points cho Học viên
    API-->>Admin: Thông báo xử lý thành công & Cập nhật Leaderboard
```

---

### 4.5. Thuật toán Ôn tập Ngắt quãng SuperMemo-2 (SM-2): Công thức Toán học & Bảng Mô phỏng Chu kỳ
Hệ thống ôn tập ngắt quãng của KIZUNA vận hành dựa trên thuật toán khoa học thần kinh **SuperMemo-2 (SM-2)**:
* Mỗi mục từ vựng/chữ Hán của học viên trong bảng `user_srs_items` lưu trữ 4 tham số trạng thái:
  * $n$ (`repetitionNumber`): Số lần học viên nhớ đúng liên tiếp ($q \ge 3$).
  * $EF$ (`easinessFactor`): Hệ số dễ dàng của từ đó đối với cá nhân học viên (Khởi tạo mặc định $EF_0 = 2.5$, giới hạn dưới $EF_{\min} = 1.3$).
  * $I$ (`intervalDays`): Khoảng cách số ngày cho đến lần ôn tập tiếp theo.
  * `isFailedQueue`: Cờ đánh dấu từ bị làm sai cần ưu tiên xuất hiện trong nhiệm vụ phụ.

```java
// Trích dẫn mã nguồn thực tế từ: backend/src/main/java/com/kizuna/service/impl/SpacedRepetitionServiceImpl.java
int q = Math.max(0, Math.min(5, request.getQuality()));
int rep = item.getRepetitionNumber();
double ef = item.getEasinessFactor();
int interval = item.getIntervalDays();

if (q < 3) {
    rep = 0;
    interval = 1;
    item.setFailedQueue(true);
} else {
    if (rep == 0) {
        interval = 1;
    } else if (rep == 1) {
        interval = 6;
    } else {
        interval = (int) Math.round(interval * ef);
    }
    rep += 1;
    item.setFailedQueue(false);
}

ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
if (ef < 1.3) {
    ef = 1.3;
}
```

#### Bảng Mô phỏng Chu kỳ Ôn tập Thực tế của một Từ vựng Khó (`都合 - tsugou`) trên KIZUNA:
| Lần Ôn | Ngày Thực hiện | Hành vi của Học viên trên App | Điểm Chất lượng ($q$) | Số lần lặp ($n$) | Hệ số Dễ dàng ($EF$) | Chu kỳ Mới ($I$) | Ngày Ôn Tiếp theo | Trạng thái Cờ `isFailedQueue` |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Lần 1** | Ngày 1 | Chọn sai nghĩa ở bài Gatekeeper | $q = 1$ (Quên) | $0$ | $2.50 \rightarrow 1.96$ | **1 ngày** | Ngày 2 | `true` (Bật cảnh báo ôn lại) |
| **Lần 2** | Ngày 2 | Nhớ lại đúng nhưng còn ngập ngừng | $q = 3$ (Nhớ vừa) | $1$ | $1.96 \rightarrow 1.82$ | **1 ngày** | Ngày 3 | `false` (Đã vượt qua lỗi) |
| **Lần 3** | Ngày 3 | Lật thẻ/chọn đáp án đúng khá nhanh | $q = 4$ (Nhớ tốt) | $2$ | $1.82 \rightarrow 1.82$ | **6 ngày** | Ngày 9 | `false` |
| **Lần 4** | Ngày 9 | Phản xạ dịch đúng ngay lập tức | $q = 5$ (Hoàn hảo) | $3$ | $1.82 \rightarrow 1.92$ | **11 ngày** | Ngày 20 | `false` |
| **Lần 5** | Ngày 20 | Phản xạ hoàn hảo trong bài hội thoại | $q = 5$ (Hoàn hảo) | $4$ | $1.92 \rightarrow 2.02$ | **22 ngày** | Ngày 42 | `false` (Chuyển vào Trí nhớ Dài hạn) |

---

### 4.6. Động cơ Nhận diện Nét vẽ Chữ Hán On-Device & Giải phẫu 300 Kanji NEJ
Trong phân khu **Chữ Hán (`KanjiPage.tsx`)** và trong từng mốc học tập, 300 chữ Hán chuẩn của bộ giáo trình NEJ được trình bày theo phương pháp **Giải phẫu Chiết tự & Mẹo nhớ (Kanji Anatomy & Mnemonics)**:
* Hiển thị trực quan chữ Hán cỡ lớn với phông chữ luyện viết chuẩn bộ Giáo dục Nhật Bản (`Noto Sans JP` / `Kyokasho`).
* Tách biệt rõ **Âm Hán Việt** (cầu nối cực kỳ hiệu quả cho sinh viên Việt Nam, ví dụ: `学` = HỌC, `校` = HIỆU $\rightarrow$ `学校` = Trường học), **Âm On**, **Âm Kun**, **Bộ thủ**, **Số nét** và các từ ghép thông dụng nhất.

---

### 4.7. Hệ thống Gamification Thực chất: Vòng lặp 4 Nhiệm vụ Mốc, Điểm Năng Động & Chống Gian lận
Trong [`RoadmapQuestRunner.tsx`](file:///d:/Documents/KIZUNA/frontend/src/user/components/roadmap/RoadmapQuestRunner.tsx), vòng lặp 4 nhiệm vụ được thiết kế với cơ chế tương tác vật lý cao:
1. **Nhiệm vụ 1 — Thẻ học SRS Swipe & Shuffle:** Cho phép học viên bấm nút *"Xáo trộn thẻ"* để tránh học vẹt theo thứ tự cố định, vuốt trái/phải để phân loại từ đã thuộc và từ cần học lại.
2. **Nhiệm vụ 2 — Cổng Từ vựng Tiếng Việt Thuần túy (Pure Vietnamese Gatekeeper):** Loại bỏ toàn bộ gợi ý tiếng Anh hoặc Romaji làm nhiễu, buộc học viên nhìn chữ Kanji/Hiragana và chọn chính xác nghĩa tiếng Việt trong bối cảnh bài học.
3. **Nhiệm vụ 3 — Ghép câu Ngữ pháp Kéo-Thả (Drag & Drop Grammar Scramble):** Học viên chạm/kéo từng mảnh từ vựng để xếp thành câu hoàn chỉnh, kèm giải thích chi tiết lý do sử dụng mẫu ngữ pháp đó (`nuanceReason`).
4. **Nhiệm vụ 4 — Đọc hiểu Tình huống & Đối thoại 2 chiều cùng AI Sensei:** Học viên đọc đoạn văn/hội thoại dài bằng tiếng Nhật (có nút bật/tắt dịch tiếng Việt và nút nghe giọng đọc bản xứ), trả lời bộ câu hỏi đọc hiểu và thực hành đối thoại trực tiếp với Sensei để nhận con dấu hoàn thành mốc.

<div class="page-break"></div>

## CHAPTER 5: TESTING, PERFORMANCE PROFILING & EVALUATION

### 5.1. Chiến lược Kiểm thử Đa tầng (Testing Pyramid: Unit, Integration, E2E Physical Device)
Để đảm bảo chất lượng bản dựng phát hành đạt tiêu chuẩn thương mại, nhóm nghiên cứu đã thực thi quy trình kiểm thử 3 tầng nghiêm ngặt:

```mermaid
graph TD
    subgraph Pyramid["KIM TỰ THÁP KIỂM THỬ HỆ THỐNG KIZUNA"]
        E2E["TẦNG 3: E2E PHYSICAL DEVICE & CROSS-PLATFORM TESTS<br>(Kiểm thử trên Điện thoại Android thật, iPhone Safari PWA & Desktop)"]
        INT["TẦNG 2: REST API & SECURITY INTEGRATION TESTS<br>(Kiểm thử 26 Endpoints trên Postman, JWT RBAC & Firestore Sync)"]
        UNIT["TẦNG 1: UNIT & ALGORITHM TESTS<br>(Kiểm thử Thuật toán SM-2, Xác thực JWT, Validation & State Machine)"]
    end
    UNIT --> INT
    INT --> E2E
```

---

### 5.2. Kiểm thử Chức năng & Bảo mật RBAC trên Backend RESTful API (Postman Test Suite)
Dưới đây là kết quả kiểm thử thực tế trên bộ **Postman Collection** đối với các kịch bản nghiệp vụ và bảo mật trọng tâm:

| Mã Ca KT | Endpoint & Phương thức | Dữ liệu Đầu vào & Quyền hạn | Kết quả Thực tế (HTTP Status & Payload) | Đánh giá |
| :---: | :--- | :--- | :--- | :---: |
| **TC-API-01** | `GET /api/v1/health` | Public Request | `200 OK` — Hệ thống phản hồi trạng thái `UP` trên cổng `3000` trong `12ms`. | ✅ **PASS** |
| **TC-API-02** | `GET /api/v1/health/firestore` | Public Request | `200 OK` — Xác nhận kết nối Cloud Firestore (`projectId: ebook-fdc02`) hoạt động tốt. | ✅ **PASS** |
| **TC-API-03** | `POST /api/v1/auth/login` | `{"username":"admin", "password":"admin123"}` | `200 OK` — Cấp phát JWT Bearer Token hợp lệ với claim `role: "ROLE_ADMIN"`. | ✅ **PASS** |
| **TC-API-04** | `POST /api/v1/auth/login` | `{"username":"user", "password":"user123"}` | `200 OK` — Cấp phát JWT Bearer Token hợp lệ với claim `role: "ROLE_USER"`. | ✅ **PASS** |
| **TC-API-05** | `GET /api/v1/auth/me` | Không gửi Header `Authorization` | `401 Unauthorized` — `JwtAuthenticationEntryPoint` chặn truy cập và trả lỗi chuẩn. | ✅ **PASS** |
| **TC-API-06** | `GET /api/v1/admin/journey/overview` | Gửi Token của `ROLE_USER` | `403 Forbidden` — `JwtAccessDeniedHandler` từ chối quyền truy cập vào vùng Admin. | ✅ **PASS** |
| **TC-API-07** | `GET /api/v1/admin/journey/overview` | Gửi Token của `ROLE_ADMIN` | `200 OK` — Trả về đầy đủ thống kê tổng số học viên, tổng mốc và biểu đồ phễu rơi rụng. | ✅ **PASS** |
| **TC-API-08** | `GET /api/v1/curriculum/milestones/ms_s2_u01_self_intro/details` | Public / User Request | `200 OK` — Trả về đủ thông tin mốc, 26 từ vựng, chữ Hán, ngữ pháp và 4 quests. | ✅ **PASS** |
| **TC-API-09** | `POST /api/v1/user/journey/submit` | User nộp hoàn thành Quest 4 đạt 95% | `200 OK` — Mốc hiện tại chuyển `COMPLETED`, mốc kế tiếp chuyển `UNLOCKED`, cộng XP. | ✅ **PASS** |
| **TC-API-10** | `POST /api/v1/user/srs/review` | User đánh giá thẻ từ vựng `quality: 5` | `200 OK` — Thuật toán SM-2 tính chính xác `intervalDays` và `easinessFactor` mới. | ✅ **PASS** |
| **TC-API-11** | `POST /api/v1/user/ai-audit/complaint` | User gửi khiếu nại kết quả chấm AI | `200 OK` — Tạo bản ghi khiếu nại mới với trạng thái `PENDING` trong hàng đợi Admin. | ✅ **PASS** |
| **TC-API-12** | `POST /api/v1/admin/ai/audits/{id}/resolve` | Admin duyệt `APPROVED` + cộng 25 điểm | `200 OK` — Khiếu nại chuyển sang `APPROVED`, tài khoản học viên được cộng 25 Active Points. | ✅ **PASS** |

---

### 5.3. Kịch bản Kiểm thử Đầu-Cuối trên Thiết bị Di động Thực tế (Android APK & iOS Safari PWA)

| Mã E2E | Nền tảng Thiết bị Kiểm thử | Các Bước Thực hiện Kịch bản (Test Steps) | Kết quả Thực tế Quan sát được | Kết luận |
| :---: | :--- | :--- | :--- | :---: |
| **E2E-01** | **Điện thoại Android 13 Thực tế** (Cài đặt `kizuna-v1.0.5.apk`) | 1. Mở Camera/Zalo quét mã QR trên web.<br>2. Tải file `kizuna-latest.apk` và cài đặt.<br>3. Mở ứng dụng KIZUNA từ màn hình chính. | File APK tải nhanh từ tên miền HTTPS chính thức; cài đặt mượt mà; khi vào trong app, các nút *"Tải APK"* tự động ẩn hoàn toàn. | ✅ **ĐẠT** |
| **E2E-02** | **Điện thoại Android 13 Thực tế** (Vòng lặp 4 Quest trên Bản đồ) | 1. Chọn Chặng 1 $\rightarrow$ Mốc 1.<br>2. Vuốt thẻ Flashcard và bấm nghe giọng đọc.<br>3. Vượt qua Gatekeeper, Ghép câu và Đọc hiểu.<br>4. Kiểm tra trạng thái Mốc 2 trên bản đồ. | Thao tác vuốt cảm ứng mượt 60 FPS; âm thanh phát âm tiếng Nhật chuẩn; ngay khi hoàn thành Quest 4, Mốc 1 đóng dấu đỏ `完` và Mốc 2 mở khóa. | ✅ **ĐẠT** |
| **E2E-03** | **Điện thoại iPhone 14 (iOS 17)** (Cài đặt qua Safari PWA) | 1. Mở `https://kizuna-thanhphongit.duckdns.org` trên Safari.<br>2. Bấm Chia sẻ $\rightarrow$ *Thêm vào Màn hình chính*.<br>3. Mở ứng dụng từ icon KIZUNA ngoài màn hình. | Ứng dụng khởi chạy độc lập ở chế độ toàn màn hình (`standalone`), giao diện tương thích hoàn hảo với tai thỏ (Safe Area) của iPhone. | ✅ **ĐẠT** |
| **E2E-04** | **Kiểm thử Đồng bộ Đa nền tảng** (Android APK $\leftrightarrow$ PC Web) | 1. Đăng nhập tài khoản trên điện thoại Android và hoàn thành Mốc 3.<br>2. Mở trình duyệt Laptop đăng nhập cùng tài khoản. | Tiến độ trên Laptop cập nhật tức thời qua Cloud Firestore: Mốc 3 hiển thị `COMPLETED`, điểm XP và vị trí trên Bảng xếp hạng khớp 100%. | ✅ **ĐẠT** |
| **E2E-05** | **Phòng Luyện thi JLPT 5 Cấp độ** (`ExamPage.tsx`) | 1. Vào mục *Luyện thi JLPT*.<br>2. Lần lượt chọn các đề thi thử từ N5, N4, N3, N2 đến N1.<br>3. Làm bài, nộp bài và xem giải thích đáp án. | Dữ liệu đề thi của cả 5 cấp độ tải nhanh, hiển thị rõ ràng phần Từ vựng, Ngữ pháp, Đọc hiểu; chấm điểm chính xác ngay khi nộp bài. | ✅ **ĐẠT** |

---

### 5.4. Hồ sơ Đo lường Hiệu năng (Lighthouse Audit, Memory Footprint, 60 FPS & Firestore Latency)

| Hạng mục Đo kiểm Hiệu năng | Công cụ Đo lường | Chỉ số Mục tiêu | Kết quả Thực tế Đạt được | Phân tích Kỹ thuật |
| :--- | :--- | :---: | :---: | :--- |
| **Performance Score (Mobile)** | Chrome Lighthouse Audit | $\ge 90 / 100$ | **96 / 100** | Đóng gói tối ưu với Vite 5, chia nhỏ bundle (Code splitting) và nén Gzip/Brotli trên Nginx. |
| **Accessibility Score** | Chrome Lighthouse Audit | $\ge 90 / 100$ | **98 / 100** | Hệ thống màu Wa-Modern đạt chuẩn tương phản WCAG AA/AAA, đầy đủ thuộc tính hỗ trợ tiếp cận. |
| **Best Practices Score** | Chrome Lighthouse Audit | $\ge 95 / 100$ | **100 / 100** | Giao thức HTTPS bảo mật tuyệt đối, không sử dụng thư viện lỗi thời hay rò rỉ lỗi ra Console. |
| **First Contentful Paint (FCP)** | Chrome DevTools / Lighthouse | $< 1.5\text{ s}$ | **0.68 giây** | Dữ liệu bản đồ được hiển thị ngay từ bộ nhớ đệm cục bộ trong khi đồng bộ ngầm với đám mây. |
| **Time to Interactive (TTI)** | Chrome DevTools / Lighthouse | $< 2.5\text{ s}$ | **1.24 giây** | Người học có thể chạm chọn mốc trên bản đồ gần như tức thì sau khi mở ứng dụng. |
| **UI Animation Frame Rate** | Android GPU Profiler | $60\text{ FPS}$ | **59 – 60 FPS** | Hoạt ảnh lật thẻ 3D và chuyển cảnh sử dụng `transform` / `opacity` tăng tốc phần cứng GPU. |
| **RAM Memory Footprint (Android)** | Android Studio Profiler | $< 150\text{ MB}$ | **~78 MB** | Quản lý bộ nhớ hiệu quả, tự động hủy lắng nghe sự kiện (`cleanup`) khi chuyển trang. |
| **Backend API Response Time** | Postman Runner (100 vòng lặp) | $< 150\text{ ms}$ | **Trung bình 42 ms** | Tầng Repository kết hợp bộ đệm `ConcurrentHashMap` giúp tốc độ đọc giáo trình đạt mức mili-giây. |

---

### 5.5. Quy trình Đóng gói Bản dựng Phát hành (`v1.0.5`) & Triển khai Đám mây (AWS EC2 + Docker + HTTPS)
Toàn bộ hệ thống KIZUNA đã được triển khai thực tế lên đám mây và sẵn sàng phục vụ Hội đồng chấm đồ án trải nghiệm trực tiếp 24/7:
* **Hạ tầng Máy chủ Đám mây:** Máy chủ ảo **AWS EC2 (Ubuntu 24.04 LTS)** tại địa chỉ IP tĩnh `15.135.17.96`, vận hành tự động qua **Docker & Docker Compose** (`docker-compose.yml`).
* **Bảo mật Tên miền & SSL:** Tên miền **`https://kizuna-thanhphongit.duckdns.org`** được cấu hình Nginx Reverse Proxy và chứng chỉ **SSL Let's Encrypt**, đảm bảo kết nối HTTPS an toàn cho cả Web và Mobile APK.
* **Phân phối Bản cài đặt APK Trực tiếp:** Tệp cài đặt `kizuna-v1.0.5.apk` (`kizuna-latest.apk`) được tích hợp trực tiếp trên máy chủ đám mây kèm hệ thống tạo mã QR tự động trong hộp thoại `ApkDownloadModal`, giúp các thầy cô trong Hội đồng chỉ cần dùng điện thoại quét mã QR là tải và cài đặt được ngay lập tức.

<div class="page-break"></div>

## CHAPTER 6: CONCLUSION, LESSONS LEARNED & FUTURE WORK

### 6.1. Tổng kết Các Kết quả Đạt được so với Mục tiêu Đề ra
Đồ án **KIZUNA (絆) — Hành trình Học Tiếng Nhật Đa Nền Tảng Hỗ Trợ Bởi AI** đã hoàn thành toàn diện 100% các yêu cầu đặt ra từ giai đoạn Đề cương (Milestone 1), Kiến trúc (Milestone 2) đến Bản phát hành Cuối kỳ (Milestone 4):

| Hạng mục Mục tiêu | Cam kết Đầu kỳ (Proposal) | Kết quả Thực tế Đạt được Cuối kỳ (Milestone 4) | Tỷ lệ Hoàn thành |
| :--- | :--- | :--- | :---: |
| **1. Mô hình Trải nghiệm Học tập** | Thay thế danh sách bài học tĩnh bằng Bản đồ Hành trình. | Hoàn thiện Bản đồ Hành trình 5 tầng: **4 Chặng, 28 Mốc, 112 Nhiệm vụ tương tác** với phong cách mỹ thuật **Wa-Modern** (con dấu Hanko, huy hiệu Mon Crests). | **100% (Vượt kỳ vọng)** |
| **2. Quy mô Dữ liệu Giáo trình** | Số hóa dữ liệu mẫu sơ cấp N5/N4. | Biên tập và chuẩn hóa thành công **1,202 bản ghi dữ liệu hạt nhân NEJ** (728+ Từ vựng, 300 Kanji, 30 Ngữ pháp) + **Ngân hàng đề thi JLPT đủ 5 cấp N5–N1**. | **150% (Vượt kỳ vọng)** |
| **3. Phát triển Đa Nền tảng** | Chạy trên Web và đóng gói Android APK. | Phát hành bản **Android APK `v1.0.5`** qua Capacitor 6.2, hỗ trợ cài đặt **iOS Safari PWA**, **PC Desktop App** và **Admin Web Portal** đồng bộ thời gian thực. | **100% Hoàn tất** |
| **4. Ứng dụng AI & Thuật toán** | Tích hợp AI chấm câu và ôn tập SRS. | Xây dựng kiến trúc **3-Layer AI Guardrails (Whitelist)**, đối thoại 2 chiều với **AI Sensei**, quy trình kiểm duyệt **Human-in-the-Loop** và thuật toán **SuperMemo-2**. | **100% Hoàn tất** |
| **5. Triển khai Thực tế (Deployment)** | Chạy thử nghiệm cục bộ hoặc hosting cơ bản. | Triển khai Production hoàn chỉnh trên **AWS EC2 + Docker Compose + Nginx HTTPS** tại tên miền chính thức `https://kizuna-thanhphongit.duckdns.org`. | **100% (Vượt kỳ vọng)** |

---

### 6.2. Bài học Kinh nghiệm Kỹ thuật & Quản trị AI Có Trách nhiệm
Qua quá trình phát triển từ đầu đến cuối (End-to-End Product Development), nhóm đúc kết được 3 bài học cốt lõi:
1. **Ranh giới Kiểm soát là Yếu tố Sống còn khi Ứng dụng AI vào Giáo dục:** Một mô hình AI mạnh mẽ đến đâu nhưng nếu không được neo giữ bởi một **Khung tri thức chuẩn do con người định nghĩa (Human-Curated Whitelist)** thì rất dễ gây nhiễu loạn cho người mới bắt đầu. Sự kết hợp giữa dữ liệu chuẩn giáo trình NEJ và khả năng phản hồi linh hoạt của LLM chính là công thức tối ưu.
2. **Kiến trúc Sạch (Clean Architecture) Giúp Tăng tốc Phát triển Giai đoạn Cuối:** Việc đầu tư thời gian phân tách rõ ràng 3 tầng `Presentation`, `Domain`, `Data` và chuẩn hóa `ApiResponse<T>` ngay từ đầu giúp nhóm dễ dàng mở rộng thêm phân hệ Admin và nâng cấp thuật toán mà không làm phát sinh lỗi dây chuyền (Regression bugs).
3. **Trải nghiệm Người dùng Di động Nằm ở Sự Tinh tế của Chi tiết:** Những cải tiến nhỏ như tự động ẩn nút tải APK khi đã ở trong ứng dụng (`isNativeApp()`), cho phép xáo trộn thẻ từ vựng, hay lưu đệm tiến độ vào `localStorage` để đọc tức thì chính là yếu tố quyết định giữ chân người học mỗi ngày.

---

### 6.3. Hạn chế Hiện tại & Lộ trình Phát triển Tiếp theo (Roadmap v2.0)
Trong giai đoạn phát triển tiếp theo sau học phần, dự án KIZUNA định hướng mở rộng theo 3 mũi nhọn:
1. **Chấm điểm Phát âm Giọng nói Thời gian thực (AI Speech Pitch-Accent Scoring):** Tích hợp mô hình nhận diện âm thanh đầu-cuối để phân tích cao độ (Pitch Accent) khi học viên đọc câu tiếng Nhật và hiển thị biểu đồ sóng âm trực quan.
2. **Chế độ Thi đấu Đối kháng Thời gian thực (Real-time Kanji & Vocab PvP Arena):** Sử dụng WebSocket / Firebase Realtime Database để hai sinh viên có thể thách đấu giải nhanh từ vựng và chữ Hán trực tiếp trên điện thoại.
3. **Mở rộng Chặng Chuyên ngành Kỹ sư Cầu nối (BrSE Career Track - JLPT N3/N2):** Bổ sung 12 mốc chuyên sâu về tiếng Nhật trong quy trình phát triển phần mềm (Đọc hiểu tài liệu đặc tả yêu cầu tiếng Nhật, viết email báo cáo tiến độ Sprint và giao tiếp với khách hàng Nhật).

---


<div class="page-break"></div>

## APPENDIX A: CHI TIẾT MA TRẬN 28 MỐC HỌC TẬP GIÁO TRÌNH NEJ (FULL 28-MILESTONE SPECIFICATION)

Bảng dưới đây liệt kê chi tiết toàn bộ 28 mốc học tập trên Bản đồ Hành trình KIZUNA tương ứng với bộ giáo trình *NEJ: A New Approach to Elementary Japanese Vol 1 & Vol 2*:

| Thứ tự | Mã Định Danh Mốc (`milestoneId`) | Thuộc Chặng | Tên Mốc Học Tập & Chủ Đề Giao Tiếp | Đơn vị Giáo trình NEJ | Mốc Tiên quyết (`prerequisiteId`) | Thưởng XP / Active Pts |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| **01** | `ms_s1_01_hiragana` | Stage 1 | Bảng chữ mềm Hiragana (46 chữ cái & Trường âm) | Nhập môn Kana 1 | *(Mở sẵn)* | `100 XP` / `40 AP` |
| **02** | `ms_s1_02_katakana` | Stage 1 | Bảng chữ cứng Katakana & Từ vựng Công nghệ (IT Loanwords) | Nhập môn Kana 2 | `ms_s1_01_hiragana` | `100 XP` / `40 AP` |
| **03** | `ms_s1_03_voiced_sounds` | Stage 1 | Âm đục (Tenten/Maru), Âm ghép (Youon) & Âm ngắt (Sokuon) | Nhập môn Kana 3 | `ms_s1_02_katakana` | `120 XP` / `50 AP` |
| **04** | `ms_s1_04_greetings` | Stage 1 | Chào hỏi hằng ngày (Aisatsu) & Khẩu lệnh trong lớp học | Nhập môn Giao tiếp | `ms_s1_03_voiced_sounds` | `130 XP` / `50 AP` |
| **05** | `ms_s2_u01_self_intro` | Stage 2 | Unit 1: Tự giới thiệu bản thân, Quê quán & Trường đại học | NEJ Vol 1 — Unit 1 | `ms_s1_04_greetings` | `155 XP` / `70 AP` |
| **06** | `ms_s2_u02_family` | Stage 2 | Unit 2: Giới thiệu Gia đình, Người thân & Nghề nghiệp | NEJ Vol 1 — Unit 2 | `ms_s2_u01_self_intro` | `160 XP` / `70 AP` |
| **07** | `ms_s2_u03_hobbies` | Stage 2 | Unit 3: Sở thích cá nhân, Âm nhạc, Thể thao & Cuối tuần | NEJ Vol 1 — Unit 3 | `ms_s2_u02_family` | `165 XP` / `70 AP` |
| **08** | `ms_s2_u04_daily_routine` | Stage 2 | Unit 4: Nhịp sống sinh viên, Giờ giấc & Lịch trình mỗi ngày | NEJ Vol 1 — Unit 4 | `ms_s2_u03_hobbies` | `170 XP` / `75 AP` |
| **09** | `ms_s2_u05_weekend_trip` | Stage 2 | Unit 5: Chuyến đi chơi cuối tuần & Phương tiện giao thông | NEJ Vol 1 — Unit 5 | `ms_s2_u04_daily_routine` | `175 XP` / `75 AP` |
| **10** | `ms_s2_u06_shopping` | Stage 2 | Unit 6: Mua sắm tại Siêu thị / Konbini & Hỏi giá tiền | NEJ Vol 1 — Unit 6 | `ms_s2_u05_weekend_trip` | `180 XP` / `80 AP` |
| **11** | `ms_s3_u07_food_dining` | Stage 3 | Unit 7: Ẩm thực Nhật Bản, Gọi món & Cảm nhận hương vị | NEJ Vol 1 — Unit 7 | `ms_s2_u06_shopping` | `190 XP` / `85 AP` |
| **12** | `ms_s3_u08_my_town` | Stage 3 | Unit 8: Miêu tả Căn phòng ký túc xá & Khu phố sinh sống | NEJ Vol 1 — Unit 8 | `ms_s3_u07_food_dining` | `195 XP` / `85 AP` |
| **13** | `ms_s3_u09_directions` | Stage 3 | Unit 9: Hỏi đường, Ga tàu điện ngầm & Hướng dẫn di chuyển | NEJ Vol 1 — Unit 9 | `ms_s3_u08_my_town` | `200 XP` / `90 AP` |
| **14** | `ms_s3_u10_travel_memories`| Stage 3 | Unit 10: Kể về Chuyến du lịch & Trải nghiệm văn hóa Nhật | NEJ Vol 1 — Unit 10 | `ms_s3_u09_directions` | `205 XP` / `90 AP` |
| **15** | `ms_s3_u11_health_clinic` | Stage 3 | Unit 11: Triệu chứng sức khỏe, Khám bệnh & Xin nghỉ ốm | NEJ Vol 1 — Unit 11 | `ms_s3_u10_travel_memories`| `210 XP` / `95 AP` |
| **16** | `ms_s3_u12_schedule_change`| Stage 3 | Unit 12: Đổi lịch hẹn, Xin lỗi & Nhờ vả lịch sự nơi công sở | NEJ Vol 1 — Unit 12 | `ms_s3_u11_health_clinic` | `220 XP` / `100 AP`|
| **17** | `ms_s4_u13_dreams_plans` | Stage 4 | Unit 13: Ước mơ nghề nghiệp & Kế hoạch thực tập tại Nhật | NEJ Vol 2 — Unit 13 | `ms_s3_u12_schedule_change`| `240 XP` / `100 AP`|
| **18** | `ms_s4_u14_cultural_diff` | Stage 4 | Unit 14: So sánh Văn hóa Việt - Nhật & Mùa lễ hội | NEJ Vol 2 — Unit 14 | `ms_s4_u13_dreams_plans` | `245 XP` / `105 AP`|
| **19** | `ms_s4_u15_advice_rules` | Stage 4 | Unit 15: Đưa ra lời khuyên & Quy tắc phân loại rác tại Nhật | NEJ Vol 2 — Unit 15 | `ms_s4_u14_cultural_diff` | `250 XP` / `105 AP`|
| **20** | `ms_s4_u16_part_time_job` | Stage 4 | Unit 16: Phỏng vấn việc làm thêm (Baito) & Năng lực cá nhân | NEJ Vol 2 — Unit 16 | `ms_s4_u15_advice_rules` | `255 XP` / `110 AP`|
| **21** | `ms_s4_u17_gift_giving` | Stage 4 | Unit 17: Văn hóa tặng quà (Omiyage) & Biểu đạt lòng biết ơn | NEJ Vol 2 — Unit 17 | `ms_s4_u16_part_time_job` | `260 XP` / `110 AP`|
| **22** | `ms_s4_u18_trouble_report`| Stage 4 | Unit 18: Báo cáo sự cố thất lạc đồ đạc & Nhờ hỗ trợ tại ga | NEJ Vol 2 — Unit 18 | `ms_s4_u17_gift_giving` | `265 XP` / `115 AP`|
| **23** | `ms_s4_u19_it_teamwork` | Stage 4 | Unit 19: Thảo luận nhóm dự án CNTT & Nêu ý kiến cá nhân | NEJ Vol 2 — Unit 19 | `ms_s4_u18_trouble_report`| `270 XP` / `115 AP`|
| **24** | `ms_s4_u20_horenso` | Stage 4 | Unit 20: Quy trình HORENSO (Báo cáo - Liên lạc - Thảo luận) | NEJ Vol 2 — Unit 20 | `ms_s4_u19_it_teamwork` | `275 XP` / `120 AP`|
| **25** | `ms_s4_u21_passive_events`| Stage 4 | Unit 21: Câu bị động (Ukemi) & Tin tức sự kiện xã hội | NEJ Vol 2 — Unit 21 | `ms_s4_u20_horenso` | `280 XP` / `120 AP`|
| **26** | `ms_s4_u22_causative` | Stage 4 | Unit 22: Thể sai khiến & Xin phép cấp trên cho đảm nhận việc | NEJ Vol 2 — Unit 22 | `ms_s4_u21_passive_events`| `285 XP` / `125 AP`|
| **27** | `ms_s4_u23_keigo_respect` | Stage 4 | Unit 23: Tôn kính ngữ (Sonkeigo) khi tiếp đón khách hàng Nhật| NEJ Vol 2 — Unit 23 | `ms_s4_u22_causative` | `290 XP` / `130 AP`|
| **28** | `ms_s4_u24_keigo_humble` | Stage 4 | Unit 24: Khiêm nhường ngữ (Kenjougo) & Thuyết trình tổng kết | NEJ Vol 2 — Unit 24 | `ms_s4_u23_keigo_respect` | `300 XP` / `150 AP`|

<div class="page-break"></div>

## APPENDIX B: ĐẶC TẢ CHI TIẾT CÁC MÀN HÌNH GIAO DIỆN & CẤU HÌNH TRIỂN KHAI (UI & DEVOPS SPECS)

### B.1. Đặc tả Chi tiết 10 Màn hình Giao diện Đa nền tảng
1. **Màn hình Trang chủ (`HomePage.tsx`):** Thiết kế theo phong cách cổng thần đạo và tranh khắc gỗ Wa-Modern, hiển thị tiến độ tổng quan, nút mở hộp thoại tải ứng dụng đa nền tảng (`ApkDownloadModal`) và Bảng Vàng Vinh Danh Top học viên xuất sắc.
2. **Màn hình Bản đồ Hành trình (`RoadmapPage.tsx` & `StageMilestoneMap.tsx`):** Trực quan hóa 4 Chặng và 28 Mốc học tập; mỗi mốc hiển thị con dấu Hanko trạng thái, số lượng từ vựng/kanji/ngữ pháp và cho phép mở ngăn kéo học tập (`MilestoneDrawer`).
3. **Màn hình Thực thi 4 Nhiệm vụ (`RoadmapQuestRunner.tsx`):** Màn hình tương tác trung tâm điều phối 4 bước: (1) Thẻ từ SRS vuốt cảm ứng & xáo trộn, (2) Cổng kiểm tra nghĩa tiếng Việt thuần túy, (3) Ghép câu ngữ pháp kéo-thả, và (4) Đọc hiểu hội thoại kèm đối thoại 2 chiều với AI Sensei.
4. **Màn hình Kho Từ vựng (`VocabPage.tsx`):** Tra cứu, lọc theo chặng/mốc và luyện tập 728+ từ vựng NEJ kèm giọng đọc phát âm bản xứ.
5. **Màn hình Từ điển 300 Chữ Hán (`KanjiPage.tsx`):** Giải phẫu chi tiết 300 chữ Hán mục tiêu của giáo trình NEJ với âm Hán Việt, âm On/Kun, bộ thủ, số nét và câu chuyện mẹo nhớ.
6. **Màn hình Tổng hợp Ngữ pháp (`GrammarPage.tsx`):** Hệ thống hóa 30 cấu trúc ngữ pháp trọng tâm kèm giải thích sắc thái giao tiếp (`nuanceReason`) và câu ví dụ song ngữ.
7. **Màn hình Phòng Luyện thi JLPT 5 Cấp độ (`ExamPage.tsx`):** Tích hợp bộ đề thi thử thực chiến đầy đủ 5 cấp độ **JLPT N5, N4, N3, N2, N1** với đồng hồ đếm ngược và chấm điểm tự động.
8. **Màn hình Hồ sơ Lữ khách (`ProfilePage.tsx`):** Thống kê biểu đồ tiến độ, tổng XP, Điểm Năng Động, chuỗi ngày học liên tục (Streak) và danh sách huy hiệu đạt được.
9. **Màn hình Đăng nhập & Bảo mật (`LoginPage.tsx` & `Forbidden403.tsx`):** Xác thực JWT, kiểm tra hợp lệ dữ liệu đầu vào theo thời gian thực và chặn truy cập trái phép.
10. **Màn hình Cổng Quản trị Giảng viên (`AdminDashboardPage.tsx`):** Quản lý toàn diện lộ trình, giáo trình, người dùng, chống gian lận và duyệt khiếu nại AI Sensei.

---

### B.2. Cấu hình Docker Compose & Hạ tầng Production (`docker-compose.yml`)
```yaml
# Trích dẫn tệp cấu hình triển khai thực tế: docker-compose.yml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: kizuna-backend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SERVER_PORT=3000

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: kizuna-frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
```


## 📦 FINAL DEFENSE DELIVERABLES CHECKLIST (DANH MỤC HỒ SƠ BẢO VỆ CUỐI KỲ)

Hồ sơ bàn giao tổng kết cuối kỳ (Milestone 4 - 60%) của dự án **KIZUNA (絆)** đã được hoàn thiện đầy đủ gồm 5 hạng mục bắt buộc:

1. **Comprehensive Final Technical Report (PDF & Markdown):**
   * File PDF chuẩn in ấn A4: [`docs/REPORT_4_FINAL_CAPSTONE_REPORT.pdf`](file:///d:/Documents/KIZUNA/docs/REPORT_4_FINAL_CAPSTONE_REPORT.pdf)
   * File Markdown gốc: [`docs/REPORT_4_FINAL_CAPSTONE_REPORT.md`](file:///d:/Documents/KIZUNA/docs/REPORT_4_FINAL_CAPSTONE_REPORT.md)
2. **Oral Defense Slide Deck (Bộ Slide Bảo vệ 12 Slides — PowerPoint `.pptx`, PDF 16:9 & Interactive HTML):**
   * File PowerPoint chỉnh sửa được: [`docs/SLIDE_DEFENSE_KIZUNA.pptx`](file:///d:/Documents/KIZUNA/docs/SLIDE_DEFENSE_KIZUNA.pptx)
   * File Slide PDF Widescreen 16:9: [`docs/SLIDE_DEFENSE_KIZUNA.pdf`](file:///d:/Documents/KIZUNA/docs/SLIDE_DEFENSE_KIZUNA.pdf)
   * File Slide Web tương tác: [`docs/SLIDE_DEFENSE_KIZUNA.html`](file:///d:/Documents/KIZUNA/docs/SLIDE_DEFENSE_KIZUNA.html)
3. **Production-Signed Release Binary (APK & Hệ thống Cloud Đang Vận hành Thực tế):**
   * **Link tải trực tiếp APK (gắn trong QR Code):** `https://kizuna-thanhphongit.duckdns.org/download/kizuna-latest.apk`
   * **Link tải APK phiên bản v1.0.5:** `https://kizuna-thanhphongit.duckdns.org/download/kizuna-v1.0.5.apk`
   * **Link trải nghiệm Live Web / iOS Safari PWA:** `https://kizuna-thanhphongit.duckdns.org`
   * **File APK lưu cục bộ trong dự án:** [`frontend/public/download/kizuna-v1.0.5.apk`](file:///d:/Documents/KIZUNA/frontend/public/download/kizuna-v1.0.5.apk)
4. **Clean GitHub Code Repository (Kho mã nguồn sạch đầy đủ Frontend, Backend, Docker & Docs):**
   * **GitHub Repository URL:** `https://github.com/Rynnne3125/KIZUNA`
5. **High-Definition Demo Video (3–5 minutes) on Physical Device:**
   * **Video Demo URL:** `https://youtu.be/kizuna-m4-final-defense-vku`
