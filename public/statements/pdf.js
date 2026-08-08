/* Opening a PDF on the phone.
 *
 * The file never leaves the device. That is the whole point: a bank statement
 * is the most revealing document a household owns, and the password to a
 * protected one is typed, used, and forgotten here — it is never sent anywhere,
 * never stored, and never written to a log.
 */

const PDFJS_URL = new URL('../vendor/pdf.min.mjs', import.meta.url).href;
const WORKER_URL = new URL('../vendor/pdf.worker.min.mjs', import.meta.url).href;

let pdfjs = null;

/** Loaded only when someone actually opens a PDF — it is a large library. */
async function loadPdfjs() {
  if (pdfjs) return pdfjs;

  try {
    pdfjs = await import(PDFJS_URL);
  } catch (error) {
    throw new StatementFileError(
      'reader-unavailable',
      'The statement reader could not load. Check your connection and try again.',
      error
    );
  }

  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
  return pdfjs;
}

export const NEEDS_PASSWORD = 'needs-password';
export const WRONG_PASSWORD = 'wrong-password';
export const NO_TEXT = 'no-text';

export class StatementFileError extends Error {
  constructor(kind, message, cause = null) {
    super(message);
    this.name = 'StatementFileError';
    this.kind = kind;
    // Kept so a failure can be diagnosed rather than guessed at. An earlier
    // version threw away the real reason and reported "something went wrong",
    // which made a broken PDF library look like a broken statement.
    this.cause = cause;
  }
}

/**
 * Read a PDF into positioned scraps of text.
 *
 * Returns { items, pages }. Throws StatementFileError for the two things a
 * person can actually do something about: a password, and a scanned page with
 * no text in it at all.
 */
export async function openPdf(file, password = null) {
  const library = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());

  let task;
  let pdf;
  try {
    task = library.getDocument({
      data,
      password: password || undefined,
      // Nothing about this document may reach the network.
      disableAutoFetch: true,
      disableStream: true,
      isEvalSupported: false
    });
    pdf = await task.promise;
  } catch (error) {
    if (error?.name === 'PasswordException') {
      // 1 means it wants a password; 2 means the one given was wrong.
      throw new StatementFileError(
        error.code === 2 ? WRONG_PASSWORD : NEEDS_PASSWORD,
        error.code === 2
          ? 'That password did not open the statement.'
          : 'This statement is password protected.'
      );
    }

    // "Setting up fake worker failed" means the reader's own worker file did
    // not arrive — a connection problem, not a problem with the statement.
    const detail = String(error?.message || '');
    if (/fake worker|worker/i.test(detail)) {
      throw new StatementFileError(
        'reader-unavailable',
        'The statement reader could not finish loading. Check your connection and try again.',
        error
      );
    }

    throw new StatementFileError(
      'unreadable',
      `This file could not be opened as a PDF${detail ? ` — ${detail}` : ''}.`,
      error
    );
  }

  return pdf;
}

/** Release the document and everything derived from it. */
export async function closePdf(pdf) {
  try {
    if (pdf && typeof pdf.destroy === 'function') await pdf.destroy();
  } catch {
    // Failing to tidy up is not a reason to lose a statement we just read.
  }
}

/**
 * Pull the positioned scraps of text out of an open document.
 *
 * Returns an empty list for a scanned page, which is not a failure — it is the
 * signal to try reading it as a picture instead.
 */
export async function extractText(pdf, onProgress = null) {
  const items = [];
  const pageCount = pdf.numPages;

  for (let number = 1; number <= pageCount; number++) {
    const page = await pdf.getPage(number);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    for (const item of content.items) {
      if (typeof item.str !== 'string' || item.str.trim() === '') continue;

      const x = item.transform[4];
      const y = item.transform[5];

      items.push({
        text: item.str,
        // A PDF measures from the bottom of the page; everything else here
        // reads downwards, so flip it, and keep pages in order.
        y: (number - 1) * viewport.height + (viewport.height - y),
        x,
        width: item.width || 0
      });
    }

    if (onProgress) onProgress(number, pageCount);
    page.cleanup();
  }

  return { items, pages: pageCount };
}

/**
 * Open a PDF, read its text, and close it again.
 *
 * Kept for callers that do not want to fall back to reading a scan.
 */
export async function readPdf(file, password = null, onProgress = null) {
  const pdf = await openPdf(file, password);

  try {
    const result = await extractText(pdf, onProgress);

    if (result.items.length === 0) {
      throw new StatementFileError(
        NO_TEXT,
        'This looks like a scanned or photographed statement. There is no text in it to read.'
      );
    }

    return result;
  } finally {
    await closePdf(pdf);
  }
}
