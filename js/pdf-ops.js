// Core PDF operations. Pure logic on top of pdf-lib — no DOM, so the whole
// module is unit-testable in Node. Expects the pdf-lib UMD bundle to be
// loaded as `globalThis.PDFLib` (script tag in the browser, require() in tests).

function lib() {
  if (!globalThis.PDFLib) throw new Error('pdf-lib is not loaded');
  return globalThis.PDFLib;
}

// Parse a 1-based page range string like "1-3, 7, 12-" against a page count.
// Returns 0-based indexes in the order written. Duplicates are allowed on
// purpose (writing "1,1,2" duplicates page 1). Throws on anything malformed.
export function parseRanges(input, total) {
  const out = [];
  const tokens = String(input).split(',').map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) throw new Error('Enter at least one page or range, like 1-3 or 2,5.');
  for (const token of tokens) {
    const m = token.match(/^(\d+)?\s*-\s*(\d+)?$|^(\d+)$/);
    if (!m) throw new Error(`"${token}" is not a page or range.`);
    let start, end;
    if (m[3] !== undefined) {
      start = end = parseInt(m[3], 10);
    } else {
      if (m[1] === undefined && m[2] === undefined) throw new Error(`"${token}" is not a page or range.`);
      start = m[1] !== undefined ? parseInt(m[1], 10) : 1;
      end = m[2] !== undefined ? parseInt(m[2], 10) : total;
    }
    if (start < 1 || end > total) throw new Error(`"${token}" is outside 1–${total}.`);
    if (start > end) throw new Error(`"${token}" is backwards.`);
    for (let p = start; p <= end; p++) out.push(p - 1);
  }
  return out;
}

async function loadPdf(bytes) {
  const { PDFDocument } = lib();
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch (e) {
    if (String(e).includes('encrypted')) {
      throw new Error('This PDF is password-protected. Remove the password first.');
    }
    throw new Error('This file could not be read as a PDF.');
  }
}

export async function pageCount(bytes) {
  return (await loadPdf(bytes)).getPageCount();
}

// Merge several PDFs (ArrayBuffers/Uint8Arrays) into one, in order.
export async function mergePdfs(buffers) {
  const { PDFDocument } = lib();
  const out = await PDFDocument.create();
  for (const bytes of buffers) {
    const src = await loadPdf(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

// Extract the given 0-based page indexes (order and duplicates preserved).
export async function extractPages(bytes, indexes) {
  const { PDFDocument } = lib();
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indexes);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

// Rebuild a PDF from a page spec: [{ index, rotate }] in the desired order.
// Pages absent from the spec are dropped; `rotate` is degrees to add on top
// of the page's existing rotation (0/90/180/270).
export async function rebuildPdf(bytes, spec) {
  const { PDFDocument, degrees } = lib();
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, spec.map((s) => s.index));
  pages.forEach((page, i) => {
    const extra = spec[i].rotate || 0;
    if (extra % 360 !== 0) {
      page.setRotation(degrees(((page.getRotation().angle + extra) % 360 + 360) % 360));
    }
    out.addPage(page);
  });
  return out.save();
}

// Build a PDF from images: [{ bytes, type: 'jpg' | 'png' }].
// pageSize 'auto' sizes each page to its image (1px = 1pt);
// 'a4' fits the image inside A4 portrait with a margin.
export async function imagesToPdf(images, { pageSize = 'auto', margin = 24 } = {}) {
  const { PDFDocument } = lib();
  const A4 = { w: 595.28, h: 841.89 };
  const out = await PDFDocument.create();
  for (const img of images) {
    const embedded = img.type === 'png' ? await out.embedPng(img.bytes) : await out.embedJpg(img.bytes);
    if (pageSize === 'a4') {
      const page = out.addPage([A4.w, A4.h]);
      const maxW = A4.w - margin * 2;
      const maxH = A4.h - margin * 2;
      const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
      const w = embedded.width * scale;
      const h = embedded.height * scale;
      page.drawImage(embedded, { x: (A4.w - w) / 2, y: (A4.h - h) / 2, width: w, height: h });
    } else {
      const page = out.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    }
  }
  return out.save();
}
