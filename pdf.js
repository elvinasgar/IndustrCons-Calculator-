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
    doc.text(BRAND.tagline, margin, 19);
    doc.setFontSize(8);
    doc.text("www.industrcons.az", margin, 24);

    const dateStr = new Date(result.generatedAt).toLocaleDateString("az-AZ");
    doc.setFontSize(9);
    doc.text(`Tarix: ${dateStr}`, pageWidth - margin, 13, { align: "right" });
    doc.text("Smeta hesabatı", pageWidth - margin, 19, { align: "right" });

    y = 38;
    doc.setTextColor(20, 20, 20);

    // ---- Customer info ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Müştəri Məlumatları", margin, y);
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
      doc.text(label, margin, y);
      doc.setTextColor(20, 20, 20);
      doc.text(String(val), margin + 32, y);
      y += 5.5;
    });

    y += 4;

    // ---- Building info ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Bina Məlumatları", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const inp = result.input;
    const buildingLines = [
      ["Sahə:", `${inp.area} m² × ${inp.floors} mərtəbə = ${result.totalBuildingArea} m²`],
      ["Bina növü:", inp.buildingType],
      ["Tamamlama səviyyəsi:", inp.finishLevel],
      ["Təməl növü:", inp.foundationType],
      ["Dam növü:", inp.roofType],
      ["Şəhər/Region:", inp.city]
    ];
    buildingLines.forEach(([label, val]) => {
      doc.setTextColor(...BRAND.grayText);
      doc.text(label, margin, y);
      doc.setTextColor(20, 20, 20);
      doc.text(String(val), margin + 45, y);
      y += 5.5;
    });

    y += 6;

    // ---- Cost summary box ----
    doc.setFillColor(244, 246, 248);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.color);
    doc.text("Ümumi Təxmini Dəyər", margin + 4, y + 8);
    doc.setFontSize(15);
    doc.text(fmtMoney(result.grandTotal, result.currencySymbol), margin + 4, y + 17);
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.grayText);
    doc.text(
      `m² başına: ${fmtMoney(result.costPerM2, result.currencySymbol)}`,
      pageWidth - margin - 4,
      y + 12,
      { align: "right" }
    );
    y += 30;

    // ---- Breakdown table ----
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Xərc Bölgüsü", margin, y);
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
      doc.text(labels[key] || key, margin, y);
      doc.setTextColor(20, 20, 20);
      doc.text(fmtMoney(val, result.currencySymbol), pageWidth - margin, y, { align: "right" });
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
    doc.text("Material Siyahısı", margin, y);
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
      doc.text(mLabels[key] || key, margin, y);
      doc.setTextColor(20, 20, 20);
      doc.text(`${m.quantity.toFixed(1)} ${m.unit}`, margin + 80, y);
      doc.text(fmtMoney(m.totalPrice, result.currencySymbol), pageWidth - margin, y, {
        align: "right"
      });
      y += 5.2;
    });

    y += 8;
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    // ---- Notes ----
    if (customer.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Qeydlər", margin, y);
      y += 5.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const noteLines = doc.splitTextToSize(customer.notes, pageWidth - margin * 2 - 40);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 4.5 + 6;
    }

    // ---- QR code ----
    try {
      const qrText = `IndustrCons Smeta | ${customer.projectName || "Layihə"} | ${fmtMoney(
        result.grandTotal,
        result.currencySymbol
      )} | ${dateStr}`;
      const qrDataUrl = await generateQrDataUrl(qrText);
      if (qrDataUrl) {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 28, y, 28, 28);
        doc.setFontSize(7.5);
        doc.setTextColor(...BRAND.grayText);
        doc.text("Hesabat təsdiqi", pageWidth - margin - 28, y + 32);
      }
    } catch (e) {
      console.warn("QR kod yaradıla bilmədi:", e);
    }

    // ---- Disclaimer (footer) ----
    const disclaimerY = 285;
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    const disclaimer =
      "Qeyd: Bu sənəd yalnız təxmini smeta xarakteri daşıyır. Real qiymətlər material bazarı, podratçı və layihə xüsusiyyətlərindən asılı olaraq dəyişə bilər. IndustrCons rəsmi müqavilə öhdəliyi deyil.";
    const discLines = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
    doc.text(discLines, margin, disclaimerY);

    const fileName = `IndustrCons-Smeta-${(customer.projectName || "layihe").replace(
      /\s+/g,
      "-"
    )}.pdf`;
    doc.save(fileName);
  }

  global.ICPdf = { generateEstimatePdf };
})(window);
