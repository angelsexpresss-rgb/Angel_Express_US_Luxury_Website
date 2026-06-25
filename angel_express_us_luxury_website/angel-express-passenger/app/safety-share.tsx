import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function SafetyShareScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadSafetyShareData();
    }, [])
  );

  async function loadSafetyShareData() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const userEmail = user.email?.trim().toLowerCase();

      const { data: profile, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("emergency_name, emergency_phone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setContactName(profile?.emergency_name || "");
      setContactPhone(profile?.emergency_phone || "");

      const { data: trips, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .ilike("status", "In Progress")
        .order("created_at", { ascending: false });

      if (tripsError) throw tripsError;

      setActiveTrips(trips || []);
    } catch (error: any) {
      Alert.alert(
        "Safety Share Error",
        error.message || "Could not load active trips."
      );
    } finally {
      setLoading(false);
    }
  }

  async function enableSafetyShare(trip: any) {
    if (!contactName || !contactPhone || !relationship) {
      Alert.alert(
        "Missing Information",
        "Emergency contact name, phone number, and relationship are required."
      );
      return;
    }

    try {
      setSaving(true);

      const trackingLink = `https://angelexpressus.com/live-trip/${
        trip.invoice_no || trip.id
      }`;

      const { error } = await supabase
        .from("bookings")
        .update({
          safety_share_enabled: true,
          emergency_contact_name: contactName.trim(),
          emergency_contact_phone: contactPhone.trim(),
          emergency_contact_relationship: relationship.trim(),
          live_tracking_link: trackingLink,
        })
        .eq("id", trip.id);

      if (error) throw error;

      const message = `Angel Safety Share: ${
        trip.passenger_name || trip.name || "Passenger"
      } has started an Angel Express trip.

Pickup: ${trip.pickup_address || trip.pickup}
Drop-off: ${trip.dropoff_address || trip.dropoff}
Invoice: ${trip.invoice_no || "N/A"}

Live tracking link:
${trackingLink}`;

      const whatsappUrl = `https://wa.me/${cleanPhone(
        contactPhone
      )}?text=${encodeURIComponent(message)}`;

      Alert.alert(
        "Safety Share Enabled",
        "Your emergency contact is ready. Send the trip link by WhatsApp.",
        [
          {
            text: "Send WhatsApp",
            onPress: () => Linking.openURL(whatsappUrl),
          },
          { text: "OK" },
        ]
      );

      setRelationship("");
      loadSafetyShareData();
    } catch (error: any) {
      Alert.alert(
        "Save Error",
        error.message || "Could not enable Safety Share."
      );
    } finally {
      setSaving(false);
    }
  }

  function cleanPhone(phone: string) {
    return phone.replace(/\D/g, "");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Angel Safety Share</Text>

      <Text style={styles.subtitle}>
        When your trip is In Progress, share your live trip link with your
        emergency contact.
      </Text>

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator color="#D4AF37" size="large" />
          <Text style={styles.loadingText}>Checking active trips...</Text>
        </View>
      ) : activeTrips.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Active Trip</Text>
          <Text style={styles.text}>
            Safety Share will appear here when your ride status becomes In
            Progress.
          </Text>
        </View>
      ) : (
        activeTrips.map((trip) => (
          <View key={String(trip.id)} style={styles.card}>
            <Text style={styles.cardTitle}>Share this trip?</Text>

            <Text style={styles.label}>Pickup</Text>
            <Text style={styles.value}>
              {trip.pickup_address || trip.pickup || "Pickup not available"}
            </Text>

            <Text style={styles.label}>Drop-off</Text>
            <Text style={styles.value}>
              {trip.dropoff_address || trip.dropoff || "Drop-off not available"}
            </Text>

            <Text style={styles.label}>Emergency Contact</Text>
            <Text style={styles.value}>
              {contactName || "No emergency contact saved in profile"}
            </Text>

            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>
              {contactPhone || "No emergency phone saved in profile"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Relationship e.g. Sister, Mother, Friend"
              placeholderTextColor="#8A93A3"
              value={relationship}
              onChangeText={setRelationship}
            />

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={() => enableSafetyShare(trip)}
              disabled={saving}
            >
              <Text style={styles.buttonText}>
                {saving ? "Saving..." : "Enable & Send WhatsApp"}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
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
    marginBottom: 14,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 14,
    textAlign: "center",
  },
  label: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 4,
  },
  value: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#040C18",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.16)",
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#071426",
    fontSize: 17,
    fontWeight: "900",
  },
});