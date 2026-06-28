import React, { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  CloudSun,
  Luggage,
  MapPinned,
  Plane,
  RefreshCw,
  Route,
  ShieldCheck,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

/*
  Later we will create this Cloudflare Worker:
  https://angel-traffic-report.angelsexpresss.workers.dev

  For now, leave blank. Weather works immediately.
  Traffic will show a standard ETA fallback until the Worker is connected.
*/
const TRAFFIC_WORKER_URL = "";

export default function LuxuryRidePrepScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [trip, setTrip] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [traffic, setTraffic] = useState<any>(null);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
    loadRidePrep();
  }, []);

  async function loadRidePrep(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const userEmail = user.email?.trim().toLowerCase();

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const activeTrip =
        bookings?.find((booking) => {
          const status = String(booking.status || "pending").toLowerCase();
          return !["completed", "cancelled", "canceled"].includes(status);
        }) || bookings?.[0];

      setTrip(activeTrip || null);

      if (!activeTrip) {
        setWeather(null);
        setTraffic(null);
        return;
      }

      const pickup = getPickupCoords(activeTrip);
      const dropoff = getDropoffCoords(activeTrip);

      if (pickup) {
        await loadWeather(pickup.lat, pickup.lng);
      } else {
        setWeather({
          title: "Pickup Weather Unavailable",
          condition: "Pickup GPS coordinates are missing.",
          temperature: "N/A",
          wind: "N/A",
          precipitation: "N/A",
          advice:
            "Weather will appear when this ride has saved pickup coordinates.",
        });
      }

      if (pickup && dropoff) {
        await loadTraffic(pickup, dropoff);
      } else {
        setTraffic({
          title: "Traffic Report Unavailable",
          duration: "N/A",
          distance: "N/A",
          delay: "N/A",
          advice:
            "Traffic report will appear when pickup and drop-off GPS coordinates are saved.",
        });
      }
    } catch (error: any) {
      Alert.alert(
        "Ride Prep Error",
        error.message || "Could not load ride preparation details."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadWeather(lat: number, lng: number) {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}` +
      `&longitude=${lng}` +
      `&current=temperature_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m` +
      `&temperature_unit=fahrenheit` +
      `&wind_speed_unit=mph` +
      `&precipitation_unit=inch` +
      `&timezone=auto`;

    const response = await fetch(url);
    const data = await response.json();

    const current = data.current;

    if (!current) {
      throw new Error("Weather data not available.");
    }

    const condition = weatherCodeToText(current.weather_code);
    const temperature = `${Math.round(current.temperature_2m)}°F`;
    const feelsLike = `${Math.round(current.apparent_temperature)}°F`;
    const wind = `${Math.round(current.wind_speed_10m)} mph`;
    const precipitation = `${Number(current.precipitation || 0).toFixed(2)} in`;

    setWeather({
      title: "Live Pickup Weather",
      condition,
      temperature,
      feelsLike,
      wind,
      precipitation,
      advice: getWeatherAdvice(current.weather_code, current.wind_speed_10m),
    });
  }

  async function loadTraffic(
    pickup: { lat: number; lng: number },
    dropoff: { lat: number; lng: number }
  ) {
    if (TRAFFIC_WORKER_URL) {
      const response = await fetch(TRAFFIC_WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: pickup,
          destination: dropoff,
        }),
      });

      const data = await response.json();

      setTraffic({
        title: "Live Traffic Report",
        duration: data.durationInTrafficText || data.durationText || "N/A",
        distance: data.distanceText || "N/A",
        delay:
          typeof data.trafficDelayMinutes === "number"
            ? `${data.trafficDelayMinutes} min delay`
            : "Checking traffic",
        advice: data.summary || "Traffic report updated.",
      });

      return;
    }

    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}` +
      `?overview=false`;

    const response = await fetch(osrmUrl);
    const data = await response.json();

    const route = data.routes?.[0];

    if (!route) {
      setTraffic({
        title: "Traffic Report",
        duration: "N/A",
        distance: "N/A",
        delay: "N/A",
        advice: "Route estimate is unavailable right now.",
      });
      return;
    }

    const minutes = Math.round(route.duration / 60);
    const miles = route.distance / 1609.344;

    setTraffic({
      title: "Route Estimate",
      duration: `${minutes} min`,
      distance: `${miles.toFixed(1)} miles`,
      delay: "Live traffic pending",
      advice:
        "This is a route estimate. Connect the Angel Express traffic Worker to show live traffic delay.",
    });
  }

  function onRefresh() {
    setRefreshing(true);
    loadRidePrep(false);
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={styles.loadingText}>Loading ride prep...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/dashboard-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.title}>Luxury Ride Prep+</Text>

            <Text style={styles.subtitle}>
              Prepare for every Angel Express ride with live pickup weather,
              route guidance, and traffic readiness.
            </Text>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <BriefcaseBusiness size={23} color={GOLD} />
                <Text style={styles.cardTitle}>Active Trip Readiness</Text>
              </View>

              {trip ? (
                <>
                  <InfoLine label="Invoice" value={trip.invoice_no || "N/A"} />
                  <InfoLine
                    label="Pickup"
                    value={trip.pickup_address || trip.pickup || "N/A"}
                  />
                  <InfoLine
                    label="Drop-off"
                    value={trip.dropoff_address || trip.dropoff || "N/A"}
                  />
                  <InfoLine
                    label="Ride Time"
                    value={`${trip.ride_date || trip.date || "N/A"} • ${
                      trip.ride_time || trip.time || "N/A"
                    }`}
                  />
                </>
              ) : (
                <Text style={styles.noTripText}>
                  No active ride found. Bookings will appear here when available.
                </Text>
              )}
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <CloudSun size={23} color={GOLD} />
                <Text style={styles.cardTitle}>
                  {weather?.title || "Live Pickup Weather"}
                </Text>
              </View>

              <ReportRow label="Condition" value={weather?.condition || "N/A"} />
              <ReportRow label="Temperature" value={weather?.temperature || "N/A"} />
              <ReportRow label="Feels Like" value={weather?.feelsLike || "N/A"} />
              <ReportRow label="Wind" value={weather?.wind || "N/A"} />
              <ReportRow
                label="Precipitation"
                value={weather?.precipitation || "N/A"}
              />

              <View style={styles.adviceBox}>
                <Text style={styles.adviceText}>
                  {weather?.advice || "Weather report loading."}
                </Text>
              </View>
            </AngelCard>

            <AngelCard style={styles.alertCard}>
              <View style={styles.cardHeader}>
                <Route size={23} color={GOLD} />
                <Text style={styles.alertTitle}>
                  {traffic?.title || "Traffic Report"}
                </Text>
              </View>

              <ReportRow label="Distance" value={traffic?.distance || "N/A"} />
              <ReportRow label="Drive Time" value={traffic?.duration || "N/A"} />
              <ReportRow label="Traffic Delay" value={traffic?.delay || "N/A"} />

              <View style={styles.adviceBox}>
                <Text style={styles.adviceText}>
                  {traffic?.advice || "Traffic report loading."}
                </Text>
              </View>
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={23} color={GOLD} />
                <Text style={styles.cardTitle}>Trip Preparation Checklist</Text>
              </View>

              <ChecklistItem text="Driver Assigned" checked />
              <ChecklistItem text="Pickup Time Confirmed" checked />
              <ChecklistItem text="Luggage Count Confirmed" checked />
              <ChecklistItem text="Flight Number Added" checked />
              <ChecklistItem text="Driver Contact Available" checked />
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={23} color={GOLD} />
                <Text style={styles.cardTitle}>Before Your Ride</Text>
              </View>

              <PrepItem
                icon={<Clock size={18} color={GOLD} />}
                text="Keep your phone available."
              />
              <PrepItem
                icon={<CheckCircle2 size={18} color={GOLD} />}
                text="Be ready 5–10 minutes before pickup."
              />
              <PrepItem
                icon={<Luggage size={18} color={GOLD} />}
                text="Confirm luggage before the driver arrives."
              />
              <PrepItem
                icon={<Plane size={18} color={GOLD} />}
                text="Add flight number for airport rides when needed."
              />
              <PrepItem
                icon={<ShieldCheck size={18} color={GOLD} />}
                text="Share Family Check-In+ with your emergency contact."
              />
            </AngelCard>

            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <RefreshCw size={18} color={GOLD} />
              <Text style={styles.refreshText}>Refresh Weather & Traffic</Text>
            </TouchableOpacity>

            <AngelHeroButton
              title="Open Family Check-In+"
              onPress={() => router.push("/family-checkin" as any)}
              variant="gold"
              style={styles.primaryButton}
            />

            <AngelHeroButton
              title="View My Trips"
              onPress={() => router.push("/my-trips" as any)}
              variant="outline"
              style={styles.secondaryButton}
            />
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function ChecklistItem({ text, checked }: { text: string; checked: boolean }) {
  return (
    <View style={styles.checkRow}>
      <View style={styles.checkIconBox}>
        <CheckCircle2 size={21} color={checked ? GOLD : AE_COLORS.muted} />
      </View>
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

function PrepItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.prepRow}>
      <View style={styles.prepIcon}>{icon}</View>
      <Text style={styles.prepText}>{text}</Text>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <MapPinned size={15} color={GOLD} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reportRow}>
      <Text style={styles.reportLabel}>{label}</Text>
      <Text style={styles.reportValue}>{value}</Text>
    </View>
  );
}

function getPickupCoords(trip: any) {
  const lat = numberOrNull(
    trip.pickup_lat,
    trip.pickupLat,
    trip.pickup_latitude,
    trip.pickupLatitude
  );

  const lng = numberOrNull(
    trip.pickup_lng,
    trip.pickupLng,
    trip.pickup_longitude,
    trip.pickupLongitude
  );

  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function getDropoffCoords(trip: any) {
  const lat = numberOrNull(
    trip.dropoff_lat,
    trip.dropoffLat,
    trip.dropoff_latitude,
    trip.dropoffLatitude
  );

  const lng = numberOrNull(
    trip.dropoff_lng,
    trip.dropoffLng,
    trip.dropoff_longitude,
    trip.dropoffLongitude
  );

  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function numberOrNull(...values: any[]) {
  for (const value of values) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed !== 0) return parsed;
  }

  return null;
}

function weatherCodeToText(code: number) {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Weather updating";
}

function getWeatherAdvice(code: number, windSpeed: number) {
  if ([95, 96, 99].includes(code)) {
    return "Storm conditions possible. Allow extra time and stay near your pickup point.";
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "Rain may affect pickup timing. Keep your phone available and protect luggage.";
  }

  if (windSpeed >= 25) {
    return "Wind is elevated. Be ready early and secure loose items or luggage.";
  }

  return "Weather looks manageable. Be ready 5–10 minutes before pickup.";
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    overflow: "hidden",
  },

  bgWrap: {
    ...StyleSheet.absoluteFillObject,
  },

  background: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,11,22,0.91)",
  },

  container: {
    flex: 1,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    color: AE_COLORS.white,
    marginTop: 14,
    fontSize: 16,
  },

  content: {
    padding: 22,
    paddingTop: 56,
    paddingBottom: 50,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 18,
  },

  backText: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
  },

  title: {
    color: GOLD,
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },

  subtitle: {
    color: AE_COLORS.textSoft,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },

  card: {
    padding: 20,
    marginBottom: 18,
  },

  alertCard: {
    padding: 20,
    marginBottom: 18,
    backgroundColor: "rgba(34,23,10,0.88)",
    borderColor: "rgba(212,175,55,0.45)",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  cardTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },

  alertTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },

  noTripText: {
    color: AE_COLORS.textSoft,
    fontSize: 16,
    lineHeight: 24,
  },

  infoLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },

  infoLabel: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 3,
    textTransform: "uppercase",
  },

  infoValue: {
    color: AE_COLORS.white,
    fontSize: 15,
    lineHeight: 22,
  },

  reportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  reportLabel: {
    color: AE_COLORS.muted,
    fontSize: 14,
    flex: 1,
  },

  reportValue: {
    color: AE_COLORS.white,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
    flex: 1,
  },

  adviceBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.20)",
  },

  adviceText: {
    color: GOLD,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800",
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  checkIconBox: {
    width: 34,
    alignItems: "flex-start",
  },

  checkText: {
    color: AE_COLORS.white,
    fontSize: 16,
    flex: 1,
  },

  prepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  prepIcon: {
    width: 30,
    marginTop: 2,
  },

  prepText: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },

  refreshButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 2,
    marginBottom: 18,
  },

  refreshText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "900",
  },

  primaryButton: {
    marginTop: 8,
  },

  secondaryButton: {
    marginTop: 14,
  },
});