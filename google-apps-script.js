/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: TỰ ĐỘNG THU THẬP LEAD VÀO GOOGLE SHEETS
 * Dành cho Landing Page: Princeton Academy (Phụ Huynh & Đối Tác)
 * =========================================================================
 * 
 * HƯỚNG DẪN 3 BƯỚC TRIỂN KHAI:
 * 1. Mở Google Sheet (trang tính mới), vào menu: Tiện ích mở rộng (Extensions) > Apps Script.
 * 2. Xóa hết code mặc định, dán toàn bộ nội dung file này vào và bấm icon Lưu (Save / Ctrl + S).
 * 3. Bấm "Triển khai" (Deploy) > "Tùy chọn triển khai mới" (New deployment):
 *    - Chọn loại: "Ứng dụng web" (Web app).
 *    - Mô tả: "Princeton Academy Lead Form".
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me - email của bạn).
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 *    - Bấm "Triển khai" (Deploy) > Cấp quyền truy cập nếu Google hỏi.
 *    - Sao chép "URL ứng dụng web" (dạng https://script.google.com/macros/s/.../exec).
 * 4. Dán URL đó vào biến GOOGLE_SHEET_URL trong file assets/js/main.js của landing page.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Khóa 10 giây để chống xung đột ghi dữ liệu đồng thời nếu nhiều người bấm cùng lúc
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var params = {};

    // 1. Phân tích dữ liệu nhận được (hỗ trợ cả FormData, x-www-form-urlencoded và JSON)
    if (e && e.parameter && Object.keys(e.parameter).length > 0) {
      params = e.parameter;
    } else if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        params = {};
      }
    }

    var formType = params.formType || (params.type === 'partner' ? 'Đối Tác' : 'Phụ Huynh');
    var timestamp = params.createdAt || Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    // =====================================================================
    // TRƯỜNG HỢP 1: LEAD ĐỐI TÁC & NHÀ ĐẦU TƯ
    // =====================================================================
    if (formType === 'Đối Tác' || params.type === 'partner') {
      var sheetPartner = ss.getSheetByName("Đối Tác");
      if (!sheetPartner) {
        sheetPartner = ss.insertSheet("Đối Tác");
        var headersPartner = [
          "Thời Gian Gửi", 
          "Họ & Tên Đại Diện", 
          "Số Điện Thoại", 
          "Email Doanh Nghiệp", 
          "Tỉnh / Thành Phố", 
          "Mô Hình Dự Kiến", 
          "Ghi Chú Mặt Bằng / Quy Mô"
        ];
        sheetPartner.appendRow(headersPartner);
        var headerRangePartner = sheetPartner.getRange(1, 1, 1, headersPartner.length);
        headerRangePartner.setFontWeight("bold");
        headerRangePartner.setBackground("#C89D35"); // Màu vàng Gold Princeton
        headerRangePartner.setFontColor("#FFFFFF");
        headerRangePartner.setHorizontalAlignment("center");
        sheetPartner.setFrozenRows(1);
        
        // Căn độ rộng cột đẹp mắt
        sheetPartner.setColumnWidth(1, 160);
        sheetPartner.setColumnWidth(2, 200);
        sheetPartner.setColumnWidth(3, 140);
        sheetPartner.setColumnWidth(4, 200);
        sheetPartner.setColumnWidth(5, 180);
        sheetPartner.setColumnWidth(6, 260);
        sheetPartner.setColumnWidth(7, 300);
      }

      sheetPartner.appendRow([
        timestamp,
        params.name || '',
        params.phone ? "'" + params.phone : '', // Thêm nháy đơn để không bị mất số 0 đầu
        params.email || '',
        params.province || '',
        params.model || '',
        params.notes || ''
      ]);

    // =====================================================================
    // TRƯỜNG HỢP 2: LEAD PHỤ HUYNH ĐĂNG KÝ THAM QUAN
    // =====================================================================
    } else {
      var sheetParent = ss.getSheetByName("Phụ Huynh");
      if (!sheetParent) {
        sheetParent = ss.insertSheet("Phụ Huynh");
        var headersParent = [
          "Thời Gian Gửi", 
          "Họ & Tên Phụ Huynh", 
          "Số Điện Thoại", 
          "Độ Tuổi Bé", 
          "Email Liên Hệ", 
          "Cơ Sở Quan Tâm", 
          "Ghi Chú Gửi Trường"
        ];
        sheetParent.appendRow(headersParent);
        var headerRangeParent = sheetParent.getRange(1, 1, 1, headersParent.length);
        headerRangeParent.setFontWeight("bold");
        headerRangeParent.setBackground("#8C1823"); // Màu đỏ Crimson Princeton
        headerRangeParent.setFontColor("#FFFFFF");
        headerRangeParent.setHorizontalAlignment("center");
        sheetParent.setFrozenRows(1);

        // Căn độ rộng cột đẹp mắt
        sheetParent.setColumnWidth(1, 160);
        sheetParent.setColumnWidth(2, 200);
        sheetParent.setColumnWidth(3, 140);
        sheetParent.setColumnWidth(4, 150);
        sheetParent.setColumnWidth(5, 200);
        sheetParent.setColumnWidth(6, 280);
        sheetParent.setColumnWidth(7, 300);
      }

      sheetParent.appendRow([
        timestamp,
        params.name || '',
        params.phone ? "'" + params.phone : '', // Thêm nháy đơn để không bị mất số 0 đầu
        params.childAge || '',
        params.email || '',
        params.campus || '',
        params.notes || ''
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

function doGet(e) {
  return ContentService
    .createTextOutput("Princeton Academy Google Apps Script Web App is active!")
    .setMimeType(ContentService.MimeType.TEXT);
}
