/**
 * Princeton Academy - Partner / Franchise Landing Page
 * Handles partner lead forms, model pre-selection, navigation and modal UX.
 */

const LEAD_API_URL = "/api/lead";

document.addEventListener("DOMContentLoaded", () => {
  initHeaderScroll();
  initMobileMenu();
  initBackToTop();
  initModelPreselect();
  initPartnerForms();
  initSuccessModal();
  initProcessReveal();
});

/* -------------------------------------------------------------------------
   Process timeline reveal animation
   ------------------------------------------------------------------------- */
function initProcessReveal() {
  const timeline = document.querySelector(".process-timeline");
  if (!timeline) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

  timeline.classList.add("process-anim");

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        timeline.classList.add("is-visible");
        obs.disconnect();
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
  );

  observer.observe(timeline);
}

/* -------------------------------------------------------------------------
   Google Sheets integration
   ------------------------------------------------------------------------- */
async function sendToGoogleSheet(data) {
  try {
    const body = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      body.append(key, value == null ? "" : String(value));
    });

    const response = await fetch(LEAD_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    if (!response.ok) return false;

    const result = await response.json();
    return result.result === "success";
  } catch (error) {
    console.error("Không thể gửi dữ liệu tới Lead API:", error);
    return false;
  }
}

/* -------------------------------------------------------------------------
   Partner forms
   ------------------------------------------------------------------------- */
let selectedModelSource = null;

const COOLDOWN_KEY = "_pa_partner_cooldown";
const COOLDOWN_MS = 10000; // 10 giây giữa 2 lần gửi

function initPartnerForms() {
  const heroForm = document.getElementById("hero-partner-form");
  const finalForm = document.getElementById("final-partner-form");

  if (heroForm) {
    heroForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Bẫy Honeypot chống bot tự động spam
      const hp = valueOf("hero-company-hp");
      if (hp) {
        heroForm.reset();
        showPartnerModal("Đăng Ký Nhận Franchise Kit Thành Công!", "Yêu cầu của Quý nhà đầu tư đã được tiếp nhận.");
        return;
      }

      // Kiểm tra cooldown chống gửi liên tục
      const lastSubmit = parseInt(sessionStorage.getItem(COOLDOWN_KEY) || "0", 10);
      if (Date.now() - lastSubmit < COOLDOWN_MS) {
        alert("Quý nhà đầu tư vui lòng đợi ít giây trước khi gửi tiếp.");
        return;
      }

      const name = sanitizeInput(valueOf("hero-name"), 100);
      const rawPhone = valueOf("hero-phone");
      const phone = normalizePhoneNumber(rawPhone);
      const province = sanitizeInput(valueOf("hero-province"), 100);
      const budget = sanitizeInput(valueOf("hero-budget"), 100);

      if (!name || name.length < 2) {
        alert("Vui lòng điền họ tên đầy đủ của Quý nhà đầu tư.");
        return;
      }

      if (!isValidPhoneNumber(phone)) {
        alert("Vui lòng nhập số điện thoại hợp lệ (10 số, ví dụ 0988 284 799 hoặc +84 988 284 799).");
        return;
      }

      const payload = {
        formType: "Đối Tác",
        formSource: "Hero Form (Đầu trang)",
        name,
        phone,
        email: "",
        province,
        model: "Cần tư vấn theo ngân sách",
        budget: budget || "Chưa xác định",
        notes: `Đăng ký từ Hero Form đầu trang. Ngân sách dự kiến: ${budget || "Chưa xác định"}`
      };

      const successMessage = `Cảm ơn Quý nhà đầu tư <strong>${escapeHtml(name)}</strong>. Bộ phận Phát triển Hệ thống Princeton Academy sẽ liên hệ qua số <strong>${escapeHtml(phone)}</strong> trong 24 giờ làm việc để gửi Franchise Kit và bảng tính dòng tiền cho khu vực <strong>${escapeHtml(province || "Quý đối tác")}</strong>.`;

      const success = await handleFormSubmit(heroForm, payload, "Đăng Ký Nhận Franchise Kit Thành Công!", successMessage);
      if (success) {
        sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      }
    });
  }

  if (finalForm) {
    finalForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Bẫy Honeypot chống bot tự động spam
      const hp = valueOf("final-company-hp");
      if (hp) {
        finalForm.reset();
        showPartnerModal("Yêu Cầu Đã Được Tiếp Nhận!", "Yêu cầu của Quý đối tác đã được tiếp nhận.");
        return;
      }

      // Kiểm tra cooldown chống gửi liên tục
      const lastSubmit = parseInt(sessionStorage.getItem(COOLDOWN_KEY) || "0", 10);
      if (Date.now() - lastSubmit < COOLDOWN_MS) {
        alert("Quý đối tác vui lòng đợi ít giây trước khi gửi tiếp.");
        return;
      }

      const name = sanitizeInput(valueOf("final-name"), 100);
      const rawPhone = valueOf("final-phone");
      const phone = normalizePhoneNumber(rawPhone);
      const province = sanitizeInput(valueOf("final-province"), 100);
      const model = sanitizeInput(valueOf("final-model"), 100);

      if (!name || name.length < 2) {
        alert("Vui lòng điền họ tên đầy đủ của Quý đối tác.");
        return;
      }

      if (!isValidPhoneNumber(phone)) {
        alert("Vui lòng nhập số điện thoại hợp lệ (10 số, ví dụ 0988 284 799 hoặc +84 988 284 799).");
        return;
      }

      const formSource = selectedModelSource
        ? `Thẻ mô hình: ${selectedModelSource}`
        : "CTA Form (Cuối trang)";

      const payload = {
        formType: "Đối Tác",
        formSource,
        name,
        phone,
        email: "",
        province,
        model: model || "Chưa xác định",
        budget: "Chưa xác định",
        notes: `Đăng ký từ ${formSource}. Mô hình quan tâm: ${model || "Chưa xác định"}`
      };

      const successMessage = `Cảm ơn Quý đối tác <strong>${escapeHtml(name)}</strong>. Hồ sơ mô hình <strong>${escapeHtml(model || "đang quan tâm")}</strong> và bảng dự toán dòng tiền sẽ được Bộ phận Phát triển Hệ thống Princeton Academy gửi tới Quý đối tác qua số <strong>${escapeHtml(phone)}</strong> trong 24 giờ làm việc.`;

      const success = await handleFormSubmit(finalForm, payload, "Yêu Cầu Đã Được Tiếp Nhận!", successMessage);
      if (success) {
        sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        selectedModelSource = null;
      }
    });
  }
}

async function handleFormSubmit(form, payload, successTitle, successMessage) {
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return false;

  const originalHtml = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = "ĐANG GỬI THÔNG TIN...";

  const sent = await sendToGoogleSheet(payload);

  submitButton.disabled = false;
  submitButton.innerHTML = originalHtml;

  if (!sent) {
    alert("Kết nối đang gián đoạn. Vui lòng thử lại hoặc gọi trực tiếp hotline 0988.284.799.");
    return false;
  }

  form.reset();
  showPartnerModal(successTitle, successMessage);
  return true;
}

function valueOf(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function nowInVietnam() {
  return new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Chuẩn hóa số điện thoại Việt Nam về định dạng thống nhất 10 số (bắt đầu bằng 0)
 * Hỗ trợ các định dạng: "0988 284 799", "+84 988.284.799", "84988284799"
 */
function normalizePhoneNumber(raw) {
  if (!raw) return "";
  let clean = String(raw).replace(/[\s().-]/g, "");
  if (clean.startsWith("+84")) {
    clean = "0" + clean.slice(3);
  } else if (clean.startsWith("84") && clean.length === 11) {
    clean = "0" + clean.slice(2);
  }
  return clean;
}

/**
 * Kiểm tra định dạng số điện thoại Việt Nam hợp lệ (10 chữ số, đầu số hợp lệ của VN)
 * Đầu số hợp lệ: 03x, 05x, 07x, 08x, 09x
 */
function isValidPhoneNumber(phone) {
  if (!phone) return false;
  return /^0[35789]\d{8}$/.test(phone);
}

/**
 * Chuẩn hóa và làm sạch dữ liệu đầu vào:
 * 1. Loại bỏ các ký tự điều khiển ASCII ẩn
 * 2. Giới hạn độ dài maxLen
 * 3. Chống Formula Injection (CWE-1236) nếu bắt đầu bằng toán tử =, +, -, @, \t, \r
 */
function sanitizeInput(value, maxLen = 100) {
  if (value === null || value === undefined) return "";
  let str = String(value).trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (maxLen && str.length > maxLen) {
    str = str.slice(0, maxLen);
  }
  if (/^[=+@\-\t\r]/.test(str)) {
    str = "'" + str;
  }
  return str;
}

/* -------------------------------------------------------------------------
   Model pre-selection
   ------------------------------------------------------------------------- */
function initModelPreselect() {
  const modelButtons = document.querySelectorAll("[data-model]");
  const modelSelect = document.getElementById("final-model");
  const finalCard = document.getElementById("final-form-card");

  if (!modelButtons.length || !modelSelect) return;

  modelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const model = button.getAttribute("data-model");
      selectedModelSource = model;
      const matchingOption = Array.from(modelSelect.options).find((option) => option.value === model);

      if (matchingOption) {
        modelSelect.value = model;
      }

      if (finalCard) {
        finalCard.classList.add("form-attention");
        window.setTimeout(() => finalCard.classList.remove("form-attention"), 1800);
      }
    });
  });

  modelSelect.addEventListener("change", () => {
    if (modelSelect.value) {
      selectedModelSource = null;
    }
  });
}

/* -------------------------------------------------------------------------
   Success modal
   ------------------------------------------------------------------------- */
let lastFocusedElement = null;

function initSuccessModal() {
  const modal = document.getElementById("partner-success-modal");
  if (!modal) return;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closePartnerModal();
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closePartnerModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closePartnerModal();
    }
  });
}

function showPartnerModal(title, message) {
  const modal = document.getElementById("partner-success-modal");
  const titleElement = document.getElementById("partner-modal-title");
  const messageElement = document.getElementById("partner-modal-message");
  const closeButton = document.getElementById("partner-modal-close");

  if (!modal) return;

  lastFocusedElement = document.activeElement;
  titleElement.textContent = title;
  messageElement.innerHTML = message;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (closeButton) closeButton.focus();
}

function closePartnerModal() {
  const modal = document.getElementById("partner-success-modal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

/* -------------------------------------------------------------------------
   Header, mobile menu and back-to-top
   ------------------------------------------------------------------------- */
function initHeaderScroll() {
  const header = document.getElementById("main-header");
  const logo = document.getElementById("header-logo");
  const hotlineButton = document.getElementById("header-hotline-btn");
  const ctaButton = document.getElementById("header-cta-btn");
  const mobileToggle = document.getElementById("mobile-menu-toggle");
  const navLinks = document.querySelectorAll("#main-header nav .nav-item");

  if (!header || !logo) return;

  const applyScrolledState = () => {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

    if (scrollPosition > 15) {
      header.classList.add("scrolled");
      header.style.backgroundColor = "#8C1823";
      header.style.borderBottomColor = "rgba(255, 255, 255, 0.15)";
      header.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.25)";

      if (!logo.src.includes("logo3.png")) logo.src = "assets/logo/logo3.png";

      navLinks.forEach((link) => {
        link.style.color = "#FFFFFF";
      });

      if (hotlineButton) {
        hotlineButton.style.borderColor = "rgba(255, 255, 255, 0.85)";
        hotlineButton.style.color = "#FFFFFF";
        hotlineButton.style.backgroundColor = "transparent";
      }

      if (ctaButton) {
        ctaButton.style.backgroundColor = "#C89D35";
        ctaButton.style.color = "#FFFFFF";
      }

      if (mobileToggle) mobileToggle.style.color = "#FFFFFF";
    } else {
      header.classList.remove("scrolled");
      header.style.backgroundColor = "#FFFFFF";
      header.style.borderBottomColor = "#E8E2D5";
      header.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";

      if (!logo.src.includes("logo1.png")) logo.src = "assets/logo/logo1.png";

      navLinks.forEach((link) => {
        link.style.color = "";
      });

      if (hotlineButton) {
        hotlineButton.style.borderColor = "#8C1823";
        hotlineButton.style.color = "#8C1823";
        hotlineButton.style.backgroundColor = "";
      }

      if (ctaButton) {
        ctaButton.style.backgroundColor = "#8C1823";
        ctaButton.style.color = "#FFFFFF";
      }

      if (mobileToggle) mobileToggle.style.color = "";
    }
  };

  window.addEventListener("scroll", applyScrolledState, { passive: true });
  applyScrolledState();
}

function initMobileMenu() {
  const toggle = document.getElementById("mobile-menu-toggle");
  const menu = document.getElementById("mobile-menu");
  const links = document.querySelectorAll('#main-header a[href^="#"]');

  if (!toggle || !menu) return;

  const setMenuState = (isOpen) => {
    menu.classList.toggle("hidden", !isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Đóng menu" : "Mở menu");
    toggle.innerHTML = isOpen
      ? '<i class="fa-solid fa-xmark text-xl"></i>'
      : '<i class="fa-solid fa-bars text-xl"></i>';
  };

  toggle.addEventListener("click", () => {
    setMenuState(menu.classList.contains("hidden"));
  });

  links.forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.classList.contains("hidden")) {
      setMenuState(false);
      toggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024 && !menu.classList.contains("hidden")) {
      setMenuState(false);
    }
  });
}

function initBackToTop() {
  const backToTopButton = document.getElementById("back-to-top");
  if (!backToTopButton) return;

  const updateVisibility = () => {
    if (window.scrollY > 500) {
      backToTopButton.classList.remove("opacity-0", "pointer-events-none");
      backToTopButton.classList.add("opacity-100");
    } else {
      backToTopButton.classList.add("opacity-0", "pointer-events-none");
      backToTopButton.classList.remove("opacity-100");
    }
  };

  window.addEventListener("scroll", updateVisibility, { passive: true });
  updateVisibility();

  backToTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
