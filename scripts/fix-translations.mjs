import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localesPath = join(__dirname, '../src/i18n/locales');

// Read JSON file
function readJSON(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return {};
  }
}

// Write JSON file
function writeJSON(filePath, data) {
  try {
    const content = JSON.stringify(data, null, 2);
    writeFileSync(filePath, content + '\n', 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
  }
}

// Load all translation files
const namespaces = ['common', 'chat', 'settings'];
const languages = ['en', 'vi'];

const translations = {};
for (const lang of languages) {
  translations[lang] = {};
  for (const ns of namespaces) {
    const filePath = join(localesPath, lang, `${ns}.json`);
    translations[lang][ns] = readJSON(filePath);
  }
}

// Function to find translation in other namespaces
function findTranslation(key, targetLang, targetNs) {
  // First, check if it exists in the correct namespace in target language
  if (translations[targetLang][targetNs][key] && 
      translations[targetLang][targetNs][key] !== '__STRING_NOT_TRANSLATED__') {
    return translations[targetLang][targetNs][key];
  }
  
  // Check other namespaces in target language
  for (const ns of namespaces) {
    if (ns !== targetNs && translations[targetLang][ns][key] && 
        translations[targetLang][ns][key] !== '__STRING_NOT_TRANSLATED__') {
      return translations[targetLang][ns][key];
    }
  }
  
  // Check English version of same namespace
  if (targetLang === 'vi' && translations['en'][targetNs][key] && 
      translations['en'][targetNs][key] !== '__STRING_NOT_TRANSLATED__') {
    // Return English as fallback (will need manual translation)
    return null;
  }
  
  return null;
}

// Fix translations
let totalFixed = 0;

for (const ns of namespaces) {
  const viFile = translations['vi'][ns];
  const enFile = translations['en'][ns];
  const updated = { ...viFile };
  let fixed = 0;
  
  for (const [key, value] of Object.entries(viFile)) {
    if (value === '__STRING_NOT_TRANSLATED__') {
      // Try to find translation
      const found = findTranslation(key, 'vi', ns);
      if (found) {
        updated[key] = found;
        fixed++;
        totalFixed++;
      } else if (enFile[key] && enFile[key] !== '__STRING_NOT_TRANSLATED__') {
        // Keep English for now, but mark that it needs translation
        // We'll update these manually
        console.log(`Need manual translation: ${ns}.${key} = "${enFile[key]}"`);
      }
    }
  }
  
  if (fixed > 0) {
    const filePath = join(localesPath, 'vi', `${ns}.json`);
    writeJSON(filePath, updated);
    console.log(`Fixed ${fixed} keys in vi/${ns}.json`);
  }
}

console.log(`\nTotal fixed: ${totalFixed} keys`);
console.log('\nNote: Some keys may still need manual translation from English.');

