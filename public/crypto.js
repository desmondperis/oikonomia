/* The household's key.
 *
 * A household's records are encrypted on their own devices before anything
 * leaves them. The key is never sent anywhere and never stored on the server:
 * it is derived, every time, from a phrase the household holds.
 *
 * That has two consequences worth being clear about.
 *
 * Whoever runs the server — including the person who built this — cannot read a
 * household's finances. Not as a promise, but because what is stored is
 * unreadable without a phrase the server has never seen.
 *
 * And a household that loses every device and forgets the phrase cannot get
 * their records back. Nobody can. That is the same fact stated from the other
 * side, and the app says so plainly before it ever asks anyone to rely on it.
 */

/* Words chosen to be short, common, and hard to confuse when said aloud or
   written down — no homophones, nothing that looks like something else. Twelve
   of these is about ninety-six bits, which is far beyond guessing. */
const WORDS = [
  'able', 'acid', 'acre', 'aim', 'air', 'alarm', 'album', 'alley', 'almond', 'amber',
  'anchor', 'angle', 'ankle', 'apple', 'apron', 'arch', 'arm', 'army', 'arrow', 'ash',
  'attic', 'autumn', 'axis', 'bacon', 'badge', 'bag', 'baker', 'bamboo', 'banana', 'band',
  'barn', 'basil', 'basket', 'beach', 'bean', 'bell', 'belt', 'bench', 'berry', 'bird',
  'blade', 'blanket', 'block', 'board', 'boat', 'bone', 'book', 'boot', 'bottle', 'bowl',
  'branch', 'brass', 'bread', 'brick', 'bridge', 'broom', 'brush', 'bucket', 'bulb', 'bundle',
  'button', 'cabin', 'cable', 'camel', 'camp', 'candle', 'canvas', 'card', 'carpet', 'carrot',
  'cart', 'castle', 'cave', 'cedar', 'chain', 'chair', 'chalk', 'cherry', 'chest', 'clay',
  'cliff', 'clock', 'cloth', 'cloud', 'clover', 'coast', 'cocoa', 'coin', 'collar', 'comb',
  'copper', 'coral', 'cotton', 'crane', 'crayon', 'cream', 'crow', 'crown', 'cube', 'cup',
  'curtain', 'dawn', 'deer', 'desk', 'dew', 'diamond', 'dish', 'dock', 'donkey', 'door',
  'dove', 'drum', 'duck', 'dust', 'eagle', 'earth', 'east', 'egg', 'elbow', 'elm',
  'ember', 'engine', 'envelope', 'fabric', 'falcon', 'farm', 'feather', 'fence', 'fern', 'field',
  'fig', 'finger', 'flag', 'flame', 'flask', 'flute', 'fog', 'forest', 'fork', 'fountain',
  'fox', 'frost', 'fruit', 'garden', 'gate', 'ginger', 'glass', 'glove', 'goat', 'gold',
  'grain', 'grape', 'grass', 'gravel', 'green', 'guitar', 'hammer', 'harbour', 'harvest', 'hawk',
  'hedge', 'helmet', 'herb', 'hill', 'honey', 'hook', 'horse', 'ice', 'ink', 'iron',
  'island', 'ivory', 'jacket', 'jar', 'jelly', 'jewel', 'jungle', 'kettle', 'key', 'kite',
  'ladder', 'lake', 'lamp', 'lantern', 'lawn', 'leaf', 'leather', 'lemon', 'lentil', 'letter',
  'lily', 'lime', 'linen', 'lion', 'lock', 'lotus', 'mango', 'maple', 'marble', 'mask',
  'meadow', 'melon', 'metal', 'mint', 'mirror', 'mist', 'monkey', 'moon', 'moss', 'mountain',
  'mouse', 'mud', 'mushroom', 'music', 'nest', 'net', 'noon', 'north', 'nutmeg', 'oak',
  'oar', 'ocean', 'olive', 'onion', 'orange', 'orchard', 'otter', 'owl', 'paddle', 'palm',
  'paper', 'parrot', 'pearl', 'pebble', 'pencil', 'pepper', 'piano', 'pigeon', 'pillow', 'pine',
  'pipe', 'plum', 'pocket', 'pond', 'pony', 'pot', 'pumpkin', 'quilt', 'rabbit', 'radish',
  'rain', 'rattle', 'raven', 'ribbon', 'rice', 'river', 'road', 'robin', 'rock', 'rope'
];

const PHRASE_LENGTH = 12;
const ROUNDS = 250000;

/* ---------- the phrase ---------- */

/** A fresh phrase, from the device's own source of randomness. */
export function newPhrase() {
  const picks = new Uint32Array(PHRASE_LENGTH);
  crypto.getRandomValues(picks);

  return Array.from(picks, (pick) => WORDS[pick % WORDS.length]).join(' ');
}

/** Tidy what somebody typed, so spacing and capitals never matter. */
export function tidyPhrase(phrase) {
  return String(phrase || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/** Whether a typed phrase is even the right shape, before trying it. */
export function phraseLooksRight(phrase) {
  const words = tidyPhrase(phrase).split(' ').filter(Boolean);
  if (words.length !== PHRASE_LENGTH) return false;
  return words.every((word) => WORDS.includes(word));
}

/** Words we do not recognise, so somebody can be told which one is wrong. */
export function unknownWords(phrase) {
  return tidyPhrase(phrase)
    .split(' ')
    .filter(Boolean)
    .filter((word) => !WORDS.includes(word));
}

/* ---------- the key ---------- */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Turn the phrase into a key.
 *
 * The household's code is the salt, so two households who somehow chose the
 * same phrase still end up with different keys. The work factor is high enough
 * that guessing phrases is not worth anybody's time.
 */
export async function deriveKey(phrase, householdCode) {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(tidyPhrase(phrase)),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(`oikonomia:${String(householdCode).toUpperCase()}`),
      iterations: ROUNDS,
      hash: 'SHA-256'
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/* ---------- locking and unlocking ---------- */

function toBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/**
 * Lock a record.
 *
 * A fresh random opening value each time, kept alongside the result — it is not
 * a secret, and reusing one would be.
 */
export async function seal(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(value))
  );

  return { iv: toBase64(iv), body: toBase64(new Uint8Array(sealed)) };
}

/** Unlock a record. Returns null rather than throwing when the key is wrong. */
export async function unseal(key, sealed) {
  try {
    const opened = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(sealed.iv) },
      key,
      fromBase64(sealed.body)
    );

    return JSON.parse(decoder.decode(opened));
  } catch {
    return null;
  }
}

/* ---------- proving a phrase is the right one ---------- */

const CHECK_VALUE = 'oikonomia-household-check';

/**
 * A small sealed token, kept with the household.
 *
 * It lets a phone say "that phrase is wrong" immediately, instead of quietly
 * syncing records it cannot read. It reveals nothing: it is the same known
 * words for every household, sealed with their own key.
 */
export async function makeCheck(key) {
  return seal(key, CHECK_VALUE);
}

export async function checkPasses(key, check) {
  if (!check) return false;
  return (await unseal(key, check)) === CHECK_VALUE;
}
