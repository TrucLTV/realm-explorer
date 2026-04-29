# 🗺️ Realm Explorer — Hướng Dẫn Deploy

> Game học tập RPG cho học sinh lớp 3–9.  
> Frontend: Vercel (miễn phí) | Backend: Railway (miễn phí) | Database: PostgreSQL

---

## 📁 Cấu Trúc Project

```
realm-explorer/
├── frontend/
│   ├── index.html        ← Toàn bộ game (1 file)
│   └── vercel.json       ← Cấu hình Vercel
└── backend/
    ├── src/
    │   ├── index.js              ← Server chính
    │   ├── db/
    │   │   ├── index.js          ← Kết nối PostgreSQL
    │   │   └── schema.sql        ← Tạo bảng database
    │   ├── middleware/
    │   │   └── auth.js           ← Xác thực JWT
    │   └── routes/
    │       ├── auth.js           ← Đăng nhập/đăng ký
    │       └── game.js           ← Lưu game, điểm số, bảng xếp hạng
    ├── package.json
    ├── railway.json       ← Cấu hình Railway
    └── .env.example       ← Mẫu biến môi trường
```

---

## 🚀 BƯỚC 1 — Deploy Backend lên Railway

### 1.1 Tạo tài khoản Railway
- Vào **railway.app** → Đăng ký bằng GitHub

### 1.2 Tạo project mới
1. Click **"New Project"**
2. Chọn **"Deploy from GitHub repo"**
3. Chọn repo của bạn (upload code lên GitHub trước)
4. Chọn thư mục **`/backend`** làm root

### 1.3 Thêm PostgreSQL
1. Trong project Railway → Click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway tự tạo `DATABASE_URL` — copy lại

### 1.4 Cài biến môi trường
Trong Railway → Settings → Variables, thêm:

| Biến | Giá trị |
|------|---------|
| `DATABASE_URL` | *(Railway tự điền)* |
| `JWT_SECRET` | Chuỗi bí mật của bạn (tối thiểu 32 ký tự) |
| `TEACHER_CODE` | Mã giáo viên để tạo tài khoản học sinh |
| `FRONTEND_URL` | URL Vercel (điền sau) |
| `NODE_ENV` | `production` |

### 1.5 Chạy schema database
1. Vào Railway → PostgreSQL → **"Query"** tab
2. Copy toàn bộ nội dung file `backend/src/db/schema.sql`
3. Paste vào và **Run**

### 1.6 Lấy URL backend
Railway tạo URL dạng: `https://realm-explorer-xxx.railway.app`  
→ **Copy lại URL này** để dùng ở bước tiếp theo

---

## 🌐 BƯỚC 2 — Deploy Frontend lên Vercel

### 2.1 Chỉnh sửa URL backend trong game
Mở file `frontend/index.html`, tìm dòng:
```javascript
const API = window.REALM_API || 'http://localhost:3000';
```
Đổi thành:
```javascript
const API = window.REALM_API || 'https://YOUR-BACKEND.railway.app';
```
*(Thay `YOUR-BACKEND` bằng URL Railway của bạn)*

### 2.2 Deploy lên Vercel
1. Vào **vercel.com** → Đăng ký bằng GitHub
2. Click **"New Project"** → Import repo GitHub
3. Chọn thư mục **`/frontend`** làm root
4. Click **"Deploy"** → Chờ 1-2 phút
5. Vercel tạo URL dạng: `https://realm-explorer-xxx.vercel.app`

### 2.3 Cập nhật FRONTEND_URL trên Railway
Quay lại Railway → Variables → Cập nhật `FRONTEND_URL` = URL Vercel của bạn

---

## 👩‍🏫 BƯỚC 3 — Quản Lý Học Sinh

### Tạo tài khoản học sinh (dùng API)

**Cách 1: Tạo từng tài khoản**
```bash
curl -X POST https://YOUR-BACKEND.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hocsinh01",
    "password": "hs123",
    "display_name": "Nguyễn Văn A",
    "class_name": "Lớp 5A",
    "teacher_code": "MÃ_GIÁO_VIÊN_CỦA_BẠN"
  }'
```

**Cách 2: Tạo nhiều tài khoản cùng lúc**
```bash
curl -X POST https://YOUR-BACKEND.railway.app/api/auth/register-batch \
  -H "Content-Type: application/json" \
  -d '{
    "teacher_code": "MÃ_GIÁO_VIÊN_CỦA_BẠN",
    "students": [
      {"username":"hs01","password":"abc123","display_name":"Nguyễn Văn A","class_name":"5A"},
      {"username":"hs02","password":"abc123","display_name":"Trần Thị B","class_name":"5A"},
      {"username":"hs03","password":"abc123","display_name":"Lê Văn C","class_name":"5A"}
    ]
  }'
```

### Xem danh sách học sinh & báo cáo
```bash
# Đăng nhập giáo viên trước để lấy token
TOKEN=$(curl -s -X POST https://YOUR-BACKEND.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"giaovien","password":"giaovien123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Xem báo cáo tất cả học sinh
curl -H "Authorization: Bearer $TOKEN" https://YOUR-BACKEND.railway.app/api/game/report
```

---

## 🎮 CÁCH SỬ DỤNG

### Học sinh chơi game:
1. Vào URL Vercel (VD: `https://realm-explorer.vercel.app`)
2. Chọn **"1 Người Chơi"** → Nhập tên → Chơi ngay (không cần tài khoản)
3. Hoặc chọn **"Nhiều Người Chơi"** → Nhập username/password do giáo viên cấp

### Giáo viên theo dõi:
- Đăng nhập với tài khoản `giaovien` / `giaovien123` *(đổi password ngay!)*
- Xem bảng xếp hạng lớp trong game
- Dùng API `/api/game/report` để xuất báo cáo chi tiết

---

## 🔒 Bảo Mật

- [ ] Đổi password tài khoản `giaovien` ngay sau khi deploy
- [ ] Đặt `TEACHER_CODE` phức tạp (không chia sẻ với học sinh)
- [ ] Đặt `JWT_SECRET` là chuỗi ngẫu nhiên dài ≥ 32 ký tự
- [ ] Không commit file `.env` lên GitHub

---

## ❓ Xử Lý Lỗi Thường Gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| "Không kết nối được server" | Backend chưa deploy | Kiểm tra Railway |
| "Mã giáo viên không đúng" | TEACHER_CODE sai | Kiểm tra biến môi trường |
| "Username đã tồn tại" | Trùng username | Dùng username khác |
| Game không lưu được | Token hết hạn | Đăng xuất và đăng nhập lại |
