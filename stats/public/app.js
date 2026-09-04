(() => {
  "use strict";

  const messages = {
    es: {
      refresh: "Actualizar", privateView: "Panel privado · Tindrop", pageTitle: "Rendimiento", updated: "Actualizado",
      protected: "Acceso protegido", loading: "Cargando datos…", monetization: "Monetización", revenueTrend: "Ingresos diarios",
      signals: "Señales", whatChanged: "Qué merece atención", adPerformance: "Rendimiento publicitario", acquisition: "Adquisición",
      quality: "Calidad y reseñas", breakdown: "Desglose", whereRevenue: "Dónde se genera", adUnits: "Unidades", countries: "Países",
      voice: "Usuarios", recentReviews: "Reseñas recientes", detail: "Detalle", dailyData: "Datos por día", date: "Fecha",
      totalRevenue: "Ingresos", apple: "Apple", admob: "AdMob", downloads: "Descargas", impressions: "Impresiones", clicks: "Clics",
      matchRate: "Match", privacy: "Datos agregados; los secretos no llegan al navegador.", periodLabel: "Periodo",
      kpiLabel: "Indicadores principales", legendLabel: "Leyenda", sourceLabel: "Estado de las fuentes",
      appleProceeds: "Ingresos Apple", adRevenue: "Ingresos AdMob", pageDescription: "Panel privado y ligero de rendimiento de Tindrop.",
      signedIn: "Sesión de {email}", ready: "Datos listos · {coverage}", loadError: "No se pudo cargar el panel.",
      refreshing: "Solicitando actualización…", refreshQueued: "Actualizando {source}; los datos aparecerán en unos segundos.",
      cooldown: "Todo está al día. La actualización manual vuelve a estar disponible en unos minutos.", days: "{value} días",
      compared: "vs. periodo anterior", noComparison: "Sin comparación", totalIncome: "Ingresos totales", appleIncome: "Ingresos Apple",
      admobIncome: "Ingresos AdMob", iosDownloads: "Descargas iOS", adRpm: "RPM AdMob", adImpressions: "Impresiones",
      earnings: "Ingresos", ctr: "CTR", showRate: "Show rate", requests: "Solicitudes", transactions: "Transacciones",
      refunds: "Reembolsos", history: "Histórico", crashRate: "Crashes", anrRate: "ANR", peakCrash: "Pico crashes",
      playRating: "Nota Play", noQualityData: "Google Play todavía no ha devuelto métricas de estabilidad para este periodo.",
      revenueUpTitle: "Los ingresos avanzan", revenueUpBody: "Suben {value} respecto al periodo anterior.",
      revenueDownTitle: "Los ingresos retroceden", revenueDownBody: "Bajan {value} respecto al periodo anterior.",
      revenueFlatTitle: "Ingresos estables", revenueFlatBody: "La variación frente al periodo anterior es pequeña ({value}).",
      dataTitle: "Histórico en construcción", dataBody: "Aún no hay un periodo anterior completo para comparar.",
      matchRateWarnTitle: "Match rate mejorable", matchRateWarnBody: "Solo se cubre el {value} de las solicitudes publicitarias.",
      matchRateGoodTitle: "Demanda publicitaria saludable", matchRateGoodBody: "AdMob cubre el {value} de las solicitudes.",
      qualityWarnTitle: "Conviene revisar Android", qualityWarnBody: "La tasa de crashes más reciente es {value}.",
      qualityGoodTitle: "Android estable", qualityGoodBody: "La tasa de crashes más reciente es {value}.",
      appleCoverageTitle: "Apple sigue completando histórico", appleCoverageBody: "Hay {value} días disponibles; se amplía automáticamente.",
      noBreakdown: "El desglose aparecerá tras la próxima actualización de AdMob.", noReviews: "No hay reseñas recientes disponibles.",
      coverage: "Cobertura: Apple {apple}/{days} · AdMob {admob}/{days} · Play {play}/{days}",
      current: "Al día", pending: "Pendiente", error: "Error", never: "Sin datos", sourceDetail: "{days} días · {date}",
      total: "Total", averageDay: "media/día", chartLabel: "Ingresos diarios desglosados por Apple y AdMob",
      unknown: "Sin nombre", appStore: "App Store", googlePlay: "Google Play"
    },
    en: {
      refresh: "Refresh", privateView: "Private dashboard · Tindrop", pageTitle: "Performance", updated: "Updated",
      protected: "Protected access", loading: "Loading data…", monetization: "Monetization", revenueTrend: "Daily revenue",
      signals: "Signals", whatChanged: "What needs attention", adPerformance: "Ad performance", acquisition: "Acquisition",
      quality: "Quality and reviews", breakdown: "Breakdown", whereRevenue: "Where it comes from", adUnits: "Ad units", countries: "Countries",
      voice: "Users", recentReviews: "Recent reviews", detail: "Detail", dailyData: "Daily data", date: "Date",
      totalRevenue: "Revenue", apple: "Apple", admob: "AdMob", downloads: "Downloads", impressions: "Impressions", clicks: "Clicks",
      matchRate: "Match", privacy: "Aggregated data; secrets never reach the browser.", periodLabel: "Period",
      kpiLabel: "Key metrics", legendLabel: "Legend", sourceLabel: "Source status",
      appleProceeds: "Apple proceeds", adRevenue: "AdMob revenue", pageDescription: "Private, lightweight Tindrop performance dashboard.",
      signedIn: "Signed in as {email}", ready: "Data ready · {coverage}", loadError: "The dashboard could not be loaded.",
      refreshing: "Requesting refresh…", refreshQueued: "Refreshing {source}; new data will appear in a few seconds.",
      cooldown: "Everything is current. Manual refresh will be available again in a few minutes.", days: "{value} days",
      compared: "vs. previous period", noComparison: "No comparison", totalIncome: "Total revenue", appleIncome: "Apple revenue",
      admobIncome: "AdMob revenue", iosDownloads: "iOS downloads", adRpm: "AdMob RPM", adImpressions: "Impressions",
      earnings: "Revenue", ctr: "CTR", showRate: "Show rate", requests: "Requests", transactions: "Transactions",
      refunds: "Refunds", history: "History", crashRate: "Crashes", anrRate: "ANR", peakCrash: "Crash peak",
      playRating: "Play rating", noQualityData: "Google Play has not returned stability metrics for this period yet.",
      revenueUpTitle: "Revenue is growing", revenueUpBody: "Up {value} against the previous period.",
      revenueDownTitle: "Revenue is down", revenueDownBody: "Down {value} against the previous period.",
      revenueFlatTitle: "Revenue is stable", revenueFlatBody: "The change against the previous period is small ({value}).",
      dataTitle: "Building history", dataBody: "There is not yet a complete previous period to compare.",
      matchRateWarnTitle: "Match rate can improve", matchRateWarnBody: "Only {value} of ad requests are being matched.",
      matchRateGoodTitle: "Healthy ad demand", matchRateGoodBody: "AdMob matches {value} of ad requests.",
      qualityWarnTitle: "Android needs attention", qualityWarnBody: "The latest crash rate is {value}.",
      qualityGoodTitle: "Android is stable", qualityGoodBody: "The latest crash rate is {value}.",
      appleCoverageTitle: "Apple history is still filling", appleCoverageBody: "{value} days are available; more are added automatically.",
      noBreakdown: "The breakdown will appear after the next AdMob refresh.", noReviews: "No recent reviews are available.",
      coverage: "Coverage: Apple {apple}/{days} · AdMob {admob}/{days} · Play {play}/{days}",
      current: "Current", pending: "Pending", error: "Error", never: "No data", sourceDetail: "{days} days · {date}",
      total: "Total", averageDay: "daily avg.", chartLabel: "Daily revenue split between Apple and AdMob",
      unknown: "Unnamed", appStore: "App Store", googlePlay: "Google Play"
    }
  };

  const $ = selector => document.querySelector(selector);
  const elements = {
    language: $("#languageButton"), refresh: $("#refreshButton"), notice: $("#notice"), noticeText: $("#noticeText"),
    lastUpdated: $("#lastUpdated"), sessionLabel: $("#sessionLabel"), viewerEmail: $("#viewerEmail"), kpis: $("#kpiGrid"),
    kpiTemplate: $("#kpiTemplate"), revenueChart: $("#revenueChart"), revenueAxis: $("#revenueAxis"),
    revenueHeadline: $("#revenueHeadline"), revenueTooltip: $("#revenueTooltip"), insights: $("#insightList"),
    adStats: $("#adStats"), adChart: $("#adChart"), acquisitionStats: $("#acquisitionStats"), downloadChart: $("#downloadChart"),
    qualityStats: $("#qualityStats"), qualityMessage: $("#qualityMessage"), breakdownList: $("#breakdownList"),
    reviewList: $("#reviewList"), dailyTable: $("#dailyTable"), coverageLabel: $("#coverageLabel"), sourceList: $("#sourceList"),
    sourceTemplate: $("#sourceTemplate")
  };
  let language = localStorage.getItem("pulse.language") || "es";
  let range = [7, 30].includes(Number(localStorage.getItem("pulse.range"))) ? Number(localStorage.getItem("pulse.range")) : 30;
  let breakdown = "adUnits";
  let dashboard = null;
  const locale = () => language === "es" ? "es-ES" : "en-US";
  const t = (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), messages[language][key] || key);
  const present = value => value !== null && value !== undefined && Number.isFinite(Number(value));
  const number = (value, digits = 1) => present(value) ? new Intl.NumberFormat(locale(), { maximumFractionDigits: digits }).format(Number(value)) : "—";
  const integer = value => present(value) ? new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(Number(value)) : "—";
  const compact = value => present(value) ? new Intl.NumberFormat(locale(), { notation: "compact", maximumFractionDigits: 1 }).format(Number(value)) : "—";
  const currency = (value, code = "EUR", compactValue = false) => present(value)
    ? new Intl.NumberFormat(locale(), { style: "currency", currency: code, notation: compactValue ? "compact" : "standard", maximumFractionDigits: 2 }).format(Number(value)) : "—";
  const percent = (value, digits = 1) => present(value) ? new Intl.NumberFormat(locale(), { style: "percent", maximumFractionDigits: digits }).format(Number(value)) : "—";
  const dateTime = value => value ? new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : t("never");
  const shortDate = value => value ? new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00Z`)) : "—";
  const period = () => dashboard?.periods?.[range];

  function setNotice(kind, text) {
    elements.notice.className = `notice notice--${kind}`;
    elements.noticeText.textContent = text;
  }

  function changeText(value) {
    if (!present(value)) return { text: t("noComparison"), className: "" };
    const numeric = Number(value);
    return { text: `${numeric > 0 ? "+" : ""}${number(numeric, 1)} %`, className: numeric > 0 ? "is-up" : numeric < 0 ? "is-down" : "" };
  }

  function coverageText(p) {
    return t("coverage", { apple: p.coverage.appleDays, admob: p.coverage.admobDays, play: p.coverage.playDays, days: p.days });
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll("[data-i18n-aria]").forEach(node => node.setAttribute("aria-label", t(node.dataset.i18nAria)));
    $("#pageDescription").content = t("pageDescription");
    elements.language.textContent = language === "es" ? "EN" : "ES";
    elements.language.setAttribute("aria-label", language === "es" ? "Cambiar a inglés" : "Switch to Spanish");
    elements.revenueChart.setAttribute("aria-label", t("chartLabel"));
    if (dashboard) render(dashboard);
  }

  function renderKpis(p) {
    const appleReady = p.coverage.appleDays > 0;
    const admobReady = p.coverage.admobDays > 0;
    const metrics = [
      { label: t("totalIncome"), value: appleReady || admobReady ? currency(p.revenue.total, p.currency) : "—", change: p.revenue.change },
      { label: t("appleIncome"), value: appleReady ? currency(p.revenue.apple, p.currency) : "—" },
      { label: t("admobIncome"), value: admobReady ? currency(p.revenue.admob, p.currency) : "—" },
      { label: t("iosDownloads"), value: appleReady ? integer(p.acquisition.downloads) : "—", change: p.acquisition.downloadsChange },
      { label: t("adRpm"), value: admobReady ? currency(p.ads.rpm, p.currency) : "—" },
      { label: t("adImpressions"), value: admobReady ? compact(p.ads.impressions) : "—", change: p.ads.impressionsChange }
    ];
    elements.kpis.replaceChildren(...metrics.map(metric => {
      const card = elements.kpiTemplate.content.firstElementChild.cloneNode(true);
      const change = changeText(metric.change);
      card.querySelector(".kpi-card__label").textContent = metric.label;
      card.querySelector(".kpi-card__badge").textContent = `${range}D`;
      card.querySelector(".kpi-card__value").textContent = metric.value;
      card.querySelector(".kpi-card__change").textContent = metric.change === undefined ? "" : change.text;
      if (change.className) card.querySelector(".kpi-card__change").classList.add(change.className);
      card.querySelector(".kpi-card__context").textContent = metric.change === undefined ? "" : t("compared");
      card.setAttribute("aria-label", `${metric.label}: ${metric.value}`);
      return card;
    }));
  }

  function revenueTooltip(day) {
    const total = (day.appleRevenue || 0) + (day.admobRevenue || 0);
    const title = document.createElement("strong");
    const totalLine = document.createElement("b");
    const appleLine = document.createElement("span");
    const admobLine = document.createElement("span");
    title.textContent = shortDate(day.date);
    totalLine.textContent = `${t("total")}: ${currency(total, dashboard.currency)}`;
    appleLine.textContent = `${t("apple")}: ${currency(day.appleRevenue, dashboard.currency)}`;
    admobLine.textContent = `${t("admob")}: ${currency(day.admobRevenue, dashboard.currency)}`;
    elements.revenueTooltip.replaceChildren(title, totalLine, appleLine, admobLine);
  }

  function renderRevenue(p) {
    const points = dashboard.daily.slice(-range);
    const totals = points.map(day => (day.appleRevenue || 0) + (day.admobRevenue || 0));
    const max = Math.max(...totals, 0.01);
    elements.revenueAxis.replaceChildren(...[1, .75, .5, .25, 0].map(multiplier => {
      const label = document.createElement("span");
      label.textContent = currency(max * multiplier, dashboard.currency, true);
      return label;
    }));
    elements.revenueChart.replaceChildren(...points.map((day, index) => {
      const column = document.createElement("div");
      column.className = "chart__day";
      column.tabIndex = 0;
      column.setAttribute("aria-label", `${shortDate(day.date)}: ${currency(totals[index], dashboard.currency)}`);
      for (const [source, field] of [["apple", "appleRevenue"], ["admob", "admobRevenue"]]) {
        const bar = document.createElement("span");
        bar.className = `chart__bar chart__bar--${source}`;
        bar.style.height = `${day[field] === null ? 0 : Math.max(day[field] ? 2 : .5, (Number(day[field] || 0) / max) * 100)}%`;
        column.append(bar);
      }
      if (index === 0 || index === points.length - 1 || index % Math.max(1, Math.floor(points.length / 5)) === 0) {
        const dateLabel = document.createElement("span");
        dateLabel.className = "chart__date";
        dateLabel.textContent = shortDate(day.date);
        column.append(dateLabel);
      }
      const show = () => {
        revenueTooltip(day);
        elements.revenueTooltip.hidden = false;
        elements.revenueTooltip.style.left = `${column.offsetLeft + column.offsetWidth / 2 + 46}px`;
        elements.revenueTooltip.style.top = `${Math.max(60, column.offsetTop + 24)}px`;
      };
      column.addEventListener("pointerenter", show);
      column.addEventListener("pointerleave", () => { elements.revenueTooltip.hidden = true; });
      column.addEventListener("focus", show);
      column.addEventListener("blur", () => { elements.revenueTooltip.hidden = true; });
      return column;
    }));
    const total = document.createElement("strong");
    const average = document.createElement("span");
    total.textContent = currency(p.revenue.total, p.currency);
    average.textContent = `${currency(p.revenue.total / p.days, p.currency)} ${t("averageDay")}`;
    elements.revenueHeadline.replaceChildren(total, average);
  }

  function makeStats(target, definitions) {
    target.replaceChildren(...definitions.map(([label, value]) => {
      const item = document.createElement("div");
      item.className = "stat";
      const small = document.createElement("small");
      const strong = document.createElement("strong");
      small.textContent = label;
      strong.textContent = value;
      item.append(small, strong);
      return item;
    }));
  }

  function renderMiniChart(target, field) {
    const points = dashboard.daily.slice(-range);
    const max = Math.max(...points.map(day => Number(day[field] || 0)), 1);
    target.replaceChildren(...points.map(day => {
      const bar = document.createElement("span");
      bar.className = "mini-chart__bar";
      bar.style.height = `${day[field] === null ? 0 : Math.max(day[field] ? 3 : 1, (Number(day[field] || 0) / max) * 100)}%`;
      bar.title = `${shortDate(day.date)} · ${field === "downloads" ? integer(day[field]) : currency(day[field], dashboard.currency)}`;
      return bar;
    }));
  }

  function renderDetailPanels(p) {
    makeStats(elements.adStats, [[t("earnings"), currency(p.ads.earnings, p.currency)], [t("impressions"), integer(p.ads.impressions)],
      [t("clicks"), integer(p.ads.clicks)], [t("ctr"), percent(p.ads.ctr)], [t("matchRate"), percent(p.ads.matchRate)],
      [t("showRate"), percent(p.ads.showRate)], [t("requests"), integer(p.ads.requests)], ["RPM", currency(p.ads.rpm, p.currency)]]);
    makeStats(elements.acquisitionStats, [[t("downloads"), integer(p.acquisition.downloads)], [t("transactions"), integer(p.acquisition.transactions)],
      [t("refunds"), integer(p.acquisition.refunds)], [t("history"), t("days", { value: p.coverage.appleDays })]]);
    makeStats(elements.qualityStats, [[t("crashRate"), percent(p.quality.crashRate, 2)], [t("anrRate"), percent(p.quality.anrRate, 2)],
      [t("peakCrash"), percent(p.quality.peakCrashRate, 2)], [t("playRating"), p.reviews?.averageRating ? `${number(p.reviews.averageRating, 1)} ★` : "—"]]);
    elements.qualityMessage.textContent = p.coverage.playDays ? `${t("history")}: ${t("days", { value: p.coverage.playDays })}` : t("noQualityData");
    renderMiniChart(elements.adChart, "admobRevenue");
    renderMiniChart(elements.downloadChart, "downloads");
  }

  function derivedInsights(p) {
    const result = [];
    if (!present(p.revenue.change)) result.push({ code: "data", tone: "neutral" });
    else if (p.revenue.change >= 5) result.push({ code: "revenueUp", tone: "good", value: p.revenue.change });
    else if (p.revenue.change <= -5) result.push({ code: "revenueDown", tone: "warn", value: p.revenue.change });
    else result.push({ code: "revenueFlat", tone: "neutral", value: p.revenue.change });
    if (present(p.ads.matchRate)) result.push({ code: p.ads.matchRate < .8 ? "matchRateWarn" : "matchRateGood", tone: p.ads.matchRate < .8 ? "warn" : "good", value: p.ads.matchRate, percent: true });
    if (present(p.quality.crashRate)) result.push({ code: p.quality.crashRate > .01 ? "qualityWarn" : "qualityGood", tone: p.quality.crashRate > .01 ? "warn" : "good", value: p.quality.crashRate, percent: true });
    if (p.coverage.appleDays < Math.min(p.days, 7)) result.push({ code: "appleCoverage", tone: "neutral", value: p.coverage.appleDays });
    return result.slice(0, 4);
  }

  function renderInsights(p) {
    elements.insights.replaceChildren(...derivedInsights(p).map(insight => {
      const article = document.createElement("article");
      article.className = `insight${insight.tone === "warn" ? " insight--warn" : ""}`;
      const mark = document.createElement("span");
      mark.className = "insight__mark";
      mark.textContent = insight.tone === "good" ? "↗" : insight.tone === "warn" ? "!" : "·";
      const body = document.createElement("div");
      const title = document.createElement("strong");
      const copy = document.createElement("p");
      const value = insight.percent ? percent(insight.value) : insight.code === "appleCoverage" ? integer(insight.value) : `${number(Math.abs(insight.value || 0), 1)} %`;
      title.textContent = t(`${insight.code}Title`);
      copy.textContent = t(`${insight.code}Body`, { value });
      body.append(title, copy);
      article.append(mark, body);
      return article;
    }));
  }

  function renderBreakdown() {
    const rows = dashboard.breakdowns?.[breakdown] || [];
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = t("noBreakdown");
      elements.breakdownList.replaceChildren(empty);
      return;
    }
    const max = Math.max(...rows.map(row => Number(row.earnings || 0)), 0.01);
    elements.breakdownList.replaceChildren(...rows.map(row => {
      const item = document.createElement("div");
      item.className = "ranking-row";
      const label = document.createElement("span");
      label.className = "ranking-row__label";
      label.textContent = row.label || row.id || t("unknown");
      label.title = label.textContent;
      const value = document.createElement("span");
      value.className = "ranking-row__value";
      value.textContent = `${currency(row.earnings, dashboard.currency)} · ${compact(row.impressions)} imp.`;
      const track = document.createElement("div");
      track.className = "ranking-row__track";
      const fill = document.createElement("div");
      fill.className = "ranking-row__fill";
      fill.style.width = `${Math.max(2, (Number(row.earnings || 0) / max) * 100)}%`;
      track.append(fill);
      item.append(label, value, track);
      return item;
    }));
  }

  function renderReviews() {
    const reviews = [...(dashboard.reviews?.apple?.recent || []).map(item => ({ ...item, store: t("appStore") })),
      ...(dashboard.reviews?.play?.recent || []).map(item => ({ ...item, store: t("googlePlay") }))]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5);
    if (!reviews.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = t("noReviews");
      elements.reviewList.replaceChildren(empty);
      return;
    }
    elements.reviewList.replaceChildren(...reviews.map(review => {
      const article = document.createElement("article");
      article.className = "review";
      const top = document.createElement("div");
      top.className = "review__top";
      const stars = document.createElement("span");
      stars.className = "review__stars";
      const rating = Math.max(0, Math.min(5, Number(review.rating || 0)));
      stars.textContent = `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
      const time = document.createElement("time");
      time.textContent = `${review.store} · ${shortDate(String(review.createdAt || "").slice(0, 10))}`;
      top.append(stars, time);
      const author = document.createElement("strong");
      author.textContent = review.title || review.author || review.store;
      const body = document.createElement("p");
      body.textContent = review.body || "—";
      article.append(top, author, body);
      return article;
    }));
  }

  function renderTable(p) {
    const cell = (value, formatter) => {
      const td = document.createElement("td");
      td.textContent = present(value) ? formatter(value) : "—";
      if (!present(value)) td.className = "is-empty";
      return td;
    };
    elements.dailyTable.replaceChildren(...dashboard.daily.slice(-range).reverse().map(day => {
      const row = document.createElement("tr");
      const dateCell = document.createElement("td");
      dateCell.textContent = shortDate(day.date);
      const total = day.appleRevenue !== null || day.admobRevenue !== null ? Number(day.appleRevenue || 0) + Number(day.admobRevenue || 0) : null;
      const match = day.requests ? Number(day.matchedRequests || 0) / Number(day.requests) : null;
      row.append(dateCell, cell(total, value => currency(value, p.currency)), cell(day.appleRevenue, value => currency(value, p.currency)),
        cell(day.admobRevenue, value => currency(value, p.currency)), cell(day.downloads, integer), cell(day.impressions, integer),
        cell(day.clicks, integer), cell(day.rpm, value => currency(value, p.currency)), cell(match, percent));
      return row;
    }));
    elements.coverageLabel.textContent = coverageText(p);
  }

  function renderSources() {
    const labels = { apple: t("appStore"), play: t("googlePlay"), admob: t("admob") };
    elements.sourceList.replaceChildren(...Object.entries(labels).map(([key, label]) => {
      const source = dashboard.sources[key];
      const card = elements.sourceTemplate.content.firstElementChild.cloneNode(true);
      if (source.status === "ready") card.classList.add("is-ready");
      if (source.status === "error") card.classList.add("is-error");
      card.querySelector(".source-pill__name").textContent = label;
      card.querySelector(".source-pill__detail").textContent = t("sourceDetail", { days: source.availableDays || 0, date: dateTime(source.lastSuccessAt) });
      card.querySelector(".source-pill__status").textContent = t(source.status === "ready" ? "current" : source.status === "error" ? "error" : "pending");
      if (source.error) card.title = source.error;
      return card;
    }));
  }

  function render(data) {
    dashboard = data;
    const p = period();
    elements.lastUpdated.textContent = dateTime(data.generatedAt);
    elements.sessionLabel.textContent = data.viewer?.email ? t("signedIn", { email: data.viewer.email }) : t("protected");
    elements.viewerEmail.textContent = data.viewer?.email || "—";
    document.querySelectorAll("[data-range]").forEach(button => button.classList.toggle("is-active", Number(button.dataset.range) === range));
    renderKpis(p);
    renderRevenue(p);
    renderInsights(p);
    renderDetailPanels(p);
    renderBreakdown();
    renderReviews();
    renderTable(p);
    renderSources();
    setNotice(p.coverage.appleDays < Math.min(range, 7) ? "warning" : "ready", t("ready", { coverage: coverageText(p) }));
  }

  async function load() {
    try {
      const response = await fetch("/api/dashboard", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      render(await response.json());
    } catch (error) {
      console.error(error);
      const detail = ["127.0.0.1", "localhost"].includes(location.hostname) ? ` ${error.message}` : "";
      setNotice("error", `${t("loadError")}${detail}`);
    }
  }

  async function refresh() {
    elements.refresh.disabled = true;
    elements.refresh.classList.add("is-loading");
    setNotice("loading", t("refreshing"));
    try {
      const response = await fetch("/api/refresh", { method: "POST", headers: { Accept: "application/json", "X-Pulse-Intent": "refresh" } });
      if (!response.ok && response.status !== 202) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.accepted) setNotice("ready", t("cooldown"));
      else {
        const labels = { apple: t("appStore"), play: t("googlePlay"), admob: t("admob") };
        setNotice("loading", t("refreshQueued", { source: labels[result.source] || result.source }));
        window.setTimeout(load, 4500);
      }
    } catch (error) {
      console.error(error);
      setNotice("error", t("loadError"));
    } finally {
      elements.refresh.disabled = false;
      elements.refresh.classList.remove("is-loading");
    }
  }

  document.querySelectorAll("[data-range]").forEach(button => button.addEventListener("click", () => {
    range = Number(button.dataset.range);
    localStorage.setItem("pulse.range", String(range));
    if (dashboard) render(dashboard);
  }));
  document.querySelectorAll("[data-breakdown]").forEach(button => button.addEventListener("click", () => {
    breakdown = button.dataset.breakdown;
    document.querySelectorAll("[data-breakdown]").forEach(item => item.classList.toggle("is-active", item === button));
    if (dashboard) renderBreakdown();
  }));
  elements.language.addEventListener("click", () => {
    language = language === "es" ? "en" : "es";
    localStorage.setItem("pulse.language", language);
    applyLanguage();
  });
  elements.refresh.addEventListener("click", refresh);
  applyLanguage();
  load();
})();
