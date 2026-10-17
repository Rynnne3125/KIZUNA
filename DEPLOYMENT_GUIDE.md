# 🚀 HƯỚNG DẪN DEPLOY VÀ VẬN HÀNH DỰ ÁN KIZUNA TRÊN AWS EC2

Tài liệu này lưu lại toàn bộ quy trình thiết lập, vận hành và cập nhật hệ thống Kizuna (Frontend React Vite + Backend Spring Boot Java 21) chạy bằng Docker trên máy chủ AWS EC2.

---

## 📌 1. Thông Tin Máy Chủ Hiện Tại

* **Nhà cung cấp:** AWS EC2 (Ubuntu 24.04 LTS)
* **Public IP cố định (Elastic IP):** `15.135.17.96`
* **User đăng nhập:** `ubuntu`
* **File khóa bí mật (SSH Key):** `backend/src/main/resources/kizuna-key.pem`
* **Link website:** `http://15.135.17.96`
* **GitHub Repository:** `https://github.com/Rynnne3125/KIZUNA.git` (Nhánh: `develop`)

---

## 🔑 2. Cách Kết Nối Vào Máy Chủ Từ Máy Tính Cá Nhân

Mở **PowerShell** tại thư mục dự án trên máy tính của bạn và chạy:

```powershell
ssh -i "backend\src\main\resources\kizuna-key.pem" ubuntu@15.135.17.96
```

*(Nếu báo lỗi quyền file `.pem`, chạy lệnh sau để phân quyền lại):*
```powershell
icacls.exe .\backend\src\main\resources\kizuna-key.pem /reset ; icacls.exe .\backend\src\main\resources\kizuna-key.pem /grant:r "$($env:USERNAME):(R)" ; icacls.exe .\backend\src\main\resources\kizuna-key.pem /inheritance:r
```

---

## 🛠️ 3. Cài Đặt Ban Đầu Trên Máy Chủ EC2 (Chỉ làm 1 lần khi mới tạo máy ảo)

Sau khi SSH vào máy chủ (`ubuntu@...:~$`), chạy lần lượt:

### Bước 3.1: Tạo 2GB Swap (Tránh tràn RAM trên máy ảo Free Tier)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Bước 3.2: Cài Docker & Docker Compose
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
newgrp docker
```

### Bước 3.3: Tải Code & Khởi Động Dự Án
```bash
git clone -b develop https://github.com/Rynnne3125/KIZUNA.git
cd KIZUNA
docker compose up -d --build
```

---

## 🔄 4. Quy Trình Cập Nhật Website Mỗi Khi Sửa Code (Hàng Ngày)

Sau này khi bạn sửa code trên máy tính cá nhân, bạn **không cần gõ lệnh `npm` hay `gradle`** nữa:

### Tại máy tính của bạn:
Commit và đẩy code lên GitHub:
```powershell
git add .
git commit -m "Cập nhật tính năng mới"
git push origin develop
```

### Tại máy chủ EC2 (qua SSH):
Cập nhật code và tự động build lại:
```bash
cd KIZUNA
git pull
docker compose up -d --build
```
*Chỉ mất khoảng 1 phút, hệ thống sẽ tự build lại và cập nhật website mà không làm gián đoạn người dùng.*

---

## 📋 5. Các Lệnh Quản Lý Docker Thường Dùng Trên EC2

* **Xem các container đang chạy:**
  ```bash
  docker compose ps
  ```
* **Xem nhật ký (logs) của Backend Spring Boot:**
  ```bash
  docker compose logs -f backend
  ```
* **Xem nhật ký (logs) của Frontend Nginx:**
  ```bash
  docker compose logs -f frontend
  ```
* **Khởi động lại toàn bộ hệ thống:**
  ```bash
  docker compose restart
  ```
* **Dừng toàn bộ hệ thống:**
  ```bash
  docker compose down
  ```

---

## 🌐 6. Gắn Tên Miền Tùy Chỉnh (Ví dụ: `kizuna.thanhphong.it`)

Khi bạn đã sở hữu tên miền, chỉ cần:
1. Vào trang quản trị DNS của tên miền.
2. Thêm **bản ghi A**:
   * **Host/Name:** `kizuna` (hoặc `@` nếu là domain gốc)
   * **Value/IP:** `15.135.17.96`
3. Cài đặt SSL miễn phí (HTTPS) bằng Certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d kizuna.thanhphong.it
   ```
