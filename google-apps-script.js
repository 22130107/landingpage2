/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: TỰ ĐỘNG THU THẬP LEAD NHÀ ĐẦU TƯ & ĐỐI TÁC
 * Dành cho Landing Page: Princeton Academy (Hợp Tác Nhượng Quyền)
 * =========================================================================
 * 
 * HƯỚNG DẪN TRIỂN KHAI:
 * 1. Mở Google Sheet (trang tính mới), vào menu: Tiện ích mở rộng (Extensions) > Apps Script.
 * 2. Xóa hết code mặc định trong editor, dán toàn bộ nội dung file này vào và bấm icon Lưu (Save / Ctrl + S).
 * 3. Bấm "Triển khai" (Deploy) > "Tùy chọn triển khai mới" (New deployment):
 *    - Chọn loại: "Ứng dụng web" (Web app).
 *    - Mô tả: "Princeton Academy Partner Lead Form".
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me - email của bạn).
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 *    - Bấm "Triển khai" (Deploy) > Cấp quyền truy cập nếu Google hỏi xác thực.
 *    - Sao chép "URL ứng dụng web" (dạng https://script.google.com/macros/s/.../exec).
 * 4. Dán URL đó vào biến GOOGLE_SHEET_URL trong file assets/js/partner.js của landing page.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Khóa 10 giây để chống xung đột ghi dữ liệu đồng thời nếu nhiều người gửi cùng lúc
  lock.tryLock(10000);

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

    var timestamp = params.createdAt || Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
    var formSource = params.formSource || (params.source || "Landing Page Đối Tác");
    var name = params.name || "";
    var phone = params.phone ? "'" + params.phone : ""; // Thêm nháy đơn để không bị mất số 0 đầu
    var province = params.province || "";
    var model = params.model || "";
    var budget = params.budget || "";
    var email = params.email || "";
    var notes = params.notes || "";

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
    lock.releaseLock();
  }
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
