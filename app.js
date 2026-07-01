/**
 * IndustrCons — app.js
 * UI orchestration layer. Talks to ICCalculator for math,
 * ICCharts for visualization, ICPdf for report generation.
 */

(function () {
  "use strict";

  let prices = null;
  let lastResult = null;
  const fmtNum = (n) => Math.round(n).toLocaleString("az-AZ").replace(/,/g, " ");

  /* ----------------------------- Init ----------------------------- */

  // Safety net: no matter what fails below, never leave the loader spinning
  // forever. If init hasn't finished in 4s, force it away so the page is
  // at least usable/visible for debugging.
  const forceHideTimer = setTimeout(() => {
    console.warn("IndustrCons: init timeout — forcing loader hidden.");
    hideLoader();
  }, 4000);

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      initYear();
      initDarkMode();
      initMobileNav();
      initScrollAnimations();
      initSmoothAnchors();

      const form = document.getElementById("calculatorForm");
      if (form) form.addEventListener("submit", onCalculate);

      const cityEl = document.getElementById("city");
      if (cityEl) cityEl.addEventListener("change", prefillLandPrice);

      const includeLandEl = document.getElementById("includeLand");
      if (includeLandEl) includeLandEl.addEventListener("change", toggleLandPriceField);

      const pdfBtn = document.getElementById("downloadPdfBtn");
      if (pdfBtn) pdfBtn.addEventListener("click", onDownloadPdf);

      const resetBtn = document.getElementById("resetBtn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          document.getElementById("calculatorForm").reset();
          prefillLandPrice();
        });
      }

      if (!window.ICCalculator) {
        throw new Error("calculator.js yüklənməyib (fayl tapılmadı və ya adı yanlışdır)");
      }

      prices = await window.ICCalculator.loadPrices();
      populateSelect("buildingType", Object.keys(prices.baseRatePerM2));
      populateSelect("finishLevel", Object.keys(prices.finishLevels), (k) => prices.finishLevels[k].label);
      populateSelect("foundationType", Object.keys(prices.foundationTypes), (k) => prices.foundationTypes[k].label);
      populateSelect("roofType", Object.keys(prices.roofTypes), (k) => prices.roofTypes[k].label);
      populateSelect("city", Object.keys(prices.cityMultipliers));
      prefillLandPrice();
    } catch (err) {
      console.error("IndustrCons init error:", err);
      showToast("Xəta: " + err.message, "error");
    } finally {
      clearTimeout(forceHideTimer);
      hideLoader();
    }
  });

  function initYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function hideLoader() {
    const loader = document.getElementById("pageLoader");
    if (loader) {
      loader.classList.add("loader-hidden");
      setTimeout(() => loader.remove(), 500);
    }
  }

  /* --------------------------- Dark mode --------------------------- */
  function initDarkMode() {
    const toggle = document.getElementById("darkModeToggle");
    const saved = localStorage.getItem("ic-theme");
    if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");

    if (toggle) {
      toggle.addEventListener("click", () => {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        if (isDark) {
          document.documentElement.removeAttribute("data-theme");
          localStorage.setItem("ic-theme", "light");
        } else {
          document.documentElement.setAttribute("data-theme", "dark");
          localStorage.setItem("ic-theme", "dark");
        }
        if (lastResult) renderCharts(lastResult);
      });
    }
  }

  /* --------------------------- Mobile nav --------------------------- */
  function initMobileNav() {
    const btn = document.getElementById("navToggle");
    const menu = document.getElementById("navMenu");
    if (!btn || !menu) return;
    btn.addEventListener("click", () => {
      menu.classList.toggle("nav-menu--open");
      btn.classList.toggle("nav-toggle--open");
    });
    menu.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        menu.classList.remove("nav-menu--open");
        btn.classList.remove("nav-toggle--open");
      })
    );
  }

  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href").slice(1);
        const target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  /* ----------------------- Scroll-in animations ----------------------- */
  function initScrollAnimations() {
    const items = document.querySelectorAll("[data-animate]");
    if (!("IntersectionObserver" in window) || !items.length) {
      items.forEach((i) => i.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    items.forEach((i) => observer.observe(i));
  }

  /* ----------------------------- Helpers ----------------------------- */
  function populateSelect(id, keys, labelFn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    keys.forEach((key) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = labelFn ? labelFn(key) : key;
      el.appendChild(opt);
    });
  }

  function prefillLandPrice() {
    if (!prices) return;
    const city = document.getElementById("city")?.value;
    const landInput = document.getElementById("landPrice");
    if (city && landInput && !landInput.dataset.userEdited) {
      landInput.value = prices.landPricePerM2ByCity[city] ?? "";
    }
    const landInputEl = document.getElementById("landPrice");
    if (landInputEl) {
      landInputEl.addEventListener("input", () => {
        landInputEl.dataset.userEdited = "true";
      });
    }
  }

  function toggleLandPriceField() {
    const checked = document.getElementById("includeLand").checked;
    const wrap = document.getElementById("landPriceWrap");
    if (wrap) wrap.style.display = checked ? "" : "none";
  }

  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) {
      alert(message);
      return;
    }
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast--visible"));
    setTimeout(() => {
      toast.classList.remove("toast--visible");
      setTimeout(() => toast.remove(), 300);
    }, 4200);
  }

  /* ----------------------------- Calculate ----------------------------- */
  function onCalculate(e) {
    e.preventDefault();
    if (!prices) {
      showToast("Qiymət bazası hələ yüklənməyib, bir az gözləyin.", "error");
      return;
    }

    const input = {
      area: parseFloat(document.getElementById("area").value),
      floors: parseInt(document.getElementById("floors").value, 10),
      buildingType: document.getElementById("buildingType").value,
      finishLevel: document.getElementById("finishLevel").value,
      foundationType: document.getElementById("foundationType").value,
      roofType: document.getElementById("roofType").value,
      city: document.getElementById("city").value,
      includeLand: document.getElementById("includeLand").checked,
      landPriceOverride: parseFloat(document.getElementById("landPrice").value) || null
    };

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Hesablanır...';

    setTimeout(() => {
      try {
        const result = window.ICCalculator.estimate(input, prices);
        lastResult = result;
        renderResults(result);
        renderCharts(result);
        document.getElementById("resultsSection").classList.add("is-visible");
        document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }, 450); // brief delay so the loading state actually reads as work being done
  }

  function animateCounter(el, targetValue, suffix = "") {
    const duration = 900;
    const start = performance.now();
    const startVal = 0;
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetValue - startVal) * eased;
      el.textContent = fmtNum(current) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderResults(result) {
    const symbol = result.currencySymbol;

    animateCounter(document.getElementById("totalCost"), result.grandTotal, " " + symbol);
    animateCounter(document.getElementById("costPerM2"), result.costPerM2, " " + symbol);
    document.getElementById("totalArea").textContent = fmtNum(result.totalBuildingArea) + " m²";
    document.getElementById("constructionCost").textContent = fmtNum(result.constructionCost) + " " + symbol;
    document.getElementById("landCost").textContent = fmtNum(result.landCost) + " " + symbol;

    // Breakdown table
    const breakdownBody = document.getElementById("breakdownTableBody");
    breakdownBody.innerHTML = "";
    const labels = window.ICCalculator.BREAKDOWN_LABELS_AZ;
    Object.entries(result.breakdown).forEach(([key, val]) => {
      const pct = ((val / result.constructionCost) * 100).toFixed(1);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${labels[key] || key}</td>
        <td class="text-right">${fmtNum(val)} ${symbol}</td>
        <td class="text-right text-muted">${pct}%</td>
      `;
      breakdownBody.appendChild(row);
    });

    // Materials table
    const materialBody = document.getElementById("materialTableBody");
    materialBody.innerHTML = "";
    const mLabels = window.ICCalculator.MATERIAL_LABELS_AZ;
    Object.entries(result.materials).forEach(([key, m]) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${mLabels[key] || key}</td>
        <td class="text-right">${m.quantity.toFixed(1)} ${m.unit}</td>
        <td class="text-right">${m.unitPrice.toLocaleString("az-AZ")} ${symbol}</td>
        <td class="text-right"><strong>${fmtNum(m.totalPrice)} ${symbol}</strong></td>
      `;
      materialBody.appendChild(row);
    });
  }

  function renderCharts(result) {
    window.ICCharts.renderBreakdownChart(
      "breakdownChart",
      result.breakdown,
      window.ICCalculator.BREAKDOWN_LABELS_AZ
    );
    window.ICCharts.renderMaterialChart(
      "materialChart",
      result.materials,
      window.ICCalculator.MATERIAL_LABELS_AZ
    );
  }

  /* ----------------------------- PDF ----------------------------- */
  async function onDownloadPdf() {
    if (!lastResult) {
      showToast("Əvvəlcə hesablama aparın.", "error");
      return;
    }
    const customer = {
      name: document.getElementById("customerName")?.value || "",
      projectName: document.getElementById("projectName")?.value || "",
      phone: document.getElementById("customerPhone")?.value || "",
      email: document.getElementById("customerEmail")?.value || "",
      notes: document.getElementById("customerNotes")?.value || ""
    };
    const btn = document.getElementById("downloadPdfBtn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Hazırlanır...';
    try {
      await window.ICPdf.generateEstimatePdf(lastResult, customer);
      showToast("PDF hesabat uğurla yaradıldı!", "success");
    } catch (err) {
      showToast("PDF yaradılarkən xəta: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
})();
