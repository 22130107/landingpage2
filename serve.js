const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3100;
const ROOT = path.resolve(__dirname);
const ROOT_WITH_SEP = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: https:; connect-src 'self' https://script.google.com https://script.googleusercontent.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://script.google.com;",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
};

const server = http.createServer((req, res) => {
  // 1. Chỉ cho phép phương thức GET và HEAD
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, SECURITY_HEADERS));
    res.end("405 Method Not Allowed");
    return;
  }

  // 2. Phân tích đường dẫn an toàn (tránh URL encoding bypass)
  let reqPath;
  try {
    reqPath = decodeURIComponent(req.url.split("?")[0]);
  } catch (err) {
    res.writeHead(400, Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, SECURITY_HEADERS));
    res.end("400 Bad Request");
    return;
  }

  // Null byte injection check
  if (reqPath.indexOf("\0") !== -1) {
    res.writeHead(400, Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, SECURITY_HEADERS));
    res.end("400 Bad Request");
    return;
  }

  if (reqPath === "/" || reqPath === "") reqPath = "/index.html";

  // 3. Chặn triệt để mọi truy cập chứa dotfile hoặc path traversal (.. hoặc tệp ẩn)
  const segments = reqPath.split(/[/\\]/);
  if (segments.some(seg => seg.length > 0 && seg.startsWith("."))) {
    res.writeHead(403, Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, SECURITY_HEADERS));
    res.end("403 Forbidden");
    return;
  }

  // 4. Nguyên tắc Cho phép Tối thiểu (Default-Deny Allowlist):
  // Trang web tĩnh này CHỈ phục vụ index.html và các tài nguyên nằm trong thư mục /assets/
  // Mọi tệp nội bộ khác (google-apps-script.js, serve.js, package.json, v.v.) bị từ chối 100%
  const isIndex = (reqPath === "/index.html");
  const isAsset = reqPath.startsWith("/assets/");
  if (!isIndex && !isAsset) {
    res.writeHead(403, Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, SECURITY_HEADERS));
    res.end("403 Forbidden");
    return;
  }

  // 5. Kiểm tra Path Traversal tuyệt đối trong thư mục gốc
  const filePath = path.resolve(ROOT, "." + reqPath);
  if (filePath !== ROOT && !filePath.startsWith(ROOT_WITH_SEP)) {
    res.writeHead(403, Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, SECURITY_HEADERS));
    res.end("403 Forbidden");
    return;
  }

  // 6. Kiểm tra sự tồn tại và loại tệp
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, SECURITY_HEADERS));
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext];

    // Chỉ phục vụ định dạng tệp nằm trong whitelist
    if (!contentType) {
      res.writeHead(403, Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, SECURITY_HEADERS));
      res.end("403 Forbidden");
      return;
    }

    const headers = Object.assign({}, SECURITY_HEADERS, { "Content-Type": contentType });
    res.writeHead(200, headers);

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\nPrinceton Academy Partner Landing Page (Secured)`);
  console.log(`Preview: http://localhost:${PORT}\n`);
});
