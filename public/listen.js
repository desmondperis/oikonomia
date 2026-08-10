/* Hearing an expense.
 *
 * Two ways to do it, and a household chooses.
 *
 * The phone's own recogniser is instant, free, needs no download, and works on
 * the cheapest Android. It also sends the recording to Google, as every voice
 * keyboard on the phone already does.
 *
 * The private one keeps the recording on the device. Nothing is uploaded — but
 * it costs a model download of about forty megabytes, once, and takes seconds
 * rather than being instant. On Hindi and on mixed Hindi-English it is
 * noticeably better.
 *
 * Neither is presented as the right answer. The phone's own is the default
 * because it is the one that works on a slow connection and an old handset;
 * the private one is there for whoever wants it.
 */

const PRIVATE_KEY = 'oikonomia.privateVoice.v1';

/* Small enough to download on Indian mobile data without it being a decision
   somebody regrets. The larger models hear better and are not worth the wait
   for three spoken words. */
const MODEL = 'Xenova/whisper-tiny';

/* The library is ours; the model weights come from Hugging Face, because a
   file of this size cannot be served from our own hosting. Only the model
   travels — no recording ever does. */
const LIBRARY = new URL('./vendor/transformers.min.js', import.meta.url).href;

/* However long somebody is willing to hold a phone to their mouth. */
const MOST_SECONDS = 12;

export function privateVoiceWanted() {
  try { return localStorage.getItem(PRIVATE_KEY) === 'yes'; } catch { return false; }
}

export function setPrivateVoice(wanted) {
  try { localStorage.setItem(PRIVATE_KEY, wanted ? 'yes' : 'no'); } catch { /* fine */ }
}

/* ---------- the phone's own recogniser ---------- */

const SpeechRecognition =
  globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;

export function phoneCanListen() {
  return SpeechRecognition !== null;
}

export function privateCanListen() {
  return typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';
}

/**
 * Listen with the phone's own recogniser.
 *
 * Returns a handle so the caller can stop it, and resolves with what was heard.
 */
export function listenWithPhone(language, { onState } = {}) {
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = language;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  let settle = null;
  const heard = new Promise((resolve) => { settle = resolve; });

  recognition.onresult = (event) => {
    settle({ text: event.results?.[0]?.[0]?.transcript ?? '' });
  };

  recognition.onerror = (event) => settle({ error: event.error });
  recognition.onend = () => settle({ text: '' });

  try {
    recognition.start();
    if (onState) onState('listening');
  } catch {
    settle({ error: 'could-not-start' });
  }

  return {
    heard,
    stop: () => { try { recognition.stop(); } catch { /* already stopped */ } }
  };
}

/* ---------- the private recogniser ---------- */

let transcriber = null;

/**
 * Fetch the model, once.
 *
 * `onProgress` is called with a percentage, because forty megabytes with no
 * indication of progress is indistinguishable from a hang.
 */
async function loadTranscriber(onProgress) {
  if (transcriber) return transcriber;

  const module = await import(LIBRARY);
  const { pipeline, env } = module;

  // No attempt to look for the model on our own server; it is not there.
  env.allowLocalModels = false;

  transcriber = await pipeline('automatic-speech-recognition', MODEL, {
    dtype: 'q8',
    progress_callback: (report) => {
      if (!onProgress) return;
      if (report.status === 'progress' && typeof report.progress === 'number') {
        onProgress(Math.round(report.progress));
      }
    }
  });

  return transcriber;
}

/** Whether the model is already on this device. */
export function privateVoiceReady() {
  return transcriber !== null;
}

/** Record from the microphone until told to stop, or until the limit. */
function record() {
  let stop = () => {};

  const done = (async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const finished = new Promise((resolve) => { recorder.onstop = resolve; });

    recorder.start();

    const limit = setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, MOST_SECONDS * 1000);

    stop = () => {
      clearTimeout(limit);
      if (recorder.state !== 'inactive') recorder.stop();
    };

    await finished;
    for (const track of stream.getTracks()) track.stop();

    return new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
  })();

  return { done, stop: () => stop() };
}

/** Turn recorded sound into samples the model can read. */
async function toSamples(blob) {
  const buffer = await blob.arrayBuffer();
  const context = new (globalThis.AudioContext || globalThis.webkitAudioContext)({
    sampleRate: 16000
  });

  const audio = await context.decodeAudioData(buffer);
  const samples = audio.getChannelData(0).slice();
  await context.close();

  return samples;
}

/**
 * Listen with the private recogniser.
 *
 * The recording is made, read and discarded here. It is never uploaded, never
 * stored, and does not outlive the sentence.
 */
export function listenPrivately(language, { onState, onProgress } = {}) {
  const recording = record();

  const heard = (async () => {
    try {
      if (onState) onState('listening');

      const [blob, model] = await Promise.all([
        recording.done,
        loadTranscriber(onProgress)
      ]);

      if (onState) onState('thinking');

      const samples = await toSamples(blob);
      if (samples.length < 1600) return { text: '' }; // under a tenth of a second

      const result = await model(samples, {
        language: language.startsWith('hi') ? 'hindi' : 'english',
        task: 'transcribe'
      });

      return { text: String(result?.text || '').trim() };
    } catch (error) {
      return { error: String(error?.message || error).slice(0, 120) };
    }
  })();

  return { heard, stop: () => recording.stop() };
}

/**
 * Listen, whichever way this household has chosen.
 *
 * Falls back to the phone's own recogniser if the private one cannot start, so
 * choosing the private option never leaves somebody unable to add an expense.
 */
export function listen(language, handlers = {}) {
  if (privateVoiceWanted() && privateCanListen()) {
    const attempt = listenPrivately(language, handlers);

    return {
      stop: attempt.stop,
      heard: attempt.heard.then((result) => {
        if (!result.error) return result;

        const fallback = listenWithPhone(language, handlers);
        return fallback ? fallback.heard : result;
      })
    };
  }

  return listenWithPhone(language, handlers);
}
