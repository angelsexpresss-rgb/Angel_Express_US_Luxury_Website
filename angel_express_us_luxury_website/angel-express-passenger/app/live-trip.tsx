import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
  ArrowLeft,
  CarFront,
  Clock3,
  ExternalLink,
  MapPinned,
  Navigation,
  Phone,
  RefreshCcw,
  Route,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

const LIVE_STATUSES = [
  "confirmed",
  "driver_assigned",
  "assigned",
  "accepted",
  "driver_accepted",
  "driver_arrived",
  "in_progress",
];

export default function LiveTripScreen() {
  const params = useLocalSearchParams();

  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const invoiceNo = String(params.invoice_no || "");
  const bookingId = String(params.booking_id || "");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [trip, setTrip] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
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
    ).start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    loadLiveTrip(true);

    const interval = setInterval(() => {
      loadLiveTrip(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  function firstAvailable(...values: any[]) {
    for (const value of values) {
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return String(value).trim();
      }
    }

    return "";
  }

  function cleanStatus(value: any) {
    return String(value || "").toLowerCase().trim();
  }

  function getStatusLabel(value: any) {
    const status = cleanStatus(value);

    if (status === "pending") return "Pending";
    if (status === "confirmed") return "Confirmed";
    if (status === "driver_assigned") return "Driver Assigned";
    if (status === "assigned") return "Driver Assigned";
    if (status === "accepted") return "Driver Accepted";
    if (status === "driver_accepted") return "Driver Accepted";
    if (status === "driver_arrived") return "Driver Arrived";
    if (status === "in_progress") return "In Progress";
    if (status === "completed") return "Completed";
    if (status === "cancelled" || status === "canceled") return "Cancelled";

    return String(value || "Pending").replace(/_/g, " ");
  }

  function getStatusMessage() {
    const status = cleanStatus(trip?.status);

    if (hasDriverLocation) return "Your chauffeur is sharing live GPS.";

    if (status === "driver_assigned" || status === "assigned") {
      return "Your chauffeur has accepted the ride. GPS will appear once the driver opens Active Trip.";
    }

    if (status === "driver_arrived") {
      return "Your chauffeur has arrived. Live GPS will update as the trip continues.";
    }

    if (status === "in_progress") {
      return "Your trip is in progress. Waiting for the latest GPS update.";
    }

    return "Waiting for chauffeur GPS location.";
  }

  async function loadLiveTrip(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      if (!showLoader) setRefreshing(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        Alert.alert("Not Logged In", "Please sign in again.");
        router.replace("/login" as any);
        return;
      }

      const userEmail = user.email?.trim().toLowerCase() || "";

      let booking: any = null;

      if (bookingId) {
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();

        if (error) throw error;
        booking = data;
      } else if (invoiceNo) {
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("invoice_no", invoiceNo)
          .maybeSingle();

        if (error) throw error;
        booking = data;
      } else {
        let query = supabase
          .from("bookings")
          .select("*")
          .in("status", LIVE_STATUSES)
          .order("created_at", { ascending: false })
          .limit(1);

        if (userEmail) {
          query = query.or(`user_id.eq.${user.id},email.ilike.${userEmail}`);
        } else {
          query = query.eq("user_id", user.id);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        booking = data;
      }

      setTrip(booking || null);

      if (!booking) {
        setLocation(null);
        setDriverProfile(null);
        return;
      }

      await loadDriverProfile(booking);
      await loadDriverLiveLocation(booking);
    } catch (error: any) {
      Alert.alert(
        "Live Tracking Error",
        error.message || "Could not load live trip."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadDriverProfile(booking: any) {
    try {
      const driverId = firstAvailable(
        booking?.driver_id,
        booking?.assigned_driver_id
      );

      if (!driverId) {
        setDriverProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .maybeSingle();

      if (error) throw error;

      setDriverProfile(data || null);
    } catch (error) {
      console.log("Driver profile lookup error:", error);
      setDriverProfile(null);
    }
  }

  async function loadDriverLiveLocation(booking: any) {
    try {
      let liveLocation: any = null;

      if (booking?.id) {
        const { data, error } = await supabase
          .from("driver_live_locations")
          .select("*")
          .eq("booking_id", booking.id)
          .order("last_updated", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        liveLocation = data;
      }

      if (!liveLocation && booking?.invoice_no) {
        const { data } = await supabase
          .from("live_trip_locations")
          .select("*")
          .eq("invoice_no", booking.invoice_no)
          .limit(1)
          .maybeSingle();

        liveLocation = data;
      }

      setLocation(liveLocation || null);
    } catch (error) {
      console.log("Live location lookup error:", error);
      setLocation(null);
    }
  }

  function getDriverName() {
    const first = firstAvailable(driverProfile?.first_name, driverProfile?.firstname);
    const last = firstAvailable(driverProfile?.last_name, driverProfile?.lastname);

    return firstAvailable(
      location?.driver_name,
      trip?.driver_name,
      trip?.assigned_driver_name,
      driverProfile?.full_name,
      driverProfile?.name,
      first && last ? `${first} ${last}` : "",
      first,
      "Angel Express Chauffeur"
    );
  }

  function getDriverPhone() {
    return firstAvailable(
      location?.driver_phone,
      trip?.driver_phone,
      trip?.assigned_driver_phone,
      driverProfile?.phone,
      driverProfile?.phone_number,
      driverProfile?.mobile
    );
  }

  function getVehicle() {
    const driverVehicle = [
      driverProfile?.vehicle_year,
      driverProfile?.vehicle_make,
      driverProfile?.vehicle_model,
    ]
      .filter(Boolean)
      .join(" ");

    return firstAvailable(
      location?.vehicle,
      location?.vehicle_type,
      trip?.vehicle,
      trip?.vehicle_type,
      driverVehicle,
      driverProfile?.vehicle,
      driverProfile?.vehicle_type,
      driverProfile?.car,
      "Angel Express Vehicle"
    );
  }

  function getPlateNumber() {
    return firstAvailable(
      location?.plate_number,
      location?.plate,
      trip?.plate_number,
      trip?.plate,
      driverProfile?.plate_number,
      driverProfile?.license_plate,
      "N/A"
    );
  }

  function getPickup() {
    return firstAvailable(
      trip?.pickup_address,
      trip?.pickup,
      trip?.pickup_location,
      "N/A"
    );
  }

  function getDropoff() {
    return firstAvailable(
      trip?.dropoff_address,
      trip?.dropoff,
      trip?.dropoff_location,
      trip?.destination,
      "N/A"
    );
  }

  function getPickupCoords() {
    const latitude = Number(trip?.pickup_lat || location?.pickup_lat);
    const longitude = Number(trip?.pickup_lng || location?.pickup_lng);

    if (!latitude || !longitude) return null;

    return { latitude, longitude };
  }

  function getDropoffCoords() {
    const latitude = Number(trip?.dropoff_lat || location?.dropoff_lat);
    const longitude = Number(trip?.dropoff_lng || location?.dropoff_lng);

    if (!latitude || !longitude) return null;

    return { latitude, longitude };
  }

  function getDriverCoords() {
    if (!location?.latitude || !location?.longitude) return null;

    return {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    };
  }

  function openInMaps() {
    const driverCoords = getDriverCoords();

    if (!driverCoords) {
      Alert.alert(
        "Driver Location Not Available",
        "Driver GPS will appear once your chauffeur opens the active trip screen."
      );
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${driverCoords.latitude},${driverCoords.longitude}`;
    Linking.openURL(url);
  }

  function callDriver() {
    const phone = getDriverPhone();

    if (!phone) {
      Alert.alert("Phone Missing", "Driver phone number is not available yet.");
      return;
    }

    Linking.openURL(`tel:${String(phone).replace(/[^\d+]/g, "")}`);
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const driverCoordinate = getDriverCoords();
  const pickupCoordinate = getPickupCoords();
  const dropoffCoordinate = getDropoffCoords();

  const hasDriverLocation = Boolean(driverCoordinate);

  const mapCenter =
    driverCoordinate ||
    pickupCoordinate ||
    dropoffCoordinate || {
      latitude: 32.7767,
      longitude: -96.797,
    };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading live trip...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyCard}>
          <MapPinned size={38} color={colors.gold} />
          <Text style={styles.emptyTitle}>Trip Not Found</Text>
          <Text style={styles.emptyText}>
            No active accepted trip was found for your account yet.
          </Text>

          <TouchableOpacity
            style={styles.goldButton}
            onPress={() => router.push("/my-trips" as any)}
          >
            <Text style={styles.goldButtonText}>View My Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.back()}
          >
            <Text style={styles.outlineButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadLiveTrip(false)}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>LIVE TRIP TRACKING</Text>
            <Text style={styles.title}>Track Live Trip</Text>

            <Text style={styles.subtitle}>
              Track your Angel Express chauffeur, pickup, drop-off, vehicle, and trip
              phase in real time.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Navigation size={31} color={colors.navy} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>{getStatusLabel(trip.status)}</Text>
                <Text style={styles.heroText}>
                  {hasDriverLocation
                    ? "Live GPS connected"
                    : "Waiting for chauffeur GPS"}
                </Text>
              </View>
            </View>

            <View style={styles.quickRow}>
              <TouchableOpacity style={styles.quickButton} onPress={() => loadLiveTrip(false)}>
                <RefreshCcw size={18} color={colors.gold} />
                <Text style={styles.quickText}>Refresh</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickButton} onPress={callDriver}>
                <Phone size={18} color={colors.gold} />
                <Text style={styles.quickText}>Call Driver</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statusCard}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Ride Status</Text>
              </View>

              <Text style={styles.statusText}>{getStatusLabel(trip.status)}</Text>

              <Text style={styles.text}>{getStatusMessage()}</Text>
            </View>

            <View style={styles.mapShell}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: mapCenter.latitude,
                  longitude: mapCenter.longitude,
                  latitudeDelta: 0.08,
                  longitudeDelta: 0.08,
                }}
                region={{
                  latitude: mapCenter.latitude,
                  longitude: mapCenter.longitude,
                  latitudeDelta: 0.08,
                  longitudeDelta: 0.08,
                }}
              >
                {driverCoordinate && (
                  <Marker
                    coordinate={driverCoordinate}
                    title={getDriverName()}
                    description={getVehicle()}
                  />
                )}

                {pickupCoordinate && (
                  <Marker
                    coordinate={pickupCoordinate}
                    title="Pickup"
                    description={getPickup()}
                    pinColor="green"
                  />
                )}

                {dropoffCoordinate && (
                  <Marker
                    coordinate={dropoffCoordinate}
                    title="Drop-off"
                    description={getDropoff()}
                    pinColor="orange"
                  />
                )}

                {driverCoordinate &&
                  pickupCoordinate &&
                  cleanStatus(trip.status) !== "in_progress" && (
                    <Polyline
                      coordinates={[driverCoordinate, pickupCoordinate]}
                      strokeWidth={4}
                      strokeColor={colors.gold}
                    />
                  )}

                {driverCoordinate &&
                  dropoffCoordinate &&
                  cleanStatus(trip.status) === "in_progress" && (
                    <Polyline
                      coordinates={[driverCoordinate, dropoffCoordinate]}
                      strokeWidth={4}
                      strokeColor={colors.gold}
                    />
                  )}
              </MapView>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <UserRound size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Driver Details</Text>
              </View>

              <Row label="Driver" value={getDriverName()} styles={styles} />
              <Row label="Phone" value={getDriverPhone() || "Not available yet"} styles={styles} />
              <Row label="Vehicle" value={getVehicle()} styles={styles} />
              <Row label="Plate Number" value={getPlateNumber()} styles={styles} />
              <Row
                label="ETA"
                value={
                  location?.eta_minutes
                    ? `${Math.round(Number(location.eta_minutes))} minutes`
                    : "Calculating"
                }
                styles={styles}
              />
              <Row
                label="Trip Phase"
                value={location?.trip_phase || getStatusLabel(trip.status)}
                styles={styles}
              />
              <Row
                label="Last Updated"
                value={
                  location?.last_updated
                    ? new Date(location.last_updated).toLocaleString()
                    : location?.updated_at
                    ? new Date(location.updated_at).toLocaleString()
                    : "Waiting for GPS update"
                }
                styles={styles}
              />

              <View style={styles.driverActions}>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={callDriver}
                  activeOpacity={0.85}
                >
                  <Phone size={17} color={colors.gold} />
                  <Text style={styles.secondaryActionText}>Call Driver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={openInMaps}
                  activeOpacity={0.85}
                >
                  <ExternalLink size={17} color={colors.gold} />
                  <Text style={styles.secondaryActionText}>Open Maps</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <CarFront size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Trip Details</Text>
              </View>

              <Row label="Invoice" value={trip.invoice_no || "N/A"} styles={styles} />
              <Row label="Status" value={getStatusLabel(trip.status)} styles={styles} />
              <Row label="Pickup" value={getPickup()} styles={styles} />
              <Row label="Drop-off" value={getDropoff()} styles={styles} />
              <Row
                label="Date"
                value={trip.date || trip.ride_date || trip.pickup_date || "N/A"}
                styles={styles}
              />
              <Row
                label="Time"
                value={trip.time || trip.ride_time || trip.pickup_time || "N/A"}
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Route size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Route</Text>
              </View>

              <View style={styles.routeLine}>
                <MapPinned size={18} color={colors.gold} />
                <Text style={styles.routeText}>{getPickup()}</Text>
              </View>

              <Text style={styles.routeArrow}>↓</Text>

              <View style={styles.routeLine}>
                <CarFront size={18} color={colors.gold} />
                <Text style={styles.routeText}>{getDropoff()}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.goldButton} onPress={openInMaps}>
              <ExternalLink size={18} color={colors.navy} />
              <Text style={styles.goldButtonText}>Open Driver Location in Maps</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
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
      paddingBottom: 54,
    },
    centerContainer: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
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
    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
    },
    title: {
      color: c.text,
      fontSize: 37,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },
    loadingText: {
      color: c.text,
      marginTop: 14,
      fontSize: 16,
      fontWeight: "800",
    },
    text: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      fontWeight: "700",
    },
    heroCard: {
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 17,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      color: c.navy,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 4,
    },
    heroText: {
      color: c.navy,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 20,
      opacity: 0.82,
    },
    quickRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 18,
    },
    quickButton: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    quickText: {
      color: c.gold,
      fontWeight: "900",
      fontSize: 13,
    },
    statusCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    statusText: {
      color: c.gold,
      fontSize: 25,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 10,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: {
      color: c.gold,
      fontSize: 21,
      fontWeight: "900",
      flex: 1,
    },
    mapShell: {
      height: 330,
      padding: 0,
      overflow: "hidden",
      marginBottom: 18,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      ...v5Shadow(c),
    },
    map: {
      flex: 1,
    },
    row: {
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      paddingBottom: 11,
    },
    label: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
      marginBottom: 4,
      textTransform: "uppercase",
    },
    value: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 22,
      fontWeight: "700",
    },
    driverActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 6,
    },
    secondaryAction: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
      backgroundColor: c.soft,
    },
    secondaryActionText: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
    },
    goldButton: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 15,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
      ...v5Shadow(c),
    },
    goldButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
    },
    outlineButton: {
      borderRadius: 16,
      paddingVertical: 15,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      marginTop: 12,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    emptyCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      padding: 24,
      alignItems: "center",
      width: "100%",
      ...v5Shadow(c),
    },
    emptyTitle: {
      color: c.text,
      fontSize: 25,
      fontWeight: "900",
      marginTop: 14,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyText: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      textAlign: "center",
      fontWeight: "700",
      marginBottom: 10,
    },
    routeLine: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    routeText: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 23,
      flex: 1,
      fontWeight: "700",
    },
    routeArrow: {
      color: c.gold,
      fontSize: 20,
      marginVertical: 5,
      marginLeft: 4,
    },
  });
}