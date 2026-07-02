/**
 * IndustrCons — calculator.js
 * Pure calculation engine. No DOM access here — keeps logic portable
 * for future reuse (Node backend, Firebase Cloud Function, mobile app, etc).
 *
 * Public API (exposed on window.ICCalculator):
 *   - loadPrices()              -> Promise<pricesObject>
 *   - estimate(input, prices)   -> result object
 */

(function (global) {
  "use strict";

  const DATA_URL = "prices.json";
  let cachedPrices = null;

  /**
   * Fetches and caches the price database.
   */
  async function loadPrices(forceReload = false) {
    if (cachedPrices && !forceReload) return cachedPrices;
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("Qiymət bazası yüklənmədi (prices.json)");
    cachedPrices = await res.json();
    return cachedPrices;
  }

  /**
   * Main estimation function.
   * @param {Object} input
   *   area: number (m²)
   *   floors: number
   *   buildingType: string (key in prices.baseRatePerM2)
   *   finishLevel: string (key in prices.finishLevels)
   *   foundationType: string
   *   roofType: string
   *   city: string
   *   landPriceOverride: number|null  (AZN per m², optional manual override)
   *   includeLand: boolean
   * @param {Object} prices - loaded prices.json
   */
  function estimate(input, prices) {
    const {
      area,
      floors,
      buildingType,
      finishLevel,
      foundationType,
      roofType,
      city,
      landPriceOverride,
      includeLand
    } = input;

    if (!area || area <= 0) throw new Error("Sahə düzgün daxil edilməyib");
    if (!floors || floors <= 0) throw new Error("Mərtəbə sayı düzgün deyil");

    const baseRate = prices.baseRatePerM2[buildingType];
    const finish = prices.finishLevels[finishLevel];
    const foundation = prices.foundationTypes[foundationType];
    const roof = prices.roofTypes[roofType];
    const cityMult = prices.cityMultipliers[city] ?? prices.cityMultipliers["Other / Digər"];

    if (!baseRate || !finish || !foundation || !roof) {
      throw new Error("Hesablama üçün bəzi parametrlər tapılmadı");
    }

    const extraFloors = Math.max(0, floors - 1);
    const floorMult =
      prices.floorMultiplier.base + extraFloors * prices.floorMultiplier.perExtraFloor;

    // Effective AZN/m² after all multipliers
    const effectiveRate =
      baseRate * finish.multiplier * foundation.multiplier * roof.multiplier * cityMult * floorMult;

    const totalBuildingArea = area * floors;
    const constructionCost = effectiveRate * totalBuildingArea;

    // Land cost
    const landRate =
      landPriceOverride != null && landPriceOverride > 0
        ? landPriceOverride
        : prices.landPricePerM2ByCity[city] ?? prices.landPricePerM2ByCity["Other / Digər"];
    const landCost = includeLand ? landRate * area : 0;

    // Detailed breakdown (percentages apply to construction cost only, not land)
    const breakdown = {};
    let breakdownSum = 0;
    for (const [key, pct] of Object.entries(prices.costBreakdownPercentages)) {
      const value = constructionCost * pct;
      breakdown[key] = value;
      breakdownSum += value;
    }
    // Normalize rounding drift back into contingency-free total
    const breakdownTotal = breakdownSum;

    // Material quantities (based on total building floor area)
    const materials = {};
    for (const [key, qtyPerM2] of Object.entries(prices.materialQuantitiesPerM2)) {
      const quantity = qtyPerM2 * totalBuildingArea * finish.multiplier;
      const unitPrice = prices.materialUnitPrices[key] ?? 0;
      materials[key] = {
        quantity,
        unit: prices.materialUnits[key] || "",
        unitPrice,
        totalPrice: quantity * unitPrice
      };
    }

    const grandTotal = constructionCost + landCost;

    // Engineering accuracy range (±10% by default, configurable via prices.meta.accuracyRange)
    const accuracyRange = prices.meta.accuracyRange ?? 0.10;
    const rangeLow = grandTotal * (1 - accuracyRange);
    const rangeHigh = grandTotal * (1 + accuracyRange);

    return {
      input,
      effectiveRatePerM2: effectiveRate,
      totalBuildingArea,
      constructionCost,
      landCost,
      grandTotal,
      costPerM2: grandTotal / totalBuildingArea,
      breakdown,
      breakdownTotal,
      materials,
      accuracyRange,
      rangeLow,
      rangeHigh,
      currency: prices.meta.currency,
      currencySymbol: prices.meta.currencySymbol,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Produces a plain-language explanation of how the estimate was derived,
   * used in both the Results panel and the PDF report ("Engineering Accuracy").
   * Pure function — no DOM access.
   */
  function getAssumptions(input, prices, result) {
    const finish = prices.finishLevels[input.finishLevel];
    const foundation = prices.foundationTypes[input.foundationType];
    const roof = prices.roofTypes[input.roofType];
    const cityMult = prices.cityMultipliers[input.city] ?? 1;

    return [
      `Əsas m² qiyməti "${input.buildingType}" bina növü üçün bazar ortalamasına əsaslanır.`,
      `"${finish?.label || input.finishLevel}" tamamlama səviyyəsi əsas qiyməti ${finish ? finish.multiplier.toFixed(2) : "1.00"}× əmsalı ilə dəyişir.`,
      `"${foundation?.label || input.foundationType}" təməl növü ${foundation ? foundation.multiplier.toFixed(2) : "1.00"}× əmsalı tətbiq edir.`,
      `"${roof?.label || input.roofType}" dam növü ${roof ? roof.multiplier.toFixed(2) : "1.00"}× əmsalı tətbiq edir.`,
      `${input.city} regionu üçün ${cityMult.toFixed(2)}× regional əmsal tətbiq olunub.`,
      `${input.floors} mərtəbəli bina üçün struktur gücləndirmə əmsalı əlavə olunub.`,
      `Xərc bölgüsü kateqoriyaları (təməl, beton, elektrik və s.) sənaye standartı faiz nisbətlərinə əsasən ayrılıb.`,
      `Nəticə ±${Math.round((result?.accuracyRange ?? prices.meta.accuracyRange ?? 0.1) * 100)}% dəqiqlik aralığında təxmindir — dəqiq qiymət üçün mühəndis ölçməsi tövsiyə olunur.`
    ];
  }

  /**
   * Re-runs estimate() with an alternate finish level (or other override) to
   * support the Budget Optimizer's "what if" savings comparisons.
   * Returns null if the override key doesn't exist in prices.
   */
  function estimateWithOverride(input, prices, overrides) {
    const modifiedInput = Object.assign({}, input, overrides);
    try {
      return estimate(modifiedInput, prices);
    } catch (e) {
      return null;
    }
  }

  const BREAKDOWN_LABELS_AZ = {
    excavation: "Qazıntı işləri",
    foundation: "Təməl",
    concrete: "Beton",
    reinforcement: "Armatur (Rebar)",
    masonry: "Hörgü",
    columnsBeams: "Sütun və Tirlər",
    roof: "Dam örtüyü",
    doorsWindows: "Qapı və Pəncərələr",
    electrical: "Elektrik",
    plumbing: "Santexnika",
    hvac: "İstilik / Ventilyasiya (HVAC)",
    interiorFinishing: "Daxili Tamamlama",
    exteriorFinishing: "Xarici Tamamlama",
    landscaping: "Ərazi Quruluşu",
    contingency: "Ehtiyat Fond (Contingency)"
  };

  const MATERIAL_LABELS_AZ = {
    concreteM3: "Beton",
    rebarTon: "Armatur",
    cementBags: "Sement",
    sandM3: "Qum",
    gravelM3: "Çınqıl",
    brickPcs: "Kərpic/Blok",
    paintLiters: "Boya",
    tilesM2: "Kafel/Plitka",
    steelKg: "Polad",
    waterproofingM2: "Hidroizolyasiya"
  };

  global.ICCalculator = {
    loadPrices,
    estimate,
    getAssumptions,
    estimateWithOverride,
    BREAKDOWN_LABELS_AZ,
    MATERIAL_LABELS_AZ
  };
})(window);
