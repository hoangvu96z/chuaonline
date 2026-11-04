# 🪷 Chùa Online 3D — Không Gian Tịnh Tâm & Tu Tập Đa Người Chơi

[![Deploy Chùa Online 3D to VPS](https://github.com/hoangvu96z/chuaonline/actions/workflows/deploy.yml/badge.svg)](https://github.com/hoangvu96z/chuaonline/actions/workflows/deploy.yml)

**Chùa Online 3D** là không gian chùa Việt Nam 3D trực tuyến nhiều người chơi thời gian thực (Real-time Multiplayer WebGL / Three.js & Socket.io), nơi quý đạo hữu thập phương có thể lễ Phật, gõ mõ tụng kinh Karaoke, dâng hương, thả đèn hoa đăng, trồng cây Bồ Đề, nuôi cá Koi phóng sinh, xin xăm đầu ngày và đàm đạo ái ngữ.

- 🌐 **Trang chủ Trực tuyến (Production Frontend):** https://chua.vunph.io.vn
- ⚡ **Máy chủ API & WebSocket (Production Backend):** https://api.vunph.io.vn

---

## ✨ Tính Năng Nổi Bật

### 1. Không Gian 3D Chùa Cổ Truyền Việt Nam (`Environment.js`)
- **🏯 Đại Hùng Bảo Điện (35 Bồ Đoàn Thiền Định — 5 Hàng × 7 Cột):**
  - Điện thờ mở rộng `40m × 27.5m` với tôn tượng **Đức Phật Bổn Sư Thích Ca Mâu Ni** tọa đài sen 3 tầng có hào quang lá Bồ Đề xoay tỏa sáng, 2 tôn tượng phù điêu đá chạm nổi hai bên cùng **Bảng Vàng Tịnh Tâm** và **Bảng Pháp Ngữ**.
  - **35 chỗ ngồi Bồ Đoàn** thêu hoa văn cánh sen đặt trên chiếu vuông đỏ viền vàng kim dành cho các đạo hữu thật đang online trong Đạo Tràng.
- **🪔 Lư Hương Đồng Chạm Rồng Nổi Ngoài Thềm Chánh Điện:**
  - Đặt trang nghiêm trên bệ đá trước bậc tam cấp Chánh Điện, điêu khắc 3D chi tiết theo mẫu **Đỉnh Đồng Tam Sự Cổ Truyền**: đế đồng tròn chạm Dơi Ngũ Phúc & 3 chân đế quỳ, 3 chân đỉnh uốn cong chữ S chạm mặt Hổ Phù, đôi tai mây xoắn ốc Như Ý và **Rồng Chạm Nổi 3D** uốn lượn chầu Viên Ngọc Lửa.
- **🙏 Đài Quán Thế Âm Bồ Tát & Hòn Non Bộ:** Tôn tượng Bạch Y Quán Thế Âm đứng trên đài sen giữa hồ nước, tay cầm bình cam lộ và nhành dương liễu.
- **😄 Đài Phật Di Lặc Hoan Hỷ:** Tôn tượng Phật Di Lặc ngồi tự tại khoác y lụa vàng, tay phải đặt trên túi vải bố đại Càn Khôn vàng đỏ, tay trái đặt trên đầu gối chống cao, gương mặt cười hoan hỷ phúc hậu.
- **🔱 Đài Địa Tạng Vương Bồ Tát (Nguyên Mẫu Điêu Khắc Phúc Đan 3D):**
  - Ngồi kiết già trên Đài Sen 3 tầng (đế tròn, chuỗi hạt liên châu, cánh sen úp và 2 lớp cánh sen ngửa dày dặn).
  - Đội **Mão Tỳ Lư Ngũ Phật** 5 cánh chạm nổi hình Phật nhỏ cùng chóp búp sen và 2 dải phướn rủ dọc qua vai xuống ngực.
  - Tay phải nâng trước ngực cầm **Tích Trượng nghiêng chéo** chạm hoa văn mây xoắn đối xứng 6 vòng khoen; tay trái đặt giữa lòng nâng **Viên Minh Châu tỏa lửa Tam Muội**.
- **☸️ Bảo Tháp Xá Lợi 7 Tầng:** Kiến trúc tháp bát giác 7 tầng mái đao cong vút với bảo hồ lô vàng trên đỉnh.
- **🌱 Vườn Bồ Đề Công Đức (Nền Đất Vuông):** Khu vườn đất vuông có rào đá, nơi đạo hữu tự tay trồng và tưới nước các cây Bồ Đề mang tên Pháp Danh của mình.
- **🔔 Lầu Chuông Đại Hồng Chung & 🪷 Hồ Sen Phóng Sinh:** Gõ Đại Hồng Chung bằng chày kình gỗ ngoài sân chùa, thả đèn Hoa Đăng cầu nguyện và rải thức ăn nuôi đàn 12 chú Cá Chép Koi bơi lội dưới hồ.

---

### 2. Nhân Vật Chibi Đạo Hữu Đáng Yêu (`AvatarManager.js`)
- Thiết kế tỉ lệ **Chibi dễ thương** với 4 pháp phục tùy chỉnh:
  - **Cư Sĩ Áo Lam** (Tóc búi tròn đen bóng, tràng hạt cổ, dải lụa vàng chéo vai).
  - **Chư Tăng Áo Cà Sa** (Chú tiểu đầu tròn bóng có 6 chấm giới hương, y cà sa trang nghiêm).
  - **Phật Tử Áo Tràng** (Tóc búi đôi hai bên đính nơ vàng).
  - **Hành Giả Liên Hoa** (Mũ búp sen vàng kim).
- Chỉ hiển thị **đúng những người chơi thật đang online** trong phòng (`Đạo Tràng 1 (X/60)`), đồng bộ chuyển động mượt mà ở 60 FPS cùng bảng tên Pháp Danh & Cấp Cảnh Giới.

---

### 3. Tụng Kinh Karaoke 4 Giọng Đọc & Đài Nhạc Thiền / YouTube
- **12 Bộ Kinh Phật Giáo Chính Thống (`sutras.js`):** Bát Nhã Tâm Kinh, Chú Đại Bi, Kinh Từ Bi (Metta Sutta), Kinh Phước Đức, Kinh Pháp Cú, Sám Hối Sáu Căn, Niệm Phật A Di Đà...
- **Tụng Kinh Karaoke & Xử Lý Lặp Câu (`SutraChanter.js` & `DharmaVoice.js`):**
  - Hỗ trợ **Tạm dừng / Tiếp tục (`⏸️ Tạm Dừng`)** và **4 giọng đọc Pháp Âm** (*Thầy Trầm Ấm*, *Sư Cô Thanh Nhã*, *Chú Tiểu Minh Tâm*, *Cư Sĩ Điềm Đạm*).
  - Tự động nhận diện các câu kinh có hậu tố `(3 lần)` để đọc lặp lại toàn bộ câu kinh đủ 3 lần thay vì đọc nguyên chữ `"3 lần"`.
- **Đài Nhạc Thiền & YouTube (`ZenMusicPlayer.js`):** Tích hợp 5 bản nhạc thiền Web Audio API tổng hợp và trình phát nhạc tịnh tâm trực tiếp từ link YouTube.

---

### 4. Phòng Chat Đạo Tràng Ái Ngữ & Kiến Trúc Đa Người Chơi Chịu Tải Cao
- **Auto Room Sharding (`RoomManager.js`):** Tự động phân luồng tối đa **60 đạo hữu / Đạo Tràng** (`chanh-dien-1`, `chanh-dien-2`...) và phát gói tin đồng bộ vị trí nén ở tần suất `10Hz` (`100ms/tick`).
- **Đạo Tràng Ái Ngữ (`chatFilter.js`):** Chat thời gian thực giữa các đạo hữu trong cùng phòng kèm bong bóng thoại 3D trên đầu nhân vật và bộ lọc tự động quét từ nhạy cảm.
- **Write-Behind Merit Batcher (`MeritBatcher.js`):** Cộng dồn Công Đức trên RAM và ghi gộp xuống PostgreSQL mỗi 30 giây (`UNNEST` batch update), kết hợp bảng xếp hạng **63 Tỉnh Thành Việt Nam** và **9 Cảnh Giới Tu Tập**.

---

## ⌨️ Phím Tắt Nhanh (Keyboard Quick Actions)

| Phím tắt | Pháp khí / Hành động | Công Đức | Mô tả |
| :---: | :--- | :---: | :--- |
| **`L`** | 🙏 **Lạy Phật / Bồ Tát** | `+5` (`x2` Đại Chúng) | Lạy Ngũ Thể Đầu Địa tại Chánh Điện hoặc Đài Quán Âm / Di Lặc / Địa Tạng / Bảo Tháp |
| **`M`** | 🪵 **Gõ Mõ** | `+1` (`x2` Đại Chúng) | Ngồi Bồ Đoàn trong Chánh Điện gõ Mõ Tụng Kinh |
| **`K`** | 📖 **Tụng Kinh** | `+3`/câu, `+30` viên mãn | Mở Tạng Kinh Phật Giáo & Trì Tụng Karaoke |
| **`C`** | 🔔 **Gõ Chuông** | `+2` | Ra Lầu Chuông ngoài Sân Chùa thỉnh Đại Hồng Chung |
| **`T`** | 🌱 **Trồng Cây** | `+8` | Trồng & tưới nước Cây Bồ Đề Công Đức tại Vườn Lâm Tỳ Ni |
| **`N`** | 🐟 **Nuôi Cá** | `+6` | Rải thức ăn nuôi đàn Cá Chép Koi tại Hồ Phóng Sinh |
| **`Q`** | 🧹 **Quét Sân** | `+5` | Quét lá đa rụng ngoài sân chùa giữ chùa thanh tịnh |
| **`H`** | 🪔 **Dâng Hương** | `+10` | Dâng nén tâm hương lên Lư Hương Đồng Chạm Rồng ngoài thềm |
| **`D`** | 🪷 **Thả Hoa Đăng** | `+10` | Thả đèn hoa đăng cầu nguyện trên Hồ Sen |
| **`X`** | 🎋 **Xin Xăm** | Cát tường | Lắc ống xăm đầu ngày nhận quẻ thơ Chánh Pháp |
| **`P`** | 🎵 **Nhạc Thiền** | Tịnh tâm | Mở Đài Nhạc Thiền & Phát nhạc YouTube |
| **`B`** | 🏆 **Bảng Công Đức** | 63 Tỉnh Thành | Xem Bảng Vàng Công Đức 63 Tỉnh Thành & Thập Phương |
| **`Space`** | ⚡ **Nhịp Mõ / Chuông** | `+1` / `+2` | Gõ Mõ (khi ở trong Chánh Điện) hoặc Thỉnh Chuông (khi ở ngoài Sân Chùa) |

---

## 🛠️ Cấu Trúc Thư Mục

```text
chuaonline/
├── .github/workflows/
│   └── deploy.yml                # GitHub Actions CI/CD tự động test, build & deploy lên VPS
├── backend/
│   ├── src/
│   │   ├── config/db.js          # Kết nối PostgreSQL + In-Memory Fallback tự động
│   │   ├── services/
│   │   │   ├── RoomManager.js    # Auto Room Sharding (60 CCU/phòng) & quản lý lá đa, cây Bồ Đề, chat
│   │   │   ├── MeritBatcher.js   # Write-Behind Batching (30s flush) & 9 Cảnh Giới Tu Tập
│   │   │   └── GlobalScheduler.js# Lịch Thời Khóa Đại Chúng Đồng Vọng (x2 Công Đức)
│   │   └── index.js              # Express REST API + Socket.io Server
│   └── test/
│       └── temple.test.js        # 25 bài kiểm thử tự động (Unit + E2E Socket.io & Concurrency)
└── frontend/
    ├── index.html                # Giao diện HUD Glassmorphism, Modals (<dialog>) & Popover API
    └── src/
        ├── audio/                # ZenAudio (Web Audio API), DharmaVoice (TTS), SutraChanter, ZenMusicPlayer
        ├── data/sutras.js        # 12 Bộ Kinh, 9 Cảnh Giới, 63 Tỉnh Thành Việt Nam
        ├── network/SocketClient.js # Kết nối Socket.io thời gian thực
        ├── utils/chatFilter.js   # Bộ lọc từ nhạy cảm Đạo Tràng Ái Ngữ
        ├── world/
        │   ├── TempleScene.js    # Three.js Scene, Camera Orbit, Chu kỳ Ngày / Đêm & Ánh sáng
        │   ├── Environment.js    # Kiến trúc Chánh Điện 35 chỗ ngồi, Lư Hương Đồng, Tượng Phật & Cảnh quan 3D
        │   ├── AvatarManager.js  # Nhân vật Chibi 3D, Nghi lễ Quỳ Lạy & Bong bóng Chat 3D
        │   └── Interactables.js  # Raycasting tương tác lá đa, hoa đăng, bồ đoàn
        └── main.js               # Bộ điều khiển ứng dụng trung tâm
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Thử Local

### Yêu cầu hệ thống
- **Node.js** `>= 20.x`
- **PostgreSQL** *(Tùy chọn — nếu không cấu hình `DATABASE_URL`, Backend sẽ tự động chạy ở chế độ **In-Memory Fallback Mode** đầy đủ tính năng)*.

### 1. Khởi chạy Backend (`port 3001`)
```bash
cd backend
npm install
npm start
```

### 2. Khởi chạy Frontend (`port 5173`)
```bash
cd frontend
npm install
npm run dev
```
Sau đó mở trình duyệt tại địa chỉ: `http://localhost:5173`.

### 3. Chạy Bộ Kiểm Thử Tự Động (25 E2E & Unit Tests)
```bash
cd backend
npm test
```

---

## 🔄 Triển Khai Tự Động (GitHub Actions CI/CD)

Mỗi khi push lên nhánh `main`, workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) sẽ tự động:
1. Chạy toàn bộ **25 bài kiểm thử tự động** (`backend/test/temple.test.js`) và kiểm tra đóng gói Production (`vite build`).
2. Kết nối SSH tới máy chủ VPS, đồng bộ mã nguồn mới nhất từ `origin/main`, build bản phân phối Frontend (`frontend/dist`) và khởi động lại dịch vụ Backend qua **PM2** (`pm2 restart chua-online-backend`).
