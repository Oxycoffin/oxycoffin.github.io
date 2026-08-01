(() => {
  "use strict";

  const STORAGE_KEY = "caja-clara.history.v1";
  const DRAFT_KEY = "caja-clara.draft.v1";
  const MAX_HISTORY = 100;
  const denominations = {
    bills: [
      { cents: 50000, label: "500 €", className: "bill-500" },
      { cents: 20000, label: "200 €", className: "bill-200" },
      { cents: 10000, label: "100 €", className: "bill-100" },
      { cents: 5000, label: "50 €", className: "bill-50" },
      { cents: 2000, label: "20 €", className: "bill-20" },
      { cents: 1000, label: "10 €", className: "bill-10" },
      { cents: 500, label: "5 €", className: "bill-5" }
    ],
    coins: [
      { cents: 200, label: "2 €", grams: 8.5, className: "coin-2" },
      { cents: 100, label: "1 €", grams: 7.5, className: "coin-1" },
      { cents: 50, label: "50 c", grams: 7.8, className: "coin-gold" },
      { cents: 20, label: "20 c", grams: 5.74, className: "coin-gold" },
      { cents: 10, label: "10 c", grams: 4.1, className: "coin-gold" },
      { cents: 5, label: "5 c", grams: 3.92, className: "coin-copper" },
      { cents: 2, label: "2 c", grams: 3.06, className: "coin-copper" },
      { cents: 1, label: "1 c", grams: 2.3, className: "coin-copper" }
    ]
  };

  const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  const dateTime = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });
  const elements = {
    billGrid: document.querySelector("#billGrid"),
    coinGrid: document.querySelector("#coinGrid"),
    template: document.querySelector("#cashCardTemplate"),
    billSubtotal: document.querySelector("#billSubtotal"),
    coinSubtotal: document.querySelector("#coinSubtotal"),
    grandTotal: document.querySelector("#grandTotal"),
    heroTotal: document.querySelector("#heroTotal"),
    dockTotal: document.querySelector("#dockTotal"),
    draftStatus: document.querySelector("#draftStatus"),
    difference: document.querySelector("#difference"),
    differenceLabel: document.querySelector("#differenceLabel"),
    differenceValue: document.querySelector("#differenceValue"),
    expectedTotal: document.querySelector("#expectedTotal"),
    sessionName: document.querySelector("#sessionName"),
    quantityButton: document.querySelector("#quantityButton"),
    weightButton: document.querySelector("#weightButton"),
    modeHelp: document.querySelector("#modeHelp"),
    historyList: document.querySelector("#historyList"),
    emptyHistory: document.querySelector("#emptyHistory"),
    historyCount: document.querySelector("#historyCount"),
    exportButton: document.querySelector("#exportButton"),
    toast: document.querySelector("#toast"),
    dialog: document.querySelector("#confirmDialog"),
    dialogTitle: document.querySelector("#dialogTitle"),
    dialogMessage: document.querySelector("#dialogMessage"),
    confirmAction: document.querySelector("#confirmAction")
  };

  let coinMode = "quantity";
  let currentTotals = { bills: 0, coins: 0, total: 0 };
  let pendingAction = null;
  let toastTimer;

  function formatCents(cents) {
    return euro.format((Number(cents) || 0) / 100);
  }

  function parsePositiveNumber(raw) {
    const compact = String(raw ?? "").trim().replace(/\s/g, "");
    const normalized = compact.includes(",")
      ? compact.replaceAll(".", "").replace(",", ".")
      : compact;
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function parseMoneyToCents(raw) {
    const value = parsePositiveNumber(raw);
    return Math.round(value * 100);
  }

  function sanitizeCount(value) {
    return Math.max(0, Math.min(999999, Math.floor(Number(value) || 0)));
  }

  function createCard(item, type) {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const input = card.querySelector(".cash-input");
    card.dataset.type = type;
    card.dataset.cents = String(item.cents);
    if (item.grams) card.dataset.grams = String(item.grams);
    if (type === "coins") card.classList.add("cash-card--coin");

    const denomination = card.querySelector(".denomination");
    denomination.classList.add(item.className);
    card.querySelector(".denomination__value").textContent = item.label;
    input.dataset.key = `${type}-${item.cents}`;
    input.setAttribute("aria-label", `Cantidad de ${item.label}`);
    card.querySelector(".decrement").setAttribute("aria-label", `Restar una unidad de ${item.label}`);
    card.querySelector(".increment").setAttribute("aria-label", `Sumar una unidad de ${item.label}`);

    card.querySelector(".decrement").addEventListener("click", () => changeInput(input, -1));
    card.querySelector(".increment").addEventListener("click", () => changeInput(input, 1));
    input.addEventListener("input", () => {
      calculate();
      saveDraft();
    });
    input.addEventListener("blur", () => normalizeInput(input, type));
    return card;
  }

  function buildCards() {
    denominations.bills.forEach(item => elements.billGrid.append(createCard(item, "bills")));
    denominations.coins.forEach(item => elements.coinGrid.append(createCard(item, "coins")));
    updateCoinModeUI();
  }

  function normalizeInput(input, type) {
    const value = parsePositiveNumber(input.value);
    if (!value) input.value = "";
    else if (type === "bills" || coinMode === "quantity") input.value = String(sanitizeCount(value));
    else input.value = String(Math.round(value * 100) / 100).replace(".", ",");
    calculate();
    saveDraft();
  }

  function changeInput(input, direction) {
    const card = input.closest(".cash-card");
    const type = card.dataset.type;
    const step = type === "coins" && coinMode === "weight" ? Number(card.dataset.grams) : 1;
    const next = Math.max(0, parsePositiveNumber(input.value) + (direction * step));
    input.value = next > 0 ? (coinMode === "weight" && type === "coins" ? next.toFixed(2).replace(".", ",") : String(sanitizeCount(next))) : "";
    calculate();
    saveDraft();
  }

  function getCardQuantity(card) {
    const entered = parsePositiveNumber(card.querySelector(".cash-input").value);
    if (card.dataset.type === "coins" && coinMode === "weight") {
      return sanitizeCount(Math.round(entered / Number(card.dataset.grams)));
    }
    return sanitizeCount(entered);
  }

  function calculate() {
    let bills = 0;
    let coins = 0;
    document.querySelectorAll(".cash-card").forEach(card => {
      const quantity = getCardQuantity(card);
      const amount = quantity * Number(card.dataset.cents);
      if (card.dataset.type === "bills") bills += amount;
      else coins += amount;
      card.querySelector(".amount").textContent = formatCents(amount);
      if (card.dataset.type === "coins") {
        const detail = card.querySelector(".detail");
        detail.textContent = coinMode === "weight"
          ? `${quantity.toLocaleString("es-ES")} moneda${quantity === 1 ? "" : "s"} estimada${quantity === 1 ? "" : "s"}`
          : `${Number(card.dataset.grams).toLocaleString("es-ES", { minimumFractionDigits: 2 })} g/unidad`;
      }
    });

    currentTotals = { bills, coins, total: bills + coins };
    elements.billSubtotal.textContent = formatCents(bills);
    elements.coinSubtotal.textContent = formatCents(coins);
    [elements.grandTotal, elements.heroTotal, elements.dockTotal].forEach(node => { node.textContent = formatCents(currentTotals.total); });
    updateDifference();
  }

  function updateDifference() {
    const hasExpected = elements.expectedTotal.value.trim() !== "";
    elements.difference.hidden = !hasExpected;
    if (!hasExpected) return;
    const expected = parseMoneyToCents(elements.expectedTotal.value);
    const difference = currentTotals.total - expected;
    elements.difference.className = "difference";
    if (difference === 0) {
      elements.difference.classList.add("is-balanced");
      elements.differenceLabel.textContent = "Caja cuadrada";
    } else if (difference > 0) {
      elements.difference.classList.add("is-surplus");
      elements.differenceLabel.textContent = "Sobrante";
    } else {
      elements.difference.classList.add("is-short");
      elements.differenceLabel.textContent = "Faltante";
    }
    elements.differenceValue.textContent = formatCents(Math.abs(difference));
  }

  function updateCoinModeUI() {
    const isQuantity = coinMode === "quantity";
    elements.quantityButton.classList.toggle("active", isQuantity);
    elements.weightButton.classList.toggle("active", !isQuantity);
    elements.quantityButton.setAttribute("aria-pressed", String(isQuantity));
    elements.weightButton.setAttribute("aria-pressed", String(!isQuantity));
    elements.modeHelp.textContent = isQuantity
      ? "Indica cuántas monedas tienes de cada tipo."
      : "Introduce el peso total de cada tipo. El resultado es una estimación redondeada a la moneda más cercana.";
    document.querySelectorAll('[data-type="coins"]').forEach(card => {
      const label = card.querySelector(".cash-label__text");
      const input = card.querySelector(".cash-input");
      label.textContent = isQuantity ? "Cantidad" : "Peso total (g)";
      input.inputMode = isQuantity ? "numeric" : "decimal";
      input.setAttribute("aria-label", `${isQuantity ? "Cantidad" : "Peso total en gramos"} de monedas de ${card.querySelector(".denomination__value").textContent}`);
    });
    calculate();
  }

  function switchCoinMode(nextMode) {
    if (nextMode === coinMode) return;
    document.querySelectorAll('[data-type="coins"]').forEach(card => {
      const input = card.querySelector(".cash-input");
      const entered = parsePositiveNumber(input.value);
      if (!entered) return;
      const grams = Number(card.dataset.grams);
      input.value = nextMode === "weight"
        ? (sanitizeCount(entered) * grams).toFixed(2).replace(".", ",")
        : String(sanitizeCount(Math.round(entered / grams)));
    });
    coinMode = nextMode;
    updateCoinModeUI();
    saveDraft();
  }

  function readCounts() {
    return Object.fromEntries([...document.querySelectorAll(".cash-card")].map(card => [card.querySelector(".cash-input").dataset.key, card.querySelector(".cash-input").value]));
  }

  function makeDraft() {
    return {
      name: elements.sessionName.value.trim(),
      expectedRaw: elements.expectedTotal.value.trim(),
      coinMode,
      counts: readCounts()
    };
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(makeDraft()));
      elements.draftStatus.textContent = currentTotals.total > 0 ? "Borrador guardado automáticamente" : "Listo para empezar";
    } catch {
      elements.draftStatus.textContent = "No se pudo guardar el borrador";
    }
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (!draft || typeof draft !== "object") return;
      elements.sessionName.value = typeof draft.name === "string" ? draft.name : "";
      elements.expectedTotal.value = typeof draft.expectedRaw === "string" ? draft.expectedRaw : "";
      coinMode = draft.coinMode === "weight" ? "weight" : "quantity";
      Object.entries(draft.counts || {}).forEach(([key, value]) => {
        const input = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
        if (input) input.value = String(value).slice(0, 12);
      });
      updateCoinModeUI();
      if (currentTotals.total > 0) elements.draftStatus.textContent = "Borrador anterior recuperado";
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }

  function getHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(value) ? value.filter(item => item && Number.isFinite(item.total)) : [];
    } catch {
      return [];
    }
  }

  function setHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  }

  function createRecord() {
    const expected = elements.expectedTotal.value.trim() === "" ? null : parseMoneyToCents(elements.expectedTotal.value);
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      name: elements.sessionName.value.trim() || "Arqueo sin nombre",
      expected,
      difference: expected === null ? null : currentTotals.total - expected,
      bills: currentTotals.bills,
      coins: currentTotals.coins,
      total: currentTotals.total,
      coinMode,
      counts: readCounts()
    };
  }

  function saveSession() {
    if (currentTotals.total <= 0) {
      showToast("Añade alguna cantidad antes de guardar");
      document.querySelector(".cash-input")?.focus();
      return;
    }
    try {
      const history = getHistory();
      history.unshift(createRecord());
      setHistory(history);
      renderHistory();
      showToast("Arqueo guardado en este dispositivo");
      elements.draftStatus.textContent = "Arqueo guardado";
    } catch {
      showToast("No se pudo guardar. Revisa el espacio del navegador");
    }
  }

  function renderHistory() {
    const history = getHistory();
    elements.historyList.replaceChildren();
    elements.emptyHistory.hidden = history.length > 0;
    elements.historyCount.textContent = String(history.length);
    elements.exportButton.disabled = history.length === 0;

    history.forEach(record => {
      const item = document.createElement("article");
      item.className = "history-item";
      const info = document.createElement("div");
      const title = document.createElement("h3");
      title.className = "history-item__title";
      title.textContent = record.name;
      const meta = document.createElement("p");
      meta.className = "history-item__meta";
      const parsedDate = new Date(record.createdAt);
      meta.textContent = `${Number.isNaN(parsedDate.getTime()) ? "Fecha desconocida" : dateTime.format(parsedDate)} · Billetes ${formatCents(record.bills)} · Monedas ${formatCents(record.coins)}`;
      info.append(title, meta);

      const money = document.createElement("div");
      money.className = "history-item__money";
      const total = document.createElement("strong");
      total.textContent = formatCents(record.total);
      money.append(total);
      if (record.difference !== null) {
        const diff = document.createElement("small");
        diff.className = record.difference < 0 ? "short" : record.difference > 0 ? "surplus" : "";
        diff.textContent = record.difference === 0 ? "Cuadrada" : `${record.difference > 0 ? "+" : "−"}${formatCents(Math.abs(record.difference))}`;
        money.append(diff);
      }

      const actions = document.createElement("div");
      actions.className = "history-item__actions";
      const load = document.createElement("button");
      load.className = "icon-button";
      load.type = "button";
      load.textContent = "Cargar copia";
      load.setAttribute("aria-label", `Cargar una copia de ${record.name}`);
      load.addEventListener("click", () => loadRecord(record));
      const remove = document.createElement("button");
      remove.className = "icon-button delete";
      remove.type = "button";
      remove.textContent = "Eliminar";
      remove.setAttribute("aria-label", `Eliminar ${record.name}`);
      remove.addEventListener("click", () => askConfirmation({
        title: "¿Eliminar este arqueo?",
        message: `Se eliminará “${record.name}” del historial de este dispositivo.`,
        confirmText: "Sí, eliminar",
        action: () => deleteRecord(record.id)
      }));
      actions.append(load, remove);
      item.append(info, money, actions);
      elements.historyList.append(item);
    });
  }

  function loadRecord(record) {
    clearCurrent(false);
    elements.sessionName.value = `${record.name} · copia`;
    elements.expectedTotal.value = record.expected === null ? "" : (record.expected / 100).toFixed(2).replace(".", ",");
    coinMode = record.coinMode === "weight" ? "weight" : "quantity";
    Object.entries(record.counts || {}).forEach(([key, value]) => {
      const input = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (input) input.value = String(value).slice(0, 12);
    });
    updateCoinModeUI();
    saveDraft();
    document.querySelector("#inicio").scrollIntoView({ behavior: "smooth" });
    showToast("Copia cargada; el original sigue en el historial");
  }

  function deleteRecord(id) {
    setHistory(getHistory().filter(record => record.id !== id));
    renderHistory();
    showToast("Arqueo eliminado");
  }

  function clearCurrent(showMessage = true) {
    document.querySelectorAll(".cash-input").forEach(input => { input.value = ""; });
    elements.sessionName.value = "";
    elements.expectedTotal.value = "";
    coinMode = "quantity";
    localStorage.removeItem(DRAFT_KEY);
    updateCoinModeUI();
    elements.draftStatus.textContent = "Listo para empezar";
    if (showMessage) showToast("Conteo reiniciado");
  }

  function copySummary() {
    const expected = elements.expectedTotal.value.trim() === "" ? null : parseMoneyToCents(elements.expectedTotal.value);
    const difference = expected === null ? "" : `\nDiferencia: ${currentTotals.total - expected >= 0 ? "+" : "−"}${formatCents(Math.abs(currentTotals.total - expected))}`;
    const text = `${elements.sessionName.value.trim() || "Arqueo de caja"}\nBilletes: ${formatCents(currentTotals.bills)}\nMonedas: ${formatCents(currentTotals.coins)}\nTotal: ${formatCents(currentTotals.total)}${difference}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast("Resumen copiado")).catch(() => legacyCopy(text));
    } else legacyCopy(text);
  }

  function legacyCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    try { document.execCommand("copy"); showToast("Resumen copiado"); }
    catch { window.prompt("Copia el resumen:", text); }
    area.remove();
  }

  function csvCell(value) {
    let safeValue = String(value ?? "");
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(safeValue)) safeValue = `'${safeValue}`;
    return `"${safeValue.replaceAll('"', '""')}"`;
  }

  function exportCsv() {
    const history = getHistory();
    if (!history.length) return showToast("Aún no hay arqueos para exportar");
    const header = ["Fecha", "Nombre", "Billetes EUR", "Monedas EUR", "Total EUR", "Esperado EUR", "Diferencia EUR"];
    const rows = history.map(record => [record.createdAt, record.name, record.bills / 100, record.coins / 100, record.total / 100, record.expected === null ? "" : record.expected / 100, record.difference === null ? "" : record.difference / 100]);
    const csv = `\ufeff${[header, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial-caja-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Historial exportado");
  }

  function askConfirmation({ title, message, confirmText, action }) {
    pendingAction = action;
    elements.dialogTitle.textContent = title;
    elements.dialogMessage.textContent = message;
    elements.confirmAction.textContent = confirmText;
    if (typeof elements.dialog.showModal === "function") elements.dialog.showModal();
    else if (window.confirm(`${title}\n\n${message}`)) action();
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
  }

  elements.quantityButton.addEventListener("click", () => switchCoinMode("quantity"));
  elements.weightButton.addEventListener("click", () => switchCoinMode("weight"));
  elements.expectedTotal.addEventListener("input", () => { calculate(); saveDraft(); });
  elements.expectedTotal.addEventListener("blur", () => {
    if (elements.expectedTotal.value.trim() !== "") elements.expectedTotal.value = (parseMoneyToCents(elements.expectedTotal.value) / 100).toFixed(2).replace(".", ",");
    calculate(); saveDraft();
  });
  elements.sessionName.addEventListener("input", saveDraft);
  document.querySelector("#saveButton").addEventListener("click", saveSession);
  document.querySelector("#dockSaveButton").addEventListener("click", saveSession);
  document.querySelector("#copyButton").addEventListener("click", copySummary);
  document.querySelector("#clearButton").addEventListener("click", () => askConfirmation({
    title: "¿Empezar de nuevo?",
    message: "Se borrará el conteo actual. Los arqueos ya guardados seguirán en el historial.",
    confirmText: "Sí, borrar",
    action: () => clearCurrent(true)
  }));
  document.querySelector("#historyShortcut").addEventListener("click", () => document.querySelector("#historial").scrollIntoView({ behavior: "smooth" }));
  elements.exportButton.addEventListener("click", exportCsv);
  elements.dialog.addEventListener("close", () => {
    if (elements.dialog.returnValue === "confirm" && pendingAction) pendingAction();
    pendingAction = null;
  });

  buildCards();
  restoreDraft();
  calculate();
  renderHistory();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
  }
})();
