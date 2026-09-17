# ⛩️ KIZUNA (絆) - Cross-Platform Japanese Learning Application

Dự án học tiếng Nhật đa nền tảng **KIZUNA** kết hợp Frontend hiện đại (React + TypeScript + Vite, hỗ trợ Web & đóng gói Android APK qua Capacitor) cùng Backend hiệu năng cao chuẩn enterprise (**Java 21, Spring Boot 3.4.2, Spring Security với JWT Bearer Token, Gradle và Google Cloud Firestore / Firebase Admin SDK**).

---

## 📁 Cấu Trúc Dự Án (Project Structure)

```
KIZUNA/
├── docs/                                     # Tài liệu học phần CS2028 (Chương 2 & Chương 3)
│   ├── 3.1_PRODUCT_DISCOVERY.md              # 3.1 Khám phá sản phẩm, Lean Canvas, Empathy Map
│   ├── PRD_KIZUNA.md                         # 3.2 Tài liệu Yêu cầu Sản phẩm (PRD) chuẩn chỉnh
│   ├── 3.3_REQUIREMENTS_ANALYSIS.md          # 3.3 Phân tích yêu cầu FURPS+, Use Cases, RTM
│   ├── 3.4_USER_STORIES_AND_ACCEPTANCE_CRITERIA.md # 3.4 User Stories (INVEST) & Gherkin AC
│   ├── 3.5_FEATURE_SPECIFICATIONS.md         # 3.5 Đặc tả kỹ thuật các tính năng, SM-2 SRS, AI Sensei
│   ├── PRACTICE_LAB3_DEMO_GUIDE.md           # Kịch bản demo thực hành Bài 3
│   └── AI_PROMPT_ENGINEERING_LOGS.md         # Nhật ký Prompt Engineering
│
├── backend/                                  # Spring Boot 3.4 + Java 21 + Gradle (Cổng: 3000)
│   ├── src/main/java/com/kizuna/
│   │   ├── KizunaApplication.java            # Main Entrypoint
│   │   ├── common/                           # ApiResponse chuẩn hóa JSON
│   │   ├── config/                           # FirebaseConfig, SecurityConfig
│   │   ├── security/                         # JwtTokenProvider, JwtAuthenticationFilter, UserPrincipal,...
│   │   ├── exception/                        # GlobalExceptionHandler
│   │   ├── model/                            # Thực thể User
│   │   ├── dto/                              # LoginRequest, LoginResponse, UserResponse
│   │   ├── repository/                       # UserRepository (In-memory thread-safe)
│   │   ├── service/                          # UserService & UserServiceImpl
│   │   └── controller/                       # AuthController, HealthController, Admin/User Controllers
│   ├── src/main/resources/
│   │   ├── application.yml                   # Cấu hình Port 3000, JWT Secret, Firebase
│   │   └── firebase-google-services.json     # Cấu hình Firebase Client Android (package: com.kizuna)
│   ├── build.gradle                          # Quản lý dependencies & Gradle build (Java 21)
│   ├── settings.gradle                       # Cấu hình Gradle Project
│   ├── gradle.properties                     # Cấu hình JDK 21 toolchain
│   └── gradlew.bat                           # Gradle Wrapper cho Windows
│
├── frontend/                                 # React + TypeScript + Vite + Firebase SDK
│   ├── src/
│   │   ├── config/firebase.ts                # Cấu hình Firebase Client Web (project_id: ebook-fdc02)
│   │   ├── App.tsx                           # Giao diện chính tích hợp test API Auth
│   │   └── main.tsx                          # Entrypoint React DOM
│   ├── dist/                                 # Thư mục build deploy Firebase Hosting
│   ├── package.json                          # Dependencies React, Vite, Firebase
│   ├── vite.config.ts                        # Cấu hình Vite Dev Server
│   └── index.html                            # Single Page Application HTML
│
├── firebase.json                             # Cấu hình deploy hosting target: kizuna-6756a
├── .firebaserc                               # Liên kết project ebook-fdc02 với target kizuna-6756a
└── README.md                                 # Hướng dẫn chi tiết dự án & kiểm thử Postman
```

---

## 🚀 Tính Năng & Kiến Trúc Bảo Mật (Spring Security + JWT)

1. **Xác thực Không Trạng Thái (Stateless JWT Authentication)**:
   - Sử dụng thư viện **JJWT 0.12.6** với thuật toán mã hóa `HMAC-SHA256`.
   - Client gửi Bearer Token qua HTTP Header: `Authorization: Bearer <token>`.
   - Bộ lọc `JwtAuthenticationFilter` trích xuất token, giải mã claims và nạp `UserPrincipal` vào `SecurityContextHolder`.
   - Tắt CSRF (Stateless REST API), xử lý CORS linh hoạt cho Web và Mobile.

2. **Phân Quyền Theo 2 Vai Trò (Role-Based Access Control - RBAC)**:
   - **`ROLE_ADMIN`**: Toàn quyền quản trị nội dung, bản đồ hành trình (`/api/v1/admin/**`).
   - **`ROLE_USER`**: Quyền học viên, truy cập hành trình cá nhân và nộp bài ôn tập (`/api/v1/user/**`).
   - Truy cập sai quyền hạn $\rightarrow$ trả về `403 Forbidden` (`JwtAccessDeniedHandler`).
   - Thiếu token hoặc token hết hạn $\rightarrow$ trả về `401 Unauthorized` (`JwtAuthenticationEntryPoint`).

3. **Cổng Khởi Chạy (Server Port)**:
   - Backend chạy cố định tại **port 3000**: `http://localhost:3000`.

---

## 👥 Tài Khoản Mẫu Đã Khởi Tạo Sẵn

Khi backend khởi động, hệ thống tự động khởi tạo 2 tài khoản mẫu (mật khẩu đã được mã hóa bằng `BCryptPasswordEncoder`):

| Tài khoản | Username | Password | Role | Quyền truy cập Endpoint |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | `ROLE_ADMIN` | `/api/v1/admin/**` |
| **User** | `user` | `user123` | `ROLE_USER` | `/api/v1/user/**` |

---

## 💻 Hướng Dẫn Chạy Backend & Frontend

### 1. Khởi động Backend (Spring Boot trên Port 3000)

Sử dụng **Gradle Wrapper** (khuyên dùng, không cần cài đặt Gradle vào máy):
```powershell
cd backend
.\gradlew.bat bootRun
```
*Hoặc mở dự án bằng **IntelliJ IDEA**, mở file `backend/src/main/java/com/kizuna/KizunaApplication.java` và bấm nút **Play (▶️ Run)**.*

### 2. Khởi động Frontend (React Vite)
```powershell
cd frontend
npm install
npm run dev
```
Giao diện Web phát triển sẽ chạy tại: `http://localhost:5173`.

### 3. Build & Deploy Web lên Firebase Hosting
```powershell
cd frontend
npm run build
cd ..
firebase deploy --only hosting:kizuna-6756a
```

---

## 📬 Hướng Dẫn Kiểm Thử Bằng Postman (Toàn Diện)

Địa chỉ gốc của Backend API: **`http://localhost:3000`**

### Bảng Tổng Hợp Endpoint

| STT | Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :---: | :---: | :--- | :---: | :--- |
| 1 | `GET` | `/api/v1/health` | ❌ Public | Kiểm tra trạng thái hệ thống và port 3000 |
| 2 | `GET` | `/api/v1/health/firestore` | ❌ Public | Kiểm tra trạng thái nạp cấu hình Firestore |
| 3 | `POST` | `/api/v1/auth/login` | ❌ Public | Đăng nhập tài khoản, nhận Bearer Token (JWT) |
| 4 | `GET` | `/api/v1/auth/me` | 🔒 Authenticated | Lấy thông tin tài khoản hiện tại từ Token |
| 5 | `GET` | `/api/v1/admin/journey/overview` | 🔒 `ROLE_ADMIN` | Bảng điều khiển quản trị lộ trình học (Chỉ Admin) |
| 6 | `POST` | `/api/v1/admin/journey/milestone` | 🔒 `ROLE_ADMIN` | Thêm mốc học mới vào bản đồ (Chỉ Admin) |
| 7 | `GET` | `/api/v1/user/journey/progress` | 🔒 `ROLE_USER` | Lấy tiến độ học tiếng Nhật hiện tại (Chỉ User) |
| 8 | `POST` | `/api/v1/user/journey/submit` | 🔒 `ROLE_USER` | Nộp kết quả làm bài ôn tập mốc học (Chỉ User) |

---

### Chi Tiết Từng Bước Test Trên Postman

#### Bước 1: Kiểm tra API Public Health
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/v1/health`
- **Headers**: Không cần
- **Kết quả mong đợi (Status: 200 OK)**:
```json
{
  "success": true,
  "message": "System is healthy",
  "data": {
    "port": 3000,
    "service": "kizuna-backend",
    "status": "UP",
    "message": "KIZUNA backend is running smoothly"
  },
  "timestamp": "2026-09-14T..."
}
```

#### Bước 2: Kiểm tra cấu hình Firestore
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/v1/health/firestore`
- **Kết quả mong đợi (Status: 200 OK)**:
```json
{
  "success": true,
  "message": "Firestore configuration is active",
  "data": {
    "projectId": "ebook-fdc02",
    "databaseUrl": "https://ebook-fdc02-default-rtdb.firebaseio.com",
    "firestoreConfigured": true,
    "note": "Firestore bean is injected and ready"
  },
  "timestamp": "2026-09-14T..."
}
```

#### Bước 3: Đăng nhập Admin lấy Bearer Token
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/v1/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body** (`raw` -> `JSON`):
```json
{
  "username": "admin",
  "password": "admin123"
}
```
- **Kết quả mong đợi (Status: 200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwiZXhwIjoxNzg5NDcz...",
    "tokenType": "Bearer",
    "username": "admin",
    "role": "ROLE_ADMIN",
    "expiresIn": 86400000
  },
  "timestamp": "2026-09-14T..."
}
```
> [!TIP]
> **Mẹo Postman tự động lưu Token**:
> Trong tab **Tests** của request login trên Postman, hãy dán đoạn script sau:
> ```javascript
> const jsonData = pm.response.json();
> if (jsonData.data && jsonData.data.token) {
>     pm.environment.set("admin_token", jsonData.data.token);
> }
> ```
> Sau đó ở các request sau, bạn chỉ cần nhập `{{admin_token}}` vào trường Bearer Token.

#### Bước 4: Kiểm tra API Admin với Token Admin (Hợp lệ)
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/v1/admin/journey/overview`
- **Headers**:
  - `Authorization`: `Bearer <TOKEN_ADMIN_TỪ_BƯỚC_3>`
- **Kết quả mong đợi (Status: 200 OK)**:
```json
{
  "success": true,
  "message": "Admin journey overview fetched successfully",
  "data": {
    "adminUsername": "admin",
    "role": "ROLE_ADMIN",
    "totalStages": 5,
    "totalMilestones": 24,
    "aiPromptsConfigured": 12,
    "status": "ADMIN_ACCESS_GRANTED"
  },
  "timestamp": "2026-09-14T..."
}
```

#### Bước 5: Đăng nhập User lấy Bearer Token
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/v1/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body** (`raw` -> `JSON`):
```json
{
  "username": "user",
  "password": "user123"
}
```
- **Kết quả mong đợi (Status: 200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIiwicm9sZSI6IlJPTEVfVVNFUiIsImV4cCI6MTc4OTQ3My...",
    "tokenType": "Bearer",
    "username": "user",
    "role": "ROLE_USER",
    "expiresIn": 86400000
  },
  "timestamp": "2026-09-14T..."
}
```

#### Bước 6: Kiểm tra API User với Token User (Hợp lệ)
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/v1/user/journey/progress`
- **Headers**:
  - `Authorization`: `Bearer <TOKEN_USER_TỪ_BƯỚC_5>`
- **Kết quả mong đợi (Status: 200 OK)**:
```json
{
  "success": true,
  "message": "User journey progress fetched successfully",
  "data": {
    "username": "user",
    "role": "ROLE_USER",
    "currentStage": 1,
    "currentMilestone": "Chặng 1: Bảng chữ cái Hiragana & Katakana",
    "streakDays": 7,
    "totalXp": 450,
    "status": "USER_ACCESS_GRANTED"
  },
  "timestamp": "2026-09-14T..."
}
```

#### Bước 7: Kiểm tra Phân Quyền - User truy cập API Admin (Bị Chặn)
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/v1/admin/journey/overview`
- **Headers**:
  - `Authorization`: `Bearer <TOKEN_USER_TỪ_BƯỚC_5>` *(Dùng token User)*
- **Kết quả mong đợi (Status: 403 Forbidden)**:
```json
{
  "success": false,
  "message": "Forbidden: You do not have permission to access this resource",
  "data": null,
  "timestamp": "2026-09-14T..."
}
```

#### Bước 8: Kiểm tra Bảo Mật - Truy cập không gửi Token
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/v1/admin/journey/overview` *(hoặc `/api/v1/user/journey/progress`)*
- **Headers**: Không gửi header `Authorization`
- **Kết quả mong đợi (Status: 401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Unauthorized: Bearer token is missing or invalid. Full authentication is required to access this resource",
  "data": null,
  "timestamp": "2026-09-14T..."
}
```

---

## ⚡ Các Lệnh cURL Nhanh Cho Terminal

Bạn có thể copy paste trực tiếp vào Terminal/PowerShell để kiểm tra ngay mà không cần mở Postman:

```powershell
# 1. Health check
curl -i http://localhost:3000/api/v1/health

# 2. Đăng nhập Admin lấy Token
curl -i -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"admin123"}'

# 3. Đăng nhập User lấy Token
curl -i -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"user","password":"user123"}'
```

---

## ⚙️ Cấu Hình Firebase & Firestore

1. **Android**: File `backend/src/main/resources/firebase-google-services.json` đã được thiết lập sẵn tên gói `package_name: com.kizuna`. Khi đóng gói Android, copy file này vào `android/app/google-services.json`.
2. **Web**: Cấu hình Client SDK đã nằm sẵn tại `frontend/src/config/firebase.ts` với `project_id: ebook-fdc02`.
3. **Deploy Hosting**: Lệnh `firebase deploy --only hosting:kizuna-6756a` triển khai thư mục `frontend/dist` lên site `kizuna-6756a`.
4. **Backend Firestore Service Account**: Để cấp quyền Admin ghi trực tiếp vào Firestore trên cloud, tải file Service Account từ Firebase Console và đặt tại `backend/src/main/resources/firebase-service-account.json`. Khi chạy local, hệ thống tự động fallback an toàn không làm dừng server.
