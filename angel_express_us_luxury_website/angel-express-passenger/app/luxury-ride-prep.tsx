import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ArrowLeft,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudRain,
  CloudSun,
  Gauge,
  Luggage,
  MapPinned,
  Navigation,
  Plane,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Thermometer,
  TimerReset,
  TrafficCone,
  Umbrella,
  Users,
  Wind,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

/*
  Add the production Cloudflare Worker URL here when ready.

  Example:
  https://angel-traffic-report.angelsexpresss.workers.dev

  Weather works immediately through Open-Meteo.
  Until the Worker is connected, OSRM provides a route estimate without
  real-time traffic delay.
*/
const TRAFFIC_WORKER_URL = "";

type Coordinates = {
  lat: number;
  lng: number;
};

type WeatherReport = {
  title: string;
  condition: string;
  temperature: string;
  feelsLike: string;
  wind: string;
  precipitation: string;
  advice: string;
  code?: number;
};

type TrafficReport = {
  title: string;
  duration: string;
  distance: string;
  delay: string;
  advice: string;
  delayMinutes?: number | null;
  live?: boolean;
};

export default function LuxuryRidePrepScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [trip, setTrip] = useState<any>(null);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [traffic, setTraffic] = useState<TrafficReport | null>(null);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const pageRise = useRef(new Animated.Value(22)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const backgroundLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.04,
          duration: 8500,
          useNativeDriver: true,
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 8500,
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.045,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: false,
        }),
      ])
    );

    Animated.parallel([
      Animated.timing(pageFade, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(pageRise, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();

    backgroundLoop.start();
    pulseLoop.start();
    glowLoop.start();

    loadRidePrep();

    return () => {
      backgroundLoop.stop();
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, []);

  async function loadRidePrep(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const userEmail = user.email?.trim().toLowerCase() || "";
      const filters = [`user_id.eq.${user.id}`];

      if (userEmail) {
        filters.push(`email.ilike.${userEmail}`);
      }

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("*")
        .or(filters.join(","))
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
          feelsLike: "N/A",
          wind: "N/A",
          precipitation: "N/A",
          advice:
            "Weather will appear automatically when the booking includes pickup coordinates.",
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
          delayMinutes: null,
          live: false,
          advice:
            "Traffic guidance will appear when pickup and drop-off coordinates are saved.",
        });
      }
    } catch (error: any) {
      Alert.alert(
        "Ride Prep Error",
        error?.message || "Could not load ride preparation details."
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

    if (!response.ok) {
      throw new Error("Weather service is temporarily unavailable.");
    }

    const data = await response.json();
    const current = data.current;

    if (!current) {
      throw new Error("Weather data is not available.");
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
      code: current.weather_code,
    });
  }

  async function loadTraffic(pickup: Coordinates, dropoff: Coordinates) {
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

      if (!response.ok) {
        throw new Error("Live traffic service is temporarily unavailable.");
      }

      const data = await response.json();
      const delayMinutes =
        typeof data.trafficDelayMinutes === "number"
          ? data.trafficDelayMinutes
          : null;

      setTraffic({
        title: "Live Traffic Report",
        duration: data.durationInTrafficText || data.durationText || "N/A",
        distance: data.distanceText || "N/A",
        delay:
          delayMinutes !== null
            ? `${delayMinutes} min delay`
            : "Traffic updating",
        delayMinutes,
        live: true,
        advice: data.summary || getTrafficAdvice(delayMinutes),
      });

      return;
    }

    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}` +
      `?overview=false`;

    const response = await fetch(osrmUrl);

    if (!response.ok) {
      throw new Error("Route estimate is temporarily unavailable.");
    }

    const data = await response.json();
    const route = data.routes?.[0];

    if (!route) {
      setTraffic({
        title: "Traffic Report",
        duration: "N/A",
        distance: "N/A",
        delay: "N/A",
        delayMinutes: null,
        live: false,
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
      delayMinutes: null,
      live: false,
      advice:
        "This is a route estimate. Connect the Angel Express traffic Worker to display live delays.",
    });
  }

  function onRefresh() {
    setRefreshing(true);
    loadRidePrep(false);
  }

  function getReadinessItems() {
    if (!trip) {
      return [
        { label: "Active Ride Found", ready: false },
        { label: "Pickup Time Confirmed", ready: false },
        { label: "Pickup Location Saved", ready: false },
        { label: "Drop-off Location Saved", ready: false },
        { label: "Driver Assigned", ready: false },
      ];
    }

    return [
      {
        label: "Active Ride Found",
        ready: Boolean(trip),
      },
      {
        label: "Pickup Time Confirmed",
        ready: Boolean(trip.ride_time || trip.time),
      },
      {
        label: "Pickup Location Saved",
        ready: Boolean(trip.pickup_address || trip.pickup),
      },
      {
        label: "Drop-off Location Saved",
        ready: Boolean(trip.dropoff_address || trip.dropoff),
      },
      {
        label: "Driver Assigned",
        ready: Boolean(
          trip.driver_id ||
            trip.assigned_driver_id ||
            trip.driver_name ||
            String(trip.status || "").toLowerCase().includes("assigned")
        ),
      },
      {
        label: "Luggage Count Confirmed",
        ready:
          trip.luggage_count !== null &&
          trip.luggage_count !== undefined &&
          trip.luggage_count !== "",
      },
      {
        label: "Flight Number Added",
        ready: !isAirportTrip(trip) || Boolean(trip.flight_number),
      },
    ];
  }

  function getReadinessScore() {
    const items = getReadinessItems();
    const ready = items.filter((item) => item.ready).length;
    return Math.round((ready / items.length) * 100);
  }

  function getTrafficLevel() {
    if (!traffic) return "Unknown";
    if (!traffic.live) return "Estimated";

    const delay = traffic.delayMinutes;

    if (delay === null || delay === undefined) return "Updating";
    if (delay <= 5) return "Light";
    if (delay <= 15) return "Moderate";
    return "Heavy";
  }

  function getWeatherIcon() {
    const code = weather?.code;

    if (code === undefined) {
      return <CloudSun size={30} color={colors.navy} />;
    }

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      return <CloudRain size={30} color={colors.navy} />;
    }

    if ([95, 96, 99].includes(code)) {
      return <Umbrella size={30} color={colors.navy} />;
    }

    if (code === 0) {
      return <SunMedium size={30} color={colors.navy} />;
    }

    return <CloudSun size={30} color={colors.navy} />;
  }

  const readinessScore = getReadinessScore();
  const readinessLabel =
    readinessScore >= 90
      ? "Excellent"
      : readinessScore >= 70
      ? "Nearly Ready"
      : "Needs Attention";

  const glowBorder = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "rgba(212,175,55,0.22)",
      "rgba(212,175,55,0.95)",
    ],
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <View style={styles.loadingIcon}>
            <BriefcaseBusiness size={32} color={colors.navy} />
          </View>
        </Animated.View>

        <ActivityIndicator color={colors.gold} size="large" />

        <Text style={styles.loadingTitle}>Preparing Your Ride</Text>
        <Text style={styles.loadingText}>
          Checking weather, route readiness, and active trip details.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}
      >
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
              colors={[colors.gold]}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.82}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.refreshIconButton}
                onPress={onRefresh}
                disabled={refreshing}
                activeOpacity={0.82}
              >
                {refreshing ? (
                  <ActivityIndicator color={colors.gold} size="small" />
                ) : (
                  <RefreshCw size={17} color={colors.gold} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.themePill}
                onPress={toggleTheme}
                activeOpacity={0.82}
              >
                <Text style={styles.themeText}>
                  {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageRise }],
            }}
          >
            <View style={styles.hero}>
              <Animated.View
                style={[styles.heroIconLarge, { transform: [{ scale: pulse }] }]}
              >
                <BriefcaseBusiness size={34} color={colors.navy} />
              </Animated.View>

              <Text style={styles.kicker}>PREMIUM RIDE READINESS</Text>
              <Text style={styles.title}>Luxury Ride Prep+</Text>

              <Text style={styles.subtitle}>
                Your personal pre-ride command center for weather, route
                readiness, luggage, safety, and departure planning.
              </Text>

              <View style={styles.heroPills}>
                <View style={styles.heroPill}>
                  <CloudSun size={14} color={colors.gold} />
                  <Text style={styles.heroPillText}>Live Weather</Text>
                </View>

                <View style={styles.heroPill}>
                  <Route size={14} color={colors.gold} />
                  <Text style={styles.heroPillText}>Route Ready</Text>
                </View>

                <View style={styles.heroPill}>
                  <ShieldCheck size={14} color={colors.gold} />
                  <Text style={styles.heroPillText}>Safety Prepared</Text>
                </View>
              </View>
            </View>

            <View style={styles.weatherCard}>
              <View style={styles.weatherTop}>
                <View style={styles.weatherIcon}>{getWeatherIcon()}</View>

                <View style={styles.weatherHeadline}>
                  <Text style={styles.weatherEyebrow}>
                    {weather?.title || "PICKUP WEATHER"}
                  </Text>
                  <Text style={styles.weatherTemperature}>
                    {weather?.temperature || "N/A"}
                  </Text>
                  <Text style={styles.weatherCondition}>
                    {weather?.condition || "Weather updating"}
                  </Text>
                </View>
              </View>

              <View style={styles.weatherGrid}>
                <WeatherStat
                  icon={<Thermometer size={17} color={colors.gold} />}
                  label="Feels Like"
                  value={weather?.feelsLike || "N/A"}
                  styles={styles}
                />
                <WeatherStat
                  icon={<Wind size={17} color={colors.gold} />}
                  label="Wind"
                  value={weather?.wind || "N/A"}
                  styles={styles}
                />
                <WeatherStat
                  icon={<CloudRain size={17} color={colors.gold} />}
                  label="Precipitation"
                  value={weather?.precipitation || "N/A"}
                  styles={styles}
                />
              </View>

              <View style={styles.insightBox}>
                <Sparkles size={18} color={colors.gold} />
                <Text style={styles.insightText}>
                  {weather?.advice || "Weather advice is loading."}
                </Text>
              </View>
            </View>

            <View style={styles.trafficCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <TrafficCone size={21} color={colors.gold} />
                </View>

                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionEyebrow}>ROUTE CONDITIONS</Text>
                  <Text style={styles.sectionTitle}>
                    {traffic?.title || "Traffic Report"}
                  </Text>
                </View>

                <View style={styles.trafficLevelPill}>
                  <Text style={styles.trafficLevelText}>
                    {getTrafficLevel()}
                  </Text>
                </View>
              </View>

              <View style={styles.trafficStats}>
                <TrafficStat
                  label="Distance"
                  value={traffic?.distance || "N/A"}
                  styles={styles}
                />
                <TrafficStat
                  label="Drive Time"
                  value={traffic?.duration || "N/A"}
                  styles={styles}
                />
                <TrafficStat
                  label="Delay"
                  value={traffic?.delay || "N/A"}
                  styles={styles}
                />
              </View>

              <View style={styles.insightBox}>
                <Route size={18} color={colors.gold} />
                <Text style={styles.insightText}>
                  {traffic?.advice || "Traffic guidance is loading."}
                </Text>
              </View>
            </View>

            <View style={styles.tripCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Navigation size={21} color={colors.gold} />
                </View>

                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionEyebrow}>CURRENT BOOKING</Text>
                  <Text style={styles.sectionTitle}>Active Trip Readiness</Text>
                </View>

                {trip ? (
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.livePillText}>ACTIVE</Text>
                  </View>
                ) : null}
              </View>

              {trip ? (
                <>
                  <TripRoute
                    pickup={trip.pickup_address || trip.pickup || "N/A"}
                    dropoff={
                      trip.dropoff_address || trip.dropoff || "N/A"
                    }
                    styles={styles}
                    colors={colors}
                  />

                  <View style={styles.tripMetaGrid}>
                    <MiniInfoCard
                      icon={<CalendarDays size={18} color={colors.gold} />}
                      label="Ride Date"
                      value={trip.ride_date || trip.date || "N/A"}
                      styles={styles}
                    />
                    <MiniInfoCard
                      icon={<Clock size={18} color={colors.gold} />}
                      label="Ride Time"
                      value={trip.ride_time || trip.time || "N/A"}
                      styles={styles}
                    />
                    <MiniInfoCard
                      icon={<Luggage size={18} color={colors.gold} />}
                      label="Luggage"
                      value={`${trip.luggage_count || 0} item(s)`}
                      styles={styles}
                    />
                    <MiniInfoCard
                      icon={<BriefcaseBusiness size={18} color={colors.gold} />}
                      label="Invoice"
                      value={trip.invoice_no || "Pending"}
                      styles={styles}
                    />
                  </View>

                  {isAirportTrip(trip) && (
                    <View style={styles.airportBanner}>
                      <Plane size={21} color={colors.gold} />
                      <View style={styles.airportCopy}>
                        <Text style={styles.airportTitle}>
                          Airport Ride Detected
                        </Text>
                        <Text style={styles.airportText}>
                          Flight: {trip.flight_number || "Not added"} • Keep
                          luggage and terminal details ready.
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Navigation size={30} color={colors.gold} />
                  </View>
                  <Text style={styles.emptyTitle}>No Active Ride Found</Text>
                  <Text style={styles.emptyText}>
                    Your latest confirmed or upcoming booking will appear here
                    automatically.
                  </Text>

                  <TouchableOpacity
                    style={styles.goldButton}
                    onPress={() => router.push("/my-trips" as any)}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.goldButtonText}>View My Trips</Text>
                    <ChevronRight size={19} color={colors.navy} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Animated.View
              style={[styles.scoreCard, { borderColor: glowBorder }]}
            >
              <View style={styles.scoreHeader}>
                <View style={styles.scoreIcon}>
                  <Gauge size={30} color={colors.navy} />
                </View>

                <View style={styles.scoreCopy}>
                  <Text style={styles.scoreEyebrow}>
                    LIVE RIDE READINESS SCORE
                  </Text>
                  <Text style={styles.scoreNumber}>{readinessScore}% Ready</Text>
                  <Text style={styles.scoreStatus}>{readinessLabel}</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${readinessScore}%` },
                  ]}
                />
              </View>

              <Text style={styles.scoreText}>
                Your score updates automatically from the current booking,
                driver assignment, luggage, route, and airport information.
              </Text>
            </Animated.View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <CheckCircle2 size={21} color={colors.gold} />
                </View>

                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionEyebrow}>SMART CHECKLIST</Text>
                  <Text style={styles.sectionTitle}>
                    Trip Preparation Status
                  </Text>
                </View>
              </View>

              {getReadinessItems().map((item) => (
                <ChecklistItem
                  key={item.label}
                  text={item.label}
                  checked={item.ready}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <BellRing size={21} color={colors.gold} />
                </View>

                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionEyebrow}>BEFORE DEPARTURE</Text>
                  <Text style={styles.sectionTitle}>Smart Ride Reminders</Text>
                </View>
              </View>

              <PrepItem
                icon={<Clock size={18} color={colors.gold} />}
                text="Keep your phone available for driver updates."
                styles={styles}
              />
              <PrepItem
                icon={<TimerReset size={18} color={colors.gold} />}
                text="Be ready 5–10 minutes before your scheduled pickup."
                styles={styles}
              />
              <PrepItem
                icon={<Luggage size={18} color={colors.gold} />}
                text={`Confirm your luggage count${
                  trip ? `: ${trip.luggage_count || 0} item(s)` : ""
                }.`}
                styles={styles}
              />
              <PrepItem
                icon={<Plane size={18} color={colors.gold} />}
                text="For airport rides, confirm your airline, flight number, and terminal."
                styles={styles}
              />
              <PrepItem
                icon={<ShieldCheck size={18} color={colors.gold} />}
                text="Share Family Check-In+ with your emergency contact."
                styles={styles}
              />
            </View>

            <View style={styles.aiCard}>
              <View style={styles.aiIcon}>
                <Sparkles size={25} color={colors.navy} />
              </View>

              <View style={styles.aiCopy}>
                <Text style={styles.aiTitle}>Angel Smart Travel Tip</Text>
                <Text style={styles.aiText}>
                  {buildSmartTip(trip, weather, traffic)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              activeOpacity={0.86}
            >
              <RefreshCw size={18} color={colors.gold} />
              <Text style={styles.refreshText}>Refresh Weather & Route</Text>
              <ChevronRight size={18} color={colors.gold} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/family-checkin" as any)}
              activeOpacity={0.88}
            >
              <Users size={18} color={colors.navy} />
              <Text style={styles.primaryButtonText}>
                Open Family Check-In+
              </Text>
              <ChevronRight size={19} color={colors.navy} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/my-trips" as any)}
              activeOpacity={0.88}
            >
              <Text style={styles.secondaryButtonText}>View My Trips</Text>
              <ChevronRight size={18} color={colors.gold} />
            </TouchableOpacity>

            <Text style={styles.footer}>
              Angel Express • Arrive Prepared. Travel With Confidence.
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function TripRoute({
  pickup,
  dropoff,
  styles,
  colors,
}: {
  pickup: string;
  dropoff: string;
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.routeBox}>
      <View style={styles.routeTimeline}>
        <View style={styles.routeDot} />
        <View style={styles.routeLine} />
        <View style={[styles.routeDot, styles.routeDotEnd]} />
      </View>

      <View style={styles.routeCopy}>
        <View style={styles.routeLocation}>
          <Text style={styles.routeLabel}>PICKUP</Text>
          <Text style={styles.routeValue}>{pickup}</Text>
        </View>

        <View style={styles.routeLocation}>
          <Text style={styles.routeLabel}>DROP-OFF</Text>
          <Text style={styles.routeValue}>{dropoff}</Text>
        </View>
      </View>

      <MapPinned size={18} color={colors.gold} />
    </View>
  );
}

function MiniInfoCard({
  icon,
  label,
  value,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.miniInfoCard}>
      <View style={styles.miniInfoIcon}>{icon}</View>
      <Text style={styles.miniInfoLabel}>{label}</Text>
      <Text style={styles.miniInfoValue}>{value}</Text>
    </View>
  );
}

function WeatherStat({
  icon,
  label,
  value,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.weatherStat}>
      <View style={styles.weatherStatIcon}>{icon}</View>
      <Text style={styles.weatherStatLabel}>{label}</Text>
      <Text style={styles.weatherStatValue}>{value}</Text>
    </View>
  );
}

function TrafficStat({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.trafficStat}>
      <Text style={styles.trafficStatValue}>{value}</Text>
      <Text style={styles.trafficStatLabel}>{label}</Text>
    </View>
  );
}

function ChecklistItem({
  text,
  checked,
  styles,
  colors,
}: {
  text: string;
  checked: boolean;
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.checkRow}>
      <View
        style={[
          styles.checkIconBox,
          checked ? styles.checkIconReady : styles.checkIconPending,
        ]}
      >
        <CheckCircle2
          size={20}
          color={checked ? colors.navy : colors.gold}
        />
      </View>

      <Text style={styles.checkText}>{text}</Text>

      <Text
        style={[
          styles.checkStatus,
          checked ? styles.checkStatusReady : styles.checkStatusPending,
        ]}
      >
        {checked ? "READY" : "PENDING"}
      </Text>
    </View>
  );
}

function PrepItem({
  icon,
  text,
  styles,
}: {
  icon: React.ReactNode;
  text: string;
  styles: any;
}) {
  return (
    <View style={styles.prepRow}>
      <View style={styles.prepIcon}>{icon}</View>
      <Text style={styles.prepText}>{text}</Text>
    </View>
  );
}

function getPickupCoords(trip: any): Coordinates | null {
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

function getDropoffCoords(trip: any): Coordinates | null {
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

    if (!Number.isNaN(parsed) && parsed !== 0) {
      return parsed;
    }
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
    return "Storm conditions are possible. Stay near your pickup point and allow extra time.";
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "Rain may affect pickup timing. Protect your luggage and keep your phone available.";
  }

  if (windSpeed >= 25) {
    return "Wind is elevated. Secure loose items and be ready before the driver arrives.";
  }

  return "Weather looks manageable. Be ready 5–10 minutes before pickup.";
}

function getTrafficAdvice(delayMinutes: number | null) {
  if (delayMinutes === null) {
    return "Traffic conditions are updating.";
  }

  if (delayMinutes <= 5) {
    return "Traffic is moving well. Your current departure plan looks good.";
  }

  if (delayMinutes <= 15) {
    return "Moderate traffic is expected. Be ready a few minutes earlier.";
  }

  return "Heavy traffic may affect arrival time. Stay available for driver updates.";
}

function isAirportTrip(trip: any) {
  if (!trip) return false;

  const text = [
    trip.pickup_address,
    trip.pickup,
    trip.dropoff_address,
    trip.dropoff,
    trip.trip_type,
    trip.service_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("airport") ||
    text.includes("dfw") ||
    text.includes("love field") ||
    Boolean(trip.flight_number)
  );
}

function buildSmartTip(
  trip: any,
  weather: WeatherReport | null,
  traffic: TrafficReport | null
) {
  if (!trip) {
    return "Book or confirm a ride to receive personalized weather, route, luggage, and departure guidance.";
  }

  if (
    weather?.code !== undefined &&
    [61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weather.code)
  ) {
    return "Rain or storms may affect pickup. Keep luggage covered and wait in a sheltered location where your driver can reach you.";
  }

  if (
    traffic?.delayMinutes !== null &&
    traffic?.delayMinutes !== undefined &&
    traffic.delayMinutes > 15
  ) {
    return "Traffic is elevated. Be ready early and watch for driver messages in case the pickup window changes.";
  }

  if (isAirportTrip(trip) && !trip.flight_number) {
    return "Add your flight number before departure so Angel Express can better prepare for airport timing and terminal coordination.";
  }

  if (!trip.luggage_count && trip.luggage_count !== 0) {
    return "Add your luggage count so the driver can prepare the correct vehicle space before arrival.";
  }

  return "Your ride is looking well prepared. Keep your phone nearby and be ready 5–10 minutes before pickup.";
}

function createStyles(c: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
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
      backgroundColor: c.overlay,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 22,
      paddingTop: 58,
      paddingBottom: 56,
    },

    centerContainer: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    loadingIcon: {
      width: 74,
      height: 74,
      borderRadius: 25,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    loadingTitle: {
      color: c.text,
      marginTop: 16,
      fontSize: 21,
      fontWeight: "900",
    },
    loadingText: {
      color: c.text2,
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
      textAlign: "center",
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    topActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },
    refreshIconButton: {
      width: 42,
      height: 42,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    themePill: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    hero: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 30,
      padding: 24,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    heroIconLarge: {
      width: 76,
      height: 76,
      borderRadius: 26,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    kicker: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 2,
      marginBottom: 9,
    },
    title: {
      color: c.text,
      fontSize: 38,
      lineHeight: 43,
      fontWeight: "900",
      marginBottom: 11,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "700",
    },
    heroPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 17,
    },
    heroPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 999,
    },
    heroPillText: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
    },

    scoreCard: {
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderRadius: 25,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    scoreHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 15,
    },
    scoreIcon: {
      width: 62,
      height: 62,
      borderRadius: 21,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    scoreCopy: {
      flex: 1,
    },
    scoreEyebrow: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.1,
      marginBottom: 4,
    },
    scoreNumber: {
      color: c.text,
      fontSize: 28,
      fontWeight: "900",
    },
    scoreStatus: {
      color: c.text2,
      fontSize: 12.5,
      fontWeight: "800",
      marginTop: 2,
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: c.soft,
      overflow: "hidden",
      marginBottom: 11,
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: c.gold,
    },
    scoreText: {
      color: c.text2,
      fontSize: 12.5,
      lineHeight: 19,
      fontWeight: "700",
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 19,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    tripCard: {
      backgroundColor: c.card,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 19,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    sectionIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionCopy: {
      flex: 1,
    },
    sectionEyebrow: {
      color: c.gold,
      fontSize: 9.5,
      fontWeight: "900",
      letterSpacing: 0.9,
      marginBottom: 3,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 19,
      fontWeight: "900",
    },
    livePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 7,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: c.gold,
    },
    livePillText: {
      color: c.gold,
      fontSize: 9,
      fontWeight: "900",
    },

    routeBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: c.soft,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 14,
    },
    routeTimeline: {
      width: 14,
      alignItems: "center",
      paddingTop: 4,
    },
    routeDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: c.gold,
      borderWidth: 2,
      borderColor: c.card,
    },
    routeLine: {
      width: 2,
      height: 38,
      backgroundColor: c.border,
    },
    routeDotEnd: {
      backgroundColor: c.text,
    },
    routeCopy: {
      flex: 1,
      gap: 14,
    },
    routeLocation: {
      minHeight: 39,
    },
    routeLabel: {
      color: c.gold,
      fontSize: 9.5,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    routeValue: {
      color: c.text,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
    },

    tripMetaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    miniInfoCard: {
      width: "48%",
      minHeight: 110,
      borderRadius: 17,
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 12,
    },
    miniInfoIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 9,
    },
    miniInfoLabel: {
      color: c.gold,
      fontSize: 9.5,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 5,
    },
    miniInfoValue: {
      color: c.text,
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: "800",
    },

    airportBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
      backgroundColor: c.soft,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginTop: 14,
    },
    airportCopy: {
      flex: 1,
    },
    airportTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 4,
    },
    airportText: {
      color: c.text2,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },

    emptyState: {
      alignItems: "center",
      paddingVertical: 10,
    },
    emptyIcon: {
      width: 70,
      height: 70,
      borderRadius: 24,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    emptyTitle: {
      color: c.text,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 7,
    },
    emptyText: {
      color: c.text2,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 15,
    },

    weatherCard: {
      backgroundColor: c.gold,
      borderRadius: 25,
      padding: 19,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    weatherTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 15,
    },
    weatherIcon: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.34)",
      alignItems: "center",
      justifyContent: "center",
    },
    weatherHeadline: {
      flex: 1,
    },
    weatherEyebrow: {
      color: c.navy,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
      opacity: 0.75,
      marginBottom: 3,
    },
    weatherTemperature: {
      color: c.navy,
      fontSize: 31,
      fontWeight: "900",
    },
    weatherCondition: {
      color: c.navy,
      fontSize: 13.5,
      fontWeight: "800",
      opacity: 0.82,
    },
    weatherGrid: {
      flexDirection: "row",
      gap: 9,
    },
    weatherStat: {
      flex: 1,
      borderRadius: 15,
      paddingVertical: 12,
      paddingHorizontal: 8,
      backgroundColor: "rgba(255,255,255,0.22)",
      alignItems: "center",
    },
    weatherStatIcon: {
      width: 29,
      height: 29,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.26)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    weatherStatLabel: {
      color: c.navy,
      fontSize: 9,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
      opacity: 0.75,
      marginBottom: 3,
    },
    weatherStatValue: {
      color: c.navy,
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
    },

    trafficCard: {
      backgroundColor: c.card,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: c.border,
      padding: 19,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    trafficLevelPill: {
      borderRadius: 999,
      backgroundColor: c.gold,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    trafficLevelText: {
      color: c.navy,
      fontSize: 9.5,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    trafficStats: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 14,
    },
    trafficStat: {
      flex: 1,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingVertical: 13,
      paddingHorizontal: 8,
      alignItems: "center",
    },
    trafficStatValue: {
      color: c.text,
      fontSize: 15,
      fontWeight: "900",
      textAlign: "center",
    },
    trafficStatLabel: {
      color: c.gold,
      fontSize: 9.5,
      fontWeight: "900",
      textTransform: "uppercase",
      marginTop: 4,
      textAlign: "center",
    },

    insightBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      borderRadius: 15,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      padding: 13,
      marginTop: 14,
    },
    insightText: {
      color: c.text,
      fontSize: 12.5,
      lineHeight: 19,
      fontWeight: "700",
      flex: 1,
    },

    checkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
    },
    checkIconBox: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    checkIconReady: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    checkIconPending: {
      backgroundColor: c.soft,
      borderColor: c.border,
    },
    checkText: {
      color: c.text,
      fontSize: 14,
      flex: 1,
      fontWeight: "800",
    },
    checkStatus: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    checkStatusReady: {
      color: c.gold,
    },
    checkStatusPending: {
      color: c.text2,
    },

    prepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
    },
    prepIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    prepText: {
      color: c.text,
      fontSize: 14,
      lineHeight: 21,
      flex: 1,
      fontWeight: "700",
      paddingTop: 7,
    },

    aiCard: {
      backgroundColor: c.gold,
      borderRadius: 22,
      padding: 17,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    aiIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    aiCopy: {
      flex: 1,
    },
    aiTitle: {
      color: c.navy,
      fontSize: 15.5,
      fontWeight: "900",
      marginBottom: 4,
    },
    aiText: {
      color: c.navy,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "800",
      opacity: 0.82,
    },

    refreshButton: {
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 9,
      paddingHorizontal: 15,
      marginBottom: 14,
    },
    refreshText: {
      color: c.gold,
      fontSize: 14.5,
      fontWeight: "900",
      flex: 1,
      textAlign: "center",
    },
    primaryButton: {
      backgroundColor: c.gold,
      borderRadius: 16,
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      ...v5Shadow(c),
    },
    primaryButtonText: {
      color: c.navy,
      fontSize: 14.5,
      fontWeight: "900",
      flex: 1,
      textAlign: "center",
      textTransform: "uppercase",
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 16,
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      marginTop: 14,
    },
    secondaryButtonText: {
      color: c.gold,
      fontSize: 14.5,
      fontWeight: "900",
      flex: 1,
      textAlign: "center",
      textTransform: "uppercase",
    },
    goldButton: {
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: c.gold,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
      width: "100%",
    },
    goldButtonText: {
      color: c.navy,
      fontSize: 14.5,
      fontWeight: "900",
      flex: 1,
      textAlign: "center",
    },
    footer: {
      color: c.text,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
      textAlign: "center",
      opacity: 0.9,
      marginTop: 20,
    },
  });
}
