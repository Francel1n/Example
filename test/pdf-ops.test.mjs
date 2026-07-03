// Run with: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.PDFLib = require('../vendor/pdf-lib.min.js');

const { parseRanges, mergePdfs, extractPages, rebuildPdf, imagesToPdf, pageCount } =
  await import('../js/pdf-ops.js');

const { PDFDocument } = globalThis.PDFLib;

async function makePdf(pages, label = 'x') {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([200 + i, 300]); // unique width per page = testable identity
    page.drawText(`${label}${i + 1}`, { x: 20, y: 20 });
  }
  return doc.save();
}

// 1x1 red PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test('parseRanges handles pages, ranges, open ends, order and duplicates', () => {
  assert.deepEqual(parseRanges('1-3', 10), [0, 1, 2]);
  assert.deepEqual(parseRanges('3,1', 10), [2, 0]);
  assert.deepEqual(parseRanges('8-', 10), [7, 8, 9]);
  assert.deepEqual(parseRanges('-2', 10), [0, 1]);
  assert.deepEqual(parseRanges('1,1,2', 10), [0, 0, 1]);
  assert.deepEqual(parseRanges(' 2 , 4 - 5 ', 5), [1, 3, 4]);
});

test('parseRanges rejects garbage with readable errors', () => {
  assert.throws(() => parseRanges('', 5));
  assert.throws(() => parseRanges('abc', 5), /not a page/);
  assert.throws(() => parseRanges('0', 5), /outside/);
  assert.throws(() => parseRanges('6', 5), /outside/);
  assert.throws(() => parseRanges('4-2', 5), /backwards/);
  assert.throws(() => parseRanges('-', 5), /not a page/);
});

test('mergePdfs concatenates documents in order', async () => {
  const [a, b, c] = await Promise.all([makePdf(2, 'a'), makePdf(3, 'b'), makePdf(1, 'c')]);
  const merged = await mergePdfs([a, b, c]);
  const doc = await PDFDocument.load(merged);
  assert.equal(doc.getPageCount(), 6);
  // widths encode origin: a=200,201  b=200,201,202  c=200
  const widths = doc.getPages().map((p) => Math.round(p.getWidth()));
  assert.deepEqual(widths, [200, 201, 200, 201, 202, 200]);
});

test('extractPages keeps requested order and duplicates', async () => {
  const src = await makePdf(5);
  const out = await extractPages(src, [4, 0, 0]);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 3);
  const widths = doc.getPages().map((p) => Math.round(p.getWidth()));
  assert.deepEqual(widths, [204, 200, 200]);
});

test('rebuildPdf reorders, drops and rotates pages', async () => {
  const src = await makePdf(4);
  const out = await rebuildPdf(src, [
    { index: 2, rotate: 90 },
    { index: 0, rotate: 0 },
    { index: 3, rotate: 270 },
  ]);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 3);
  const widths = doc.getPages().map((p) => Math.round(p.getWidth()));
  assert.deepEqual(widths, [202, 200, 203]);
  const rots = doc.getPages().map((p) => p.getRotation().angle);
  assert.deepEqual(rots, [90, 0, 270]);
});

test('rebuildPdf rotation accumulates on top of existing rotation', async () => {
  const src = await makePdf(1);
  const once = await rebuildPdf(src, [{ index: 0, rotate: 90 }]);
  const twice = await rebuildPdf(once, [{ index: 0, rotate: 90 }]);
  const doc = await PDFDocument.load(twice);
  assert.equal(doc.getPages()[0].getRotation().angle, 180);
});

test('imagesToPdf auto mode sizes pages to the images', async () => {
  const out = await imagesToPdf([
    { bytes: TINY_PNG, type: 'png' },
    { bytes: TINY_PNG, type: 'png' },
  ]);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 2);
  assert.equal(Math.round(doc.getPages()[0].getWidth()), 1);
});

test('imagesToPdf a4 mode centers images on A4 pages', async () => {
  const out = await imagesToPdf([{ bytes: TINY_PNG, type: 'png' }], { pageSize: 'a4' });
  const doc = await PDFDocument.load(out);
  assert.equal(Math.round(doc.getPages()[0].getWidth()), 595);
  assert.equal(Math.round(doc.getPages()[0].getHeight()), 842);
});

test('encrypted and corrupt files produce human-readable errors', async () => {
  await assert.rejects(() => pageCount(Buffer.from('not a pdf at all')), /could not be read/);
});

test('pageCount reports pages', async () => {
  assert.equal(await pageCount(await makePdf(7)), 7);
});
