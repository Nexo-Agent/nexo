/* eslint-disable no-undef */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localesPath = join(__dirname, '../src/i18n/locales');

// Read all translation files
function readJSON(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return {};
  }
}

function writeJSON(filePath, data) {
  try {
    const content = JSON.stringify(data, null, 2);
    writeFileSync(filePath, content + '\n', 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
  }
}

// Sync translations from other namespaces
function syncTranslations() {
  const namespaces = ['common', 'chat', 'settings'];
  const languages = ['en', 'vi'];

  // First, collect all translations from all namespaces
  const allTranslations = {};

  for (const lang of languages) {
    allTranslations[lang] = {};
    for (const ns of namespaces) {
      const filePath = join(localesPath, lang, `${ns}.json`);
      allTranslations[lang][ns] = readJSON(filePath);
    }
  }

  // Sync missing translations
  for (const lang of languages) {
    for (const ns of namespaces) {
      const current = allTranslations[lang][ns];
      const updated = { ...current };
      let updatedCount = 0;

      // Check each key in current namespace
      for (const [key, value] of Object.entries(current)) {
        // If value is __STRING_NOT_TRANSLATED__, try to find it in other namespaces
        if (value === '__STRING_NOT_TRANSLATED__') {
          // First, check if it exists in English version of same namespace
          if (
            lang === 'vi' &&
            allTranslations['en'][ns][key] &&
            allTranslations['en'][ns][key] !== '__STRING_NOT_TRANSLATED__'
          ) {
            // Check if it exists in Vietnamese version of other namespaces
            let found = false;
            for (const otherNs of namespaces) {
              if (
                otherNs !== ns &&
                allTranslations['vi'][otherNs][key] &&
                allTranslations['vi'][otherNs][key] !==
                  '__STRING_NOT_TRANSLATED__'
              ) {
                updated[key] = allTranslations['vi'][otherNs][key];
                found = true;
                updatedCount++;
                break;
              }
            }

            // If not found in other namespaces, check English version
            if (
              !found &&
              allTranslations['en'][ns][key] !== '__STRING_NOT_TRANSLATED__'
            ) {
              // Keep __STRING_NOT_TRANSLATED__ for now, will be translated manually
              // Or we can use English as fallback
              // updated[key] = allTranslations['en'][ns][key];
            }
          }
        }
      }

      if (updatedCount > 0) {
        const filePath = join(localesPath, lang, `${ns}.json`);
        writeJSON(filePath, updated);
        console.log(`Updated ${updatedCount} keys in ${lang}/${ns}.json`);
      }
    }
  }

  console.log('Translation sync completed!');
}

syncTranslations();
