(() => {
  const OUTPUT_COLUMNS = [
    "ImportIntersectionId",
    "ImportIntersectionName",
    "IntersectionId",
    "IntersectionName",
    "Section",
    "Row",
    "Seat",
    "FirstName",
    "LastName",
    "OrganizationName",
    "EmailAddress",
    "MobilePhoneNo",
    "PostalAddressLineOne",
    "PostalAddressLineTwo",
    "Zipcode",
    "City",
    "Country",
    "PurchaseGroup",
    "EventId",
    "BookingType",
    "BookingExpiryUtc",
    "AdvanceInvoiceDueDateUtc",
    "InhibitInvoiceFee",
    "PrintAsPlasticCard",
    "SendPaymentLinkEmail",
    "CampaignActivationCode",
    "PurchaseOperationId",
    "PurchaseType",
    "SendEmail",
    "IsExtension",
    "AuthCode",
    "GxRefNo",
    "AllowHolds",
    "AllowSeasonOfferTypeMismatch",
    "ExternalAuthCode",
    "TpuIdentityId",
  ];

  const AXS_REQUIRED_KEYS = [
    "fornamn",
    "efternamn",
    "email",
    "adress",
    "ort",
    "postnummer",
    "telefon",
    "foretag",
    "kundnummer",
    "sasong",
    "biljettyp",
    "leveransatt",
    "pinnummer",
    "sektion",
    "rad",
    "plats",
  ];
  const PLATS_REQUIRED_KEYS = ["seat"];
  const SEASON_REQUIRED_KEYS = ["sasongskort", "biljettyp", "sotpciid"];

  const DISPLAY_KEY_NAMES = {
    fornamn: "Fornamn",
    efternamn: "Efternamn",
    email: "Email",
    adress: "Adress",
    ort: "Ort",
    postnummer: "Postnummer",
    telefon: "Telefon",
    foretag: "Foretag",
    kundnummer: "Kundnummer",
    sasong: "Sasong",
    biljettyp: "Biljettyp",
    leveransatt: "Leveransatt",
    pinnummer: "Pinnummer",
    sektion: "Sektion",
    rad: "Rad",
    plats: "Plats",
    seat: "Seat",
    sasongskort: "Säsongskort",
    sotpciid: "SOTpciId",
  };

  const COMBO_SEP = "\u241f";
  const EMPTY_CATEGORY_OPTION_VALUE = "__EMPTY_CATEGORY__";
  const CSV_DELIMITER = ";";
  const PREVIEW_LIMIT = 120;
  const CACHE_DB_NAME = "axs-to-tickster-cache-db";
  const CACHE_DB_VERSION = 1;
  const CACHE_STORE_NAME = "snapshots";
  const CACHE_KEY = "latest";
  const CACHE_SCHEMA_VERSION = 1;
  const BOOKING_TYPE_OPTIONS = new Set(["plainbooking", "advanceinvoice"]);
  const PURCHASE_TYPE_OPTIONS = new Set(["FreeTicket", "Inblanco", "CorporateInvoice"]);
  const EXPORT_CFG_DEFAULTS = {
    eventId: "",
    bookingType: "",
    purchaseType: "",
    bookingExpiryUtc: "",
    sendEmail: 1,
    inhibitInvoiceFee: 0,
    printAsPlasticCard: 0,
    sendPaymentLinkEmail: 0,
    campaignActivationCode: "",
  };
  const ROW_DEFAULTS = {
    purchaseOperationId: "",
    isExtension: 0,
    allowHolds: 0,
  };

  const labels = {
    axs: "AXS-export",
    plats: "Tickster platsfil",
    season: "Säsongskorts-ID",
  };
  const anchorColumns = {
    axs: "OrderDatum",
    plats: "Seat",
    season: "Skapat",
  };

  const state = {
    axs: null,
    plats: null,
    season: null,
    result: null,
    resultSourceSignature: null,
    sourceData: null,
    manualSeatMap: new Map(),
    manualIntersectionMap: new Map(),
    exportConfig: { ...EXPORT_CFG_DEFAULTS },
    logLines: [],
    isBusy: false,
  };

  const cards = Array.from(document.querySelectorAll(".file-card"));
  const uploadPanel = document.getElementById("uploadPanel");
  const infoPanel = document.getElementById("infoPanel");
  const loadBtn = document.getElementById("loadBtn");
  const openLogBtn = document.getElementById("openLogBtn");
  const openExportConfigBtn = document.getElementById("openExportConfigBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const globalStatus = document.getElementById("globalStatus");
  const summaryBody = document.getElementById("summaryBody");
  const seatCheckPanel = document.getElementById("seatCheckPanel");
  const seatCheckText = document.getElementById("seatCheckText");
  const openSeatMapBtn = document.getElementById("openSeatMapBtn");
  const intersectionCheckPanel = document.getElementById("intersectionCheckPanel");
  const intersectionCheckText = document.getElementById("intersectionCheckText");
  const openIntersectionMapBtn = document.getElementById("openIntersectionMapBtn");
  const resultMetaEl = document.getElementById("resultMeta");
  const previewWrapEl = document.getElementById("previewWrap");
  const previewHintEl = document.getElementById("previewHint");
  const logOverlay = document.getElementById("logOverlay");
  const logModalText = document.getElementById("logModalText");
  const closeLogBtn = document.getElementById("closeLogBtn");
  const exportConfigOverlay = document.getElementById("exportConfigOverlay");
  const exportEventIdInput = document.getElementById("exportEventId");
  const exportBookingTypeSelect = document.getElementById("exportBookingType");
  const exportPurchaseTypeSelect = document.getElementById("exportPurchaseType");
  const exportBookingExpiryUtcInput = document.getElementById("exportBookingExpiryUtc");
  const exportSendEmailSelect = document.getElementById("exportSendEmail");
  const exportInhibitInvoiceFeeSelect = document.getElementById("exportInhibitInvoiceFee");
  const exportPrintAsPlasticCardSelect = document.getElementById("exportPrintAsPlasticCard");
  const exportSendPaymentLinkEmailSelect = document.getElementById("exportSendPaymentLinkEmail");
  const exportCampaignActivationCodeInput = document.getElementById("exportCampaignActivationCode");
  const exportConfigValidation = document.getElementById("exportConfigValidation");
  const exportConfigCancelBtn = document.getElementById("exportConfigCancelBtn");
  const exportConfigSaveBtn = document.getElementById("exportConfigSaveBtn");
  const seatMapOverlay = document.getElementById("seatMapOverlay");
  const seatMapSummary = document.getElementById("seatMapSummary");
  const seatMapTableBody = document.getElementById("seatMapTableBody");
  const seatMapCancelBtn = document.getElementById("seatMapCancelBtn");
  const seatMapSaveBtn = document.getElementById("seatMapSaveBtn");
  const intersectionMapOverlay = document.getElementById("intersectionMapOverlay");
  const intersectionMapSummary = document.getElementById("intersectionMapSummary");
  const intersectionMapNumberedTableBody = document.getElementById("intersectionMapNumberedTableBody");
  const intersectionMapUnnumberedTableBody = document.getElementById("intersectionMapUnnumberedTableBody");
  const intersectionMapCancelBtn = document.getElementById("intersectionMapCancelBtn");
  const intersectionMapSaveBtn = document.getElementById("intersectionMapSaveBtn");

  let uploadCollapsed = false;
  let cacheSaveTimer = null;
  let cacheSaveInProgress = false;
  let cacheSavePending = false;
  let cacheWarningShown = false;

  function normStr(x) {
    return x === null || x === undefined ? "" : String(x).trim();
  }

  function foldAscii(text) {
    const raw = normStr(text);
    if (!raw) {
      return "";
    }
    return raw
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x00-\x7F]/g, "")
      .toLowerCase();
  }

  function columnKey(name) {
    return foldAscii(name).replace(/[^a-z0-9]/g, "");
  }

  function normIntishStr(x) {
    const s = normStr(x);
    if (!s) {
      return "";
    }
    const m = s.match(/^(\d+)\.0+$/);
    return m ? m[1] : s;
  }

  function normPriceStr(x) {
    let s = normStr(x);
    if (!s) {
      return "";
    }
    s = s.replace(/\s*kr\s*$/i, "").trim();
    s = s.replace(/\s+/g, "").replace(",", ".");
    if (/^-?\d+(?:\.\d+)?$/.test(s)) {
      const sign = s.startsWith("-") ? "-" : "";
      const body = sign ? s.slice(1) : s;
      if (body.includes(".")) {
        const [left, rightRaw] = body.split(".", 2);
        const right = rightRaw.replace(/0+$/, "");
        return right ? `${sign}${left}.${right}` : `${sign}${left}`;
      }
      return `${sign}${body}`;
    }
    return s;
  }

  function normZip(x) {
    return normStr(x).replace(/\s+/g, "");
  }

  function toBinaryFlag(value, fallback = 0) {
    const raw = normStr(value).toLowerCase();
    if (raw === "1" || raw === "ja" || raw === "yes" || raw === "true") {
      return 1;
    }
    if (raw === "0" || raw === "nej" || raw === "no" || raw === "false") {
      return 0;
    }
    return fallback ? 1 : 0;
  }

  function normalizeExportConfig(rawCfg) {
    const raw = rawCfg || {};
    const bookingTypeRaw = normStr(raw.bookingType).toLowerCase();
    const bookingType = BOOKING_TYPE_OPTIONS.has(bookingTypeRaw) ? bookingTypeRaw : "";
    const purchaseTypeRaw = normStr(raw.purchaseType);
    const purchaseType = PURCHASE_TYPE_OPTIONS.has(purchaseTypeRaw) ? purchaseTypeRaw : "";
    return {
      eventId: normStr(raw.eventId),
      bookingType,
      purchaseType,
      bookingExpiryUtc: normStr(raw.bookingExpiryUtc),
      sendEmail: toBinaryFlag(raw.sendEmail, EXPORT_CFG_DEFAULTS.sendEmail),
      inhibitInvoiceFee: toBinaryFlag(raw.inhibitInvoiceFee, EXPORT_CFG_DEFAULTS.inhibitInvoiceFee),
      printAsPlasticCard: toBinaryFlag(raw.printAsPlasticCard, EXPORT_CFG_DEFAULTS.printAsPlasticCard),
      sendPaymentLinkEmail: toBinaryFlag(raw.sendPaymentLinkEmail, EXPORT_CFG_DEFAULTS.sendPaymentLinkEmail),
      campaignActivationCode: normStr(raw.campaignActivationCode),
    };
  }

  function validateExportConfig(rawCfg) {
    const cfg = normalizeExportConfig(rawCfg);
    const errors = [];
    if (!cfg.eventId) {
      errors.push("EventID är obligatoriskt.");
    }
    if (!cfg.bookingType) {
      errors.push("BookingType är obligatoriskt.");
    }
    if (!cfg.purchaseType) {
      errors.push("PurchaseType är obligatoriskt.");
    }
    if (cfg.bookingType && !cfg.bookingExpiryUtc) {
      errors.push("BookingExpiryUtc är obligatoriskt när BookingType är vald.");
    }
    return {
      valid: errors.length === 0,
      errors,
      cfg,
    };
  }

  function normSeasonName(axsSeason) {
    let s = normStr(axsSeason);
    if (s.includes(":")) {
      s = s.split(":", 2)[1].trim();
    }
    s = s.replace(/\s20\d{2}-\d{2}-\d{2}.*$/, "").trim();
    return s;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function splitSeatKey(seatKey) {
    const parts = normStr(seatKey).split("|");
    if (parts.length !== 3) {
      return null;
    }
    const section = normStr(parts[0]);
    const row = normIntishStr(parts[1]);
    const seat = normIntishStr(parts[2]);
    if (!section || !row || !seat) {
      return null;
    }
    return { section, row, seat };
  }

  function seatKeyToSlash(seatKey) {
    const seat = splitSeatKey(seatKey);
    return seat ? `${seat.section}/${seat.row}/${seat.seat}` : "";
  }

  function seatKeyToBackslash(seatKey) {
    const seat = splitSeatKey(seatKey);
    return seat ? `${seat.section}\\${seat.row}\\${seat.seat}` : "";
  }

  function parseSeatKeyFromDelimited(raw) {
    const text = normStr(raw);
    if (!text) {
      return null;
    }
    const parts = text.split(/[\\/]/).map((v) => normStr(v));
    if (parts.length !== 3) {
      return null;
    }
    const section = parts[0];
    const row = normIntishStr(parts[1]);
    const seat = normIntishStr(parts[2]);
    if (!section || !row || !seat) {
      return null;
    }
    return `${section}|${row}|${seat}`;
  }

  function parseAxsSeatFromRow(row, preferSittplats = true) {
    if (preferSittplats) {
      const fromSittplats = parseSeatKeyFromDelimited(row.sittplats);
      if (fromSittplats) {
        return { seatKey: fromSittplats, source: "sittplats" };
      }
      return null;
    }
    const section = normStr(row.sektion);
    const rowNo = normIntishStr(row.rad);
    const seatNo = normIntishStr(row.plats);
    if (section && rowNo && seatNo) {
      return { seatKey: `${section}|${rowNo}|${seatNo}`, source: "columns" };
    }
    return null;
  }

  function categoryToOptionValue(category) {
    return normStr(category) ? normStr(category) : EMPTY_CATEGORY_OPTION_VALUE;
  }

  function optionValueToCategory(optionValue) {
    return optionValue === EMPTY_CATEGORY_OPTION_VALUE ? "" : normStr(optionValue);
  }

  function seasonCategoryChoiceKey(seasonCard, category) {
    return [normStr(seasonCard), normStr(category)].join(COMBO_SEP);
  }

  function seasonChoiceKey(seasonCard, category, ticket) {
    return [normStr(seasonCard), normStr(category), normStr(ticket)].join(COMBO_SEP);
  }

  function legacyIntersectionMapKey(seasonName, axsTicket, numbered) {
    return [normStr(seasonName), normStr(axsTicket), numbered ? "1" : "0"].join(COMBO_SEP);
  }

  function intersectionMapKey(seasonName, axsTicket, axsPrice, numbered) {
    return [
      normStr(seasonName),
      normStr(axsTicket),
      normPriceStr(axsPrice),
      numbered ? "1" : "0",
    ].join(COMBO_SEP);
  }

  function axsIntersectionMapKeyFromRow(row, preferSittplats = true) {
    const seasonName = normSeasonName(row.sasong);
    const axsTicket = normStr(row.biljettyp);
    const numbered = Boolean(parseAxsSeatFromRow(row, preferSittplats));
    const axsPrice = axsPriceFromRow(row);
    return {
      key: intersectionMapKey(seasonName, axsTicket, axsPrice, numbered),
      legacyKey: legacyIntersectionMapKey(seasonName, axsTicket, numbered),
      seasonName,
      axsTicket,
      axsPrice,
      numbered,
    };
  }

  function getManualIntersectionSotpciId(value) {
    if (!value) {
      return "";
    }
    if (typeof value === "string") {
      return normStr(value);
    }
    return normStr(value.sotpciid);
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) {
      return "-";
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    const units = ["KB", "MB", "GB"];
    let size = bytes / 1024;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
      size /= 1024;
      idx += 1;
    }
    return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[idx]}`;
  }

  function displayKeyName(k) {
    return DISPLAY_KEY_NAMES[k] || k;
  }

  function fileSignature(file) {
    if (!file) {
      return "";
    }
    const name = normStr(file.name);
    const size = Number(file.size) || 0;
    const lastModified = Number(file.lastModified) || 0;
    return `${name}|${size}|${lastModified}`;
  }

  function filesEquivalent(a, b) {
    return fileSignature(a) === fileSignature(b);
  }

  function currentFilesSignature() {
    return ["axs", "plats", "season"]
      .map((key) => `${key}:${fileSignature(state[key])}`)
      .join("||");
  }

  function openCacheDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("indexedDB stöds inte i denna webbläsare."));
        return;
      }
      const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
          db.createObjectStore(CACHE_STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Kunde inte öppna cache-databasen."));
    });
  }

  async function cacheReadSnapshot() {
    const db = await openCacheDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE_NAME, "readonly");
      const store = tx.objectStore(CACHE_STORE_NAME);
      const request = store.get(CACHE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Kunde inte läsa cache."));
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
      tx.onabort = () => db.close();
    });
  }

  async function cacheWriteSnapshot(payload) {
    const db = await openCacheDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE_NAME, "readwrite");
      const store = tx.objectStore(CACHE_STORE_NAME);
      const request = store.put({ id: CACHE_KEY, payload });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("Kunde inte spara cache."));
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
      tx.onabort = () => db.close();
    });
  }

  async function serializeFileForCache(file) {
    if (!file) {
      return null;
    }
    const buffer = await file.arrayBuffer();
    return {
      name: normStr(file.name),
      type: normStr(file.type),
      size: Number(file.size) || buffer.byteLength,
      lastModified: Number(file.lastModified) || Date.now(),
      buffer,
    };
  }

  function deserializeFileFromCache(payload) {
    if (!payload || !payload.buffer) {
      return null;
    }
    const name = normStr(payload.name) || "cached-file";
    const type = normStr(payload.type);
    const lastModified = Number(payload.lastModified) || Date.now();
    try {
      return new File([payload.buffer], name, { type, lastModified });
    } catch (_err) {
      const blob = new Blob([payload.buffer], { type });
      blob.name = name;
      blob.lastModified = lastModified;
      return blob;
    }
  }

  function warnCacheIssue(err) {
    if (cacheWarningShown) {
      return;
    }
    cacheWarningShown = true;
    log(`Cache-varning: ${err && err.message ? err.message : "okänt fel"}`, "warn");
  }

  async function buildSnapshotForCache() {
    const filesPayload = {};
    for (const key of ["axs", "plats", "season"]) {
      filesPayload[key] = await serializeFileForCache(state[key]);
    }

    const currentSignature = currentFilesSignature();
    const canPersistResult =
      Boolean(state.result)
      && Boolean(state.resultSourceSignature)
      && state.resultSourceSignature === currentSignature;

    return {
      version: CACHE_SCHEMA_VERSION,
      savedAt: Date.now(),
      files: filesPayload,
      manualSeatMapEntries: [...state.manualSeatMap.entries()],
      manualIntersectionMapEntries: [...state.manualIntersectionMap.entries()],
      exportConfig: state.exportConfig,
      ui: {
        infoVisible: !infoPanel.hidden,
        uploadCollapsed: uploadCollapsed,
      },
      result: canPersistResult ? state.result : null,
      resultSourceSignature: canPersistResult ? state.resultSourceSignature : null,
      logText: getLogText().slice(-80000),
    };
  }

  async function flushCacheSave() {
    if (cacheSaveInProgress || !cacheSavePending) {
      return;
    }
    cacheSavePending = false;
    cacheSaveInProgress = true;
    try {
      const payload = await buildSnapshotForCache();
      await cacheWriteSnapshot(payload);
    } catch (err) {
      warnCacheIssue(err);
    } finally {
      cacheSaveInProgress = false;
      if (cacheSavePending) {
        await flushCacheSave();
      }
    }
  }

  function scheduleCacheSave(delayMs = 220) {
    cacheSavePending = true;
    if (cacheSaveTimer) {
      clearTimeout(cacheSaveTimer);
    }
    cacheSaveTimer = setTimeout(() => {
      cacheSaveTimer = null;
      void flushCacheSave();
    }, delayMs);
  }

  async function restoreFromCacheIfAvailable() {
    try {
      const record = await cacheReadSnapshot();
      if (!record || !record.payload) {
        return false;
      }
      const snapshot = record.payload;
      if (snapshot.version !== CACHE_SCHEMA_VERSION) {
        return false;
      }

      const files = snapshot.files || {};
      for (const key of ["axs", "plats", "season"]) {
        state[key] = deserializeFileFromCache(files[key]);
        refreshCardUI(key);
      }

      state.manualSeatMap = new Map(
        Array.isArray(snapshot.manualSeatMapEntries)
          ? snapshot.manualSeatMapEntries
          : []
      );
      state.manualIntersectionMap = new Map(
        Array.isArray(snapshot.manualIntersectionMapEntries)
          ? snapshot.manualIntersectionMapEntries
          : []
      );
      state.sourceData = null;
      state.exportConfig = normalizeExportConfig({
        ...EXPORT_CFG_DEFAULTS,
        ...(snapshot.exportConfig || {}),
      });
      syncExportConfigFormFromState();
      loadLogTextFromCache(snapshot.logText || "");

      const currentSignature = currentFilesSignature();
      const canRestoreResult =
        Boolean(snapshot.result)
        && Boolean(snapshot.resultSourceSignature)
        && snapshot.resultSourceSignature === currentSignature;
      state.result = canRestoreResult ? snapshot.result : null;
      state.resultSourceSignature = canRestoreResult ? snapshot.resultSourceSignature : null;

      infoPanel.hidden = !(snapshot.ui && snapshot.ui.infoVisible);
      if (state.result) {
        renderResultMeta(state.result);
        renderSeatCheck(state.result.seatSummary || null);
        renderIntersectionCheck(state.result.intersectionSummary || null);
        renderPreview(state.result.importRows || []);
        updateExportButtonState();
      } else if (!infoPanel.hidden) {
        clearResultView("Ingen återställd preview tillgänglig.");
      }

      const collapseWanted = Boolean(
        snapshot.ui
        && snapshot.ui.uploadCollapsed
        && allFilesSelected()
      );
      setUploadCollapsed(collapseWanted);
      updateReadyState();

      const savedAtTxt = snapshot.savedAt
        ? new Date(snapshot.savedAt).toLocaleString("sv-SE")
        : "okänd tid";
      log(`Återställde sparad session (${savedAtTxt}).`);
      updateExportButtonState();
      return true;
    } catch (err) {
      warnCacheIssue(err);
      return false;
    }
  }

  function setStatus(text, tone = "normal") {
    globalStatus.textContent = text;
    globalStatus.classList.remove("ready", "warn", "error");
    if (tone === "ready" || tone === "warn" || tone === "error") {
      globalStatus.classList.add(tone);
    }
  }

  function getLogText() {
    return state.logLines.join("\n");
  }

  function renderLogModalText() {
    if (!logModalText) {
      return;
    }
    const text = getLogText();
    logModalText.textContent = text || "Ingen logg ännu.";
    logModalText.scrollTop = logModalText.scrollHeight;
  }

  function log(message, level = "info") {
    const now = new Date().toLocaleTimeString("sv-SE", { hour12: false });
    const prefix = level === "error" ? "ERR" : level === "warn" ? "WRN" : "INF";
    state.logLines.push(`[${now}] ${prefix} ${message}`);
    if (state.logLines.length > 2000) {
      state.logLines = state.logLines.slice(-2000);
    }
    renderLogModalText();
    if (!state.isBusy) {
      scheduleCacheSave(320);
    }
  }

  function loadLogTextFromCache(logText) {
    if (typeof logText !== "string" || !logText.trim()) {
      state.logLines = [];
      renderLogModalText();
      return;
    }
    state.logLines = logText
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);
    if (state.logLines.length > 2000) {
      state.logLines = state.logLines.slice(-2000);
    }
    renderLogModalText();
  }

  function syncExportConfigFormFromState() {
    exportEventIdInput.value = state.exportConfig.eventId || "";
    exportBookingTypeSelect.value = state.exportConfig.bookingType || "";
    exportPurchaseTypeSelect.value = state.exportConfig.purchaseType || "";
    exportBookingExpiryUtcInput.value = state.exportConfig.bookingExpiryUtc || "";
    exportSendEmailSelect.value = String(state.exportConfig.sendEmail);
    exportInhibitInvoiceFeeSelect.value = String(state.exportConfig.inhibitInvoiceFee);
    exportPrintAsPlasticCardSelect.value = String(state.exportConfig.printAsPlasticCard);
    exportSendPaymentLinkEmailSelect.value = String(state.exportConfig.sendPaymentLinkEmail);
    exportCampaignActivationCodeInput.value = state.exportConfig.campaignActivationCode || "";
  }

  function readExportConfigFromForm() {
    return normalizeExportConfig({
      eventId: exportEventIdInput.value,
      bookingType: exportBookingTypeSelect.value,
      purchaseType: exportPurchaseTypeSelect.value,
      bookingExpiryUtc: exportBookingExpiryUtcInput.value,
      sendEmail: exportSendEmailSelect.value,
      inhibitInvoiceFee: exportInhibitInvoiceFeeSelect.value,
      printAsPlasticCard: exportPrintAsPlasticCardSelect.value,
      sendPaymentLinkEmail: exportSendPaymentLinkEmailSelect.value,
      campaignActivationCode: exportCampaignActivationCodeInput.value,
    });
  }

  function hasExportableRows() {
    return Boolean(
      state.result
      && state.result.importRows
      && Array.isArray(state.result.importRows)
      && state.result.importRows.length
    );
  }

  function updateExportButtonState() {
    const validCfg = validateExportConfig(state.exportConfig).valid;
    exportCsvBtn.disabled = !(hasExportableRows() && validCfg);
  }

  function allFilesSelected() {
    return Boolean(state.axs && state.plats && state.season);
  }

  function setUploadCollapsed(collapsed) {
    uploadCollapsed = collapsed;
    uploadPanel.classList.toggle("collapsed", collapsed);
    updateReadyState();
    if (!state.isBusy) {
      scheduleCacheSave();
    }
  }

  function setBusy(busy) {
    state.isBusy = busy;
    updateReadyState();
  }

  function refreshCardUI(key) {
    const card = document.querySelector(`.file-card[data-key="${key}"]`);
    if (!card) {
      return;
    }
    const meta = card.querySelector('[data-slot="meta"]');
    const file = state[key];
    if (!file) {
      card.classList.remove("ready");
      if (meta) {
        meta.textContent = "Ingen fil vald.";
      }
      return;
    }
    card.classList.add("ready");
    if (meta) {
      meta.textContent = `${normStr(file.name) || "okänd fil"} (${formatBytes(Number(file.size) || 0)})`;
    }
  }

  function setFileForKey(key, file, options = {}) {
    const opts = {
      logChange: true,
      saveCache: true,
      ...options,
    };
    const prev = state[key];
    state[key] = file || null;
    refreshCardUI(key);
    updateReadyState();

    const changed = !filesEquivalent(prev, file || null);

    if (changed) {
      state.sourceData = null;
      state.manualSeatMap.clear();
      state.manualIntersectionMap.clear();
      closeSeatMapModal();
      closeIntersectionMapModal();
      if (state.result && state.resultSourceSignature) {
        const currentSignature = currentFilesSignature();
        if (state.resultSourceSignature !== currentSignature) {
          state.result = null;
          state.resultSourceSignature = null;
          if (!infoPanel.hidden) {
            clearResultView("Filval ändrat. Klicka Läs in för att bygga ny preview.");
          }
        }
      }
    }
    updateExportButtonState();

    if (opts.logChange) {
      if (file) {
        log(`${labels[key]} vald: ${file.name}`);
      } else {
        log(`${labels[key]} rensad.`);
      }
    }

    if (opts.saveCache && changed) {
      scheduleCacheSave();
    }
  }

  function updateSummary() {
    const keys = ["axs", "plats", "season"];
    summaryBody.innerHTML = keys
      .map((key) => {
        const file = state[key];
        return `
          <tr>
            <td>${labels[key]}</td>
            <td>${file ? escapeHtml(file.name) : "-"}</td>
            <td>${anchorColumns[key]}</td>
          </tr>
        `;
      })
      .join("");
  }

  function updateReadyState() {
    const ready = allFilesSelected();
    if (state.isBusy) {
      loadBtn.textContent = "Läser in...";
      loadBtn.disabled = true;
      setStatus("Läser in filer och bygger preview...", "warn");
      updateSummary();
      return;
    }

    if (uploadCollapsed) {
      loadBtn.textContent = "Välj nya filer";
      loadBtn.disabled = false;
    } else {
      loadBtn.textContent = "Läs in";
      loadBtn.disabled = !ready;
    }

    if (infoPanel.hidden) {
      setStatus(ready ? "Alla tre filer valda." : "Väntar på filer...", ready ? "ready" : "normal");
    } else if (uploadCollapsed) {
      setStatus("Filer inlästa. Klicka \"Välj nya filer\" för att ändra filval.", "ready");
    } else {
      setStatus(
        ready ? "Filval uppdaterat. Klicka \"Läs in\" för att bekräfta." : "Välj alla tre filer och klicka \"Läs in\".",
        "warn"
      );
    }

    updateSummary();
  }

  function clearResultView(message = "Ingen preview ännu.") {
    resultMetaEl.innerHTML = "";
    previewWrapEl.innerHTML = `<div class="preview-empty">${escapeHtml(message)}</div>`;
    previewHintEl.textContent = "-";
    updateExportButtonState();
    renderSeatCheck(null);
    renderIntersectionCheck(null);
  }

  function findHeaderRowIndex(aoa, anchorKey) {
    const maxScan = Math.min(aoa.length, 350);
    for (let i = 0; i < maxScan; i += 1) {
      const row = Array.isArray(aoa[i]) ? aoa[i] : [];
      for (const cell of row) {
        if (columnKey(cell) === anchorKey) {
          return i;
        }
      }
    }
    return -1;
  }

  async function parseFileByAnchor(file, anchorLabel) {
    if (typeof XLSX === "undefined") {
      throw new Error("Excel-bibliotek (SheetJS) kunde inte laddas.");
    }
    const anchorKey = columnKey(anchorLabel);
    const buffer = await file.arrayBuffer();
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: "array", dense: true, cellDates: false });
    } catch (err) {
      throw new Error(`Kunde inte läsa filen ${file.name}: ${err.message}`);
    }

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const aoa = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
      });
      const headerIdx = findHeaderRowIndex(aoa, anchorKey);
      if (headerIdx < 0) {
        continue;
      }

      const headers = (aoa[headerIdx] || []).map((v) => normStr(v));
      const headerKeys = headers.map(columnKey);
      const rows = [];
      for (let i = headerIdx + 1; i < aoa.length; i += 1) {
        const values = Array.isArray(aoa[i]) ? aoa[i] : [];
        const row = {};
        let nonEmpty = false;
        for (let c = 0; c < headerKeys.length; c += 1) {
          const key = headerKeys[c];
          if (!key) {
            continue;
          }
          const value = normStr(values[c]);
          if (value) {
            nonEmpty = true;
          }
          if (!(key in row) || row[key] === "") {
            row[key] = value;
          }
        }
        if (nonEmpty) {
          rows.push(row);
        }
      }
      return {
        rows,
        headerKeys: [...new Set(headerKeys.filter(Boolean))],
        sheetName,
        headerIndex1: headerIdx + 1,
      };
    }

    throw new Error(`Kolumnen "${anchorLabel}" hittades inte i ${file.name}.`);
  }

  function validateRequiredColumns(parsed, requiredKeys, label) {
    const avail = new Set(parsed.headerKeys);
    const missing = requiredKeys.filter((k) => !avail.has(k));
    if (missing.length) {
      throw new Error(`${label} saknar kolumner: ${missing.map(displayKeyName).join(", ")}`);
    }
  }

  function parseTicksterSeats(platsRows) {
    const seatsSet = new Set();
    const sectionsSet = new Set();
    const sectionToRows = new Map();
    const sectionRowToSeats = new Map();
    for (const r of platsRows) {
      const raw = normStr(r.seat);
      if (!raw) {
        continue;
      }
      const parts = raw.split("\\");
      if (parts.length !== 3) {
        continue;
      }
      const section = normStr(parts[0]);
      const row = normIntishStr(parts[1]);
      const seat = normIntishStr(parts[2]);
      if (!section || !row || !seat) {
        continue;
      }
      const seatKey = `${section}|${row}|${seat}`;
      seatsSet.add(seatKey);
      sectionsSet.add(section);
      if (!sectionToRows.has(section)) {
        sectionToRows.set(section, new Set());
      }
      sectionToRows.get(section).add(row);
      const srKey = `${section}|${row}`;
      if (!sectionRowToSeats.has(srKey)) {
        sectionRowToSeats.set(srKey, new Set());
      }
      sectionRowToSeats.get(srKey).add(seat);
    }
    return { seatsSet, sectionsSet, sectionToRows, sectionRowToSeats };
  }

  function buildSeatComparison(axsRows, seatsSet, manualSeatMap, preferSittplats = true) {
    const uniqueAxsSeatKeys = new Set();
    let ignoredRows = 0;
    for (const row of axsRows) {
      const parsed = parseAxsSeatFromRow(row, preferSittplats);
      if (!parsed) {
        ignoredRows += 1;
        continue;
      }
      uniqueAxsSeatKeys.add(parsed.seatKey);
    }

    const unmatchedSeatKeys = [];
    let matchedCount = 0;
    for (const axsSeatKey of uniqueAxsSeatKeys) {
      const mappedSeatKey = manualSeatMap.get(axsSeatKey) || axsSeatKey;
      if (seatsSet.has(mappedSeatKey)) {
        matchedCount += 1;
      } else {
        unmatchedSeatKeys.push(axsSeatKey);
      }
    }
    unmatchedSeatKeys.sort((a, b) => a.localeCompare(b, "sv"));

    return {
      totalCount: uniqueAxsSeatKeys.size,
      matchedCount,
      unmatchedCount: unmatchedSeatKeys.length,
      ignoredRows,
      unmatchedSeatKeys,
    };
  }

  function renderSeatCheck(summary) {
    if (!summary) {
      seatCheckPanel.hidden = true;
      seatCheckText.textContent = "-";
      openSeatMapBtn.disabled = true;
      return;
    }
    seatCheckPanel.hidden = false;
    const ignored = summary.ignoredRows > 0
      ? ` ${summary.ignoredRows} rader i AXS saknar formatet X/Y/Z och tolkas som ståplats.`
      : "";
    seatCheckText.textContent = `${summary.matchedCount} av ${summary.totalCount} platser kunde matchas. ${summary.unmatchedCount} platser i AXS saknar motsvarighet i Tickster.${ignored}`;
    openSeatMapBtn.disabled = summary.unmatchedCount === 0;
  }

  function buildIntersectionMappingSummary(sourceData) {
    const groups = new Map();
    for (const row of sourceData.axsRows) {
      const keyInfo = axsIntersectionMapKeyFromRow(row, sourceData.preferSittplats);
      const combo = comboFromAxsRow(row, sourceData.tokenToCategories);
      const autoId = sourceData.seasonOverride.get(combo.key) || "";

      if (!groups.has(keyInfo.key)) {
        groups.set(keyInfo.key, {
          ...keyInfo,
          rowCount: 0,
          autoMissingRowCount: 0,
          autoMappedRowCount: 0,
          autoSotpciIdSet: new Set(),
        });
      }
      const group = groups.get(keyInfo.key);
      group.rowCount += 1;
      if (autoId) {
        group.autoMappedRowCount += 1;
        group.autoSotpciIdSet.add(autoId);
      } else {
        group.autoMissingRowCount += 1;
      }
    }

    const entries = [...groups.values()].sort((a, b) => {
      const seasonCmp = a.seasonName.localeCompare(b.seasonName, "sv");
      if (seasonCmp) {
        return seasonCmp;
      }
      const ticketCmp = a.axsTicket.localeCompare(b.axsTicket, "sv");
      if (ticketCmp) {
        return ticketCmp;
      }
      const priceCmp = a.axsPrice.localeCompare(b.axsPrice, "sv", {
        numeric: true,
        sensitivity: "base",
      });
      if (priceCmp) {
        return priceCmp;
      }
      return Number(b.numbered) - Number(a.numbered);
    });

    const unmatchedEntries = [];
    let autoMissingRows = 0;
    let unresolvedRows = 0;
    let manualCoveredRows = 0;
    for (const entry of entries) {
      autoMissingRows += entry.autoMissingRowCount;
      const manualValue = state.manualIntersectionMap.get(entry.key)
        || state.manualIntersectionMap.get(entry.legacyKey);
      const manualSotpciId = getManualIntersectionSotpciId(manualValue);
      const autoSotpciIds = [...entry.autoSotpciIdSet].filter(Boolean);
      const autoSotpciId = autoSotpciIds.length === 1 ? autoSotpciIds[0] : "";
      entry.manualSotpciId = manualSotpciId;
      entry.autoSotpciId = autoSotpciId;
      entry.hasAmbiguousAutoSotpci = autoSotpciIds.length > 1;
      entry.needsManual = entry.autoMissingRowCount > 0 && !manualSotpciId;
      entry.isMapped = !entry.needsManual;
      entry.selectableSotpciId = manualSotpciId
        || (!entry.needsManual ? autoSotpciId : "")
        || "";
      entry.hasVisibleMapping = Boolean(entry.selectableSotpciId);
      if (entry.autoMissingRowCount > 0 && manualSotpciId) {
        manualCoveredRows += entry.autoMissingRowCount;
      }
      if (entry.needsManual) {
        unresolvedRows += entry.autoMissingRowCount;
        unmatchedEntries.push(entry);
      }
      delete entry.autoSotpciIdSet;
    }

    return {
      totalCount: entries.length,
      mappedCount: entries.length - unmatchedEntries.length,
      unmatchedCount: unmatchedEntries.length,
      autoMissingRows,
      unresolvedRows,
      manualCoveredRows,
      entries,
      unmatchedEntries,
    };
  }

  function renderIntersectionCheck(summary) {
    if (!summary) {
      intersectionCheckPanel.hidden = true;
      intersectionCheckText.textContent = "-";
      openIntersectionMapBtn.disabled = true;
      return;
    }
    intersectionCheckPanel.hidden = false;
    const covered = summary.manualCoveredRows > 0
      ? ` ${summary.manualCoveredRows} rader täcks av manuella val.`
      : "";
    intersectionCheckText.textContent = `${summary.mappedCount} av ${summary.totalCount} kombinationer har ImportIntersectionId. ${summary.unmatchedCount} kombinationer saknar mappning (${summary.unresolvedRows} rader).${covered}`;
    openIntersectionMapBtn.disabled = summary.totalCount === 0;
  }

  function parsePrisregionTokens(text) {
    const raw = normStr(text);
    if (!raw) {
      return new Set();
    }
    const tokens = new Set();
    raw.split(/[;,/\\]+/).forEach((part) => {
      const token = foldAscii(part).trim();
      if (token) {
        tokens.add(token.toUpperCase());
      }
    });
    return tokens;
  }

  function buildSeasonRows(rows) {
    const out = [];
    for (const r of rows) {
      const season = normStr(r.sasongskort);
      const ticket = normStr(r.biljettyp);
      const sotpci = normStr(r.sotpciid).replace(/\s+/g, "");
      const kategori = normStr(r.kategori);
      const prisregioner = normStr(r.prisregioner);
      const regionTokens = parsePrisregionTokens(prisregioner);

      const seasonFold = foldAscii(season);
      const kategoriFold = foldAscii(kategori);
      if (regionTokens.size === 0) {
        if (seasonFold.includes("staplat") || kategoriFold.includes("hemmasta")) {
          regionTokens.add("HEMMASTA");
        }
        if (seasonFold.includes("rullstol") || kategoriFold.includes("rullstol")) {
          regionTokens.add("RULLSTOLSPLATS");
        }
      }

      if (season && ticket && sotpci) {
        out.push({
          sasongskort: season,
          biljettyp: ticket,
          sotpciid: sotpci,
          kategori,
          prisregioner,
          regionTokens,
        });
      }
    }
    return out;
  }

  function regionScopeKeys(seasonName, ticket, token) {
    const tokenNorm = normStr(token).toUpperCase();
    if (!tokenNorm) {
      return [];
    }
    const seasonFold = foldAscii(normSeasonName(seasonName));
    const ticketFold = foldAscii(ticket);
    const keys = [`TOKEN::${tokenNorm}`];
    if (ticketFold) {
      keys.unshift(`TICKET_TOKEN::${ticketFold}::${tokenNorm}`);
    }
    if (seasonFold && ticketFold) {
      keys.unshift(`SEASON_TICKET_TOKEN::${seasonFold}::${ticketFold}::${tokenNorm}`);
    }
    return keys;
  }

  function buildRegionCategoryMap(seasonRows) {
    const map = new Map();
    for (const r of seasonRows) {
      const kategori = normStr(r.kategori);
      if (!kategori) {
        continue;
      }
      for (const token of r.regionTokens) {
        for (const sk of regionScopeKeys(r.sasongskort, r.biljettyp, token)) {
          if (!map.has(sk)) {
            map.set(sk, new Set());
          }
          map.get(sk).add(kategori);
        }
      }
    }
    return map;
  }

  function axsRegionToken(section, zone) {
    const sec = foldAscii(section).trim();
    const zon = foldAscii(zone);
    if (/^[a-z]$/.test(sec)) {
      return sec.toUpperCase();
    }
    if (sec.includes("hcp") || sec.includes("rull") || zon.includes("rull")) {
      return "RULLSTOLSPLATS";
    }
    if (zon.includes("hemmasta") || sec.includes("staplat")) {
      return "HEMMASTA";
    }
    return "";
  }

  function axsCategoryFromRow(r, tokenToCategories, sectionValue) {
    const seasonName = normSeasonName(r.sasong);
    const axsTicket = normStr(r.biljettyp);
    const token = axsRegionToken(sectionValue, r.zon);
    for (const sk of regionScopeKeys(seasonName, axsTicket, token)) {
      const categories = mapSetToSortedArray(tokenToCategories.get(sk));
      if (categories.length === 1) {
        return categories[0];
      }
    }
    return "";
  }

  function mapSetToSortedArray(setValue) {
    return setValue ? [...setValue].sort((a, b) => a.localeCompare(b, "sv")) : [];
  }

  function axsPriceFromRow(r) {
    for (const key of ["biljettpris", "pris", "price"]) {
      const value = normPriceStr(r[key]);
      if (value) {
        return value;
      }
    }
    return "";
  }

  function comboKey(seasonName, ticket, category, price) {
    return [seasonName, ticket, category, price].join(COMBO_SEP);
  }

  function comboFromAxsRow(r, tokenToCategories) {
    const section = normStr(r.sektion);
    const seasonName = normSeasonName(r.sasong);
    const ticket = normStr(r.biljettyp);
    const category = axsCategoryFromRow(r, tokenToCategories, section);
    const price = axsPriceFromRow(r);
    return {
      seasonName,
      axsTicket: ticket,
      axsCategory: category,
      axsPrice: price,
      key: comboKey(seasonName, ticket, category, price),
    };
  }

  function seasonRowMatchesCombo(row, combo) {
    const seasonFold = foldAscii(combo.seasonName);
    const ticketFold = foldAscii(combo.axsTicket);
    const categoryFold = foldAscii(combo.axsCategory);
    if (ticketFold && foldAscii(row.biljettyp) !== ticketFold) {
      return false;
    }
    if (categoryFold && foldAscii(row.kategori) !== categoryFold) {
      return false;
    }
    if (seasonFold && !foldAscii(row.sasongskort).startsWith(seasonFold)) {
      return false;
    }
    return true;
  }

  function buildSeasonAutoPreset(combos, seasonRows) {
    const preset = new Map();
    for (const combo of combos) {
      const candidates = new Set();
      for (const row of seasonRows) {
        if (!seasonRowMatchesCombo(row, combo)) {
          continue;
        }
        const id = normStr(row.sotpciid);
        if (id) {
          candidates.add(id);
        }
      }
      if (candidates.size === 1) {
        preset.set(combo.key, [...candidates][0]);
      }
    }
    return preset;
  }
  function transformRows(
    axsRows,
    seatsSet,
    seasonOverride,
    sotpciidToName,
    tokenToCategories,
    manualSeatMap,
    manualIntersectionMap,
    preferSittplats,
    exportConfig
  ) {
    const cfg = normalizeExportConfig(exportConfig);
    const outRows = [];
    const invalidRows = [];
    const axsValidSeats = new Set();

    for (let i = 0; i < axsRows.length; i += 1) {
      const r = axsRows[i];
      const combo = comboFromAxsRow(r, tokenToCategories);
      const parsedSeat = parseAxsSeatFromRow(r, preferSittplats);
      const numbered = Boolean(parsedSeat);
      const intersectionKey = intersectionMapKey(
        combo.seasonName,
        combo.axsTicket,
        combo.axsPrice,
        numbered
      );
      const legacyKey = legacyIntersectionMapKey(combo.seasonName, combo.axsTicket, numbered);
      const autoIntersectionId = seasonOverride.get(combo.key) || "";
      const manualIntersectionId = getManualIntersectionSotpciId(
        manualIntersectionMap.get(intersectionKey)
        || manualIntersectionMap.get(legacyKey)
      );
      const importIntersectionId = manualIntersectionId || autoIntersectionId || "";

      let section = "";
      let row = "";
      let seat = "";
      let finalSeatKey = "";

      if (parsedSeat) {
        const axsSeatKey = parsedSeat.seatKey;
        finalSeatKey = manualSeatMap.get(axsSeatKey) || axsSeatKey;
        if (!seatsSet.has(finalSeatKey)) {
          invalidRows.push({
            rowindex: i + 1,
            orderid: normStr(r.orderid),
            sittplats: normStr(r.sittplats),
            axsSeat: seatKeyToSlash(axsSeatKey),
            mappedSeat: seatKeyToBackslash(finalSeatKey),
            sasong: combo.seasonName,
            biljettyp: combo.axsTicket,
            kategori: combo.axsCategory,
          });
          continue;
        }
        const split = splitSeatKey(finalSeatKey);
        if (!split) {
          continue;
        }
        section = split.section;
        row = split.row;
        seat = split.seat;
        axsValidSeats.add(finalSeatKey);
      }

      const out = {
        ImportIntersectionId: importIntersectionId,
        ImportIntersectionName: sotpciidToName.get(importIntersectionId) || "",
        IntersectionId: "",
        IntersectionName: "",
        Section: section,
        Row: row,
        Seat: seat,
        FirstName: normStr(r.fornamn),
        LastName: normStr(r.efternamn),
        OrganizationName: normStr(r.foretag),
        EmailAddress: normStr(r.email),
        MobilePhoneNo: normStr(r.telefon),
        PostalAddressLineOne: normStr(r.adress),
        PostalAddressLineTwo: "",
        Zipcode: normZip(r.postnummer),
        City: normStr(r.ort),
        Country: "SE",
        PurchaseGroup: normStr(r.kundnummer),
        EventId: cfg.eventId,
        BookingType: cfg.bookingType,
        BookingExpiryUtc: cfg.bookingExpiryUtc,
        AdvanceInvoiceDueDateUtc: "",
        InhibitInvoiceFee: cfg.inhibitInvoiceFee,
        PrintAsPlasticCard: cfg.printAsPlasticCard,
        SendPaymentLinkEmail: cfg.sendPaymentLinkEmail,
        CampaignActivationCode: cfg.campaignActivationCode,
        PurchaseOperationId: ROW_DEFAULTS.purchaseOperationId,
        PurchaseType: cfg.purchaseType,
        SendEmail: cfg.sendEmail,
        IsExtension: ROW_DEFAULTS.isExtension,
        AuthCode: "",
        GxRefNo: "",
        AllowHolds: ROW_DEFAULTS.allowHolds,
        AllowSeasonOfferTypeMismatch: "",
        ExternalAuthCode: normStr(r.pinnummer),
        TpuIdentityId: "",
      };
      outRows.push(out);
    }

    return { outRows, invalidRows, axsValidSeats };
  }

  async function loadSourceData() {
    const axsParsed = await parseFileByAnchor(state.axs, anchorColumns.axs);
    const platsParsed = await parseFileByAnchor(state.plats, anchorColumns.plats);
    const seasonParsed = await parseFileByAnchor(state.season, anchorColumns.season);

    validateRequiredColumns(axsParsed, AXS_REQUIRED_KEYS, "AXS-filen");
    validateRequiredColumns(platsParsed, PLATS_REQUIRED_KEYS, "Platsfilen");
    validateRequiredColumns(seasonParsed, SEASON_REQUIRED_KEYS, "Säsongskortsfilen");

    const hasSittplatsColumn = axsParsed.headerKeys.includes("sittplats");
    const preferSittplats = hasSittplatsColumn;
    const { seatsSet, sectionsSet, sectionToRows, sectionRowToSeats } = parseTicksterSeats(platsParsed.rows);
    const seasonRows = buildSeasonRows(seasonParsed.rows);
    if (seasonRows.length === 0) {
      throw new Error("Säsongskortsfilen gav 0 giltiga rader.");
    }
    const tokenToCategories = buildRegionCategoryMap(seasonRows);

    const sotpciidToName = new Map();
    seasonRows.forEach((r) => {
      const label = r.kategori
        ? `${r.sasongskort} | ${r.kategori} | ${r.biljettyp}`
        : `${r.sasongskort} |  | ${r.biljettyp}`;
      sotpciidToName.set(r.sotpciid, label);
    });
    const idSeasonSet = new Set();
    const idCategoriesBySeasonSet = new Map();
    const idTicketsBySeasonCategorySet = new Map();
    const idRowsByChoice = new Map();
    const sotpciidToSeasonRow = new Map();
    for (const row of seasonRows) {
      const seasonCard = normStr(row.sasongskort);
      const category = normStr(row.kategori);
      const idTicket = normStr(row.biljettyp);
      const idKey = seasonChoiceKey(seasonCard, category, idTicket);
      if (!idRowsByChoice.has(idKey)) {
        idRowsByChoice.set(idKey, []);
      }
      idRowsByChoice.get(idKey).push(row);
      if (row.sotpciid && !sotpciidToSeasonRow.has(row.sotpciid)) {
        sotpciidToSeasonRow.set(row.sotpciid, row);
      }

      if (!seasonCard) {
        continue;
      }
      idSeasonSet.add(seasonCard);
      if (!idCategoriesBySeasonSet.has(seasonCard)) {
        idCategoriesBySeasonSet.set(seasonCard, new Set());
      }
      idCategoriesBySeasonSet.get(seasonCard).add(category);

      const seasonCategoryKey = seasonCategoryChoiceKey(seasonCard, category);
      if (!idTicketsBySeasonCategorySet.has(seasonCategoryKey)) {
        idTicketsBySeasonCategorySet.set(seasonCategoryKey, new Set());
      }
      idTicketsBySeasonCategorySet.get(seasonCategoryKey).add(idTicket);
    }
    const idSeasonOptions = [...idSeasonSet].sort((a, b) => a.localeCompare(b, "sv"));
    const idCategoriesBySeason = new Map();
    for (const [seasonCard, categories] of idCategoriesBySeasonSet.entries()) {
      idCategoriesBySeason.set(
        seasonCard,
        [...categories].sort((a, b) => {
          if (!a && b) {
            return -1;
          }
          if (a && !b) {
            return 1;
          }
          return a.localeCompare(b, "sv");
        })
      );
    }
    const idTicketsBySeasonCategory = new Map();
    for (const [seasonCategoryKey, tickets] of idTicketsBySeasonCategorySet.entries()) {
      idTicketsBySeasonCategory.set(
        seasonCategoryKey,
        [...tickets].sort((a, b) => a.localeCompare(b, "sv"))
      );
    }

    const combosMap = new Map();
    let unknownCategoryRows = 0;
    axsParsed.rows.forEach((r) => {
      const combo = comboFromAxsRow(r, tokenToCategories);
      if (!combosMap.has(combo.key)) {
        combosMap.set(combo.key, combo);
      }
      if (!combo.axsCategory) {
        unknownCategoryRows += 1;
      }
    });
    const combos = [...combosMap.values()];
    const seasonOverride = buildSeasonAutoPreset(combos, seasonRows);
    const sortedSections = [...sectionsSet].sort((a, b) => a.localeCompare(b, "sv"));
    const rowsBySection = new Map();
    for (const [section, rowsSet] of sectionToRows.entries()) {
      rowsBySection.set(
        section,
        [...rowsSet].sort((a, b) => a.localeCompare(b, "sv"))
      );
    }
    const seatsBySectionRow = new Map();
    for (const [srKey, seatsSetForRow] of sectionRowToSeats.entries()) {
      seatsBySectionRow.set(
        srKey,
        [...seatsSetForRow].sort((a, b) => a.localeCompare(b, "sv"))
      );
    }

    return {
      axsRows: axsParsed.rows,
      seatsSet,
      sectionsSet,
      seasonRows,
      tokenToCategories,
      sotpciidToName,
      combos,
      seasonOverride,
      unknownCategoryRows,
      hasSittplatsColumn,
      preferSittplats,
      idSeasonOptions,
      idCategoriesBySeason,
      idTicketsBySeasonCategory,
      idRowsByChoice,
      sotpciidToSeasonRow,
      sortedSections,
      rowsBySection,
      seatsBySectionRow,
      sourceStats: {
        axsRows: axsParsed.rows.length,
        seats: seatsSet.size,
        sections: sectionsSet.size,
        seasonRows: seasonRows.length,
      },
    };
  }

  function buildResultFromSourceData(sourceData) {
    const transformed = transformRows(
      sourceData.axsRows,
      sourceData.seatsSet,
      sourceData.seasonOverride,
      sourceData.sotpciidToName,
      sourceData.tokenToCategories,
      state.manualSeatMap,
      state.manualIntersectionMap,
      sourceData.preferSittplats,
      state.exportConfig
    );

    const unmappedRows = transformed.outRows.reduce(
      (acc, r) => acc + (normStr(r.ImportIntersectionId) ? 0 : 1),
      0
    );

    const seatSummary = buildSeatComparison(
      sourceData.axsRows,
      sourceData.seatsSet,
      state.manualSeatMap,
      sourceData.preferSittplats
    );
    const intersectionSummary = buildIntersectionMappingSummary(sourceData);

    return {
      importRows: transformed.outRows,
      invalidRows: transformed.invalidRows,
      unmappedRows,
      comboCount: sourceData.combos.length,
      autoMappedCombos: sourceData.seasonOverride.size,
      unknownCategoryRows: sourceData.unknownCategoryRows,
      sourceStats: sourceData.sourceStats,
      seatSummary,
      intersectionSummary,
      hasSittplatsColumn: sourceData.hasSittplatsColumn,
    };
  }

  function renderResultMeta(result) {
    const items = [
      { label: "Import-rader", value: result.importRows.length },
      { label: "Omappade rader", value: result.unmappedRows },
      { label: "AXS ej i Tickster", value: result.invalidRows.length },
    ];
    resultMetaEl.innerHTML = items
      .map(
        (i) => `
      <article class="meta-card">
        <span class="meta-card__label">${escapeHtml(i.label)}</span>
        <span class="meta-card__value">${escapeHtml(i.value)}</span>
      </article>
    `
      )
      .join("");
  }

  function renderPreview(rows) {
    if (!rows.length) {
      previewWrapEl.innerHTML = '<div class="preview-empty">Inga import-rader att visa.</div>';
      previewHintEl.textContent = "Visar 0 rader";
      return;
    }
    const shown = rows.slice(0, PREVIEW_LIMIT);
    const head = OUTPUT_COLUMNS.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
    const body = shown
      .map((r) => {
        const cells = OUTPUT_COLUMNS.map((c) => `<td>${escapeHtml(r[c] ?? "")}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    previewWrapEl.innerHTML = `
      <table class="preview-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    `;
    previewHintEl.textContent = `Visar ${shown.length} av ${rows.length} rader`;
  }

  async function ensureSourceDataLoaded() {
    if (state.sourceData) {
      return state.sourceData;
    }
    if (!allFilesSelected()) {
      throw new Error("Välj alla tre filer först.");
    }
    const sourceData = await loadSourceData();
    state.sourceData = sourceData;
    return sourceData;
  }

  function closeSeatMapModal() {
    seatMapOverlay.hidden = true;
    seatMapTableBody.innerHTML = "";
    seatMapSummary.textContent = "-";
  }

  function closeIntersectionMapModal() {
    intersectionMapOverlay.hidden = true;
    intersectionMapNumberedTableBody.innerHTML = "";
    intersectionMapUnnumberedTableBody.innerHTML = "";
    intersectionMapSummary.textContent = "-";
  }

  function setCategorySelectOptions(selectEl, categories, selectedCategory = "") {
    const options = [`<option value="">Välj Kategori</option>`]
      .concat(
        categories.map((category) => {
          const value = categoryToOptionValue(category);
          const label = normStr(category) || "(tom)";
          return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
        })
      );
    selectEl.innerHTML = options.join("");
    const selectedValue = categoryToOptionValue(selectedCategory);
    if (selectedCategory !== undefined && categories.some((c) => normStr(c) === normStr(selectedCategory))) {
      selectEl.value = selectedValue;
    } else {
      selectEl.value = "";
    }
  }

  function categoriesForIdSeason(sourceData, seasonCard) {
    return seasonCard ? (sourceData.idCategoriesBySeason.get(seasonCard) || []) : [];
  }

  function ticketsForIdSeasonCategory(sourceData, seasonCard, category) {
    if (!seasonCard) {
      return [];
    }
    return sourceData.idTicketsBySeasonCategory.get(seasonCategoryChoiceKey(seasonCard, category)) || [];
  }

  function resolveManualIntersectionSelection(sourceData, mapValue) {
    if (!mapValue) {
      return null;
    }
    if (typeof mapValue === "object") {
      const seasonCard = normStr(mapValue.seasonCard);
      const category = normStr(mapValue.category);
      const idTicket = normStr(mapValue.idTicket);
      if (seasonCard || category || idTicket) {
        return { seasonCard, category, idTicket };
      }
    }
    const sotpciid = getManualIntersectionSotpciId(mapValue);
    if (!sotpciid) {
      return null;
    }
    const row = sourceData.sotpciidToSeasonRow.get(sotpciid);
    if (!row) {
      return null;
    }
    return {
      seasonCard: normStr(row.sasongskort),
      category: normStr(row.kategori),
      idTicket: normStr(row.biljettyp),
    };
  }

  function setupIntersectionMapRowSelectors(rowEl, sourceData, initialMapValue) {
    const seasonSelect = rowEl.querySelector('[data-role="id-season"]');
    const categorySelect = rowEl.querySelector('[data-role="id-category"]');
    const ticketSelect = rowEl.querySelector('[data-role="id-ticket"]');
    if (!seasonSelect || !categorySelect || !ticketSelect) {
      return;
    }

    const initial = resolveManualIntersectionSelection(sourceData, initialMapValue);
    setSelectOptions(
      seasonSelect,
      sourceData.idSeasonOptions || [],
      "Välj Säsongskort",
      initial ? initial.seasonCard : ""
    );

    const refreshCategories = (preferredCategory = "") => {
      const seasonCard = normStr(seasonSelect.value);
      const categories = categoriesForIdSeason(sourceData, seasonCard);
      setCategorySelectOptions(categorySelect, categories, preferredCategory);
      categorySelect.disabled = !seasonCard || categories.length === 0;
      categorySelect.classList.remove("invalid");
    };

    const refreshTickets = (preferredTicket = "") => {
      const seasonCard = normStr(seasonSelect.value);
      const category = optionValueToCategory(categorySelect.value);
      const tickets = ticketsForIdSeasonCategory(sourceData, seasonCard, category);
      setSelectOptions(ticketSelect, tickets, "Välj Biljettyp", preferredTicket);
      ticketSelect.disabled = !seasonCard || !categorySelect.value || tickets.length === 0;
      ticketSelect.classList.remove("invalid");
    };

    refreshCategories(initial ? initial.category : "");
    refreshTickets(initial ? initial.idTicket : "");

    seasonSelect.addEventListener("change", () => {
      seasonSelect.classList.remove("invalid");
      refreshCategories("");
      refreshTickets("");
    });
    categorySelect.addEventListener("change", () => {
      categorySelect.classList.remove("invalid");
      refreshTickets("");
    });
    ticketSelect.addEventListener("change", () => {
      ticketSelect.classList.remove("invalid");
    });
  }

  function renderIntersectionMapModalRows(sourceData, summary) {
    const allEntries = summary.entries || [];
    const renderRows = (tableBodyEl, entries, emptyText) => {
      if (!entries.length) {
        tableBodyEl.innerHTML = `
          <tr>
            <td colspan="7" class="modal-empty">${escapeHtml(emptyText)}</td>
          </tr>
        `;
        return;
      }
      tableBodyEl.innerHTML = entries
        .map((entry) => `
          <tr data-map-key="${escapeHtml(entry.key)}" data-map-legacy-key="${escapeHtml(entry.legacyKey)}" data-auto-sotpciid="${escapeHtml(entry.autoSotpciId || "")}" data-needs-manual="${entry.needsManual ? "1" : "0"}">
            <td>${entry.hasVisibleMapping ? "✅" : ""}</td>
            <td>${escapeHtml(entry.seasonName)}</td>
            <td>${escapeHtml(entry.axsTicket)}</td>
            <td>${escapeHtml(entry.axsPrice || "-")}</td>
            <td><select class="modal-map-select" data-role="id-season"></select></td>
            <td><select class="modal-map-select" data-role="id-category"></select></td>
            <td><select class="modal-map-select" data-role="id-ticket"></select></td>
          </tr>
        `)
        .join("");
    };

    const numberedEntries = allEntries.filter((entry) => entry.numbered);
    const unnumberedEntries = allEntries.filter((entry) => !entry.numbered);

    renderRows(
      intersectionMapNumberedTableBody,
      numberedEntries,
      "Inga numrerade kombinationer."
    );
    renderRows(
      intersectionMapUnnumberedTableBody,
      unnumberedEntries,
      "Inga onumrerade kombinationer."
    );

    if (!allEntries.length) {
      intersectionMapSummary.textContent = "Inga kombinationer hittades";
      intersectionMapSaveBtn.disabled = true;
      return;
    }

    intersectionMapSaveBtn.disabled = false;
    intersectionMapSummary.textContent = `${summary.totalCount} kombinationer (${summary.mappedCount} mappade, ${summary.unmatchedCount} omappade)`;

    const rows = Array.from(
      intersectionMapOverlay.querySelectorAll("tr[data-map-key]")
    );
    for (const rowEl of rows) {
      const mapKey = normStr(rowEl.dataset.mapKey);
      const legacyKey = normStr(rowEl.dataset.mapLegacyKey);
      const autoSotpciId = normStr(rowEl.dataset.autoSotpciid);
      const needsManual = rowEl.dataset.needsManual === "1";
      const initial = state.manualIntersectionMap.get(mapKey)
        || state.manualIntersectionMap.get(legacyKey)
        || (!needsManual ? autoSotpciId : "")
        || null;
      setupIntersectionMapRowSelectors(rowEl, sourceData, initial);
    }
  }

  async function openIntersectionMapModal() {
    let sourceData;
    try {
      sourceData = await ensureSourceDataLoaded();
    } catch (err) {
      setStatus(err.message || "Kunde inte läsa källdata för ID-mappning.", "error");
      log(err.message || "Kunde inte läsa källdata för ID-mappning.", "error");
      return;
    }
    const summary = buildIntersectionMappingSummary(sourceData);
    renderIntersectionMapModalRows(sourceData, summary);
    intersectionMapOverlay.hidden = false;
  }

  function applyIntersectionMappingFromModal() {
    if (!state.sourceData) {
      closeIntersectionMapModal();
      return;
    }
    const rows = Array.from(intersectionMapOverlay.querySelectorAll("tr[data-map-key]"));
    const nextMap = new Map(state.manualIntersectionMap);
    let invalidCount = 0;

    for (const rowEl of rows) {
      const mapKey = normStr(rowEl.dataset.mapKey);
      const legacyKey = normStr(rowEl.dataset.mapLegacyKey);
      const seasonSelect = rowEl.querySelector('[data-role="id-season"]');
      const categorySelect = rowEl.querySelector('[data-role="id-category"]');
      const ticketSelect = rowEl.querySelector('[data-role="id-ticket"]');
      if (!seasonSelect || !categorySelect || !ticketSelect || !mapKey) {
        continue;
      }

      seasonSelect.classList.remove("invalid");
      categorySelect.classList.remove("invalid");
      ticketSelect.classList.remove("invalid");

      const seasonCard = normStr(seasonSelect.value);
      const categoryRaw = normStr(categorySelect.value);
      const idTicket = normStr(ticketSelect.value);
      const selectedCount = [seasonCard, categoryRaw, idTicket].filter(Boolean).length;
      if (selectedCount === 0) {
        nextMap.delete(mapKey);
        if (legacyKey && legacyKey !== mapKey) {
          nextMap.delete(legacyKey);
        }
        continue;
      }
      if (selectedCount < 3) {
        invalidCount += 1;
        if (!seasonCard) {
          seasonSelect.classList.add("invalid");
        }
        if (!categoryRaw) {
          categorySelect.classList.add("invalid");
        }
        if (!idTicket) {
          ticketSelect.classList.add("invalid");
        }
        continue;
      }

      const category = optionValueToCategory(categoryRaw);
      const candidates = state.sourceData.idRowsByChoice.get(seasonChoiceKey(seasonCard, category, idTicket)) || [];
      if (candidates.length !== 1 || !normStr(candidates[0].sotpciid)) {
        invalidCount += 1;
        ticketSelect.classList.add("invalid");
        continue;
      }

      nextMap.set(mapKey, {
        seasonCard,
        category,
        idTicket,
        sotpciid: normStr(candidates[0].sotpciid),
      });
      if (legacyKey && legacyKey !== mapKey) {
        nextMap.delete(legacyKey);
      }
    }

    if (invalidCount > 0) {
      setStatus("Minst en ID-mappningsrad är ofullständig eller tvetydig.", "error");
      log("Ogiltig manuell ID-mappning upptäckt i modal.", "warn");
      return;
    }

    state.manualIntersectionMap = nextMap;
    const result = buildResultFromSourceData(state.sourceData);
    state.result = result;
    state.resultSourceSignature = currentFilesSignature();
    renderSeatCheck(result.seatSummary || null);
    renderIntersectionCheck(result.intersectionSummary || null);
    renderResultMeta(result);
    renderPreview(result.importRows);
    updateExportButtonState();
    scheduleCacheSave();
    closeIntersectionMapModal();
    setStatus(
      `ID-mappning sparad. ${result.intersectionSummary.unmatchedCount} kombinationer återstår att mappa.`,
      "ready"
    );
    log(`ID-mappning uppdaterad. Omappade kombinationer kvar: ${result.intersectionSummary.unmatchedCount}.`);
  }

  function openLogModal() {
    renderLogModalText();
    logOverlay.hidden = false;
  }

  function closeLogModal() {
    logOverlay.hidden = true;
  }

  function formatConfigErrors(errors) {
    return errors.map((err) => `- ${err}`).join("\n");
  }

  function openExportConfigModal() {
    syncExportConfigFormFromState();
    const validation = validateExportConfig(state.exportConfig);
    exportConfigValidation.textContent = validation.valid ? "" : formatConfigErrors(validation.errors);
    exportConfigOverlay.hidden = false;
  }

  function closeExportConfigModal() {
    exportConfigOverlay.hidden = true;
    exportConfigValidation.textContent = "";
  }

  async function applyExportConfigFromModal() {
    const validation = validateExportConfig(readExportConfigFromForm());
    if (!validation.valid) {
      exportConfigValidation.textContent = formatConfigErrors(validation.errors);
      return;
    }

    state.exportConfig = validation.cfg;
    exportConfigValidation.textContent = "";
    closeExportConfigModal();

    if (allFilesSelected()) {
      try {
        const sourceData = await ensureSourceDataLoaded();
        state.sourceData = sourceData;
        if (state.result || !infoPanel.hidden) {
          const result = buildResultFromSourceData(sourceData);
          state.result = result;
          state.resultSourceSignature = currentFilesSignature();
          renderSeatCheck(result.seatSummary || null);
          renderIntersectionCheck(result.intersectionSummary || null);
          renderResultMeta(result);
          renderPreview(result.importRows);
        }
      } catch (err) {
        setStatus(err.message || "Kunde inte uppdatera exportkonfiguration.", "error");
        log(err.message || "Kunde inte uppdatera exportkonfiguration.", "error");
        updateExportButtonState();
        scheduleCacheSave();
        return;
      }
    }

    updateExportButtonState();
    scheduleCacheSave();
    setStatus("Exportkonfiguration sparad.", "ready");
    log("Exportkonfiguration uppdaterad.");
  }

  function renderSeatMapModalRows(sourceData, seatSummary) {
    const unmatched = seatSummary.unmatchedSeatKeys || [];
    if (!unmatched.length) {
      seatMapTableBody.innerHTML = `
        <tr>
          <td colspan="2" class="modal-empty">Alla numrerade platser matchar redan.</td>
        </tr>
      `;
      seatMapSummary.textContent = "Inga omappade platser";
      seatMapSaveBtn.disabled = true;
      return;
    }

    seatMapSaveBtn.disabled = false;
    seatMapSummary.textContent = `${unmatched.length} omappade AXS-platser`;

    seatMapTableBody.innerHTML = unmatched
      .map((axsSeatKey) => {
        return `
          <tr data-axs-seat-key="${escapeHtml(axsSeatKey)}">
            <td><code>${escapeHtml(seatKeyToSlash(axsSeatKey))}</code></td>
            <td>
              <div class="modal-map-grid">
                <select class="modal-map-select" data-role="section"></select>
                <select class="modal-map-select" data-role="row"></select>
                <select class="modal-map-select" data-role="seat"></select>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    const rows = Array.from(seatMapTableBody.querySelectorAll("tr[data-axs-seat-key]"));
    for (const rowEl of rows) {
      const axsSeatKey = normStr(rowEl.dataset.axsSeatKey);
      const mappedSeatKey = state.manualSeatMap.get(axsSeatKey) || "";
      setupSeatMapRowSelectors(rowEl, sourceData, mappedSeatKey);
    }
  }

  function setSelectOptions(selectEl, values, placeholder, selectedValue = "") {
    const opts = [`<option value="">${escapeHtml(placeholder)}</option>`]
      .concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`));
    selectEl.innerHTML = opts.join("");
    if (selectedValue && values.includes(selectedValue)) {
      selectEl.value = selectedValue;
    } else {
      selectEl.value = "";
    }
  }

  function rowsForSection(sourceData, section) {
    return section ? (sourceData.rowsBySection.get(section) || []) : [];
  }

  function seatsForSectionRow(sourceData, section, row) {
    if (!section || !row) {
      return [];
    }
    return sourceData.seatsBySectionRow.get(`${section}|${row}`) || [];
  }

  function setupSeatMapRowSelectors(rowEl, sourceData, initialSeatKey) {
    const sectionSelect = rowEl.querySelector('[data-role="section"]');
    const rowSelect = rowEl.querySelector('[data-role="row"]');
    const seatSelect = rowEl.querySelector('[data-role="seat"]');
    if (!sectionSelect || !rowSelect || !seatSelect) {
      return;
    }

    const initial = splitSeatKey(initialSeatKey);
    const sections = sourceData.sortedSections || [];
    setSelectOptions(sectionSelect, sections, "Välj sektion", initial ? initial.section : "");

    const refreshRows = (preferredRow = "") => {
      const section = normStr(sectionSelect.value);
      const rows = rowsForSection(sourceData, section);
      setSelectOptions(rowSelect, rows, "Välj rad", preferredRow);
      rowSelect.disabled = !section || rows.length === 0;
      rowSelect.classList.remove("invalid");
    };

    const refreshSeats = (preferredSeat = "") => {
      const section = normStr(sectionSelect.value);
      const row = normStr(rowSelect.value);
      const seats = seatsForSectionRow(sourceData, section, row);
      setSelectOptions(seatSelect, seats, "Välj plats", preferredSeat);
      seatSelect.disabled = !section || !row || seats.length === 0;
      seatSelect.classList.remove("invalid");
    };

    refreshRows(initial ? initial.row : "");
    refreshSeats(initial ? initial.seat : "");

    sectionSelect.addEventListener("change", () => {
      sectionSelect.classList.remove("invalid");
      refreshRows("");
      refreshSeats("");
    });
    rowSelect.addEventListener("change", () => {
      rowSelect.classList.remove("invalid");
      refreshSeats("");
    });
    seatSelect.addEventListener("change", () => {
      seatSelect.classList.remove("invalid");
    });
  }

  async function openSeatMapModal() {
    let sourceData;
    try {
      sourceData = await ensureSourceDataLoaded();
    } catch (err) {
      setStatus(err.message || "Kunde inte läsa källdata för mappning.", "error");
      log(err.message || "Kunde inte läsa källdata för mappning.", "error");
      return;
    }

    const seatSummary = buildSeatComparison(
      sourceData.axsRows,
      sourceData.seatsSet,
      state.manualSeatMap,
      sourceData.preferSittplats
    );
    renderSeatMapModalRows(sourceData, seatSummary);
    seatMapOverlay.hidden = false;
  }

  function applySeatMappingFromModal() {
    if (!state.sourceData) {
      closeSeatMapModal();
      return;
    }
    const rows = Array.from(seatMapTableBody.querySelectorAll("tr[data-axs-seat-key]"));
    const nextMap = new Map(state.manualSeatMap);
    let invalidCount = 0;

    for (const rowEl of rows) {
      const axsSeatKey = normStr(rowEl.dataset.axsSeatKey);
      const sectionSelect = rowEl.querySelector('[data-role="section"]');
      const rowSelect = rowEl.querySelector('[data-role="row"]');
      const seatSelect = rowEl.querySelector('[data-role="seat"]');
      if (!sectionSelect || !rowSelect || !seatSelect) {
        continue;
      }

      sectionSelect.classList.remove("invalid");
      rowSelect.classList.remove("invalid");
      seatSelect.classList.remove("invalid");
      if (!axsSeatKey) {
        continue;
      }

      const section = normStr(sectionSelect.value);
      const rowValue = normIntishStr(rowSelect.value);
      const seatValue = normIntishStr(seatSelect.value);
      const selectedCount = [section, rowValue, seatValue].filter(Boolean).length;

      if (selectedCount === 0) {
        nextMap.delete(axsSeatKey);
        continue;
      }

      if (selectedCount < 3) {
        invalidCount += 1;
        if (!section) {
          sectionSelect.classList.add("invalid");
        }
        if (!rowValue) {
          rowSelect.classList.add("invalid");
        }
        if (!seatValue) {
          seatSelect.classList.add("invalid");
        }
        continue;
      }

      const parsedSeatKey = `${section}|${rowValue}|${seatValue}`;
      if (!state.sourceData.seatsSet.has(parsedSeatKey)) {
        invalidCount += 1;
        seatSelect.classList.add("invalid");
        continue;
      }
      nextMap.set(axsSeatKey, parsedSeatKey);
    }

    if (invalidCount > 0) {
      setStatus("Minst en mappningsrad är ofullständig eller ogiltig.", "error");
      log("Ogiltig manuell mappning upptäckt i seat-modal.", "warn");
      return;
    }

    state.manualSeatMap = nextMap;
    const result = buildResultFromSourceData(state.sourceData);
    state.result = result;
    state.resultSourceSignature = currentFilesSignature();
    renderSeatCheck(result.seatSummary || null);
    renderIntersectionCheck(result.intersectionSummary || null);
    renderResultMeta(result);
    renderPreview(result.importRows);
    updateExportButtonState();
    scheduleCacheSave();
    closeSeatMapModal();
    setStatus(`Mappning sparad. ${result.seatSummary.unmatchedCount} platser återstår att mappa.`, "ready");
    log(`Seat-mappning uppdaterad. Omappade platser kvar: ${result.seatSummary.unmatchedCount}.`);
  }

  function csvEscape(value) {
    const s = normStr(value);
    if (s.includes(CSV_DELIMITER) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function downloadCsv(rows) {
    const headerLine = OUTPUT_COLUMNS.join(CSV_DELIMITER);
    const lines = rows.map((row) => OUTPUT_COLUMNS.map((col) => csvEscape(row[col])).join(CSV_DELIMITER));
    const content = `\uFEFF${[headerLine, ...lines].join("\r\n")}`;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `axs-to-tickster-import-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function attachCardEvents(card) {
    const key = card.dataset.key;
    const fileInput = card.querySelector('[data-slot="input"]');
    const pickBtn = card.querySelector('[data-action="pick"]');
    const clearBtn = card.querySelector('[data-action="clear"]');

    pickBtn.addEventListener("click", () => fileInput.click());
    clearBtn.addEventListener("click", () => {
      fileInput.value = "";
      setFileForKey(key, null);
    });
    fileInput.addEventListener("change", () => {
      setFileForKey(key, fileInput.files && fileInput.files[0] ? fileInput.files[0] : null);
    });

    ["dragenter", "dragover"].forEach((evt) => {
      card.addEventListener(evt, (e) => {
        e.preventDefault();
        card.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach((evt) => {
      card.addEventListener(evt, (e) => {
        e.preventDefault();
        card.classList.remove("dragover");
      });
    });
    card.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files[0]) {
        return;
      }
      setFileForKey(key, dt.files[0]);
    });
  }

  cards.forEach(attachCardEvents);

  loadBtn.addEventListener("click", async () => {
    if (uploadCollapsed) {
      setUploadCollapsed(false);
      log("Filinladdning öppnad igen.");
      return;
    }

    if (!allFilesSelected()) {
      setStatus("Saknar minst en fil.", "warn");
      log("Saknar minst en fil.", "warn");
      return;
    }

    infoPanel.hidden = false;
    setBusy(true);
    let sourceData;
    try {
      sourceData = await loadSourceData();
    } catch (err) {
      setBusy(false);
      state.result = null;
      state.resultSourceSignature = null;
       state.sourceData = null;
      clearResultView("Kunde inte skapa preview.");
      setStatus(err.message || "Fel vid inläsning.", "error");
      log(err.message || "Fel vid inläsning.", "error");
      scheduleCacheSave();
      return;
    }

    state.sourceData = sourceData;
    const result = buildResultFromSourceData(sourceData);
    state.result = result;
    state.resultSourceSignature = currentFilesSignature();
    renderSeatCheck(result.seatSummary || null);
    renderIntersectionCheck(result.intersectionSummary || null);
    renderResultMeta(result);
    renderPreview(result.importRows);
    updateExportButtonState();
    setUploadCollapsed(true);
    setBusy(false);
    scheduleCacheSave();

    log("Filinläsning klar.");
    log(`AXS-rader: ${result.sourceStats.axsRows}`);
    log(`Platsfil platser (unika): ${result.sourceStats.seats} | Sektioner: ${result.sourceStats.sections}`);
    log(`Säsongskorts-rader: ${result.sourceStats.seasonRows}`);
    log(`Kombinationer i AXS: ${result.comboCount} | Automappade: ${result.autoMappedCombos}`);
    log(
      `ID-mappning: ${result.intersectionSummary.mappedCount} av ${result.intersectionSummary.totalCount} kombinationer klara. `
      + `${result.intersectionSummary.unmatchedCount} kombinationer saknar mappning (${result.intersectionSummary.unresolvedRows} rader).`
    );
    log(
      `${result.seatSummary.matchedCount} av ${result.seatSummary.totalCount} platser kunde matchas. `
      + `${result.seatSummary.unmatchedCount} platser saknar motsvarighet i Tickster.`
    );
    if (!result.hasSittplatsColumn) {
      log("Kolumnen Sittplats saknas i AXS-fil. Fallback till Sektion/Rad/Plats används.", "warn");
    }
    if (result.unknownCategoryRows > 0) {
      log(`Kunde inte härleda kategori för ${result.unknownCategoryRows} AXS-rader.`, "warn");
    }
    setStatus(`Klart. ${result.importRows.length} import-rader byggda.`, "ready");
  });

  openLogBtn.addEventListener("click", () => {
    openLogModal();
  });

  closeLogBtn.addEventListener("click", () => {
    closeLogModal();
  });

  logOverlay.addEventListener("click", (event) => {
    if (event.target === logOverlay) {
      closeLogModal();
    }
  });

  openExportConfigBtn.addEventListener("click", () => {
    openExportConfigModal();
  });

  exportConfigCancelBtn.addEventListener("click", () => {
    closeExportConfigModal();
  });

  exportConfigSaveBtn.addEventListener("click", () => {
    void applyExportConfigFromModal();
  });

  exportConfigOverlay.addEventListener("click", (event) => {
    if (event.target === exportConfigOverlay) {
      closeExportConfigModal();
    }
  });

  exportCsvBtn.addEventListener("click", () => {
    if (!hasExportableRows()) {
      return;
    }
    const validation = validateExportConfig(state.exportConfig);
    if (!validation.valid) {
      setStatus("Export kräver giltig exportkonfiguration.", "warn");
      openExportConfigModal();
      return;
    }
    downloadCsv(state.result.importRows);
    log(`CSV nedladdad (${state.result.importRows.length} rader).`);
  });

  openSeatMapBtn.addEventListener("click", () => {
    void openSeatMapModal();
  });

  openIntersectionMapBtn.addEventListener("click", () => {
    void openIntersectionMapModal();
  });

  seatMapCancelBtn.addEventListener("click", () => {
    closeSeatMapModal();
  });

  seatMapSaveBtn.addEventListener("click", () => {
    applySeatMappingFromModal();
  });

  intersectionMapCancelBtn.addEventListener("click", () => {
    closeIntersectionMapModal();
  });

  intersectionMapSaveBtn.addEventListener("click", () => {
    applyIntersectionMappingFromModal();
  });

  seatMapOverlay.addEventListener("click", (event) => {
    if (event.target === seatMapOverlay) {
      closeSeatMapModal();
    }
  });

  intersectionMapOverlay.addEventListener("click", (event) => {
    if (event.target === intersectionMapOverlay) {
      closeIntersectionMapModal();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (!exportConfigOverlay.hidden) {
      closeExportConfigModal();
      return;
    }
    if (!logOverlay.hidden) {
      closeLogModal();
      return;
    }
    if (!intersectionMapOverlay.hidden) {
      closeIntersectionMapModal();
      return;
    }
    if (!seatMapOverlay.hidden) {
      closeSeatMapModal();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushCacheSave();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (cacheSaveTimer) {
      clearTimeout(cacheSaveTimer);
      cacheSaveTimer = null;
    }
    void flushCacheSave();
  });

  async function initialize() {
    syncExportConfigFormFromState();
    renderLogModalText();
    clearResultView();
    updateReadyState();
    updateExportButtonState();
    const restored = await restoreFromCacheIfAvailable();
    if (!restored) {
      log("Sida laddad. Välj de tre filerna och klicka Läs in.");
      updateExportButtonState();
    }
  }

  void initialize();
})();
