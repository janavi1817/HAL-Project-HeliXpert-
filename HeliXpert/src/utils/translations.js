/**
 * translations.js
 * Provides a simple `t(key, lang)` helper for UI string localisation.
 * Currently supports English ('en') and Kannada ('kn').
 */

const strings = {
  en: {
    placeholder: 'Ask me anything about helicopters…',
    thinking: 'HeliXpert AI is thinking…',
    listening: 'Listening…',
    send: 'Ask',
    reset: 'Reset',
    voice: 'Voice',
    mute: 'Mute',
    unmute: 'Unmute',
    queryResults: 'Query Results',
    sqlQuery: 'SQL Query',
    readOnly: 'Read-Only',
    barChart: 'Bar Chart',
    trendChart: 'Trend Chart',
    tryLabel: 'Try:',
    errorPrefix: 'Error processing your query:',
  },
  kn: {
    placeholder: 'ಹೆಲಿಕಾಪ್ಟರ್ ಬಗ್ಗೆ ಏನಾದರೂ ಕೇಳಿ…',
    thinking: 'HeliXpert AI ಯೋಚಿಸುತ್ತಿದೆ…',
    listening: 'ಆಲಿಸುತ್ತಿದ್ದೇನೆ…',
    send: 'ಕೇಳಿ',
    reset: 'ಮರುಹೊಂದಿಸು',
    voice: 'ಧ್ವನಿ',
    mute: 'ಮ್ಯೂಟ್',
    unmute: 'ಅನ್‌ಮ್ಯೂಟ್',
    queryResults: 'ಪ್ರಶ್ನೆ ಫಲಿತಾಂಶಗಳು',
    sqlQuery: 'SQL ಪ್ರಶ್ನೆ',
    readOnly: 'ಓದಲು ಮಾತ್ರ',
    barChart: 'ಬಾರ್ ಚಾರ್ಟ್',
    trendChart: 'ಟ್ರೆಂಡ್ ಚಾರ್ಟ್',
    tryLabel: 'ಪ್ರಯತ್ನಿಸಿ:',
    errorPrefix: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುವಲ್ಲಿ ದೋಷ:',
  },
};

/**
 * Returns the localised string for the given key and language.
 * Falls back to English if the key or language is not found.
 *
 * @param {string} key  - Translation key (e.g. 'placeholder')
 * @param {string} lang - Language code ('en' | 'kn')
 * @returns {string}
 */
export function t(key, lang = 'en') {
  const langStrings = strings[lang] || strings.en;
  return langStrings[key] ?? strings.en[key] ?? key;
}
