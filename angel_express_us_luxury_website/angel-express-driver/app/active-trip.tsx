import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "../lib/supabase";
import {
  getDriverPayoutAmount,
  getDropoffValue,
  getPickupValue,
  getTripTotal,
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

const HALF_MILE = 0.5;

const ACTIVE_STATUSES = [
  "assigned",
  "driver_assigned",
  "accepted",
  "driver_accepted",
  "driver_arrived",
  "in_progress",
];

export default function ActiveTripScreen() {
  const { booking_id, invoice_no } = useLocalSearchParams<{
    booking_id?: string;
    invoice_no?: string;
  }>();

  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [trip, setTrip] = useState<any>(null);
  const [passengerProfile, setPassengerProfile] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);

  const [passengerRating, setPassengerRating] = useState("5.0");
  const [passengerReviews, setPassengerReviews] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadActiveTrip();
      getDriverLocation();
    }, [booking_id, invoice_no])
  );

  useEffect(() => {
    if (!trip?.id) return;

    updateLiveDriverLocation(trip);

    const liveTracking = setInterval(() => {
      updateLiveDriverLocation(trip);
    }, 10000);

    return () => clearInterval(liveTracking);
  }, [trip?.id, trip?.status]);

  function getCleanStatus(value?: string) {
    return String(value || "").toLowerCase().trim();
  }

  function isAssignedStatus(value?: string) {
    const status = getCleanStatus(value);

    return (
      status === "assigned" ||
      status === "driver_assigned" ||
      status === "accepted" ||
      status === "driver_accepted"
    );
  }

  function firstAvailable(...values: any[]) {
    for (const value of values) {
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return String(value).trim();
      }
    }

    return "";
  }

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

      const currentStatus = getCleanStatus(currentTrip.status);

      const targetLat = currentStatus === "in_progress" ? dropoffLat : pickupLat;
      const targetLng = currentStatus === "in_progress" ? dropoffLng : pickupLng;

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

      if (currentStatus === "driver_arrived") {
        tripPhase = "Waiting For Passenger";
      }

      if (currentStatus === "in_progress") {
        tripPhase = "Passenger Onboard";
      }

      if (currentStatus === "completed") {
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

          passenger_name: getPassengerNameFromData(currentTrip, passengerProfile),
          passenger_phone: getPassengerPhoneFromData(currentTrip, passengerProfile),

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

  async function loadPassengerProfile(booking: any) {
    try {
      setPassengerProfile(null);

      const passengerId = firstAvailable(
        booking?.user_id,
        booking?.passenger_id,
        booking?.passenger_user_id,
        booking?.customer_id
      );

      const passengerEmail = firstAvailable(
        booking?.email,
        booking?.passenger_email,
        booking?.customer_email
      );

      if (passengerId) {
        const { data } = await supabase
          .from("passengers")
          .select("*")
          .eq("id", passengerId)
          .maybeSingle();

        if (data) {
          setPassengerProfile(data);
          return data;
        }
      }

      if (passengerEmail) {
        const { data } = await supabase
          .from("passengers")
          .select("*")
          .eq("email", passengerEmail)
          .maybeSingle();

        if (data) {
          setPassengerProfile(data);
          return data;
        }
      }

      if (passengerId) {
        const { data } = await supabase
          .from("passenger_profiles")
          .select("*")
          .eq("user_id", passengerId)
          .maybeSingle();

        if (data) {
          setPassengerProfile(data);
          return data;
        }
      }

      if (passengerEmail) {
        const { data } = await supabase
          .from("passenger_profiles")
          .select("*")
          .eq("email", passengerEmail)
          .maybeSingle();

        if (data) {
          setPassengerProfile(data);
          return data;
        }
      }

      return null;
    } catch (err) {
      console.log("Passenger profile lookup error:", err);
      return null;
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

      let data: any = null;
      let error: any = null;

      if (booking_id) {
        const result = await supabase
          .from("bookings")
          .select("*")
          .eq("id", String(booking_id))
          .or(`driver_id.eq.${user.id},assigned_driver_id.eq.${user.id}`)
          .maybeSingle();

        data = result.data;
        error = result.error;
      } else if (invoice_no) {
        const result = await supabase
          .from("bookings")
          .select("*")
          .eq("invoice_no", String(invoice_no))
          .or(`driver_id.eq.${user.id},assigned_driver_id.eq.${user.id}`)
          .maybeSingle();

        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from("bookings")
          .select("*")
          .or(`driver_id.eq.${user.id},assigned_driver_id.eq.${user.id}`)
          .in("status", ACTIVE_STATUSES)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      setTrip(data || null);

      if (data) {
        const profile = await loadPassengerProfile(data);
        await loadPassengerRating(data);
        await updateLiveDriverLocationWithProfile(data, profile);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load active trip.");
    } finally {
      setLoading(false);
    }
  }

  async function updateLiveDriverLocationWithProfile(currentTrip: any, profile: any) {
    const previousProfile = passengerProfile;

    if (profile) {
      setPassengerProfile(profile);
    }

    try {
      await updateLiveDriverLocation(currentTrip);
    } finally {
      if (!profile && previousProfile) {
        setPassengerProfile(previousProfile);
      }
    }
  }

  function getPassengerNameFromData(booking: any, profile: any) {
    const profileFirst = firstAvailable(profile?.first_name, profile?.firstname);
    const profileLast = firstAvailable(profile?.last_name, profile?.lastname);

    const profileFullName = firstAvailable(
      profile?.full_name,
      profile?.name,
      profileFirst && profileLast ? `${profileFirst} ${profileLast}` : "",
      profileFirst
    );

    const bookingFirst = firstAvailable(booking?.first_name, booking?.firstname);
    const bookingLast = firstAvailable(booking?.last_name, booking?.lastname);

    const bookingFullName = firstAvailable(
      booking?.passenger_name,
      booking?.customer_name,
      booking?.full_name,
      booking?.name,
      bookingFirst && bookingLast ? `${bookingFirst} ${bookingLast}` : "",
      bookingFirst
    );

    return firstAvailable(profileFullName, bookingFullName, "Passenger");
  }

  function getPassengerPhoneFromData(booking: any, profile: any) {
    return firstAvailable(
      booking?.phone,
      booking?.passenger_phone,
      booking?.customer_phone,
      booking?.phone_number,
      booking?.mobile,
      profile?.phone,
      profile?.passenger_phone,
      profile?.phone_number,
      profile?.mobile
    );
  }

  function getPassengerEmailFromData(booking: any, profile: any) {
    return firstAvailable(
      booking?.email,
      booking?.passenger_email,
      booking?.customer_email,
      profile?.email,
      profile?.passenger_email
    );
  }

  function getEmergencyContactNameFromData(booking: any, profile: any) {
    return firstAvailable(
      booking?.emergency_contact_name,
      booking?.emergency_name,
      profile?.emergency_contact_name,
      profile?.emergency_name
    );
  }

  function getEmergencyContactPhoneFromData(booking: any, profile: any) {
    return firstAvailable(
      booking?.emergency_contact_phone,
      booking?.emergency_phone,
      profile?.emergency_contact_phone,
      profile?.emergency_phone
    );
  }

  function getPassengerName() {
    return getPassengerNameFromData(trip, passengerProfile);
  }

  function getPassengerPhone() {
    return getPassengerPhoneFromData(trip, passengerProfile);
  }

  function getPassengerEmail() {
    return getPassengerEmailFromData(trip, passengerProfile);
  }

  function getEmergencyContactName() {
    return getEmergencyContactNameFromData(trip, passengerProfile);
  }

  function getEmergencyContactPhone() {
    return getEmergencyContactPhoneFromData(trip, passengerProfile);
  }

  function getPickup() {
    return getPickupValue(trip) || "Not provided";
  }

  function getDropoff() {
    return getDropoffValue(trip) || "Not provided";
  }

  function getFare() {
    return getTripTotal(trip);
  }

  function getDriverPayout() {
    return getDriverPayoutAmount(trip);
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

    const status = getCleanStatus(trip.status);

    if (status === "in_progress") return getDropoffCoords();

    return getPickupCoords();
  }

  function getTargetAddress() {
    const status = getCleanStatus(trip?.status);

    if (status === "in_progress") return getDropoff();

    return getPickup();
  }

  function getTargetLabel() {
    if (!trip) return "Destination";

    const status = getCleanStatus(trip.status);

    if (status === "in_progress") return "Drop-off Location";

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
    return String(phone || "").replace(/[^\d+]/g, "");
  }

  function callPassenger() {
    const phone = getPassengerPhone();

    if (!phone) {
      Alert.alert(
        "No Phone Number",
        "Passenger phone number is not available for this booking."
      );
      return;
    }

    Linking.openURL(`tel:${cleanPhone(phone)}`);
  }

  function textPassenger() {
    const phone = getPassengerPhone();

    if (!phone) {
      Alert.alert(
        "No Phone Number",
        "Passenger phone number is not available for this booking."
      );
      return;
    }

    Linking.openURL(`sms:${cleanPhone(phone)}`);
  }

  function chatPassenger() {
    if (!trip?.id) {
      Alert.alert("No Active Trip", "There is no active trip to chat about.");
      return;
    }

    router.push({
      pathname: "/trip-chat" as any,
      params: {
        booking_id: String(trip.id),
        passenger_id: String(
          trip.user_id || trip.passenger_id || trip.passenger_user_id || ""
        ),
        passenger_name: getPassengerName(),
        passenger_phone: getPassengerPhone(),
      },
    });
  }

  async function openUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Navigation Error", "Unable to open this map option.");
    }
  }

  function openNavigation() {
    const target = getTargetCoords();
    const targetAddress = getTargetAddress();

    if (!target && (!targetAddress || targetAddress === "Not provided")) {
      Alert.alert(
        "Destination Missing",
        "This trip does not have pickup/drop-off coordinates or address."
      );
      return;
    }

    const label = encodeURIComponent(getTargetLabel());
    const encodedAddress = encodeURIComponent(targetAddress);

    const destination = target
      ? `${target.latitude},${target.longitude}`
      : encodedAddress;

    const appleMapsUrl = target
      ? `http://maps.apple.com/?daddr=${target.latitude},${target.longitude}&q=${label}&dirflg=d`
      : `http://maps.apple.com/?daddr=${encodedAddress}&q=${label}&dirflg=d`;

    const googleMapsUrl = target
      ? `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;

    const wazeUrl = target
      ? `https://waze.com/ul?ll=${target.latitude},${target.longitude}&navigate=yes`
      : `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;

    Alert.alert(
      `Navigate to ${getTargetLabel()}`,
      target ? destination : targetAddress,
      [
        {
          text: "Apple Maps",
          onPress: () => openUrl(appleMapsUrl),
        },
        {
          text: "Google Maps",
          onPress: () => openUrl(googleMapsUrl),
        },
        {
          text: "Waze",
          onPress: () => openUrl(wazeUrl),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
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
        updateData.driver_arrived_at_pickup = new Date().toISOString();
      }

      if (newStatus === "in_progress") {
        updateData.started_at = new Date().toISOString();
        updateData.driver_picked_up_passenger = new Date().toISOString();
      }

      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
        updateData.driver_dropped_off_passenger = new Date().toISOString();
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

    const status = getCleanStatus(trip.status);

    if (isAssignedStatus(status)) {
      return (
        <>
          <TouchableOpacity
            style={styles.navigationButton}
            onPress={openNavigation}
            activeOpacity={0.85}
          >
            <Text style={styles.navigationButtonText}>Navigate to Pickup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => updateTripStatus("driver_arrived")}
            disabled={updating}
            activeOpacity={0.85}
          >
            {updating ? (
              <ActivityIndicator color={colors.navy} />
            ) : (
              <Text style={styles.primaryButtonText}>Arrived at Pickup</Text>
            )}
          </TouchableOpacity>
        </>
      );
    }

    if (status === "driver_arrived") {
      return (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => updateTripStatus("in_progress")}
          disabled={updating}
          activeOpacity={0.85}
        >
          {updating ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <Text style={styles.primaryButtonText}>Pick Up Passenger</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (status === "in_progress") {
      return (
        <>
          <TouchableOpacity
            style={styles.navigationButton}
            onPress={openNavigation}
            activeOpacity={0.85}
          >
            <Text style={styles.navigationButtonText}>Navigate to Drop-off</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => updateTripStatus("completed")}
            disabled={updating}
            activeOpacity={0.85}
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
        <ActivityIndicator size="large" color={colors.gold} />
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
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.backButtonText}>← Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

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
                onPress={() => router.push("/find-trips" as any)}
                activeOpacity={0.85}
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
                      getCleanStatus(trip.status) === "in_progress"
                        ? getDropoff()
                        : getPickup()
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
                    GPS coordinates missing for this trip. Navigation will use
                    the pickup or drop-off address instead.
                  </Text>
                </View>
              )}

              <View style={styles.passengerCard}>
                <Text style={styles.cardHeader}>Passenger Card</Text>

                <Text style={styles.passengerName}>{getPassengerName()}</Text>

                {getPassengerEmail() ? (
                  <Text style={styles.emailText}>{getPassengerEmail()}</Text>
                ) : null}

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
                    {getEmergencyContactName()
                      ? `${getEmergencyContactName()}${
                          getEmergencyContactPhone()
                            ? ` • ${getEmergencyContactPhone()}`
                            : ""
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
                  Status: {String(trip.status || "")
                    .replace(/_/g, " ")
                    .toUpperCase()}
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
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={callPassenger}
                  activeOpacity={0.85}
                >
                  <Text style={styles.contactButtonText}>Call Passenger</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={textPassenger}
                  activeOpacity={0.85}
                >
                  <Text style={styles.contactButtonText}>Text Passenger</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.chatButton}
                onPress={chatPassenger}
                activeOpacity={0.85}
              >
                <Text style={styles.chatButtonText}>In-App Chat With Passenger</Text>
              </TouchableOpacity>

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
                  {trip.date || trip.ride_date || trip.pickup_date || "Not set"}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Time</Text>
                <Text style={styles.value}>
                  {trip.time || trip.ride_time || trip.pickup_time || "Not set"}
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
                activeOpacity={0.85}
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

function createStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },

    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
    },

    loadingContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },

    loadingText: {
      color: colors.text2,
      marginTop: 14,
      fontWeight: "800",
    },

    container: {
      flexGrow: 1,
      padding: 22,
      paddingTop: 65,
      paddingBottom: 45,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },

    backButton: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.card,
      alignSelf: "flex-start",
    },

    backButtonText: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 14,
    },

    themePill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 11,
      paddingHorizontal: 14,
    },

    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    title: {
      color: colors.gold,
      fontSize: 32,
      fontWeight: "900",
      marginBottom: 8,
    },

    subtitle: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 18,
      fontWeight: "700",
    },

    emptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 22,
      ...v5Shadow(colors),
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 8,
    },

    emptyText: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 18,
      fontWeight: "700",
    },

    tripCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 18,
      ...v5Shadow(colors),
    },

    map: {
      height: 260,
      borderRadius: 18,
      marginBottom: 18,
    },

    noMapBox: {
      backgroundColor: colors.card2,
      borderRadius: 18,
      padding: 22,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },

    noMapText: {
      color: colors.text,
      textAlign: "center",
      lineHeight: 22,
      fontWeight: "700",
    },

    passengerCard: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 18,
    },

    cardHeader: {
      color: colors.gold,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 8,
    },

    passengerName: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 4,
    },

    emailText: {
      color: colors.text2,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 7,
    },

    ratingText: {
      color: colors.gold,
      fontSize: 15,
      fontWeight: "800",
      marginBottom: 14,
    },

    infoRow: {
      marginBottom: 10,
    },

    infoLabel: {
      color: colors.muted2,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      marginBottom: 3,
    },

    infoValue: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "700",
    },

    tripTitle: {
      color: colors.gold,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 14,
    },

    statusBadge: {
      backgroundColor: colors.mode === "dark" ? "rgba(212,175,55,0.18)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 16,
    },

    statusText: {
      color: colors.gold,
      fontWeight: "900",
      textAlign: "center",
    },

    distanceBox: {
      backgroundColor: colors.card2,
      borderRadius: 16,
      padding: 15,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },

    distanceTitle: {
      color: colors.gold,
      fontWeight: "900",
      marginBottom: 5,
    },

    distanceText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 5,
    },

    rangeText: {
      fontSize: 13,
      fontWeight: "800",
    },

    inRangeText: {
      color: colors.success,
    },

    outRangeText: {
      color: "#f97316",
    },

    contactRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },

    contactButton: {
      width: "48%",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      borderRadius: 14,
    },

    contactButtonText: {
      color: colors.gold,
      fontWeight: "900",
      textAlign: "center",
    },

    chatButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.mode === "dark" ? "rgba(212,175,55,0.14)" : "#FFF8E8",
      paddingVertical: 15,
      borderRadius: 14,
      marginBottom: 18,
    },

    chatButtonText: {
      color: colors.gold,
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
    },

    row: {
      marginBottom: 12,
    },

    label: {
      color: colors.muted2,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 4,
      textTransform: "uppercase",
    },

    value: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "700",
    },

    moneyBox: {
      backgroundColor: colors.card2,
      borderRadius: 16,
      padding: 16,
      marginTop: 8,
      marginBottom: 18,
      flexDirection: "row",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },

    moneyLabel: {
      color: colors.text2,
      fontSize: 13,
      marginBottom: 5,
      fontWeight: "700",
    },

    moneyValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
    },

    payoutValue: {
      color: colors.gold,
      fontSize: 20,
      fontWeight: "900",
    },

    sosButton: {
      backgroundColor: colors.danger,
      paddingVertical: 16,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.mode === "dark" ? "#fecaca" : "rgba(127,29,29,0.25)",
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
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingVertical: 16,
      borderRadius: 16,
      marginBottom: 12,
    },

    navigationButtonText: {
      color: colors.gold,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
    },

    primaryButton: {
      backgroundColor: colors.gold,
      paddingVertical: 16,
      borderRadius: 16,
    },

    primaryButtonText: {
      color: colors.navy,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
    },

    completeButton: {
      backgroundColor: colors.danger,
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
}