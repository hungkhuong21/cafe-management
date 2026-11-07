# ☕ CafeFlow - Hệ Thống Quản Lý Quán Cafe & QR Ordering POS

**CafeFlow** là giải pháp toàn diện cho quán cà phê hiện đại, tích hợp hệ thống quản lý thu ngân/vận hành (POS Admin) và giao diện gọi món thông minh qua mã QR tại bàn dành cho khách hàng (Self-Ordering QR Menu).

---

## 🌟 Tính Năng Nổi Bật

### 1. 📱 Giao Diện Khách Hàng (QR Menu Mobile-First)
- **Quét mã QR tại bàn:** Truy cập tức thì menu theo đường dẫn `/qr/:token` mà không cần cài đặt ứng dụng.
- **Duyệt thực đơn & Giỏ hàng:** Phân loại danh mục rõ ràng, tìm kiếm món nhanh, ghi chú chi tiết từng món (ít đường, ít đá, v.v.).
- **Đổi bàn thông minh:** Khách có thể chủ động chuyển sang bàn khác ngay trên giao diện web và giữ nguyên giỏ hàng hiện tại.
- **Gửi đơn tức thì:** Khi bấm gửi đơn, hệ thống tự động cập nhật trạng thái bàn sang "Đang dùng" và kích hoạt chuông thông báo tại quầy thu ngân.

### 2. 📋 Quản Lý Đơn Hàng & POS (Orders)
- **Quy trình Kanban trực quan:** Theo dõi đơn qua 4 cột trạng thái chuẩn:
  - 🔵 **Đơn mới** (`new`)
  - 🟠 **Đang chuẩn bị** (`preparing`)
  - 🟢 **Đang dùng** (`ready`)
  - ⚪ **Hoàn tất** (`done`)
- **Chuông báo âm thanh tức thì (POS Chime):** Tự động phát âm báo hai nốt vang ngân (Ding-Dong) kèm toast thông báo nổi khi khách vừa đặt đơn mới từ QR.
- **Bộ lọc linh hoạt:** Lọc theo ngày (Hôm nay, Hôm qua, 7 ngày, tùy chọn ngày) và theo từng khu vực quán.
- **Tạo đơn nhanh (Quick Order):** Hỗ trợ nhân viên tạo đơn trực tiếp tại quầy hoặc đơn mang đi.

### 3. 🪑 Sơ Đồ Bàn & Khu Vực (Tables & Zones)
- Quản lý sơ đồ bàn phân theo từng khu vực: *Tầng trệt, Lầu 1, Sân vườn, v.v.*
- **Trạng thái bàn tự động:** Đồng bộ tức thì giữa đơn hàng và bàn (`Trống`, `Đang có khách`, `Đã đặt`). Khi thanh toán hoặc hoàn tất đơn, bàn tự động chuyển về trạng thái `Trống`.
- **Tạo & In mã QR:** Mỗi bàn sở hữu một `qr_token` duy nhất, hỗ trợ tải/in mã QR hoặc tạo lại mã mới để bảo mật.
- Thao tác nhanh: Chuyển trạng thái bàn, đổi bàn trực tiếp cho khách.

### 4. 🍰 Quản Lý Thực Đơn & Danh Mục (Menu)
- Quản lý danh mục món ăn / đồ uống với thứ tự sắp xếp linh hoạt.
- Thêm, sửa, xóa món ăn: Tên món, danh mục, giá bán, giá vốn, trạng thái còn món/hết món.
- Hỗ trợ tải lên ảnh món ăn trực tiếp lên server.

### 5. 📊 Báo Cáo & Phân Tích Doanh Thu (Reports & Analytics)
- **Biểu đồ xu hướng doanh thu đa góc nhìn:** Xem theo **Ngày**, **Tuần**, **Tháng**, **Năm**.
- **So sánh với kỳ trước:** Tự động tính toán tỷ lệ tăng trưởng (+/- %) và hiển thị cột so sánh trực quan.
- **Tooltip tương tác:** Rà chuột vào từng cột để xem chi tiết doanh thu, số lượng đơn, ngày tháng.
- **Báo cáo chuyên sâu:**
  - 🏆 Top 5 món bán chạy nhất (Top Products).
  - ⏰ Khung giờ cao điểm trong ngày (Peak Hours).
  - 💳 Cơ cấu thanh toán (Tiền mặt / Chuyển khoản).
  - 🛍️ Tỷ lệ hình thức dùng (Tại quán / Mang đi).

### 6. ⚙️ Cài Đặt Quán (Settings)
- Quản lý thông tin thương hiệu: Tên quán, chi nhánh, địa chỉ, số điện thoại, website.
- Tải lên Logo quán, tự động đồng bộ trên toàn bộ Sidebar, Header và Header trang QR Menu.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4 | UI nhanh, responsive, hiện đại |
| **Icons** | Lucide React | Bộ biểu tượng đồng bộ |
| **Router** | React Router DOM v7 | Điều hướng Client-side |
| **Âm thanh** | Web Audio API & HTML5 Audio | Tạo chuông báo POS không phụ thuộc file mp3 |
| **Backend** | NestJS 11, TypeScript | Kiến trúc module hóa, bảo trì cao |
| **Database** | PostgreSQL 14+ | CSDL quan hệ mạnh mẽ, tốc độ cao |
| **Driver DB** | `pg` (Node-Postgres Pool) | Truy vấn trực tiếp, tối ưu hiệu năng |
| **File Storage** | Multer | Lưu trữ ảnh tải lên tại thư mục `/uploads` |

---

## 📁 Cấu Trúc Dự Án (Project Structure)

```text
cafe-management/
├── backend/                  # Mã nguồn Backend (NestJS)
│   ├── src/
│   │   ├── common/           # Filters, interceptors, middleware dùng chung
│   │   ├── database/         # Kết nối PostgreSQL DatabaseService (Pool)
│   │   ├── modules/
│   │   │   ├── auth/         # Xác thực đăng nhập
│   │   │   ├── categories/   # Quản lý danh mục
│   │   │   ├── dashboard/    # Dữ liệu bảng điều khiển tổng quan
│   │   │   ├── menu-items/   # Quản lý món ăn & upload ảnh
│   │   │   ├── orders/       # Xử lý đơn hàng & luồng trạng thái
│   │   │   ├── reports/      # Báo cáo doanh thu & biểu đồ so sánh
│   │   │   ├── settings/     # Cài đặt thông tin quán & logo
│   │   │   └── tables/       # Quản lý bàn, khu vực & mã QR
│   │   ├── app.module.ts     # Root Module
│   │   └── main.ts           # Điểm khởi chạy backend (Port: 5000)
│   ├── uploads/              # Thư mục lưu ảnh tĩnh được upload
│   ├── .env.example          # Mẫu cấu hình môi trường backend
│   └── package.json
│
├── frontend/                 # Mã nguồn Frontend (React + Vite)
│   ├── src/
│   │   ├── components/       # Components tái sử dụng (Layout, Modals, Cards...)
│   │   │   ├── common/       # UI Components nhỏ (Segmented, Dialog...)
│   │   │   ├── layout/       # Sidebar, Header, MainLayout
│   │   │   ├── orders/       # OrderCard, KanbanColumn, NewOrderNotifier...
│   │   │   ├── reports/      # TrendChart, TopProducts, PeakHours...
│   │   │   └── tables/       # TableCard, QrModal...
│   │   ├── context/          # Context API (PageHeaderContext...)
│   │   ├── pages/            # Các trang chính
│   │   │   ├── Dashboard/    # Tổng quan
│   │   │   ├── Orders/       # Quản lý đơn hàng & phát chuông
│   │   │   ├── Tables/       # Quản lý bàn & khu vực
│   │   │   ├── Menu/         # Quản lý thực đơn
│   │   │   ├── Reports/      # Báo cáo & thống kê
│   │   │   ├── Settings/     # Cài đặt quán & logo
│   │   │   ├── QrMenu/       # Giao diện gọi món cho khách
│   │   │   └── Login/        # Đăng nhập hệ thống
│   │   ├── services/         # Axios API Client cấu hình sẵn base URL
│   │   ├── utils/            # Helper formats, imageUrl, sound notification
│   │   ├── routes/           # Cấu hình AppRoutes
│   │   └── main.jsx
│   └── package.json
│
└── README.md                 # Tài liệu hướng dẫn dự án
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu cầu tiên quyết
- **Node.js**: Phiên bản 18.x hoặc 20.x trở lên.
- **PostgreSQL**: Đang chạy trên máy (mặc định cổng `5432`).
- **npm** hoặc **yarn** / **pnpm**.

---

### 2. Chuẩn bị Cơ sở dữ liệu (PostgreSQL)
Mở PostgreSQL (pgAdmin hoặc terminal psql) và tạo một database mới:
```sql
CREATE DATABASE "cafe-management";
```

---

### 3. Cài đặt và Chạy Backend

1. Di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```

2. Tạo file cấu hình `.env` từ file mẫu:
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # Linux / macOS
   cp .env.example .env
   ```

3. Mở file `backend/.env` và cập nhật thông tin kết nối CSDL của bạn:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:mat_khau_cua_ban@localhost:5432/cafe-management
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=mat_khau_cua_ban
   DB_NAME=cafe-management
   ```

4. Cài đặt các gói phụ thuộc (Dependencies):
   ```bash
   npm install
   ```

5. Khởi chạy Backend ở chế độ phát triển:
   ```bash
   npm run dev
   ```
   > Backend sẽ chạy tại: `http://localhost:5000/api`

---

### 4. Cài đặt và Chạy Frontend

1. Mở một terminal mới và di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```

2. Cài đặt dependencies:
   ```bash
   npm install
   ```

3. Khởi chạy Frontend:
   ```bash
   npm run dev
   ```
   > Giao diện web sẽ sẵn sàng tại: `http://localhost:5173`

---

## 🌐 Các Đường Dẫn Chính

| Trang | Đường dẫn | Mô tả |
|---|---|---|
| **Đăng nhập** | `http://localhost:5173/login` | Màn hình đăng nhập tài khoản |
| **Tổng quan** | `http://localhost:5173/` | Dashboard thống kê doanh thu hôm nay |
| **Đơn hàng** | `http://localhost:5173/orders` | Quản lý quy trình đơn hàng & âm thanh báo |
| **Quản lý bàn** | `http://localhost:5173/tables` | Sơ đồ bàn, in mã QR, đổi trạng thái bàn |
| **Thực đơn** | `http://localhost:5173/menu` | Quản lý danh mục & các món trong quán |
| **Báo cáo** | `http://localhost:5173/reports` | Biểu đồ doanh thu ngày/tuần/tháng/năm |
| **Cài đặt** | `http://localhost:5173/settings` | Cập nhật thông tin quán & logo |
| **QR Menu (Khách)** | `http://localhost:5173/qr/:token` hoặc `http://localhost:5173/qr-menu` | Giao diện mobile gọi món của khách hàng |

---

## 📡 Tổng Quan API Endpoints (Backend)

Tất cả các API đều có tiền tố `/api`:

- **Quản lý bàn & khu vực:**
  - `GET /api/tables`: Lấy danh sách bàn kèm trạng thái & `qr_token`
  - `POST /api/tables`: Tạo bàn mới
  - `PATCH /api/tables/:id/status`: Cập nhật trạng thái (`free`, `occupied`, `reserved`)
  - `POST /api/tables/switch`: Chuyển bàn cho khách
  - `GET /api/tables/:id/qr`: Lấy token mã QR của bàn
  - `POST /api/tables/:id/qr/regenerate`: Cấp lại mã QR mới
  - `GET /api/zones`: Danh sách khu vực

- **Đơn hàng (Orders):**
  - `GET /api/orders`: Lấy toàn bộ đơn hàng kèm chi tiết món
  - `POST /api/orders`: Tạo đơn mới (dành cho cả POS và khách gọi qua QR)
  - `PATCH /api/orders/:id/status`: Chuyển trạng thái đơn (`new` ➔ `preparing` ➔ `ready` ➔ `done`)

- **Thực đơn & Danh mục:**
  - `GET /api/categories`: Danh mục món
  - `GET /api/menu-items`: Danh sách món kèm giá và ảnh
  - `POST /api/menu-items`: Thêm món mới (hỗ trợ upload `multipart/form-data`)

- **Báo cáo & Thống kê:**
  - `GET /api/reports/revenue?groupBy=day|week|month|year`: Biểu đồ doanh thu kèm so sánh kỳ trước
  - `GET /api/reports/top-products`: Danh sách món bán chạy nhất
  - `GET /api/reports/peak-hours`: Thống kê khung giờ đông khách

- **Cài đặt hệ thống:**
  - `GET /api/settings`: Lấy thông tin quán & link logo
  - `PUT /api/settings`: Cập nhật thông tin quán & logo

---

