import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { supabase } from "../lib/supabase";

export default function LiveTripScreen() {
  const params = useLocalSearchParams();

  const invoiceNo = String(params.invoice_no || "");
  const bookingId = String(params.booking_id || "");

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
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

      const { data: booking, error: bookingError } = await bookingQuery.maybeSingle();

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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#D4AF37" size="large" />
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
      </View>
    );
  }

  if (!location?.latitude || !location?.longitude) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Live Trip Tracking</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Waiting for Driver Location</Text>
          <Text style={styles.text}>
            Your driver location will appear here when the trip is active and
            the driver starts sharing GPS.
          </Text>

          <Text style={styles.label}>Invoice</Text>
          <Text style={styles.value}>{trip.invoice_no || "N/A"}</Text>

          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.value}>
            {trip.pickup_address || trip.pickup || "N/A"}
          </Text>

          <Text style={styles.label}>Drop-off</Text>
          <Text style={styles.value}>
            {trip.dropoff_address || trip.dropoff || "N/A"}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const driverCoordinate = {
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Live Trip Tracking</Text>

      <Text style={styles.subtitle}>
        Track your Angel Express driver in real time.
      </Text>

      <View style={styles.mapCard}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: driverCoordinate.latitude,
            longitude: driverCoordinate.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          region={{
            latitude: driverCoordinate.latitude,
            longitude: driverCoordinate.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker
            coordinate={driverCoordinate}
            title={location.driver_name || "Angel Express Driver"}
            description={location.vehicle || "Driver location"}
          />

          <Polyline
            coordinates={[driverCoordinate]}
            strokeWidth={4}
          />
        </MapView>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Driver Details</Text>

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
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trip Details</Text>

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
      </View>

      <TouchableOpacity style={styles.button} onPress={openInMaps}>
        <Text style={styles.buttonText}>Open Driver Location in Maps</Text>
      </TouchableOpacity>
    </ScrollView>
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
  container: {
    flex: 1,
    backgroundColor: "#040C18",
  },

  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 50,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: "#040C18",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    color: "#D4AF37",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },

  subtitle: {
    color: "#C9D0D8",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },

  loadingText: {
    color: "#FFFFFF",
    marginTop: 14,
    fontSize: 16,
  },

  text: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
  },

  mapCard: {
    height: 320,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },

  map: {
    flex: 1,
  },

  card: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },

  cardTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },

  row: {
    marginBottom: 14,
  },

  label: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  value: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
  },

  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 8,
  },

  buttonText: {
    color: "#071426",
    fontSize: 17,
    fontWeight: "900",
  },
});