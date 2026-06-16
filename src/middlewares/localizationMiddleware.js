import fs from 'fs';
import path from 'path';

// Load translation files from frontend directory
const enPath = path.resolve(process.cwd(), '../frontend/src/locales/en/translation.json');
const arPath = path.resolve(process.cwd(), '../frontend/src/locales/ar/translation.json');

let enTranslations = {};
let arTranslations = {};

try {
  if (fs.existsSync(enPath)) {
    enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  } else {
    console.warn(`[i18n] English translation file not found at: ${enPath}`);
  }

  if (fs.existsSync(arPath)) {
    arTranslations = JSON.parse(fs.readFileSync(arPath, 'utf8'));
  } else {
    console.warn(`[i18n] Arabic translation file not found at: ${arPath}`);
  }
} catch (error) {
  console.error('[i18n] Failed to load translation files in backend:', error.message);
}

const getNestedTranslation = (obj, key) => {
  const parts = key.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return typeof current === 'string' ? current : null;
};

export const localizationMiddleware = (req, res, next) => {
  // Determine language preference from x-lang header, query string, or Accept-Language header
  const langHeader = req.headers['x-lang'] || req.query.lang || req.headers['accept-language'];
  let lang = 'en'; // default

  if (langHeader) {
    if (langHeader.toLowerCase().includes('ar')) {
      lang = 'ar';
    }
  }

  const translations = lang === 'ar' ? arTranslations : enTranslations;

  req.t = (key, variables = {}) => {
    let text = getNestedTranslation(translations, key) || getNestedTranslation(enTranslations, key) || key;
    
    // Replace dynamic variables: e.g. {{name}}
    Object.keys(variables).forEach(k => {
      text = text.replace(new RegExp(`{{${k}}}`, 'g'), variables[k]);
    });
    
    return text;
  };

  next();
};
