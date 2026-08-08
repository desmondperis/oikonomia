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
  pdfjs = await import(PDFJS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
  return pdfjs;
}

export const NEEDS_PASSWORD = 'needs-password';
export const WRONG_PASSWORD = 'wrong-password';
export const NO_TEXT = 'no-text';

export class StatementFileError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'StatementFileError';
    this.kind = kind;
  }
}

/**
 * Read a PDF into positioned scraps of text.
 *
 * Returns { items, pages }. Throws StatementFileError for the two things a
 * person can actually do something about: a password, and a scanned page with
 * no text in it at all.
 */
export async function readPdf(file, password = null, onProgress = null) {
  const library = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());

  let document;
  try {
    document = await library.getDocument({
      data,
      password: password || undefined,
      // Nothing about this document may reach the network.
      disableAutoFetch: true,
      disableStream: true,
      isEvalSupported: false
    }).promise;
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
    throw new StatementFileError('unreadable', 'This file could not be opened as a PDF.');
  }

  const items = [];

  for (let number = 1; number <= document.numPages; number++) {
    const page = await document.getPage(number);
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

    if (onProgress) onProgress(number, document.numPages);
    page.cleanup();
  }

  await document.destroy();

  if (items.length === 0) {
    throw new StatementFileError(
      NO_TEXT,
      'This looks like a scanned or photographed statement. There is no text in it to read.'
    );
  }

  return { items, pages: document.numPages };
}
