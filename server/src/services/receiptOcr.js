/**
 * Tesseract.js OCR wrapper for receipt images.
 *
 * Uses a single lazily-created worker (with a serialized queue) so concurrent
 * scans don't spin up a new ~5 MB WASM process per request, and the trained
 * data is cached on disk after the first run.
 */
import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CACHE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.ocrcache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

let workerPromise = null;
let queue = Promise.resolve();

const getWorker = () => {
    if (!workerPromise) {
    // oem 1 = LSTM_ONLY (best for small/plain documents like receipts)
    // NOTE: `errorHandler` is REQUIRED. tesseract.js otherwise `throw`s inside
    // its message-dispatch path (createWorker.js), which is an uncaught fatal
    // exception that would take the whole server down for a malformed/corrupt
    // upload. Providing it routes errors as normal rejected jobs instead.
    workerPromise = createWorker('eng', 1, {
      cachePath: CACHE_DIR,
      gzip: true,
      logger: () => {}, // silence per-line progress noise
      errorHandler: () => {}, // swallow → reject path below recovers
    })
      .then(async (worker) => {
        await worker.setParameters({
          tessedit_pageseg_mode: '6', // assume a single uniform block
          preserve_interword_spaces: '1',
        });
        return worker;
      })
      .catch((err) => {
        workerPromise = null; // allow retry on next request
        throw err;
      });
  }
  return workerPromise;
};

/**
 * Recognize text in the image at `imagePath`.
 * @returns {Promise<{ text: string, confidence: number }>}
 */
export const ocrReceiptImage = (imagePath) => {
  const task = queue
    .then(async () => {
      const worker = await getWorker();
      const { data } = await worker.recognize(imagePath);
      return {
        text: (data.text || '').trim(),
        confidence: Number.isFinite(data.confidence) ? data.confidence : 0,
      };
    })
    .catch((err) => {
      throw err;
    });

  // Serialize the queue but don't let a failure poison future requests.
  queue = task.then(
    () => undefined,
    () => undefined
  );
  return task;
};

export default ocrReceiptImage;