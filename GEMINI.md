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
   * Sau mỗi Phase, AI **bắt buộc** phải tự chạy test kiểm tra (viết unit test hoặc các file script cURL/Node.js độc lập để gửi request thực tế kiểm thử API) và báo cáo kết quả (Logs, Response JSON) cho người dùng.

3. **Xử Lý Lỗi & Không Dùng Dữ Liệu Fallback (Strict Error Handling)**:
   * **Tuyệt đối không dùng dữ liệu fallback (mock data/fallback values)** khi xảy ra lỗi kết nối Database, AI hay xác thực.
   * Khi gặp lỗi, hệ thống phải luôn ném ra **NestJS Built-in HTTP Exceptions** (như `NotFoundException`, `BadRequestException`, `InternalServerErrorException`, `UnauthorizedException`) với mã HTTP Status tương ứng để Client phát hiện và xử lý chính xác.

4. **Kiểm Tra An Toàn Thông Tin & Bảo Mật (Security Checklists)**:
   * **Bảo vệ API Keys**: Tuyệt đối không hardcode API Key của Supabase hay Gemini.
   * **Row Level Security (RLS)**: Mọi API liên quan đến người dùng phải xác thực Token (JWT từ Supabase Auth) và kiểm tra quyền sở hữu bản ghi.
   * **Kiểm soát Upload file**: Validate kích thước file, định dạng (chỉ cho phép EPUB/PDF) để tránh các cuộc tấn công mã độc.
   * **Rate Limiting**: Hạn chế số lượng request gọi AI tóm tắt từ Admin để tránh phát sinh chi phí hoặc bị block IP.

---

## 🏗️ Cấu Trúc Thư Mục NestJS Đề Xuất

Phân chia theo cấu trúc **Module-based** để dễ mở rộng và tích hợp thêm tính năng sau này:

```text
apps/api/src/
├── core/                   # Cấu hình hệ thống dùng chung
│   ├── config/             # Cấu hình env, supabase, gemini
│   ├── filters/            # Global Exception Filter (xử lý lỗi tập trung)
│   ├── guards/             # Auth Guard (xác thực token Supabase)
│   └── interceptors/       # Transform Response Interceptor
├── modules/                # Các module nghiệp vụ chính
│   ├── auth/               # Quản lý session, phân quyền người dùng
│   ├── books/              # Xử lý upload, đọc và tóm tắt sách
│   ├── vocab/              # Quản lý kho từ vựng cá nhân
│   ├── srs/                # Tính toán thuật toán lặp lại ngắt quãng SM-2
│   └── ai/                 # NestJS Service làm việc trực tiếp với Gemini 1.5 API
└── main.ts                 # Điểm khởi chạy của NestJS ứng dụng
```

---

## 🗓️ Danh Sách Giai Đoạn Phát Triển (Phase Breakdown)

### Phase 1: Setup & Core Infrastructure (Hạ tầng cốt lõi)
* [x] Thiết lập cấu hình biến môi trường (`ConfigModule`, `dotenv`).
* [x] Tạo dịch vụ kết nối và tích hợp Supabase Client (`SupabaseService`).
* [x] Cấu hình Global Filters (bắt lỗi hệ thống) và Validation Pipes (tự động validate dữ liệu đầu vào).
* [x] *Kiểm tra*: Chạy thử NestJS, gọi API mẫu kiểm tra kết nối Supabase thành công.

### Phase 2: Authentication & Authorization (Xác thực & Phân quyền)
* [ ] Tạo `AuthModule` và `AuthGuard` để giải mã JWT Token gửi từ Client (Next.js / Expo Mobile).
* [ ] Thiết lập phân quyền Admin: Tạo decorator `@Roles('admin')` và `RolesGuard` để bảo vệ các route upload sách.
* [ ] *Kiểm tra*: Thử gửi request không có token, có token thường, và có token admin để xác nhận cơ chế phân quyền hoạt động đúng.

### Phase 3: Book Processing & AI Summary (Xử lý sách & Tóm tắt AI)
* [ ] Tạo endpoint cho Admin upload file EPUB/PDF.
* [ ] Viết Service đọc file tạm, trích xuất văn bản thô theo chương.
* [ ] Tạo `AIService` kết nối với Gemini 1.5 Flash (sử dụng `@google/genai` SDK).
* [ ] Thiết kế Prompt chuyên dụng để Gemini trả về JSON chứa tóm tắt 3 cấp độ (A1-A2, B1-B2, C1-C2) cho từng chương.
* [ ] Lưu trữ các bản tóm tắt chữ vào PostgreSQL và thực hiện xóa file gốc khỏi bộ nhớ tạm.
* [ ] *Kiểm tra*: Upload thử 1 file EPUB mẫu, kiểm tra dữ liệu tóm tắt được lưu trong database và kiểm tra xem file tạm đã bị xóa chưa.

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
| **Phase 1** | Setup & Core Infrastructure | ✅ Hoàn thành | Đã tích hợp Swagger UI, validation global, exception filter và Supabase connection |
| **Phase 2** | Authentication & Authorization | ⏳ Chuẩn bị | |
| **Phase 3** | Book Processing & AI Summary | ⏳ Chuẩn bị | |
| **Phase 4** | Vocabulary & Flashcard SRS | ⏳ Chuẩn bị | |
| **Phase 5** | Admin Dashboard & Statistics | ⏳ Chuẩn bị | |
