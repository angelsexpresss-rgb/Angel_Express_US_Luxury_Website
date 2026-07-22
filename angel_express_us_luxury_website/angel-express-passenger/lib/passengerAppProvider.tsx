import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AccessibilityInfo,
  DeviceEventEmitter,
} from "react-native";
import * as SecureStore from "expo-secure-store";

export type LanguageCode =
  | "en"
  | "pidgin"
  | "yo"
  | "ig"
  | "ha"
  | "sw"
  | "es"
  | "fr"
  | "ar"
  | "pt"
  | "hi"
  | "zh";

export type GlobalPassengerSettings = {
  preferredLanguage: LanguageCode;
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderHints: boolean;
  soundFeedback: boolean;
  wheelchairSupport: boolean;
  extraBoardingTime: boolean;
  hearingAssistance: boolean;
  visionAssistance: boolean;
  serviceAnimalNotice: boolean;
};

const DEFAULTS: GlobalPassengerSettings = {
  preferredLanguage: "en",
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  screenReaderHints: true,
  soundFeedback: true,
  wheelchairSupport: false,
  extraBoardingTime: false,
  hearingAssistance: false,
  visionAssistance: false,
  serviceAnimalNotice: false,
};

const SETTINGS_STORAGE_KEY = "angel_passenger_settings";

type PassengerAppContextValue = {
  settings: GlobalPassengerSettings;
  language: LanguageCode;
  textScale: number;
  highContrast: boolean;
  reduceMotion: boolean;
  t: (key: string, fallback?: string) => string;
};

const PassengerAppContext =
  createContext<PassengerAppContextValue | null>(null);

/*
  Start with common app strings here. Existing pages can migrate gradually:
  replace "Back" with t("common.back", "Back").
  This avoids rebuilding the app, but true translation of hard-coded text
  still requires those strings to use t().
*/
const translations: Record<
  LanguageCode,
  Record<string, string>
> = {
  en: {
    "common.back": "Back",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.continue": "Continue",
    "common.loading": "Loading...",
    "nav.home": "Home",
    "nav.book": "Book",
    "nav.trips": "Trips",
    "nav.account": "Account",
  },
  pidgin: {
    "common.back": "Go Back",
    "common.save": "Save Am",
    "common.cancel": "Cancel",
    "common.continue": "Continue",
    "common.loading": "E dey load...",
    "nav.home": "Home",
    "nav.book": "Book Ride",
    "nav.trips": "My Trips",
    "nav.account": "Account",
  },
  yo: {
    "common.back": "Pada",
    "common.save": "Fipamọ",
    "common.cancel": "Fagilee",
    "common.continue": "Tẹsiwaju",
    "common.loading": "Ń gbé wọlé...",
    "nav.home": "Ile",
    "nav.book": "Pa Irin-ajo",
    "nav.trips": "Awọn Irin-ajo",
    "nav.account": "Akọọlẹ",
  },
  ig: {
    "common.back": "Laghachi",
    "common.save": "Chekwaa",
    "common.cancel": "Kagbuo",
    "common.continue": "Gaa n'ihu",
    "common.loading": "Na-ebunye...",
    "nav.home": "Ụlọ",
    "nav.book": "Debe Njem",
    "nav.trips": "Njem M",
    "nav.account": "Akaụntụ",
  },
  ha: {
    "common.back": "Koma",
    "common.save": "Ajiye",
    "common.cancel": "Soke",
    "common.continue": "Ci gaba",
    "common.loading": "Ana lodawa...",
    "nav.home": "Gida",
    "nav.book": "Yi Ajiyar Tafiya",
    "nav.trips": "Tafiyoyina",
    "nav.account": "Asusu",
  },
  sw: {
    "common.back": "Rudi",
    "common.save": "Hifadhi",
    "common.cancel": "Ghairi",
    "common.continue": "Endelea",
    "common.loading": "Inapakia...",
    "nav.home": "Nyumbani",
    "nav.book": "Weka Safari",
    "nav.trips": "Safari Zangu",
    "nav.account": "Akaunti",
  },
  es: {
    "common.back": "Atrás",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.continue": "Continuar",
    "common.loading": "Cargando...",
    "nav.home": "Inicio",
    "nav.book": "Reservar",
    "nav.trips": "Viajes",
    "nav.account": "Cuenta",
  },
  fr: {
    "common.back": "Retour",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.continue": "Continuer",
    "common.loading": "Chargement...",
    "nav.home": "Accueil",
    "nav.book": "Réserver",
    "nav.trips": "Trajets",
    "nav.account": "Compte",
  },
  ar: {
    "common.back": "رجوع",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.continue": "متابعة",
    "common.loading": "جارٍ التحميل...",
    "nav.home": "الرئيسية",
    "nav.book": "حجز",
    "nav.trips": "الرحلات",
    "nav.account": "الحساب",
  },
  pt: {
    "common.back": "Voltar",
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.continue": "Continuar",
    "common.loading": "Carregando...",
    "nav.home": "Início",
    "nav.book": "Reservar",
    "nav.trips": "Viagens",
    "nav.account": "Conta",
  },
  hi: {
    "common.back": "वापस",
    "common.save": "सहेजें",
    "common.cancel": "रद्द करें",
    "common.continue": "जारी रखें",
    "common.loading": "लोड हो रहा है...",
    "nav.home": "होम",
    "nav.book": "बुक करें",
    "nav.trips": "यात्राएँ",
    "nav.account": "खाता",
  },
  zh: {
    "common.back": "返回",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.continue": "继续",
    "common.loading": "加载中...",
    "nav.home": "首页",
    "nav.book": "预订",
    "nav.trips": "行程",
    "nav.account": "账户",
  },
};

export function PassengerAppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] =
    useState<GlobalPassengerSettings>(DEFAULTS);

  useEffect(() => {
    loadSettings();

    const settingsSubscription = DeviceEventEmitter.addListener(
      "angel:settings-changed",
      (next: Partial<GlobalPassengerSettings>) => {
        setSettings((current) => ({
          ...current,
          ...next,
        }));
      }
    );

    const languageSubscription = DeviceEventEmitter.addListener(
      "angel:language-changed",
      (language: LanguageCode) => {
        setSettings((current) => ({
          ...current,
          preferredLanguage: language,
        }));
      }
    );

    return () => {
      settingsSubscription.remove();
      languageSubscription.remove();
    };
  }, []);

  async function loadSettings() {
    try {
      const raw = await SecureStore.getItemAsync(
        SETTINGS_STORAGE_KEY
      );

      if (!raw) return;

      const saved = JSON.parse(raw);

      setSettings({
        ...DEFAULTS,
        ...saved,
      });
    } catch {
      setSettings(DEFAULTS);
    }
  }

  useEffect(() => {
    if (settings.screenReaderHints) {
      AccessibilityInfo.isScreenReaderEnabled().catch(() => undefined);
    }
  }, [settings.screenReaderHints]);

  const value = useMemo<PassengerAppContextValue>(() => {
    const language = settings.preferredLanguage || "en";

    return {
      settings,
      language,
      textScale: settings.largeText ? 1.16 : 1,
      highContrast: settings.highContrast,
      reduceMotion: settings.reduceMotion,
      t(key: string, fallback = key) {
        return (
          translations[language]?.[key] ||
          translations.en[key] ||
          fallback
        );
      },
    };
  }, [settings]);

  return (
    <PassengerAppContext.Provider value={value}>
      {children}
    </PassengerAppContext.Provider>
  );
}

export function usePassengerApp() {
  const context = useContext(PassengerAppContext);

  if (!context) {
    throw new Error(
      "usePassengerApp must be used inside PassengerAppProvider"
    );
  }

  return context;
}
