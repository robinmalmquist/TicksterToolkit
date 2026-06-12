const canvas = document.getElementById("layoutCanvas");
const canvasContainer = document.getElementById("canvas-container");
const ctx = canvas.getContext("2d");

const layoutMetaEl = document.getElementById("layoutMeta");
const canvasStatusEl = document.getElementById("canvasStatus");
const tooltipEl = document.getElementById("tooltip");

const viewSectionNamesToggle = document.getElementById("viewSectionNamesToggle");
const overlayModeInputs = Array.from(document.querySelectorAll("input[name='overlayMode']"));
const seatLabelModeInputs = Array.from(document.querySelectorAll("input[name='seatLabelMode']"));

const numberedImportCard = document.getElementById("numberedImportCard");
const numberedImportLoadTltBtn = document.getElementById("numberedImportLoadTltBtn");
const numberedImportTltInput = document.getElementById("numberedImportTltInput");
const numberedImportLoadXlsxBtn = document.getElementById("numberedImportLoadXlsxBtn");
const numberedImportXlsxInput = document.getElementById("numberedImportXlsxInput");
const numberedImportAllowAllTltSeats = document.getElementById("numberedImportAllowAllTltSeats");
const numberedImportModePurchase = document.getElementById("numberedImportModePurchase");
const numberedImportModeSeat = document.getElementById("numberedImportModeSeat");
const numberedImportSectionsAll = document.getElementById("numberedImportSectionsAll");
const numberedImportSectionList = document.getElementById("numberedImportSectionList");
const numberedImportAutoOrderRow1 = document.getElementById("numberedImportAutoOrderRow1");
const numberedImportAutoOrderGoodness = document.getElementById("numberedImportAutoOrderGoodness");
const numberedImportAutoPlaceAllBtn = document.getElementById("numberedImportAutoPlaceAllBtn");
const numberedImportClearBtn = document.getElementById("numberedImportClearBtn");
const numberedImportExportBtn = document.getElementById("numberedImportExportBtn");
const numberedImportLayoutState = document.getElementById("numberedImportLayoutState");
const numberedImportExcelState = document.getElementById("numberedImportExcelState");
const numberedImportValidationState = document.getElementById("numberedImportValidationState");
const numberedImportIssues = document.getElementById("numberedImportIssues");
const numberedImportIssuesSummary = document.getElementById("numberedImportIssuesSummary");
const numberedImportErrors = document.getElementById("numberedImportErrors");
const numberedImportPurchaseList = document.getElementById("numberedImportPurchaseList");
const numberedImportPurchaseMenu = document.getElementById("numberedImportPurchaseMenu");
const numberedImportMenuClearPurchase = document.getElementById("numberedImportMenuClearPurchase");
const numberedImportMenuClearRow = document.getElementById("numberedImportMenuClearRow");
const numberedImportMenuPushLeft = document.getElementById("numberedImportMenuPushLeft");
const numberedImportMenuPushRight = document.getElementById("numberedImportMenuPushRight");

const BASE_WORLD_RADIUS = 10;
const MIN_SEAT_SCREEN_RADIUS = 4;
const RECT_DOT_THRESHOLD = 2500;
const HOVER_VISIBLE_LIMIT = 12000;
const GOODNESS_HEAT_START = "#38bdf8";
const GOODNESS_HEAT_END = "#ef4444";
const OVERLAY_MODES = ["none", "price", "goodness"];
const SEAT_LABEL_MODES = ["none", "row", "seat"];

let seats = [];
let sectionNames = new Map();
let rowNames = new Map();
let priceRegions = [];
let seatBlocks = [];
let currentFileName = "";
let currentVenueId = "";
let layoutBounds = null;
let hoverSeat = null;
let hoverClientX = 0;
let hoverClientY = 0;
let scale = 1;
let translateX = 0;
let translateY = 0;
let showSectionNames = false;
let overlayMode = "goodness";
let seatLabelMode = "none";
let numberedImportWorkbookName = "";
let numberedImportParsed = null;
let numberedImportAssignmentsBySeatId = new Map();
let numberedImportPurchases = [];
let numberedImportPurchaseByRefNo = new Map();
let numberedImportBlockedSeatIds = new Set();
let numberedImportValidationErrors = [];
let numberedImportValidationWarnings = [];
let numberedImportReady = false;
let numberedImportAllowAllLayoutSeatsOverride = false;
let numberedImportUseAllSections = true;
let numberedImportSelectedSectionKeys = new Set();
let numberedImportPlacementMode = "all";
let numberedImportAutoOrderMode = "row1";
let numberedImportSelectedRefNo = "";
let numberedImportDraggingRefNo = "";
let numberedImportHoverPreviewRefNo = "";
let numberedImportHoverPreviewSeatId = "";
let numberedImportHoverPreviewSeatIds = new Set();
let numberedImportContextRefNo = "";
let numberedImportContextRowId = "";
let lastVisibleSeatCount = 0;
let panState = {
  active: false,
  moved: false,
  startClientX: 0,
  startClientY: 0,
  originTranslateX: 0,
  originTranslateY: 0
};

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function uniqueStrings(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.map((entry) => String(entry || "").trim()).filter(Boolean)
    )
  );
}

function hashHue(text) {
  let hash = 0;
  const source = String(text || "");
  for (let index = 0; index < source.length; index++) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

function generatePaletteColor(key, saturation = 65, lightness = 58) {
  return `hsl(${hashHue(key)} ${saturation}% ${lightness}%)`;
}

function getSectionColor(sectionId) {
  const key = String(sectionId || "").trim() || "default";
  return generatePaletteColor(key, 64, 56);
}

function hexToRgb(hex) {
  const value = String(hex || "").trim().replace(/^#/, "");
  if (value.length === 3) {
    const expanded = value.split("").map((part) => part + part).join("");
    return hexToRgb(`#${expanded}`);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  const toHex = (value) => clampValue(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHexColors(first, second, amount) {
  const start = hexToRgb(first);
  const end = hexToRgb(second);
  const t = clampValue(Number(amount) || 0, 0, 1);
  return rgbToHex(
    start.r + (end.r - start.r) * t,
    start.g + (end.g - start.g) * t,
    start.b + (end.b - start.b) * t
  );
}

function setOverlayMode(mode, skipRender = false) {
  overlayMode = OVERLAY_MODES.includes(mode) ? mode : "none";
  overlayModeInputs.forEach((input) => {
    input.checked = input.value === overlayMode;
  });
  if (!skipRender) renderCanvas();
}

function cycleOverlayMode() {
  const currentIndex = OVERLAY_MODES.indexOf(overlayMode);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % OVERLAY_MODES.length : 0;
  setOverlayMode(OVERLAY_MODES[nextIndex]);
}

function setSeatLabelMode(mode, skipRender = false) {
  seatLabelMode = SEAT_LABEL_MODES.includes(mode) ? mode : "none";
  seatLabelModeInputs.forEach((input) => {
    input.checked = input.value === seatLabelMode;
  });
  if (!skipRender) renderCanvas();
}

function cycleSeatLabelMode() {
  const currentIndex = SEAT_LABEL_MODES.indexOf(seatLabelMode);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % SEAT_LABEL_MODES.length : 0;
  setSeatLabelMode(SEAT_LABEL_MODES[nextIndex]);
}

function toggleRightPanel(button) {
  const card = button?.closest(".card");
  if (!card) return;
  const collapsed = card.dataset.collapsed === "true";
  card.dataset.collapsed = collapsed ? "false" : "true";
  button.setAttribute("aria-expanded", collapsed ? "true" : "false");
}

window.toggleRightPanel = toggleRightPanel;

function updateLayoutMeta() {
  if (!layoutMetaEl) return;
  if (!seats.length) {
    layoutMetaEl.textContent = "Ladda en TLT-fil för att börja.";
    return;
  }
  const sectionCount = new Set(seats.map((seat) => seat.sectionId).filter(Boolean)).size;
  layoutMetaEl.textContent = `${getNumberedImportCurrentFileName()} • ${sectionCount} section(s) • ${seats.length} seat(s)`;
}

function updateCanvasStatus() {
  if (!canvasStatusEl) return;
  if (!seats.length) {
    canvasStatusEl.textContent = "Ingen layout laddad";
    return;
  }
  const percent = Math.round(scale * 100);
  canvasStatusEl.textContent = `${seats.length} seats • zoom ${percent}% • drag to pan • wheel to zoom`;
}

function resizeCanvas() {
  const width = Math.max(1, Math.floor(canvasContainer.clientWidth));
  const height = Math.max(1, Math.floor(canvasContainer.clientHeight));
  if (canvas.width === width && canvas.height === height) return;
  const previousWidth = canvas.width || width;
  const previousHeight = canvas.height || height;
  canvas.width = width;
  canvas.height = height;
  if (!seats.length) {
    renderCanvas();
    return;
  }
  const scaleX = width / previousWidth;
  const scaleY = height / previousHeight;
  translateX *= scaleX;
  translateY *= scaleY;
  renderCanvas();
}

function getSeatBounds() {
  if (!seats.length) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  seats.forEach((seat) => {
    minX = Math.min(minX, seat.vx);
    maxX = Math.max(maxX, seat.vx);
    minY = Math.min(minY, seat.vy);
    maxY = Math.max(maxY, seat.vy);
  });
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }
  return { minX, maxX, minY, maxY };
}

function zoomFit() {
  const bounds = getSeatBounds();
  if (!bounds) {
    scale = 1;
    translateX = 0;
    translateY = 0;
    renderCanvas();
    return;
  }
  const paddingWorld = 50;
  const widthWorld = Math.max(1, (bounds.maxX - bounds.minX) + paddingWorld * 2);
  const heightWorld = Math.max(1, (bounds.maxY - bounds.minY) + paddingWorld * 2);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const nextScale = Math.min(canvas.width / widthWorld, canvas.height / heightWorld);
  scale = clampValue(nextScale, 0.02, 12);
  translateX = canvas.width / 2 - centerX * scale;
  translateY = canvas.height / 2 - centerY * scale;
  renderCanvas();
}

function clientToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = clientX - rect.left;
  const canvasY = clientY - rect.top;
  return {
    x: (canvasX - translateX) / scale,
    y: (canvasY - translateY) / scale
  };
}

function parseSeatIdParts(seatId) {
  if (!seatId) return { major: null, minor: null, row: null, seat: null };
  const parts = String(seatId).split(".");
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const row = parseInt(parts[2], 10);
  const seat = parseInt(parts[3], 10);
  return {
    major: Number.isFinite(major) ? major : null,
    minor: Number.isFinite(minor) ? minor : null,
    row: Number.isFinite(row) ? row : null,
    seat: Number.isFinite(seat) ? seat : null
  };
}

function seatIdToSvgCode(seatId) {
  const parts = parseSeatIdParts(seatId);
  if (parts.major == null || parts.minor == null || parts.row == null || parts.seat == null) {
    return String(seatId || "");
  }
  const minorStr = String(parts.minor).padStart(2, "0");
  const rowStr = String(parts.row).padStart(3, "0");
  const seatStr = String(parts.seat).padStart(6, "0");
  return `${parts.major}${minorStr}${rowStr}${seatStr}`;
}

function normalizeNumericId(value) {
  if (value == null) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(Math.trunc(value));
  }
  let raw = String(value).trim();
  if (!raw) return "";
  raw = raw.replace(/\s+/g, "");
  if (/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(raw)) {
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) return String(Math.trunc(asNumber));
  }
  if (/^\d+\.0+$/.test(raw)) raw = raw.replace(/\.0+$/, "");
  if (/^\d+$/.test(raw)) return raw;
  return raw.replace(/[^\d]/g, "");
}

function sortSeatsInRow(rowSeats) {
  const parseKey = (seat) => {
    const parts = seat.seatId ? seat.seatId.split(".") : [];
    const last = parts[parts.length - 1];
    const lastNum = parseFloat(last);
    if (!Number.isNaN(lastNum)) return { kind: "seatIdNum", value: lastNum };
    const nameNum = parseFloat(seat.name);
    if (!Number.isNaN(nameNum)) return { kind: "nameNum", value: nameNum };
    return { kind: "pos", value: seat.vx + seat.vy * 1e-3 };
  };
  return [...rowSeats].sort((first, second) => {
    const firstKey = parseKey(first);
    const secondKey = parseKey(second);
    if (firstKey.kind === "seatIdNum" && secondKey.kind === "seatIdNum") return firstKey.value - secondKey.value;
    if (firstKey.kind === "seatIdNum") return -1;
    if (secondKey.kind === "seatIdNum") return 1;
    if (firstKey.kind === "nameNum" && secondKey.kind === "nameNum") return firstKey.value - secondKey.value;
    if (firstKey.kind === "nameNum") return -1;
    if (secondKey.kind === "nameNum") return 1;
    return firstKey.value - secondKey.value;
  });
}

function getSeatIdSuffix(seatId) {
  const parts = parseSeatIdParts(seatId);
  return Number.isFinite(parts.seat) ? parts.seat : null;
}

function splitSeatLabelLines(label) {
  const text = String(label || "").trim();
  if (!text) return [];
  if (text.length <= 4 || !text.includes(" ")) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text];
  const midpoint = text.length / 2;
  let best = null;
  for (let index = 1; index < words.length; index++) {
    const first = words.slice(0, index).join(" ");
    const second = words.slice(index).join(" ");
    if (!first || !second) continue;
    const diff = Math.abs(first.length - midpoint);
    if (!best || diff < best.diff) best = { diff, lines: [first, second] };
  }
  return best?.lines || [text];
}

function buildTooltipText(seat) {
  if (!seat) return "";
  const lines = [
    `SeatId: ${seat.seatId || "-"}`,
    `Section: ${seat.sectionName || seat.sectionId || "-"}`,
    `Row: ${seat.rowName || seat.rowId || "-"}`,
    `Seat: ${seat.name || "-"}`,
    `Entry: ${String(seat.entryVia || "-").trim() || "-"}`
  ];
  const goodness = Number(seat.goodness);
  if (Number.isFinite(goodness) && goodness > 0) {
    lines.push(`Goodness: ${goodness}`);
  }
  const assignedRefNo = String(numberedImportAssignmentsBySeatId.get(seat.seatId) || "").trim();
  if (assignedRefNo) lines.push(`Assigned RefNo: ${assignedRefNo}`);
  if (numberedImportBlockedSeatIds.has(seat.seatId)) lines.push("Blocked by workbook");
  return lines.join("\n");
}

function updateTooltipPosition(clientX, clientY) {
  const padding = 16;
  const rect = tooltipEl.getBoundingClientRect();
  let left = clientX + 16;
  let top = clientY + 16;
  if (left + rect.width > window.innerWidth - padding) {
    left = clientX - rect.width - 16;
  }
  if (top + rect.height > window.innerHeight - padding) {
    top = clientY - rect.height - 16;
  }
  tooltipEl.style.left = `${Math.max(padding, left)}px`;
  tooltipEl.style.top = `${Math.max(padding, top)}px`;
}

function updateTooltip() {
  if (!hoverSeat || lastVisibleSeatCount > HOVER_VISIBLE_LIMIT) {
    tooltipEl.style.display = "none";
    return;
  }
  tooltipEl.textContent = buildTooltipText(hoverSeat);
  tooltipEl.style.display = "block";
  updateTooltipPosition(hoverClientX, hoverClientY);
}

function clearHoverSeat() {
  hoverSeat = null;
  tooltipEl.style.display = "none";
}

function computeGoodnessStats() {
  let min = Infinity;
  let max = -Infinity;
  seats.forEach((seat) => {
    const value = Number(seat.goodness);
    if (!Number.isFinite(value) || value <= 0) return;
    min = Math.min(min, value);
    max = Math.max(max, value);
  });
  if (min === Infinity) return null;
  return { min, max };
}

function getGoodnessHeatColor(value, stats) {
  if (!stats || !Number.isFinite(value) || value <= 0) return null;
  if (stats.min === stats.max) return GOODNESS_HEAT_START;
  const amount = (value - stats.min) / (stats.max - stats.min);
  return mixHexColors(GOODNESS_HEAT_START, GOODNESS_HEAT_END, amount);
}

function buildPriceRegionLookups() {
  return priceRegions.map((region, index) => ({
    id: region.id || `region-${index + 1}`,
    name: String(region.name || `Region ${index + 1}`),
    color: String(region.color || generatePaletteColor(`pr-${index}`)),
    sections: new Set(uniqueStrings(region.sections)),
    rows: new Set(uniqueStrings(region.rows)),
    seats: new Set(uniqueStrings(region.seats))
  }));
}

function getSeatPriceRegionColor(seat, lookups) {
  for (const region of lookups) {
    if (region.sections.has(seat.sectionId)) return region.color;
    if (region.rows.has(seat.rowId)) return region.color;
    if (region.seats.has(seat.seatId)) return region.color;
  }
  return null;
}

function getAllSeatBlockSeatIds() {
  const ids = new Set();
  seatBlocks.forEach((block) => {
    uniqueStrings(block.seats).forEach((seatId) => ids.add(seatId));
  });
  return ids;
}

function renderCanvas() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!seats.length) {
    ctx.fillStyle = "#64748b";
    ctx.font = '18px "SUSE", system-ui, sans-serif';
    ctx.fillText("No layout loaded. Use Load TLT to begin.", 24, 36);
    lastVisibleSeatCount = 0;
    updateCanvasStatus();
    updateTooltip();
    return;
  }

  const worldMinX = (-translateX) / scale;
  const worldMaxX = (canvas.width - translateX) / scale;
  const worldMinY = (-translateY) / scale;
  const worldMaxY = (canvas.height - translateY) / scale;

  let visibleCount = 0;
  seats.forEach((seat) => {
    if (
      seat.vx < worldMinX || seat.vx > worldMaxX ||
      seat.vy < worldMinY || seat.vy > worldMaxY
    ) {
      return;
    }
    visibleCount += 1;
  });
  lastVisibleSeatCount = visibleCount;

  const useRectDots = visibleCount > RECT_DOT_THRESHOLD;
  const rectScreenSize = 2;
  const rectSizeWorld = rectScreenSize / scale;
  const priceRegionLookups = overlayMode === "price" ? buildPriceRegionLookups() : null;
  const goodnessStats = overlayMode === "goodness" ? computeGoodnessStats() : null;
  const blockedSeatIds = getAllSeatBlockSeatIds();

  ctx.save();
  ctx.translate(translateX, translateY);
  ctx.scale(scale, scale);

  seats.forEach((seat) => {
    if (
      seat.vx < worldMinX || seat.vx > worldMaxX ||
      seat.vy < worldMinY || seat.vy > worldMaxY
    ) {
      return;
    }

    let baseColor = getSectionColor(seat.sectionId);
    if (overlayMode === "goodness" && goodnessStats) {
      const heatColor = getGoodnessHeatColor(Number(seat.goodness), goodnessStats);
      if (heatColor) baseColor = heatColor;
    } else if (overlayMode === "price" && priceRegionLookups) {
      const priceColor = getSeatPriceRegionColor(seat, priceRegionLookups);
      if (priceColor) baseColor = priceColor;
    }

    const isWorkbookBlocked = numberedImportBlockedSeatIds.has(seat.seatId);
    const isSeatBlocked = blockedSeatIds.has(seat.seatId);
    const assignedRefNo = String(numberedImportAssignmentsBySeatId.get(seat.seatId) || "").trim();
    const isAssignedSeat = !!assignedRefNo;
    const isActiveAssignedSeat = isAssignedSeat && assignedRefNo === numberedImportSelectedRefNo;
    const isPreviewSeat = numberedImportHoverPreviewSeatIds.has(seat.seatId);
    const isPreviewTargetSeat = seat.seatId === numberedImportHoverPreviewSeatId;
    const isInvalidPreviewTarget = numberedImportHoverPreviewRefNo && isPreviewTargetSeat && !isPreviewSeat;

    if (isWorkbookBlocked) {
      baseColor = "#94a3b8";
    } else if (isAssignedSeat) {
      baseColor = getNumberedImportPurchaseColor(assignedRefNo);
    }

    if (useRectDots) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(
        seat.vx - rectSizeWorld / 2,
        seat.vy - rectSizeWorld / 2,
        rectSizeWorld,
        rectSizeWorld
      );

      if (isActiveAssignedSeat) {
        ctx.lineWidth = 1.6 / scale;
        ctx.strokeStyle = "rgba(15, 23, 42, 0.96)";
        ctx.strokeRect(
          seat.vx - rectSizeWorld * 1.4,
          seat.vy - rectSizeWorld * 1.4,
          rectSizeWorld * 2.8,
          rectSizeWorld * 2.8
        );
      }
      if (isPreviewSeat) {
        ctx.lineWidth = 2.4 / scale;
        ctx.strokeStyle = "rgba(56, 189, 248, 0.98)";
        ctx.strokeRect(
          seat.vx - rectSizeWorld * 2.4,
          seat.vy - rectSizeWorld * 2.4,
          rectSizeWorld * 4.8,
          rectSizeWorld * 4.8
        );
      } else if (isInvalidPreviewTarget) {
        ctx.lineWidth = 2.4 / scale;
        ctx.strokeStyle = "rgba(239, 68, 68, 0.98)";
        ctx.strokeRect(
          seat.vx - rectSizeWorld * 2.1,
          seat.vy - rectSizeWorld * 2.1,
          rectSizeWorld * 4.2,
          rectSizeWorld * 4.2
        );
      }
      if (isWorkbookBlocked || isSeatBlocked) {
        ctx.lineWidth = isSeatBlocked ? 2 / scale : 1.6 / scale;
        ctx.strokeStyle = isSeatBlocked ? "rgba(220, 38, 38, 0.98)" : "rgba(15, 23, 42, 0.9)";
        ctx.beginPath();
        ctx.moveTo(seat.vx - rectSizeWorld, seat.vy - rectSizeWorld);
        ctx.lineTo(seat.vx + rectSizeWorld, seat.vy + rectSizeWorld);
        ctx.moveTo(seat.vx + rectSizeWorld, seat.vy - rectSizeWorld);
        ctx.lineTo(seat.vx - rectSizeWorld, seat.vy + rectSizeWorld);
        ctx.stroke();
      }
      return;
    }

    let screenRadius = BASE_WORLD_RADIUS * scale;
    if (screenRadius < MIN_SEAT_SCREEN_RADIUS) screenRadius = MIN_SEAT_SCREEN_RADIUS;
    const worldRadius = screenRadius / scale;

    ctx.beginPath();
    ctx.arc(seat.vx, seat.vy, worldRadius, 0, Math.PI * 2);
    ctx.fillStyle = baseColor;
    ctx.fill();

    ctx.lineWidth = 1.1 / scale;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.24)";
    ctx.stroke();

    if (isActiveAssignedSeat) {
      ctx.lineWidth = 3 / scale;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.stroke();
      ctx.lineWidth = 1.5 / scale;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.96)";
      ctx.stroke();
    }
    if (isPreviewSeat) {
      ctx.lineWidth = 3.2 / scale;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.98)";
      ctx.stroke();
    } else if (isInvalidPreviewTarget) {
      ctx.lineWidth = 3.2 / scale;
      ctx.strokeStyle = "rgba(239, 68, 68, 0.98)";
      ctx.stroke();
    }

    if (isWorkbookBlocked || isSeatBlocked) {
      ctx.lineWidth = isSeatBlocked ? 2.2 / scale : 1.8 / scale;
      ctx.strokeStyle = isSeatBlocked ? "rgba(220, 38, 38, 0.98)" : "rgba(15, 23, 42, 0.9)";
      ctx.beginPath();
      ctx.moveTo(seat.vx - worldRadius * 0.82, seat.vy - worldRadius * 0.82);
      ctx.lineTo(seat.vx + worldRadius * 0.82, seat.vy + worldRadius * 0.82);
      ctx.moveTo(seat.vx + worldRadius * 0.82, seat.vy - worldRadius * 0.82);
      ctx.lineTo(seat.vx - worldRadius * 0.82, seat.vy + worldRadius * 0.82);
      ctx.stroke();
    }

    if (seatLabelMode !== "none" && visibleCount <= 1800) {
      const label = seatLabelMode === "seat"
        ? seat.name || ""
        : seat.rowName || seat.rowId || "";
      if (label) {
        const labelLines = splitSeatLabelLines(label);
        const fontPx = Math.max(18, Math.min(40, 32 / Math.max(scale, 0.001)));
        const lineHeight = fontPx * 0.95;
        const startY = seat.vy - ((labelLines.length - 1) * lineHeight) / 2;
        ctx.save();
        ctx.font = `${fontPx}px "SUSE Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 2 / Math.max(scale, 0.001);
        ctx.strokeStyle = "rgba(15, 23, 42, 0.78)";
        ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
        labelLines.forEach((line, index) => {
          const y = startY + index * lineHeight;
          ctx.strokeText(line, seat.vx, y);
          ctx.fillText(line, seat.vx, y);
        });
        ctx.restore();
      }
    }
  });

  if (showSectionNames) {
    const boundsBySection = new Map();
    seats.forEach((seat) => {
      if (!seat.sectionId) return;
      if (!boundsBySection.has(seat.sectionId)) {
        boundsBySection.set(seat.sectionId, {
          minX: seat.vx,
          maxX: seat.vx,
          minY: seat.vy,
          maxY: seat.vy
        });
        return;
      }
      const bounds = boundsBySection.get(seat.sectionId);
      bounds.minX = Math.min(bounds.minX, seat.vx);
      bounds.maxX = Math.max(bounds.maxX, seat.vx);
      bounds.minY = Math.min(bounds.minY, seat.vy);
      bounds.maxY = Math.max(bounds.maxY, seat.vy);
    });
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
    for (const [sectionId, bounds] of boundsBySection.entries()) {
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const label = sectionNames.get(sectionId) || sectionId;
      const fontSize = 20 / Math.max(scale, 0.001);
      ctx.font = `${fontSize}px "SUSE", system-ui, sans-serif`;
      ctx.lineWidth = 3 / Math.max(scale, 0.001);
      ctx.strokeText(label, centerX, centerY);
      ctx.fillText(label, centerX, centerY);
    }
    ctx.restore();
  }

  ctx.restore();
  updateCanvasStatus();
  updateTooltip();
}

function hitTestSeat(worldX, worldY) {
  if (!seats.length) return null;
  const maxDist = BASE_WORLD_RADIUS * 1.5;
  let best = null;
  let bestDist2 = Infinity;
  seats.forEach((seat) => {
    const dx = worldX - seat.vx;
    const dy = worldY - seat.vy;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < maxDist * maxDist && dist2 < bestDist2) {
      best = seat;
      bestDist2 = dist2;
    }
  });
  return best;
}

function getLayoutStorageMeta() {
  return {
    venueId: currentVenueId || "unknown",
    layoutName: currentFileName || "unsaved"
  };
}

function getPriceRegionStorageKey() {
  const meta = getLayoutStorageMeta();
  return `arenaDesignerPriceRegions:${meta.venueId}:${meta.layoutName}`;
}

function getSeatBlockStorageKey() {
  const meta = getLayoutStorageMeta();
  return `arenaDesignerSeatBlocks:${meta.venueId}:${meta.layoutName}`;
}

function loadPriceRegionsFromStorage() {
  priceRegions = [];
  if (!currentFileName) return;
  try {
    const raw = localStorage.getItem(getPriceRegionStorageKey());
    const data = raw ? JSON.parse(raw) : null;
    const regions = Array.isArray(data?.regions) ? data.regions : [];
    priceRegions = regions
      .map((region, index) => {
        if (!region || typeof region !== "object") return null;
        return {
          id: String(region.id || `region-${index + 1}`),
          name: String(region.name || `Region ${index + 1}`),
          color: String(region.fillColor || region.color || region.strokeColor || generatePaletteColor(`pr-${index}`, 56, 64)),
          sections: uniqueStrings(region.sections),
          rows: uniqueStrings(region.rows),
          seats: uniqueStrings(region.seats)
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.warn("Could not load price regions:", error);
    priceRegions = [];
  }
}

function loadSeatBlocksFromStorage() {
  seatBlocks = [];
  if (!currentFileName) return;
  try {
    const raw = localStorage.getItem(getSeatBlockStorageKey());
    const data = raw ? JSON.parse(raw) : null;
    const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
    const existingSeatIds = new Set(seats.map((seat) => seat.seatId));
    seatBlocks = blocks
      .map((block, index) => {
        if (!block || typeof block !== "object") return null;
        const blockSeatIds = uniqueStrings(block.seats).filter((seatId) => existingSeatIds.has(seatId));
        if (!blockSeatIds.length) return null;
        return {
          id: String(block.id || `block-${index + 1}`),
          seats: blockSeatIds
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.warn("Could not load seat blocks:", error);
    seatBlocks = [];
  }
}

function parseTlt(text) {
  seats = [];
  sectionNames = new Map();
  rowNames = new Map();
  currentVenueId = "";
  numberedImportDraggingRefNo = "";
  clearHoverSeat();
  clearNumberedImportHoverPreview();
  closeNumberedImportPurchaseMenu();

  const lines = String(text || "").split(/\r?\n/);
  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    if (line.includes("|LayoutInit|")) {
      const venueMatch = line.match(/VenueId=([^|]+)/i);
      if (venueMatch) currentVenueId = venueMatch[1];
      return;
    }
    if (line.includes("<Outline|")) return;

    const pipeIndex = line.indexOf("|");
    if (pipeIndex < 0) return;
    const timestamp = line.slice(0, pipeIndex);
    const rest = line.slice(pipeIndex + 1);
    const parts = rest.split("|");
    const command = parts[0];
    const kv = {};
    const attributes = [];
    for (let index = 1; index < parts.length; index++) {
      const segment = parts[index];
      const equalIndex = segment.indexOf("=");
      if (equalIndex < 0) continue;
      const key = segment.slice(0, equalIndex);
      const value = segment.slice(equalIndex + 1);
      if (key === "Attribute") {
        attributes.push(value);
      } else {
        kv[key] = value;
      }
    }

    if (command === "SectionAdd") {
      const sectionId = String(kv.SectionId || "").trim();
      if (sectionId) sectionNames.set(sectionId, String(kv.Name || "").trim());
      return;
    }
    if (command === "RowAdd") {
      const rowId = String(kv.RowId || "").trim();
      if (rowId) rowNames.set(rowId, String(kv.Name || "").trim());
      return;
    }
    if (command !== "SeatAdd") return;

    const seatId = String(kv.SeatId || "").trim();
    const centerX = parseFloat(kv.CenterX);
    const centerY = parseFloat(kv.CenterY);
    if (!seatId || !Number.isFinite(centerX) || !Number.isFinite(centerY)) return;

    const seatIdParts = seatId.split(".");
    const sectionId = seatIdParts.length >= 2 ? `${seatIdParts[0]}.${seatIdParts[1]}` : "";
    const rowId = seatIdParts.length >= 3 ? `${seatIdParts[0]}.${seatIdParts[1]}.${seatIdParts[2]}` : "";

    seats.push({
      seatId,
      name: String(kv.Name || "").trim(),
      sectionId,
      rowId,
      sectionName: "",
      rowName: "",
      centerX,
      centerY,
      vx: centerX,
      vy: centerY,
      rotation: parseFloat(kv.Rotation || "0") || 0,
      width: parseFloat(kv.Width || "100") || 100,
      entryVia: kv.EntryVia ?? "-",
      goodness: parseFloat(kv.Goodness || "0") || 0,
      attributes,
      timestamp
    });
  });

  seats.forEach((seat) => {
    seat.sectionName = seat.sectionId ? (sectionNames.get(seat.sectionId) || "") : "";
    seat.rowName = seat.rowId ? (rowNames.get(seat.rowId) || "") : "";
  });

  layoutBounds = getSeatBounds();
  loadPriceRegionsFromStorage();
  loadSeatBlocksFromStorage();
  handleNumberedImportLayoutChanged();
  updateLayoutMeta();
  zoomFit();
}

function normalizeNumberedImportHeader(value) {
  const text = String(value == null ? "" : value).trim().toLowerCase();
  const normalized = typeof text.normalize === "function"
    ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : text;
  return normalized.replace(/\s+/g, " ");
}

function findNumberedImportHeaderRow(rows, requiredColumns) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
    const columns = {};
    row.forEach((cell, cellIndex) => {
      const key = normalizeNumberedImportHeader(cell);
      if (!key || columns[key] != null) return;
      columns[key] = cellIndex;
    });
    const hasAll = requiredColumns.every((name) => columns[name] != null);
    if (hasAll) return { rowIndex, columns };
  }
  return null;
}

function getNumberedImportHeaderColumns(row) {
  const columns = {};
  const source = Array.isArray(row) ? row : [];
  source.forEach((cell, cellIndex) => {
    const key = normalizeNumberedImportHeader(cell);
    if (!key) return;
    if (!Array.isArray(columns[key])) columns[key] = [];
    columns[key].push(cellIndex);
  });
  return columns;
}

function pickLastNumberedImportHeaderColumn(columnsByName, ...names) {
  for (const name of names) {
    const candidates = Array.isArray(columnsByName?.[name]) ? columnsByName[name] : [];
    if (candidates.length) return candidates[candidates.length - 1];
  }
  return null;
}

function parsePositiveInteger(value) {
  if (value == null) return null;
  const parsed = parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeNumberedImportStatus(value) {
  const text = String(value == null ? "" : value).trim().toLowerCase();
  const normalized = typeof text.normalize === "function"
    ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : text;
  return normalized.replace(/\s+/g, " ");
}

function parseNumberedImportDateValue(value) {
  if (value == null || value === "") return Number.POSITIVE_INFINITY;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (typeof XLSX !== "undefined" && XLSX?.SSF?.parse_date_code) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed && Number.isFinite(parsed.y) && Number.isFinite(parsed.m) && Number.isFinite(parsed.d)) {
        const hours = Number.isFinite(parsed.H) ? parsed.H : 0;
        const minutes = Number.isFinite(parsed.M) ? parsed.M : 0;
        const seconds = Number.isFinite(parsed.S) ? parsed.S : 0;
        const millis = Number.isFinite(parsed.u) ? Math.round(parsed.u * 1000) : 0;
        return new Date(parsed.y, parsed.m - 1, parsed.d, hours, minutes, seconds, millis).getTime();
      }
    }
    return value;
  }
  const text = String(value).trim();
  if (!text) return Number.POSITIVE_INFINITY;
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2})(?::(\d{2})(?::(\d{2}))?)?)?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hours = parseInt(isoMatch[4] || "0", 10);
    const minutes = parseInt(isoMatch[5] || "0", 10);
    const seconds = parseInt(isoMatch[6] || "0", 10);
    return new Date(year, month, day, hours, minutes, seconds, 0).getTime();
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function parseNumberedImportOrderNumber(value) {
  const text = String(value || "").trim();
  if (!text) return Number.POSITIVE_INFINITY;
  const match = text.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return Number.POSITIVE_INFINITY;
  const parsed = parseFloat(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function compareNumberedImportRowNames(firstRowName, secondRowName) {
  const firstText = String(firstRowName || "").trim();
  const secondText = String(secondRowName || "").trim();
  const firstNumeric = parseNumberedImportOrderNumber(firstText);
  const secondNumeric = parseNumberedImportOrderNumber(secondText);
  const firstHasNumeric = Number.isFinite(firstNumeric);
  const secondHasNumeric = Number.isFinite(secondNumeric);
  if (firstHasNumeric && secondHasNumeric && firstNumeric !== secondNumeric) {
    return firstNumeric - secondNumeric;
  }
  if (firstHasNumeric !== secondHasNumeric) return firstHasNumeric ? -1 : 1;
  return firstText.localeCompare(secondText, "sv", { numeric: true, sensitivity: "base" });
}

function buildNumberedImportTemplateRowsFromLayout() {
  const rowsByNumeric = new Map();
  seats.forEach((seat) => {
    const numericId = normalizeNumericId(seatIdToSvgCode(seat?.seatId));
    if (!numericId || rowsByNumeric.has(numericId)) return;
    rowsByNumeric.set(numericId, {
      identifier: numericId,
      key: numericId.toLowerCase()
    });
  });
  return Array.from(rowsByNumeric.values())
    .sort((first, second) => String(first.identifier || "").localeCompare(String(second.identifier || ""), "sv", { numeric: true, sensitivity: "base" }))
    .map((row, index) => ({
      rowIndex: index + 1,
      identifier: row.identifier,
      key: row.key
    }));
}

function parseNumberedImportSimpleTicketListWorkbook(workbook) {
  if (!workbook || !Array.isArray(workbook.SheetNames) || !workbook.SheetNames.length) return null;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    const header = findNumberedImportHeaderRow(rows, ["status", "biljettyp", "refno"]);
    if (!header) continue;
    const headerRow = Array.isArray(rows[header.rowIndex]) ? rows[header.rowIndex] : [];
    const columnsByName = getNumberedImportHeaderColumns(headerRow);
    const pickLastColumn = (...names) => pickLastNumberedImportHeaderColumn(columnsByName, ...names);
    const statusCol = pickLastColumn("status");
    const refNoCol = pickLastColumn("refno");
    const ticketTypeCol = pickLastColumn("biljettyp");
    const ticketCodeCol = pickLastColumn("biljettkod", "ticket code", "ticketcode");
    const purchasedCol = pickLastColumn("kopt", "purchased", "purchase date");
    const firstNameCol = pickLastColumn("firstname", "first name", "fornamn");
    const lastNameCol = pickLastColumn("lastname", "last name", "surname", "efternamn");
    const emailCol = pickLastColumn("email", "e-mail", "mail", "e-post", "epost");
    if (statusCol == null || refNoCol == null || ticketTypeCol == null || purchasedCol == null) continue;

    const existingRows = [];
    let skippedByStatus = 0;
    let skippedMissingRefNo = 0;
    for (let rowIndex = header.rowIndex + 1; rowIndex < rows.length; rowIndex++) {
      const row = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
      const status = normalizeNumberedImportStatus(row[statusCol]);
      if (status !== "ej anvand") {
        skippedByStatus += 1;
        continue;
      }
      const refNo = String(row[refNoCol] || "").trim();
      if (!refNo) {
        skippedMissingRefNo += 1;
        continue;
      }
      existingRows.push({
        rowIndex,
        refNo,
        numericId: "",
        identifier: "",
        sectionName: "",
        rowName: "",
        seatName: "",
        noOfTickets: null,
        ticketType: String(row[ticketTypeCol] || "").trim(),
        ticketCode: ticketCodeCol != null ? String(row[ticketCodeCol] || "").trim() : "",
        firstName: firstNameCol != null ? String(row[firstNameCol] || "").trim() : "",
        lastName: lastNameCol != null ? String(row[lastNameCol] || "").trim() : "",
        email: emailCol != null ? String(row[emailCol] || "").trim() : "",
        purchasedAt: purchasedCol != null ? row[purchasedCol] : "",
        purchasedAtMs: parseNumberedImportDateValue(purchasedCol != null ? row[purchasedCol] : "")
      });
    }

    const warnings = [];
    if (skippedByStatus > 0) warnings.push(`${sheetName}: skipped ${skippedByStatus} row(s) where Status is not "Ej anvand".`);
    if (skippedMissingRefNo > 0) warnings.push(`${sheetName}: skipped ${skippedMissingRefNo} row(s) with missing RefNo.`);
    if (!existingRows.length) warnings.push(`${sheetName}: no purchasable rows were found after filtering Status = "Ej anvand".`);

    return {
      issues: [],
      warnings,
      seatsByNumeric: new Map(),
      seatsByIdentifier: new Map(),
      existingRows,
      template: {
        sheetName: "Import Template",
        headerRowIndex: 0,
        seatColIndex: 0,
        purchaseGroupColIndex: 1,
        refNoColIndex: 2,
        rows: buildNumberedImportTemplateRowsFromLayout()
      },
      reportType: "ticket-list",
      allowsAllLayoutSeats: true,
      purchaseSortMode: "purchase-date-asc",
      purchaseListMode: "ticket-type-summary",
      sourceSheetName: sheetName
    };
  }
  return null;
}

function parseNumberedImportWorkbook(workbook) {
  const issues = [];
  const warnings = [];
  if (!workbook || !Array.isArray(workbook.SheetNames) || !workbook.SheetNames.length) {
    return { issues: ["No sheets found in workbook."], warnings, seatsByNumeric: new Map(), seatsByIdentifier: new Map(), existingRows: [], template: null };
  }

  const findSheetName = (name) => {
    const normalizedName = normalizeNumberedImportHeader(name);
    return workbook.SheetNames.find((sheetName) => normalizeNumberedImportHeader(sheetName) === normalizedName) || "";
  };

  const seatsSheetName = findSheetName("Seats");
  const purchasesSheetName = findSheetName("Existing Purchases");
  const templateSheetName = findSheetName("Import Template");
  if (!seatsSheetName || !purchasesSheetName || !templateSheetName) {
    const fallback = parseNumberedImportSimpleTicketListWorkbook(workbook);
    if (fallback) return fallback;
  }

  if (!seatsSheetName) issues.push('Missing sheet "Seats".');
  if (!purchasesSheetName) issues.push('Missing sheet "Existing Purchases".');
  if (!templateSheetName) issues.push('Missing sheet "Import Template".');
  if (issues.length) {
    return { issues, warnings, seatsByNumeric: new Map(), seatsByIdentifier: new Map(), existingRows: [], template: null };
  }

  const seatsRows = XLSX.utils.sheet_to_json(workbook.Sheets[seatsSheetName], { header: 1, raw: true, defval: "" });
  const purchasesRows = XLSX.utils.sheet_to_json(workbook.Sheets[purchasesSheetName], { header: 1, raw: true, defval: "" });
  const templateRows = XLSX.utils.sheet_to_json(workbook.Sheets[templateSheetName], { header: 1, raw: true, defval: "" });

  const seatsHeader = findNumberedImportHeaderRow(seatsRows, ["identifier", "numericid"]);
  const purchasesHeader =
    findNumberedImportHeaderRow(purchasesRows, ["refno", "identifier", "numericid"]) ||
    findNumberedImportHeaderRow(purchasesRows, ["refno", "nooftickets"]);
  const templateHeader = findNumberedImportHeaderRow(templateRows, ["seat", "purchase group", "refno"]);

  if (!seatsHeader) issues.push('Could not find header row in "Seats" (requires Identifier + NumericId).');
  if (!purchasesHeader) issues.push('Could not find header row in "Existing Purchases" (requires RefNo + Identifier + NumericId).');
  if (!templateHeader) issues.push('Could not find header row in "Import Template" (requires Seat + Purchase Group + RefNo).');
  if (issues.length) {
    return { issues, warnings, seatsByNumeric: new Map(), seatsByIdentifier: new Map(), existingRows: [], template: null };
  }

  const seatsByNumeric = new Map();
  const seatsByIdentifier = new Map();
  const seatDuplicates = new Set();
  const identifierDuplicates = new Set();

  for (let rowIndex = seatsHeader.rowIndex + 1; rowIndex < seatsRows.length; rowIndex++) {
    const row = Array.isArray(seatsRows[rowIndex]) ? seatsRows[rowIndex] : [];
    const identifier = String(row[seatsHeader.columns.identifier] || "").trim();
    const numericId = normalizeNumericId(row[seatsHeader.columns.numericid]);
    if (!identifier && !numericId) continue;
    if (!identifier || !numericId) {
      issues.push(`Seats row ${rowIndex + 1}: both Identifier and NumericId are required.`);
      continue;
    }
    const identifierKey = identifier.toLowerCase();
    if (seatsByNumeric.has(numericId)) seatDuplicates.add(numericId);
    if (seatsByIdentifier.has(identifierKey)) identifierDuplicates.add(identifier);
    seatsByNumeric.set(numericId, { identifier, numericId });
    seatsByIdentifier.set(identifierKey, { identifier, numericId });
  }

  if (seatDuplicates.size) {
    issues.push(`Seats contains duplicate NumericId values (${Array.from(seatDuplicates).slice(0, 6).join(", ")}${seatDuplicates.size > 6 ? ", ..." : ""}).`);
  }
  if (identifierDuplicates.size) {
    issues.push(`Seats contains duplicate Identifier values (${Array.from(identifierDuplicates).slice(0, 6).join(", ")}${identifierDuplicates.size > 6 ? ", ..." : ""}).`);
  }

  const purchasesHeaderRow = Array.isArray(purchasesRows[purchasesHeader.rowIndex]) ? purchasesRows[purchasesHeader.rowIndex] : [];
  const purchasesHeaderColumns = getNumberedImportHeaderColumns(purchasesHeaderRow);
  const refNoCandidates = Array.isArray(purchasesHeaderColumns.refno) ? purchasesHeaderColumns.refno : [];
  const numericCandidates = Array.isArray(purchasesHeaderColumns.numericid) ? purchasesHeaderColumns.numericid : [];
  const identifierCandidates = Array.isArray(purchasesHeaderColumns.identifier) ? purchasesHeaderColumns.identifier : [];
  const sectionNameCandidates = Array.isArray(purchasesHeaderColumns.sectionname) ? purchasesHeaderColumns.sectionname : [];
  const rowNameCandidates = Array.isArray(purchasesHeaderColumns.rowname) ? purchasesHeaderColumns.rowname : [];
  const seatNameCandidates = Array.isArray(purchasesHeaderColumns.seatname) ? purchasesHeaderColumns.seatname : [];
  const noOfTicketsCandidates = Array.isArray(purchasesHeaderColumns.nooftickets) ? purchasesHeaderColumns.nooftickets : [];
  const firstNameCol = pickLastNumberedImportHeaderColumn(purchasesHeaderColumns, "firstname", "first name", "fornamn");
  const lastNameCol = pickLastNumberedImportHeaderColumn(purchasesHeaderColumns, "lastname", "last name", "surname", "efternamn");
  const emailCol = pickLastNumberedImportHeaderColumn(purchasesHeaderColumns, "email", "e-mail", "mail", "e-post", "epost");

  const numericCol = numericCandidates.length ? numericCandidates[numericCandidates.length - 1] : purchasesHeader.columns.numericid;
  const identifierCol = identifierCandidates.length ? identifierCandidates[identifierCandidates.length - 1] : purchasesHeader.columns.identifier;
  const sectionNameCol = sectionNameCandidates.length ? sectionNameCandidates[sectionNameCandidates.length - 1] : null;
  const rowNameCol = rowNameCandidates.length ? rowNameCandidates[rowNameCandidates.length - 1] : null;
  const seatNameCol = seatNameCandidates.length ? seatNameCandidates[seatNameCandidates.length - 1] : null;

  let refNoCol = purchasesHeader.columns.refno;
  if (refNoCandidates.length > 1) {
    const anchorCol = seatNameCol != null ? seatNameCol : (numericCol != null ? numericCol : identifierCol);
    let selectedRefNoCol = null;
    if (anchorCol != null) {
      const afterAnchor = refNoCandidates.filter((colIndex) => colIndex > anchorCol).sort((first, second) => first - second);
      if (afterAnchor.length) selectedRefNoCol = afterAnchor[0];
    }
    if (selectedRefNoCol == null) selectedRefNoCol = refNoCandidates[refNoCandidates.length - 1];
    refNoCol = selectedRefNoCol;
    warnings.push("Existing Purchases: multiple RefNo columns found. Using the seat-level RefNo column.");
  } else if (refNoCandidates.length === 1) {
    refNoCol = refNoCandidates[0];
  }

  let noOfTicketsCol = null;
  if (noOfTicketsCandidates.length) {
    if (refNoCol != null) {
      const nearest = [...noOfTicketsCandidates].sort((first, second) => Math.abs(first - refNoCol) - Math.abs(second - refNoCol))[0];
      if (nearest != null && Math.abs(nearest - refNoCol) <= 3) noOfTicketsCol = nearest;
    }
    if (noOfTicketsCol == null && noOfTicketsCandidates.length === 1 && refNoCandidates.length <= 1) {
      noOfTicketsCol = noOfTicketsCandidates[0];
    }
  }

  const existingRows = [];
  for (let rowIndex = purchasesHeader.rowIndex + 1; rowIndex < purchasesRows.length; rowIndex++) {
    const row = Array.isArray(purchasesRows[rowIndex]) ? purchasesRows[rowIndex] : [];
    const refNo = refNoCol != null ? String(row[refNoCol] || "").trim() : "";
    if (!refNo) continue;
    const identifier = identifierCol != null ? String(row[identifierCol] || "").trim() : "";
    let numericId = numericCol != null ? normalizeNumericId(row[numericCol]) : "";
    if (!numericId && identifier) {
      const fromIdentifier = seatsByIdentifier.get(identifier.toLowerCase());
      if (fromIdentifier) numericId = fromIdentifier.numericId;
    }
    if (!numericId) {
      warnings.push(`Existing Purchases row ${rowIndex + 1}: missing NumericId. Row kept for ticket count only.`);
    } else if (!seatsByNumeric.has(numericId)) {
      warnings.push(`Existing Purchases row ${rowIndex + 1}: NumericId ${numericId} is missing in Seats sheet. Row kept for ticket count only.`);
    }
    existingRows.push({
      rowIndex,
      refNo,
      numericId,
      identifier,
      sectionName: sectionNameCol != null ? String(row[sectionNameCol] || "").trim() : "",
      rowName: rowNameCol != null ? String(row[rowNameCol] || "").trim() : "",
      seatName: seatNameCol != null ? String(row[seatNameCol] || "").trim() : "",
      noOfTickets: noOfTicketsCol != null ? parsePositiveInteger(row[noOfTicketsCol]) : null,
      firstName: firstNameCol != null ? String(row[firstNameCol] || "").trim() : "",
      lastName: lastNameCol != null ? String(row[lastNameCol] || "").trim() : "",
      email: emailCol != null ? String(row[emailCol] || "").trim() : ""
    });
  }

  if (!existingRows.length) warnings.push('No rows with RefNo found in "Existing Purchases".');

  const templateRowsByIdentifier = [];
  const templateIdentifierCol = templateHeader.columns.seat;
  for (let rowIndex = templateHeader.rowIndex + 1; rowIndex < templateRows.length; rowIndex++) {
    const row = Array.isArray(templateRows[rowIndex]) ? templateRows[rowIndex] : [];
    const identifier = String(row[templateIdentifierCol] || "").trim();
    if (!identifier) continue;
    templateRowsByIdentifier.push({
      rowIndex,
      identifier,
      key: identifier.toLowerCase()
    });
    if (!seatsByIdentifier.has(identifier.toLowerCase())) {
      issues.push(`Import Template row ${rowIndex + 1}: seat "${identifier}" is missing in Seats sheet.`);
    }
  }

  if (!templateRowsByIdentifier.length) issues.push('Import Template contains no seat rows.');

  return {
    issues,
    warnings,
    seatsByNumeric,
    seatsByIdentifier,
    existingRows,
    template: {
      sheetName: templateSheetName,
      headerRowIndex: templateHeader.rowIndex,
      seatColIndex: templateHeader.columns.seat,
      purchaseGroupColIndex: templateHeader.columns["purchase group"],
      refNoColIndex: templateHeader.columns.refno,
      rows: templateRowsByIdentifier
    }
  };
}

function buildNumberedImportLayoutSeatMap() {
  const numericToSeat = new Map();
  const duplicates = new Set();
  seats.forEach((seat) => {
    const numericId = normalizeNumericId(seatIdToSvgCode(seat.seatId));
    if (!numericId) return;
    if (numericToSeat.has(numericId)) duplicates.add(numericId);
    numericToSeat.set(numericId, seat);
  });
  return { numericToSeat, duplicates: Array.from(duplicates) };
}

function numberedImportAllowsAllLayoutSeats(parsed = numberedImportParsed) {
  return !!(parsed?.allowsAllLayoutSeats === true || numberedImportAllowAllLayoutSeatsOverride);
}

function setNumberedImportAllowAllLayoutSeatsOverride(enabled, options = {}) {
  const nextValue = !!enabled;
  const preserveAssignments = options.preserveAssignments !== false;
  if (numberedImportAllowAllLayoutSeatsOverride === nextValue) {
    updateNumberedImportStateUi();
    return;
  }
  numberedImportAllowAllLayoutSeatsOverride = nextValue;
  handleNumberedImportLayoutChanged({ preserveAssignments });
}

function setNumberedImportIssues(errors = [], warnings = []) {
  const lines = [];
  if (errors.length) {
    lines.push("Errors:");
    errors.slice(0, 12).forEach((message) => lines.push(`- ${message}`));
    if (errors.length > 12) lines.push(`- ... ${errors.length - 12} more`);
  }
  if (warnings.length) {
    if (lines.length) lines.push("");
    lines.push("Warnings:");
    warnings.slice(0, 8).forEach((message) => lines.push(`- ${message}`));
    if (warnings.length > 8) lines.push(`- ... ${warnings.length - 8} more`);
  }

  if (!lines.length) {
    numberedImportErrors.textContent = "";
    numberedImportIssuesSummary.textContent = "Warnings (0)";
    numberedImportIssues.open = false;
    return;
  }

  if (warnings.length > 0) {
    numberedImportIssuesSummary.textContent = errors.length > 0
      ? `Warnings (${warnings.length}) • Errors (${errors.length})`
      : `Warnings (${warnings.length})`;
  } else {
    numberedImportIssuesSummary.textContent = `Errors (${errors.length})`;
  }
  numberedImportErrors.textContent = lines.join("\n");
  numberedImportIssues.open = false;
}

function clearNumberedImportAssignments() {
  numberedImportAssignmentsBySeatId = new Map();
  numberedImportPurchases.forEach((purchase) => {
    purchase.assignedSeatIds = [];
  });
}

function clearNumberedImportPurchase(refNo) {
  const purchase = numberedImportPurchaseByRefNo.get(refNo);
  if (!purchase) return;
  (purchase.assignedSeatIds || []).forEach((seatId) => {
    numberedImportAssignmentsBySeatId.delete(seatId);
  });
  purchase.assignedSeatIds = [];
}

function getNumberedImportPurchasesInDisplayOrder() {
  return [...numberedImportPurchases].sort((first, second) => {
    const firstComplete = isNumberedImportPurchaseComplete(first) ? 1 : 0;
    const secondComplete = isNumberedImportPurchaseComplete(second) ? 1 : 0;
    if (firstComplete !== secondComplete) return firstComplete - secondComplete;
    const firstBaseOrder = Number(first?.listBaseOrder);
    const secondBaseOrder = Number(second?.listBaseOrder);
    const firstHasBase = Number.isFinite(firstBaseOrder);
    const secondHasBase = Number.isFinite(secondBaseOrder);
    if (firstHasBase && secondHasBase && firstBaseOrder !== secondBaseOrder) return firstBaseOrder - secondBaseOrder;
    if (firstHasBase !== secondHasBase) return firstHasBase ? -1 : 1;
    return String(first?.refNo || "").localeCompare(String(second?.refNo || ""), "sv", { numeric: true, sensitivity: "base" });
  });
}

function isNumberedImportPurchaseComplete(purchase) {
  if (!purchase) return false;
  const placedCount = Array.isArray(purchase.assignedSeatIds) ? purchase.assignedSeatIds.length : 0;
  return purchase.ticketCount > 0 && placedCount === purchase.ticketCount;
}

function getNextNumberedImportPurchaseRefNo(currentRefNo) {
  const orderedPurchases = getNumberedImportPurchasesInDisplayOrder();
  if (!orderedPurchases.length) return "";
  const currentIndex = orderedPurchases.findIndex((purchase) => purchase.refNo === currentRefNo);
  const startIndex = currentIndex >= 0 ? currentIndex : -1;
  for (let offset = 1; offset <= orderedPurchases.length; offset++) {
    const index = (startIndex + offset + orderedPurchases.length) % orderedPurchases.length;
    const candidate = orderedPurchases[index];
    if (!isNumberedImportPurchaseComplete(candidate)) return candidate.refNo;
  }
  if (currentIndex >= 0) return orderedPurchases[currentIndex].refNo;
  return orderedPurchases[0].refNo;
}

function isNumberedImportSeatAssignableByWorkbook(seat) {
  if (!seat || !seat.seatId || !numberedImportParsed) return false;
  if (numberedImportAllowsAllLayoutSeats()) return true;
  if (numberedImportBlockedSeatIds.has(seat.seatId)) return false;
  const numericId = normalizeNumericId(seatIdToSvgCode(seat.seatId));
  return !!(numericId && numberedImportParsed.seatsByNumeric.has(numericId));
}

function getNumberedImportSingleAssignedRowId(purchase) {
  if (!purchase || !Array.isArray(purchase.assignedSeatIds) || !purchase.assignedSeatIds.length) return "";
  const seatById = new Map(seats.map((seat) => [seat.seatId, seat]));
  const rowIds = new Set();
  purchase.assignedSeatIds.forEach((seatId) => {
    const rowId = String(seatById.get(seatId)?.rowId || "").trim();
    if (rowId) rowIds.add(rowId);
  });
  if (rowIds.size !== 1) return "";
  return Array.from(rowIds)[0];
}

function hasNumberedImportPlacedSeatsOnRow(rowId) {
  const currentRowId = String(rowId || "").trim();
  if (!currentRowId) return false;
  return seats.some((seat) => seat.rowId === currentRowId && numberedImportAssignmentsBySeatId.has(seat.seatId));
}

function buildNumberedImportRowPushPlan(rowId, direction = "left") {
  const currentRowId = String(rowId || "").trim();
  const normalizedDirection = direction === "right" ? "right" : "left";
  if (!currentRowId || !numberedImportReady || !numberedImportParsed) return null;
  const orderedRowSeats = sortSeatsInRow(seats.filter((seat) => seat.rowId === currentRowId));
  if (!orderedRowSeats.length) return null;

  const step = normalizedDirection === "right" ? 1 : -1;
  const assignedEntries = [];
  orderedRowSeats.forEach((seat, index) => {
    const refNo = String(numberedImportAssignmentsBySeatId.get(seat.seatId) || "").trim();
    if (!refNo) return;
    assignedEntries.push({ refNo, fromSeatId: seat.seatId, index });
  });
  if (!assignedEntries.length) return null;

  const rowAssignedSeatIds = assignedEntries.map((entry) => entry.fromSeatId);
  const rowAssignedSeatIdSet = new Set(rowAssignedSeatIds);
  const assignments = [];
  for (const entry of assignedEntries) {
    const targetIndex = entry.index + step;
    if (targetIndex < 0 || targetIndex >= orderedRowSeats.length) return null;
    const targetSeat = orderedRowSeats[targetIndex];
    if (!isNumberedImportSeatAssignableByWorkbook(targetSeat)) return null;
    const targetSeatId = String(targetSeat.seatId || "").trim();
    const targetRefNo = String(numberedImportAssignmentsBySeatId.get(targetSeatId) || "").trim();
    if (targetRefNo && !rowAssignedSeatIdSet.has(targetSeatId)) return null;
    assignments.push({
      refNo: entry.refNo,
      fromSeatId: entry.fromSeatId,
      toSeatId: targetSeatId
    });
  }

  return {
    rowId: currentRowId,
    direction: normalizedDirection,
    changed: true,
    assignments,
    rowAssignedSeatIds
  };
}

function applyNumberedImportRowPushPlan(plan) {
  if (!plan || !Array.isArray(plan.assignments) || !plan.assignments.length) return false;
  const rowAssignedSeatSet = new Set(
    Array.isArray(plan.rowAssignedSeatIds)
      ? plan.rowAssignedSeatIds.map((seatId) => String(seatId || "").trim()).filter(Boolean)
      : []
  );
  if (!rowAssignedSeatSet.size) return false;

  rowAssignedSeatSet.forEach((seatId) => {
    const refNo = String(numberedImportAssignmentsBySeatId.get(seatId) || "").trim();
    if (!refNo) return;
    numberedImportAssignmentsBySeatId.delete(seatId);
    const purchase = numberedImportPurchaseByRefNo.get(refNo);
    if (!purchase || !Array.isArray(purchase.assignedSeatIds)) return;
    purchase.assignedSeatIds = purchase.assignedSeatIds.filter((assignedSeatId) => assignedSeatId !== seatId);
  });

  plan.assignments.forEach((assignment) => {
    const refNo = String(assignment?.refNo || "").trim();
    const toSeatId = String(assignment?.toSeatId || "").trim();
    if (!refNo || !toSeatId) return;
    numberedImportAssignmentsBySeatId.set(toSeatId, refNo);
    const purchase = numberedImportPurchaseByRefNo.get(refNo);
    if (!purchase) return;
    const assignedSeatIds = Array.isArray(purchase.assignedSeatIds) ? purchase.assignedSeatIds : [];
    if (!assignedSeatIds.includes(toSeatId)) assignedSeatIds.push(toSeatId);
    purchase.assignedSeatIds = assignedSeatIds;
  });
  return true;
}

function clearNumberedImportRowAssignments(rowId) {
  const currentRowId = String(rowId || "").trim();
  if (!currentRowId) return false;
  let changed = false;
  seats.forEach((seat) => {
    if (seat.rowId !== currentRowId) return;
    const refNo = String(numberedImportAssignmentsBySeatId.get(seat.seatId) || "").trim();
    if (!refNo) return;
    numberedImportAssignmentsBySeatId.delete(seat.seatId);
    const purchase = numberedImportPurchaseByRefNo.get(refNo);
    if (purchase && Array.isArray(purchase.assignedSeatIds)) {
      purchase.assignedSeatIds = purchase.assignedSeatIds.filter((assignedSeatId) => assignedSeatId !== seat.seatId);
    }
    changed = true;
  });
  return changed;
}

function getNumberedImportContiguousRunAroundTarget(refNo, targetSeatId, requiredCount) {
  const targetId = String(targetSeatId || "").trim();
  if (!refNo || !targetId) return null;
  const neededCount = Number(requiredCount);
  if (!Number.isFinite(neededCount) || neededCount <= 0) return null;
  const targetSeat = seats.find((seat) => seat.seatId === targetId);
  if (!targetSeat || !targetSeat.rowId) return null;

  const orderedRowSeats = sortSeatsInRow(seats.filter((seat) => seat.rowId === targetSeat.rowId));
  if (orderedRowSeats.length < neededCount) return null;
  const targetIndex = orderedRowSeats.findIndex((seat) => seat.seatId === targetId);
  if (targetIndex < 0) return null;

  const minStart = Math.max(0, targetIndex - neededCount + 1);
  const maxStart = Math.min(targetIndex, orderedRowSeats.length - neededCount);
  if (maxStart < minStart) return null;

  let bestStart = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let start = minStart; start <= maxStart; start++) {
    let valid = true;
    let score = 0;
    for (let index = start; index < start + neededCount; index++) {
      const seat = orderedRowSeats[index];
      if (!canAssignNumberedImportSeat(seat, refNo)) {
        valid = false;
        break;
      }
      score += Math.abs(index - targetIndex);
    }
    if (!valid) continue;
    if (score < bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }
  if (bestStart < 0) return null;
  return orderedRowSeats.slice(bestStart, bestStart + neededCount);
}

function canAssignNumberedImportSeat(seat, refNo = "") {
  if (!seat || !seat.seatId || !numberedImportParsed) return false;
  const assignedRefNo = numberedImportAssignmentsBySeatId.get(seat.seatId);
  if (assignedRefNo && assignedRefNo !== refNo) return false;
  if (numberedImportAllowsAllLayoutSeats()) return true;
  if (numberedImportBlockedSeatIds.has(seat.seatId)) return false;
  const numericId = normalizeNumericId(seatIdToSvgCode(seat.seatId));
  if (!numericId || !numberedImportParsed.seatsByNumeric.has(numericId)) return false;
  return true;
}

function getNumberedImportSeatSectionKey(seat) {
  const sectionId = String(seat?.sectionId || "").trim();
  if (sectionId) return sectionId;
  return String(seat?.sectionName || "").trim();
}

function getNumberedImportSeatSectionLabel(seat, fallbackKey = "") {
  const bySeat = String(seat?.sectionName || "").trim();
  if (bySeat) return bySeat;
  const sectionId = String(seat?.sectionId || "").trim();
  const byMap = sectionId ? String(sectionNames.get(sectionId) || "").trim() : "";
  if (byMap) return byMap;
  return fallbackKey || "Unknown section";
}

function getNumberedImportLayoutSections() {
  const sectionsByKey = new Map();
  seats.forEach((seat) => {
    const key = getNumberedImportSeatSectionKey(seat);
    if (!key || sectionsByKey.has(key)) return;
    sectionsByKey.set(key, {
      key,
      label: getNumberedImportSeatSectionLabel(seat, key)
    });
  });
  return Array.from(sectionsByKey.values()).sort((first, second) => {
    const labelCompare = String(first.label || "").localeCompare(String(second.label || ""), "sv", { numeric: true, sensitivity: "base" });
    if (labelCompare !== 0) return labelCompare;
    return String(first.key || "").localeCompare(String(second.key || ""), "sv", { numeric: true, sensitivity: "base" });
  });
}

function renderNumberedImportSectionFilters() {
  const sections = getNumberedImportLayoutSections();
  const availableKeys = new Set(sections.map((section) => section.key));
  numberedImportSelectedSectionKeys = new Set(
    Array.from(numberedImportSelectedSectionKeys).filter((key) => availableKeys.has(key))
  );
  if (!numberedImportSelectedSectionKeys.size) numberedImportUseAllSections = true;
  numberedImportSectionsAll.checked = numberedImportUseAllSections;
  numberedImportSectionList.innerHTML = "";

  if (!sections.length) {
    const empty = document.createElement("div");
    empty.className = "numbered-import-section-empty";
    empty.textContent = "No sections found in layout.";
    numberedImportSectionList.appendChild(empty);
    return;
  }

  sections.forEach((section) => {
    const label = document.createElement("label");
    label.className = "control";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !numberedImportUseAllSections && numberedImportSelectedSectionKeys.has(section.key);
    input.addEventListener("change", () => {
      if (input.checked) {
        numberedImportUseAllSections = false;
        numberedImportSelectedSectionKeys.add(section.key);
      } else {
        numberedImportSelectedSectionKeys.delete(section.key);
        if (!numberedImportSelectedSectionKeys.size) numberedImportUseAllSections = true;
      }
      renderNumberedImportSectionFilters();
      updateNumberedImportStateUi();
      renderCanvas();
    });
    label.appendChild(input);
    label.appendChild(document.createTextNode(section.label));
    numberedImportSectionList.appendChild(label);
  });
}

function getNumberedImportPrimarySectionName(purchase) {
  if (!purchase || !Array.isArray(purchase.rows)) return "";
  const match = purchase.rows.find((row) => String(row?.sectionName || "").trim());
  return match ? String(match.sectionName || "").trim() : "";
}

function getNumberedImportPrimaryRowName(purchase) {
  if (!purchase || !Array.isArray(purchase.rows)) return "";
  const match = purchase.rows.find((row) => String(row?.rowName || "").trim());
  return match ? String(match.rowName || "").trim() : "";
}

function getNumberedImportRowOrderValue(row) {
  if (!row) return Number.POSITIVE_INFINITY;
  const firstSeat = Array.isArray(row.orderedSeats) ? row.orderedSeats[0] : null;
  const fromRowName = parseNumberedImportOrderNumber(firstSeat?.rowName);
  if (Number.isFinite(fromRowName)) return fromRowName;
  const tokens = String(row.rowId || "").split(".");
  const fromRowId = parseNumberedImportOrderNumber(tokens[tokens.length - 1]);
  if (Number.isFinite(fromRowId)) return fromRowId;
  return Number.POSITIVE_INFINITY;
}

function getNumberedImportSeatGoodnessScore(seat) {
  const goodness = Number(seat?.goodness);
  return Number.isFinite(goodness) ? goodness : Number.POSITIVE_INFINITY;
}

function hasNumberedImportGoodnessData() {
  return seats.some((seat) => {
    const goodness = Number(seat?.goodness);
    return Number.isFinite(goodness) && goodness > 0;
  });
}

function buildNumberedImportAutoPlacementRows() {
  const allowedSections = numberedImportUseAllSections ? null : new Set(Array.from(numberedImportSelectedSectionKeys));
  const rowsByKey = new Map();

  seats.forEach((seat) => {
    if (!seat?.rowId) return;
    const sectionKey = getNumberedImportSeatSectionKey(seat);
    if (allowedSections && (!sectionKey || !allowedSections.has(sectionKey))) return;
    const rowKey = `${sectionKey || ""}::${seat.rowId}`;
    if (!rowsByKey.has(rowKey)) {
      rowsByKey.set(rowKey, {
        rowId: seat.rowId,
        sectionKey,
        sectionLabel: getNumberedImportSeatSectionLabel(seat, sectionKey),
        seats: []
      });
    }
    rowsByKey.get(rowKey).seats.push(seat);
  });

  const rows = Array.from(rowsByKey.values()).map((row) => {
    const orderedSeats = sortSeatsInRow(row.seats);
    let sumX = 0;
    let sumY = 0;
    orderedSeats.forEach((seat) => {
      sumX += Number(seat.vx) || 0;
      sumY += Number(seat.vy) || 0;
    });
    const count = orderedSeats.length || 1;
    return {
      rowId: row.rowId,
      sectionKey: row.sectionKey,
      sectionLabel: row.sectionLabel,
      orderedSeats,
      rowOrderValue: getNumberedImportRowOrderValue({ rowId: row.rowId, orderedSeats }),
      avgX: sumX / count,
      avgY: sumY / count
    };
  });

  rows.sort((first, second) => {
    const sectionCompare = String(first.sectionLabel || first.sectionKey || "").localeCompare(
      String(second.sectionLabel || second.sectionKey || ""),
      "sv",
      { numeric: true, sensitivity: "base" }
    );
    if (sectionCompare !== 0) return sectionCompare;
    if (first.rowOrderValue !== second.rowOrderValue) return first.rowOrderValue - second.rowOrderValue;
    if (Math.abs(first.avgY - second.avgY) > 1e-6) return first.avgY - second.avgY;
    if (Math.abs(first.avgX - second.avgX) > 1e-6) return first.avgX - second.avgX;
    return String(first.rowId || "").localeCompare(String(second.rowId || ""), "sv", { numeric: true, sensitivity: "base" });
  });

  rows.forEach((row, index) => {
    row.orderIndex = index;
  });
  return rows;
}

function findNumberedImportFirstRun(row, requiredCount, refNo) {
  if (!row || !Array.isArray(row.orderedSeats) || row.orderedSeats.length < requiredCount) return null;
  const maxStart = row.orderedSeats.length - requiredCount;
  for (let start = 0; start <= maxStart; start++) {
    let valid = true;
    let goodnessScore = 0;
    for (let offset = 0; offset < requiredCount; offset++) {
      const seat = row.orderedSeats[start + offset];
      if (!canAssignNumberedImportSeat(seat, refNo)) {
        valid = false;
        break;
      }
      const seatGoodness = getNumberedImportSeatGoodnessScore(seat);
      goodnessScore += Number.isFinite(seatGoodness) ? seatGoodness : 1e9;
    }
    if (!valid) continue;
    return {
      row,
      start,
      seats: row.orderedSeats.slice(start, start + requiredCount),
      goodnessScore
    };
  }
  return null;
}

function findNumberedImportBestGoodnessRun(row, requiredCount, refNo) {
  if (!row || !Array.isArray(row.orderedSeats) || row.orderedSeats.length < requiredCount) return null;
  const maxStart = row.orderedSeats.length - requiredCount;
  let best = null;
  for (let start = 0; start <= maxStart; start++) {
    let valid = true;
    let goodnessScore = 0;
    for (let offset = 0; offset < requiredCount; offset++) {
      const seat = row.orderedSeats[start + offset];
      if (!canAssignNumberedImportSeat(seat, refNo)) {
        valid = false;
        break;
      }
      const seatGoodness = getNumberedImportSeatGoodnessScore(seat);
      goodnessScore += Number.isFinite(seatGoodness) ? seatGoodness : 1e9;
    }
    if (!valid) continue;
    if (!best || goodnessScore < best.goodnessScore || (goodnessScore === best.goodnessScore && start < best.start)) {
      best = {
        row,
        start,
        seats: row.orderedSeats.slice(start, start + requiredCount),
        goodnessScore
      };
    }
  }
  return best;
}

function findNumberedImportPlacementRun(orderedRows, requiredCount, refNo, useGoodness) {
  if (!Array.isArray(orderedRows) || !orderedRows.length) return null;
  if (!Number.isFinite(requiredCount) || requiredCount <= 0) return null;
  if (useGoodness) {
    let bestRun = null;
    orderedRows.forEach((row) => {
      const candidateRun = findNumberedImportBestGoodnessRun(row, requiredCount, refNo);
      if (!candidateRun) return;
      if (!bestRun || candidateRun.goodnessScore < bestRun.goodnessScore) {
        bestRun = candidateRun;
        return;
      }
      if (candidateRun.goodnessScore === bestRun.goodnessScore) {
        if ((candidateRun.row.orderIndex || 0) < (bestRun.row.orderIndex || 0)) {
          bestRun = candidateRun;
          return;
        }
        if ((candidateRun.row.orderIndex || 0) === (bestRun.row.orderIndex || 0) && candidateRun.start < bestRun.start) {
          bestRun = candidateRun;
        }
      }
    });
    return bestRun ? bestRun.seats : null;
  }

  for (const row of orderedRows) {
    const firstRun = findNumberedImportFirstRun(row, requiredCount, refNo);
    if (firstRun) return firstRun.seats;
  }
  return null;
}

function placeNumberedImportPurchaseBySettings(refNo) {
  if (!numberedImportReady || !numberedImportParsed) return false;
  const purchase = numberedImportPurchaseByRefNo.get(refNo);
  if (!purchase) return false;

  const orderedRows = buildNumberedImportAutoPlacementRows();
  if (!orderedRows.length) {
    alert("No rows available for the selected section filter.");
    return false;
  }

  const requiredCount = Number.isFinite(purchase.ticketCount) ? purchase.ticketCount : 0;
  if (requiredCount <= 0) {
    alert(`Could not place purchase ${refNo}. Invalid ticket count (${requiredCount}).`);
    return false;
  }

  const previousAssigned = Array.isArray(purchase.assignedSeatIds) ? [...purchase.assignedSeatIds] : [];
  previousAssigned.forEach((seatId) => numberedImportAssignmentsBySeatId.delete(seatId));

  const goodnessAvailable = hasNumberedImportGoodnessData();
  const useGoodness = numberedImportAutoOrderMode === "goodness" && goodnessAvailable;
  const selectedRun = findNumberedImportPlacementRun(orderedRows, requiredCount, purchase.refNo, useGoodness);
  if (!selectedRun) {
    previousAssigned.forEach((seatId) => numberedImportAssignmentsBySeatId.set(seatId, refNo));
    purchase.assignedSeatIds = previousAssigned;
    alert(`Could not place purchase ${refNo} with current section/order settings.`);
    refreshNumberedImportUi();
    return false;
  }

  const seatIds = selectedRun.map((seat) => seat.seatId);
  seatIds.forEach((seatId) => numberedImportAssignmentsBySeatId.set(seatId, refNo));
  purchase.assignedSeatIds = seatIds;
  numberedImportSelectedRefNo = getNextNumberedImportPurchaseRefNo(refNo);
  refreshNumberedImportUi();
  return true;
}

function autoPlaceAllNumberedImportPurchases() {
  if (!numberedImportReady || !numberedImportParsed || !numberedImportPurchases.length) return;
  if (numberedImportAssignmentsBySeatId.size > 0 && !confirm("Clear current placements and auto-place all purchases?")) {
    return;
  }

  clearNumberedImportAssignments();
  const orderedRows = buildNumberedImportAutoPlacementRows();
  if (!orderedRows.length) {
    alert("No rows available for the selected section filter.");
    return;
  }

  const goodnessAvailable = hasNumberedImportGoodnessData();
  const useGoodness = numberedImportAutoOrderMode === "goodness" && goodnessAvailable;
  const failures = [];
  let placedPurchases = 0;

  numberedImportPurchases.forEach((purchase) => {
    purchase.assignedSeatIds = [];
  });

  numberedImportPurchases.forEach((purchase) => {
    const requiredCount = Number.isFinite(purchase.ticketCount) ? purchase.ticketCount : 0;
    if (requiredCount <= 0) {
      failures.push(`${purchase.refNo} (${requiredCount})`);
      return;
    }
    const selectedRun = findNumberedImportPlacementRun(orderedRows, requiredCount, purchase.refNo, useGoodness);
    if (!selectedRun) {
      failures.push(`${purchase.refNo} (${requiredCount})`);
      return;
    }
    const seatIds = selectedRun.map((seat) => seat.seatId);
    seatIds.forEach((seatId) => numberedImportAssignmentsBySeatId.set(seatId, purchase.refNo));
    purchase.assignedSeatIds = seatIds;
    placedPurchases += 1;
  });

  numberedImportSelectedRefNo = getNextNumberedImportPurchaseRefNo("") || (numberedImportPurchases[0]?.refNo || "");
  refreshNumberedImportUi();

  if (failures.length) {
    const preview = failures.slice(0, 8).join(", ");
    const suffix = failures.length > 8 ? `, ... +${failures.length - 8} more` : "";
    alert(`Auto placement finished: ${placedPurchases}/${numberedImportPurchases.length} purchases placed. Could not place ${failures.length}: ${preview}${suffix}.`);
  } else {
    alert(`Auto placement finished: ${placedPurchases}/${numberedImportPurchases.length} purchases placed.`);
  }
}

function validateNumberedImportAgainstLayout(parsed) {
  const errors = [];
  const warnings = [];
  if (!parsed) {
    errors.push("No XLSX workbook loaded.");
    return { errors, warnings, purchases: [], blockedSeatIds: [] };
  }
  if (Array.isArray(parsed.issues)) errors.push(...parsed.issues);
  if (Array.isArray(parsed.warnings)) warnings.push(...parsed.warnings);
  if (!seats.length) {
    errors.push("Load a TLT layout before validating import.");
    return { errors, warnings, purchases: [], blockedSeatIds: [] };
  }

  const { numericToSeat, duplicates } = buildNumberedImportLayoutSeatMap();
  if (duplicates.length) {
    errors.push(`TLT contains duplicate NumericId values (${duplicates.slice(0, 6).join(", ")}${duplicates.length > 6 ? ", ..." : ""}).`);
  }

  const layoutIds = new Set(numericToSeat.keys());
  const workbookAllowsAllLayoutSeats = parsed.allowsAllLayoutSeats === true;
  const allowsAllLayoutSeats = numberedImportAllowsAllLayoutSeats(parsed);
  const excelIds = allowsAllLayoutSeats ? new Set(layoutIds) : new Set(parsed.seatsByNumeric.keys());

  const missingInLayout = [];
  const missingInExcel = [];
  excelIds.forEach((numericId) => {
    if (!layoutIds.has(numericId)) missingInLayout.push(numericId);
  });
  layoutIds.forEach((numericId) => {
    if (!excelIds.has(numericId)) missingInExcel.push(numericId);
  });

  if (missingInLayout.length) {
    warnings.push(`Seats mismatch: ${missingInLayout.length} seat(s) exist in Excel but not in TLT. They are ignored for placement in this layout (e.g. ${missingInLayout.slice(0, 6).join(", ")}${missingInLayout.length > 6 ? ", ..." : ""}).`);
  }

  const blockedSeatIds = [];
  if (missingInExcel.length) {
    if (allowsAllLayoutSeats) {
      warnings.push(
        workbookAllowsAllLayoutSeats
          ? `Seats mismatch: ${missingInExcel.length} seat(s) exist in TLT but not in Excel. They remain available because this workbook allows all layout seats (e.g. ${missingInExcel.slice(0, 6).join(", ")}${missingInExcel.length > 6 ? ", ..." : ""}).`
          : `Seats mismatch: ${missingInExcel.length} seat(s) exist in TLT but not in Excel. Override is enabled, so these seats remain available in canvas and export will use the current TLT seat list (e.g. ${missingInExcel.slice(0, 6).join(", ")}${missingInExcel.length > 6 ? ", ..." : ""}).`
      );
    } else {
      warnings.push(`Seats mismatch: ${missingInExcel.length} seat(s) exist in TLT but not in Excel. These seats are blocked in canvas (e.g. ${missingInExcel.slice(0, 6).join(", ")}${missingInExcel.length > 6 ? ", ..." : ""}).`);
      missingInExcel.forEach((numericId) => {
        const seat = numericToSeat.get(numericId);
        if (seat?.seatId) blockedSeatIds.push(seat.seatId);
      });
    }
  }

  const grouped = new Map();
  parsed.existingRows.forEach((row) => {
    const seat = row.numericId ? numericToSeat.get(row.numericId) : null;
    if (!grouped.has(row.refNo)) {
      grouped.set(row.refNo, {
        refNo: row.refNo,
        rows: [],
        ticketTypeCounts: new Map(),
        reportedCounts: [],
        ticketCount: 0,
        reportedNoOfTickets: null,
        oldestPurchaseAtMs: Number.POSITIVE_INFINITY,
        purchaseListMode: parsed.purchaseListMode || "rows",
        firstName: "",
        lastName: "",
        email: "",
        assignedSeatIds: []
      });
    }
    const purchase = grouped.get(row.refNo);
    const seatId = seat?.seatId || "";
    purchase.rows.push({ ...row, seatId });
    if (!purchase.firstName && row.firstName) purchase.firstName = String(row.firstName || "").trim();
    if (!purchase.lastName && row.lastName) purchase.lastName = String(row.lastName || "").trim();
    if (!purchase.email && row.email) purchase.email = String(row.email || "").trim();
    const ticketType = String(row.ticketType || "").trim();
    if (ticketType) {
      purchase.ticketTypeCounts.set(ticketType, (purchase.ticketTypeCounts.get(ticketType) || 0) + 1);
    }
    const purchasedAtMs = Number(row.purchasedAtMs);
    if (Number.isFinite(purchasedAtMs) && purchasedAtMs < purchase.oldestPurchaseAtMs) {
      purchase.oldestPurchaseAtMs = purchasedAtMs;
    }
    if (Number.isFinite(row.noOfTickets)) purchase.reportedCounts.push(row.noOfTickets);
  });

  const purchases = Array.from(grouped.values()).map((purchase) => {
    purchase.ticketCount = purchase.rows.length;
    purchase.primarySectionName = getNumberedImportPrimarySectionName(purchase);
    purchase.primaryRowName = getNumberedImportPrimaryRowName(purchase);
    purchase.ticketTypeSummary = Array.from(purchase.ticketTypeCounts.entries())
      .sort((first, second) => String(first[0] || "").localeCompare(String(second[0] || ""), "sv", { numeric: true, sensitivity: "base" }))
      .map(([ticketType, count]) => `${ticketType}: ${count}`);
    if (purchase.reportedCounts.length) {
      purchase.reportedNoOfTickets = Math.max(...purchase.reportedCounts);
      if (purchase.reportedNoOfTickets !== purchase.ticketCount) {
        warnings.push(`RefNo ${purchase.refNo}: NoOfTickets column differs from row count (${purchase.reportedNoOfTickets} vs ${purchase.ticketCount}). Row count is used.`);
      }
    }
    if (purchase.ticketCount <= 0) warnings.push(`RefNo ${purchase.refNo}: no rows were found.`);
    return purchase;
  }).sort((first, second) => {
    if (parsed.purchaseSortMode === "purchase-date-asc") {
      const firstTime = Number.isFinite(first.oldestPurchaseAtMs) ? first.oldestPurchaseAtMs : Number.POSITIVE_INFINITY;
      const secondTime = Number.isFinite(second.oldestPurchaseAtMs) ? second.oldestPurchaseAtMs : Number.POSITIVE_INFINITY;
      if (firstTime !== secondTime) return firstTime - secondTime;
      return String(first.refNo || "").localeCompare(String(second.refNo || ""), "sv", { numeric: true, sensitivity: "base" });
    }
    const sectionCompare = String(first.primarySectionName || "").localeCompare(String(second.primarySectionName || ""), "sv", { numeric: true, sensitivity: "base" });
    if (sectionCompare !== 0) return sectionCompare;
    const rowCompare = compareNumberedImportRowNames(first.primaryRowName, second.primaryRowName);
    if (rowCompare !== 0) return rowCompare;
    return String(first.refNo || "").localeCompare(String(second.refNo || ""), "sv", { numeric: true, sensitivity: "base" });
  });

  purchases.forEach((purchase, index) => {
    purchase.listBaseOrder = index;
  });

  if (!purchases.length && !errors.length) {
    warnings.push(allowsAllLayoutSeats ? "No purchasable rows were found." : "No purchase rows with valid seat mapping were found.");
  }

  return { errors, warnings, purchases, blockedSeatIds };
}

function clearNumberedImportHoverPreview() {
  const hadPreview =
    numberedImportHoverPreviewSeatIds.size > 0 ||
    !!numberedImportHoverPreviewSeatId ||
    !!numberedImportHoverPreviewRefNo;
  numberedImportHoverPreviewRefNo = "";
  numberedImportHoverPreviewSeatId = "";
  numberedImportHoverPreviewSeatIds = new Set();
  return hadPreview;
}

function closeNumberedImportPurchaseMenu() {
  numberedImportPurchaseMenu.classList.remove("open");
  numberedImportPurchaseMenu.setAttribute("aria-hidden", "true");
  numberedImportContextRefNo = "";
  numberedImportContextRowId = "";
}

function openNumberedImportPurchaseMenu(clientX, clientY, refNo, rowIdOverride = "") {
  if (!numberedImportReady) return;
  const purchase = numberedImportPurchaseByRefNo.get(refNo);
  if (!purchase) return;
  const placedCount = Array.isArray(purchase.assignedSeatIds) ? purchase.assignedSeatIds.length : 0;
  const rowId = String(rowIdOverride || "").trim() || getNumberedImportSingleAssignedRowId(purchase);
  const rowHasAssignments = hasNumberedImportPlacedSeatsOnRow(rowId);
  const leftPlan = buildNumberedImportRowPushPlan(rowId, "left");
  const rightPlan = buildNumberedImportRowPushPlan(rowId, "right");

  numberedImportContextRefNo = purchase.refNo;
  numberedImportContextRowId = rowId;
  numberedImportMenuClearPurchase.disabled = placedCount <= 0;
  numberedImportMenuClearRow.disabled = !rowHasAssignments;
  numberedImportMenuPushLeft.disabled = !(leftPlan && leftPlan.changed);
  numberedImportMenuPushRight.disabled = !(rightPlan && rightPlan.changed);

  numberedImportPurchaseMenu.style.left = `${clientX}px`;
  numberedImportPurchaseMenu.style.top = `${clientY}px`;
  numberedImportPurchaseMenu.classList.add("open");
  numberedImportPurchaseMenu.setAttribute("aria-hidden", "false");

  const padding = 8;
  const menuRect = numberedImportPurchaseMenu.getBoundingClientRect();
  let left = clientX;
  let top = clientY;
  if (left + menuRect.width > window.innerWidth - padding) left = window.innerWidth - menuRect.width - padding;
  if (top + menuRect.height > window.innerHeight - padding) top = window.innerHeight - menuRect.height - padding;
  numberedImportPurchaseMenu.style.left = `${Math.max(padding, left)}px`;
  numberedImportPurchaseMenu.style.top = `${Math.max(padding, top)}px`;
}

function getNumberedImportPurchaseColor(refNo) {
  return generatePaletteColor(`purchase-${refNo}`, 72, 58);
}

function renderNumberedImportPurchaseList() {
  numberedImportPurchaseList.innerHTML = "";
  const appendEmpty = (text) => {
    const empty = document.createElement("div");
    empty.className = "numbered-import-list__empty";
    empty.textContent = text;
    numberedImportPurchaseList.appendChild(empty);
  };

  if (!numberedImportWorkbookName) {
    appendEmpty("Load an XLSX file to list purchases.");
    return;
  }
  if (numberedImportValidationErrors.length) {
    appendEmpty("Validation failed. Resolve errors before placement.");
    return;
  }

  const displayPurchases = getNumberedImportPurchasesInDisplayOrder();
  if (!displayPurchases.length) {
    appendEmpty("No purchases were found in the workbook.");
    return;
  }

  displayPurchases.forEach((purchase) => {
    const placedCount = Array.isArray(purchase.assignedSeatIds) ? purchase.assignedSeatIds.length : 0;
    const complete = isNumberedImportPurchaseComplete(purchase);
    const item = document.createElement("div");
    item.className = "numbered-import-item";
    if (purchase.refNo === numberedImportSelectedRefNo) item.classList.add("is-active");
    if (complete) item.classList.add("is-complete");
    item.draggable = numberedImportReady;
    item.dataset.refNo = purchase.refNo;
    item.style.borderLeft = `6px solid ${getNumberedImportPurchaseColor(purchase.refNo)}`;

    const main = document.createElement("div");
    main.className = "numbered-import-item__main";
    const ref = document.createElement("div");
    ref.className = "numbered-import-item__ref";
    ref.textContent = purchase.refNo;
    const meta = document.createElement("div");
    meta.className = "numbered-import-item__meta";
    meta.textContent = `Placed ${placedCount}/${purchase.ticketCount}`;
    main.appendChild(ref);
    main.appendChild(meta);

    const rowInfo = document.createElement("div");
    rowInfo.className = "numbered-import-item__rows";
    const ticketTypeSummary = Array.isArray(purchase.ticketTypeSummary) ? purchase.ticketTypeSummary : [];
    const summaryOnly = purchase.purchaseListMode === "ticket-type-summary";
    if (ticketTypeSummary.length) {
      ticketTypeSummary.forEach((summaryText) => {
        const line = document.createElement("div");
        line.className = "numbered-import-item__rowline";
        line.textContent = summaryText;
        rowInfo.appendChild(line);
      });
    }
    if (!summaryOnly) {
      (purchase.rows || []).forEach((row) => {
        const segments = [
          String(row.sectionName || "").trim(),
          String(row.rowName || "").trim(),
          String(row.seatName || "").trim()
        ].filter(Boolean);
        const line = document.createElement("div");
        line.className = "numbered-import-item__rowline";
        line.textContent = segments.join(" / ") || String(row.identifier || row.numericId || "").trim();
        rowInfo.appendChild(line);
      });
    }
    if (!rowInfo.childElementCount) {
      const line = document.createElement("div");
      line.className = "numbered-import-item__rowline";
      line.textContent = "No row details";
      rowInfo.appendChild(line);
    }
    main.appendChild(rowInfo);

    const actions = document.createElement("div");
    actions.className = "numbered-import-item__actions";

    const placeBtn = document.createElement("button");
    placeBtn.type = "button";
    placeBtn.className = "button numbered-import-item__btn";
    placeBtn.textContent = "Place";
    placeBtn.disabled = !numberedImportReady || purchase.ticketCount <= 0;
    placeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      placeNumberedImportPurchaseBySettings(purchase.refNo);
    });
    actions.appendChild(placeBtn);

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "button button--danger numbered-import-item__btn";
    clearBtn.textContent = "Clear";
    clearBtn.disabled = placedCount === 0;
    clearBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      clearNumberedImportPurchase(purchase.refNo);
      refreshNumberedImportUi();
    });
    actions.appendChild(clearBtn);

    item.appendChild(main);
    item.appendChild(actions);

    item.addEventListener("click", () => {
      selectNumberedImportPurchase(purchase.refNo);
    });
    item.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      selectNumberedImportPurchase(purchase.refNo);
      openNumberedImportPurchaseMenu(event.clientX, event.clientY, purchase.refNo);
    });
    item.addEventListener("dragstart", (event) => {
      if (!numberedImportReady) return;
      numberedImportDraggingRefNo = purchase.refNo;
      selectNumberedImportPurchase(purchase.refNo);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", purchase.refNo);
      }
    });
    item.addEventListener("dragend", () => {
      numberedImportDraggingRefNo = "";
      if (clearNumberedImportHoverPreview()) renderCanvas();
    });

    numberedImportPurchaseList.appendChild(item);
  });
}

function getNumberedImportCurrentFileName() {
  const fileName = String(currentFileName || "").trim();
  if (fileName) return fileName;
  return seats.length ? "Loaded layout" : "Not loaded";
}

function updateNumberedImportPlacementModeUi() {
  numberedImportModePurchase.checked = numberedImportPlacementMode !== "seat";
  numberedImportModeSeat.checked = numberedImportPlacementMode === "seat";
  const goodnessAvailable = hasNumberedImportGoodnessData();
  if (!goodnessAvailable && numberedImportAutoOrderMode === "goodness") {
    numberedImportAutoOrderMode = "row1";
  }
  numberedImportAutoOrderRow1.checked = numberedImportAutoOrderMode !== "goodness";
  numberedImportAutoOrderGoodness.checked = numberedImportAutoOrderMode === "goodness";
  numberedImportAutoOrderGoodness.disabled = !goodnessAvailable;
  numberedImportAutoOrderGoodness.title = goodnessAvailable ? "" : "No goodness values found in this layout.";
}

function updateNumberedImportStateUi() {
  if (numberedImportCard.hidden) numberedImportCard.hidden = false;
  renderNumberedImportSectionFilters();
  updateNumberedImportPlacementModeUi();

  numberedImportLayoutState.textContent = `Layout: ${getNumberedImportCurrentFileName()} (${seats.length} seats)`;
  numberedImportExcelState.textContent = numberedImportWorkbookName ? `Excel: ${numberedImportWorkbookName}` : "Excel: not loaded";

  if (!numberedImportWorkbookName) {
    numberedImportValidationState.textContent = "Validation: waiting for files";
  } else if (numberedImportValidationErrors.length) {
    numberedImportValidationState.textContent = `Validation: failed (${numberedImportValidationErrors.length} errors)`;
  } else if (!numberedImportReady) {
    numberedImportValidationState.textContent = "Validation: no purchasable rows found";
  } else {
    const totalSeats = numberedImportPurchases.reduce((sum, purchase) => sum + purchase.ticketCount, 0);
    const placedSeats = numberedImportPurchases.reduce((sum, purchase) => sum + (purchase.assignedSeatIds?.length || 0), 0);
    const allTltSeatsSuffix = numberedImportAllowsAllLayoutSeats() ? " • All TLT seats enabled" : "";
    const blockedSuffix = numberedImportBlockedSeatIds.size ? ` • Blocked ${numberedImportBlockedSeatIds.size}` : "";
    numberedImportValidationState.textContent = `Validation: OK • Purchases ${numberedImportPurchases.length} • Placed ${placedSeats}/${totalSeats}${allTltSeatsSuffix}${blockedSuffix}`;
  }

  const workbookAlreadyAllowsAll = numberedImportParsed?.allowsAllLayoutSeats === true;
  numberedImportAllowAllTltSeats.checked = numberedImportAllowsAllLayoutSeats();
  numberedImportAllowAllTltSeats.disabled = !seats.length || !numberedImportWorkbookName || workbookAlreadyAllowsAll;
  numberedImportAllowAllTltSeats.title = workbookAlreadyAllowsAll
    ? "This workbook already allows all layout seats."
    : "Ignore seats that exist in TLT but not in Excel, and keep them available for placement.";

  const allPlaced = numberedImportReady && numberedImportPurchases.every((purchase) => isNumberedImportPurchaseComplete(purchase));
  const disablePlacementControls = !numberedImportReady || numberedImportPurchases.length === 0;

  numberedImportModePurchase.disabled = disablePlacementControls;
  numberedImportModeSeat.disabled = disablePlacementControls;
  numberedImportSectionsAll.disabled = disablePlacementControls;
  numberedImportAutoOrderRow1.disabled = disablePlacementControls;
  numberedImportAutoOrderGoodness.disabled = disablePlacementControls || !hasNumberedImportGoodnessData();
  Array.from(numberedImportSectionList.querySelectorAll("input[type='checkbox']")).forEach((input) => {
    input.disabled = disablePlacementControls;
  });
  numberedImportAutoPlaceAllBtn.disabled = disablePlacementControls;
  numberedImportExportBtn.disabled = !allPlaced;
  numberedImportClearBtn.disabled = numberedImportAssignmentsBySeatId.size === 0;
}

function refreshNumberedImportUi() {
  clearNumberedImportHoverPreview();
  closeNumberedImportPurchaseMenu();
  renderNumberedImportPurchaseList();
  updateNumberedImportStateUi();
  renderCanvas();
}

function handleNumberedImportLayoutChanged(options = {}) {
  const preserveAssignments = !!options.preserveAssignments;
  const previousAssignmentsBySeatId = preserveAssignments ? new Map(numberedImportAssignmentsBySeatId) : new Map();

  numberedImportValidationErrors = [];
  numberedImportValidationWarnings = [];
  numberedImportPurchases = [];
  numberedImportPurchaseByRefNo = new Map();
  numberedImportBlockedSeatIds = new Set();
  clearNumberedImportAssignments();
  numberedImportReady = false;

  if (numberedImportParsed) {
    const validation = validateNumberedImportAgainstLayout(numberedImportParsed);
    numberedImportValidationErrors = validation.errors;
    numberedImportValidationWarnings = validation.warnings;
    numberedImportPurchases = validation.purchases;
    numberedImportBlockedSeatIds = new Set(validation.blockedSeatIds || []);
    numberedImportPurchaseByRefNo = new Map(numberedImportPurchases.map((purchase) => [purchase.refNo, purchase]));
    numberedImportReady = numberedImportValidationErrors.length === 0 && numberedImportPurchases.length > 0;

    if (preserveAssignments && previousAssignmentsBySeatId.size && numberedImportReady) {
      previousAssignmentsBySeatId.forEach((refNo, seatId) => {
        const purchase = numberedImportPurchaseByRefNo.get(refNo);
        const seat = seats.find((entry) => entry.seatId === seatId);
        if (!purchase || !seat || !canAssignNumberedImportSeat(seat, refNo)) return;
        numberedImportAssignmentsBySeatId.set(seatId, refNo);
        if (!Array.isArray(purchase.assignedSeatIds)) purchase.assignedSeatIds = [];
        if (!purchase.assignedSeatIds.includes(seatId)) purchase.assignedSeatIds.push(seatId);
      });
      numberedImportPurchases.forEach((purchase) => {
        const assignedSeatIds = Array.isArray(purchase.assignedSeatIds) ? purchase.assignedSeatIds : [];
        if (assignedSeatIds.length <= purchase.ticketCount) return;
        const trimmedSeatIds = assignedSeatIds.slice(0, purchase.ticketCount);
        const trimmedSet = new Set(trimmedSeatIds);
        assignedSeatIds.forEach((seatId) => {
          if (!trimmedSet.has(seatId)) numberedImportAssignmentsBySeatId.delete(seatId);
        });
        purchase.assignedSeatIds = trimmedSeatIds;
      });
    }
  }

  if (numberedImportSelectedRefNo && !numberedImportPurchaseByRefNo.has(numberedImportSelectedRefNo)) {
    numberedImportSelectedRefNo = "";
  }
  if (!numberedImportSelectedRefNo && numberedImportPurchases.length) {
    numberedImportSelectedRefNo = getNextNumberedImportPurchaseRefNo("");
  }

  renderNumberedImportSectionFilters();
  setNumberedImportIssues(numberedImportValidationErrors, numberedImportValidationWarnings);
  refreshNumberedImportUi();
}

async function loadNumberedImportXlsx(file) {
  if (!file) return;
  if (typeof XLSX === "undefined") {
    alert("Excel import requires the XLSX library.");
    return;
  }
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
    numberedImportWorkbookName = file.name || "workbook.xlsx";
    numberedImportParsed = parseNumberedImportWorkbook(workbook);
    handleNumberedImportLayoutChanged();
  } catch (error) {
    console.warn("Failed to parse import workbook:", error);
    numberedImportWorkbookName = "";
    numberedImportParsed = null;
    numberedImportValidationErrors = ["Could not read the XLSX file."];
    numberedImportValidationWarnings = [];
    numberedImportPurchases = [];
    numberedImportPurchaseByRefNo = new Map();
    numberedImportBlockedSeatIds = new Set();
    clearNumberedImportAssignments();
    numberedImportReady = false;
    setNumberedImportIssues(numberedImportValidationErrors, numberedImportValidationWarnings);
    refreshNumberedImportUi();
  }
}

function selectNumberedImportPurchase(refNo) {
  if (!numberedImportPurchaseByRefNo.has(refNo)) return;
  numberedImportSelectedRefNo = refNo;
  clearNumberedImportHoverPreview();
  closeNumberedImportPurchaseMenu();
  renderNumberedImportPurchaseList();
  renderCanvas();
}

function assignNumberedImportPurchaseAtSeat(refNo, targetSeatId) {
  if (!numberedImportReady || !numberedImportParsed) return false;
  const purchase = numberedImportPurchaseByRefNo.get(refNo);
  if (!purchase) return false;
  const targetSeat = seats.find((seat) => seat.seatId === targetSeatId);
  if (!targetSeat || !canAssignNumberedImportSeat(targetSeat, refNo)) return false;

  if (numberedImportPlacementMode === "seat") {
    const requiredCount = purchase.ticketCount;
    const currentAssigned = Array.isArray(purchase.assignedSeatIds) ? [...purchase.assignedSeatIds] : [];
    const existingIndex = currentAssigned.indexOf(targetSeatId);
    if (existingIndex >= 0) {
      currentAssigned.splice(existingIndex, 1);
      numberedImportAssignmentsBySeatId.delete(targetSeatId);
      purchase.assignedSeatIds = currentAssigned;
      numberedImportSelectedRefNo = refNo;
      refreshNumberedImportUi();
      return true;
    }

    if (currentAssigned.length >= requiredCount) {
      alert(`Purchase ${refNo} already has ${requiredCount} placed seats. Remove one seat first or switch to Place purchase.`);
      return false;
    }

    numberedImportAssignmentsBySeatId.set(targetSeatId, refNo);
    purchase.assignedSeatIds = [...currentAssigned, targetSeatId];
    numberedImportSelectedRefNo = isNumberedImportPurchaseComplete(purchase)
      ? getNextNumberedImportPurchaseRefNo(refNo)
      : refNo;
    refreshNumberedImportUi();
    return true;
  }

  if (!targetSeat.rowId) return false;
  const previousAssigned = Array.isArray(purchase.assignedSeatIds) ? [...purchase.assignedSeatIds] : [];
  previousAssigned.forEach((seatId) => numberedImportAssignmentsBySeatId.delete(seatId));
  const requiredCount = purchase.ticketCount;

  const failPlacement = (message) => {
    previousAssigned.forEach((seatId) => numberedImportAssignmentsBySeatId.set(seatId, refNo));
    purchase.assignedSeatIds = previousAssigned;
    if (message) alert(message);
    refreshNumberedImportUi();
    return false;
  };

  const selectedRun = getNumberedImportContiguousRunAroundTarget(refNo, targetSeatId, requiredCount);
  if (!selectedRun || !selectedRun.length) {
    return failPlacement(`Could not place purchase ${refNo}. Need ${requiredCount} contiguous free seats around target seat on row ${targetSeat.rowId}.`);
  }

  const selectedSeatIds = selectedRun.map((seat) => seat.seatId);
  selectedSeatIds.forEach((seatId) => numberedImportAssignmentsBySeatId.set(seatId, refNo));
  purchase.assignedSeatIds = selectedSeatIds;
  numberedImportSelectedRefNo = getNextNumberedImportPurchaseRefNo(refNo);
  refreshNumberedImportUi();
  return true;
}

function updateNumberedImportHoverPreview(worldX, worldY) {
  const refNo = numberedImportDraggingRefNo || numberedImportSelectedRefNo;
  if (!numberedImportReady || !refNo) {
    if (clearNumberedImportHoverPreview()) renderCanvas();
    return;
  }

  const hit = hitTestSeat(worldX, worldY);
  if (!hit) {
    if (clearNumberedImportHoverPreview()) renderCanvas();
    return;
  }

  let nextSeatIds = [];
  let nextTargetSeatId = hit.seatId;
  if (numberedImportPlacementMode === "seat") {
    if (canAssignNumberedImportSeat(hit, refNo)) nextSeatIds = [hit.seatId];
  } else {
    const purchase = numberedImportPurchaseByRefNo.get(refNo);
    const requiredCount = Number(purchase?.ticketCount || 0);
    const contiguousRun = getNumberedImportContiguousRunAroundTarget(refNo, hit.seatId, requiredCount);
    nextSeatIds = Array.isArray(contiguousRun) ? contiguousRun.map((seat) => seat.seatId) : [];
  }

  const nextPreviewSet = new Set(nextSeatIds);
  const changed =
    numberedImportHoverPreviewRefNo !== refNo ||
    numberedImportHoverPreviewSeatId !== nextTargetSeatId ||
    numberedImportHoverPreviewSeatIds.size !== nextPreviewSet.size ||
    Array.from(nextPreviewSet).some((seatId) => !numberedImportHoverPreviewSeatIds.has(seatId));

  if (!changed) return;

  numberedImportHoverPreviewRefNo = refNo;
  numberedImportHoverPreviewSeatId = nextTargetSeatId;
  numberedImportHoverPreviewSeatIds = nextPreviewSet;
  renderCanvas();
}

function handleNumberedImportCanvasPlacement(worldX, worldY, explicitRefNo = "") {
  if (!numberedImportReady) return false;
  const refNo = explicitRefNo || numberedImportSelectedRefNo || numberedImportDraggingRefNo;
  if (!refNo) return false;
  const hit = hitTestSeat(worldX, worldY);
  if (!hit) return false;
  return assignNumberedImportPurchaseAtSeat(refNo, hit.seatId);
}

async function exportNumberedImportWorkbook() {
  if (!numberedImportReady || !numberedImportParsed) return;
  const allPlaced = numberedImportPurchases.every((purchase) => isNumberedImportPurchaseComplete(purchase));
  if (!allPlaced) {
    alert("Place all purchases before export.");
    return;
  }
  if (typeof XLSX === "undefined") {
    alert("Excel export requires the XLSX library.");
    return;
  }

  const allowsAllLayoutSeats = numberedImportAllowsAllLayoutSeats(numberedImportParsed);
  let templateRows = Array.isArray(numberedImportParsed.template?.rows) ? numberedImportParsed.template.rows : [];
  if (allowsAllLayoutSeats) {
    templateRows = buildNumberedImportTemplateRowsFromLayout();
  }
  if (!templateRows.length) {
    alert('Could not read seat rows from "Import Template".');
    return;
  }

  const refNoByIdentifier = new Map();
  numberedImportPurchases.forEach((purchase) => {
    const refNo = String(purchase.refNo || "").trim();
    (purchase.assignedSeatIds || []).forEach((seatId) => {
      const numericId = normalizeNumericId(seatIdToSvgCode(seatId));
      if (!numericId) return;
      const seatRecord = numberedImportParsed.seatsByNumeric.get(numericId);
      let identifier = String(seatRecord?.identifier || "").trim().toLowerCase();
      if (!identifier && allowsAllLayoutSeats) identifier = numericId.toLowerCase();
      if (!identifier) return;
      refNoByIdentifier.set(identifier, refNo);
    });
  });

  const rows = [["Seat", "Purchase Group", "RefNo", "FirstName", "LastName", "Email"]];
  templateRows.forEach((templateRow) => {
    const identifier = String(templateRow?.identifier || "").trim();
    if (!identifier) return;
    const key = String(templateRow?.key || "").trim().toLowerCase() || identifier.toLowerCase();
    const refNo = refNoByIdentifier.get(key) || "";
    const purchase = refNo ? numberedImportPurchaseByRefNo.get(refNo) : null;
    rows.push([
      identifier,
      refNo,
      refNo,
      String(purchase?.firstName || "").trim(),
      String(purchase?.lastName || "").trim(),
      String(purchase?.email || "").trim()
    ]);
  });

  if (rows.length <= 1) {
    alert('No seat rows were found in "Import Template".');
    return;
  }

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 42 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(workbook, sheet, "Import Template");

  const exportBase = numberedImportWorkbookName
    ? numberedImportWorkbookName.replace(/\.(xlsx|xls)$/i, "")
    : "numbered-import";
  XLSX.writeFile(workbook, `${exportBase}-import-template.xlsx`, { compression: true });
}

function setNumberedImportPlacementMode(mode) {
  numberedImportPlacementMode = mode === "seat" ? "seat" : "all";
  clearNumberedImportHoverPreview();
  updateNumberedImportPlacementModeUi();
  renderCanvas();
}

function setNumberedImportAutoOrderMode(mode) {
  numberedImportAutoOrderMode = mode === "goodness" ? "goodness" : "row1";
  clearNumberedImportHoverPreview();
  updateNumberedImportPlacementModeUi();
  renderCanvas();
}

function updateHoverAtClientPosition(clientX, clientY) {
  hoverClientX = clientX;
  hoverClientY = clientY;
  const point = clientToWorld(clientX, clientY);
  const nextHoverSeat = hitTestSeat(point.x, point.y);
  const hoverChanged = (hoverSeat?.seatId || "") !== (nextHoverSeat?.seatId || "");
  hoverSeat = nextHoverSeat;
  updateTooltip();
  if (!panState.active) {
    updateNumberedImportHoverPreview(point.x, point.y);
  }
  if (hoverChanged && !numberedImportHoverPreviewSeatIds.size) {
    renderCanvas();
  }
}

async function loadTltFile(file) {
  if (!file) return;
  try {
    currentFileName = file.name || "layout.tlt";
    const text = await file.text();
    parseTlt(text);
  } catch (error) {
    console.warn("Failed to parse TLT:", error);
    alert("Could not read the TLT file.");
  }
}

function handleCanvasClick(clientX, clientY) {
  const world = clientToWorld(clientX, clientY);
  const hit = hitTestSeat(world.x, world.y);
  if (!hit) {
    closeNumberedImportPurchaseMenu();
    renderCanvas();
    return;
  }

  const assignedRefNo = String(numberedImportAssignmentsBySeatId.get(hit.seatId) || "").trim();
  if (assignedRefNo && !numberedImportSelectedRefNo) {
    selectNumberedImportPurchase(assignedRefNo);
    return;
  }

  if (!handleNumberedImportCanvasPlacement(world.x, world.y)) {
    if (assignedRefNo) {
      selectNumberedImportPurchase(assignedRefNo);
    } else {
      renderCanvas();
    }
  }
}

numberedImportLoadTltBtn.addEventListener("click", () => {
  numberedImportTltInput.click();
});

numberedImportTltInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  await loadTltFile(file);
  numberedImportTltInput.value = "";
});

numberedImportLoadXlsxBtn.addEventListener("click", () => {
  numberedImportXlsxInput.click();
});

numberedImportXlsxInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  await loadNumberedImportXlsx(file);
  numberedImportXlsxInput.value = "";
});

numberedImportAllowAllTltSeats.addEventListener("change", () => {
  setNumberedImportAllowAllLayoutSeatsOverride(!!numberedImportAllowAllTltSeats.checked, {
    preserveAssignments: true
  });
});

numberedImportModePurchase.addEventListener("change", () => {
  if (numberedImportModePurchase.checked) setNumberedImportPlacementMode("all");
});

numberedImportModeSeat.addEventListener("change", () => {
  if (numberedImportModeSeat.checked) setNumberedImportPlacementMode("seat");
});

numberedImportSectionsAll.addEventListener("change", () => {
  if (numberedImportSectionsAll.checked) {
    numberedImportUseAllSections = true;
    numberedImportSelectedSectionKeys.clear();
  } else {
    const availableSections = getNumberedImportLayoutSections();
    numberedImportUseAllSections = false;
    numberedImportSelectedSectionKeys = new Set(availableSections.map((section) => section.key));
  }
  renderNumberedImportSectionFilters();
  updateNumberedImportStateUi();
  renderCanvas();
});

numberedImportAutoOrderRow1.addEventListener("change", () => {
  if (numberedImportAutoOrderRow1.checked) setNumberedImportAutoOrderMode("row1");
});

numberedImportAutoOrderGoodness.addEventListener("change", () => {
  if (numberedImportAutoOrderGoodness.checked) setNumberedImportAutoOrderMode("goodness");
});

numberedImportAutoPlaceAllBtn.addEventListener("click", () => {
  autoPlaceAllNumberedImportPurchases();
});

numberedImportClearBtn.addEventListener("click", () => {
  clearNumberedImportAssignments();
  refreshNumberedImportUi();
});

numberedImportExportBtn.addEventListener("click", async () => {
  await exportNumberedImportWorkbook();
});

numberedImportMenuClearPurchase.addEventListener("click", () => {
  if (!numberedImportContextRefNo) return;
  clearNumberedImportPurchase(numberedImportContextRefNo);
  closeNumberedImportPurchaseMenu();
  refreshNumberedImportUi();
});

numberedImportMenuClearRow.addEventListener("click", () => {
  if (!numberedImportContextRowId) return;
  clearNumberedImportRowAssignments(numberedImportContextRowId);
  closeNumberedImportPurchaseMenu();
  refreshNumberedImportUi();
});

numberedImportMenuPushLeft.addEventListener("click", () => {
  const plan = buildNumberedImportRowPushPlan(numberedImportContextRowId, "left");
  if (!plan) return;
  applyNumberedImportRowPushPlan(plan);
  closeNumberedImportPurchaseMenu();
  refreshNumberedImportUi();
});

numberedImportMenuPushRight.addEventListener("click", () => {
  const plan = buildNumberedImportRowPushPlan(numberedImportContextRowId, "right");
  if (!plan) return;
  applyNumberedImportRowPushPlan(plan);
  closeNumberedImportPurchaseMenu();
  refreshNumberedImportUi();
});

viewSectionNamesToggle.addEventListener("change", () => {
  showSectionNames = !!viewSectionNamesToggle.checked;
  renderCanvas();
});

overlayModeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) setOverlayMode(input.value);
  });
});

seatLabelModeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) setSeatLabelMode(input.value);
  });
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const before = clientToWorld(event.clientX, event.clientY);
  const zoomFactor = Math.exp(-event.deltaY * 0.0015);
  const nextScale = clampValue(scale * zoomFactor, 0.02, 12);
  if (nextScale === scale) return;
  const rect = canvas.getBoundingClientRect();
  const canvasX = event.clientX - rect.left;
  const canvasY = event.clientY - rect.top;
  scale = nextScale;
  translateX = canvasX - before.x * scale;
  translateY = canvasY - before.y * scale;
  renderCanvas();
}, { passive: false });

canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  closeNumberedImportPurchaseMenu();
  panState = {
    active: true,
    moved: false,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originTranslateX: translateX,
    originTranslateY: translateY
  };
  canvasContainer.classList.add("is-panning");
});

window.addEventListener("mousemove", (event) => {
  if (panState.active) {
    const dx = event.clientX - panState.startClientX;
    const dy = event.clientY - panState.startClientY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      panState.moved = true;
      translateX = panState.originTranslateX + dx;
      translateY = panState.originTranslateY + dy;
      renderCanvas();
    }
  }
  if (!event.target || !canvasContainer.contains(event.target)) return;
  updateHoverAtClientPosition(event.clientX, event.clientY);
});

window.addEventListener("mouseup", (event) => {
  if (!panState.active) return;
  const wasMoved = panState.moved;
  panState.active = false;
  canvasContainer.classList.remove("is-panning");
  if (!wasMoved && event.target && canvasContainer.contains(event.target)) {
    handleCanvasClick(event.clientX, event.clientY);
  }
});

canvas.addEventListener("mouseleave", () => {
  clearHoverSeat();
  if (!numberedImportDraggingRefNo && clearNumberedImportHoverPreview()) {
    renderCanvas();
  }
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const world = clientToWorld(event.clientX, event.clientY);
  const hit = hitTestSeat(world.x, world.y);
  if (!hit) {
    closeNumberedImportPurchaseMenu();
    renderCanvas();
    return;
  }
  const refNo = String(numberedImportAssignmentsBySeatId.get(hit.seatId) || "").trim();
  if (!refNo) {
    closeNumberedImportPurchaseMenu();
    renderCanvas();
    return;
  }
  selectNumberedImportPurchase(refNo);
  openNumberedImportPurchaseMenu(event.clientX, event.clientY, refNo, hit.rowId || "");
});

canvasContainer.addEventListener("dragover", (event) => {
  if (!numberedImportReady) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  updateHoverAtClientPosition(event.clientX, event.clientY);
});

canvasContainer.addEventListener("dragleave", () => {
  if (!numberedImportDraggingRefNo) return;
  if (clearNumberedImportHoverPreview()) renderCanvas();
});

canvasContainer.addEventListener("drop", (event) => {
  if (!numberedImportReady) return;
  event.preventDefault();
  const droppedRefNo = event.dataTransfer?.getData("text/plain") || numberedImportDraggingRefNo;
  const world = clientToWorld(event.clientX, event.clientY);
  if (droppedRefNo) {
    selectNumberedImportPurchase(droppedRefNo);
    handleNumberedImportCanvasPlacement(world.x, world.y, droppedRefNo);
  }
  numberedImportDraggingRefNo = "";
});

document.addEventListener("click", (event) => {
  if (
    numberedImportPurchaseMenu.classList.contains("open") &&
    !numberedImportPurchaseMenu.contains(event.target)
  ) {
    closeNumberedImportPurchaseMenu();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.isComposing) return;
  const target = event.target;
  const tagName = target?.tagName ? target.tagName.toLowerCase() : "";
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return;
  }

  if ((event.ctrlKey || event.metaKey) && (event.key === "s" || event.key === "S")) {
    event.preventDefault();
    if (!numberedImportExportBtn.disabled) numberedImportExportBtn.click();
    return;
  }

  if (event.key === "Escape") {
    closeNumberedImportPurchaseMenu();
    if (clearNumberedImportHoverPreview()) renderCanvas();
    return;
  }
  if (event.key === "o" || event.key === "O") {
    event.preventDefault();
    cycleOverlayMode();
    return;
  }
  if (event.key === "i" || event.key === "I") {
    event.preventDefault();
    cycleSeatLabelMode();
    return;
  }
  if (event.key === "Home" || event.key === "1") {
    event.preventDefault();
    zoomFit();
  }
});

window.addEventListener("resize", () => {
  resizeCanvas();
});

function toggleRightPanel(button) {
  const card = button?.closest(".c-card, .card");
  if (!card) return;
  const body = card.querySelector(".c-card__body, .card__body");
  const collapsed = card.dataset.collapsed === "true" || card.classList.contains("c-card--collapsed");
  const nextCollapsed = !collapsed;
  card.dataset.collapsed = nextCollapsed ? "true" : "false";
  card.classList.toggle("c-card--collapsed", nextCollapsed);
  if (body) body.hidden = nextCollapsed;
  button.setAttribute("aria-expanded", nextCollapsed ? "false" : "true");
}

window.toggleRightPanel = toggleRightPanel;

function updateLayoutMeta() {
  if (!layoutMetaEl) return;
  if (!seats.length) {
    layoutMetaEl.textContent = "Load a TLT file to begin.";
    return;
  }
  const sectionCount = new Set(seats.map((seat) => seat.sectionId).filter(Boolean)).size;
  layoutMetaEl.textContent = `${getNumberedImportCurrentFileName()} | ${sectionCount} section(s) | ${seats.length} seat(s)`;
}

function updateCanvasStatus() {
  if (!canvasStatusEl) return;
  if (!seats.length) {
    canvasStatusEl.textContent = "Ingen layout laddad";
    return;
  }
  const percent = Math.round(scale * 100);
  canvasStatusEl.textContent = `${seats.length} seats | zoom ${percent}% | drag to pan | wheel to zoom`;
}

function setNumberedImportIssues(errors = [], warnings = []) {
  const lines = [];
  if (errors.length) {
    lines.push("Errors:");
    errors.slice(0, 12).forEach((message) => lines.push(`- ${message}`));
    if (errors.length > 12) lines.push(`- ... ${errors.length - 12} more`);
  }
  if (warnings.length) {
    if (lines.length) lines.push("");
    lines.push("Warnings:");
    warnings.slice(0, 8).forEach((message) => lines.push(`- ${message}`));
    if (warnings.length > 8) lines.push(`- ... ${warnings.length - 8} more`);
  }

  if (!lines.length) {
    numberedImportErrors.textContent = "";
    numberedImportIssuesSummary.textContent = "Warnings (0)";
    numberedImportIssues.classList.remove("is-visible");
    numberedImportIssues.open = false;
    return;
  }

  if (warnings.length > 0) {
    numberedImportIssuesSummary.textContent = errors.length > 0
      ? `Warnings (${warnings.length}) | Errors (${errors.length})`
      : `Warnings (${warnings.length})`;
  } else {
    numberedImportIssuesSummary.textContent = `Errors (${errors.length})`;
  }

  numberedImportErrors.textContent = lines.join("\n");
  numberedImportIssues.classList.add("is-visible");
  numberedImportIssues.open = false;
}

function syncRightPanelCards() {
  document.querySelectorAll("#right-panels .c-card[data-collapsible='true']").forEach((card) => {
    const toggle = card.querySelector(".c-card__toggle, .card__toggle");
    const body = card.querySelector(".c-card__body, .card__body");
    if (!toggle || !body) return;
    const startCollapsed = card.getAttribute("data-collapsed") === "true";
    card.classList.toggle("c-card--collapsed", startCollapsed);
    body.hidden = startCollapsed;
    toggle.setAttribute("aria-expanded", startCollapsed ? "false" : "true");
  });
}

function initialize() {
  syncRightPanelCards();
  resizeCanvas();
  showSectionNames = !!viewSectionNamesToggle.checked;
  setOverlayMode("goodness", true);
  setSeatLabelMode("none", true);
  setNumberedImportIssues([], []);
  updateLayoutMeta();
  updateNumberedImportStateUi();
  renderCanvas();
}

initialize();
