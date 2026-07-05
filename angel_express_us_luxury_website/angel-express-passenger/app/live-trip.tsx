import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
  CarFront,
  ExternalLink,
  Phone,
  ShieldCheck,
  UserRound,
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

  const invoiceNo = String(params.invoice_no || "");
  const bookingId = String(params.booking_id || "");

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();

    loadLiveTrip();

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
    if (status === "cancelled") return "Cancelled";

    return String(value || "Pending").replace(/_/g, " ");
  }

  async function loadLiveTrip(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        Alert.alert("Not Logged In", "Please sign in again.");
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
      "Angel Express Driver"
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
    return firstAvailable(
      location?.vehicle,
      location?.vehicle_type,
      trip?.vehicle,
      trip?.vehicle_type,
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
    driverCoordinate || pickupCoordinate || dropoffCoordinate || {
      latitude: 32.7767,
      longitude: -96.797,
    };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={styles.loadingText}>Loading live trip...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Trip Not Found</Text>
        <Text style={styles.text}>
          No active accepted trip was found for your account yet.
        </Text>

        <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
          <Text style={styles.backHomeText}>Go Back</Text>
        </TouchableOpacity>
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
            <Text style={styles.title}>Live Trip Tracking</Text>

            <Text style={styles.subtitle}>
              Track your Angel Express driver in real time.
            </Text>

            <AngelCard style={styles.statusCard}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Ride Status</Text>
              </View>

              <Text style={styles.statusText}>{getStatusLabel(trip.status)}</Text>

              <Text style={styles.text}>
                {hasDriverLocation
                  ? "Your driver is sharing live GPS."
                  : cleanStatus(trip.status) === "driver_assigned"
                  ? "Your driver has accepted the ride. GPS will appear once the driver opens Active Trip."
                  : "Waiting for driver GPS location."}
              </Text>
            </AngelCard>

            <AngelCard style={styles.mapShell}>
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
                      strokeColor={GOLD}
                    />
                  )}

                {driverCoordinate &&
                  dropoffCoordinate &&
                  cleanStatus(trip.status) === "in_progress" && (
                    <Polyline
                      coordinates={[driverCoordinate, dropoffCoordinate]}
                      strokeWidth={4}
                      strokeColor={GOLD}
                    />
                  )}
              </MapView>
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <UserRound size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Driver Details</Text>
              </View>

              <Row label="Driver" value={getDriverName()} />
              <Row label="Phone" value={getDriverPhone() || "Not available yet"} />
              <Row label="Vehicle" value={getVehicle()} />
              <Row label="Plate Number" value={getPlateNumber()} />
              <Row
                label="ETA"
                value={
                  location?.eta_minutes
                    ? `${Math.round(Number(location.eta_minutes))} minutes`
                    : "Calculating"
                }
              />
              <Row
                label="Trip Phase"
                value={location?.trip_phase || getStatusLabel(trip.status)}
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
              />

              <View style={styles.driverActions}>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={callDriver}
                  activeOpacity={0.85}
                >
                  <Phone size={17} color={GOLD} />
                  <Text style={styles.secondaryActionText}>Call Driver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={openInMaps}
                  activeOpacity={0.85}
                >
                  <ExternalLink size={17} color={GOLD} />
                  <Text style={styles.secondaryActionText}>Open Maps</Text>
                </TouchableOpacity>
              </View>
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <CarFront size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Trip Details</Text>
              </View>

              <Row label="Invoice" value={trip.invoice_no || "N/A"} />
              <Row label="Status" value={getStatusLabel(trip.status)} />
              <Row label="Pickup" value={getPickup()} />
              <Row label="Drop-off" value={getDropoff()} />
              <Row
                label="Date"
                value={trip.date || trip.ride_date || trip.pickup_date || "N/A"}
              />
              <Row
                label="Time"
                value={trip.time || trip.ride_time || trip.pickup_time || "N/A"}
              />
            </AngelCard>

            <AngelHeroButton
              title="Open Driver Location in Maps"
              onPress={openInMaps}
              variant="gold"
              style={styles.openMapButton}
            />
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
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

  content: {
    padding: 22,
    paddingTop: 56,
    paddingBottom: 50,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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

  loadingText: {
    color: AE_COLORS.white,
    marginTop: 14,
    fontSize: 16,
  },

  text: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 24,
  },

  statusCard: {
    padding: 18,
    marginBottom: 18,
  },

  statusText: {
    color: GOLD,
    fontSize: 26,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 10,
  },

  card: {
    padding: 18,
    marginBottom: 18,
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

  mapShell: {
    height: 330,
    padding: 0,
    overflow: "hidden",
    marginBottom: 18,
  },

  map: {
    flex: 1,
  },

  row: {
    marginBottom: 14,
  },

  label: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  value: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 22,
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
    borderColor: "rgba(212,175,55,0.45)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    backgroundColor: "rgba(212,175,55,0.08)",
  },

  secondaryActionText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "900",
  },

  openMapButton: {
    marginTop: 4,
  },

  backHomeButton: {
    marginTop: 24,
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 22,
  },

  backHomeText: {
    color: AE_COLORS.navy2,
    fontSize: 16,
    fontWeight: "900",
  },
});