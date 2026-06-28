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
  Clock,
  ExternalLink,
  MapPinned,
  Navigation,
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

export default function LiveTripScreen() {
  const params = useLocalSearchParams();

  const invoiceNo = String(params.invoice_no || "");
  const bookingId = String(params.booking_id || "");

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);

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

      const userEmail = user.email?.trim().toLowerCase();

      let bookingQuery = supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`);

      if (invoiceNo) {
        bookingQuery = bookingQuery.eq("invoice_no", invoiceNo);
      }

      if (bookingId) {
        bookingQuery = bookingQuery.eq("id", bookingId);
      }

      const { data: booking, error: bookingError } =
        await bookingQuery.maybeSingle();

      if (bookingError) throw bookingError;

      setTrip(booking);

      if (!booking) return;

      const { data: liveLocation, error: locationError } = await supabase
        .from("live_trip_locations")
        .select("*")
        .eq("invoice_no", booking.invoice_no)
        .maybeSingle();

      if (locationError) throw locationError;

      setLocation(liveLocation);
    } catch (error: any) {
      Alert.alert(
        "Live Tracking Error",
        error.message || "Could not load live trip."
      );
    } finally {
      setLoading(false);
    }
  }

  function openInMaps() {
    if (!location?.latitude || !location?.longitude) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    Linking.openURL(url);
  }

  function callDriver() {
    const phone = location?.driver_phone;

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
          This trip could not be found for your account.
        </Text>

        <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
          <Text style={styles.backHomeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasDriverLocation = Boolean(location?.latitude && location?.longitude);

  const driverCoordinate = hasDriverLocation
    ? {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      }
    : null;

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

            {!hasDriverLocation ? (
              <AngelCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <ShieldCheck size={22} color={GOLD} />
                  <Text style={styles.cardTitle}>Waiting for Driver Location</Text>
                </View>

                <Text style={styles.text}>
                  Your driver location will appear here when the trip is active and
                  the driver starts sharing GPS.
                </Text>

                <View style={styles.infoBlock}>
                  <Row label="Invoice" value={trip.invoice_no || "N/A"} />
                  <Row
                    label="Pickup"
                    value={trip.pickup_address || trip.pickup || "N/A"}
                  />
                  <Row
                    label="Drop-off"
                    value={trip.dropoff_address || trip.dropoff || "N/A"}
                  />
                </View>
              </AngelCard>
            ) : (
              <>
                <AngelCard style={styles.mapShell}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: driverCoordinate!.latitude,
                      longitude: driverCoordinate!.longitude,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                    region={{
                      latitude: driverCoordinate!.latitude,
                      longitude: driverCoordinate!.longitude,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                  >
                    <Marker
                      coordinate={driverCoordinate!}
                      title={location.driver_name || "Angel Express Driver"}
                      description={location.vehicle || "Driver location"}
                    />

                    <Polyline
                      coordinates={[driverCoordinate!]}
                      strokeWidth={4}
                      strokeColor={GOLD}
                    />
                  </MapView>
                </AngelCard>

                <AngelCard style={styles.card}>
                  <View style={styles.cardHeader}>
                    <UserRound size={22} color={GOLD} />
                    <Text style={styles.cardTitle}>Driver Details</Text>
                  </View>

                  <Row label="Driver" value={location.driver_name || "Not assigned"} />
                  <Row label="Phone" value={location.driver_phone || "N/A"} />
                  <Row label="Vehicle" value={location.vehicle || "N/A"} />
                  <Row label="Plate Number" value={location.plate_number || "N/A"} />
                  <Row
                    label="ETA"
                    value={
                      location.eta_minutes
                        ? `${location.eta_minutes} minutes`
                        : "Calculating"
                    }
                  />
                  <Row
                    label="Last Updated"
                    value={
                      location.updated_at
                        ? new Date(location.updated_at).toLocaleString()
                        : "N/A"
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
                  <Row label="Status" value={trip.status || "N/A"} />
                  <Row
                    label="Pickup"
                    value={trip.pickup_address || trip.pickup || "N/A"}
                  />
                  <Row
                    label="Drop-off"
                    value={trip.dropoff_address || trip.dropoff || "N/A"}
                  />
                </AngelCard>

                <AngelHeroButton
                  title="Open Driver Location in Maps"
                  onPress={openInMaps}
                  variant="gold"
                  style={styles.openMapButton}
                />
              </>
            )}
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

  infoBlock: {
    marginTop: 18,
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