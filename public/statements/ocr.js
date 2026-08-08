/* Reading a statement that is a picture rather than text.
 *
 * A great many Indian bank statements arrive scanned, photographed, or printed
 * and re-scanned at a shop. There is no text inside them at all — only pixels
 * shaped like text. This reads those pixels, on the phone, and never sends the
 * page anywhere.
 *
 * It is slower and less certain than reading real text, and it says so. The
 * safeguard is the same one that protects every other import: whatever comes
 * out is re-added and checked against the closing balance the bank printed. If
 * a digit was misread, the sums stop matching and the household is told, rather
 * than being handed a confident wrong number.
 */

const TESSERACT_URL = new URL('../vendor/tesseract.esm.min.js', import.meta.url).href;
const WORKER_URL = new URL('../vendor/tesseract-worker.min.js', import.meta.url).href;
const CORE_DIR = new URL('../vendor/', import.meta.url).href;
const LANG_DIR = new URL('../vendor/', import.meta.url).href;

/* Rendered somewhat larger than the page really is, because small type is the
   difference between reading 3 and reading 8. Larger than this and a dense
   statement page takes minutes on a phone, which nobody will wait for. */
const RENDER_SCALE = 1.8;

/* A statement is a block of lines in one column, not an essay with headings and
   pictures. Saying so up front skips the reader's layout analysis, which is a
   large part of what makes it slow.

   Restricting the characters helps twice over: it is quicker, and it stops a
   smudge being read as a symbol that could never appear on a bank statement. */
const SETTINGS = {
  tessedit_pageseg_mode: '6',
  tessedit_char_whitelist:
    '0123456789' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    'abcdefghijklmnopqrstuvwxyz' +
    ' .,-/:()@*#&₹'
};

let worker = null;

async function getWorker(onProgress) {
  if (worker) return worker;

  const module = await import(TESSERACT_URL);
  // The bundled build puts everything behind `default`; a plain build does not.
  const tesseract = module.default || module;

  worker = await tesseract.createWorker('eng', 1, {
    workerPath: WORKER_URL,
    corePath: CORE_DIR,
    langPath: LANG_DIR,
    // The library would otherwise fetch its own copies from a CDN.
    workerBlobURL: false,
    logger: (message) => {
      if (!onProgress) return;
      if (message.status === 'loading tesseract core') onProgress('Preparing to read the pages…');
      else if (message.status === 'loading language traineddata') onProgress('Preparing to read the pages…');
      else if (message.status === 'initializing api') onProgress('Nearly ready…');
    }
  });

  await worker.setParameters(SETTINGS);

  return worker;
}

/** Let the reader go once a household has finished importing. */
export async function releaseReader() {
  if (!worker) return;
  try { await worker.terminate(); } catch { /* already gone */ }
  worker = null;
}

/**
 * Read every page of a PDF as an image.
 *
 * Returns the same positioned scraps of text that a real-text PDF produces, so
 * everything downstream — recovering the table, reading the columns, checking
 * the balance — works exactly as it already does.
 */
export class ScanTooSlow extends Error {
  constructor(seconds) {
    super(`Reading this scan is taking too long — ${seconds} seconds for one page.`);
    this.name = 'ScanTooSlow';
    this.seconds = seconds;
  }
}

/* How long one page may take before we stop and say so. A dense statement page
   on a modest phone is genuinely slow work, but a household staring at a frozen
   screen deserves an explanation rather than a spinner that never ends. */
const PAGE_BUDGET_MS = 90000;

export async function readScannedPdf(pdf, onProgress) {
  const reader = await getWorker(onProgress);
  const items = [];
  let pageTop = 0;

  for (let number = 1; number <= pdf.numPages; number++) {
    if (onProgress) onProgress(`Reading page ${number} of ${pdf.numPages}…`);

    const page = await pdf.getPage(number);
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext('2d', { willReadFrequently: true });
    // A white page behind the drawing: a transparent background reads as black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport, background: '#ffffff' }).promise;

    const startedPage = Date.now();

    const { data } = await Promise.race([
      reader.recognize(canvas, {}, { blocks: true }),
      new Promise((_, reject) => setTimeout(
        () => reject(new ScanTooSlow(Math.round(PAGE_BUDGET_MS / 1000))),
        PAGE_BUDGET_MS
      ))
    ]);

    // If the first page was already slow, the rest will be worse. Say so now
    // rather than after twenty minutes.
    if (number === 1 && Date.now() - startedPage > PAGE_BUDGET_MS / 2 && pdf.numPages > 3) {
      throw new ScanTooSlow(Math.round((Date.now() - startedPage) / 1000));
    }

    for (const word of wordsOf(data)) {
      const text = String(word.text || '').trim();
      if (!text) continue;

      // Words the reader itself has little faith in are dropped. A wrong digit
      // is worse than a missing one, because the balance check catches a gap
      // and cannot catch a plausible mistake.
      if (typeof word.confidence === 'number' && word.confidence < 60) continue;

      const box = word.bbox;
      if (!box) continue;

      items.push({
        text,
        x: box.x0,
        y: pageTop + box.y0,
        width: Math.max(0, box.x1 - box.x0)
      });
    }

    pageTop += canvas.height;

    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
  }

  return { items, pages: pdf.numPages };
}

/** Walk whatever shape this version of the reader returns, down to words. */
function wordsOf(data) {
  if (Array.isArray(data?.words) && data.words.length > 0) return data.words;

  const found = [];
  for (const block of data?.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        for (const word of line.words || []) found.push(word);
      }
    }
  }
  return found;
}
