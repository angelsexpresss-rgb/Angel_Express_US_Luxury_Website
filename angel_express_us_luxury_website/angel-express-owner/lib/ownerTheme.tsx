import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ColorSchemeName, useColorScheme } from "react-native";

export type OwnerThemeMode = "light" | "dark" | "system";

export type OwnerThemeColors = {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;

  surface: string;
  surfaceElevated: string;
  surfaceSoft: string;
  surfaceMuted: string;

  card: string;
  cardSecondary: string;
  cardBorder: string;
  cardBorderStrong: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  primary: string;
  primaryLight: string;
  primaryDark: string;

  gold: string;
  goldLight: string;
  goldDark: string;
  goldMuted: string;
  goldTransparent: string;

  success: string;
  successSoft: string;

  warning: string;
  warningSoft: string;

  danger: string;
  dangerSoft: string;

  info: string;
  infoSoft: string;

  online: string;
  offline: string;

  divider: string;
  inputBackground: string;
  inputBorder: string;
  inputPlaceholder: string;

  tabBar: string;
  tabBarBorder: string;

  overlay: string;
  backdrop: string;

  shadow: string;
};

export type OwnerTheme = {
  dark: boolean;
  mode: OwnerThemeMode;
  colors: OwnerThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    section: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    pill: number;
  };
  typography: {
    display: number;
    title: number;
    heading: number;
    subheading: number;
    body: number;
    caption: number;
    tiny: number;
  };
  shadows: {
    soft: {
      shadowColor: string;
      shadowOffset: {
        width: number;
        height: number;
      };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    medium: {
      shadowColor: string;
      shadowOffset: {
        width: number;
        height: number;
      };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    premium: {
      shadowColor: string;
      shadowOffset: {
        width: number;
        height: number;
      };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    gold: {
      shadowColor: string;
      shadowOffset: {
        width: number;
        height: number;
      };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
};

type OwnerThemeContextValue = {
  theme: OwnerTheme;
  mode: OwnerThemeMode;
  isDark: boolean;
  setMode: (mode: OwnerThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const OWNER_THEME_STORAGE_KEY = "@angel_express_owner_theme";

const darkColors: OwnerThemeColors = {
  background: "#050B16",
  backgroundSecondary: "#08111F",
  backgroundTertiary: "#0B1627",

  surface: "#0D192A",
  surfaceElevated: "#111F33",
  surfaceSoft: "#14243A",
  surfaceMuted: "#182A42",

  card: "rgba(13, 25, 42, 0.96)",
  cardSecondary: "rgba(17, 31, 51, 0.94)",
  cardBorder: "rgba(212, 175, 55, 0.18)",
  cardBorderStrong: "rgba(212, 175, 55, 0.42)",

  text: "#F7F4EC",
  textSecondary: "#C7CFD9",
  textMuted: "#8794A6",
  textInverse: "#07101D",

  primary: "#D4AF37",
  primaryLight: "#F3D77B",
  primaryDark: "#A98216",

  gold: "#D4AF37",
  goldLight: "#F5DB80",
  goldDark: "#9D7610",
  goldMuted: "#B89B44",
  goldTransparent: "rgba(212, 175, 55, 0.14)",

  success: "#39C98A",
  successSoft: "rgba(57, 201, 138, 0.14)",

  warning: "#F5B942",
  warningSoft: "rgba(245, 185, 66, 0.14)",

  danger: "#F0616A",
  dangerSoft: "rgba(240, 97, 106, 0.14)",

  info: "#55A7FF",
  infoSoft: "rgba(85, 167, 255, 0.14)",

  online: "#39C98A",
  offline: "#6E7A8B",

  divider: "rgba(255, 255, 255, 0.07)",
  inputBackground: "rgba(255, 255, 255, 0.045)",
  inputBorder: "rgba(255, 255, 255, 0.1)",
  inputPlaceholder: "#778396",

  tabBar: "rgba(5, 11, 22, 0.98)",
  tabBarBorder: "rgba(212, 175, 55, 0.13)",

  overlay: "rgba(5, 11, 22, 0.82)",
  backdrop: "rgba(0, 0, 0, 0.62)",

  shadow: "#000000",
};

const lightColors: OwnerThemeColors = {
  background: "#F5F7FA",
  backgroundSecondary: "#EEF2F6",
  backgroundTertiary: "#E7ECF2",

  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  surfaceSoft: "#F7F9FC",
  surfaceMuted: "#EDF1F6",

  card: "#FFFFFF",
  cardSecondary: "#FAFBFD",
  cardBorder: "rgba(12, 29, 50, 0.08)",
  cardBorderStrong: "rgba(180, 136, 20, 0.28)",

  text: "#0B1728",
  textSecondary: "#425066",
  textMuted: "#7B8798",
  textInverse: "#FFFFFF",

  primary: "#B88B17",
  primaryLight: "#D7B54B",
  primaryDark: "#8B6710",

  gold: "#B88B17",
  goldLight: "#DDBE62",
  goldDark: "#89640D",
  goldMuted: "#A5873C",
  goldTransparent: "rgba(184, 139, 23, 0.1)",

  success: "#168A5B",
  successSoft: "rgba(22, 138, 91, 0.1)",

  warning: "#C77E08",
  warningSoft: "rgba(199, 126, 8, 0.1)",

  danger: "#D63C4A",
  dangerSoft: "rgba(214, 60, 74, 0.1)",

  info: "#267BC8",
  infoSoft: "rgba(38, 123, 200, 0.1)",

  online: "#168A5B",
  offline: "#97A1AF",

  divider: "rgba(12, 29, 50, 0.07)",
  inputBackground: "#F7F9FC",
  inputBorder: "rgba(12, 29, 50, 0.1)",
  inputPlaceholder: "#98A2B1",

  tabBar: "rgba(255, 255, 255, 0.98)",
  tabBarBorder: "rgba(12, 29, 50, 0.08)",

  overlay: "rgba(245, 247, 250, 0.88)",
  backdrop: "rgba(5, 11, 22, 0.44)",

  shadow: "#0B1728",
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  section: 36,
};

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
};

const typography = {
  display: 34,
  title: 28,
  heading: 22,
  subheading: 18,
  body: 15,
  caption: 13,
  tiny: 11,
};

function createOwnerTheme(
  dark: boolean,
  mode: OwnerThemeMode
): OwnerTheme {
  const colors = dark ? darkColors : lightColors;

  return {
    dark,
    mode,
    colors,
    spacing,
    radius,
    typography,

    shadows: {
      soft: {
        shadowColor: colors.shadow,
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: dark ? 0.16 : 0.06,
        shadowRadius: 10,
        elevation: 3,
      },

      medium: {
        shadowColor: colors.shadow,
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: dark ? 0.22 : 0.09,
        shadowRadius: 18,
        elevation: 6,
      },

      premium: {
        shadowColor: colors.shadow,
        shadowOffset: {
          width: 0,
          height: 14,
        },
        shadowOpacity: dark ? 0.34 : 0.12,
        shadowRadius: 30,
        elevation: 10,
      },

      gold: {
        shadowColor: colors.gold,
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: dark ? 0.28 : 0.18,
        shadowRadius: 18,
        elevation: 8,
      },
    },
  };
}

const OwnerThemeContext =
  createContext<OwnerThemeContextValue | null>(null);

type OwnerThemeProviderProps = {
  children: ReactNode;
};

function resolveSystemTheme(
  colorScheme: ColorSchemeName
): boolean {
  return colorScheme === "dark";
}

export function OwnerThemeProvider({
  children,
}: OwnerThemeProviderProps) {
  const systemColorScheme = useColorScheme();

  const [mode, setThemeMode] =
    useState<OwnerThemeMode>("dark");

  const [isThemeReady, setIsThemeReady] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadStoredTheme() {
      try {
        const storedMode =
          await AsyncStorage.getItem(
            OWNER_THEME_STORAGE_KEY
          );

        if (
          storedMode === "dark" ||
          storedMode === "light" ||
          storedMode === "system"
        ) {
          if (isMounted) {
            setThemeMode(storedMode);
          }
        }
      } catch (error) {
        console.warn(
          "Unable to load owner theme preference:",
          error
        );
      } finally {
        if (isMounted) {
          setIsThemeReady(true);
        }
      }
    }

    loadStoredTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const isDark =
    mode === "system"
      ? resolveSystemTheme(systemColorScheme)
      : mode === "dark";

  const theme = useMemo(
    () => createOwnerTheme(isDark, mode),
    [isDark, mode]
  );

  const setMode = async (
    newMode: OwnerThemeMode
  ) => {
    setThemeMode(newMode);

    try {
      await AsyncStorage.setItem(
        OWNER_THEME_STORAGE_KEY,
        newMode
      );
    } catch (error) {
      console.warn(
        "Unable to save owner theme preference:",
        error
      );
    }
  };

  const toggleTheme = async () => {
    const nextMode: OwnerThemeMode =
      isDark ? "light" : "dark";

    await setMode(nextMode);
  };

  const contextValue = useMemo(
    () => ({
      theme,
      mode,
      isDark,
      setMode,
      toggleTheme,
    }),
    [theme, mode, isDark]
  );

  if (!isThemeReady) {
    return null;
  }

  return (
    <OwnerThemeContext.Provider
      value={contextValue}
    >
      {children}
    </OwnerThemeContext.Provider>
  );
}

export function useOwnerTheme() {
  const context = useContext(OwnerThemeContext);

  if (!context) {
    throw new Error(
      "useOwnerTheme must be used inside OwnerThemeProvider."
    );
  }

  return context;
}

export function useOwnerColors() {
  return useOwnerTheme().theme.colors;
}

export const ownerStatusColors = {
  pending: {
    color: "#F5B942",
    background: "rgba(245, 185, 66, 0.14)",
  },

  confirmed: {
    color: "#55A7FF",
    background: "rgba(85, 167, 255, 0.14)",
  },

  assigned: {
    color: "#9B7CF6",
    background: "rgba(155, 124, 246, 0.14)",
  },

  accepted: {
    color: "#48B7C6",
    background: "rgba(72, 183, 198, 0.14)",
  },

  arriving: {
    color: "#F59E5B",
    background: "rgba(245, 158, 91, 0.14)",
  },

  inProgress: {
    color: "#39C98A",
    background: "rgba(57, 201, 138, 0.14)",
  },

  completed: {
    color: "#39C98A",
    background: "rgba(57, 201, 138, 0.14)",
  },

  cancelled: {
    color: "#F0616A",
    background: "rgba(240, 97, 106, 0.14)",
  },

  refunded: {
    color: "#A7B0BE",
    background: "rgba(167, 176, 190, 0.14)",
  },

  emergency: {
    color: "#FF4D5A",
    background: "rgba(255, 77, 90, 0.16)",
  },
};

export const ownerGradients = {
  darkBackground: [
    "#050B16",
    "#081425",
    "#0B1A2E",
  ] as const,

  lightBackground: [
    "#F8FAFC",
    "#F2F5F9",
    "#EAF0F6",
  ] as const,

  gold: [
    "#F4DA7A",
    "#D4AF37",
    "#A97D12",
  ] as const,

  goldSoft: [
    "rgba(244, 218, 122, 0.2)",
    "rgba(212, 175, 55, 0.1)",
    "rgba(169, 125, 18, 0.04)",
  ] as const,

  premiumCard: [
    "rgba(20, 36, 58, 0.98)",
    "rgba(10, 22, 39, 0.98)",
  ] as const,

  success: [
    "#51D89A",
    "#168A5B",
  ] as const,

  danger: [
    "#FF7A83",
    "#D63C4A",
  ] as const,

  information: [
    "#69B6FF",
    "#267BC8",
  ] as const,
};

export function getOwnerBookingStatusStyle(
  status?: string | null
) {
  const normalizedStatus = String(
    status || "pending"
  )
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  switch (normalizedStatus) {
    case "confirmed":
      return ownerStatusColors.confirmed;

    case "assigned":
    case "driverassigned":
      return ownerStatusColors.assigned;

    case "accepted":
    case "driveraccepted":
      return ownerStatusColors.accepted;

    case "arriving":
    case "driverarriving":
      return ownerStatusColors.arriving;

    case "inprogress":
    case "active":
    case "started":
      return ownerStatusColors.inProgress;

    case "completed":
      return ownerStatusColors.completed;

    case "cancelled":
    case "canceled":
      return ownerStatusColors.cancelled;

    case "refunded":
      return ownerStatusColors.refunded;

    case "emergency":
    case "sos":
      return ownerStatusColors.emergency;

    case "pending":
    case "pendingconfirmation":
    default:
      return ownerStatusColors.pending;
  }
}