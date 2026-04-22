(() => {
  const BUTTON_TEXT = "Copy CodeWhere";
  const COPIED_TEXT = "Copied";
  const ERROR_TEXT = "Unavailable";
  const STATUS_TIMEOUT_MS = 1600;
  const MAX_ANCHOR_LENGTH = 160;
  const ICON_PATH = chrome.runtime.getURL("icons/icon-32.png");

  const buttonTimers = new WeakMap();
  let embeddedDataCache = null;
  let embeddedDataSignature = null;
  let syncScheduled = false;

  init();

  function init() {
    if (!document.body) {
      return;
    }

    scheduleSync();

    document.addEventListener("turbo:load", scheduleSync);
    document.addEventListener("turbo:render", scheduleSync);
    document.addEventListener("pjax:end", scheduleSync);
    window.addEventListener("hashchange", scheduleSync);

    const observer = new MutationObserver(() => {
      scheduleSync();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function scheduleSync() {
    if (syncScheduled) {
      return;
    }

    syncScheduled = true;
    window.requestAnimationFrame(() => {
      syncScheduled = false;
      syncBlobButton();
      syncDiffButtons();
    });
  }

  function syncBlobButton() {
    const rawButton = document.querySelector('a[data-testid="raw-button"]');
    const rawSlot = rawButton?.parentElement;
    const group = rawSlot?.parentElement;
    if (
      !rawButton ||
      !rawSlot ||
      !group ||
      !group.querySelector(
        '[data-testid="copy-raw-button"], [data-testid="download-raw-button"]'
      )
    ) {
      return;
    }

    // GitHub hashes Primer class names, so anchor off the stable raw-action
    // test ids and the local DOM structure instead of a generated class.
    if (group.querySelector('[data-codewhere-button="blob"]')) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "codewhere-button-wrap";
    wrapper.dataset.codewhereButton = "blob";
    wrapper.appendChild(createButton(() => buildBlobContext()));

    group.insertBefore(wrapper, rawSlot);
  }

  function syncDiffButtons() {
    const headers = document.querySelectorAll('.file .file-header[data-path]');

    headers.forEach((header) => {
      const actions =
        header.querySelector(".file-actions .d-flex") ||
        header.querySelector(".file-actions");

      if (!actions || actions.querySelector('[data-codewhere-button="diff"]')) {
        return;
      }

      const fileElement = header.closest(".file");
      if (!fileElement) {
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.className = "codewhere-button-wrap";
      wrapper.dataset.codewhereButton = "diff";
      wrapper.appendChild(createButton(() => buildDiffContext(fileElement)));

      actions.prepend(wrapper);
    });
  }

  function createButton(resolver) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "codewhere-button";
    button.title = "Copy CodeWhere Context";
    renderButtonContents(button, BUTTON_TEXT);

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      button.disabled = true;

      try {
        const snapshot = resolver();
        const payload = snapshot ? formatSnapshot(snapshot) : "";

        if (!payload) {
          setButtonState(button, ERROR_TEXT, "error");
          return;
        }

        await copyText(payload);
        setButtonState(button, COPIED_TEXT, "success");
      } catch (error) {
        console.error("CodeWhere copy failed", error);
        setButtonState(button, ERROR_TEXT, "error");
      }
    });

    return button;
  }

  function setButtonState(button, label, status) {
    const priorTimer = buttonTimers.get(button);
    if (priorTimer) {
      window.clearTimeout(priorTimer);
    }

    renderButtonContents(button, label);
    button.dataset.codewhereStatus = status;

    const timer = window.setTimeout(() => {
      button.disabled = false;
      renderButtonContents(button, BUTTON_TEXT);
      button.removeAttribute("data-codewhere-status");
      buttonTimers.delete(button);
    }, STATUS_TIMEOUT_MS);

    buttonTimers.set(button, timer);
  }

  function renderButtonContents(button, label) {
    button.replaceChildren(createButtonIcon(), createButtonLabel(label));
  }

  function createButtonIcon() {
    const icon = document.createElement("img");
    icon.className = "codewhere-button-icon";
    icon.src = ICON_PATH;
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function createButtonLabel(label) {
    const span = document.createElement("span");
    span.className = "codewhere-button-label";
    span.textContent = label;
    return span;
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      if (!document.execCommand("copy")) {
        throw new Error("document.execCommand('copy') failed");
      }
    } finally {
      textarea.remove();
    }
  }

  function formatSnapshot(snapshot) {
    const lines = [];

    appendSnapshotLine(lines, "path", snapshot.filePath);
    appendSnapshotLine(lines, "symbol", snapshot.symbol);

    if (
      Number.isInteger(snapshot.startLine) &&
      Number.isInteger(snapshot.endLine)
    ) {
      appendSnapshotLine(
        lines,
        "lines",
        formatLineRange(snapshot.startLine, snapshot.endLine)
      );
    }

    appendSnapshotLine(lines, "anchor", snapshot.anchor);

    return lines.join("\n");
  }

  function appendSnapshotLine(lines, key, value) {
    if (!value) {
      return;
    }

    lines.push(`${key}: ${value}`);
  }

  function formatLineRange(startLine, endLine) {
    return startLine === endLine ? String(startLine) : `${startLine}-${endLine}`;
  }

  function buildBlobContext() {
    const filePath = resolveBlobPath();
    if (!filePath) {
      return null;
    }

    const codeRoot = document.querySelector(".react-code-file-contents");
    const lineInfo =
      resolveBlobSelection(codeRoot) ||
      resolveBlobHashSelection(codeRoot) ||
      resolveBlobFallback(codeRoot);

    return {
      filePath,
      symbol: null,
      startLine: lineInfo?.startLine ?? null,
      endLine: lineInfo?.endLine ?? null,
      anchor: lineInfo?.anchor ?? null,
    };
  }

  function resolveBlobPath() {
    const embeddedData = readEmbeddedData();
    const rawButton = document.querySelector('a[data-testid="raw-button"]');
    const rawPath = resolvePathFromRawUrl(rawButton?.href, embeddedData);
    if (isUsableRepoPath(rawPath)) {
      return rawPath;
    }

    const breadcrumbPath = resolvePathFromBreadcrumbs();
    if (isUsableRepoPath(breadcrumbPath)) {
      return breadcrumbPath;
    }

    const embeddedPath = resolveEmbeddedBlobPath(embeddedData);
    if (isUsableRepoPath(embeddedPath)) {
      return embeddedPath;
    }

    const locationPath = resolvePathFromLocation(embeddedData);
    if (isUsableRepoPath(locationPath)) {
      return locationPath;
    }

    return null;
  }

  function readEmbeddedData() {
    const scripts = Array.from(
      document.querySelectorAll('script[data-target="react-app.embeddedData"]')
    );
    const texts = scripts
      .map((script) => script.textContent?.trim() || "")
      .filter(Boolean);
    const signature = texts.join("\n<!-- codewhere -->\n");

    if (!signature) {
      embeddedDataCache = null;
      embeddedDataSignature = null;
      return null;
    }

    if (signature === embeddedDataSignature) {
      return embeddedDataCache;
    }

    embeddedDataSignature = signature;
    embeddedDataCache = null;

    for (let index = texts.length - 1; index >= 0; index -= 1) {
      try {
        const parsed = JSON.parse(texts[index]);
        if (!embeddedDataCache) {
          embeddedDataCache = parsed;
        }

        if (isUsableRepoPath(resolveEmbeddedBlobPath(parsed))) {
          embeddedDataCache = parsed;
          break;
        }
      } catch (error) {
        console.error("CodeWhere failed to parse GitHub embedded data", error);
      }
    }

    return embeddedDataCache;
  }

  function resolveEmbeddedBlobPath(embeddedData) {
    const path =
      embeddedData?.payload?.codeViewBlobLayoutRoute?.path ||
      embeddedData?.payload?.codeViewLayoutRoute?.path ||
      embeddedData?.payload?.codeViewBlobRoute?.path;

    return isUsableRepoPath(path) ? path : null;
  }

  function resolvePathFromRawUrl(rawUrl, embeddedData) {
    if (!rawUrl) {
      return null;
    }

    try {
      const url = new URL(rawUrl);
      const pathFromRef = stripGitHubPathPrefix({
        pathname: url.pathname,
        marker: "/raw/",
        refName:
          embeddedData?.payload?.codeViewBlobLayoutRoute?.refInfo?.name ||
          embeddedData?.payload?.codeViewLayoutRoute?.refInfo?.name,
      });

      if (isUsableRepoPath(pathFromRef)) {
        return pathFromRef;
      }

      const segments = url.pathname.split("/").filter(Boolean);
      const rawIndex = segments.indexOf("raw");
      if (rawIndex === -1) {
        return null;
      }

      if (
        segments[rawIndex + 1] === "refs" &&
        (segments[rawIndex + 2] === "heads" || segments[rawIndex + 2] === "tags")
      ) {
        return decodeURIComponent(segments.slice(rawIndex + 4).join("/"));
      }

      return decodeURIComponent(segments.slice(rawIndex + 2).join("/"));
    } catch {
      return null;
    }
  }

  function resolvePathFromBreadcrumbs() {
    const breadcrumbs = document.querySelector('nav[data-testid="breadcrumbs"]');
    const fileName =
      document.querySelector('[data-testid="breadcrumbs-filename"]')?.textContent?.trim() ||
      document.querySelector("#sticky-file-name-id")?.textContent?.trim();

    if (!breadcrumbs || !fileName) {
      return null;
    }

    const segments = Array.from(
      breadcrumbs.querySelectorAll('a[href*="/tree/"]')
    )
      .slice(1)
      .map((link) => link.textContent?.trim())
      .filter(Boolean);

    return [...segments, fileName].join("/");
  }

  function resolvePathFromLocation(embeddedData) {
    return stripGitHubPathPrefix({
      pathname: window.location.pathname,
      marker: "/blob/",
      refName:
        embeddedData?.payload?.codeViewBlobLayoutRoute?.refInfo?.name ||
        embeddedData?.payload?.codeViewLayoutRoute?.refInfo?.name,
    });
  }

  function stripGitHubPathPrefix({ pathname, marker, refName }) {
    if (!pathname || !marker || !refName) {
      return null;
    }

    const prefixMatch = pathname.match(/^\/[^/]+\/[^/]+/);
    if (!prefixMatch) {
      return null;
    }

    const prefix = `${prefixMatch[0]}${marker}${refName}/`;
    if (!pathname.startsWith(prefix)) {
      return null;
    }

    return decodeURIComponent(pathname.slice(prefix.length));
  }

  function isUsableRepoPath(value) {
    return typeof value === "string" && value !== "/" && value.trim() !== "";
  }

  function resolveBlobSelection(codeRoot) {
    if (!codeRoot) {
      return null;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const startLineElement = closestBlobLineElement(range.startContainer, codeRoot);
    const endLineElement = closestBlobLineElement(range.endContainer, codeRoot);

    if (!startLineElement || !endLineElement) {
      return null;
    }

    const startLine = parseLineNumber(startLineElement.dataset.lineNumber);
    const endLine = parseLineNumber(endLineElement.dataset.lineNumber);
    if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) {
      return null;
    }

    return buildBlobLineInfo(codeRoot, startLine, endLine);
  }

  function resolveBlobHashSelection(codeRoot) {
    if (!codeRoot) {
      return null;
    }

    const match = window.location.hash.match(/^#L(?:C)?(\d+)(?:-L(?:C)?(\d+))?$/i);
    if (!match) {
      return null;
    }

    return buildBlobLineInfo(
      codeRoot,
      parseLineNumber(match[1]),
      parseLineNumber(match[2] || match[1])
    );
  }

  function resolveBlobFallback(codeRoot) {
    if (!codeRoot) {
      return null;
    }

    const lines = Array.from(
      codeRoot.querySelectorAll(".react-file-line[data-line-number]")
    );

    const firstNonEmptyLine =
      lines.find((line) => normalizeAnchor(line.textContent)) || lines[0];

    if (!firstNonEmptyLine) {
      return null;
    }

    const lineNumber = parseLineNumber(firstNonEmptyLine.dataset.lineNumber);
    if (!Number.isInteger(lineNumber)) {
      return null;
    }

    return buildBlobLineInfo(codeRoot, lineNumber, lineNumber);
  }

  function buildBlobLineInfo(codeRoot, startLine, endLine) {
    if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) {
      return null;
    }

    const from = Math.min(startLine, endLine);
    const to = Math.max(startLine, endLine);

    return {
      startLine: from,
      endLine: to,
      anchor: resolveBlobAnchor(codeRoot, from, to),
    };
  }

  function closestBlobLineElement(node, codeRoot) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const lineElement = element?.closest(".react-file-line[data-line-number]");

    return lineElement && codeRoot.contains(lineElement) ? lineElement : null;
  }

  function resolveBlobAnchor(codeRoot, startLine, endLine) {
    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
      const text = getBlobLineText(codeRoot, lineNumber);
      if (text) {
        return text;
      }
    }

    return null;
  }

  function getBlobLineText(codeRoot, lineNumber) {
    const lineElement =
      codeRoot.querySelector(
        `.react-file-line[data-line-number="${lineNumber}"]`
      ) || codeRoot.querySelector(`#LC${lineNumber}`);

    return normalizeAnchor(lineElement?.textContent || "");
  }

  function buildDiffContext(fileElement) {
    const header = fileElement.querySelector(".file-header[data-path]");
    const filePath = header?.dataset.path;

    if (!filePath) {
      return null;
    }

    const lineInfo =
      resolveDiffSelection(fileElement) ||
      resolveDiffHashSelection(fileElement, header.dataset.anchor || "") ||
      resolveDiffFallback(fileElement);

    return {
      filePath,
      symbol: null,
      startLine: lineInfo?.startLine ?? null,
      endLine: lineInfo?.endLine ?? null,
      anchor: lineInfo?.anchor ?? null,
    };
  }

  function resolveDiffSelection(fileElement) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const startInfo = closestDiffLineInfo(range.startContainer, fileElement);
    const endInfo = closestDiffLineInfo(range.endContainer, fileElement);

    if (!startInfo || !endInfo) {
      return null;
    }

    const startLine = Math.min(startInfo.lineNumber, endInfo.lineNumber);
    const endLine = Math.max(startInfo.lineNumber, endInfo.lineNumber);

    return {
      startLine,
      endLine,
      anchor:
        resolveDiffAnchor(fileElement, startLine, endLine, startInfo.side) ||
        startInfo.anchor ||
        endInfo.anchor,
    };
  }

  function resolveDiffHashSelection(fileElement, anchorPrefix) {
    const hash = window.location.hash.slice(1);
    if (!anchorPrefix || !hash.startsWith(anchorPrefix)) {
      return null;
    }

    const suffix = hash.slice(anchorPrefix.length);
    const match = suffix.match(/^([LR])(\d+)(?:-[LR]?(\d+))?$/i);

    if (!match) {
      return resolveDiffFallback(fileElement);
    }

    const side = match[1].toUpperCase();
    const startLine = parseLineNumber(match[2]);
    const endLine = parseLineNumber(match[3] || match[2]);
    if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) {
      return null;
    }

    const from = Math.min(startLine, endLine);
    const to = Math.max(startLine, endLine);

    return {
      startLine: from,
      endLine: to,
      anchor: resolveDiffAnchor(fileElement, from, to, side),
    };
  }

  function resolveDiffFallback(fileElement) {
    const lines = collectDiffLines(fileElement);
    if (!lines.length) {
      return null;
    }

    const firstLine = lines.find((line) => line.anchor) || lines[0];

    return {
      startLine: firstLine.lineNumber,
      endLine: firstLine.lineNumber,
      anchor: firstLine.anchor,
    };
  }

  function resolveDiffAnchor(fileElement, startLine, endLine, preferredSide) {
    const lines = collectDiffLines(fileElement, preferredSide);

    for (const line of lines) {
      if (line.lineNumber < startLine || line.lineNumber > endLine) {
        continue;
      }

      if (line.anchor) {
        return line.anchor;
      }
    }

    return null;
  }

  function collectDiffLines(fileElement, preferredSide) {
    const rows = fileElement.querySelectorAll("tr");
    const lines = [];

    rows.forEach((row) => {
      const line = resolveDiffLineFromRow(row, null, preferredSide);
      if (line) {
        lines.push(line);
      }
    });

    return lines;
  }

  function closestDiffLineInfo(node, fileElement) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) {
      return null;
    }

    const row = element.closest("tr");
    if (!row || !fileElement.contains(row)) {
      return null;
    }

    const hintCell = element.closest(
      'td.blob-num[data-line-number], td.blob-code, td.blob-code-inner'
    );

    return resolveDiffLineFromRow(row, hintCell);
  }

  function resolveDiffLineFromRow(row, hintCell, preferredSide) {
    const lineCells = Array.from(
      row.querySelectorAll('td.blob-num[data-line-number]')
    ).filter((cell) => /^\d+$/.test(cell.dataset.lineNumber || ""));

    if (!lineCells.length) {
      return null;
    }

    const codeCells = Array.from(
      row.querySelectorAll("td.blob-code, td.blob-code-inner")
    ).filter(
      (cell) =>
        !cell.classList.contains("blob-code-hunk") &&
        !cell.classList.contains("blob-num")
    );

    if (!codeCells.length) {
      return null;
    }

    const side = resolvePreferredSide(hintCell, lineCells, codeCells, preferredSide);
    const lineCell = chooseLineCell(lineCells, side);
    if (!lineCell) {
      return null;
    }

    const lineNumber = parseLineNumber(lineCell.dataset.lineNumber);
    if (!Number.isInteger(lineNumber)) {
      return null;
    }

    const codeCell = chooseCodeCell(codeCells, side);
    return {
      lineNumber,
      side,
      anchor: normalizeAnchor(codeCell?.textContent || codeCells[0]?.textContent || ""),
    };
  }

  function resolvePreferredSide(hintCell, lineCells, codeCells, preferredSide) {
    if (preferredSide) {
      return preferredSide;
    }

    if (hintCell?.matches('td.blob-num[data-line-number]')) {
      return inferSideFromLineCell(hintCell) || "R";
    }

    if (hintCell?.matches("td.blob-code, td.blob-code-inner")) {
      if (
        hintCell.classList.contains("blob-code-deletion") ||
        hintCell.classList.contains("blob-code-marker-deletion")
      ) {
        return "L";
      }

      if (
        hintCell.classList.contains("blob-code-addition") ||
        hintCell.classList.contains("blob-code-marker-addition")
      ) {
        return "R";
      }
    }

    if (lineCells.length === 1) {
      return inferSideFromLineCell(lineCells[0]) || "R";
    }

    const hasDeletionCell = codeCells.some((cell) =>
      cell.classList.contains("blob-code-deletion")
    );
    if (hasDeletionCell) {
      return "L";
    }

    return "R";
  }

  function chooseLineCell(lineCells, side) {
    if (side === "L") {
      return (
        lineCells.find((cell) => inferSideFromLineCell(cell) === "L") ||
        lineCells[0]
      );
    }

    return (
      lineCells.find((cell) => inferSideFromLineCell(cell) === "R") ||
      lineCells[lineCells.length - 1]
    );
  }

  function chooseCodeCell(codeCells, side) {
    if (side === "L") {
      return (
        codeCells.find((cell) => cell.classList.contains("blob-code-deletion")) ||
        codeCells[0]
      );
    }

    return (
      codeCells.find((cell) => cell.classList.contains("blob-code-addition")) ||
      codeCells[codeCells.length - 1]
    );
  }

  function inferSideFromLineCell(lineCell) {
    const id = lineCell.id || "";
    const match = id.match(/([LR])\d+$/);
    if (match) {
      return match[1];
    }

    if (lineCell.classList.contains("blob-num-deletion")) {
      return "L";
    }

    if (
      lineCell.classList.contains("blob-num-addition") ||
      lineCell.classList.contains("js-blob-rnum")
    ) {
      return "R";
    }

    return null;
  }

  function parseLineNumber(value) {
    const lineNumber = Number.parseInt(value || "", 10);
    return Number.isInteger(lineNumber) ? lineNumber : null;
  }

  function normalizeAnchor(value) {
    if (!value) {
      return null;
    }

    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized) {
      return null;
    }

    if (normalized.length <= MAX_ANCHOR_LENGTH) {
      return normalized;
    }

    return `${normalized.slice(0, MAX_ANCHOR_LENGTH - 3)}...`;
  }
})();
