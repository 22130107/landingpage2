# Princeton Academy — Partner Landing Page

Landing page độc lập dành cho chương trình hợp tác nhượng quyền mầm non quốc tế Princeton Academy.

Trang gồm: hero + form nhận Franchise Kit, 04 lợi thế đầu tư, di sản giáo dục 2018, chương trình PEAK & ECT, 03 mô hình đầu tư, 06 đặc quyền, quy trình 06 bước dạng zigzag có animation và form CTA cuối trang.

## Cấu trúc

```text
princeton-academy-partner/
├─ index.html
├─ assets/
│  ├─ css/
│  │  ├─ styles.css       # Style thương hiệu dùng chung
│  │  └─ partner.css      # Style riêng cho trang đối tác
│  ├─ js/
│  │  └─ partner.js       # Menu, form, modal, animation lộ trình
│  ├─ img/                # Ảnh cơ sở, lớp học, đội ngũ
│  └─ logo/               # Logo Princeton Academy
├─ google-apps-script.js  # Mã backend Google Apps Script (tham khảo)
├─ serve.js               # Static server chạy local
├─ package.json
├─ vercel.json
└─ README.md
```

## Chạy local

Yêu cầu Node.js 18+.

```bash
npm start
```

Mở `http://localhost:3100`.

Có thể đổi cổng bằng biến môi trường:

```bash
# PowerShell
$env:PORT=8080; npm start
```

## Deploy

Đây là static site, có thể deploy trực tiếp thư mục này lên Vercel, Netlify, Cloudflare Pages hoặc bất kỳ static hosting nào. Cấu hình bảo mật/cache mẫu cho Vercel nằm trong `vercel.json`.

## Form & dữ liệu lead

- Hai form (hero và CTA cuối trang) gửi về Google Apps Script endpoint khai báo trong `assets/js/partner.js` (`GOOGLE_SHEET_URL`).
- Trường `formType` gửi kèm là `Đối Tác`.
- Nếu cần đổi endpoint hoặc cột dữ liệu, xem thêm `google-apps-script.js`.

## Ghi chú

- Tailwind CSS, Google Fonts và Font Awesome được tải qua CDN.
- Khi sửa `partner.css` / `partner.js`, tăng tham số `?v=` tương ứng trong `index.html` để tránh cache cũ.
- Project được tách từ landing page tổng của Princeton Academy; bản gốc vẫn giữ nguyên trong `E:\Work\landingpage`.
