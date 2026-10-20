import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, Language } from "./translations";

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: keyof typeof translations.pl) => string;
}

const STORAGE_KEY = "connectme_mobile_language";

export const useI18n = create<I18nState>((set, get) => ({
  language: "pl", // Polish is primary default
  setLanguage: async (lang: Language) => {
    set({ language: lang });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      console.warn("Failed to persist language:", e);
    }
  },
  t: (key: keyof typeof translations.pl) => {
    const current = get().language;
    const dict = translations[current] || translations.pl;
    return dict[key] || translations.pl[key] || (key as string);
  },
}));

// Initialize language from AsyncStorage on app launch
AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
  if (saved && (saved === "pl" || saved === "en" || saved === "uk" || saved === "ru")) {
    useI18n.setState({ language: saved as Language });
  }
});
