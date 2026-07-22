import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform, useColorScheme } from "react-native";

export type ThemePreference = "system" | "dark" | "light";
export type ResolvedThemeMode = "dark" | "light";

const STORAGE_KEY = "angel-express-theme-preference";

/**
 * Angel Express Passenger App V5/V6 dark theme.
 *
 * All shared text tokens are intentionally bright enough to remain readable
 * against the dark navy cards and background.
 */
export const darkTheme = {
  mode: "dark" as const,

  bg: "#050B16",
  background: "#050B16",
  surface: "#101827",
  surfaceRaised: "#151F2B",
  overlay: "rgba(5,11,22,0.91)",

  card: "rgba(16,24,39,0.96)",
  card2: "rgba(21,31,43,0.97)",
  cardSolid: "#101827",

  // Primary and secondary text
  text: "#FFFFFF",
  textSecondary: "#EEF2F7",
  text2: "#E5EAF2",

  // Supporting text
  muted: "#CBD3DE",
  muted2: "#B8C2D0",
  disabled: "#8791A0",
  placeholder: "#A8B2C0",

  // Text placed on gold/light buttons
  onGold: "#07111F",
  buttonText: "#07111F",
  inverseText: "#07111F",

  gold: "#D4AF37",
  gold2: "#E0BE4F",
  goldSoft: "rgba(212,175,55,0.16)",
  navy: "#050B16",

  soft: "rgba(255,255,255,0.08)",
  border: "rgba(212,175,55,0.30)",
  lightBorder: "rgba(255,255,255,0.14)",
  borderSoft: "rgba(255,255,255,0.12)",
  divider: "rgba(255,255,255,0.12)",
  input: "rgba(255,255,255,0.08)",
  nav: "rgba(8,14,24,0.98)",

  green: "#4ADE80",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",
  info: "#60A5FA",

  shadow: "#000000",
  goldShadow: "#D4AF37",

  statusBar: "light" as const,
};

/**
 * Angel Express Passenger App V5/V6 light theme.
 */
export const lightTheme = {
  mode: "light" as const,

  bg: "#F7F7F5",
  background: "#F7F7F5",
  surface: "#FFFFFF",
  surfaceRaised: "#FFF8E8",
  overlay: "rgba(247,247,245,0.90)",

  card: "rgba(255,255,255,0.98)",
  card2: "#FFF8E8",
  cardSolid: "#FFFFFF",

  // Primary and secondary text
  text: "#07111F",
  textSecondary: "#303946",
  text2: "#374151",

  // Supporting text
  muted: "#5D6673",
  muted2: "#6B7280",
  disabled: "#9299A3",
  placeholder: "#7B8491",

  // Text placed on gold/dark buttons
  onGold: "#07111F",
  buttonText: "#07111F",
  inverseText: "#FFFFFF",

  gold: "#B8860B",
  gold2: "#D4AF37",
  goldSoft: "rgba(184,134,11,0.13)",
  navy: "#07111F",

  soft: "rgba(7,17,31,0.05)",
  border: "rgba(184,134,11,0.28)",
  lightBorder: "rgba(7,17,31,0.10)",
  borderSoft: "rgba(7,17,31,0.10)",
  divider: "rgba(7,17,31,0.10)",
  input: "rgba(7,17,31,0.055)",
  nav: "rgba(255,255,255,0.98)",

  green: "#16A34A",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#2563EB",

  shadow: "#000000",
  goldShadow: "#B8860B",

  statusBar: "dark" as const,
};

export type AngelThemeColors = typeof darkTheme | typeof lightTheme;

type AngelThemeContextValue = {
  preference: ThemePreference;
  themeMode: ResolvedThemeMode;
  colors: AngelThemeColors;
  isDark: boolean;
  isReady: boolean;
  setThemePreference: (
    preference: ThemePreference
  ) => Promise<void>;
  toggleTheme: () => Promise<void>;
  useSystemTheme: () => Promise<void>;
};

const AngelThemeContext =
  createContext<AngelThemeContextValue | null>(null);

export function AngelThemeProvider({
  children,
}: PropsWithChildren) {
  const systemMode = useColorScheme();

  const [preference, setPreference] =
    useState<ThemePreference>("system");

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function restoreThemePreference() {
      try {
        const savedPreference =
          await AsyncStorage.getItem(STORAGE_KEY);

        const validPreference =
          savedPreference === "system" ||
          savedPreference === "dark" ||
          savedPreference === "light";

        if (mounted && validPreference) {
          setPreference(savedPreference);
        }
      } catch (error) {
        console.warn(
          "Unable to restore Angel Express theme:",
          error
        );
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    void restoreThemePreference();

    return () => {
      mounted = false;
    };
  }, []);

  const themeMode: ResolvedThemeMode =
    preference === "system"
      ? systemMode === "light"
        ? "light"
        : "dark"
      : preference;

  const colors =
    themeMode === "dark" ? darkTheme : lightTheme;

  const setThemePreference = useCallback(
    async (nextPreference: ThemePreference) => {
      setPreference(nextPreference);

      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          nextPreference
        );
      } catch (error) {
        console.warn(
          "Unable to save Angel Express theme:",
          error
        );
      }
    },
    []
  );

  const toggleTheme = useCallback(async () => {
    const nextPreference: ThemePreference =
      themeMode === "dark" ? "light" : "dark";

    await setThemePreference(nextPreference);
  }, [setThemePreference, themeMode]);

  const useSystemTheme = useCallback(async () => {
    await setThemePreference("system");
  }, [setThemePreference]);

  const value = useMemo<AngelThemeContextValue>(
    () => ({
      preference,
      themeMode,
      colors,
      isDark: themeMode === "dark",
      isReady,
      setThemePreference,
      toggleTheme,
      useSystemTheme,
    }),
    [
      colors,
      isReady,
      preference,
      setThemePreference,
      themeMode,
      toggleTheme,
      useSystemTheme,
    ]
  );

  return (
    <AngelThemeContext.Provider value={value}>
      {children}
    </AngelThemeContext.Provider>
  );
}

export function useAngelTheme() {
  const context = useContext(AngelThemeContext);

  if (!context) {
    throw new Error(
      "useAngelTheme must be used inside AngelThemeProvider"
    );
  }

  return context;
}

/**
 * Angel Express V5 shadow utility.
 *
 * Compatible with older screens that call:
 * v5Shadow(colors)
 * v5Shadow(colors.gold)
 * v5Shadow()
 */
export function v5Shadow(
  colorOrTheme?: AngelThemeColors | string | null,
  opacity = 0.22,
  radius = 18,
  elevation = 8
) {
  let shadowColor = "#000000";

  if (typeof colorOrTheme === "string") {
    shadowColor = colorOrTheme;
  } else if (colorOrTheme?.shadow) {
    shadowColor = colorOrTheme.shadow;
  } else if (colorOrTheme?.gold) {
    shadowColor = colorOrTheme.gold;
  }

  return {
    shadowColor,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: {
      width: 0,
      height: Math.max(4, Math.round(radius / 2)),
    },
    elevation: Platform.OS === "android" ? elevation : undefined,
  };
}

/**
 * Gold shadow helper for older V5 cards and buttons.
 */
export function v5GoldShadow(
  colorOrTheme?: AngelThemeColors | string | null,
  opacity = 0.28,
  radius = 16,
  elevation = 8
) {
  let shadowColor = darkTheme.gold;

  if (typeof colorOrTheme === "string") {
    shadowColor = colorOrTheme;
  } else if (colorOrTheme?.gold) {
    shadowColor = colorOrTheme.gold;
  }

  return {
    shadowColor,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: {
      width: 0,
      height: Math.max(4, Math.round(radius / 2)),
    },
    elevation: Platform.OS === "android" ? elevation : undefined,
  };
}

// Backward-compatible Passenger App exports.
export const PassengerThemeProvider = AngelThemeProvider;
export const usePassengerTheme = useAngelTheme;
export type PassengerThemeColors = AngelThemeColors;
