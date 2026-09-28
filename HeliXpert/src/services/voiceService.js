/**
 * voiceService.js
 * Provides browser-native Web Speech API utilities:
 *  - startListening  : speech-to-text via SpeechRecognition
 *  - speak           : text-to-speech via SpeechSynthesis
 *  - stopSpeaking    : cancel any ongoing speech
 *  - isSupported     : capability detection helper
 */

// ─── Capability Detection ────────────────────────────────────────────────────

/**
 * Returns an object describing which voice features the current browser supports.
 * @returns {{ recognition: boolean, synthesis: boolean }}
 */
export function isSupported() {
  return {
    recognition:
      typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    synthesis:
      typeof window !== 'undefined' && !!window.speechSynthesis,
  };
}

// ─── Language Code Mapping ───────────────────────────────────────────────────

/**
 * Maps the app's language codes to BCP-47 locale strings used by the Web
 * Speech API.
 */
const LANG_MAP = {
  en: 'en-US',
  kn: 'kn-IN',
};

function toBcp47(lang) {
  return LANG_MAP[lang] || 'en-US';
}

// ─── Speech Recognition (STT) ────────────────────────────────────────────────

/**
 * Starts listening for speech input and returns the SpeechRecognition instance
 * so the caller can stop it manually if needed.
 *
 * @param {string}   lang        - App language code ('en' | 'kn')
 * @param {function} onResult    - Called with the recognised transcript string
 * @param {function} onError     - Called with an error message string
 * @returns {SpeechRecognition|null}
 */
export function startListening(lang, onResult, onError) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError('SpeechRecognition is not supported in this browser.');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = toBcp47(lang);
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (onResult) onResult(transcript);
  };

  recognition.onerror = (event) => {
    if (onError) onError(event.error || 'Unknown recognition error');
  };

  recognition.onend = () => {
    // Recognition ended naturally (e.g. silence timeout); the caller will
    // handle UI state updates via onResult / onError callbacks.
  };

  try {
    recognition.start();
  } catch (err) {
    if (onError) onError(err.message);
    return null;
  }

  return recognition;
}

// ─── Speech Synthesis (TTS) ──────────────────────────────────────────────────

/**
 * Speaks the given text using the browser's speech synthesis engine.
 *
 * @param {string} text - The text to speak
 * @param {string} lang - App language code ('en' | 'kn')
 */
export function speak(text, lang = 'en') {
  if (!window.speechSynthesis) return;

  // Cancel anything currently being spoken before starting a new utterance.
  window.speechSynthesis.cancel();

  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = toBcp47(lang);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Attempt to pick a voice that matches the requested language.
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find((v) => v.lang.startsWith(utterance.lang.split('-')[0]));
  if (matchedVoice) utterance.voice = matchedVoice;

  window.speechSynthesis.speak(utterance);
}

/**
 * Immediately stops any ongoing speech synthesis.
 */
export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
