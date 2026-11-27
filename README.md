# ExpensePro – Ứng Dụng Quản Lý Chi Tiêu Cá Nhân & Nhóm (PWA Offline-First)

Ứng dụng web quản lý chi tiêu hiện đại, hỗ trợ cài đặt như Native App (PWA), ghi chép thu chi hoàn toàn độc lập khi mất mạng (Offline-First với IndexedDB) và tự động đồng bộ khi có kết nối mạng.

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY ỨNG DỤNG

### Bước 1: Mở Terminal tại thư mục dự án
Mở PowerShell hoặc Command Prompt tại thư mục dự án:
```powershell
cd "d:\Personal Projects\App_Personal_ExpenseManagement"
```

### Bước 2: Chạy lệnh phát triển (Dev Server)
Trên Windows, sử dụng lệnh:
```powershell
npm.cmd run dev
```
*(Hoặc `npm run dev`)*

Khi màn hình hiển thị:
```text
  VITE v6.1.0  ready in 450 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Bước 3: Mở trình duyệt
Truy cập đường dẫn: **[http://localhost:5173](http://localhost:5173)**

---


---

## 🌟 CÁC TÍNH NĂNG CHÍNH ĐỂ TRẢI NGHIỆM

1. **Quản lý Quỹ (`/wallets`)**:
   - Tạo quỹ cá nhân hoặc quỹ sinh hoạt chung.
   - Mời thành viên (User A mời User B), phân quyền `OWNER`, `EDITOR`, `VIEWER`.
   - Xem số dư thực tế tính theo công thức: `Số dư ban đầu + Thu - Chi + Điều chỉnh`.

2. **Quản lý Giao dịch (`/transactions`)**:
   - Thêm khoản chi, khoản thu, điều chỉnh số dư.
   - Ô nhập tiền tệ thông minh: Tự động định dạng dấu chấm phân cách hàng nghìn (VD: `32.000 đ`).
   - Gợi ý lý do thông minh từ lịch sử giao dịch.
   - Chuyển tiền giữa các quỹ (nguyên tử, tự động trừ quỹ nguồn và cộng quỹ đích).

3. **Báo cáo & Biểu đồ (`/reports`)**:
   - Báo cáo thu chi theo Tuần, Tháng, Năm hoặc Khoảng thời gian tùy chọn.
   - Biểu đồ xu hướng Recharts trực quan.
   - Thống kê Top 5 danh mục chi nhiều nhất và tỷ trọng chi tiêu của từng thành viên.

4. **Khu vực Quản trị Admin (`/admin`)** *(Chỉ tài khoản Admin mới thấy)*:
   - Thêm người dùng mới, sửa thông tin, đặt lại mật khẩu.
   - Khóa / Mở khóa tài khoản người dùng ngay lập tức.
   - Xem nhật ký hoạt động kiểm toán (Audit Logs) và cấu hình hệ thống.

5. **Hồ sơ cá nhân (`/profile`)**:
   - Cập nhật họ tên, đổi mật khẩu.
   - Giám sát số lượng dữ liệu đã lưu trong IndexedDB trên thiết bị.
   - Nút cưỡng bức đồng bộ với máy chủ.

6. **Kiểm tra tính năng Ngoại tuyến (Offline-First)**:
   - Nhấn `F12` trên trình duyệt -> Mở tab **Network** -> Chuyển từ `No throttling` sang **`Offline`** (hoặc tắt kết nối mạng).
   - Banner trên web sẽ chuyển sang màu vàng: **"Ngoại tuyến (Offline) - Đang lưu cục bộ"**.
   - Bạn vẫn có thể bấm **+ Thêm Giao Dịch** bình thường. Giao dịch được lưu ngay vào IndexedDB của máy.
   - Bật lại mạng (`Online`) -> Hệ thống tự động đẩy dữ liệu chờ lên máy chủ.

---

## 🛠️ CÁC LỆNH HỆ THỐNG KHÁC

- **Kiểm tra & Đóng gói sản phẩm (Production Build)**:
  ```powershell
  npm.cmd run build
  ```
- **Chạy thử bản đóng gói PWA trên máy cục bộ**:
  ```powershell
  npm.cmd run preview
  ```
  *(Truy cập: `http://localhost:4173`)*
- **Tài liệu hướng dẫn triển khai Cloudflare & Supabase**:
  Xem chi tiết tại file [docs/07-deployment-guide.md](docs/07-deployment-guide.md).
