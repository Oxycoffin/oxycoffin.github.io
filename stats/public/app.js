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
      downloads: "Descargas",
      iosDownloads: "Descargas iOS",
      androidInstalls: "Instalaciones Android",
      activeUsers: "Usuarios activos Android",
      activeUsersShort: "Usuarios Android",
      crash: "Crashes Android",
      revenueMix: "De dónde viene el ingreso",
      adJourney: "De la solicitud al clic",
      funnelNote:
        "Cobertura = solicitudes con anuncio · Visualización = anuncios mostrados de los disponibles · CTR = clics por impresión.",
      topRevenue: "Qué genera más",
      breakdownPeriod: "Últimos 30 días · incluye hoy",
      breakdown: "Desglose",
      units: "Unidades",
      platforms: "Plataforma",
      countries: "Países",
      downloadCountries: "Descargas por país",
      installCountries: "Instalaciones por país",
      stability: "Estabilidad Android",
      reviews: "Lo que dicen los usuarios",
      reviewSample: "Reseñas recientes · todas las fechas",
      reviewFilter: "Filtrar reseñas",
      all: "Todas",
      date: "Fecha",
      clicks: "Clics",
      tableNote:
        "— = sin datos publicados. Los ingresos suman los importes disponibles en EUR; pueden estar incompletos. Hoy se muestra por separado por ser provisional.",
      sources: "Estado de las conexiones",
      description: "Tu app, en cifras. Panel privado de Tindrop.",
      updated: "Sincronizado {date}",
      noSync: "Esperando la primera sincronización",
      completeDays: "Días completos",
      coverage: "{count} de {days} días con datos",
      compare: "vs. {days} días anteriores",
      noCompare: "Sin histórico completo para comparar",
      reported: "Apple + AdMob + Play · importes disponibles",
      splitDownloads: "iOS {ios} · Android {android}",
      androidThrough: "Android publicado hasta el {date}",
      activeUsersNote: "Media diaria · usuarios medidos por Android vitals",
      impressionsNote: "Anuncios mostrados · AdMob",
      partial: "Cobertura parcial",
      partialBody:
        "Faltan días en alguna fuente. Las cifras reflejan solo los datos recibidos; las comparaciones necesitan dos periodos completos.",
      errorBody:
        "Una conexión no ha podido actualizarse. Se conservan sus últimos datos; consulta el estado al pie.",
      loadError:
        "No se pudo cargar el panel. Pulsa Actualizar para reintentar; si tu sesión ha caducado, vuelve a abrir la página.",
      refreshing: "Solicitando datos nuevos…",
      queued: "Actualizando {sources}…",
      refreshDone: "Datos actualizados.",
      cooldown:
        "Todas las fuentes se han consultado hace menos de cinco minutos. Se muestran los últimos datos disponibles.",
      estimated: "AdMob estimado + proceeds Apple + Play neto estimado, en EUR",
      liveTitle: "Hoy en directo",
      liveSource: "AdMob · provisional · {ago}",
      livePace: "{value} de un día medio (últimos {days} días)",
      liveNoPace: "Sin media reciente para comparar",
      liveEmpty: "AdMob todavía no ha publicado datos de hoy.",
      liveOn: "En directo · {ago}",
      liveStale: "Datos con retraso · {ago}",
      liveOff: "Sin conexión · último dato {ago}",
      now: "ahora",
      minutesAgo: "hace {n} min",
      hoursAgo: "hace {n} h",
      daysAgo: "hace {n} d",
      inMinutes: "en {n} min",
      inHours: "en {n} h",
      currencies: "Otros importes de Apple",
      currenciesBody: "Sin convertir ni sumar al total: {values}.",
      playCurrencies: "Ventas de Play en otras monedas",
      playCurrenciesBody:
        "Brutas, sin convertir ni sumar al total: {values}.",
      absentPlay: "Ventas de Play sin conectar",
      absentPlayBody:
        "El total no incluye las compras ni las suscripciones de Android.",
      requests: "Solicitudes",
      matched: "Con anuncio",
      shown: "Mostrados",
      coverageLabel: "Cobertura",
      showRate: "Visualización",
      earnings: "Ingresos",
      refunds: "Unidades devueltas",
      installs: "Instalaciones",
      uninstalls: "Desinstalaciones",
      activeDevices: "Dispositivos activos",
      playNet: "Ventas netas (est.)",
      orders: "Pedidos",
      playRefunds: "Reembolsos",
      playNote:
        "Google publica estos informes con 2–7 días de retraso; instalaciones hasta el {installs}, ventas hasta el {sales}. Ventas netas = precio sin impuestos menos el {fee} de comisión, solo en EUR.",
      playSetup:
        "Para ver instalaciones, valoración y ventas de Android, configura el bucket de informes de Google Play y da acceso de descarga a la cuenta de servicio.",
      playDenied:
        "La cuenta de servicio no puede leer algunos informes de Play ({reports}). Revisa sus permisos en Play Console.",
      playNoSales: "sin datos",
      ratingCount: "{count} valoraciones",
      ratingGlobal: "media global",
      crashMeter: "Crashes percibidos · último dato",
      anrMeter: "ANR percibidos · último dato",
      threshold: "Umbral de Google {value}",
      peakValue: "Pico del periodo {value}",
      usersLatest: "Usuarios · último día",
      usersAverage: "Usuarios · media diaria",
      qualityNone:
        "Play no ha publicado métricas de estabilidad para este periodo. Esto no significa que la tasa sea cero.",
      qualityDates:
        "Crashes: {crash} · ANR: {anr}. Tasas de usuarios afectados; por encima del umbral, Google puede reducir la visibilidad en Play.",
      noCountries:
        "No hay un desglose de descargas por país para este periodo.",
      noBreakdown:
        "No hay desglose disponible. Se consulta al actualizar AdMob.",
      noReviews:
        "No hay reseñas recientes disponibles en las conexiones actuales.",
      readMore: "Leer reseña completa",
      reviewUnknown: "Usuario",
      sourceReady: "Conectado",
      sourcePending: "Pendiente",
      sourceError: "Error al actualizar",
      sourceDisabled: "Sin configurar",
      lastData: "Última consulta: {date}",
      nextData: "Próxima {when}",
      noPrevious: "Sin consulta completada",
      chartMissing: "— sin dato",
      total: "Periodo",
      noChart: "Todavía no hay datos para representar esta métrica.",
      average: "Media diaria {value}",
      peak: "Máximo",
      reportGap:
        "Apple {apple}/{days} días · AdMob {admob}/{days} · Play {play}/{days}",
      chartDay:
        "{date}: {value}. Pulsa para seleccionar; usa las flechas para moverte.",
      csv: "Exportar datos diarios como CSV",
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
      downloads: "Downloads",
      iosDownloads: "iOS downloads",
      androidInstalls: "Android installs",
      activeUsers: "Android active users",
      activeUsersShort: "Android users",
      crash: "Android crashes",
      revenueMix: "Where revenue comes from",
      adJourney: "From request to click",
      funnelNote:
        "Match = requests with an ad · Show rate = displayed ads out of matched requests · CTR = clicks per impression.",
      topRevenue: "What earns the most",
      breakdownPeriod: "Last 30 days · includes today",
      breakdown: "Breakdown",
      units: "Ad units",
      platforms: "Platform",
      countries: "Countries",
      downloadCountries: "Downloads by country",
      installCountries: "Installs by country",
      stability: "Android stability",
      reviews: "What users are saying",
      reviewSample: "Recent reviews · all dates",
      reviewFilter: "Filter reviews",
      all: "All",
      date: "Date",
      clicks: "Clicks",
      tableNote:
        "— = no published data. Revenue adds available EUR amounts and may be incomplete. Today is shown separately because it is provisional.",
      sources: "Connection status",
      description: "Your app, in numbers. Private Tindrop dashboard.",
      updated: "Synced {date}",
      noSync: "Waiting for the first sync",
      completeDays: "Complete days",
      coverage: "{count} of {days} days with data",
      compare: "vs. previous {days} days",
      noCompare: "Not enough complete history to compare",
      reported: "Apple + AdMob + Play · available amounts",
      splitDownloads: "iOS {ios} · Android {android}",
      androidThrough: "Android published through {date}",
      activeUsersNote: "Daily average · users measured by Android vitals",
      impressionsNote: "Ads displayed · AdMob",
      partial: "Partial coverage",
      partialBody:
        "Some sources have missing days. Figures reflect received data only; comparisons require two complete periods.",
      errorBody:
        "A connection could not refresh. Its last data is retained; check connection status below.",
      loadError:
        "The dashboard could not load. Press Refresh to retry; if your session has expired, reopen the page.",
      refreshing: "Requesting new data…",
      queued: "Refreshing {sources}…",
      refreshDone: "Data updated.",
      cooldown:
        "Every source was checked less than five minutes ago. Showing the latest available data.",
      estimated: "Estimated AdMob + Apple proceeds + estimated Play net, in EUR",
      liveTitle: "Today, live",
      liveSource: "AdMob · provisional · {ago}",
      livePace: "{value} of an average day (last {days} days)",
      liveNoPace: "No recent average to compare",
      liveEmpty: "AdMob has not published data for today yet.",
      liveOn: "Live · {ago}",
      liveStale: "Delayed data · {ago}",
      liveOff: "Offline · last data {ago}",
      now: "just now",
      minutesAgo: "{n} min ago",
      hoursAgo: "{n} h ago",
      daysAgo: "{n} d ago",
      inMinutes: "in {n} min",
      inHours: "in {n} h",
      currencies: "Other Apple amounts",
      currenciesBody: "Not converted or added to the total: {values}.",
      playCurrencies: "Play sales in other currencies",
      playCurrenciesBody: "Gross, not converted or added to the total: {values}.",
      absentPlay: "Play sales not connected",
      absentPlayBody: "The total excludes Android purchases and subscriptions.",
      requests: "Requests",
      matched: "Matched",
      shown: "Displayed",
      coverageLabel: "Match rate",
      showRate: "Show rate",
      earnings: "Revenue",
      refunds: "Returned units",
      installs: "Installs",
      uninstalls: "Uninstalls",
      activeDevices: "Active devices",
      playNet: "Net sales (est.)",
      orders: "Orders",
      playRefunds: "Refunds",
      playNote:
        "Google posts these reports 2–7 days late; installs through {installs}, sales through {sales}. Net sales = price before tax minus the {fee} fee, EUR only.",
      playSetup:
        "To see Android installs, rating and sales, configure the Google Play reports bucket and give the service account download access.",
      playDenied:
        "The service account cannot read some Play reports ({reports}). Check its permissions in Play Console.",
      playNoSales: "no data",
      ratingCount: "{count} ratings",
      ratingGlobal: "overall average",
      crashMeter: "User-perceived crashes · latest",
      anrMeter: "User-perceived ANRs · latest",
      threshold: "Google threshold {value}",
      peakValue: "Period peak {value}",
      usersLatest: "Users · latest day",
      usersAverage: "Users · daily average",
      qualityNone:
        "Play has not published stability metrics for this period. This does not mean the rate is zero.",
      qualityDates:
        "Crashes: {crash} · ANR: {anr}. Rates of affected users; above the threshold, Google may reduce visibility on Play.",
      noCountries:
        "No download breakdown by country is available for this period.",
      noBreakdown:
        "No breakdown available. It is requested when AdMob refreshes.",
      noReviews:
        "No recent reviews are available from the current connections.",
      readMore: "Read full review",
      reviewUnknown: "User",
      sourceReady: "Connected",
      sourcePending: "Pending",
      sourceError: "Refresh failed",
      sourceDisabled: "Not configured",
      lastData: "Last check: {date}",
      nextData: "Next {when}",
      noPrevious: "No completed check",
      chartMissing: "— no data",
      total: "Period",
      noChart: "There is no data to chart for this metric yet.",
      average: "Daily average {value}",
      peak: "Peak",
      reportGap:
        "Apple {apple}/{days} days · AdMob {admob}/{days} · Play {play}/{days}",
      chartDay: "{date}: {value}. Press to select; use arrow keys to move.",
      csv: "Export daily data as CSV",
      staleBody:
        "A source is overdue for a refresh. Its last sync time appears below.",
    },
  };
  // Android vitals "bad behavior" thresholds for user-perceived rates.
  const THRESHOLDS = { crash: 0.0109, anr: 0.0047 };
  const POLL_INTERVAL = 60_000;
  const STALE_AFTER = {
    admob: 40,
    play: 3 * 60,
    playReports: 8 * 60,
    apple: 48 * 60,
  };
  const sourceNames = {
    admob: "AdMob",
    apple: "App Store",
    play: "Google Play · vitals",
    playReports: "Google Play · informes",
  };
  const sourceNamesEn = { ...sourceNames, playReports: "Google Play · reports" };
  const series = {
    revenue: [
      ["appleRevenue", "App Store", "s-apple"],
      ["admobRevenue", "AdMob", "s-admob"],
      ["playRevenue", "Google Play", "s-play"],
    ],
    downloads: [
      ["downloads", "iOS", "s-apple"],
      ["androidInstalls", "Android", "s-play"],
    ],
    impressions: [["impressions", "AdMob", "s-admob"]],
    activeUsers: [["activeUsers", "Android", "s-play"]],
    crashRate: [["crashRate", "Android", "s-warn"]],
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
    reviewFilter = "all",
    data = null,
    selected = null,
    etag = null,
    lastPollAt = 0,
    lastPollOk = false,
    loading = null,
    refreshTimer = null;
  const locale = () => (lang === "es" ? "es-ES" : "en-US");
  const t = (key, args = {}) =>
    Object.entries(args).reduce(
      (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
      copy[lang][key] || key,
    );
  const present = (v) =>
    v !== null && v !== undefined && Number.isFinite(Number(v));
  // Intl formatters are expensive to build; every render reuses them.
  const formatters = new Map();
  const formatter = (Type, options) => {
    const key = `${Type.name}|${locale()}|${JSON.stringify(options)}`;
    if (!formatters.has(key)) formatters.set(key, new Type(locale(), options));
    return formatters.get(key);
  };
  const fmt = (v, options = {}) =>
    present(v) ? formatter(Intl.NumberFormat, options).format(v) : "—";
  const int = (v) => fmt(v, { maximumFractionDigits: 0 });
  const compact = (v) =>
    Math.abs(v) >= 10_000
      ? fmt(v, { notation: "compact", maximumFractionDigits: 1 })
      : int(v);
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
      ? formatter(Intl.DateTimeFormat, {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }).format(new Date(`${v.slice(0, 10)}T12:00:00Z`))
      : "—";
  const dateTime = (v) =>
    v
      ? formatter(Intl.DateTimeFormat, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(v))
      : "—";
  const ago = (v) => {
    if (!v) return "—";
    const minutes = Math.max(0, Math.round((Date.now() - Date.parse(v)) / 60000));
    if (minutes < 1) return t("now");
    if (minutes < 60) return t("minutesAgo", { n: minutes });
    if (minutes < 48 * 60) return t("hoursAgo", { n: Math.round(minutes / 60) });
    return t("daysAgo", { n: Math.round(minutes / 1440) });
  };
  const until = (v) => {
    const minutes = Math.round((Date.parse(v) - Date.now()) / 60000);
    if (minutes <= 1) return t("now");
    return minutes < 90
      ? t("inMinutes", { n: minutes })
      : t("inHours", { n: Math.round(minutes / 60) });
  };
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
    present(d.appleRevenue) || present(d.admobRevenue) || present(d.playRevenue)
      ? (d.appleRevenue || 0) + (d.admobRevenue || 0) + (d.playRevenue || 0)
      : null;
  const downloadsOf = (d) =>
    present(d.downloads) || present(d.androidInstalls)
      ? (d.downloads || 0) + (d.androidInstalls || 0)
      : null;
  const valueOf = (d) =>
    metric === "revenue"
      ? total(d)
      : metric === "downloads"
        ? downloadsOf(d)
        : d[metric];
  const valueFormat = (v) =>
    metric === "revenue" ? money(v) : metric === "crashRate" ? pct(v) : int(v);
  const coverage = (count, days = range) => t("coverage", { count, days });
  const names = () => (lang === "es" ? sourceNames : sourceNamesEn);
  function notice(text = "", type = "") {
    $("notice").textContent = text;
    $("notice").className = `notice ${type}`;
  }
  function empty(id, key) {
    set(id, node("p", "empty", t(key)));
  }
  function stat(label, value, hint) {
    const el = node("div", "stat");
    el.append(node("small", "", label), node("strong", "", value));
    if (hint) el.append(node("small", "stat-hint", hint));
    return el;
  }
  function deltaNode(delta) {
    return node(
      "span",
      `delta ${delta > 0 ? "up" : delta < 0 ? "down" : ""}`,
      `${delta > 0 ? "+" : ""}${fmt(delta, { maximumFractionDigits: 1 })}%`,
    );
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
      c = s.coverage,
      a = s.acquisition;
    const androidLag =
      c.installsThrough && c.installsThrough < s.end
        ? t("androidThrough", { date: day(c.installsThrough) })
        : null;
    const metrics = [
      {
        label: "revenue",
        value: money(c.appleDays || c.admobDays || c.salesDays ? s.revenue.total : null),
        delta: s.revenue.change,
        scope: s.revenue.changeScope === "appleAdmob" ? "Apple + AdMob" : null,
        note: t("reported"),
        symbol: "€",
      },
      {
        label: "downloads",
        value: int(c.appleDays || c.installDays ? a.totalDownloads : null),
        delta: a.totalChange,
        scope: a.totalChangeScope === "ios" ? "iOS" : null,
        note: [
          t("splitDownloads", {
            ios: int(c.appleDays ? a.downloads : null),
            android: int(c.installDays ? a.androidInstalls : null),
          }),
          androidLag,
        ]
          .filter(Boolean)
          .join(" · "),
        symbol: "↓",
      },
      {
        label: "activeUsers",
        value: int(s.users.androidAverage),
        delta: s.users.androidChange,
        note: t("activeUsersNote"),
        symbol: "◉",
      },
      {
        label: "impressions",
        value: int(c.admobDays ? s.ads.impressions : null),
        delta: s.ads.impressionsChange,
        note: t("impressionsNote"),
        symbol: "◫",
      },
    ];
    set(
      "kpis",
      ...metrics.map(({ label, value, delta, scope, note, symbol }) => {
        const el = node("article", "kpi"),
          top = node("div", "kpi-label", t(label));
        top.append(node("span", "kpi-symbol", symbol));
        el.append(top, node("strong", "kpi-value", value));
        const bottom = node("div", "kpi-bottom");
        if (present(delta))
          bottom.append(
            deltaNode(delta),
            node("span", "", `${scope ? `${scope} ` : ""}${t("compare", { days: range })}`),
          );
        else bottom.textContent = t("noCompare");
        el.append(bottom, node("p", "kpi-note", note));
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
  function renderLegend() {
    set(
      "chartLegend",
      ...series[metric].map(([, label, cls]) => {
        const item = node("span", "legend-item");
        item.append(node("i", cls), node("span", "", label));
        return item;
      }),
    );
  }
  function selectDay(date, focus = false) {
    selected = date;
    $("chart")
      .querySelectorAll(".chart-hit")
      .forEach((group) => {
        const active = group.dataset.date === date;
        group.classList.toggle("selected", active);
        group.setAttribute("aria-pressed", active);
        group.setAttribute("tabindex", active ? 0 : -1);
        if (active && focus) group.focus();
      });
    $("dailyTable")
      .querySelectorAll("tr")
      .forEach((row) => row.classList.toggle("selected", row.dataset.date === date));
    renderDay();
  }
  function renderChart() {
    const rows = points(),
      values = rows.map(valueOf),
      available = values.filter(present),
      parts = series[metric];
    if (!rows.some((d) => d.date === selected))
      selected =
        [...rows].reverse().find((d) => present(valueOf(d)))?.date ||
        rows.at(-1)?.date;
    const sum = available.reduce((a, b) => a + b, 0);
    const mean = available.length ? sum / available.length : null;
    set(
      "chartSummary",
      node(
        "strong",
        "",
        valueFormat(
          available.length
            ? metric === "crashRate"
              ? Math.max(...available)
              : metric === "activeUsers"
                ? mean
                : sum
            : null,
        ),
      ),
      node(
        "span",
        "",
        metric === "crashRate"
          ? t("peak")
          : metric === "activeUsers"
            ? t("activeUsersNote")
            : `${coverage(available.length)} · ${t("average", { value: valueFormat(mean) })}`,
      ),
    );
    $("chartCaption").textContent = t("chartMissing");
    renderLegend();
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
    // Stacks grow up for positive parts and down for refunds.
    const stacks = rows.map((d) => {
      let up = 0,
        down = 0;
      return parts.map(([key, , cls]) => {
        const v = Number(d[key]);
        if (!present(d[key]) || v === 0) return null;
        const from = v > 0 ? up : down;
        if (v > 0) up += v;
        else down += v;
        return { from, to: from + v, cls };
      });
    });
    const extremes = stacks.flat().filter(Boolean).flatMap((seg) => [seg.from, seg.to]);
    const min = Math.min(0, ...extremes, ...available),
      max = Math.max(0, ...extremes, ...available);
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
      "aria-label": t(metric),
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
          metric === "revenue" || metric === "crashRate" ? valueFormat(v) : compact(v),
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
        "data-date": d.date,
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
        const segments = stacks[i].filter(Boolean);
        if (!segments.length)
          group.append(
            svg("rect", { x: x - barWidth / 2, y: base - 1.5, width: barWidth, height: 1.5, class: "chart-bar seg" }),
          );
        segments.forEach((seg) => {
          const y1 = y(Math.max(seg.from, seg.to)),
            y2 = y(Math.min(seg.from, seg.to));
          group.append(
            svg("rect", {
              x: x - barWidth / 2,
              y: y1,
              width: barWidth,
              height: Math.max(1.5, y2 - y1),
              class: `chart-bar seg ${seg.cls}`,
            }),
          );
        });
        if (range === 7 || i % 5 === 0 || d.date === selected)
          group.append(
            svg(
              "text",
              {
                x,
                y: v < 0 ? py + 16 : Math.min(py, ...segments.map((seg) => y(Math.max(seg.from, seg.to)))) - 8,
                "text-anchor": "middle",
                class: "chart-value",
              },
              metric === "revenue"
                ? fmt(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : metric === "crashRate"
                  ? valueFormat(v)
                  : compact(v),
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
      group.addEventListener("click", () => selectDay(d.date));
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
        selectDay(rows[next].date, true);
      });
      chart.append(group);
    });
    if (present(mean) && metric !== "crashRate") {
      const my = y(mean);
      chart.append(
        svg("line", { x1: left, x2: width - right, y1: my, y2: my, class: "chart-mean" }),
      );
    }
    if (metric === "crashRate") {
      const ty = y(THRESHOLDS.crash);
      if (ty > top - 4)
        chart.append(
          svg("line", { x1: left, x2: width - right, y1: ty, y2: ty, class: "chart-threshold" }),
          svg("text", { x: width - right, y: ty - 5, "text-anchor": "end", class: "chart-threshold-label" }, t("threshold", { value: pct(THRESHOLDS.crash) })),
        );
    }
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
      stat("Play", money(d.playRevenue)),
      stat("iOS", int(d.downloads)),
      stat("Android", int(d.androidInstalls)),
      stat(t("impressions"), int(d.impressions)),
      stat(t("activeUsersShort"), int(d.activeUsers)),
      stat(t("crash"), pct(d.crashRate)),
    );
  }
  function renderLive() {
    const live = data.live || {};
    const head = node("div", "live-head");
    const title = node("strong", "", t("liveTitle"));
    title.prepend(node("i", "pulse-dot"));
    head.append(title, node("small", "", t("liveSource", { ago: ago(live.updatedAt) })));
    if (!present(live.revenue)) {
      set("live", head, node("p", "live-empty", t("liveEmpty")));
      return;
    }
    const share = present(live.averageRevenue) && live.averageRevenue > 0
      ? live.revenue / live.averageRevenue
      : null;
    const track = node("div", "pace-track"),
      fill = node("span");
    fill.style.width = `${present(share) ? Math.min(100, share * 100) : 0}%`;
    track.append(fill);
    const stats = node("div", "live-stats");
    stats.append(
      stat(t("impressions"), int(live.impressions)),
      stat("eCPM", money(live.rpm)),
      stat(t("clicks"), int(live.clicks)),
    );
    set(
      "live",
      head,
      node("div", "live-value", money(live.revenue)),
      track,
      node(
        "p",
        "live-pace",
        present(share)
          ? t("livePace", { value: pct(share), days: live.averageDays })
          : t("liveNoPace"),
      ),
      stats,
    );
  }
  function renderMix() {
    const s = p(),
      c = s.coverage;
    const playConnected = data.sources.playReports?.configured && data.play?.salesAvailable;
    const parts = [
      ["admob", "AdMob", c.admobDays],
      ["apple", "App Store", c.appleDays],
      ...(playConnected ? [["play", "Google Play", c.salesDays]] : []),
    ];
    const track = node("div", "mix-track");
    const positiveTotal = parts.reduce(
      (acc, [name]) => acc + Math.max(s.revenue[name], 0),
      0,
    );
    for (const [name] of parts) {
      const bar = node("span", name);
      bar.style.width = `${positiveTotal ? (Math.max(s.revenue[name], 0) / positiveTotal) * 100 : 0}%`;
      track.append(bar);
    }
    const rows = parts.map(([name, label, count]) => {
      const row = node("div", `mix-row ${name}`);
      const share = positiveTotal ? Math.max(s.revenue[name], 0) / positiveTotal : null;
      row.append(
        node("i"),
        node("span", "", label),
        node("strong", "", money(count ? s.revenue[name] : null)),
        node("small", "", `${coverage(count)}${present(share) && count ? ` · ${pct(share)}` : ""}`),
      );
      return row;
    });
    set(
      "revenueMix",
      node(
        "div",
        "mix-total",
        money(c.appleDays || c.admobDays || c.salesDays ? s.revenue.total : null),
      ),
      node("p", "mix-caption", t("estimated")),
      track,
      ...rows,
    );
    const insights = [];
    const otherApple = Object.entries(s.revenue.otherCurrencies || {});
    const otherPlay = Object.entries(s.revenue.playOtherCurrencies || {});
    const amounts = (list) => list.map(([code, value]) => money(value, code)).join(" · ");
    if (otherApple.length)
      insights.push(["currencies", t("currenciesBody", { values: amounts(otherApple) }), true]);
    if (otherPlay.length)
      insights.push(["playCurrencies", t("playCurrenciesBody", { values: amounts(otherPlay) }), true]);
    if (!playConnected) insights.push(["absentPlay", t("absentPlayBody"), false]);
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
      return formatter(Intl.DisplayNames, { type: "region" }).of(code) || code;
    } catch {
      return code;
    }
  }
  function platformName(row) {
    const id = String(row.id || row.label || "").toUpperCase();
    return id === "IOS" ? "iOS" : id === "ANDROID" ? "Android" : row.label;
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
    const totalEarnings = rows.reduce((acc, row) => acc + Math.max(0, row.earnings), 0);
    set(
      "ranking",
      ...rows.map((row) => {
        const el = node("div", "rank"),
          head = node("div", "rank-head"),
          name = node(
            "span",
            "rank-name",
            breakdown === "countries"
              ? countryName(row.id)
              : breakdown === "platforms"
                ? platformName(row)
                : row.label,
          );
        name.title = name.textContent;
        head.append(name, node("strong", "", money(row.earnings)));
        const meta = node("div", "rank-meta");
        meta.append(
          node(
            "span",
            "",
            `${int(row.impressions)} ${t("impressions").toLowerCase()} · ${pct(totalEarnings ? row.earnings / totalEarnings : null)}`,
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
  function ratingBadge(id, rating, detail) {
    if (!rating || !present(rating.average)) return set(id);
    const badge = node("strong", "", `★ ${fmt(rating.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`);
    set(id, badge, node("small", "", detail));
  }
  function countryRows(id, rows, field, totalValue, emptyKey) {
    const list = rows.filter((row) => row[field] > 0).slice(0, 5);
    if (!list.length) return empty(id, emptyKey);
    set(
      id,
      ...list.map((row) => {
        const el = node("div", "country-row");
        el.append(
          node("span", "", countryName(row.code)),
          node(
            "strong",
            "",
            `${int(row[field])} · ${pct(totalValue ? row[field] / totalValue : null)}`,
          ),
        );
        return el;
      }),
    );
  }
  function meter(label, value, threshold, peak) {
    const el = node("div", "meter");
    const head = node("div", "meter-head");
    head.append(node("span", "", label), node("strong", "", pct(value)));
    const track = node("div", "meter-track"),
      fill = node("span", present(value) && value > threshold ? "over" : "");
    // The threshold marker sits at two thirds of the track.
    fill.style.width = `${present(value) ? Math.min(100, (value / (threshold * 1.5)) * 100) : 0}%`;
    track.append(fill, node("i", "meter-mark"));
    const meta = node("div", "meter-meta");
    meta.append(
      node("span", "", t("threshold", { value: pct(threshold) })),
      node("span", "", t("peakValue", { value: pct(peak) })),
    );
    el.append(head, track, meta);
    return el;
  }
  function renderStores() {
    const s = p(),
      a = s.acquisition,
      c = s.coverage,
      q = s.quality,
      reports = data.sources.playReports || {};
    $("appleCoverage").textContent = coverage(c.appleDays);
    ratingBadge(
      "appleRating",
      data.ratings?.apple,
      data.ratings?.apple?.count ? t("ratingCount", { count: int(data.ratings.apple.count) }) : "",
    );
    set(
      "appleStats",
      stat(t("iosDownloads"), int(c.appleDays ? a.downloads : null)),
      stat(t("earnings"), money(c.appleDays ? s.revenue.apple : null)),
      stat(t("refunds"), int(c.appleDays ? a.refunds : null)),
    );
    countryRows("appleCountries", a.countries || [], "downloads", a.downloads, "noCountries");

    $("playCoverage").textContent = coverage(c.installDays);
    ratingBadge("playRating", data.ratings?.play, t("ratingGlobal"));
    if (!reports.configured) {
      set("playStats");
      empty("playCountries", "playSetup");
      $("playNote").textContent = "";
    } else {
      const sales = data.play?.salesAvailable;
      set(
        "playStats",
        stat(t("installs"), int(c.installDays ? a.androidInstalls : null)),
        stat(t("uninstalls"), int(c.installDays ? a.androidUninstalls : null)),
        stat(t("activeDevices"), int(a.androidActiveDevices)),
        stat(t("playNet"), money(sales && c.salesDays ? s.revenue.play : null)),
        stat(t("orders"), int(sales && c.salesDays ? s.play.orders : null)),
        stat(t("playRefunds"), int(sales && c.salesDays ? s.play.refunds : null)),
      );
      countryRows("playCountries", a.androidCountries || [], "installs", a.androidInstalls, "noCountries");
      $("playNote").textContent = reports.denied?.length
        ? t("playDenied", { reports: reports.denied.join(", ") })
        : t("playNote", {
            installs: day(c.installsThrough),
            sales: c.salesThrough ? day(c.salesThrough) : t("playNoSales"),
            fee: pct(data.play?.feeRate ?? 0.15),
          });
    }

    $("vitalsCoverage").textContent = coverage(c.playDays);
    const users = node("div", "stat-row compact");
    users.append(
      stat(t("usersLatest"), int(s.users.androidLatest)),
      stat(t("usersAverage"), int(s.users.androidAverage)),
    );
    set(
      "qualityStats",
      meter(t("crashMeter"), q.crashRate, THRESHOLDS.crash, q.peakCrashRate),
      meter(t("anrMeter"), q.anrRate, THRESHOLDS.anr, q.peakAnrRate),
      users,
    );
    $("qualityNote").textContent =
      present(q.crashRate) || present(q.anrRate)
        ? t("qualityDates", { crash: day(q.crashDate), anr: day(q.anrDate) })
        : t("qualityNone");
    renderReviews();
  }
  function renderReviews() {
    document.querySelectorAll("[data-review]").forEach((b) => {
      b.classList.toggle("active", b.dataset.review === reviewFilter);
      b.setAttribute("aria-pressed", b.dataset.review === reviewFilter);
    });
    const reviews = [
      ...(data.reviews?.apple?.recent || []).map((r) => ({
        ...r,
        store: "App Store",
      })),
      ...(data.reviews?.play?.recent || []).map((r) => ({
        ...r,
        store: "Google Play",
      })),
    ]
      .filter((r) => reviewFilter === "all" || r.store === reviewFilter)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (!reviews.length) return empty("reviews", "noReviews");
    set(
      "reviews",
      ...reviews.map((r) => {
        const el = node("article", "review"),
          top = node("div", "review-top"),
          rating = Math.max(0, Math.min(5, Math.round(r.rating || 0)));
        top.append(
          node("span", `stars${rating <= 2 ? " low" : ""}`, "★".repeat(rating) + "☆".repeat(5 - rating)),
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
      d.playRevenue,
      d.downloads,
      d.androidInstalls,
      d.impressions,
      d.clicks,
      d.rpm,
      d.impressions ? d.clicks / d.impressions : null,
      d.activeUsers,
      d.crashRate,
      d.anrRate,
    ];
  }
  const tableFormats = [
    day,
    money,
    money,
    money,
    money,
    int,
    int,
    int,
    int,
    money,
    pct,
    int,
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
          row.dataset.date = d.date;
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
      money(c.appleDays || c.admobDays || c.salesDays ? s.revenue.total : null),
      money(c.appleDays ? s.revenue.apple : null),
      money(c.admobDays ? s.revenue.admob : null),
      money(c.salesDays ? s.revenue.play : null),
      int(c.appleDays ? s.acquisition.downloads : null),
      int(c.installDays ? s.acquisition.androidInstalls : null),
      int(c.admobDays ? s.ads.impressions : null),
      int(c.admobDays ? s.ads.clicks : null),
      money(s.ads.rpm),
      pct(s.ads.ctr),
      int(s.users.androidAverage),
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
      ...Object.entries(names()).map(([key, name]) => {
        const s = data.sources[key] || { status: "pending" },
          el = node("article", `source ${s.status}`),
          body = node("div");
        const status =
          s.status === "ready"
            ? "sourceReady"
            : s.status === "error"
              ? "sourceError"
              : s.status === "disabled"
                ? "sourceDisabled"
                : "sourcePending";
        body.append(
          node("strong", "", `${name} · ${t(status)}`),
          node(
            "small",
            "",
            s.lastSuccessAt
              ? `${t("lastData", { date: ago(s.lastSuccessAt) })}${s.nextUpdateAt && s.status !== "disabled" ? ` · ${t("nextData", { when: until(s.nextUpdateAt) })}` : ""}`
              : t("noPrevious"),
          ),
        );
        if (s.status === "error" && s.error) body.append(node("small", "source-error", s.error));
        el.title = s.lastSuccessAt ? dateTime(s.lastSuccessAt) : "";
        el.append(node("span", "source-dot"), body);
        return el;
      }),
    );
  }
  function freshness() {
    const live = $("liveStatus");
    if (!data) return;
    const newest = Object.values(data.sources)
      .map((s) => s.lastSuccessAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    const admobAge = Date.now() - Date.parse(data.sources.admob?.lastSuccessAt || 0);
    const state = !lastPollOk
      ? "off"
      : admobAge <= STALE_AFTER.admob * 60000
        ? "on"
        : "stale";
    live.className = `live-status ${state}`;
    $("liveText").textContent = t(
      state === "on" ? "liveOn" : state === "stale" ? "liveStale" : "liveOff",
      { ago: ago(newest) },
    );
    $("lastUpdated").textContent = data.generatedAt
      ? t("updated", { date: `${dateTime(data.generatedAt)} · ${ago(data.generatedAt)}` })
      : t("noSync");
  }
  function overallNotice() {
    const c = p().coverage;
    const errors = Object.values(data.sources).some((s) => s.status === "error");
    const stale = Object.entries(data.sources).some(
      ([key, s]) =>
        s.status !== "disabled" &&
        s.lastSuccessAt &&
        Date.now() - Date.parse(s.lastSuccessAt) > (STALE_AFTER[key] || 60) * 60000,
    );
    return errors
      ? t("errorBody")
      : stale
        ? t("staleBody")
        : c.appleDays < range || c.admobDays < range
          ? `${t("partial")} · ${t("reportGap", { apple: c.appleDays, admob: c.admobDays, play: c.playDays, days: range })}. ${t("partialBody")}`
          : "";
  }
  function render() {
    const s = p();
    $("periodDates").textContent =
      `${day(s.start)} – ${day(s.end)} · ${t("completeDays")}`;
    $("viewer").textContent = data.viewer?.email || "";
    document.querySelectorAll("[data-range]").forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.range) === range);
      b.setAttribute("aria-pressed", Number(b.dataset.range) === range);
    });
    renderKpis();
    renderChart();
    renderTable();
    renderLive();
    renderMix();
    renderAds();
    renderStores();
    renderSources();
    freshness();
    if (!refreshTimer) notice(overallNotice(), "warning");
    $("exportButton").disabled = false;
  }
  // Polls are conditional: an unchanged snapshot costs a 304 and no render.
  function load() {
    if (loading) return loading;
    loading = (async () => {
      try {
        const headers = { Accept: "application/json" };
        if (etag && data) headers["If-None-Match"] = etag;
        const response = await fetch("/api/dashboard", {
          headers,
          cache: "no-store",
        });
        lastPollAt = Date.now();
        if (response.status === 304) {
          lastPollOk = true;
          freshness();
          return false;
        }
        if (!response.ok) throw new Error("dashboard_unavailable");
        const result = await response.json();
        if (!result.periods?.[range] || !Array.isArray(result.daily))
          throw new Error("dashboard_invalid");
        etag = response.headers.get("ETag");
        data = result;
        lastPollOk = true;
        render();
        return true;
      } catch {
        lastPollOk = false;
        if (data) freshness();
        else notice(t("loadError"), "error");
        return false;
      } finally {
        loading = null;
      }
    })();
    return loading;
  }
  async function refresh() {
    $("refreshButton").disabled = true;
    $("refreshButton").classList.add("loading");
    clearTimeout(refreshTimer);
    refreshTimer = null;
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
      const pending = result.sources || [result.source].filter(Boolean);
      const before = Object.fromEntries(
        pending.map((name) => [name, data.sources[name]?.lastSuccessAt || null]),
      );
      notice(t("queued", { sources: pending.map((name) => names()[name] || name).join(", ") }));
      let attempts = 0;
      const poll = async () => {
        attempts++;
        await load();
        const done = pending.every(
          (name) =>
            data.sources[name]?.lastSuccessAt !== before[name] ||
            data.sources[name]?.status === "error",
        );
        if (!done && attempts < 15) refreshTimer = setTimeout(poll, 4000);
        else {
          refreshTimer = null;
          notice(overallNotice() || (done ? t("refreshDone") : ""), "warning");
        }
      };
      refreshTimer = setTimeout(poll, 3000);
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
      "play_net_estimate_eur",
      "ios_downloads",
      "android_installs",
      "impressions",
      "clicks",
      "ecpm_eur",
      "ctr",
      "android_active_users",
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
  document.querySelectorAll("[data-review]").forEach((b) =>
    b.addEventListener("click", () => {
      reviewFilter = b.dataset.review;
      if (data) renderReviews();
    }),
  );
  $("chartMetric").addEventListener("change", (event) => {
    metric = event.target.value;
    selected = null;
    if (data) {
      renderChart();
      selectDay(selected);
    }
  });
  $("languageButton").addEventListener("click", () => {
    lang = lang === "es" ? "en" : "es";
    save("pulse.language", lang);
    formatters.clear();
    translate();
  });
  $("refreshButton").addEventListener("click", refresh);
  $("exportButton").addEventListener("click", exportCsv);
  // Live mode: relative times tick every 15 s and the snapshot is polled
  // every minute while the tab is visible, immediately when it returns.
  setInterval(() => {
    if (document.hidden || !data) return;
    if (Date.now() - lastPollAt >= POLL_INTERVAL) load();
    else freshness();
  }, 15_000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - lastPollAt >= 15_000) load();
  });
  window.addEventListener("online", () => load());
  translate();
  load();
})();
