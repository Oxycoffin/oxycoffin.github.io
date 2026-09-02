(() => {
  "use strict";

  const messages = {
    es: {
      refresh: "Actualizar", eyebrow: "Vista privada · Tindrop", titleLead: "Lo importante,", titleAccent: "sin esperar.",
      heroCopy: "App Store, Google Play y AdMob reunidos en una lectura rápida.", lastUpdate: "Última actualización",
      protected: "Acceso protegido", loading: "Cargando resumen…", ready: "Datos listos", refreshing: "Actualizando las fuentes…",
      refreshQueued: "Actualización iniciada. Los datos aparecerán en unos segundos.", loadError: "No se pudo cargar el panel.",
      performance: "Rendimiento", trendTitle: "Últimos 30 días", today: "Hoy", analysis: "Análisis", insightsTitle: "Lectura rápida",
      connections: "Conexiones", sourcesTitle: "Estado de las fuentes", privacy: "Los secretos nunca llegan a este navegador.", back: "Lagartija Labs",
      period30: "30 días", compared: "vs. periodo anterior", noChange: "Sin comparación", revenue: "Ingresos registrados",
      downloads: "Descargas iOS", adImpressions: "Impresiones AdMob", androidQuality: "Crashes Android",
      appleAndAds: "Apple + anuncios", appStore: "App Store", play: "Google Play", admob: "AdMob", latestRate: "tasa más reciente",
      current: "Actualizado", pending: "Pendiente", error: "Error", never: "Aún sin datos", agoNow: "ahora",
      insightRevenueUpTitle: "Los ingresos aceleran", insightRevenueUpBody: "El total sube {value} frente a los 30 días anteriores.",
      insightRevenueDownTitle: "Los ingresos retroceden", insightRevenueDownBody: "El total baja {value} frente al periodo anterior.",
      insightRevenueFlatTitle: "Ingresos estables", insightRevenueFlatBody: "No hay una variación relevante frente al periodo anterior.",
      insightQualityGoodTitle: "Android se mantiene estable", insightQualityGoodBody: "La tasa de crashes más reciente es {value}.",
      insightQualityWarnTitle: "Conviene revisar Android", insightQualityWarnBody: "La tasa de crashes más reciente ha llegado a {value}.",
      insightCurrencyCoverageTitle: "Apple informa en varias monedas", insightCurrencyCoverageBody: "El total solo suma los importes ya expresados en EUR; el resto permanece separado para no inventar conversiones.",
      insightDataTitle: "Faltan datos para comparar", insightDataBody: "El panel irá completando el histórico automáticamente.",
      signedIn: "Sesión de {email}", chartLabel: "Ingresos diarios de los últimos 30 días",
      summaryLabel: "Resumen", legendLabel: "Leyenda", pageDescription: "Panel privado y ligero de rendimiento de Tindrop."
    },
    en: {
      refresh: "Refresh", eyebrow: "Private view · Tindrop", titleLead: "What matters,", titleAccent: "without the wait.",
      heroCopy: "App Store, Google Play, and AdMob in one quick read.", lastUpdate: "Last updated",
      protected: "Protected access", loading: "Loading summary…", ready: "Data ready", refreshing: "Refreshing sources…",
      refreshQueued: "Refresh started. New data will appear in a few seconds.", loadError: "The dashboard could not be loaded.",
      performance: "Performance", trendTitle: "Last 30 days", today: "Today", analysis: "Analysis", insightsTitle: "Quick read",
      connections: "Connections", sourcesTitle: "Source status", privacy: "Secrets never reach this browser.", back: "Lagartija Labs",
      period30: "30 days", compared: "vs. previous period", noChange: "No comparison", revenue: "Tracked revenue",
      downloads: "iOS downloads", adImpressions: "AdMob impressions", androidQuality: "Android crashes",
      appleAndAds: "Apple + ads", appStore: "App Store", play: "Google Play", admob: "AdMob", latestRate: "latest rate",
      current: "Current", pending: "Pending", error: "Error", never: "No data yet", agoNow: "now",
      insightRevenueUpTitle: "Revenue is accelerating", insightRevenueUpBody: "The total is up {value} against the previous 30 days.",
      insightRevenueDownTitle: "Revenue has softened", insightRevenueDownBody: "The total is down {value} against the previous period.",
      insightRevenueFlatTitle: "Revenue is stable", insightRevenueFlatBody: "There is no material change against the previous period.",
      insightQualityGoodTitle: "Android remains stable", insightQualityGoodBody: "The latest crash rate is {value}.",
      insightQualityWarnTitle: "Android deserves a look", insightQualityWarnBody: "The latest crash rate has reached {value}.",
      insightCurrencyCoverageTitle: "Apple reports multiple currencies", insightCurrencyCoverageBody: "The total only includes amounts already reported in EUR; other currencies stay separate to avoid invented conversions.",
      insightDataTitle: "More data is needed", insightDataBody: "The dashboard will build its history automatically.",
      signedIn: "Signed in as {email}", chartLabel: "Daily revenue over the last 30 days",
      summaryLabel: "Summary", legendLabel: "Legend", pageDescription: "Private, lightweight Tindrop performance dashboard."
    }
  };

  const elements = {
    language: document.querySelector("#languageButton"), refresh: document.querySelector("#refreshButton"),
    notice: document.querySelector("#notice"), noticeText: document.querySelector("#noticeText"),
    lastUpdated: document.querySelector("#lastUpdated"), sessionLabel: document.querySelector("#sessionLabel"),
    metricGrid: document.querySelector("#metricGrid"), metricTemplate: document.querySelector("#metricTemplate"),
    sourceList: document.querySelector("#sourceList"), sourceTemplate: document.querySelector("#sourceTemplate"),
    insightList: document.querySelector("#insightList"), chart: document.querySelector("#revenueChart"),
    chartStart: document.querySelector("#chartStart")
  };

  let language = localStorage.getItem("pulse.language") || "es";
  let dashboard = null;
  const t = (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), messages[language][key] || key);
  const number = value => new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", { maximumFractionDigits: 1 }).format(Number(value) || 0);
  const currency = (value, code = "EUR") => new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(Number(value) || 0);
  const percent = value => new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", { style: "percent", maximumFractionDigits: 2 }).format(Number(value) || 0);
  const date = value => value ? new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : t("never");
  const shortDate = value => new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00Z`));

  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll("[data-i18n-aria]").forEach(node => { node.setAttribute("aria-label", t(node.dataset.i18nAria)); });
    document.querySelector("#pageDescription").content = t("pageDescription");
    elements.language.textContent = language === "es" ? "EN" : "ES";
    elements.language.setAttribute("aria-label", language === "es" ? "Cambiar a inglés" : "Switch to Spanish");
    elements.chart.setAttribute("aria-label", t("chartLabel"));
    if (dashboard) render(dashboard);
  }

  function setNotice(kind, text) {
    elements.notice.className = `notice notice--${kind}`;
    elements.noticeText.textContent = text;
  }

  function formatChange(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return { text: t("noChange"), className: "" };
    const sign = value > 0 ? "+" : "";
    return { text: `${sign}${number(value)} %`, className: value > 0 ? "is-up" : value < 0 ? "is-down" : "" };
  }

  function renderMetrics(data) {
    const metrics = [
      { source: t("appleAndAds"), label: t("revenue"), value: data.summary.coverage.revenue ? currency(data.summary.revenue30, data.summary.currency) : "—", change: data.summary.revenueChange, detail: t("compared") },
      { source: t("appStore"), label: t("downloads"), value: data.summary.coverage.apple ? number(data.summary.downloads30) : "—", change: data.summary.downloadsChange, detail: t("compared") },
      { source: t("admob"), label: t("adImpressions"), value: data.summary.coverage.admob ? number(data.summary.adImpressions30) : "—", change: data.summary.adImpressionsChange, detail: t("compared") },
      { source: t("play"), label: t("androidQuality"), value: data.summary.coverage.play ? percent(data.summary.androidCrashRate) : "—", change: null, detail: t("latestRate") }
    ];
    elements.metricGrid.replaceChildren(...metrics.map(metric => {
      const card = elements.metricTemplate.content.firstElementChild.cloneNode(true);
      const change = formatChange(metric.change);
      card.setAttribute("aria-label", `${metric.label}: ${metric.value}`);
      card.querySelector(".metric-card__source").textContent = metric.source;
      card.querySelector(".metric-card__period").textContent = t("period30");
      card.querySelector(".metric-card__value").textContent = metric.value;
      card.querySelector(".metric-card__value").title = metric.label;
      card.querySelector(".metric-card__change").textContent = change.text;
      if (change.className) card.querySelector(".metric-card__change").classList.add(change.className);
      card.querySelector(".metric-card__detail").textContent = metric.detail;
      return card;
    }));
  }

  function renderChart(data) {
    const points = data.trends.revenue || [];
    const max = Math.max(1, ...points.map(item => (item.apple || 0) + (item.admob || 0)));
    elements.chart.replaceChildren(...points.map(item => {
      const day = document.createElement("div");
      day.className = "chart__day";
      day.title = `${shortDate(item.date)} · ${currency(item.apple || 0, data.summary.currency)} / ${currency(item.admob || 0, data.summary.currency)}`;
      for (const source of ["apple", "admob"]) {
        const bar = document.createElement("span");
        bar.className = `chart__bar chart__bar--${source}`;
        bar.style.height = `${Math.max(item[source] ? 2 : 0, ((item[source] || 0) / max) * 100)}%`;
        day.append(bar);
      }
      return day;
    }));
    elements.chartStart.textContent = points.length ? shortDate(points[0].date) : "—";
  }

  function renderInsights(data) {
    const insights = data.insights.length ? data.insights : [{ code: "data" }];
    elements.insightList.replaceChildren(...insights.map(insight => {
      const article = document.createElement("article");
      article.className = "insight";
      const mark = document.createElement("span");
      mark.className = "insight__mark";
      mark.textContent = insight.tone === "good" ? "↗" : insight.tone === "warn" ? "!" : "·";
      const body = document.createElement("div");
      const title = document.createElement("strong");
      const copy = document.createElement("p");
      const value = insight.valueType === "percent" ? percent(insight.value) : `${number(Math.abs(insight.value || 0))} %`;
      title.textContent = t(`insight${insight.code[0].toUpperCase()}${insight.code.slice(1)}Title`);
      copy.textContent = t(`insight${insight.code[0].toUpperCase()}${insight.code.slice(1)}Body`, { value });
      body.append(title, copy);
      article.append(mark, body);
      return article;
    }));
  }

  function renderSources(data) {
    const definitions = { apple: ["A", t("appStore")], play: ["G", t("play")], admob: ["Ad", t("admob")] };
    elements.sourceList.replaceChildren(...Object.entries(definitions).map(([key, definition]) => {
      const source = data.sources[key];
      const row = elements.sourceTemplate.content.firstElementChild.cloneNode(true);
      const status = row.querySelector(".source-row__status");
      row.querySelector(".source-row__icon").textContent = definition[0];
      row.querySelector(".source-row__name").textContent = definition[1];
      row.querySelector(".source-row__time").textContent = date(source.lastSuccessAt);
      status.textContent = source.status === "ready" ? t("current") : source.status === "error" ? t("error") : t("pending");
      const statusClass = source.status === "ready" ? "is-ready" : source.status === "error" ? "is-error" : "";
      if (statusClass) status.classList.add(statusClass);
      if (source.error) row.title = source.error;
      return row;
    }));
  }

  function render(data) {
    dashboard = data;
    elements.lastUpdated.textContent = date(data.generatedAt);
    if (data.viewer?.email) elements.sessionLabel.textContent = t("signedIn", { email: data.viewer.email });
    renderMetrics(data);
    renderChart(data);
    renderInsights(data);
    renderSources(data);
    setNotice("ready", t("ready"));
  }

  async function load() {
    try {
      const response = await fetch("/api/dashboard", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      render(await response.json());
    } catch (error) {
      console.error(error);
      const localDetail = ["127.0.0.1", "localhost"].includes(location.hostname) ? ` ${error.message}` : "";
      setNotice("error", `${t("loadError")}${localDetail}`);
    }
  }

  async function refresh() {
    elements.refresh.disabled = true;
    elements.refresh.classList.add("is-loading");
    setNotice("loading", t("refreshing"));
    try {
      const response = await fetch("/api/refresh", {
        method: "POST", headers: { Accept: "application/json", "X-Pulse-Intent": "refresh" }
      });
      if (!response.ok && response.status !== 202) throw new Error(`HTTP ${response.status}`);
      setNotice("ready", t("refreshQueued"));
      window.setTimeout(load, 3500);
    } catch (error) {
      console.error(error);
      setNotice("error", t("loadError"));
    } finally {
      elements.refresh.disabled = false;
      elements.refresh.classList.remove("is-loading");
    }
  }

  elements.language.addEventListener("click", () => {
    language = language === "es" ? "en" : "es";
    localStorage.setItem("pulse.language", language);
    applyLanguage();
  });
  elements.refresh.addEventListener("click", refresh);
  applyLanguage();
  load();
})();
