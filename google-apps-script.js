/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: TỰ ĐỘNG THU THẬP LEAD NHÀ ĐẦU TƯ & ĐỐI TÁC (BẢO MẬT CAO)
 * Dành cho Landing Page: Princeton Academy (Hợp Tác Nhượng Quyền)
 * =========================================================================
 * 
 * CÁC LỚP BẢO MẬT TOÀN DIỆN:
 * 1. Chống Spreadsheet / Formula Injection (CWE-1236) trên toàn bộ các trường.
 * 2. Tự động nhận diện và chặn Bot Spam qua bẫy ẩn Honeypot (_hp_company).
 * 3. Giới hạn tần suất gửi (Rate Limiting) theo số điện thoại qua CacheService chống DDoS/Spam flood.
 * 4. Khóa luồng an toàn (Safe Concurrency Locking) chống Race Condition khi nhiều lead gửi đồng thời.
 * 5. Xác thực bắt buộc (Strict Validation): Yêu cầu Họ tên (>= 2 ký tự) và Số điện thoại hợp lệ (>= 9 chữ số).
 * 6. Thời gian ghi nhận chuẩn từ Server (Server-Authoritative Timestamp) chống giả mạo client.
 * 
 * HƯỚNG DẪN TRIỂN KHAI:
 * 1. Mở Google Sheet (trang tính mới), vào menu: Tiện ích mở rộng (Extensions) > Apps Script.
 * 2. Xóa hết code mặc định trong editor, dán toàn bộ nội dung file này vào và bấm icon Lưu (Save / Ctrl + S).
 * 3. Bấm "Triển khai" (Deploy) > "Tùy chọn triển khai mới" (New deployment):
 *    - Chọn loại: "Ứng dụng web" (Web app).
 *    - Mô tả: "Princeton Academy Partner Lead Form - Secured v2".
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me - email của bạn).
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 *    - Bấm "Triển khai" (Deploy) > Cấp quyền truy cập nếu Google hỏi xác thực.
 *    - Sao chép "URL ứng dụng web" (dạng https://script.google.com/macros/s/.../exec).
 * 4. Dán URL đó vào biến GOOGLE_SHEET_URL trong file assets/js/partner.js của landing page.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    // Khóa tối đa 10 giây để chống xung đột ghi dữ liệu đồng thời
    hasLock = lock.tryLock(10000);
  } catch (lockErr) {
    hasLock = false;
  }

  if (!hasLock) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: "Hệ thống đang xử lý yêu cầu khác, vui lòng thử lại sau vài giây." }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var params = {};

    // 1. Phân tích dữ liệu nhận được (hỗ trợ FormData, x-www-form-urlencoded và JSON)
    if (e && e.parameter && Object.keys(e.parameter).length > 0) {
      params = e.parameter;
    } else if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        params = {};
      }
    }

    // 2. Chống Bot Spam: Bẫy Honeypot (_hp_company)
    // Nếu trường ẩn này có dữ liệu, đó chắc chắn là bot tự động điền -> trả về success giả lập nhưng không ghi vào sheet
    if (params._hp_company && String(params._hp_company).trim().length > 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: "success", note: "bot filtered" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Chuẩn hóa và làm sạch dữ liệu đầu vào (Chống Formula Injection CWE-1236)
    var name = sanitizeForSheet(params.name || "", 100);
    var rawPhone = String(params.phone || "");
    var phone = sanitizePhone(rawPhone);
    var phoneDigits = rawPhone.replace(/\D/g, "");

    var formSource = sanitizeForSheet(params.formSource || (params.source || "Landing Page Đối Tác"), 100);
    var province = sanitizeForSheet(params.province || "", 100);
    var model = sanitizeForSheet(params.model || "", 100);
    var budget = sanitizeForSheet(params.budget || "", 100);
    var email = sanitizeForSheet(params.email || "", 120);
    var notes = sanitizeForSheet(params.notes || "", 500);

    // Thời gian chuẩn xác định trực tiếp từ Server (tránh client spoofing)
    var timestamp = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    // 4. Xác thực nghiêm ngặt bắt buộc: Họ tên và Số điện thoại
    if (!name || name.length < 2 || !phone || phoneDigits.length < 9 || phoneDigits.length > 15) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: "error", message: "Vui lòng cung cấp đầy đủ họ tên và số điện thoại hợp lệ." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Rate Limiting: Chống spam gửi liên tục cùng một số điện thoại trong 60 giây
    var cache = CacheService.getScriptCache();
    var rateLimitKey = "lead_cooldown_" + phoneDigits;
    if (cache.get(rateLimitKey)) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: "error", message: "Yêu cầu từ số điện thoại này đã được tiếp nhận. Vui lòng đợi 1 phút trước khi gửi lại." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // Ghi nhớ trong cache 60 giây
    cache.put(rateLimitKey, "1", 60);

    // 6. Ghi dữ liệu vào Google Sheet "Đối Tác"
    var sheet = ss.getSheetByName("Đối Tác");
    var NEW_HEADERS = [
      "Thời Gian Gửi",
      "Nguồn Form",
      "Họ & Tên Nhà Đầu Tư",
      "Số Điện Thoại",
      "Tỉnh / Thành Phố",
      "Mô Hình Quan Tâm",
      "Ngân Sách Dự Kiến",
      "Email",
      "Ghi Chú"
    ];

    if (!sheet) {
      sheet = ss.insertSheet("Đối Tác");
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    // Trường hợp 1: Sheet hoàn toàn mới hoặc chưa có tiêu đề
    if (lastRow === 0 || lastCol === 0) {
      sheet.appendRow(NEW_HEADERS);
      formatHeader(sheet, NEW_HEADERS.length);
    } else if (lastRow === 1) {
      // Trường hợp 2: Sheet chỉ mới có dòng tiêu đề cũ (chưa có dòng dữ liệu nào)
      var firstRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      if (firstRow.indexOf("Nguồn Form") === -1) {
        sheet.getRange(1, 1, 1, NEW_HEADERS.length).setValues([NEW_HEADERS]);
        formatHeader(sheet, NEW_HEADERS.length);
      }
    }

    // Đọc hàng tiêu đề hiện tại để phân phối dữ liệu đúng cột
    var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var hasSourceCol = currentHeaders.indexOf("Nguồn Form") !== -1;
    var hasBudgetCol = currentHeaders.indexOf("Ngân Sách Dự Kiến") !== -1;

    if (hasSourceCol && hasBudgetCol) {
      // Ghi theo cấu trúc 9 cột chuẩn mới
      sheet.appendRow([
        timestamp,
        formSource,
        name,
        phone,
        province,
        model,
        budget,
        email,
        notes
      ]);
    } else {
      // Tương thích ngược nếu sheet cũ đã có sẵn nhiều dòng dữ liệu từ trước
      sheet.appendRow([
        timestamp,
        name,
        phone,
        email,
        province,
        model || budget || "",
        "[" + formSource + "] " + (budget ? "Ngân sách: " + budget + " | " : "") + notes
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    if (hasLock) {
      try {
        lock.releaseLock();
      } catch (err) {}
    }
  }
}

/**
 * Phòng chống Formula Injection (CWE-1236), lọc ký tự điều khiển và giới hạn độ dài ký tự
 */
function sanitizeForSheet(value, maxLen) {
  if (value === null || value === undefined) return "";
  var str = String(value).trim();
  // Loại bỏ các ký tự điều khiển ASCII ẩn
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (maxLen && str.length > maxLen) {
    str = str.substring(0, maxLen);
  }
  // Nếu ký tự đầu là một trong các toán tử công thức (=, +, -, @, tab, newline), thêm dấu ' phía trước
  if (/^[=+@\-\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Chuẩn hóa số điện thoại: loại bỏ ký tự rác, giới hạn độ dài, giữ số 0 đầu
 */
function sanitizePhone(phone) {
  if (!phone) return "";
  var str = String(phone).replace(/[^\d+()\s.-]/g, "").trim();
  if (str.length > 25) str = str.substring(0, 25);
  // Thêm nháy đơn để không bị mất số 0 đầu và chống formula injection
  return str ? "'" + str : "";
}

/**
 * Định dạng hàng tiêu đề theo phong cách nhận diện Princeton Academy (Màu vàng Gold)
 */
function formatHeader(sheet, numCols) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#C89D35"); // Màu vàng Gold Princeton
  headerRange.setFontColor("#FFFFFF");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 160); // Thời Gian Gửi
  sheet.setColumnWidth(2, 220); // Nguồn Form
  sheet.setColumnWidth(3, 200); // Họ & Tên Nhà Đầu Tư
  sheet.setColumnWidth(4, 150); // Số Điện Thoại
  sheet.setColumnWidth(5, 180); // Tỉnh / Thành Phố
  sheet.setColumnWidth(6, 220); // Mô Hình Quan Tâm
  sheet.setColumnWidth(7, 200); // Ngân Sách Dự Kiến
  sheet.setColumnWidth(8, 180); // Email
  sheet.setColumnWidth(9, 300); // Ghi Chú
}

function doGet(e) {
  return ContentService
    .createTextOutput("Princeton Academy Partner Lead Web App is active!")
    .setMimeType(ContentService.MimeType.TEXT);
}
