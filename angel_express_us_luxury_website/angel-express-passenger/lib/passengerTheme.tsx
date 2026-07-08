import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { ColorSchemeName, useColorScheme } from "react-native";

type ThemeMode = "dark" | "light";

type PassengerThemeContextValue = {
  themeMode: ThemeMode;
  colors: any;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
};

const PassengerThemeContext = createContext<PassengerThemeContextValue | null>(
  null
);

const darkTheme = {
  mode: "dark",

  bg: "#050B16",
  bg2: "#07111F",
  overlay: "rgba(5,11,22,0.91)",

  card: "rgba(13,20,34,0.94)",
  card2: "rgba(255,255,255,0.06)",
  card3: "rgba(255,255,255,0.09)",

  text: "#FFFFFF",
  text2: "#CBD5E1",
  muted: "#94A3B8",
  muted2: "#64748B",

  gold: "#D4AF37",
  gold2: "#F5D76E",
  navy: "#07111F",
  navy2: "#0B1F3A",

  border: "rgba(212,175,55,0.28)",
  borderSoft: "rgba(255,255,255,0.10)",
  lightBorder: "rgba(255,255,255,0.10)",

  input: "rgba(2,6,23,0.62)",
  inputText: "#FFFFFF",
  placeholder: "rgba(255,255,255,0.45)",

  success: "#22C55E",
  successSoft: "rgba(34,197,94,0.14)",
  danger: "#EF4444",
  dangerSoft: "rgba(239,68,68,0.14)",
  blue: "#38BDF8",
  blueSoft: "rgba(56,189,248,0.14)",

  soft: "rgba(212,175,55,0.10)",
  nav: "rgba(5,11,22,0.98)",
  green: "#22C55E",

  shadow: "rgba(0,0,0,0.42)",
};

const lightTheme = {
  mode: "light",

  bg: "#F8FAFC",
  bg2: "#FFFFFF",
  overlay: "rgba(248,250,252,0.86)",

  card: "rgba(255,255,255,0.96)",
  card2: "rgba(7,17,31,0.04)",
  card3: "rgba(7,17,31,0.07)",

  text: "#07111F",
  text2: "#334155",
  muted: "#64748B",
  muted2: "#94A3B8",

  gold: "#B8860B",
  gold2: "#D4AF37",
  navy: "#07111F",
  navy2: "#0B1F3A",

  border: "rgba(184,134,11,0.30)",
  borderSoft: "rgba(7,17,31,0.10)",
  lightBorder: "rgba(7,17,31,0.10)",

  input: "#FFFFFF",
  inputText: "#07111F",
  placeholder: "rgba(7,17,31,0.42)",

  success: "#16A34A",
  successSoft: "rgba(22,163,74,0.12)",
  danger: "#DC2626",
  dangerSoft: "rgba(220,38,38,0.12)",
  blue: "#0284C7",
  blueSoft: "rgba(2,132,199,0.12)",

  soft: "rgba(184,134,11,0.08)",
  nav: "rgba(255,255,255,0.98)",
  green: "#16A34A",

  shadow: "rgba(15,23,42,0.16)",
};

function getInitialTheme(systemMode: ColorSchemeName): ThemeMode {
  return systemMode === "light" ? "light" : "dark";
}

export function PassengerThemeProvider({ children }: { children: ReactNode }) {
  const systemMode = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    getInitialTheme(systemMode)
  );

  const colors = useMemo(
    () => (themeMode === "dark" ? darkTheme : lightTheme),
    [themeMode]
  );

  function toggleTheme() {
    setThemeMode((current) => (current === "dark" ? "light" : "dark"));
  }

  const value = useMemo(
    () => ({
      themeMode,
      colors,
      toggleTheme,
      setThemeMode,
    }),
    [themeMode, colors]
  );

  return (
    <PassengerThemeContext.Provider value={value}>
      {children}
    </PassengerThemeContext.Provider>
  );
}

export function usePassengerTheme() {
  const context = useContext(PassengerThemeContext);

  if (!context) {
    throw new Error(
      "usePassengerTheme must be used inside PassengerThemeProvider"
    );
  }

  return context;
}

export function v5Shadow(colors: any) {
  return {
    shadowColor: colors.shadow,
    shadowOpacity: colors.mode === "dark" ? 0.35 : 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  };
}

export function money(value: any) {
  const amount = Number(value || 0);

  return `$${amount.toFixed(2)}`;
}

export function cleanStatus(value: any) {
  return String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeStatus(value: any) {
  return String(value || "").toLowerCase().trim();
}

export function getPickupValue(trip: any) {
  return (
    trip?.pickup_address ||
    trip?.pickup ||
    trip?.pickup_location ||
    "Pickup not added"
  );
}

export function getDropoffValue(trip: any) {
  return (
    trip?.dropoff_address ||
    trip?.dropoff ||
    trip?.dropoff_location ||
    trip?.destination ||
    "Drop-off not added"
  );
}

export function getPassengerNameValue(data: any) {
  return (
    data?.passenger_name ||
    data?.name ||
    data?.customer_name ||
    data?.full_name ||
    [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
    "Passenger"
  );
}

export function getDriverNameValue(data: any) {
  const firstLast = [data?.first_name, data?.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    data?.driver_name ||
    data?.assigned_driver_name ||
    data?.full_name ||
    data?.name ||
    firstLast ||
    "Angel Express Chauffeur"
  );
}

export function getTripTotal(trip: any) {
  return Number(
    trip?.total_fare ||
      trip?.total ||
      trip?.total_price ||
      trip?.amount ||
      trip?.balance_due ||
      0
  );
}

export function getTripMilesValue(trip: any) {
  return Number(trip?.estimated_miles || trip?.miles || trip?.distance_miles || 0);
}

export function getPassengerProfileName(profile: any, userEmail?: string) {
  return (
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    profile?.name ||
    userEmail ||
    "Passenger"
  );
}