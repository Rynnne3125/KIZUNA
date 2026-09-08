# 🤖 NHẬT KÝ VẬN DỤNG PROMPT ENGINEERING & MINH CHỨNG SỬ DỤNG AI
## DỰ ÁN: KIZUNA (絆) - HỌC PHẦN CS2028: AI PRODUCT DEVELOPMENT: END TO END
**Sinh viên thực hiện:** Nhóm Dự án KIZUNA  
**Minh chứng phục vụ đánh giá:** CLO1, CLO2 (30%), CLO3 (35%), CLO4 (35%) - Mức A Rubric  
**Liên kết chương trình học:** Chương 1 (AI Fundamentals), Chương 2 (Prompt Engineering), Chương 3 (PRD & Requirements)  

---

## 1. TỔNG QUAN CHIẾN LƯỢC SỬ DỤNG AI TRONG DỰ ÁN (MỤC 1.1 & 1.2)

Dự án áp dụng mô hình **AI-Assisted kết hợp AI-Native**:
- **AI-Assisted (Trong vòng đời phát triển phần mềm - SDLC):** Sử dụng các mô hình LLM tiên tiến (Gemini 3.8 / Claude 3.5 Sonnet / Antigravity Agent) làm trợ lý ảo hỗ trợ:
  - Khám phá bài toán và biên soạn tài liệu PRD (Chương 3).
  - Thiết kế kiến trúc phân lớp Clean Architecture và lược đồ NoSQL Firestore (Chương 5).
  - Sinh mã nguồn có kiểm soát (Pair Programming) và tạo Base Project chuẩn (Chương 6).
- **AI-Native (Trong tính năng của sản phẩm):** KIZUNA tích hợp trực tiếp tính năng **AI Sensei** đóng vai trò gia sư AI phân tích ngữ cảnh, giải thích ngữ pháp và sinh bài tập thích ứng cho người học.

---

## 2. ÁP DỤNG CÁC KỸ THUẬT PROMPT ENGINEERING (THEO NỘI DUNG CHƯƠNG 2)

Nhóm đã áp dụng các kỹ thuật cốt lõi được giảng dạy trong Chương 2:

### 2.1. Kỹ thuật Persona Pattern & Role Prompting (Mục 2.2 & 2.3)
- **Mục tiêu:** Định hình vai trò của AI để câu trả lời có tính chuyên môn sâu, tránh câu trả lời chung chung.
- **Áp dụng thực tế:**
  > *"Bạn là một Kiến trúc sư Hệ thống phần mềm cao cấp (Senior Software Architect) kiêm Chuyên gia Giáo dục ngôn ngữ tiếng Nhật. Hãy thiết kế cấu trúc dự án Spring Boot 3 kết hợp Google Cloud Firestore..."*

### 2.2. Kỹ thuật Quản trị Ngữ cảnh (Context Engineering - Mục 2.4)
- **Mục tiêu:** Cung cấp đầy đủ bối cảnh về công nghệ (Java 17, Spring Boot 3.4.2, Firestore SDK, React TypeScript Vite, Capacitor) và giới hạn tài nguyên để AI không đưa ra các giải pháp lạc hậu (ví dụ: dùng Spring Boot 2.x hoặc SQL RDBMS).
- **Áp dụng:** Cung cấp chi tiết phiên bản JDK, môi trường Windows, và cơ chế xác thực không trạng thái (Stateless Firebase Token).

### 2.3. Đầu ra có Cấu trúc (Structured Outputs - Mục 2.5)
- **Mục tiêu:** Ép AI luôn phản hồi bằng định dạng JSON hoặc Markdown có schema xác định, phục vụ tự động hóa và tích hợp API.
- **Áp dụng:** Mọi response API của KIZUNA đều tuân thủ `ApiResponse<T>` với metadata: `{ "success": boolean, "code": string, "message": string, "data": T, "timestamp": string }`.

### 2.4. Kỹ thuật Chain-of-Thought (Suy luận từng bước) & Verification (Mục 2.2 & CLO3)
- **Mục tiêu:** Yêu cầu AI phân tích rủi ro và kiểm chứng từng bước trước khi sinh code; nhóm sinh viên phản biện và sửa đổi các điểm thiếu sót của AI trước khi tích hợp vào dự án.

---

## 3. BẢNG MINH CHỨNG CÁC VÒNG LẶP PROMPT & PHẢN BIỆN KẾT QUẢ AI (CLO2 & CLO3)

| Mã Prompt | Mục đích / Giai đoạn | Kỹ thuật áp dụng | Prompt ban đầu & Kết quả AI | Vấn đề phát hiện (Phản biện kết quả AI) | Cải tiến Prompt (Refined Prompt) & Kết quả cuối cùng |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **PR-01** | Khởi tạo cấu trúc Backend Spring Boot | Role Prompting, Architecture Pattern | *"Hãy tạo project Spring Boot kết nối Firebase."*<br>-> AI sinh code lưu kết nối Firebase trực tiếp trong Controller, không có phân tầng. | **Lỗi kiến trúc:** Thiếu tầng Repository, vi phạm Single Responsibility, không có cơ chế quản lý Token xác thực đa nền tảng. | **Cải tiến:** Áp dụng Clean Layered Architecture, tách biệt `config/FirebaseConfig.java`, xây dựng `AbstractFirestoreRepository<T>` generic, bổ sung `FirebaseAuthenticationFilter` bắt Bearer Token. |
| **PR-02** | Xây dựng thuật toán ôn tập Flashcard | Algorithm Specification, Chain-of-Thought | *"Viết hàm tính ngày ôn tiếp theo cho flashcard."*<br>-> AI sinh thuật toán cộng ngày đơn giản: ngày ôn = hôm nay + 1 ngày cố định. | **Lỗi nghiệp vụ:** Không đáp ứng khoa học ghi nhớ; người học từ dễ hay khó đều bị ôn lại như nhau, gây nhàm chán. | **Cải tiến:** Yêu cầu cài đặt chính xác thuật toán **SuperMemo SM-2**: tính toán `intervalDays`, `easeFactor` (giới hạn min 1.3), `repetitionCount` dựa trên thang điểm 0 - 5. Lưu vào `UserProgress`. |
| **PR-03** | Xử lý lỗi hệ thống & Đa nền tảng | Structured Output, Exception Handling | *"Bắt lỗi và trả về lỗi cho client."*<br>-> AI sử dụng `e.printStackTrace()` và trả về HTTP 500 mặc định với chuỗi String thuần. | **Lỗi bảo mật & Trải nghiệm:** Lộ thông tin nhạy cảm của server, Client (React/Mobile) không parse được JSON chuẩn để hiển thị UI phù hợp. | **Cải tiến:** Xây dựng `@RestControllerAdvice` trong `GlobalExceptionHandler.java`, chuẩn hóa trả về `ResponseEntity<ApiResponse<T>>`, map mã lỗi cụ thể (`UNAUTHORIZED`, `FIREBASE_ERROR`, `NOT_FOUND`). |
| **PR-04** | Kiểm thử và nạp dữ liệu mẫu | Automation & Seeding | *"Viết hàm nạp dữ liệu tiếng Nhật vào Firestore."*<br>-> AI viết code chèn trực tiếp, khi không có internet hoặc chưa cấu hình file JSON service account thì ứng dụng bị crash ngay lúc khởi động. | **Lỗi tính sẵn sàng (Reliability):** Ứng dụng không khởi động được nếu đang trong giai đoạn dev offline hoặc chạy CI/CD. | **Cải tiến:** Bổ sung `try-catch` an toàn trong `DataInitializer.java`, log warning thân thiện; hỗ trợ đồng thời cả file path, Base64 environment variable, và Firestore Emulator. |

---

## 4. BÀI HỌC KINH NGHIỆM VỀ SỬ DỤNG AI CÓ TRÁCH NHIỆM (RESPONSIBLE AI & CLO1)

1. **Kiểm soát Hiện tượng Ảo giác (Hallucination Control):**
   - Không phó mặc 100% cho AI trong việc trích dẫn cú pháp thư viện hoặc logic bảo mật. Ví dụ: Cần kiểm tra kỹ các thay đổi của Spring Security 6 (thay thế `authorizeRequests` thành `authorizeHttpRequests`, bỏ `antMatchers`).
2. **Bảo mật Dữ liệu & Khóa bảo mật (Secret Management):**
   - Tuyệt đối không đưa file chứa Private Key thật (`firebase-service-account.json`) vào prompt hoặc commit lên Git công khai. Thay vào đó, sử dụng file mẫu `.example` và biến môi trường.
3. **Giá trị cốt lõi của Lập trình viên:**
   - AI đóng vai trò là "Cặp lập trình viên ảo" (AI Pair Programmer) giúp tăng tốc độ viết code khung (scaffolding) và tài liệu, nhưng lập trình viên phải là người quyết định kiến trúc, logic thuật toán và kiểm chứng chất lượng phần mềm cuối cùng.
