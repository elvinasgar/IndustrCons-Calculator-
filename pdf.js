/**
 * IndustrCons — pdf.js
 * Generates a printable PDF estimate report using jsPDF (CDN).
 * QR code is rendered to a canvas first (qrcode.js CDN), then embedded as an image.
 */

(function (global) {
  "use strict";

  const BRAND = {
    name: "IndustrCons",
    tagline: "Construction Cost Estimator & Engineering Platform",
    color: [27, 79, 140], // RGB for #1B4F8C
    grayText: [74, 85, 104]
  };

  // jsPDF's built-in fonts (Helvetica/Times/Courier) only support WinAnsi
  // encoding and DO NOT include Azerbaijani letters (ə, ı, ş, ç, ö, ü, ğ).
  // Rather than showing broken/garbled glyphs, we transliterate to the
  // closest readable ASCII equivalent for anything placed in the PDF.
  const AZ_TO_ASCII = {
    ə: "e", Ə: "E",
    ı: "i", İ: "I",
    ö: "o", Ö: "O",
    ü: "u", Ü: "U",
    ş: "s", Ş: "S",
    ç: "c", Ç: "C",
    ğ: "g", Ğ: "G"
  };
  function pdfSafe(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[əƏıİöÖüÜşŞçÇğĞ]/g, (ch) => AZ_TO_ASCII[ch] || ch);
  }

  function fmtMoney(n, symbol) {
    return (
      Math.round(n)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + symbol
    );
  }

  async function generateQrDataUrl(text) {
    return new Promise((resolve, reject) => {
      try {
        const tempDiv = document.createElement("div");
        tempDiv.style.display = "none";
        document.body.appendChild(tempDiv);
        // eslint-disable-next-line no-undef
        new QRCode(tempDiv, { text, width: 160, height: 160 });
        setTimeout(() => {
          const img = tempDiv.querySelector("img");
          const canvas = tempDiv.querySelector("canvas");
          let dataUrl = null;
          if (canvas) dataUrl = canvas.toDataURL("image/png");
          else if (img) dataUrl = img.src;
          document.body.removeChild(tempDiv);
          resolve(dataUrl);
        }, 80);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * @param {Object} result - output of ICCalculator.estimate()
   * @param {Object} customer - { name, phone, email, projectName, notes }
   */
  async function generateEstimatePdf(result, customer) {
    if (typeof window.jspdf === "undefined") {
      throw new Error("jsPDF kitabxanası yüklənmədi");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    let y = 0;

    // ---- Header band ----
    doc.setFillColor(...BRAND.color);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(BRAND.name, margin, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(pdfSafe(BRAND.tagline), margin, 19);
    doc.setFontSize(8);
    doc.text("www.industrcons.az", margin, 24);

    const dateStr = new Date(result.generatedAt).toLocaleDateString("az-AZ");
    doc.setFontSize(9);
    doc.text(pdfSafe(`Tarix: ${dateStr}`), pageWidth - margin, 13, { align: "right" });
    doc.text(pdfSafe("Smeta hesabatı"), pageWidth - margin, 19, { align: "right" });

    y = 38;
    doc.setTextColor(20, 20, 20);

    // ---- Customer info ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(pdfSafe("Müştəri Məlumatları"), margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const customerLines = [
      [`Ad / Şirkət:`, customer.name || "—"],
      [`Layihə:`, customer.projectName || "—"],
      [`Telefon:`, customer.phone || "—"],
      [`E-poçt:`, customer.email || "—"]
    ];
    customerLines.forEach(([label, val]) => {
      doc.setTextColor(...BRAND.grayText);
      doc.text(pdfSafe(label), margin, y);
      doc.setTextColor(20, 20, 20);
      doc.text(pdfSafe(val), margin + 32, y);
      y += 5.5;
    });

    y += 4;

    // ---- Building info ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(pdfSafe("Bina Məlumatları"), margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const inp = result.input;
    const buildingLines = [
      ["Sahə:", `${inp.area} m² x ${inp.floors} mərtəbə = ${result.totalBuildingArea} m²`],
      ["Bina növü:", inp.buildingType],
      ["Tamamlama səviyyəsi:", inp.finishLevel],
      ["Təməl növü:", inp.foundationType],
      ["Dam növü:", inp.roofType],
      ["Şəhər/Region:", inp.city]
    ];
    buildingLines.forEach(([label, val]) => {
      doc.setTextColor(...BRAND.grayText);
      doc.text(pdfSafe(label), margin, y);
      doc.setTextColor(20, 20, 20);
      doc.text(pdfSafe(val), margin + 45, y);
      y += 5.5;
    });

    y += 6;

    // ---- Cost summary box ----
    doc.setFillColor(244, 246, 248);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.color);
    doc.text(pdfSafe("Ümumi Təxmini Dəyər"), margin + 4, y + 8);
    doc.setFontSize(15);
    doc.text(fmtMoney(result.grandTotal, "AZN"), margin + 4, y + 17);
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.grayText);
    doc.text(
      pdfSafe(`m² başına: ${fmtMoney(result.costPerM2, "AZN")}`),
      pageWidth - margin - 4,
      y + 12,
      { align: "right" }
    );
    y += 30;

    // ---- Engineering Accuracy & Assumptions ----
    if (Array.isArray(result.assumptions) && result.assumptions.length) {
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(pdfSafe(`Muhendislik Deqiqliyi (+/-${Math.round((result.accuracyRange || 0.1) * 100)}%)`), margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.grayText);
      doc.text(
        pdfSafe(`Aralıq: ${fmtMoney(result.rangeLow, "AZN")} — ${fmtMoney(result.rangeHigh, "AZN")}`),
        margin,
        y
      );
      y += 6;
      doc.setTextColor(20, 20, 20);
      result.assumptions.forEach((line) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const wrapped = doc.splitTextToSize(pdfSafe("• " + line), pageWidth - margin * 2);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4.4;
      });
      y += 6;
    }

    // ---- Breakdown table ----
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(pdfSafe("Xərc Bölgüsü"), margin, y);
    y += 6;

    const labels = global.ICCalculator.BREAKDOWN_LABELS_AZ;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    Object.entries(result.breakdown).forEach(([key, val]) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(...BRAND.grayText);
      doc.text(pdfSafe(labels[key] || key), margin, y);
      doc.setTextColor(20, 20, 20);
      doc.text(fmtMoney(val, "AZN"), pageWidth - margin, y, { align: "right" });
      y += 5.2;
    });

    y += 6;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // ---- Materials table ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(pdfSafe("Material Siyahısı"), margin, y);
    y += 6;
    const mLabels = global.ICCalculator.MATERIAL_LABELS_AZ;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    Object.entries(result.materials).forEach(([key, m]) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(...BRAND.grayText);
      doc.text(pdfSafe(mLabels[key] || key), margin, y);
      doc.setTextColor(20, 20, 20);
      doc.text(pdfSafe(`${m.quantity.toFixed(1)} ${m.unit}`), margin + 80, y);
      doc.text(fmtMoney(m.totalPrice, "AZN"), pageWidth - margin, y, {
        align: "right"
      });
      y += 5.2;
    });

    y += 8;
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    // ---- Construction Timeline ----
    if (result.timeline && Array.isArray(result.timeline.phases)) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(pdfSafe(`Tikinti Cedveli (~${result.timeline.totalMonths} ay)`), margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      result.timeline.phases.forEach((p) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(...BRAND.grayText);
        doc.text(pdfSafe(p.label), margin, y);
        doc.setTextColor(20, 20, 20);
        doc.text(
          pdfSafe(`${p.weeks} hefte (${p.startWeek}-${p.endWeek})`),
          pageWidth - margin,
          y,
          { align: "right" }
        );
        y += 5.2;
      });
      y += 6;
    }

    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    // ---- Budget Optimizer suggestions ----
    if (Array.isArray(result.optimizerSuggestions) && result.optimizerSuggestions.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(pdfSafe("Byudce Qenaet Tovsiyeleri"), margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      result.optimizerSuggestions.forEach((s) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(20, 20, 20);
        doc.text(pdfSafe(s.title), margin, y);
        doc.setTextColor(30, 120, 70);
        doc.text(pdfSafe(`-${fmtMoney(s.savings, "AZN")}`), pageWidth - margin, y, { align: "right" });
        y += 4.6;
        doc.setTextColor(...BRAND.grayText);
        const wrapped = doc.splitTextToSize(pdfSafe(s.description), pageWidth - margin * 2);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4.2 + 3;
      });
      y += 4;
    }

    // ---- Notes ----
    if (customer.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(pdfSafe("Qeydlər"), margin, y);
      y += 5.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const noteLines = doc.splitTextToSize(pdfSafe(customer.notes), pageWidth - margin * 2 - 40);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 4.5 + 6;
    }

    // ---- QR code ----
    try {
      const qrText = pdfSafe(
        `IndustrCons Smeta | ${customer.projectName || "Layihə"} | ${fmtMoney(
          result.grandTotal,
          "AZN"
        )} | ${dateStr}`
      );
      const qrDataUrl = await generateQrDataUrl(qrText);
      if (qrDataUrl) {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 28, y, 28, 28);
        doc.setFontSize(7.5);
        doc.setTextColor(...BRAND.grayText);
        doc.text(pdfSafe("Hesabat təsdiqi"), pageWidth - margin - 28, y + 32);
      }
    } catch (e) {
      console.warn("QR kod yaradıla bilmədi:", e);
    }

    // ---- Disclaimer (footer) ----
    const disclaimerY = 280;
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    const versionLine = pdfSafe(
      `IndustrCons Kalkulyator v${(result.pricesVersion || "2.0.0")} · Son yenilenme: ${dateStr}`
    );
    doc.text(versionLine, margin, disclaimerY);
    const disclaimer = pdfSafe(
      "Qeyd: Bu sənəd yalnız təxmini smeta xarakteri daşıyır. Real qiymətlər material bazarı, podratçı və layihə xüsusiyyətlərindən asılı olaraq dəyişə bilər. IndustrCons rəsmi müqavilə öhdəliyi deyil."
    );
    const discLines = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
    doc.text(discLines, margin, disclaimerY + 4);

    const fileName = `IndustrCons-Smeta-${(customer.projectName || "layihe").replace(
      /\s+/g,
      "-"
    )}.pdf`;
    doc.save(fileName);
  }

  global.ICPdf = { generateEstimatePdf };
})(window);
