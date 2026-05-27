const MAX_RFC = 9999;
const ATTEMPT_LIMIT = 25;

const nextBtn = document.getElementById("nextBtn");
const openBtn = document.getElementById("openBtn");
const currentLink = document.getElementById("currentLink");
const currentNum = document.getElementById("currentNum");
const statusPill = document.getElementById("statusPill");
const rfcContainer = document.getElementById("rfcContainer");
const rfcFrame = document.getElementById("rfcFrame");
const textSettingsBtn = document.getElementById("textSettingsBtn");
const textSettingsPanel = document.getElementById("textSettingsPanel");
const fontSizeInput = document.getElementById("fontSize");
const fontSizeVal = document.getElementById("fontSizeVal");
const lineHeightInput = document.getElementById("lineHeight");
const lineHeightVal = document.getElementById("lineHeightVal");
const fontFamilyInput = document.getElementById("fontFamily");
const textAlignInput = document.getElementById("textAlign");
const rfcThemeInput = document.getElementById("rfcTheme");
const maxWidthInput = document.getElementById("maxWidth");
const paraGapInput = document.getElementById("paraGap");
const paraGapVal = document.getElementById("paraGapVal");
const resetTextSettingsBtn = document.getElementById("resetTextSettings");
const translateBtn = document.getElementById("translateBtn");
const rfcSearchInput = document.getElementById("rfcSearchInput");
const rfcSearchBtn = document.getElementById("rfcSearchBtn");

const TEXT_SETTINGS_KEY = "rfc-random-text-settings";

const DEFAULT_TEXT_SETTINGS = {
  fontSize: 16.5,
  lineHeight: 1.72,
  fontFamily: "system",
  textAlign: "justify",
  theme: "dark",
  maxWidth: "100%",
  paraGap: 12,
};

const FONT_FAMILIES = {
  system:
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
};

function pad4(n) {
  return String(n).padStart(4, "0");
}

function parseRfcNumber(value) {
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < 1 || i > MAX_RFC) return null;
  return i;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rfcUrl(n) {
  // rfc-editor hosts both .txt and .html; HTML is nicer for iframe.
  return `https://www.rfc-editor.org/rfc/rfc${n}.html`;
}

function rfcTextUrl(n) {
  // Plain RFC content without HTML/CSS.
  return `https://www.rfc-editor.org/rfc/rfc${n}.txt`;
}

function setStatus(text, kind = "idle") {
  statusPill.textContent = text;
  const colors = {
    idle: "rgba(255,255,255,0.08)",
    loading: "rgba(124,92,255,0.22)",
    ok: "rgba(45,212,191,0.18)",
    error: "rgba(239,68,68,0.18)",
  };
  statusPill.style.background = colors[kind] || colors.idle;
  statusPill.style.borderColor = "rgba(255,255,255,0.12)";
}

function setCurrent(n, url) {
  currentNum.textContent = n;

  currentLink.textContent = `rfc${n}.html`;
  currentLink.href = url;

  openBtn.href = url;
  openBtn.setAttribute("aria-disabled", "false");
}

function showContainer() {
  rfcContainer.hidden = false;
  rfcContainer.setAttribute("aria-busy", "false");
  rfcFrame.hidden = true;
  rfcFrame.src = "";
  translateBtn.disabled = false;
}

function showIframe() {
  rfcContainer.hidden = true;
  rfcContainer.setAttribute("aria-busy", "false");
  rfcFrame.hidden = false;
  translateBtn.disabled = true;
  resetTranslationState();
}

function loadTextSettings() {
  try {
    const raw = localStorage.getItem(TEXT_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_TEXT_SETTINGS };
    return { ...DEFAULT_TEXT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TEXT_SETTINGS };
  }
}

function saveTextSettings(settings) {
  localStorage.setItem(TEXT_SETTINGS_KEY, JSON.stringify(settings));
}

function applyTextSettings(settings) {
  rfcContainer.style.setProperty("--rfc-font-size", `${settings.fontSize}px`);
  rfcContainer.style.setProperty("--rfc-line-height", String(settings.lineHeight));
  rfcContainer.style.setProperty(
    "--rfc-font-family",
    FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.system
  );
  rfcContainer.style.setProperty("--rfc-text-align", settings.textAlign);
  rfcContainer.style.setProperty("--rfc-para-gap", `${settings.paraGap}px`);

  if (settings.theme === "dark") {
    rfcContainer.style.setProperty("--rfc-bg", "rgba(3, 7, 18, 0.95)");
    rfcContainer.style.setProperty("--rfc-fg", "rgba(255, 255, 255, 0.9)");
    rfcContainer.style.setProperty("--rfc-link", "#93c5fd");
    rfcContainer.style.setProperty("--rfc-link-hover", "#bfdbfe");
    rfcContainer.style.setProperty("--rfc-pre-bg", "rgba(255, 255, 255, 0.06)");
    rfcContainer.style.setProperty("--rfc-pre-border", "rgba(255, 255, 255, 0.12)");
    rfcContainer.style.setProperty("--rfc-code-bg", "rgba(255, 255, 255, 0.08)");
    rfcContainer.style.setProperty("--rfc-code-border", "rgba(255, 255, 255, 0.14)");
    rfcContainer.style.setProperty("--rfc-selection", "rgba(147, 197, 253, 0.25)");
    rfcContainer.style.setProperty("--rfc-table-border", "rgba(255, 255, 255, 0.14)");
    rfcContainer.style.setProperty("--rfc-table-header-bg", "rgba(255, 255, 255, 0.05)");
  } else {
    rfcContainer.style.setProperty("--rfc-bg", "rgba(255, 255, 255, 0.96)");
    rfcContainer.style.setProperty("--rfc-fg", "rgba(0, 0, 0, 0.88)");
    rfcContainer.style.setProperty("--rfc-link", "#2563eb");
    rfcContainer.style.setProperty("--rfc-link-hover", "#1d4ed8");
    rfcContainer.style.setProperty("--rfc-pre-bg", "rgba(2, 6, 23, 0.06)");
    rfcContainer.style.setProperty("--rfc-pre-border", "rgba(2, 6, 23, 0.12)");
    rfcContainer.style.setProperty("--rfc-code-bg", "rgba(2, 6, 23, 0.06)");
    rfcContainer.style.setProperty("--rfc-code-border", "rgba(2, 6, 23, 0.1)");
    rfcContainer.style.setProperty("--rfc-selection", "rgba(124, 92, 255, 0.25)");
    rfcContainer.style.setProperty("--rfc-table-border", "rgba(0, 0, 0, 0.14)");
    rfcContainer.style.setProperty("--rfc-table-header-bg", "rgba(0, 0, 0, 0.03)");
  }

  if (settings.maxWidth === "100%") {
    rfcContainer.style.setProperty("--rfc-max-width", "none");
    rfcContainer.style.setProperty("--rfc-column-margin", "0");
  } else {
    rfcContainer.style.setProperty("--rfc-max-width", settings.maxWidth);
    rfcContainer.style.setProperty("--rfc-column-margin", "auto");
  }
}

function readTextSettingsFromUI() {
  return {
    fontSize: Number(fontSizeInput.value),
    lineHeight: Number(lineHeightInput.value),
    fontFamily: fontFamilyInput.value,
    textAlign: textAlignInput.value,
    theme: rfcThemeInput.value,
    maxWidth: maxWidthInput.value,
    paraGap: Number(paraGapInput.value),
  };
}

function syncTextSettingsUI(settings) {
  fontSizeInput.value = String(settings.fontSize);
  fontSizeVal.textContent = `${settings.fontSize} px`;
  lineHeightInput.value = String(settings.lineHeight);
  lineHeightVal.textContent = String(settings.lineHeight);
  fontFamilyInput.value = settings.fontFamily;
  textAlignInput.value = settings.textAlign;
  rfcThemeInput.value = settings.theme;
  maxWidthInput.value = settings.maxWidth;
  paraGapInput.value = String(settings.paraGap);
  paraGapVal.textContent = `${settings.paraGap} px`;
}

function initTextSettings() {
  const settings = loadTextSettings();
  syncTextSettingsUI(settings);
  applyTextSettings(settings);

  const onChange = () => {
    const next = readTextSettingsFromUI();
    syncTextSettingsUI(next);
    applyTextSettings(next);
    saveTextSettings(next);
  };

  fontSizeInput.addEventListener("input", onChange);
  lineHeightInput.addEventListener("input", onChange);
  fontFamilyInput.addEventListener("change", onChange);
  textAlignInput.addEventListener("change", onChange);
  rfcThemeInput.addEventListener("change", onChange);
  maxWidthInput.addEventListener("change", onChange);
  paraGapInput.addEventListener("input", onChange);

  resetTextSettingsBtn.addEventListener("click", () => {
    syncTextSettingsUI(DEFAULT_TEXT_SETTINGS);
    applyTextSettings(DEFAULT_TEXT_SETTINGS);
    saveTextSettings(DEFAULT_TEXT_SETTINGS);
  });

  textSettingsBtn.addEventListener("click", () => {
    const open = textSettingsPanel.hidden;
    textSettingsPanel.hidden = !open;
    textSettingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

async function renderRFCViaFetch(url) {
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const body = await res.text();

  function cleanupEmptyBlocks(root) {
    // Remove elements that render as empty rounded boxes in our CSS.
    // We keep normal paragraphs/headings; target only elements that typically have
    // backgrounds/borders (pre/blockquote) plus truly empty containers.
    // Includes: whitespace, NBSP, zero-width, bidi marks, word-joiner, direction controls.
    const stripInvisible = (s) =>
      s.replace(/[\s\u00a0\u200B-\u200F\u202A-\u202E\u2060\uFEFF]+/g, "");

    // TOC container with no entries can remain as an empty rounded box.
    root.querySelectorAll(".rfc-toc").forEach((toc) => {
      if (!toc.querySelector("li")) toc.remove();
    });

    root.querySelectorAll("pre, blockquote, div, p").forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const raw = (el.textContent || "").replace(/\u00a0/g, " ");
      const text = raw.trim();
      if (!text) {
        // Keep structural containers with children.
        if (tag === "div" && el.children.length) return;
        if (tag === "p") return;
        el.remove();
        return;
      }

      const compact = stripInvisible(text);
      const hasAlnum = /[A-Za-z0-9]/.test(text);

      // Remove tiny / nearly-empty code boxes that look like empty rounded rectangles.
      if (tag === "pre") {
        // Examples: blocks that are just a couple of punctuation chars or whitespace lines.
        if (compact.length <= 6) {
          el.remove();
          return;
        }
        // If it contains no letters/digits, it is almost always a visual filler (lines/dots)
        // that becomes a big empty box in our theme.
        if (!hasAlnum) {
          el.remove();
          return;
        }
      }

      if (tag === "blockquote") {
        if (!hasAlnum && compact.length <= 20) {
          el.remove();
          return;
        }
      }
    });
  }

  // If we loaded a plain-text RFC (.txt), reflow it into paragraphs so it uses full width.
  if (!body.trim().startsWith("<")) {
    const normalized = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");

    function sectionAnchorId(sectionNum) {
      return `sec-${String(sectionNum).replace(/\./g, "-")}`;
    }

    /**
     * RFC TOC dot leaders: spaced " . . . " or contiguous "...."
     * Supports: "1. Title ... 4", "Appendix A. Title ... 13", "A.1. Title ... 14"
     */
    function parseTocLine(line) {
      const s = line.replace(/\s+/g, " ").trim();

      let m = s.match(/^Appendix\s+([A-Z])\.\s+(.+?)(\d+)$/i);
      if (m) {
        const dotIdx = m[2].search(/(?:\s+\.){2,}|\.{3,}/);
        if (dotIdx === -1) return null;
        return {
          num: m[1],
          title: m[2].slice(0, dotIdx).trim(),
          page: m[3],
          displayNum: `Appendix ${m[1]}`,
        };
      }

      m = s.match(/^((?:\d+(?:\.\d+)*)|(?:[A-Z](?:\.\d+)*))\.\s+(.+?)(\d+)$/);
      if (!m) return null;
      const dotIdx = m[2].search(/(?:\s+\.){2,}|\.{3,}/);
      if (dotIdx === -1) return null;
      const title = m[2].slice(0, dotIdx).trim();
      if (!title) return null;
      return { num: m[1], title, page: m[3], displayNum: m[1] };
    }

    function isTocLine(line) {
      return parseTocLine(line) !== null;
    }

    function isTocStartLine(line) {
      return /^\s*(?:\d+(?:\.\d+)*\.|Appendix\s+[A-Z]\.|[A-Z](?:\.\d+)*\.)/i.test(line);
    }

    function isTocContinuationLine(line) {
      const t = line.trim();
      if (!t) return false;
      if (isTocStartLine(line)) return false;
      return /^\s{2,}\S/.test(line) || /\.{2,}\s*\d+\s*$/.test(line);
    }

    function parseSectionHeading(line) {
      let m = line.match(/^\s*Appendix\s+([A-Z])\.\s+(.+?)\s*$/i);
      if (m) {
        if (/(?:\s+\.){2,}|\.{3,}/.test(m[2])) return null;
        return { num: m[1], title: m[2].trim(), displayNum: `Appendix ${m[1]}` };
      }
      m = line.match(/^\s*((?:\d+(?:\.\d+)*)|(?:[A-Z](?:\.\d+)*))\.\s+(.+?)\s*$/);
      if (!m) return null;
      if (/(?:\s+\.){2,}|\.{3,}/.test(m[3])) return null;
      if (m[3].trim().length > 120) return null;
      return { num: m[1], title: m[3].trim(), displayNum: m[1] };
    }

    function isSectionHeadingLine(line) {
      return parseSectionHeading(line) !== null;
    }

    function isBodySectionStart(line) {
      if (isTocLine(line) || isTocStartLine(line) || isTocContinuationLine(line)) return false;
      const h = parseSectionHeading(line);
      return h !== null;
    }

    function isTocBlock(blockLines) {
      const tocLines = blockLines.filter((l) => isTocLine(l));
      if (tocLines.length >= 2) return true;
      if (tocLines.length === 1 && blockLines.length === 1) return true;
      if (blockLines.length >= 3 && tocLines.length >= Math.ceil(blockLines.length * 0.5)) return true;
      return false;
    }

    function isSectionHeadingBlock(blockLines) {
      return blockLines.length === 1 && isSectionHeadingLine(blockLines[0]);
    }

    /** Questionnaire / form lines that are only dot or underscore leaders. */
    function isFormFillLine(line) {
      const t = line.trim();
      if (!t) return true;
      return /^[.\s_\-–—]+$/.test(t) && !/[A-Za-z0-9]/.test(t);
    }

    function isFormFillBlock(blockLines) {
      return blockLines.every((l) => isFormFillLine(l));
    }

    /** RFC ASCII diagrams: +---+ rows, | col | rows, MSB/LSB labels, dashed borders. */
    function isAsciiDiagramLine(line) {
      const t = line.trim();
      if (!t) return false;
      if (/^[-–—_=+.\s]{6,}$/.test(t) && /-{3,}|_{3,}|={3,}/.test(t)) return true;
      if (/^\|/.test(line) || /\|.*\|/.test(line)) return true;
      if (/^(?:MSB|LSB)\b/.test(t) && t.length < 100) return true;
      if (/^[/\\^|+\-.\s]{8,}$/.test(t) && /[|+\-\\/]{2,}/.test(t)) return true;
      return false;
    }

    function isAsciiDiagramBlock(blockLines) {
      if (!blockLines.length) return false;
      const diagramLines = blockLines.filter((l) => isAsciiDiagramLine(l)).length;
      if (diagramLines >= 2) return true;
      if (diagramLines >= 1 && blockLines.some((l) => /-{5,}/.test(l)) && blockLines.some((l) => /\|/.test(l)))
        return true;
      return false;
    }

    /** MI-counting / binary list blocks (0, 01, 10, :, 11...1110). */
    function isListLikeDiagramLine(line) {
      const t = line.trim();
      if (!t) return false;
      if (/^:+$/.test(t)) return true;
      if (/\(reserved to mean/i.test(t)) return true;
      if (/^[01.]+$/.test(t.replace(/\s/g, ""))) return true;
      if (/^[\d\s.:()+]+$/.test(t) && /[01]/.test(t) && t.length < 80) return true;
      return false;
    }

    function isListLikeDiagramBlock(blockLines) {
      if (blockLines.length < 2) return false;
      const hits = blockLines.filter((l) => isListLikeDiagramLine(l)).length;
      return hits >= 2 && hits >= Math.ceil(blockLines.length * 0.4);
    }

    function isContinuableDiagramBlock(blockLines) {
      return isAsciiDiagramBlock(blockLines) || isListLikeDiagramBlock(blockLines);
    }

    /** Page footers, form feeds, and running "RFC NNNN ... Month YYYY" headers. */
    function isPageBreakNoiseLine(line) {
      const t = line.trim();
      if (!t) return false;
      if (/^\f/.test(line)) return true;
      if (/\[page\s*\d+\]/i.test(t)) return true;
      if (/^[A-Za-z].*\[Page\s*\d+\]/i.test(t) && t.length < 95) return true;
      if (/Standards Track|Informational|Experimental|Historic|Best Current Practice/i.test(t) && t.length < 95)
        return true;
      if (/^RFC\s+\d{3,5}\s+/i.test(t) && t.length < 120) {
        if (
          /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i.test(
            t
          )
        )
          return true;
        if (!/^\d+\./.test(t)) return true;
      }
      return false;
    }

    function looksLikeAsciiBlock(blockLines) {
      if (isTocBlock(blockLines)) return false;
      if (isFormFillBlock(blockLines)) return false;
      if (isAsciiDiagramBlock(blockLines)) return true;
      if (isListLikeDiagramBlock(blockLines)) return true;
      if (blockLines.some((l) => isTocStartLine(l) || isTocLine(l))) return false;
      return blockLines.some((l) => {
        if (isTocLine(l)) return false;
        if (isFormFillLine(l)) return false;
        const t = lineTrimCompact(l);
        if (!t) return false;
        if (t.length <= 2 && /^[|+\-–—\\]+$/.test(t)) return false;
        const nonAlpha = t.replace(/[A-Za-z0-9]/g, "").length;
        const ratio = nonAlpha / t.length;
        return ratio > 0.55 || /-{5,}|={5,}|\+{3,}/.test(l);
      });
    }

    function lineTrimCompact(line) {
      return line.replace(/\s/g, "");
    }

    function shouldRenderPreBlock(blockLines) {
      if (!looksLikeAsciiBlock(blockLines)) return false;
      const text = blockLines
        .map((l) => l.replace(/\s+$/g, ""))
        .join("\n")
        .trim();
      if (!text || isFormFillBlock(blockLines)) return false;
      // Drop ASCII "filler" <pre> blocks that contain no real words/numbers.
      // (These are often rendered as empty rounded boxes on dark theme.)
      if (!/[A-Za-z0-9]/.test(text)) return false;
      if (blockLines.length === 1) {
        const t = blockLines[0].trim();
        if (t.length <= 3 && /^[|+\-–—\\]+$/.test(t)) return false;
      }
      return true;
    }

    function normalizeParagraphLine(line) {
      // Remove leading spaces to avoid a "left gutter".
      return line.replace(/^\s+/, "").replace(/\s+$/g, "");
    }

    function rfcHtmlLink(num) {
      return `https://www.rfc-editor.org/rfc/rfc${num}.html`;
    }

    function linkifyInto(parent, text) {
      // Turn URLs and RFC references into real hyperlinks.
      // Examples:
      //  - [RFC2119] -> https://www.rfc-editor.org/rfc/rfc2119.html
      //  - RFC 2119 -> ...
      //  - https://example.com -> itself
      const urlRe = /https?:\/\/[^\s<>()]+/gi;
      const bracketRfcRe = /\[RFC(\d{3,5})\]/gi;
      const plainRfcRe = /\bRFC\s?(\d{3,5})\b/gi;
      const sectionRefRe = /\b[Ss]ection\s+(\d+(?:\.\d+)*)\b/g;

      // Build a list of matches so we can interleave them.
      const matches = [];
      for (const m of text.matchAll(urlRe)) {
        matches.push({ start: m.index, end: m.index + m[0].length, kind: "url", value: m[0] });
      }
      for (const m of text.matchAll(sectionRefRe)) {
        matches.push({
          start: m.index,
          end: m.index + m[0].length,
          kind: "section",
          value: m[1],
          label: m[0],
        });
      }
      for (const m of text.matchAll(bracketRfcRe)) {
        matches.push({
          start: m.index,
          end: m.index + m[0].length,
          kind: "rfc",
          value: m[1],
          label: m[0],
        });
      }
      for (const m of text.matchAll(plainRfcRe)) {
        matches.push({
          start: m.index,
          end: m.index + m[0].length,
          kind: "rfc",
          value: m[1],
          label: m[0],
        });
      }

      matches.sort((a, b) => a.start - b.start);

      // Deduplicate overlaps (e.g. when both bracket + plain match).
      const filtered = [];
      let lastEnd = -1;
      for (const m of matches) {
        if (m.start < lastEnd) continue;
        filtered.push(m);
        lastEnd = m.end;
      }

      let cursor = 0;
      for (const m of filtered) {
        if (m.start > cursor) parent.appendChild(document.createTextNode(text.slice(cursor, m.start)));

        if (m.kind === "url") {
          const a = document.createElement("a");
          a.href = m.value;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = m.value;
          parent.appendChild(a);
        } else if (m.kind === "rfc") {
          const a = document.createElement("a");
          a.href = rfcHtmlLink(m.value);
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = m.label || `RFC ${m.value}`;
          parent.appendChild(a);
        } else if (m.kind === "section") {
          const a = document.createElement("a");
          a.href = `#${sectionAnchorId(m.value)}`;
          a.textContent = m.label || `Section ${m.value}`;
          parent.appendChild(a);
        }

        cursor = m.end;
      }

      if (cursor < text.length) parent.appendChild(document.createTextNode(text.slice(cursor)));
    }

    function appendTocEntry(parsed, ul) {
      const depth = String(parsed.num).includes(".") ? String(parsed.num).split(".").length : 1;
      const li = document.createElement("li");
      li.className = `toc-level-${depth}`;

      const a = document.createElement("a");
      a.href = `#${sectionAnchorId(parsed.num)}`;
      const label = parsed.displayNum || parsed.num;
      a.textContent = `${label}. ${parsed.title}`;
      li.appendChild(a);

      const pageEl = document.createElement("span");
      pageEl.className = "toc-page";
      pageEl.textContent = parsed.page;
      li.appendChild(pageEl);

      ul.appendChild(li);
    }

    function renderTocBlock(blockLines, frag) {
      const toc = document.createElement("div");
      toc.className = "rfc-toc";
      const ul = document.createElement("ul");

      for (const line of blockLines) {
        if (/^table of contents$/i.test(line.trim())) continue;
        const parsed = parseTocLine(line);
        if (parsed) appendTocEntry(parsed, ul);
      }

      if (ul.childElementCount > 0) {
        toc.appendChild(ul);
        frag.appendChild(toc);
      }
    }

    function renderSectionHeading(line, frag) {
      const h = parseSectionHeading(line);
      if (!h) return false;
      const depth = String(h.num).includes(".") ? String(h.num).split(".").length : 1;

      const el = document.createElement("h2");
      el.id = sectionAnchorId(h.num);
      el.className = `rfc-section rfc-section-level-${depth}`;
      linkifyInto(el, `${h.displayNum}. ${h.title}`);
      frag.appendChild(el);
      return true;
    }

    const frag = document.createDocumentFragment();
    let inToc = false;
    let tocDiv = null;
    let tocUl = null;
    let tocPending = null;
    let paraBuf = [];
    let pendingDiagramGap = false;

    function flushTocPending() {
      if (!tocPending || !tocPending.length) {
        tocPending = null;
        return;
      }
      const combined = tocPending.join(" ");
      const parsed = parseTocLine(combined);
      if (parsed) appendTocEntry(parsed, tocUl);
      tocPending = null;
    }

    function ensureToc() {
      if (!tocDiv) {
        tocDiv = document.createElement("div");
        tocDiv.className = "rfc-toc";
        tocUl = document.createElement("ul");
        tocDiv.appendChild(tocUl);
        frag.appendChild(tocDiv);
      }
    }

    function endToc() {
      inToc = false;
      tocDiv = null;
      tocUl = null;
    }

    function flushParagraph() {
      if (!paraBuf.length) return;
      const b = paraBuf;
      paraBuf = [];

      if (isTocBlock(b)) {
        ensureToc();
        let pending = null;
        for (const line of b) {
          if (isTocStartLine(line)) {
            if (pending) {
              const p = parseTocLine(pending.join(" "));
              if (p) appendTocEntry(p, tocUl);
            }
            pending = [line.trim()];
            const p = parseTocLine(line);
            if (p) {
              appendTocEntry(p, tocUl);
              pending = null;
            }
          } else if (pending) {
            pending.push(line.trim());
            const p = parseTocLine(pending.join(" "));
            if (p) {
              appendTocEntry(p, tocUl);
              pending = null;
            }
          } else {
            const p = parseTocLine(line);
            if (p) appendTocEntry(p, tocUl);
          }
        }
        if (pending) {
          const p = parseTocLine(pending.join(" "));
          if (p) appendTocEntry(p, tocUl);
        }
        endToc();
        return;
      }

      if (isSectionHeadingBlock(b)) {
        renderSectionHeading(b[0], frag);
        return;
      }

      if (isFormFillBlock(b)) return;

      if (shouldRenderPreBlock(b)) {
        const pre = document.createElement("pre");
        pre.textContent = b.join("\n");
        frag.appendChild(pre);
        return;
      }

      const joined = b
        .map((l) => normalizeParagraphLine(l))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!joined) return;
      const p = document.createElement("p");
      linkifyInto(p, joined);
      frag.appendChild(p);
    }

    for (const line of lines) {
      if (isPageBreakNoiseLine(line)) continue;

      if (line.trim() === "") {
        if (inToc) endToc();
        if (isContinuableDiagramBlock(paraBuf)) {
          pendingDiagramGap = true;
          continue;
        }
        pendingDiagramGap = false;
        flushParagraph();
        continue;
      }

      if (pendingDiagramGap) {
        pendingDiagramGap = false;
        if (isListLikeDiagramLine(line) || isAsciiDiagramLine(line)) {
          paraBuf.push(line);
          continue;
        }
        flushParagraph();
      }

      if (/^table of contents$/i.test(line.trim())) {
        flushParagraph();
        endToc();
        const h = document.createElement("h2");
        h.className = "rfc-section";
        h.textContent = "Table of Contents";
        frag.appendChild(h);
        inToc = true;
        ensureToc();
        continue;
      }

      if (inToc) {
        if (isBodySectionStart(line)) {
          flushTocPending();
          endToc();
        } else if (isTocStartLine(line)) {
          flushTocPending();
          tocPending = [line.trim()];
          const parsed = parseTocLine(line);
          if (parsed) {
            appendTocEntry(parsed, tocUl);
            tocPending = null;
          }
          continue;
        } else if (tocPending && (isTocContinuationLine(line) || !parseTocLine(line))) {
          tocPending.push(line.trim());
          const parsed = parseTocLine(tocPending.join(" "));
          if (parsed) {
            appendTocEntry(parsed, tocUl);
            tocPending = null;
          }
          continue;
        } else {
          const parsed = parseTocLine(line);
          if (parsed) {
            flushTocPending();
            appendTocEntry(parsed, tocUl);
            continue;
          }
        }
      }

      const parsedToc = parseTocLine(line);
      if (parsedToc) {
        flushParagraph();
        ensureToc();
        appendTocEntry(parsedToc, tocUl);
        continue;
      }

      if (isTocStartLine(line)) {
        flushParagraph();
        inToc = true;
        ensureToc();
        tocPending = [line.trim()];
        const p = parseTocLine(line);
        if (p) {
          appendTocEntry(p, tocUl);
          tocPending = null;
        }
        continue;
      }

      if (isSectionHeadingLine(line)) {
        flushParagraph();
        renderSectionHeading(line, frag);
        continue;
      }

      paraBuf.push(line);
    }

    if (inToc) {
      flushTocPending();
      endToc();
    }
    flushParagraph();

    const wrapper = document.createElement("div");
    wrapper.className = "rfcReflow";
    wrapper.appendChild(frag);

    rfcContainer.innerHTML = "";
    rfcContainer.appendChild(wrapper);
    cleanupEmptyBlocks(rfcContainer);
    return;
  }

  const doc = new DOMParser().parseFromString(body, "text/html");

  // Remove author CSS that breaks readability when embedded.
  doc.querySelectorAll("style, link[rel='stylesheet']").forEach((el) => el.remove());

  // Try common RFC-Editor markup containers; fall back to full body.
  const content =
    doc.querySelector(".rfc-body") ||
    doc.querySelector("main") ||
    doc.querySelector("article") ||
    doc.getElementById("content") ||
    doc.body;

  if (!content) throw new Error("No RFC content found");

  const clone = content.cloneNode(true);

  function removeRfcEditorToolboxByText(root) {
    // Some RFC pages inject a top toolbox like:
    // "Format: RFC xxxx" "Text: ..." "More: ..."
    // It isn't always marked with stable ids/classes, so remove by text markers.
    const markers = ["format:", "text:", "more:"];
    const elems = root.querySelectorAll("*");
    const limit = Math.min(elems.length, 2500);

    for (let i = 0; i < limit; i++) {
      const el = elems[i];
      const t = (el.textContent || "").trim().toLowerCase();
      if (!t) continue;
      if (t.length > 260) continue;

      const hit = markers.filter((m) => t.includes(m)).length;
      if (hit >= 2 || (hit >= 1 && t.includes("rfc"))) {
        const container = el.closest("nav, header, [role='navigation'], [role='banner'], div, section") || el;
        container.remove();
      }
    }
  }

  function isFormFillLine(line) {
    const t = line.trim();
    if (!t) return true;
    return /^[.\s_\-–—]+$/.test(t) && !/[A-Za-z0-9]/.test(t);
  }

  function isFormFillBlock(lines) {
    return lines.every((l) => isFormFillLine(l));
  }

  function isAsciiDiagramLine(line) {
    const t = line.trim();
    if (!t) return false;
    if (/^[-–—_=+.\s]{6,}$/.test(t) && /-{3,}|_{3,}|={3,}/.test(t)) return true;
    if (/^\|/.test(line) || /\|.*\|/.test(line)) return true;
    if (/^(?:MSB|LSB)\b/.test(t) && t.length < 100) return true;
    if (/^[/\\^|+\-.\s]{8,}$/.test(t) && /[|+\-\\/]{2,}/.test(t)) return true;
    return false;
  }

  function isAsciiDiagramBlock(lines) {
    if (!lines.length) return false;
    const diagramLines = lines.filter((l) => isAsciiDiagramLine(l)).length;
    if (diagramLines >= 2) return true;
    if (diagramLines >= 1 && lines.some((l) => /-{5,}/.test(l)) && lines.some((l) => /\|/.test(l))) return true;
    return false;
  }

  function looksLikeAsciiBlock(lines) {
    if (isFormFillBlock(lines)) return false;
    if (isAsciiDiagramBlock(lines)) return true;
    const sample = lines
      .filter((l) => !isFormFillLine(l))
      .slice(0, 40)
      .join("\n");
    if (!sample.trim()) return false;
    const heavy = (sample.match(/[|+_=]{2,}|-{5,}|\*{5,}/g) || []).length;
    const manySpaces = (sample.match(/ {6,}/g) || []).length;
    return heavy >= 2 || manySpaces >= 6;
  }

  function shouldRenderPreBlock(lines) {
    if (!looksLikeAsciiBlock(lines)) return false;
    const text = lines.join("\n").trim();
    if (!text || isFormFillBlock(lines)) return false;
    if (!/[A-Za-z0-9]/.test(text)) return false;
    return true;
  }

  function reflowPreToParagraphs(preEl) {
    const raw = preEl.textContent || "";
    const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    const blocks = [];
    let cur = [];
    for (const line of lines) {
      if (line.trim() === "") {
        if (cur.length) blocks.push(cur), (cur = []);
      } else {
        cur.push(line);
      }
    }
    if (cur.length) blocks.push(cur);

    const frag = document.createDocumentFragment();
    for (const b of blocks) {
      if (isFormFillBlock(b)) continue;

      if (shouldRenderPreBlock(b)) {
        const pre = document.createElement("pre");
        pre.textContent = b.join("\n");
        frag.appendChild(pre);
        continue;
      }

      const text = b
        .map((l) => l.replace(/\s+$/g, ""))
        .map((l) => l.replace(/^\s{0,4}/g, ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (!text) continue;
      const p = document.createElement("p");
      p.textContent = text;
      frag.appendChild(p);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "rfcReflow";
    wrapper.appendChild(frag);
    return wrapper;
  }

  // Avoid executing any scripts from remote HTML.
  clone.querySelectorAll("script").forEach((s) => s.remove());

  // Strip inline styles (e.g. white text on white background).
  clone.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));

  // Strip legacy presentational attributes that can create dark headers/backgrounds.
  const presentationalAttrs = ["bgcolor", "background", "text", "link", "vlink", "alink", "color"];
  clone.querySelectorAll("*").forEach((el) => {
    presentationalAttrs.forEach((a) => el.removeAttribute(a));
  });

  // Remove common navigation / sidebars / TOC blocks that often use tricky CSS.
  clone
    .querySelectorAll(
      [
        // semantic / role-based
        "nav",
        "header",
        "footer",
        "[role='navigation']",
        "[role='banner']",
        // common names for TOC / sidebars / toolbars
        ".toc",
        ".table-of-contents",
        "#toc",
        "#table-of-contents",
        ".noprint",
        ".no-print",
        ".sidebar",
        ".toolbar",
        ".navbar",
        // rfc-editor specific-ish
        ".rfc-toolbar",
        ".rfc-header",
        ".rfc-nav",
        ".rfc-topbar",
        ".rfc-banner",
        "#rfc-toolbar",
        "#rfc-header",
        "#rfcnav",
        "#navbar",
      ].join(", ")
    )
    .forEach((el) => el.remove());

  removeRfcEditorToolboxByText(clone);

  // Remove empty/placeholder <pre> blocks that render as blank rounded boxes.
  // (Some RFC HTML sources include visual form fillers as <pre> with no real text.)
  clone.querySelectorAll("pre").forEach((pre) => {
    const raw = pre.textContent || "";
    const t = raw.trim();
    if (!t) {
      pre.remove();
      return;
    }

    const compact = t.replace(/[\s\u00a0\u200B-\u200F\u202A-\u202E\u2060\uFEFF]+/g, "");
    if (compact.length <= 6) {
      pre.remove();
      return;
    }

    // Remove <pre> fillers/diagrams without any alphanumerics.
    // These are typically line/dot placeholders that appear as blank rounded boxes.
    if (!/[A-Za-z0-9]/.test(t)) {
      pre.remove();
      return;
    }

    // Dot/line placeholders: only punctuation leaders without any alphanumerics.
    // Keep typical ASCII diagrams that often contain `|` or `+`.
    if (!/[A-Za-z0-9]/.test(t) && /^[.\s_\-–—:;]+$/.test(t)) {
      pre.remove();
      return;
    }
  });

  // If RFC content is essentially one big <pre>, reflow it into paragraphs.
  const pres = Array.from(clone.querySelectorAll("pre"));
  if (pres.length === 1) {
    const pre = pres[0];
    const reflowed = reflowPreToParagraphs(pre);
    pre.replaceWith(reflowed);
  }

  // Keep markup; apply our own CSS for readability.
  rfcContainer.innerHTML = "";
  rfcContainer.appendChild(clone);
  cleanupEmptyBlocks(rfcContainer);
}

async function urlExists(url) {
  // Try HEAD first; some environments/CORS may block HEAD, so fallback to GET.
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (res.ok) return true;
    if (res.status === 404) return false;
  } catch {
    // ignore
  }

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (res.ok) return true;
    if (res.status === 404) return false;
  } catch {
    // If fetch is blocked, we can't pre-check; we'll still try to load into iframe.
    return true;
  }

  return true;
}

let loading = false;
let translating = false;
let originalContentHtml = "";
let isTranslated = false;

function resetTranslationState(clearSaved = true) {
  isTranslated = false;
  if (clearSaved) originalContentHtml = "";
  translateBtn.textContent = "Перевести";
  translateBtn.setAttribute("aria-pressed", "false");
}

function saveOriginalContent() {
  if (rfcContainer.hidden) return;
  originalContentHtml = rfcContainer.innerHTML;
  isTranslated = false;
  translateBtn.textContent = "Перевести";
  translateBtn.setAttribute("aria-pressed", "false");
}

async function translateTextToRussian(text) {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const chunkSize = 4000;
  const chunks = [];
  for (let i = 0; i < trimmed.length; i += chunkSize) {
    chunks.push(trimmed.slice(i, i + chunkSize));
  }

  const parts = [];
  for (const chunk of chunks) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
    const data = await res.json();
    parts.push(data[0].map((row) => row[0]).join(""));
    await new Promise((r) => setTimeout(r, 80));
  }

  return parts.join("");
}

async function translateArticle() {
  if (translating || rfcContainer.hidden) return;

  if (isTranslated && originalContentHtml) {
    rfcContainer.innerHTML = originalContentHtml;
    isTranslated = false;
    translateBtn.textContent = "Перевести";
    translateBtn.setAttribute("aria-pressed", "false");
    setStatus("Оригинал", "ok");
    return;
  }

  if (!originalContentHtml) {
    saveOriginalContent();
  }
  if (!originalContentHtml) return;

  translating = true;
  translateBtn.disabled = true;
  nextBtn.disabled = true;
  translateBtn.textContent = "Перевожу…";
  translateBtn.setAttribute("aria-pressed", "true");
  setStatus("Перевожу…", "loading");

  const targets = Array.from(
    rfcContainer.querySelectorAll(".rfcReflow p, .rfc-section, .rfc-toc a, .rfcReflow h1, .rfcReflow h2, .rfcReflow h3")
  ).filter((el) => !el.closest("pre"));

  try {
    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      const original = el.textContent || "";
      if (original.trim().length < 2) continue;

      el.textContent = await translateTextToRussian(original);

      if ((i + 1) % 8 === 0 || i === targets.length - 1) {
        setStatus(`Перевожу… ${i + 1}/${targets.length}`, "loading");
      }
    }

    isTranslated = true;
    translateBtn.textContent = "К оригиналу";
    translateBtn.setAttribute("aria-pressed", "true");
    setStatus("Перевод готов", "ok");
  } catch (err) {
    setStatus("Ошибка перевода", "error");
    if (originalContentHtml) {
      rfcContainer.innerHTML = originalContentHtml;
      isTranslated = false;
      translateBtn.textContent = "Перевести";
      translateBtn.setAttribute("aria-pressed", "false");
    }
  } finally {
    translating = false;
    translateBtn.disabled = false;
    nextBtn.disabled = false;
    if (!isTranslated) {
      translateBtn.textContent = "Перевести";
      translateBtn.setAttribute("aria-pressed", "false");
    }
  }
}

async function loadRandomRFC() {
  if (loading) return;
  loading = true;
  nextBtn.disabled = true;
  translateBtn.disabled = true;
  resetTranslationState(true);
  setStatus("Загружаю…", "loading");
  rfcContainer.setAttribute("aria-busy", "true");
  // Optimistically show container; we'll swap to iframe if fetch fails.
  rfcContainer.hidden = false;
  rfcFrame.hidden = true;
  rfcFrame.src = "";

  let chosen = null;
  let chosenUrl = null;
  let chosenTxtUrl = null;

  for (let attempt = 1; attempt <= ATTEMPT_LIMIT; attempt++) {
    const n = pad4(randomInt(1, MAX_RFC));
    const htmlUrl = rfcUrl(n);
    const txtUrl = rfcTextUrl(n);

    // Avoid reloading exact same doc.
    if (currentNum.textContent === n) continue;

    const exists = await urlExists(txtUrl);
    if (!exists) continue;

    chosen = n;
    chosenUrl = htmlUrl;
    chosenTxtUrl = txtUrl;
    break;
  }

  if (!chosen || !chosenUrl || !chosenTxtUrl) {
    setStatus("Не смог найти RFC (повтори)", "error");
    nextBtn.disabled = false;
    loading = false;
    return;
  }

  setCurrent(chosen, chosenUrl);

  try {
    await renderRFCViaFetch(chosenTxtUrl);
    showContainer();
    saveOriginalContent();
    setStatus(`Готово: RFC ${chosen}`, "ok");
    nextBtn.disabled = false;
    loading = false;
  } catch (err) {
    // Fallback for CORS / network restrictions.
    showIframe();
    setStatus("Загружаю в iframe…", "loading");

    rfcFrame.src = chosenUrl;
    const onLoad = () => {
      rfcFrame.removeEventListener("load", onLoad);
      setStatus(`Готово: RFC ${chosen}`, "ok");
      nextBtn.disabled = false;
      loading = false;
    };
    rfcFrame.addEventListener("load", onLoad);

    window.setTimeout(() => {
      if (loading) {
        setStatus(`Готово: RFC ${chosen}`, "ok");
        nextBtn.disabled = false;
        loading = false;
      }
    }, 6000);
  }
}

async function loadSpecificRFC(num) {
  const n = typeof num === "string" ? parseRfcNumber(num) : Number(num);
  const safe = Number.isFinite(n) ? Math.trunc(n) : null;
  if (!safe || safe < 1 || safe > MAX_RFC) {
    setStatus("Некорректный номер RFC", "error");
    return;
  }

  if (loading) return;
  loading = true;
  nextBtn.disabled = true;
  translateBtn.disabled = true;
  rfcSearchBtn.disabled = true;
  resetTranslationState(true);
  setStatus("Загружаю…", "loading");
  rfcContainer.setAttribute("aria-busy", "true");
  rfcContainer.hidden = false;
  rfcFrame.hidden = true;
  rfcFrame.src = "";

  const padded = pad4(safe);
  const htmlUrl = rfcUrl(padded);
  const txtUrl = rfcTextUrl(padded);

  const exists = await urlExists(txtUrl);
  if (!exists) {
    setStatus("RFC не найден", "error");
    nextBtn.disabled = false;
    rfcSearchBtn.disabled = false;
    loading = false;
    return;
  }

  setCurrent(padded, htmlUrl);

  try {
    await renderRFCViaFetch(txtUrl);
    showContainer();
    saveOriginalContent();
    setStatus(`Готово: RFC ${padded}`, "ok");
  } catch {
    showIframe();
    setStatus("Загружаю в iframe…", "loading");
    rfcFrame.src = htmlUrl;
  } finally {
    nextBtn.disabled = false;
    rfcSearchBtn.disabled = false;
    loading = false;
  }
}

nextBtn.addEventListener("click", loadRandomRFC);
translateBtn.addEventListener("click", translateArticle);
rfcSearchBtn.addEventListener("click", () => loadSpecificRFC(rfcSearchInput.value));
rfcSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadSpecificRFC(rfcSearchInput.value);
});

initTextSettings();

// First load.
loadRandomRFC();

