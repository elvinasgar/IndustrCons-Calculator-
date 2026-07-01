      };
    }

    const grandTotal = constructionCost + landCost;

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
      currency: prices.meta.currency,
      currencySymbol: prices.meta.currencySymbol,
      generatedAt: new Date().toISOString()
    };
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
    BREAKDOWN_LABELS_AZ,
    MATERIAL_LABELS_AZ
  };
})(window);
