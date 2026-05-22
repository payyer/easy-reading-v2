# EasyReading Backend - AI Agent Rules & Progress Tracker

Tài liệu này đóng vai trò là bảng quy tắc làm việc và nhật ký theo dõi tiến độ phát triển phần Backend (NestJS) của dự án **EasyReading**. AI Agent (Gemini) bắt buộc phải tuân thủ các nguyên tắc này và cập nhật trạng thái sau mỗi giai đoạn (Phase).

---

## 🛡️ Nguyên Tắc Làm Việc Cho AI Agent

1. **Tuân Thủ Cấu Trúc & Quy Chuẩn TypeScript**:
   * Tất cả code phải sử dụng TypeScript nghiêm ngặt (Strict Mode).
   * Không sử dụng kiểu `any` trừ trường hợp bất khả kháng và có giải trình cụ thể.
   * Dữ liệu truyền nhận giữa Client và API bắt buộc phải đi qua **DTOs (Data Transfer Objects)** và được validate bằng `class-validator`.

2. **Quy Trình Kiểm Tra & Tích hợp Swagger (Verification & Swagger UI)**:
   * Tích hợp **Swagger OpenAPI** (`@nestjs/swagger`) ở địa chỉ `/api/docs` hoặc `/docs` để Admin dễ dàng kiểm tra các endpoints trực quan.
   * Tất cả các Controller và endpoint phải khai báo Swagger tags (`@ApiTags`), operation (`@ApiOperation`), và responses (`@ApiResponse`) đầy đủ.
   * **Đồng bộ Kiểu dữ liệu & Sinh code tự động (API Code Gen cho Frontend)**: Khi bắt đầu phát triển Frontend (Next.js / Expo), lập trình viên nên sử dụng các công cụ tự động hóa như `openapi-typescript` hoặc `orval` để kết nối trực tiếp đến endpoint `http://localhost:3001/api/docs-json` của Backend đang chạy. Công cụ này sẽ tự động biên dịch và sinh ra toàn bộ TypeScript types cùng các hàm gọi API (API client), giúp tiết kiệm thời gian code tay và bảo đảm đồng bộ kiểu dữ liệu tuyệt đối giữa hai phía.
   * Sau mỗi Phase, AI **bắt buộc** phải tự chạy test kiểm tra (viết unit test hoặc các file script cURL/Node.js độc lập để gửi request thực tế kiểm thử API) và báo cáo kết quả (Logs, Response JSON) cho người dùng.

3. **Xử Lý Lỗi & Không Dùng Dữ Liệu Fallback (Strict Error Handling)**:
   * **Tuyệt đối không dùng dữ liệu fallback (mock data/fallback values)** khi xảy ra lỗi kết nối Database, AI hay xác thực.
   * Khi gặp lỗi, hệ thống phải luôn ném ra **NestJS Built-in HTTP Exceptions** (như `NotFoundException`, `BadRequestException`, `InternalServerErrorException`, `UnauthorizedException`) với mã HTTP Status tương ứng để Client phát hiện và xử lý chính xác.

4. **Kiểm Tra An Toàn Thông Tin & Bảo Mật (Security Checklists)**:
   * **Bảo vệ API Keys**: Tuyệt đối không hardcode API Key của các dịch vụ bên thứ ba (như Gemini).
   * **Xác thực và Phân quyền**: Mọi API liên quan đến người dùng phải được bảo vệ bởi `AuthGuard` (xác thực mã JWT nội bộ). Logic bảo mật bản ghi được xử lý ở mức code thông qua truy vấn có điều kiện `user_id = req.user.id` để tránh truy cập trái phép.
   * **Kiểm soát Upload file**: Validate kích thước file, định dạng (chỉ cho phép EPUB) để tránh các cuộc tấn công mã độc.
   * **Rate Limiting**: Hạn chế số lượng request gọi AI tóm tắt từ Admin để tránh phát sinh chi phí hoặc bị block IP.
   * **Cấu hình Redirect URL (Production) & Email Verification**:
     * **Phía NestJS Backend**: Redirect URL cho các thao tác xác thực (Xác nhận Email đăng ký mới và Link đặt lại mật khẩu) được cấu hình động thông qua biến môi trường `FRONTEND_URL` (mặc định là `http://localhost:3000` ở môi trường phát triển). Khi deploy Production, chỉ cần cập nhật giá trị `FRONTEND_URL` thành tên miền chính thức của Frontend (ví dụ: `https://easyreading.com`).
     * **Gửi mail**: Hệ thống sử dụng `nodemailer` gửi mail xác thực/reset qua cấu hình SMTP trong `.env`. Ở môi trường local development, nếu không cấu hình các biến SMTP, hệ thống tự động in link kích hoạt/reset ra terminal console để test nhanh.

5. **Cơ Chế Đồng Bộ & Timeout của API Upload Sách**:
   * **Cơ chế xử lý**: API `POST /books/upload` được xử lý bất đồng bộ (asynchronous). Server sẽ lưu sách vào DB với trạng thái `processing` và trả về phản hồi `202 Accepted` lập tức cho client. Quá trình xử lý sách và tóm tắt từng chương bằng Gemini API sẽ được tiếp tục chạy dưới nền (background).
   * **Lưu ý Deployment (Vercel/Serverless)**: Do các nền tảng Serverless (như Vercel Hobby/Pro) sẽ đóng băng (freeze) luồng CPU ngay sau khi phản hồi HTTP được gửi đi, tiến trình chạy ngầm dưới nền sẽ bị ngắt đột ngột và sách không thể hoàn thành. Do đó, Backend NestJS bắt buộc phải được triển khai trên môi trường hỗ trợ chạy liên tục (persistent process) như VPS, Render, Railway thay vì Vercel. Phía Frontend Next.js vẫn có thể deploy lên Vercel bình thường.

---

## 🏗️ Cấu Trúc Thư Mục NestJS Đề Xuất

Phân chia theo cấu trúc **Module-based** để dễ mở rộng và tích hợp thêm tính năng sau này:

```text
apps/api/src/
├── core/                   # Cấu hình hệ thống dùng chung
│   ├── config/             # Cấu hình env, typeorm.config, gemini
│   ├── filters/            # Global Exception Filter (xử lý lỗi tập trung)
│   ├── guards/             # Auth Guard (xác thực token JWT nội bộ)
│   └── interceptors/       # Transform Response Interceptor
├── database/               # Cơ sở dữ liệu và di chuyển dữ liệu
│   └── migrations/         # Các file migration của TypeORM
├── modules/                # Các module nghiệp vụ chính
│   ├── auth/               # Quản lý tài khoản (hashing, JWT, google auth, mailer)
│   ├── books/              # Xử lý upload, đọc và tóm tắt sách
│   ├── vocab/              # Quản lý kho từ vựng cá nhân
│   ├── srs/                # Tính toán thuật toán lặp lại ngắt quãng SM-2
│   └── ai/                 # NestJS Service làm việc trực tiếp với Gemini API
└── main.ts                 # Điểm khởi chạy của NestJS ứng dụng
```

---

## 🗓️ Danh Sách Giai Đoạn Phát Triển (Phase Breakdown)

### Phase 1: Setup & Core Infrastructure (Hạ tầng cốt lõi)
* [x] Thiết lập cấu hình biến môi trường (`ConfigModule`, `dotenv`).
* [x] Cấu hình kết nối cơ sở dữ liệu PostgreSQL sử dụng TypeORM (`TypeOrmModule`).
* [x] Cấu hình Global Filters (bắt lỗi hệ thống) và Validation Pipes (tự động validate dữ liệu đầu vào).
* [x] *Kiểm tra*: Chạy thử NestJS, gọi API mẫu kiểm tra kết nối PostgreSQL thành công.

### Phase 2: Authentication & Authorization (Xác thực & Phân quyền - Auth Proxy Gateway)
* [x] Tạo `AuthModule` cùng với `AuthController`, `AuthService` và các DTOs xác thực (`RegisterDto`, `LoginDto`, `GoogleLoginDto`, `RefreshTokenDto`, `ForgotPasswordDto`, `ResetPasswordDto`).
* [x] Viết API đăng ký, đăng nhập email/password, đăng nhập Google, làm mới token (refresh token), yêu cầu quên mật khẩu, đặt lại mật khẩu mới và đăng xuất thông qua cổng NestJS proxy.
* [x] Tạo `AuthGuard` trích xuất JWT Token và xác thực thủ công nội bộ.
* [x] Thiết lập decorator `@Roles('admin')` và `RolesGuard` để bảo vệ các endpoint của Admin.
* [x] *Kiểm tra*: Thử nghiệm các API đăng ký/đăng nhập, truy cập profile yêu cầu đăng nhập, truy cập route admin-only (với token thường và token admin) để đảm bảo phân quyền hoạt động chính xác.

### Phase 3: Book Processing & AI Summary (Xử lý sách & Tóm tắt AI)
* [x] Tạo endpoint cho Admin upload file EPUB (loại bỏ PDF để đơn giản hóa cấu trúc).
* [x] Viết Service đọc file tạm, trích xuất văn bản thô theo chương.
* [x] Tạo `AIService` kết nối với Gemini (mặc định model gemini-2.5-flash, cấu hình động qua `GEMINI_MODEL`, sử dụng `@google/genai` SDK).
* [x] Thiết kế Prompt chuyên dụng để Gemini trả về JSON chứa tóm tắt 3 cấp độ (A1-A2, B1-B2, C1-C2) cho từng chương.
* [x] Lưu trữ các bản tóm tắt chữ vào PostgreSQL sử dụng TypeORM và thực hiện xóa file gốc khỏi bộ nhớ tạm.
* [x] *Kiểm tra*: Viết API xử lý bất đồng bộ ngầm dưới nền (Background Worker) kết hợp Throttle delay (4.5s) và Exponential Backoff Retry để tránh lỗi 429 Rate Limit và 504 Gateway Timeout. Thực hiện xóa file tạm và xóa sạch database nếu xảy ra lỗi giữa chừng để tránh rác DB.

### Phase 4: Vocabulary & Flashcard SRS (Học từ vựng & Lặp lại ngắt quãng)
* [ ] Tạo module quản lý từ vựng (`VocabModule`): Thêm từ mới kèm câu ngữ cảnh, xóa từ.
* [ ] Tạo module ôn tập (`SRSModule`): Lấy danh sách từ cần ôn hôm nay (dựa trên `next_review_date`).
* [ ] Lập trình thuật toán SM-2 để cập nhật lịch ôn tập (`interval`, `ease_factor`, `repetition`) dựa trên đánh giá độ nhớ của người dùng.
* [ ] *Kiểm tra*: Thực hiện lưu từ vựng mới, giả lập quy trình ôn tập nhiều lần để kiểm tra thuật toán SM-2 tính toán ngày ôn tập tiếp theo chính xác.

### Phase 5: Admin Dashboard & Statistics (Quản trị & Thống kê)
* [ ] Viết các câu truy vấn thống kê dữ liệu: số lượng người học hoạt động, top từ vựng được tra, biểu đồ số lượng ôn tập.
* [ ] Tạo các API endpoints bảo mật cho trang Dashboard.
* [ ] *Kiểm tra*: Gọi thử các endpoint thống kê và đảm bảo người dùng bình thường không thể truy cập.

---

## 📈 Tiến Độ Thực Hiện (Progress Tracking)

| Giai đoạn | Nội dung công việc | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Setup & Core Infrastructure | ✅ Hoàn thành | Đã tích hợp Swagger UI, validation global, exception filter và TypeORM PostgreSQL connection |
| **Phase 2** | Authentication & Authorization | ✅ Hoàn thành | Đã hoàn thành các endpoint, local JWT guard, DTO, mã hóa mật khẩu bcrypt, tích hợp SMTP MailService |
| **Phase 3** | Book Processing & AI Summary | ✅ Hoàn thành | Đã hoàn thành API upload sách EPUB, trích xuất text, gọi Gemini API sinh tóm tắt 3 cấp độ dưới nền ngầm (Async Background), throttle 4.5s để tránh Rate Limit, lưu trữ qua TypeORM, tự động xóa file tạm và rollback xóa dữ liệu khi có lỗi xảy ra. |
| **Phase 4** | Vocabulary & Flashcard SRS | ⏳ Chuẩn bị | |
| **Phase 5** | Admin Dashboard & Statistics | ⏳ Chuẩn bị | |
