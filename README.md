# EasyReading - Học Tiếng Anh qua Đọc Sách Tóm Tắt bằng AI

EasyReading là nền tảng học tiếng Anh độc đáo kết hợp giữa đọc sách tóm tắt theo nhiều trình độ và ôn luyện từ vựng qua phương pháp lặp lại ngắt quãng (Spaced Repetition System - SRS) tương tự như Anki.

Hệ thống được cấu trúc dưới dạng **Monorepo** sử dụng **Turborepo** để dễ dàng chia sẻ mã nguồn, kiểu dữ liệu giữa Web (Next.js), Backend (NestJS), và ứng dụng di động trong tương lai (React Native Expo).

---

## 🚀 Công Nghệ Sử Dụng (Tech Stack)

* **Monorepo Manager**: Turborepo & npm Workspaces
* **Frontend (Web)**: Next.js 14+ (App Router) & TypeScript
* **Backend (API)**: NestJS & TypeScript
* **Database & Auth**: Supabase (PostgreSQL)
* **AI Engine**: Google Gemini API (Gemini 1.5 Flash) thông qua Google AI SDK
* **CSS Styling**: Vanilla CSS (tối ưu hóa hiệu năng, giao diện cao cấp hiện đại)

---

## 📁 Cấu Trúc Thư Mục Dự Án (Monorepo Structure)

```text
easy-reading-monorepo/
├── apps/
│   ├── web/                  # Dự án Frontend Next.js (Web App & Admin Panel)
│   │   ├── src/app/          # Các trang UI (Reader, Library, SRS, Admin Dashboard)
│   │   └── package.json
│   └── api/                  # Dự án Backend NestJS
│       ├── src/              # Các Modules (Auth, Books, Vocab, SRS, AI)
│       └── package.json
├── packages/
│   ├── shared/               # Thư viện dùng chung (types, interfaces, DTOs)
│   │   ├── src/types.ts      # Định nghĩa kiểu dữ liệu dùng chung (Book, Chapter, Flashcard)
│   │   └── package.json
│   └── tsconfig/             # Cấu hình TypeScript mẫu dùng chung
├── package.json              # File định nghĩa root workspace
├── turbo.json                # Cấu hình Turborepo
└── README.md                 # Tài liệu hướng dẫn này
```

---

## 🗄️ Thiết Kế Database (Supabase PostgreSQL Schema)

Dưới đây là cấu trúc bảng cốt lõi trong cơ sở dữ liệu:

### 1. Bảng `books` (Thông tin sách)
* `id`: UUID (Primary Key)
* `title`: VARCHAR(255) (Tiêu đề sách)
* `author`: VARCHAR(255) (Tác giả)
* `cover_url`: TEXT (Đường dẫn ảnh bìa sách)
* `description`: TEXT (Mô tả ngắn về sách)
* `created_at`: TIMESTAMP WITH TIME ZONE

### 2. Bảng `chapters` (Nội dung tóm tắt theo chương)
* `id`: UUID (Primary Key)
* `book_id`: UUID (Foreign Key trỏ đến `books.id` ON DELETE CASCADE)
* `chapter_number`: INT (Số thứ tự chương)
* `title`: VARCHAR(255) (Tiêu đề chương)
* `summary_a1_a2`: TEXT (Nội dung tóm tắt mức độ Dễ)
* `summary_b1_b2`: TEXT (Nội dung tóm tắt mức độ Trung bình)
* `summary_c1_c2`: TEXT (Nội dung tóm tắt mức độ Khó)
* `created_at`: TIMESTAMP WITH TIME ZONE

### 3. Bảng `vocabularies` (Kho từ vựng của User)
* `id`: UUID (Primary Key)
* `user_id`: UUID (Mã người dùng từ Supabase Auth)
* `word`: VARCHAR(100) (Từ vựng lưu lại)
* `translation`: VARCHAR(255) (Nghĩa tiếng Việt)
* `definition`: TEXT (Định nghĩa tiếng Anh)
* `sentence_context`: TEXT (Đoạn văn ngữ cảnh chứa từ đó trong chương sách)
* `created_at`: TIMESTAMP WITH TIME ZONE

### 4. Bảng `flashcards` (Tiến trình ôn tập SRS của từ vựng)
* `id`: UUID (Primary Key)
* `user_id`: UUID (Mã người dùng)
* `vocabulary_id`: UUID (Foreign Key trỏ đến `vocabularies.id` ON DELETE CASCADE)
* `interval`: INT (Số ngày chờ cho lần ôn tập tiếp theo, mặc định 1)
* `repetition`: INT (Số lần trả lời đúng liên tiếp, mặc định 0)
* `ease_factor`: FLOAT (Hệ số độ khó, mặc định 2.5)
* `next_review_date`: TIMESTAMP WITH TIME ZONE (Thời gian ôn tập tiếp theo)

---

## 🛠️ Cấu Hình Môi Trường (Environment Variables)

### 1. Backend (`/apps/api/.env`)
```env
PORT=3001
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key # Cần thiết để bypass RLS khi Admin cập nhật hệ thống
GEMINI_API_KEY=your-gemini-api-key # Từ Google AI Studio (Gói Free)
```

### 2. Frontend (`/apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 💻 Hướng Dẫn Cài Đặt và Chạy Dự Án

### Bước 1: Clone dự án và cài đặt dependencies ở thư mục gốc
Tại thư mục gốc của Monorepo, chạy lệnh:
```bash
npm install
```

### Bước 2: Setup Database trên Supabase
1. Tạo một dự án mới trên [Supabase](https://supabase.com/).
2. Vào **SQL Editor** và chạy các câu lệnh tạo bảng tương ứng với thiết kế Database ở trên.
3. Kích hoạt **Row Level Security (RLS)** trên bảng `vocabularies` và `flashcards` với policy:
   * `auth.uid() = user_id` (Chỉ người dùng sở hữu mới có quyền Read/Write).

### Bước 3: Chạy chế độ phát triển (Development Mode)
Turborepo sẽ chạy song song cả Next.js và NestJS cùng lúc bằng một lệnh duy nhất:
```bash
npm run dev
```
* **Frontend Web** sẽ chạy tại: `http://localhost:3000`
* **Backend API** sẽ chạy tại: `http://localhost:3001`

---

## 🔄 Quy Trình Nghiệp Vụ Cốt Lõi (Core Workflows)

### 1. Luồng Upload Sách của Admin:
1. Admin tải file sách (EPUB/PDF) lên qua trang `/admin`.
2. NestJS Backend nhận file, trích xuất văn bản thô theo chương.
3. Backend gửi nội dung từng chương tới **Gemini 1.5 Flash** với Prompt yêu cầu tóm tắt và viết lại ở 3 cấp độ học thuật (A1-C2).
4. Lưu 3 nội dung tóm tắt này vào bảng `chapters` trong database.
5. **Ngay lập tức xóa file sách gốc khỏi bộ nhớ tạm của server** để bảo mật và tiết kiệm dung lượng.

### 2. Luồng Học của Người Dùng:
1. Người dùng mở trang sách, chọn chương muốn đọc.
2. Trình đọc sách tải trước cả 3 bản tóm tắt và hiển thị 3 tab tương ứng (`A1-A2` | `B1-B2` | `C1-C2`).
3. Người dùng chuyển qua lại các tab để đọc một cách linh hoạt.
4. Nhấn đúp hoặc bôi đen từ mới để hiện pop-up tra nghĩa và bấm **"Lưu Từ Vựng"** để thêm vào kho từ học qua thuật toán lặp lại ngắt quãng (Anki).
