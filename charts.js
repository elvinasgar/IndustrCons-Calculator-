/**
 * IndustrCons — charts.js
 * Thin wrapper around Chart.js (loaded via CDN in index.html).
 * Keeping chart creation isolated here means the visualization
 * library can be swapped later without touching app.js logic.
 */

(function (global) {
  "use strict";

  let breakdownChartInstance = null;
  let materialChartInstance = null;

  const PALETTE = [
    "#1B4F8C", "#2E7DD1", "#5BA3E0", "#7FB8E8", "#4A5568",
    "#E8A33D", "#1E6FB8", "#94A3B8", "#0F3A66", "#3B82C4",
    "#64748B", "#F0B85C", "#2563A6", "#A9C4E0"
  ];

  function destroyIfExists(instance) {
    if (instance) instance.destroy();
  }

  /**
   * Renders the cost-breakdown doughnut chart.
   */
  function renderBreakdownChart(canvasId, breakdown, labels) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    destroyIfExists(breakdownChartInstance);

    const entries = Object.entries(breakdown);
    const dataLabels = entries.map(([key]) => labels[key] || key);
    const dataValues = entries.map(([, val]) => Math.round(val));

    breakdownChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: dataLabels,
        datasets: [
          {
            data: dataValues,
            backgroundColor: PALETTE,
            borderWidth: 2,
            borderColor: getComputedStyle(document.documentElement)
              .getPropertyValue("--surface")
              .trim() || "#ffffff"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "right",
            labels: {
              boxWidth: 12,
              padding: 12,
              font: { size: 11, family: "Inter, sans-serif" },
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim()
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => `${item.label}: ${item.formattedValue} ₼`
            }
          }
        }
      }
    });

    return breakdownChartInstance;
  }

  /**
   * Renders the material cost comparison bar chart.
   */
  function renderMaterialChart(canvasId, materials, labels) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    destroyIfExists(materialChartInstance);

    const entries = Object.entries(materials);
    const dataLabels = entries.map(([key]) => labels[key] || key);
    const dataValues = entries.map(([, val]) => Math.round(val.totalPrice));

    materialChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: dataLabels,
        datasets: [
          {
            label: "Dəyər (₼)",
            data: dataValues,
            backgroundColor: "#2E7DD1",
            borderRadius: 6,
            maxBarThickness: 28
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (item) => `${item.formattedValue} ₼` }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(148,163,184,0.15)" },
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim()
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim(),
              font: { size: 11 }
            }
          }
        }
      }
    });

    return materialChartInstance;
  }

  function destroyAll() {
    destroyIfExists(breakdownChartInstance);
    destroyIfExists(materialChartInstance);
    breakdownChartInstance = null;
    materialChartInstance = null;
  }

  global.ICCharts = { renderBreakdownChart, renderMaterialChart, destroyAll };
})(window);
