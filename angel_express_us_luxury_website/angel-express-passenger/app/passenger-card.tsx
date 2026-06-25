import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
import { supabase } from "../lib/supabase";

const DRIVER_WHATSAPP = "19728367910";

export default function PassengerCardScreen() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadPassengerCardData();
    }, [])
  );

  async function loadPassengerCardData() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const userEmail = user.email?.trim().toLowerCase();

      const { data: profileData, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setProfile(profileData);

      const { data: tripData, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .in("status", ["Confirmed", "In Progress"])
        .order("created_at", { ascending: false });

      if (tripsError) throw tripsError;

      setTrips(tripData || []);
    } catch (error: any) {
      Alert.alert("Passenger Card Error", error.message || "Could not load card.");
    } finally {
      setLoading(false);
    }
  }

  function sendToDriver(trip: any) {
    const passengerName =
      trip.passenger_name ||
      trip.name ||
      `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

    const message = `ANGEL EXPRESS PASSENGER CARD

Passenger: ${passengerName}
Phone: ${profile?.phone || trip.phone || "N/A"}
Email: ${profile?.email || trip.email || "N/A"}

Pickup: ${trip.pickup_address || trip.pickup || "N/A"}
Drop-off: ${trip.dropoff_address || trip.dropoff || "N/A"}

Date: ${trip.ride_date || trip.date || "N/A"}
Time: ${trip.ride_time || trip.time || "N/A"}
Invoice: ${trip.invoice_no || "N/A"}

Trips: ${profile?.total_trips || "0"}
Rating: ${profile?.rating || "5.0"}

Student Verified: ${profile?.student_status || trip.student_verified ? "Yes" : "No"}
Luggage Count: ${trip.luggage_count || "0"}

Preferences:
Preferred Route: ${profile?.preferred_route || "N/A"}
Luggage Preference: ${profile?.luggage_preference || "N/A"}
Music: ${profile?.music_preference || "N/A"}
AC: ${profile?.ac_preference || "N/A"}
Conversation: ${profile?.conversation_preference || "N/A"}

Emergency Contact: ${
      profile?.emergency_name && profile?.emergency_phone ? "Added" : "Not Added"
    }

Notes:
${trip.notes || "No notes added."}`;

    const url = `https://wa.me/${DRIVER_WHATSAPP}?text=${encodeURIComponent(
      message
    )}`;

    Linking.openURL(url);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Passenger Card</Text>

      <Text style={styles.subtitle}>
        Driver-ready passenger details for confirmed rides.
      </Text>

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator color="#D4AF37" size="large" />
          <Text style={styles.text}>Loading passenger card...</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Confirmed Ride</Text>
          <Text style={styles.text}>
            Passenger Card will appear when a ride is Confirmed or In Progress.
          </Text>
        </View>
      ) : (
        trips.map((trip) => (
          <View key={String(trip.id)} style={styles.card}>
            <Text style={styles.cardTitle}>Passenger Card</Text>

            <Row label="Passenger" value={trip.passenger_name || trip.name || "N/A"} />
            <Row label="Phone" value={profile?.phone || trip.phone || "N/A"} />
            <Row label="Pickup" value={trip.pickup_address || trip.pickup || "N/A"} />
            <Row label="Drop-off" value={trip.dropoff_address || trip.dropoff || "N/A"} />
            <Row label="Trips" value={String(profile?.total_trips || 0)} />
            <Row label="Rating" value={String(profile?.rating || "5.0")} />
            <Row label="Luggage" value={String(trip.luggage_count || 0)} />
            <Row
              label="Emergency Contact"
              value={profile?.emergency_name && profile?.emergency_phone ? "Added" : "Not Added"}
            />
            <Row label="Music" value={profile?.music_preference || "N/A"} />
            <Row label="AC" value={profile?.ac_preference || "N/A"} />
            <Row label="Conversation" value={profile?.conversation_preference || "N/A"} />
            <Row label="Notes" value={trip.notes || "No notes added"} />

            <TouchableOpacity style={styles.button} onPress={() => sendToDriver(trip)}>
              <Text style={styles.buttonText}>Send Card to Driver</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
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
  container: { flex: 1, backgroundColor: "#040C18" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 50 },
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
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
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
    marginTop: 18,
  },
  buttonText: {
    color: "#071426",
    fontSize: 17,
    fontWeight: "900",
  },
});