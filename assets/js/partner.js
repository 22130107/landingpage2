/**
 * Princeton Academy - Partner / Franchise Landing Page
 * Handles partner lead forms, model pre-selection, navigation and modal UX.
 */

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbx8Lbh6mDVfMqUP0HqhCgW504f497bfTF_eGW8AQ6hwrEp_x3MO3Cwb2_Cv6ynnvqqTUQ/exec";

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
  if (!GOOGLE_SHEET_URL) {
    console.info("GOOGLE_SHEET_URL chưa được cấu hình. Lead chỉ hiển thị ở chế độ demo.");
    return true;
  }

  try {
    const body = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      body.append(key, value == null ? "" : String(value));
    });

    await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });
    return true;
  } catch (error) {
    console.error("Không thể gửi dữ liệu tới Google Sheets:", error);
    return false;
  }
}

/* -------------------------------------------------------------------------
   Partner forms
   ------------------------------------------------------------------------- */
let selectedModelSource = null;

function initPartnerForms() {
  const heroForm = document.getElementById("hero-partner-form");
  const finalForm = document.getElementById("final-partner-form");

  if (heroForm) {
    heroForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = valueOf("hero-name");
      const phone = valueOf("hero-phone");
      const province = valueOf("hero-province");
      const budget = valueOf("hero-budget");

      if (!name || !phone) {
        alert("Vui lòng điền họ tên và số điện thoại / Zalo của Quý nhà đầu tư.");
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
        notes: `Đăng ký từ Hero Form đầu trang. Ngân sách dự kiến: ${budget || "Chưa xác định"}`,
        createdAt: nowInVietnam()
      };

      const successMessage = `Cảm ơn Quý nhà đầu tư <strong>${escapeHtml(name)}</strong>. Bộ phận Phát triển Hệ thống Princeton Academy sẽ liên hệ qua số <strong>${escapeHtml(phone)}</strong> trong 24 giờ làm việc để gửi Franchise Kit và bảng tính dòng tiền cho khu vực <strong>${escapeHtml(province || "Quý đối tác")}</strong>.`;

      await handleFormSubmit(heroForm, payload, "Đăng Ký Nhận Franchise Kit Thành Công!", successMessage);
    });
  }

  if (finalForm) {
    finalForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = valueOf("final-name");
      const phone = valueOf("final-phone");
      const province = valueOf("final-province");
      const model = valueOf("final-model");

      if (!name || !phone) {
        alert("Vui lòng điền họ tên và số điện thoại / Zalo của Quý đối tác.");
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
        notes: `Đăng ký từ ${formSource}. Mô hình quan tâm: ${model || "Chưa xác định"}`,
        createdAt: nowInVietnam()
      };

      const successMessage = `Cảm ơn Quý đối tác <strong>${escapeHtml(name)}</strong>. Hồ sơ mô hình <strong>${escapeHtml(model || "đang quan tâm")}</strong> và bảng dự toán dòng tiền sẽ được Bộ phận Phát triển Hệ thống Princeton Academy gửi tới Quý đối tác qua số <strong>${escapeHtml(phone)}</strong> trong 24 giờ làm việc.`;

      await handleFormSubmit(finalForm, payload, "Yêu Cầu Đã Được Tiếp Nhận!", successMessage);
      selectedModelSource = null;
    });
  }
}

async function handleFormSubmit(form, payload, successTitle, successMessage) {
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return;

  const originalHtml = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = "ĐANG GỬI THÔNG TIN...";

  const sent = await sendToGoogleSheet(payload);

  submitButton.disabled = false;
  submitButton.innerHTML = originalHtml;

  if (!sent) {
    alert("Kết nối đang gián đoạn. Vui lòng thử lại hoặc gọi trực tiếp hotline 0988.284.799.");
    return;
  }

  form.reset();
  showPartnerModal(successTitle, successMessage);
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
