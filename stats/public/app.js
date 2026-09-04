(() => {
  "use strict";
  const copy = {
    es: {
      skip: "Ir a los datos",
      workspace: "Tu espacio",
      sections: "Secciones",
      overview: "Resumen",
      advertising: "Publicidad",
      stores: "Tiendas y calidad",
      daily: "Detalle diario",
      private: "Solo tú tienes acceso",
      analytics: "Analítica",
      refresh: "Actualizar",
      yourApp: "TU APP, EN CIFRAS",
      periodLabel: "Periodo",
      seven: "7 días",
      thirty: "30 días",
      loading: "Cargando tus datos…",
      metrics: "Indicadores principales",
      trend: "Evolución",
      chartHelp: "Selecciona un día para ver sus cifras.",
      chartMetric: "Métrica del gráfico",
      revenue: "Ingresos registrados",
      impressions: "Impresiones",
      iosDownloads: "Descargas iOS",
      crash: "Crashes Android",
      selectedDay: "Día seleccionado",
      revenueMix: "De dónde viene el ingreso",
      adJourney: "De la solicitud al clic",
      funnelNote:
        "Cobertura = solicitudes con anuncio · Visualización = anuncios mostrados de los disponibles · CTR = clics por impresión.",
      topRevenue: "Qué genera más",
      breakdownPeriod: "Últimos 30 días · incluye hoy",
      breakdown: "Desglose",
      units: "Unidades",
      countries: "Países",
      downloadCountries: "Descargas por país",
      playLimits:
        "Esta conexión aporta estabilidad y reseñas. Instalaciones e ingresos de Google Play aún no están conectados.",
      reviews: "Lo que dicen los usuarios",
      reviewSample: "Reseñas recientes · todas las fechas",
      date: "Fecha",
      clicks: "Clics",
      tableNote:
        "— = sin datos publicados. Los ingresos suman los importes disponibles en EUR; pueden estar incompletos. Hoy se muestra por separado por ser provisional.",
      sources: "Estado de las conexiones",
      description: "Tu app, en cifras. Panel privado de Tindrop.",
      updated: "Sincronizado {date}",
      noSync: "Esperando la primera sincronización",
      completeDays: "Días completos",
      noData: "Sin datos disponibles",
      coverage: "{count} de {days} días con datos",
      compare: "vs. {days} días anteriores",
      noCompare: "Sin histórico completo para comparar",
      reported: "Apple + AdMob · importes disponibles",
      downloadsNote: "Descargas iniciales · App Store",
      rpm: "eCPM publicitario",
      rpmNote: "Ingreso por 1.000 impresiones",
      impressionsNote: "Anuncios mostrados · AdMob",
      partial: "Cobertura parcial",
      partialBody:
        "Faltan días en alguna fuente. Las cifras reflejan solo los datos recibidos; las comparaciones necesitan dos periodos completos.",
      errorBody:
        "Una conexión no ha podido actualizarse. Se conservan sus últimos datos; consulta el estado al pie.",
      loadError:
        "No se pudo cargar el panel. Pulsa Actualizar para reintentar; si tu sesión ha caducado, vuelve a abrir la página.",
      refreshing: "Solicitando datos nuevos…",
      queued: "Actualizando {source}. La consulta continúa en segundo plano.",
      cooldown:
        "La actualización manual está en pausa unos minutos. Se muestran los últimos datos disponibles.",
      ads: "Publicidad",
      appleIncome: "Ventas Apple",
      estimated: "AdMob estimado + proceeds Apple en EUR",
      today: "Hoy · AdMob",
      provisional: "Provisional · fuera del periodo",
      currencies: "Otros importes de Apple",
      currenciesBody: "Sin convertir ni sumar al total: {values}.",
      absentPlay: "Ingresos de Play sin conectar",
      absentPlayBody:
        "El total no incluye las compras ni las suscripciones de Android.",
      requests: "Solicitudes",
      matched: "Con anuncio",
      shown: "Mostrados",
      coverageLabel: "Cobertura",
      showRate: "Visualización",
      earnings: "Ingresos",
      refunds: "Unidades devueltas",
      crashLatest: "Crashes · último dato",
      anrLatest: "ANR · último dato",
      peakCrash: "Pico de crashes",
      peakAnr: "Pico de ANR",
      qualityNone:
        "Play no ha publicado métricas de estabilidad para este periodo. Esto no significa que la tasa sea cero.",
      qualityDates:
        "Crashes: {crash} · ANR: {anr}. Tasas de usuarios afectados; se priorizan los errores percibidos por el usuario.",
      noCountries:
        "No hay un desglose de descargas por país para este periodo.",
      noBreakdown:
        "No hay desglose disponible. Se consulta al actualizar AdMob.",
      noReviews:
        "No hay reseñas recientes disponibles en las conexiones actuales.",
      readMore: "Leer reseña completa",
      reviewUnknown: "Usuario",
      recentRating: "Media de {count} reseñas recibidas",
      sourceReady: "Conectado",
      sourcePending: "Pendiente",
      sourceError: "Error al actualizar",
      lastData: "Última consulta: {date}",
      noPrevious: "Sin consulta completada",
      chartMissing: "— sin dato · desplaza el gráfico si lo necesitas",
      chartRevenue: "Suma disponible · Apple + AdMob",
      total: "Periodo",
      noChart: "Todavía no hay datos para representar esta métrica.",
      dailyAverage: "{value} / día con datos",
      average: "Media",
      peak: "Máximo",
      reportGap:
        "Apple {apple}/{days} días · AdMob {admob}/{days} · Play {play}/{days}",
      chartDay:
        "{date}: {value}. Pulsa para seleccionar; usa las flechas para moverte.",
      selectedPartial: "Ingreso parcial",
      missingDay: "Sin dato publicado",
      download: "Descargas",
      csv: "Exportar datos diarios como CSV",
      stale: "Datos antiguos",
      staleBody:
        "La última consulta de una fuente está atrasada. Las fechas de sincronización aparecen al pie.",
    },
    en: {
      skip: "Skip to data",
      workspace: "Your workspace",
      sections: "Sections",
      overview: "Overview",
      advertising: "Advertising",
      stores: "Stores & quality",
      daily: "Daily detail",
      private: "Only you have access",
      analytics: "Analytics",
      refresh: "Refresh",
      yourApp: "YOUR APP, IN NUMBERS",
      periodLabel: "Period",
      seven: "7 days",
      thirty: "30 days",
      loading: "Loading your data…",
      metrics: "Key metrics",
      trend: "Performance over time",
      chartHelp: "Select a day to see its numbers.",
      chartMetric: "Chart metric",
      revenue: "Reported revenue",
      impressions: "Impressions",
      iosDownloads: "iOS downloads",
      crash: "Android crashes",
      selectedDay: "Selected day",
      revenueMix: "Where revenue comes from",
      adJourney: "From request to click",
      funnelNote:
        "Match = requests with an ad · Show rate = displayed ads out of matched requests · CTR = clicks per impression.",
      topRevenue: "What earns the most",
      breakdownPeriod: "Last 30 days · includes today",
      breakdown: "Breakdown",
      units: "Ad units",
      countries: "Countries",
      downloadCountries: "Downloads by country",
      playLimits:
        "This connection provides stability and reviews. Google Play installs and revenue are not connected yet.",
      reviews: "What users are saying",
      reviewSample: "Recent reviews · all dates",
      date: "Date",
      clicks: "Clicks",
      tableNote:
        "— = no published data. Revenue adds available EUR amounts and may be incomplete. Today is shown separately because it is provisional.",
      sources: "Connection status",
      description: "Your app, in numbers. Private Tindrop dashboard.",
      updated: "Synced {date}",
      noSync: "Waiting for the first sync",
      completeDays: "Complete days",
      noData: "No data available",
      coverage: "{count} of {days} days with data",
      compare: "vs. previous {days} days",
      noCompare: "Not enough complete history to compare",
      reported: "Apple + AdMob · available amounts",
      downloadsNote: "First downloads · App Store",
      rpm: "Ad eCPM",
      rpmNote: "Revenue per 1,000 impressions",
      impressionsNote: "Ads displayed · AdMob",
      partial: "Partial coverage",
      partialBody:
        "Some sources have missing days. Figures reflect received data only; comparisons require two complete periods.",
      errorBody:
        "A connection could not refresh. Its last data is retained; check connection status below.",
      loadError:
        "The dashboard could not load. Press Refresh to retry; if your session has expired, reopen the page.",
      refreshing: "Requesting new data…",
      queued: "Refreshing {source}. The request continues in the background.",
      cooldown:
        "Manual refresh is paused for a few minutes. Showing the latest available data.",
      ads: "Advertising",
      appleIncome: "Apple sales",
      estimated: "Estimated AdMob + Apple proceeds in EUR",
      today: "Today · AdMob",
      provisional: "Provisional · outside the period",
      currencies: "Other Apple amounts",
      currenciesBody: "Not converted or added to the total: {values}.",
      absentPlay: "Play revenue not connected",
      absentPlayBody: "The total excludes Android purchases and subscriptions.",
      requests: "Requests",
      matched: "Matched",
      shown: "Displayed",
      coverageLabel: "Match rate",
      showRate: "Show rate",
      earnings: "Revenue",
      refunds: "Returned units",
      crashLatest: "Crashes · latest",
      anrLatest: "ANR · latest",
      peakCrash: "Peak crashes",
      peakAnr: "Peak ANR",
      qualityNone:
        "Play has not published stability metrics for this period. This does not mean the rate is zero.",
      qualityDates:
        "Crashes: {crash} · ANR: {anr}. Rates of affected users; user-perceived errors take priority.",
      noCountries:
        "No download breakdown by country is available for this period.",
      noBreakdown:
        "No breakdown available. It is requested when AdMob refreshes.",
      noReviews:
        "No recent reviews are available from the current connections.",
      readMore: "Read full review",
      reviewUnknown: "User",
      recentRating: "Average of {count} received reviews",
      sourceReady: "Connected",
      sourcePending: "Pending",
      sourceError: "Refresh failed",
      lastData: "Last check: {date}",
      noPrevious: "No completed check",
      chartMissing: "— no data · scroll the chart if needed",
      chartRevenue: "Available sum · Apple + AdMob",
      total: "Period",
      noChart: "There is no data to chart for this metric yet.",
      dailyAverage: "{value} / day with data",
      average: "Average",
      peak: "Peak",
      reportGap:
        "Apple {apple}/{days} days · AdMob {admob}/{days} · Play {play}/{days}",
      chartDay: "{date}: {value}. Press to select; use arrow keys to move.",
      selectedPartial: "Partial revenue",
      missingDay: "No published data",
      download: "Downloads",
      csv: "Export daily data as CSV",
      stale: "Older data",
      staleBody:
        "A source is overdue for a refresh. Its last sync time appears below.",
    },
  };
  const $ = (id) => document.getElementById(id);
  const stored = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const save = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  };
  let lang = stored("pulse.language") === "en" ? "en" : "es";
  let range = Number(stored("pulse.range")) === 7 ? 7 : 30;
  let metric = "revenue",
    breakdown = "adUnits",
    data = null,
    selected = null,
    refreshTimer = null;
  const locale = () => (lang === "es" ? "es-ES" : "en-US");
  const t = (key, args = {}) =>
    Object.entries(args).reduce(
      (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
      copy[lang][key] || key,
    );
  const present = (v) =>
    v !== null && v !== undefined && Number.isFinite(Number(v));
  const fmt = (v, options = {}) =>
    present(v) ? new Intl.NumberFormat(locale(), options).format(v) : "—";
  const int = (v) => fmt(v, { maximumFractionDigits: 0 });
  const money = (v, currency = data?.currency || "EUR") =>
    fmt(v, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const pct = (v) => fmt(v, { style: "percent", maximumFractionDigits: 2 });
  const day = (v) =>
    v
      ? new Intl.DateTimeFormat(locale(), {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }).format(new Date(`${v.slice(0, 10)}T12:00:00Z`))
      : "—";
  const dateTime = (v) =>
    v
      ? new Intl.DateTimeFormat(locale(), {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(v))
      : "—";
  const node = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const set = (id, ...children) => $(id).replaceChildren(...children);
  const p = () => data.periods[range];
  const points = () =>
    data.daily.filter((d) => d.date >= p().start && d.date <= p().end);
  const total = (d) =>
    present(d.appleRevenue) || present(d.admobRevenue)
      ? (d.appleRevenue || 0) + (d.admobRevenue || 0)
      : null;
  const valueOf = (d) => (metric === "revenue" ? total(d) : d[metric]);
  const valueFormat = (v) =>
    metric === "revenue" ? money(v) : metric === "crashRate" ? pct(v) : int(v);
  const coverage = (count, days = range) => t("coverage", { count, days });
  const sourceNames = {
    apple: "App Store",
    admob: "AdMob",
    play: "Google Play",
  };
  function notice(text = "", type = "") {
    $("notice").textContent = text;
    $("notice").className = `notice ${type}`;
  }
  function empty(id, key) {
    set(id, node("p", "empty", t(key)));
  }
  function stat(label, value) {
    const el = node("div", "stat");
    el.append(node("small", "", label), node("strong", "", value));
    return el;
  }
  function translate() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document
      .querySelectorAll("[data-i18n-aria]")
      .forEach((el) =>
        el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))),
      );
    $("pageDescription").content = t("description");
    $("languageButton").textContent = lang === "es" ? "EN" : "ES";
    $("languageButton").setAttribute(
      "aria-label",
      lang === "es" ? "Switch to English" : "Cambiar a español",
    );
    $("exportButton").setAttribute("aria-label", t("csv"));
    if (data) render();
  }
  function renderKpis() {
    const s = p(),
      c = s.coverage;
    const metrics = [
      [
        "revenue",
        money(c.appleDays || c.admobDays ? s.revenue.total : null),
        s.revenue.change,
        "reported",
        "€",
      ],
      [
        "iosDownloads",
        int(c.appleDays ? s.acquisition.downloads : null),
        s.acquisition.downloadsChange,
        "downloadsNote",
        "↓",
      ],
      [
        "impressions",
        int(c.admobDays ? s.ads.impressions : null),
        s.ads.impressionsChange,
        "impressionsNote",
        "◫",
      ],
      ["rpm", money(s.ads.rpm), undefined, "rpmNote", "↗"],
    ];
    set(
      "kpis",
      ...metrics.map(([label, value, delta, hint, symbol]) => {
        const el = node("article", "kpi"),
          top = node("div", "kpi-label", t(label));
        top.append(node("span", "kpi-symbol", symbol));
        el.append(top, node("strong", "kpi-value", value));
        const bottom = node("div", "kpi-bottom");
        if (present(delta))
          bottom.append(
            node(
              "span",
              `delta ${delta > 0 ? "up" : delta < 0 ? "down" : ""}`,
              `${delta > 0 ? "+" : ""}${fmt(delta, { maximumFractionDigits: 1 })}%`,
            ),
            node("span", "", t("compare", { days: range })),
          );
        else
          bottom.textContent = delta === undefined ? t(hint) : t("noCompare");
        el.append(bottom);
        if (delta !== undefined) el.append(node("p", "kpi-note", t(hint)));
        return el;
      }),
    );
  }
  function svg(tag, attrs = {}, text) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs))
      el.setAttribute(key, String(value));
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function renderChart() {
    const rows = points(),
      values = rows.map(valueOf),
      available = values.filter(present);
    if (!rows.some((d) => d.date === selected))
      selected =
        [...rows].reverse().find((d) => present(valueOf(d)))?.date ||
        rows.at(-1)?.date;
    const sum = available.reduce((a, b) => a + b, 0);
    set(
      "chartSummary",
      node(
        "strong",
        "",
        valueFormat(
          available.length
            ? metric === "crashRate"
              ? Math.max(...available)
              : sum
            : null,
        ),
      ),
      node(
        "span",
        "",
        metric === "crashRate" ? t("peak") : coverage(available.length),
      ),
    );
    $("chartCaption").textContent =
      `${metric === "revenue" ? t("chartRevenue") + " · " : ""}${t("chartMissing")}`;
    if (!available.length) {
      set("chart", node("div", "chart-empty", t("noChart")));
      renderDay();
      return;
    }
    const width = 680,
      height = 260,
      left = 58,
      right = 12,
      top = 24,
      bottom = 35;
    const min = Math.min(0, ...available),
      max = Math.max(0, ...available);
    const spread =
      max - min ||
      (metric === "revenue" ? 0.01 : metric === "crashRate" ? 0.01 : 1);
    const upper = max + spread * 0.16,
      lower = min < 0 ? min - spread * 0.14 : 0;
    const y = (v) =>
      top + ((upper - v) / (upper - lower)) * (height - top - bottom);
    const base = y(0),
      step = (width - left - right) / rows.length,
      barWidth = Math.min(step * 0.66, 42);
    const chart = svg("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "group",
      "aria-label": t(
        metric === "downloads"
          ? "iosDownloads"
          : metric === "crashRate"
            ? "crash"
            : metric,
      ),
    });
    for (let i = 0; i < 4; i++) {
      const v = lower + ((upper - lower) * i) / 3,
        py = y(v);
      chart.append(
        svg("line", {
          x1: left,
          x2: width - right,
          y1: py,
          y2: py,
          class: "chart-grid",
        }),
        svg(
          "text",
          { x: left - 9, y: py + 4, "text-anchor": "end", class: "chart-axis" },
          valueFormat(v),
        ),
      );
    }
    chart.append(
      svg("line", {
        x1: left,
        x2: width - right,
        y1: base,
        y2: base,
        class: "chart-zero",
      }),
    );
    rows.forEach((d, i) => {
      const v = values[i],
        x = left + step * (i + 0.5),
        py = present(v) ? y(v) : base;
      const group = svg("g", {
        class: `chart-hit${d.date === selected ? " selected" : ""}`,
        role: "button",
        tabindex: d.date === selected ? 0 : -1,
        "aria-pressed": d.date === selected,
        "aria-label": t("chartDay", {
          date: day(d.date),
          value: valueFormat(v),
        }),
      });
      group.append(svg("title", {}, `${day(d.date)} · ${valueFormat(v)}`));
      group.append(
        svg("rect", {
          x: x - step / 2,
          y: 0,
          width: step,
          height: height,
          fill: "transparent",
        }),
      );
      if (present(v)) {
        group.append(
          svg("rect", {
            x: x - barWidth / 2,
            y: Math.min(py, base),
            width: barWidth,
            height: Math.max(v === 0 ? 1.5 : 2, Math.abs(base - py)),
            rx: 3,
            class: "chart-bar",
          }),
        );
        if (range === 7 || i % 5 === 0 || d.date === selected)
          group.append(
            svg(
              "text",
              {
                x,
                y: v < 0 ? py + 16 : py - 8,
                "text-anchor": "middle",
                class: "chart-value",
              },
              metric === "revenue"
                ? fmt(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : valueFormat(v),
            ),
          );
      } else
        group.append(
          svg(
            "text",
            { x, y: base - 5, "text-anchor": "middle", class: "chart-missing" },
            "—",
          ),
        );
      if (range === 7 || i % 6 === 0 || i === rows.length - 1)
        group.append(
          svg(
            "text",
            { x, y: height - 10, "text-anchor": "middle", class: "chart-axis" },
            day(d.date),
          ),
        );
      const select = () => {
        selected = d.date;
        renderChart();
        renderTable();
      };
      group.addEventListener("click", select);
      group.addEventListener("keydown", (event) => {
        if (
          !["Enter", " ", "ArrowLeft", "ArrowRight", "Home", "End"].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? rows.length - 1
              : Math.max(
                  0,
                  Math.min(
                    rows.length - 1,
                    i +
                      (event.key === "ArrowLeft"
                        ? -1
                        : event.key === "ArrowRight"
                          ? 1
                          : 0),
                  ),
                );
        selected = rows[next].date;
        renderChart();
        renderTable();
        $("chart").querySelector('[aria-pressed="true"]')?.focus();
      });
      chart.append(group);
    });
    set("chart", chart);
    renderDay();
  }
  function renderDay() {
    const d = points().find((row) => row.date === selected);
    if (!d) return set("dayDetail");
    set(
      "dayDetail",
      node("strong", "", day(d.date)),
      stat("Apple", money(d.appleRevenue)),
      stat("AdMob", money(d.admobRevenue)),
      stat(t("download"), int(d.downloads)),
      stat(t("impressions"), int(d.impressions)),
      stat(t("crash"), pct(d.crashRate)),
    );
  }
  function renderMix() {
    const s = p(),
      c = s.coverage;
    const track = node("div", "mix-track");
    const positiveTotal =
      Math.max(s.revenue.admob, 0) + Math.max(s.revenue.apple, 0);
    for (const name of ["admob", "apple"]) {
      const bar = node("span", name);
      bar.style.width = `${positiveTotal ? (Math.max(s.revenue[name], 0) / positiveTotal) * 100 : 0}%`;
      track.append(bar);
    }
    const rows = ["admob", "apple"].map((name) => {
      const row = node("div", `mix-row ${name}`),
        count = c[`${name}Days`];
      row.append(
        node("i"),
        node("span", "", name === "admob" ? "AdMob" : "App Store"),
        node("strong", "", money(count ? s.revenue[name] : null)),
        node("small", "", coverage(count)),
      );
      return row;
    });
    set(
      "revenueMix",
      node(
        "div",
        "mix-total",
        money(c.appleDays || c.admobDays ? s.revenue.total : null),
      ),
      node("p", "mix-caption", t("estimated")),
      track,
      ...rows,
    );
    const label = node("div", "", t("today"));
    label.append(node("small", "", t("provisional")));
    set("today", label, node("strong", "", money(data.today?.admobRevenue)));
    const insights = [];
    const other = Object.entries(s.revenue.otherCurrencies || {}).filter(
      ([, amount]) => amount !== 0,
    );
    if (other.length)
      insights.push([
        "currencies",
        t("currenciesBody", {
          values: other.map(([code, value]) => money(value, code)).join(" · "),
        }),
        true,
      ]);
    insights.push(["absentPlay", t("absentPlayBody"), false]);
    set(
      "insights",
      ...insights.map(([title, text, warn]) => {
        const el = node("div", `insight${warn ? " warn" : ""}`);
        el.append(node("strong", "", t(title)), node("p", "", text));
        return el;
      }),
    );
  }
  function renderAds() {
    const s = p(),
      a = s.ads,
      ready = s.coverage.admobDays > 0;
    $("adCoverage").textContent = coverage(s.coverage.admobDays);
    set(
      "funnel",
      ...[
        ["requests", a.requests],
        ["matched", a.matchedRequests],
        ["shown", a.impressions],
        ["clicks", a.clicks],
      ].map(([label, value]) => {
        const el = node("div", "funnel-stage"),
          track = node("div", "funnel-track"),
          fill = node("div", "funnel-fill");
        fill.style.width = `${ready && a.requests ? Math.max(0, Math.min(100, (value / a.requests) * 100)) : 0}%`;
        track.append(fill);
        el.append(
          node("span", "", t(label)),
          track,
          node("strong", "", int(ready ? value : null)),
        );
        return el;
      }),
    );
    set(
      "adStats",
      stat(t("coverageLabel"), pct(a.matchRate)),
      stat(t("showRate"), pct(a.showRate)),
      stat("CTR", pct(a.ctr)),
      stat("eCPM", money(a.rpm)),
    );
    renderRanking();
  }
  function countryName(code) {
    try {
      return (
        new Intl.DisplayNames([locale()], { type: "region" }).of(code) || code
      );
    } catch {
      return code;
    }
  }
  function renderRanking() {
    const rows = data.breakdowns?.[breakdown] || [];
    $("breakdownDates").textContent =
      data.breakdowns?.start && data.breakdowns?.end
        ? `${day(data.breakdowns.start)} – ${day(data.breakdowns.end)} · 30D`
        : t("breakdownPeriod");
    document.querySelectorAll("[data-breakdown]").forEach((b) => {
      b.classList.toggle("active", b.dataset.breakdown === breakdown);
      b.setAttribute("aria-pressed", b.dataset.breakdown === breakdown);
    });
    if (!rows.length) return empty("ranking", "noBreakdown");
    const max = Math.max(...rows.map((row) => row.earnings), 0.01);
    set(
      "ranking",
      ...rows.map((row) => {
        const el = node("div", "rank"),
          head = node("div", "rank-head"),
          name = node(
            "span",
            "rank-name",
            breakdown === "countries" ? countryName(row.id) : row.label,
          );
        name.title = name.textContent;
        head.append(name, node("strong", "", money(row.earnings)));
        const meta = node("div", "rank-meta");
        meta.append(
          node(
            "span",
            "",
            `${int(row.impressions)} ${t("impressions").toLowerCase()}`,
          ),
          node("span", "", `${money(row.rpm)} eCPM`),
        );
        const track = node("div", "rank-track"),
          fill = node("span");
        fill.style.width = `${Math.max(0, (row.earnings / max) * 100)}%`;
        track.append(fill);
        el.append(head, meta, track);
        return el;
      }),
    );
  }
  function renderStores() {
    const s = p(),
      a = s.acquisition,
      c = s.coverage,
      q = s.quality;
    $("appleCoverage").textContent = coverage(c.appleDays);
    $("playCoverage").textContent = coverage(c.playDays);
    set(
      "appleStats",
      stat(t("iosDownloads"), int(c.appleDays ? a.downloads : null)),
      stat(t("earnings"), money(c.appleDays ? s.revenue.apple : null)),
      stat(t("refunds"), int(c.appleDays ? a.refunds : null)),
    );
    const countries = (a.countries || [])
      .filter((row) => row.downloads > 0)
      .slice(0, 5);
    if (!countries.length) empty("appleCountries", "noCountries");
    else
      set(
        "appleCountries",
        ...countries.map((row) => {
          const el = node("div", "country-row");
          el.append(
            node("span", "", countryName(row.code)),
            node(
              "strong",
              "",
              `${int(row.downloads)} · ${pct(a.downloads ? row.downloads / a.downloads : null)}`,
            ),
          );
          return el;
        }),
      );
    set(
      "qualityStats",
      stat(t("crashLatest"), pct(q.crashRate)),
      stat(t("anrLatest"), pct(q.anrRate)),
      stat(t("peakCrash"), pct(q.peakCrashRate)),
      stat(t("peakAnr"), pct(q.peakAnrRate)),
    );
    $("qualityNote").textContent =
      present(q.crashRate) || present(q.anrRate)
        ? t("qualityDates", { crash: day(q.crashDate), anr: day(q.anrDate) })
        : t("qualityNone");
    const reviews = [
      ...(data.reviews?.apple?.recent || []).map((r) => ({
        ...r,
        store: "App Store",
      })),
      ...(data.reviews?.play?.recent || []).map((r) => ({
        ...r,
        store: "Google Play",
      })),
    ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (!reviews.length) return empty("reviews", "noReviews");
    set(
      "reviews",
      ...reviews.map((r) => {
        const el = node("article", "review"),
          top = node("div", "review-top"),
          rating = Math.max(0, Math.min(5, Math.round(r.rating || 0)));
        top.append(
          node("span", "stars", "★".repeat(rating) + "☆".repeat(5 - rating)),
          node("span", "", r.store),
        );
        const time = node("time", "", day(r.createdAt));
        if (r.createdAt) time.dateTime = r.createdAt;
        el.append(
          top,
          node("strong", "", r.title || r.author || t("reviewUnknown")),
          time,
        );
        if ((r.body || "").length > 180) {
          el.append(node("p", "", r.body.slice(0, 180) + "…"));
          const details = node("details");
          details.append(
            node("summary", "", t("readMore")),
            node("p", "", r.body),
          );
          el.append(details);
        } else el.append(node("p", "", r.body || "—"));
        return el;
      }),
    );
  }
  function tableValues(d) {
    return [
      d.date,
      total(d),
      d.appleRevenue,
      d.admobRevenue,
      d.downloads,
      d.impressions,
      d.clicks,
      d.rpm,
      d.impressions ? d.clicks / d.impressions : null,
      d.crashRate,
      d.anrRate,
    ];
  }
  const tableFormats = [
    day,
    money,
    money,
    money,
    int,
    int,
    int,
    money,
    pct,
    pct,
    pct,
  ];
  function renderTable() {
    set(
      "dailyTable",
      ...points()
        .slice()
        .reverse()
        .map((d) => {
          const row = node("tr", d.date === selected ? "selected" : "");
          row.append(
            ...tableValues(d).map((v, i) =>
              node("td", v === null ? "missing" : "", tableFormats[i](v)),
            ),
          );
          return row;
        }),
    );
    const s = p(),
      c = s.coverage;
    const values = [
      t("total"),
      money(c.appleDays || c.admobDays ? s.revenue.total : null),
      money(c.appleDays ? s.revenue.apple : null),
      money(c.admobDays ? s.revenue.admob : null),
      int(c.appleDays ? s.acquisition.downloads : null),
      int(c.admobDays ? s.ads.impressions : null),
      int(c.admobDays ? s.ads.clicks : null),
      money(s.ads.rpm),
      pct(s.ads.ctr),
      "—",
      "—",
    ];
    const row = node("tr");
    row.append(...values.map((v) => node("td", "", v)));
    set("tableTotals", row);
  }
  function renderSources() {
    set(
      "sources",
      ...Object.entries(sourceNames).map(([key, name]) => {
        const s = data.sources[key],
          el = node("article", `source ${s.status}`),
          body = node("div");
        body.append(
          node(
            "strong",
            "",
            `${name} · ${t(s.status === "ready" ? "sourceReady" : s.status === "error" ? "sourceError" : "sourcePending")}`,
          ),
          node(
            "small",
            "",
            s.lastSuccessAt
              ? t("lastData", { date: dateTime(s.lastSuccessAt) })
              : t("noPrevious"),
          ),
        );
        el.append(node("span", "source-dot"), body);
        return el;
      }),
    );
  }
  function render() {
    const s = p(),
      c = s.coverage;
    $("lastUpdated").textContent = data.generatedAt
      ? t("updated", { date: dateTime(data.generatedAt) })
      : t("noSync");
    $("periodDates").textContent =
      `${day(s.start)} – ${day(s.end)} · ${t("completeDays")}`;
    $("viewer").textContent = data.viewer?.email || "";
    document.querySelectorAll("[data-range]").forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.range) === range);
      b.setAttribute("aria-pressed", Number(b.dataset.range) === range);
    });
    renderKpis();
    renderChart();
    renderMix();
    renderAds();
    renderStores();
    renderTable();
    renderSources();
    const errors = Object.values(data.sources).some(
      (s) => s.status === "error",
    );
    const stale = Object.entries(data.sources).some(
      ([key, s]) =>
        s.lastSuccessAt &&
        Date.now() - Date.parse(s.lastSuccessAt) >
          (key === "apple" ? 48 : key === "play" ? 6 : 3) * 3600000,
    );
    notice(
      errors
        ? t("errorBody")
        : stale
          ? t("staleBody")
          : c.appleDays < range || c.admobDays < range
            ? `${t("partial")} · ${t("reportGap", { apple: c.appleDays, admob: c.admobDays, play: c.playDays, days: range })}. ${t("partialBody")}`
            : "",
      "warning",
    );
    $("exportButton").disabled = false;
  }
  async function load() {
    try {
      const response = await fetch("/api/dashboard", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("dashboard_unavailable");
      const result = await response.json();
      if (!result.periods?.[range] || !Array.isArray(result.daily))
        throw new Error("dashboard_invalid");
      data = result;
      render();
      return true;
    } catch {
      notice(t("loadError"), "error");
      return false;
    }
  }
  async function refresh() {
    $("refreshButton").disabled = true;
    $("refreshButton").classList.add("loading");
    clearTimeout(refreshTimer);
    try {
      if (!data) {
        await load();
        return;
      }
      notice(t("refreshing"));
      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { Accept: "application/json", "X-Pulse-Intent": "refresh" },
      });
      if (!response.ok) throw new Error("refresh_unavailable");
      const result = await response.json();
      if (!result.accepted) {
        await load();
        notice(t("cooldown"));
        return;
      }
      notice(
        t("queued", { source: sourceNames[result.source] || result.source }),
      );
      const previous = data.sources[result.source]?.lastSuccessAt;
      let attempts = 0;
      const poll = async () => {
        attempts++;
        await load();
        if (
          attempts < 6 &&
          data.sources[result.source]?.lastSuccessAt === previous &&
          data.sources[result.source]?.status !== "error"
        )
          refreshTimer = setTimeout(poll, 5000);
      };
      refreshTimer = setTimeout(poll, 5000);
    } catch {
      notice(t("loadError"), "error");
    } finally {
      $("refreshButton").disabled = false;
      $("refreshButton").classList.remove("loading");
    }
  }
  function exportCsv() {
    if (!data) return;
    const headers = [
      "date",
      "reported_revenue_eur",
      "apple_eur",
      "admob_eur",
      "ios_downloads",
      "impressions",
      "clicks",
      "ecpm_eur",
      "ctr",
      "crash_rate",
      "anr_rate",
    ];
    const csv = [headers, ...points().map(tableValues)]
      .map((row) =>
        row
          .map((v) => (v === null || v === undefined ? "" : String(v)))
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = node("a");
    a.href = url;
    a.download = `tindrop-${p().start}-${p().end}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.querySelectorAll("[data-range]").forEach((b) =>
    b.addEventListener("click", () => {
      range = Number(b.dataset.range);
      save("pulse.range", String(range));
      if (data) render();
    }),
  );
  document.querySelectorAll("[data-breakdown]").forEach((b) =>
    b.addEventListener("click", () => {
      breakdown = b.dataset.breakdown;
      if (data) renderRanking();
    }),
  );
  $("chartMetric").addEventListener("change", (event) => {
    metric = event.target.value;
    selected = null;
    if (data) {
      renderChart();
      renderTable();
    }
  });
  $("languageButton").addEventListener("click", () => {
    lang = lang === "es" ? "en" : "es";
    save("pulse.language", lang);
    translate();
  });
  $("refreshButton").addEventListener("click", refresh);
  $("exportButton").addEventListener("click", exportCsv);
  translate();
  load();
})();
