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
- **AI-Native (Trong tính năng của sản phẩm):** KIZUNA tích hợp trực tiếp tính năng **AI Sensei** đóng vai trò gia sư AI:
  - Sinh biến thể bài tập tình huống phong phú nằm trong phạm vi whitelist của mốc.
  - Chấm câu viết tự do và góp ý sắc thái văn hóa giao tiếp công sở Nhật Bản.

---

## 2. ÁP DỤNG CÁC KỸ THUẬT PROMPT ENGINEERING (THEO NỘI DUNG CHƯƠNG 2)

Nhóm đã áp dụng các kỹ thuật cốt lõi được giảng dạy trong Chương 2:

### 2.1. Kỹ thuật Persona Pattern & Role Prompting (Mục 2.2 & 2.3)
- **Mục tiêu:** Định hình vai trò của AI để câu trả lời có tính chuyên môn sâu, tránh câu trả lời chung chung.
- **Áp dụng thực tế:**
  > *"Bạn là một Giảng viên tiếng Nhật bản xứ giàu kinh nghiệm giảng dạy cho người Việt. Hãy phân tích câu viết của học viên ở mốc 'Đổi lịch hẹn' theo ba tiêu chí: Ngữ pháp, Trợ từ, và Sắc thái lịch sự trong bối cảnh công ty Nhật..."*

### 2.2. Kỹ thuật Quản trị Ngữ cảnh & Ràng buộc Phạm vi (Context Engineering & Scope Constraints - Mục 2.4)
- **Mục tiêu:** Cung cấp đầy đủ bối cảnh về mốc học, giới hạn từ vựng cho phép (`knowledge_whitelist`) để AI không sinh từ ngữ vượt quá trình độ của học viên.
- **Áp dụng:** Nhúng toàn bộ danh mục từ vựng N4 của mốc vào prompt kèm chỉ dẫn nghiêm ngặt: *“Tuyệt đối không dùng từ vựng ngoài whitelist quá 1 từ. Không dùng từ N3/N2/N1”*.

### 2.3. Đầu ra có Cấu trúc (Structured Outputs - Mục 2.5)
- **Mục tiêu:** Ép AI luôn phản hồi bằng định dạng JSON có schema xác định, phục vụ việc phân tích tự động tại Frontend/Backend.
- **Áp dụng:** Response schema gồm các trường rõ ràng: `{ scenario_ja, scenario_vi, question, options, correct_option_index, explanation }`.

### 2.4. Kỹ thuật Chain-of-Thought (Suy luận từng bước) & Verification (Mục 2.2 & CLO3)
- **Mục tiêu:** Yêu cầu AI tự kiểm chứng từng phương án sai (distractors) trước khi trả về câu hỏi, đảm bảo tính sư phạm chuẩn mực.

---

## 3. BẢNG MINH CHỨNG CÁC VÒNG LẶP PROMPT & PHẢN BIỆN KẾT QUẢ AI (CLO2 & CLO3)

| Mã Prompt | Mục đích / Giai đoạn | Kỹ thuật áp dụng | Prompt ban đầu & Kết quả AI | Vấn đề phát hiện (Phản biện kết quả AI) | Cải tiến Prompt (Refined Prompt) & Kết quả cuối cùng |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **PR-01** | Khởi tạo cấu trúc Backend Spring Boot | Role Prompting, Architecture Pattern | *"Hãy tạo project Spring Boot kết nối Firebase."*<br>-> AI sinh code lưu kết nối Firebase trực tiếp trong Controller, không có phân tầng. | **Lỗi kiến trúc:** Thiếu tầng Repository, vi phạm Single Responsibility, không có cơ chế quản lý Token xác thực đa nền tảng. | **Cải tiến:** Áp dụng Clean Layered Architecture, tách biệt `config/FirebaseConfig.java`, xây dựng `AbstractFirestoreRepository<T>` generic, bổ sung `FirebaseAuthenticationFilter` bắt Bearer Token. |
| **PR-02** | Xây dựng thuật toán ôn tập Flashcard | Algorithm Specification, Chain-of-Thought | *"Viết hàm tính ngày ôn tiếp theo cho flashcard."*<br>-> AI sinh thuật toán cộng ngày đơn giản: ngày ôn = hôm nay + 1 ngày cố định. | **Lỗi nghiệp vụ:** Không đáp ứng khoa học ghi nhớ; người học từ dễ hay khó đều bị ôn lại như nhau, gây nhàm chán. | **Cải tiến:** Yêu cầu cài đặt chính xác thuật toán **SuperMemo SM-2**: tính toán `intervalDays`, `easeFactor` (giới hạn min 1.3), `repetitionCount` dựa trên thang điểm 0 - 5. Lưu vào `UserProgress`. |
| **PR-03** | Xử lý lỗi hệ thống & Đa nền tảng | Structured Output, Exception Handling | *"Bắt lỗi và trả về lỗi cho client."*<br>-> AI sử dụng `e.printStackTrace()` và trả về HTTP 500 mặc định với chuỗi String thuần. | **Lỗi bảo mật & Trải nghiệm:** Lộ thông tin nhạy cảm của server, Client (React/Mobile) không parse được JSON chuẩn để hiển thị UI phù hợp. | **Cải tiến:** Xây dựng `@RestControllerAdvice` trong `GlobalExceptionHandler.java`, chuẩn hóa trả về `ResponseEntity<ApiResponse<T>>`, map mã lỗi cụ thể (`UNAUTHORIZED`, `FIREBASE_ERROR`, `NOT_FOUND`). |
| **PR-04** | Kiểm thử và nạp dữ liệu mẫu | Automation & Seeding | *"Viết hàm nạp dữ liệu tiếng Nhật vào Firestore."*<br>-> AI viết code chèn trực tiếp, khi không có internet hoặc chưa cấu hình file JSON service account thì ứng dụng bị crash ngay lúc khởi động. | **Lỗi tính sẵn sàng (Reliability):** Ứng dụng không khởi động được nếu đang trong giai đoạn dev offline hoặc chạy CI/CD. | **Cải tiến:** Bổ sung `try-catch` an toàn trong `DataInitializer.java`, log warning thân thiện; hỗ trợ đồng thời cả file path, Base64 environment variable, và Firestore Emulator. |
| **PR-05** | Sinh biến thể bài tập tình huống tại mốc | Scope Constraints, Structured Outputs | *"Hãy sinh 1 câu hỏi tình huống đổi lịch hẹn tiếng Nhật."*<br>-> AI tự do dùng từ vựng N2 cao cấp như 「日程の再調整」, 「拝察いたします」 khiến học viên N4 hoang mang. | **Lỗi ranh giới tri thức (Scope Creep):** AI không tự biết giới hạn trình độ người học, vi phạm nguyên tắc sư phạm của mốc. | **Cải tiến:** Bổ sung ràng buộc Whitelist nghiêm ngặt: Chỉ dùng từ trong mốc (`都合`, `変更`, `来週`...), ép output schema JSON có giải nghĩa song ngữ và lời giải thích tại sao chọn. |
| **PR-06** | AI góp ý câu viết tự do của học viên | Persona Prompting, Nuance Coaching | *"Chấm điểm câu này: '来週の月曜日は都合が悪いですから、火曜日に変更してください。'"*<br>-> AI chỉ phản hồi đơn giản: *"Câu này đúng ngữ pháp."* | **Thiếu chiều sâu giao tiếp:** Câu đúng ngữ pháp nhưng sắc thái quá cộc lốc, không dùng được khi nói với đối tác hoặc cấp trên Nhật. | **Cải tiến:** Yêu cầu AI phân tích sắc thái văn hóa (Nuance feedback), chỉ ra sự áp đặt của thể `てください` và gợi ý mẫu câu nhờ vả lịch sự `〜ていただけないでしょうか`. |

---

## 4. BÀI HỌC KINH NGHIỆM VỀ SỬ DỤNG AI CÓ TRÁCH NHIỆM (RESPONSIBLE AI & CLO1)

1. **Kiểm soát Hiện tượng Ảo giác (Hallucination Control):**
   - Không bao giờ để AI tự do tạo nội dung giáo trình mà không có **khung tri thức chuẩn (Ground Truth)** do con người biên tập.
2. **Nguyên tắc "Biên tập trước khi phát hành":**
   - Nếu thu thập tài liệu hoặc cào dữ liệu từ bên ngoài, bắt buộc phải xác định bản quyền và biên tập lại thành các đơn vị bài học chuẩn của ứng dụng KIZUNA trước khi đưa vào hệ thống cho AI vận hành.
3. **Giá trị cốt lõi của Lập trình viên:**
   - AI là công cụ khuếch đại năng suất và làm giàu tính linh hoạt của sản phẩm, nhưng tư duy kiến trúc, phương pháp sư phạm và tính an toàn của phần mềm thuộc về trách nhiệm của lập trình viên.
