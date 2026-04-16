import fs from 'fs';
import path from 'path';

const HIGHLIGHT_ATTR = 'data-codex-design-highlight';
const HIGHLIGHT_STYLE_ID = 'codex-design-highlight-style';

function ensureParentDir(filePath) {
  if (!filePath) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeClip(clip = {}) {
  const x = Math.max(0, Math.floor(Number(clip.x || 0)));
  const y = Math.max(0, Math.floor(Number(clip.y || 0)));
  const width = Math.max(1, Math.ceil(Number(clip.width || 0)));
  const height = Math.max(1, Math.ceil(Number(clip.height || 0)));

  return { x, y, width, height };
}

async function clearHighlightMarkers(page) {
  if (!page || page.isClosed()) {
    return;
  }

  await page
    .evaluate(({ highlightAttr, styleId }) => {
      document.querySelectorAll(`[${highlightAttr}="true"]`).forEach((element) => {
        element.removeAttribute(highlightAttr);
      });
      document.getElementById(styleId)?.remove();
    }, {
      highlightAttr: HIGHLIGHT_ATTR,
      styleId: HIGHLIGHT_STYLE_ID,
    })
    .catch(() => {});
}

export async function captureScreenshot(page, { path: screenshotPath, fullPage = false, clip = null } = {}) {
  if (!page || page.isClosed()) {
    return null;
  }

  if (screenshotPath) {
    ensureParentDir(screenshotPath);
  }

  const options = {};
  if (screenshotPath) {
    options.path = screenshotPath;
  }

  if (clip && Number.isFinite(clip.width) && Number.isFinite(clip.height) && clip.width > 0 && clip.height > 0) {
    options.clip = normalizeClip(clip);
  } else {
    options.fullPage = Boolean(fullPage);
  }

  return page.screenshot(options);
}

export async function captureFocusedComponentScreenshot(
  page,
  {
    path: screenshotPath,
    selectors = [],
    padding = 20,
    maxMatchesPerSelector = 2,
  } = {}
) {
  if (!page || page.isClosed()) {
    return null;
  }

  const normalizedSelectors = [...new Set(selectors.map((selector) => String(selector || '').trim()).filter(Boolean))];
  if (normalizedSelectors.length === 0) {
    return null;
  }

  const focusMeta = await page
    .evaluate(
      ({ selectors, padding, maxMatchesPerSelector, highlightAttr, styleId }) => {
        const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

        const isVisible = (element) => {
          if (!(element instanceof HTMLElement)) {
            return false;
          }

          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0
          );
        };

        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = styleId;
          styleTag.textContent = `
            [${highlightAttr}="true"] {
              outline: 3px solid #ff4d4f !important;
              outline-offset: 2px !important;
              box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.35) !important;
            }
          `;
          document.head.appendChild(styleTag);
        }

        const matchedElements = [];
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector))
            .filter(isVisible)
            .slice(0, maxMatchesPerSelector);

          for (const element of elements) {
            element.setAttribute(highlightAttr, 'true');
            matchedElements.push(element);
          }
        }

        if (matchedElements.length === 0) {
          return null;
        }

        const boxes = matchedElements
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height,
            };
          })
          .filter((box) => box.width > 0 && box.height > 0);

        if (boxes.length === 0) {
          return null;
        }

        const minX = Math.max(0, Math.min(...boxes.map((box) => box.x)) - padding);
        const minY = Math.max(0, Math.min(...boxes.map((box) => box.y)) - padding);
        const maxX = Math.max(...boxes.map((box) => box.x + box.width)) + padding;
        const maxY = Math.max(...boxes.map((box) => box.y + box.height)) + padding;
        const pageWidth = Math.max(
          document.documentElement.scrollWidth,
          document.body?.scrollWidth || 0,
          window.innerWidth
        );
        const pageHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight || 0,
          window.innerHeight
        );

        return {
          clip: {
            x: minX,
            y: minY,
            width: Math.max(1, Math.min(pageWidth, maxX) - minX),
            height: Math.max(1, Math.min(pageHeight, maxY) - minY),
          },
          matched_selectors: selectors.map((selector) => clean(selector)).filter(Boolean),
        };
      },
      {
        selectors: normalizedSelectors,
        padding,
        maxMatchesPerSelector,
        highlightAttr: HIGHLIGHT_ATTR,
        styleId: HIGHLIGHT_STYLE_ID,
      }
    )
    .catch(() => null);

  if (!focusMeta?.clip) {
    await clearHighlightMarkers(page);
    return null;
  }

  try {
    await captureScreenshot(page, {
      path: screenshotPath,
      clip: focusMeta.clip,
    });
  } finally {
    await clearHighlightMarkers(page);
  }

  return {
    absolute_path: screenshotPath,
    project_relative_path: screenshotPath,
    clip: focusMeta.clip,
    matched_selectors: focusMeta.matched_selectors || normalizedSelectors,
  };
}
