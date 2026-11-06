# Princeton Academy — Partner Landing Page

Landing page độc lập dành cho chương trình hợp tác nhượng quyền mầm non quốc tế Princeton Academy.

Trang gồm: hero + form nhận Franchise Kit, 04 lợi thế đầu tư, di sản giáo dục 2018, chương trình PEAK & ECT, 03 mô hình đầu tư, 06 đặc quyền, quy trình 06 bước dạng zigzag có animation và form CTA cuối trang.

## Cấu trúc

```text
princeton-academy-partner/
├─ index.html
├─ api/
│  └─ lead.js             # Serverless proxy gửi lead tới Google Apps Script
├─ assets/
│  ├─ css/
│  │  ├─ styles.css       # Style thương hiệu dùng chung
│  │  └─ partner.css      # Style riêng cho trang đối tác
│  ├─ js/
│  │  └─ partner.js       # Menu, form, modal, animation lộ trình
│  ├─ img/                # Ảnh cơ sở, lớp học, đội ngũ
│  └─ logo/               # Logo Princeton Academy
├─ serve.js               # Static server chạy local
├─ package.json
├─ vercel.json
└─ README.md
```

> Google Apps Script dùng chung được lưu duy nhất tại `../google-apps-script.js`
> (repo landing page Phụ huynh), tránh 2 bản script bị lệch nhau.

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

- Hai form (hero và CTA cuối trang) gửi về `/api/lead` (serverless proxy trong `api/lead.js`).
- Proxy chuyển tiếp dữ liệu tới Google Apps Script dùng chung qua biến môi trường `GOOGLE_APPS_SCRIPT_URL`.
- Trường `formType` gửi kèm là `Đối Tác`; script tự route vào tab `Đối Tác` của Google Sheet chung.
- Cần cấu hình trên Vercel:
  - `GOOGLE_APPS_SCRIPT_URL`: URL Web App Apps Script dùng chung.
  - (Tùy chọn) `LEAD_SECRET_TOKEN`: token bí mật, phải trùng với Script Properties của Apps Script.
- Nếu cần đổi cột dữ liệu, sửa `google-apps-script.js` ở repo gốc rồi deploy phiên bản mới.

## Ghi chú

- Tailwind CSS, Google Fonts và Font Awesome được tải qua CDN.
- Khi sửa `partner.css` / `partner.js`, tăng tham số `?v=` tương ứng trong `index.html` để tránh cache cũ.
- Project này là repo riêng; mọi thay đổi cần commit/push tại `princeton-academy-partner` để Vercel deploy lại.
- Project được tách từ landing page tổng của Princeton Academy; bản gốc vẫn giữ nguyên trong `E:\Work\landingpage`.
