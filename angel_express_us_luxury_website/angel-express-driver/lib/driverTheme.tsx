import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

export type DriverThemeMode = "dark" | "light";

export const AE_DARK = {
  mode: "dark" as DriverThemeMode,

  bg: "#050B16",
  bg2: "#07111F",
  overlay: "rgba(5,11,22,0.91)",

  card: "rgba(13,20,34,0.94)",
  card2: "rgba(15,23,42,0.94)",
  card3: "rgba(21,31,43,0.96)",

  text: "#FFFFFF",
  text2: "#E5E7EB",
  muted: "#B8C1CC",
  muted2: "#94A3B8",

  gold: "#D4AF37",
  gold2: "#F4D96B",
  navy: "#050B16",

  border: "rgba(212,175,55,0.34)",
  borderSoft: "rgba(255,255,255,0.10)",

  input: "rgba(5,11,22,0.82)",
  inputText: "#FFFFFF",
  placeholder: "rgba(255,255,255,0.45)",

  success: "#22C55E",
  successSoft: "rgba(34,197,94,0.16)",

  danger: "#EF4444",
  dangerSoft: "rgba(239,68,68,0.16)",

  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.16)",

  shadow: "#000000",

  soft: "rgba(255,255,255,0.07)",
  lightBorder: "rgba(255,255,255,0.10)",
  green: "#20C461",
  nav: "rgba(8,14,24,0.98)",
};

export const AE_LIGHT = {
  mode: "light" as DriverThemeMode,

  bg: "#F7F7F5",
  bg2: "#FFFFFF",
  overlay: "rgba(247,247,245,0.88)",

  card: "rgba(255,255,255,0.96)",
  card2: "rgba(255,255,255,0.98)",
  card3: "#FFF8E8",

  text: "#07111F",
  text2: "#1F2937",
  muted: "#5D6673",
  muted2: "#64748B",

  gold: "#B8860B",
  gold2: "#D4AF37",
  navy: "#07111F",

  border: "rgba(184,134,11,0.30)",
  borderSoft: "rgba(7,17,31,0.10)",

  input: "rgba(255,255,255,0.96)",
  inputText: "#07111F",
  placeholder: "rgba(7,17,31,0.42)",

  success: "#16A34A",
  successSoft: "rgba(22,163,74,0.13)",

  danger: "#DC2626",
  dangerSoft: "rgba(220,38,38,0.13)",

  blue: "#2563EB",
  blueSoft: "rgba(37,99,235,0.13)",

  shadow: "#000000",

  soft: "rgba(7,17,31,0.05)",
  lightBorder: "rgba(7,17,31,0.10)",
  green: "#16A34A",
  nav: "rgba(255,255,255,0.98)",
};

type DriverThemeContextValue = {
  themeMode: DriverThemeMode;
  colors: typeof AE_DARK;
  isDark: boolean;
  setThemeMode: (mode: DriverThemeMode) => void;
  toggleTheme: () => void;
};

const DriverThemeContext = createContext<DriverThemeContextValue | null>(null);

export function DriverThemeProvider({ children }: { children: React.ReactNode }) {
  const systemMode = useColorScheme();

  const [themeMode, setThemeMode] = useState<DriverThemeMode>(
    systemMode === "light" ? "light" : "dark"
  );

  const value = useMemo(() => {
    const colors = themeMode === "dark" ? AE_DARK : AE_LIGHT;

    return {
      themeMode,
      colors,
      isDark: themeMode === "dark",
      setThemeMode,
      toggleTheme: () => {
        setThemeMode((current) => (current === "dark" ? "light" : "dark"));
      },
    };
  }, [themeMode]);

  return (
    <DriverThemeContext.Provider value={value}>
      {children}
    </DriverThemeContext.Provider>
  );
}

export function useDriverTheme() {
  const context = useContext(DriverThemeContext);

  if (!context) {
    throw new Error("useDriverTheme must be used inside DriverThemeProvider");
  }

  return context;
}

export function money(value: any) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function cleanStatus(value: any) {
  return String(value || "").toLowerCase().trim();
}

export function v5Shadow(colors: typeof AE_DARK) {
  return {
    shadowColor: colors.shadow,
    shadowOpacity: colors.mode === "dark" ? 0.35 : 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  };
}

export function getTripTotal(trip: any) {
  return Number(
    trip?.total_fare ||
      trip?.total ||
      trip?.balance_due ||
      trip?.total_price ||
      trip?.price ||
      trip?.amount ||
      0
  );
}

export function getDriverPayoutAmount(trip: any) {
  const savedDriverShare = Number(
    trip?.driver_share || trip?.driver_payout || trip?.driver_earnings || 0
  );

  if (savedDriverShare > 0) return savedDriverShare;

  return getTripTotal(trip) * 0.7;
}

export function getCompanyShareAmount(trip: any) {
  const savedCompanyShare = Number(
    trip?.company_share || trip?.company_commission || 0
  );

  if (savedCompanyShare > 0) return savedCompanyShare;

  return getTripTotal(trip) * 0.3;
}

export function getTripMilesValue(trip: any) {
  return Number(
    trip?.estimated_miles ||
      trip?.miles ||
      trip?.distance_miles ||
      trip?.trip_miles ||
      0
  );
}

export function getPassengerNameValue(trip: any) {
  return (
    trip?.passenger_name ||
    trip?.customer_name ||
    trip?.name ||
    trip?.full_name ||
    "Passenger"
  );
}

export function getPickupValue(trip: any) {
  return (
    trip?.pickup_address ||
    trip?.pickup ||
    trip?.pickup_location ||
    "Pickup"
  );
}

export function getDropoffValue(trip: any) {
  return (
    trip?.dropoff_address ||
    trip?.dropoff ||
    trip?.dropoff_location ||
    trip?.destination ||
    "Dropoff"
  );
}