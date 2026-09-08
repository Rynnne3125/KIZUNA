# ⛩️ KIZUNA (絆) - Cross-Platform Japanese Learning Application

Dự án học tiếng Nhật đa nền tảng **KIZUNA** kết hợp Frontend hiện đại (React + TypeScript + Vite, hỗ trợ Mobile qua Capacitor/React Native/PWA) cùng Backend hiệu năng cao chuẩn enterprise (**Java 17, Spring Boot 3.4.2 và Google Cloud Firestore / Firebase Admin SDK**).

---

## 📁 Cấu Trúc Dự Án (Project Structure)

```
KIZUNA/
├── backend/                                  # Spring Boot REST API + Firestore
│   ├── src/main/java/com/kizuna/
│   │   ├── KizunaBackendApplication.java     # Main Entrypoint
│   │   ├── common/                           # ApiResponse, PageResponse, ErrorCode
│   │   ├── config/                           # FirebaseConfig, SecurityConfig, CorsConfig, OpenApiConfig
│   │   ├── security/                         # FirebaseAuthenticationFilter, UserPrincipal, SecurityUtils
│   │   ├── exception/                        # GlobalExceptionHandler, Custom Exceptions
│   │   ├── model/                            # Firestore Documents: UserProfile, Kanji, Vocabulary, UserProgress
│   │   ├── dto/                              # Request / Response DTOs có Jakarta Validation
│   │   ├── repository/                       # Generic Firestore Repository & Domain Repositories
│   │   ├── service/                          # Business logic & Thuật toán Spaced Repetition SM-2
│   │   └── controller/                       # REST APIs: Auth, Health, Kanji, Vocabulary, Progress
│   ├── src/main/resources/
│   │   ├── application.yml                   # Cấu hình chính (Port, CORS, Firebase, Actuator)
│   │   ├── application-dev.yml               # Cấu hình môi trường dev
│   │   └── firebase-service-account.json.example # File mẫu cấu hình Firebase
│   ├── Dockerfile                            # Multi-stage Docker build
│   ├── docker-compose.yml                    # Docker Compose chạy kèm Firestore Emulator
│   └── pom.xml                               # Quản lý thư viện Maven
│
├── frontend/                                 # Sẽ chứa mã nguồn React + TypeScript + Vite
└── README.md                                 # Hướng dẫn chi tiết dự án
```

---

## 🚀 Tính Năng Nổi Bật Của Base Backend

1. **Xác thực Đa Nền Tảng Không Trạng Thái (Stateless Authentication)**:
   - Tích hợp chuẩn **Firebase Authentication ID Token** (JWT).
   - Client Web (React) hoặc Mobile (Capacitor/iOS/Android) đăng nhập trực tiếp qua Firebase Client SDK (Google, Apple, Email).
   - Client gửi Bearer Token qua header `Authorization: Bearer <token>`.
   - Spring Boot giải mã và xác thực token tức thời qua Firebase Admin SDK, map vào Spring Security Context.

2. **NoSQL Document Store với Google Cloud Firestore**:
   - Kiến trúc `AbstractFirestoreRepository<T>` chuẩn hóa các thao tác CRUD và Query bất đồng bộ (`ApiFuture`).
   - Tối ưu hóa cho dữ liệu học tiếng Nhật: Hán tự (Kanji), Từ vựng (Vocabularies), Bài học (Lessons), Tiến độ ôn tập (User Progress).

3. **Thuật Toán Spaced Repetition (SRS - SuperMemo SM-2)**:
   - Tự động tính toán chu kỳ ôn tập (interval), hệ số dễ dàng (ease factor), ngày ôn tập kế tiếp (`nextReviewDate`) dựa trên đánh giá chất lượng ghi nhớ (thang điểm 0 - 5).
   - Thưởng điểm kinh nghiệm (XP) và duy trì chuỗi học liên tục (Daily Streak).

4. **Hỗ Trợ CORS Đa Nền Tảng Linh Hoạt**:
   - Cho phép Vite Dev Server (`http://localhost:5173`), Mobile WebView schemes (`capacitor://localhost`, `ionic://localhost`).

5. **Tài Liệu Hóa API Tự Động (OpenAPI / Swagger UI)**:
   - Truy cập giao diện trực quan tại: `http://localhost:8080/swagger-ui.html`.
   - Hỗ trợ nút **Authorize** để dán Firebase Bearer Token test trực tiếp.

---

## ⚙️ Hướng Dẫn Cấu Hình Firebase / Firestore

Backend hỗ trợ **3 cách kết nối** linh hoạt tùy môi trường:

### Cách 1: Đặt file Service Account (Khuyên dùng khi chạy local)
1. Vào [Firebase Console](https://console.firebase.google.com/) -> **Project Settings** -> tab **Service accounts**.
2. Chọn **Generate new private key** để tải file JSON.
3. Đổi tên file thành `firebase-service-account.json` và đặt vào thư mục `backend/src/main/resources/`.
4. Khởi động ứng dụng.

### Cách 2: Sử dụng biến môi trường Base64 (Khuyên dùng khi Deploy Docker / CI-CD)
Mã hóa file `firebase-service-account.json` thành chuỗi Base64:
```powershell
# Trên Windows PowerShell:
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\firebase-service-account.json"))
$env:FIREBASE_CREDENTIALS_BASE64 = $base64
```

### Cách 3: Chạy Offline với Firestore Emulator (Không cần tài khoản Firebase)
```bash
cd backend
docker compose up firestore-emulator
```
Sau đó kích hoạt cấu hình emulator trong `application.yml`:
```yaml
kizuna:
  firebase:
    emulator:
      enabled: true
      host: "localhost:8088"
```

---

## 💻 Hướng Dẫn Chạy Backend

### Chạy bằng Maven Wrapper:
```powershell
cd backend
.\mvnw.cmd clean compile
.\mvnw.cmd spring-boot:run
```

### Chạy bằng Docker:
```bash
cd backend
docker compose up --build
```

---

## 📡 Danh Sách API Chính (Endpoints Reference)

| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/health` | ❌ Public | Kiểm tra trạng thái hệ thống và kết nối Firestore |
| `GET` | `/api/v1/kanji` | ❌ Public | Lấy danh sách Hán tự (hỗ trợ lọc `?jlptLevel=N5&limit=20`) |
| `GET` | `/api/v1/kanji/{id}` | ❌ Public | Xem chi tiết 1 ký tự Hán tự |
| `POST` | `/api/v1/kanji` | 🔒 Authenticated | Thêm mới Kanji vào cơ sở dữ liệu |
| `GET` | `/api/v1/vocabularies` | ❌ Public | Lấy danh sách từ vựng (lọc `?jlptLevel=N5`) |
| `GET` | `/api/v1/vocabularies/{id}` | ❌ Public | Xem chi tiết 1 từ vựng |
| `POST` | `/api/v1/vocabularies` | 🔒 Authenticated | Thêm từ vựng mới |
| `GET` | `/api/v1/auth/me` | 🔒 Authenticated | Đồng bộ và lấy thông tin user từ Firebase Token |
| `PATCH` | `/api/v1/auth/target-level` | 🔒 Authenticated | Cập nhật mục tiêu JLPT (N5 -> N1) |
| `POST` | `/api/v1/progress` | 🔒 Authenticated | Ghi nhận kết quả làm bài ôn tập (SM-2 SRS) |
| `GET` | `/api/v1/progress/summary` | 🔒 Authenticated | Thống kê số từ đã học, cần ôn tập hôm nay, streak, XP |
| `GET` | `/api/v1/progress/due` | 🔒 Authenticated | Lấy danh sách các mục đến hạn ôn tập |

---

## 🔗 Cách Client (React Vite / Mobile) Kết Nối

Ví dụ gọi API từ React TypeScript sử dụng `axios` và `firebase/auth`:

```typescript
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
});

// Tự động đính kèm Firebase Bearer Token vào mọi request
apiClient.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tra cứu Kanji N5
export const getKanjiN5 = async () => {
  const response = await apiClient.get('/kanji', { params: { jlptLevel: 'N5' } });
  return response.data.data;
};

// Gửi kết quả ôn tập Spaced Repetition
export const submitReview = async (itemId: string, quality: number) => {
  const response = await apiClient.post('/progress', {
    itemId,
    itemType: 'KANJI',
    quality, // thang điểm 0 - 5
  });
  return response.data.data;
};
```
