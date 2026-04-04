import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import ar from "./locales/ar";
import de from "./locales/de";
import ru from "./locales/ru";

export const LANGUAGES = { en, ar, de, ru } as const;
export type LangCode = keyof typeof LANGUAGES;

export const LANGUAGE_LIST: { code: LangCode; name: string; native: string; flag: string; dir: string }[] =
  Object.entries(LANGUAGES).map(([code, val]) => ({
    code: code as LangCode,
    name: val.lang.name,
    native: val.lang.native,
    flag: val.lang.flag,
    dir: val.lang.dir,
  }));

const stored = localStorage.getItem("gustilk_language");
const isValid = (code: string | null): code is LangCode => !!code && code in LANGUAGES;
const savedLang: LangCode = isValid(stored) ? stored : "en";
if (!isValid(stored)) localStorage.setItem("gustilk_language", "en");

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries(LANGUAGES).map(([code, translations]) => [code, { translation: translations }])
  ),
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(code: LangCode) {
  localStorage.setItem("gustilk_language", code);
  i18n.changeLanguage(code);
  const dir = LANGUAGES[code].lang.dir;
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", code);
}

const initDir = LANGUAGES[savedLang]?.lang?.dir ?? "ltr";
document.documentElement.setAttribute("dir", initDir);
document.documentElement.setAttribute("lang", savedLang);

export default i18n;
