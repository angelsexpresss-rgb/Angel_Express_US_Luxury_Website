import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "../lib/supabase";

const HALF_MILE = 0.5;

export default function ActiveTripScreen() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [trip, setTrip] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);

  const [passengerRating, setPassengerRating] = useState("5.0");
  const [passengerReviews, setPassengerReviews] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadActiveTrip();
      getDriverLocation();
    }, [])
  );

  useEffect(() => {
    if (!trip?.id) return;

    updateLiveDriverLocation(trip);

    const liveTracking = setInterval(() => {
      updateLiveDriverLocation(trip);
    }, 10000);

    return () => clearInterval(liveTracking);
  }, [trip?.id, trip?.status]);

  async function getDriverLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location Required",
          "Angel Express needs your location to verify pickup and drop-off arrival."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setDriverLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (err: any) {
      Alert.alert("Location Error", err.message || "Unable to get location.");
    }
  }

  async function updateLiveDriverLocation(currentTrip: any) {
    try {
      if (!currentTrip?.id) return;

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;
      const speedMps = location.coords.speed || 0;
      const speedMph = speedMps * 2.23694;
      const heading = location.coords.heading || 0;

      setDriverLocation({ latitude, longitude });

      const pickupLat = Number(currentTrip.pickup_lat || 0);
      const pickupLng = Number(currentTrip.pickup_lng || 0);
      const dropoffLat = Number(currentTrip.dropoff_lat || 0);
      const dropoffLng = Number(currentTrip.dropoff_lng || 0);

      const targetLat =
        currentTrip.status === "in_progress" ? dropoffLat : pickupLat;

      const targetLng =
        currentTrip.status === "in_progress" ? dropoffLng : pickupLng;

      let distanceToTargetMiles = null;
      let etaMinutes = null;

      if (targetLat && targetLng) {
        distanceToTargetMiles = calculateDistanceMiles(
          latitude,
          longitude,
          targetLat,
          targetLng
        );

        const safeSpeedMph = speedMph > 5 ? speedMph : 30;
        etaMinutes = (distanceToTargetMiles / safeSpeedMph) * 60;
      }

      let tripPhase = "En Route To Pickup";

      if (currentTrip.status === "driver_arrived") {
        tripPhase = "Waiting For Passenger";
      }

      if (currentTrip.status === "in_progress") {
        tripPhase = "Passenger Onboard";
      }

      if (currentTrip.status === "completed") {
        tripPhase = "Completed";
      }

      const { error } = await supabase.from("driver_live_locations").upsert(
        {
          driver_id: user.id,
          booking_id: currentTrip.id,

          latitude,
          longitude,
          speed_mph: speedMph,
          heading,

          status: currentTrip.status || "active",
          emergency_status: "normal",
          emergency_message: null,
          trip_phase: tripPhase,
          vehicle_type: "Angel Express Vehicle",

          driver_name:
            currentTrip.driver_name ||
            currentTrip.assigned_driver_name ||
            "Driver",

          driver_phone:
            currentTrip.driver_phone ||
            currentTrip.assigned_driver_phone ||
            "",

          passenger_name:
            currentTrip.name ||
            currentTrip.passenger_name ||
            currentTrip.full_name ||
            "Passenger",

          passenger_phone:
            currentTrip.phone || currentTrip.passenger_phone || "",

          pickup_lat: pickupLat || null,
          pickup_lng: pickupLng || null,
          dropoff_lat: dropoffLat || null,
          dropoff_lng: dropoffLng || null,

          eta_minutes: etaMinutes,
          distance_to_target_miles: distanceToTargetMiles,

          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "driver_id,booking_id",
        }
      );

      if (error) throw error;
    } catch (err) {
      console.log("Live GPS update error:", err);
    }
  }

  async function loadPassengerRating(booking: any) {
    try {
      let query = supabase.from("passenger_ratings").select("overall_rating");

      if (booking?.user_id) {
        query = query.eq("passenger_user_id", booking.user_id);
      } else if (booking?.email) {
        query = query.eq("passenger_email", booking.email);
      } else {
        setPassengerRating("5.0");
        setPassengerReviews(0);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setPassengerRating("5.0");
        setPassengerReviews(0);
        return;
      }

      const average =
        data.reduce((sum, item) => sum + Number(item.overall_rating || 5), 0) /
        data.length;

      setPassengerRating(average.toFixed(1));
      setPassengerReviews(data.length);
    } catch {
      setPassengerRating("5.0");
      setPassengerReviews(0);
    }
  }

  async function loadActiveTrip() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/driver-login");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("driver_id", user.id)
        .in("status", ["assigned", "driver_arrived", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setTrip(data || null);

      if (data) {
        await loadPassengerRating(data);
        await updateLiveDriverLocation(data);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load active trip.");
    } finally {
      setLoading(false);
    }
  }

  function getPassengerName() {
    return trip?.name || trip?.passenger_name || "Passenger";
  }

  function getPassengerPhone() {
    return trip?.phone || trip?.passenger_phone || "";
  }

  function getPickup() {
    return trip?.pickup || trip?.pickup_address || "Not provided";
  }

  function getDropoff() {
    return trip?.dropoff || trip?.dropoff_address || "Not provided";
  }

  function getFare() {
    return Number(trip?.total) || Number(trip?.total_fare) || 0;
  }

  function getDriverPayout() {
    return Number(trip?.driver_share) || getFare() * 0.7;
  }

  function getPickupCoords() {
    const latitude = Number(trip?.pickup_lat);
    const longitude = Number(trip?.pickup_lng);
    if (!latitude || !longitude) return null;
    return { latitude, longitude };
  }

  function getDropoffCoords() {
    const latitude = Number(trip?.dropoff_lat);
    const longitude = Number(trip?.dropoff_lng);
    if (!latitude || !longitude) return null;
    return { latitude, longitude };
  }

  function getTargetCoords() {
    if (!trip) return null;
    if (trip.status === "in_progress") return getDropoffCoords();
    return getPickupCoords();
  }

  function getTargetLabel() {
    if (!trip) return "Destination";
    if (trip.status === "in_progress") return "Drop-off Location";
    return "Pickup Location";
  }

  function degreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180);
  }

  function calculateDistanceMiles(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) {
    const earthRadiusMiles = 3958.8;
    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(degreesToRadians(lat1)) *
        Math.cos(degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return earthRadiusMiles * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function getDistanceToTarget() {
    const target = getTargetCoords();
    if (!driverLocation || !target) return null;

    return calculateDistanceMiles(
      driverLocation.latitude,
      driverLocation.longitude,
      target.latitude,
      target.longitude
    );
  }

  function isWithinHalfMile() {
    const distance = getDistanceToTarget();
    return distance !== null && distance <= HALF_MILE;
  }

  function formatDistance() {
    const distance = getDistanceToTarget();
    if (distance === null) return "Distance unavailable";
    return `${distance.toFixed(2)} miles away`;
  }

  function cleanPhone(phone: string) {
    return phone.replace(/[^\d+]/g, "");
  }

  function callPassenger() {
    const phone = getPassengerPhone();

    if (!phone) {
      Alert.alert("No Phone Number", "Passenger phone number is not available.");
      return;
    }

    Linking.openURL(`tel:${cleanPhone(phone)}`);
  }

  function textPassenger() {
    const phone = getPassengerPhone();

    if (!phone) {
      Alert.alert("No Phone Number", "Passenger phone number is not available.");
      return;
    }

    Linking.openURL(`sms:${cleanPhone(phone)}`);
  }

  function openNavigation() {
    const target = getTargetCoords();

    if (!target) {
      Alert.alert(
        "Coordinates Missing",
        "This trip does not have pickup or drop-off GPS coordinates yet."
      );
      return;
    }

    const label = getTargetLabel();

    const url = Platform.select({
      ios: `maps://app?daddr=${target.latitude},${target.longitude}&q=${label}`,
      android: `google.navigation:q=${target.latitude},${target.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`,
    });

    if (url) Linking.openURL(url);
  }

  async function updateTripStatus(newStatus: string) {
    if (!trip) return;

    await getDriverLocation();

    const target = getTargetCoords();

    if (!target) {
      Alert.alert(
        "GPS Coordinates Missing",
        "This trip is missing GPS coordinates. Please contact Angel Express support."
      );
      return;
    }

    if (!isWithinHalfMile()) {
      Alert.alert(
        "Too Far Away",
        `You must be within ${HALF_MILE} miles before completing this action. Current distance: ${formatDistance()}`
      );
      return;
    }

    try {
      setUpdating(true);

      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === "driver_arrived") {
        updateData.driver_arrived_at = new Date().toISOString();
      }

      if (newStatus === "in_progress") {
        updateData.started_at = new Date().toISOString();
      }

      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", trip.id);

      if (error) throw error;

      await updateLiveDriverLocation({
        ...trip,
        status: newStatus,
      });

      if (newStatus === "completed") {
        Alert.alert(
          "Passenger Dropped Off",
          "Trip completed. Please leave passenger feedback."
        );

        router.replace({
          pathname: "/rate-passenger",
          params: { bookingId: String(trip.id) },
        });

        return;
      }

      loadActiveTrip();
    } catch (err: any) {
      Alert.alert("Update Failed", err.message || "Unable to update trip.");
    } finally {
      setUpdating(false);
    }
  }


  async function sendDriverSOS(alertType = "Driver SOS") {
    if (!trip) {
      Alert.alert("No Active Trip", "There is no active trip to send SOS for.");
      return;
    }

    Alert.alert(
      "Send Emergency SOS?",
      "This will immediately alert Angel Express Owner Control Center.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send SOS",
          style: "destructive",
          onPress: async () => {
            try {
              setUpdating(true);

              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (userError) throw userError;
              if (!user) throw new Error("Driver account not found.");

              await updateLiveDriverLocation({
                ...trip,
                status: trip.status || "active",
              });

              const { error: alertError } = await supabase
                .from("emergency_alerts")
                .insert({
                  booking_id: trip.id,
                  driver_id: user.id,
                  alert_type: alertType,
                  notes: `Driver SOS sent from active trip. Passenger: ${getPassengerName()}. Pickup: ${getPickup()}. Dropoff: ${getDropoff()}.`,
                  resolved: false,
                });

              if (alertError) throw alertError;

              const { error: locationError } = await supabase
                .from("driver_live_locations")
                .update({
                  emergency_status: "driver_sos",
                  emergency_message: alertType,
                  last_updated: new Date().toISOString(),
                })
                .eq("driver_id", user.id)
                .eq("booking_id", trip.id);

              if (locationError) throw locationError;

              Alert.alert(
                "SOS Sent",
                "Angel Express Owner Control Center has been alerted."
              );
            } catch (err: any) {
              Alert.alert("SOS Failed", err.message || "Unable to send SOS.");
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  }

  function renderActionButtons() {
    if (!trip) return null;

    if (trip.status === "assigned") {
      return (
        <>
          <TouchableOpacity style={styles.navigationButton} onPress={openNavigation}>
            <Text style={styles.navigationButtonText}>Navigate to Pickup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => updateTripStatus("driver_arrived")}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#07111f" />
            ) : (
              <Text style={styles.primaryButtonText}>Arrived at Pickup</Text>
            )}
          </TouchableOpacity>
        </>
      );
    }

    if (trip.status === "driver_arrived") {
      return (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => updateTripStatus("in_progress")}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="#07111f" />
          ) : (
            <Text style={styles.primaryButtonText}>Pick Up Passenger</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (trip.status === "in_progress") {
      return (
        <>
          <TouchableOpacity style={styles.navigationButton} onPress={openNavigation}>
            <Text style={styles.navigationButtonText}>Navigate to Drop-off</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => updateTripStatus("completed")}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.completeButtonText}>Drop Off Passenger</Text>
            )}
          </TouchableOpacity>
        </>
      );
    }

    return null;
  }

  const targetCoords = getTargetCoords();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading active trip...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                loadActiveTrip();
                getDriverLocation();
              }}
              tintColor="#d4af37"
            />
          }
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/driver-dashboard")}
          >
            <Text style={styles.backButtonText}>← Dashboard</Text>
          </TouchableOpacity>

          <Text style={styles.title}>My Active Trip</Text>

          <Text style={styles.subtitle}>
            Navigate, contact passenger, and complete trip steps.
          </Text>

          {!trip ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Active Trip</Text>

              <Text style={styles.emptyText}>
                You do not currently have an assigned or in-progress trip.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/find-trips")}
              >
                <Text style={styles.primaryButtonText}>Find Trips</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tripCard}>
              {targetCoords ? (
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: targetCoords.latitude,
                    longitude: targetCoords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  <Marker
                    coordinate={targetCoords}
                    title={getTargetLabel()}
                    description={
                      trip.status === "in_progress" ? getDropoff() : getPickup()
                    }
                  />

                  {driverLocation && (
                    <Marker
                      coordinate={driverLocation}
                      title="Your Location"
                      pinColor="blue"
                    />
                  )}
                </MapView>
              ) : (
                <View style={styles.noMapBox}>
                  <Text style={styles.noMapText}>
                    GPS coordinates missing for this trip.
                  </Text>
                </View>
              )}

              <View style={styles.passengerCard}>
                <Text style={styles.cardHeader}>Passenger Card</Text>

                <Text style={styles.passengerName}>{getPassengerName()}</Text>

                <Text style={styles.ratingText}>
                  ⭐ {passengerRating} rating • {passengerReviews} review(s)
                </Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>
                    {getPassengerPhone() || "Not provided"}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Passengers</Text>
                  <Text style={styles.infoValue}>{trip.passengers || 1}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Luggage</Text>
                  <Text style={styles.infoValue}>{trip.luggage_count || 0}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Emergency Contact</Text>
                  <Text style={styles.infoValue}>
                    {trip.emergency_contact_name
                      ? `${trip.emergency_contact_name} • ${
                          trip.emergency_contact_phone || ""
                        }`
                      : "Not provided"}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Notes</Text>
                  <Text style={styles.infoValue}>
                    {trip.notes || "No special notes"}
                  </Text>
                </View>
              </View>

              <Text style={styles.tripTitle}>
                {trip.route || `${getPickup()} → ${getDropoff()}`}
              </Text>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  Status: {String(trip.status).replace("_", " ").toUpperCase()}
                </Text>
              </View>

              <View style={styles.distanceBox}>
                <Text style={styles.distanceTitle}>
                  Current Target: {getTargetLabel()}
                </Text>

                <Text style={styles.distanceText}>{formatDistance()}</Text>

                <Text
                  style={[
                    styles.rangeText,
                    isWithinHalfMile()
                      ? styles.inRangeText
                      : styles.outRangeText,
                  ]}
                >
                  {isWithinHalfMile()
                    ? "Within 0.5 miles — action allowed"
                    : "Must be within 0.5 miles to continue"}
                </Text>
              </View>

              <View style={styles.contactRow}>
                <TouchableOpacity style={styles.contactButton} onPress={callPassenger}>
                  <Text style={styles.contactButtonText}>Call Passenger</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactButton} onPress={textPassenger}>
                  <Text style={styles.contactButtonText}>Text Passenger</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Pickup</Text>
                <Text style={styles.value}>{getPickup()}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Drop-off</Text>
                <Text style={styles.value}>{getDropoff()}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>
                  {trip.date || trip.ride_date || "Not set"}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Time</Text>
                <Text style={styles.value}>
                  {trip.time || trip.ride_time || "Not set"}
                </Text>
              </View>

              <View style={styles.moneyBox}>
                <View>
                  <Text style={styles.moneyLabel}>Trip Total</Text>
                  <Text style={styles.moneyValue}>${getFare().toFixed(2)}</Text>
                </View>

                <View>
                  <Text style={styles.moneyLabel}>Your 70%</Text>
                  <Text style={styles.payoutValue}>
                    ${getDriverPayout().toFixed(2)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.sosButton}
                onPress={() => sendDriverSOS("Driver SOS")}
                disabled={updating}
              >
                <Text style={styles.sosButtonText}>🚨 Driver SOS / Emergency</Text>
              </TouchableOpacity>

              {renderActionButtons()}
            </View>
          )}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07111f",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#e5e7eb", marginTop: 14 },
  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 65,
    paddingBottom: 45,
  },
  backButton: {
    borderWidth: 1,
    borderColor: "#d4af37",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.88)",
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backButtonText: { color: "#d4af37", fontWeight: "900" },
  title: {
    color: "#d4af37",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#e5e7eb",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  emptyCard: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 22,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  tripCard: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.55)",
    borderRadius: 20,
    padding: 18,
  },
  map: { height: 260, borderRadius: 18, marginBottom: 18 },
  noMapBox: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 18,
    padding: 22,
    marginBottom: 18,
  },
  noMapText: { color: "#ffffff", textAlign: "center" },
  passengerCard: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  cardHeader: {
    color: "#d4af37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  passengerName: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },
  ratingText: {
    color: "#d4af37",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
  },
  infoRow: { marginBottom: 10 },
  infoLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  infoValue: { color: "#ffffff", fontSize: 15, lineHeight: 21 },
  tripTitle: {
    color: "#d4af37",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 14,
  },
  statusBadge: {
    backgroundColor: "rgba(212,175,55,0.18)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  statusText: {
    color: "#d4af37",
    fontWeight: "900",
    textAlign: "center",
  },
  distanceBox: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 16,
    padding: 15,
    marginBottom: 16,
  },
  distanceTitle: { color: "#d4af37", fontWeight: "900", marginBottom: 5 },
  distanceText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 5,
  },
  rangeText: { fontSize: 13, fontWeight: "800" },
  inRangeText: { color: "#22c55e" },
  outRangeText: { color: "#f97316" },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  contactButton: {
    width: "48%",
    backgroundColor: "rgba(15,23,42,0.95)",
    borderWidth: 1,
    borderColor: "#d4af37",
    paddingVertical: 14,
    borderRadius: 14,
  },
  contactButtonText: {
    color: "#d4af37",
    fontWeight: "900",
    textAlign: "center",
  },
  row: { marginBottom: 12 },
  label: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  value: { color: "#ffffff", fontSize: 15, lineHeight: 21 },
  moneyBox: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  moneyLabel: { color: "#cbd5e1", fontSize: 13, marginBottom: 5 },
  moneyValue: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  payoutValue: { color: "#d4af37", fontSize: 20, fontWeight: "900" },
  sosButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  sosButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
  },
  navigationButton: {
    borderWidth: 1,
    borderColor: "#d4af37",
    backgroundColor: "rgba(15,23,42,0.95)",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  navigationButtonText: {
    color: "#d4af37",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
  },
  primaryButton: {
    backgroundColor: "#d4af37",
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: "#07111f",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
  },
  completeButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 16,
    borderRadius: 16,
  },
  completeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
  },
});