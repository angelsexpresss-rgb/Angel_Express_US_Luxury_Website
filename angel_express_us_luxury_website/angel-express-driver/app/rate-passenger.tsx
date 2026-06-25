import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function RatePassengerScreen() {
  const { bookingId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  const [respectful, setRespectful] = useState(5);
  const [onTime, setOnTime] = useState(5);
  const [cleanliness, setCleanliness] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadBooking();
  }, []);

  async function loadBooking() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error) throw error;

      setBooking(data);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load trip.");
    } finally {
      setLoading(false);
    }
  }

  function averageRating() {
    return Number(
      ((respectful + onTime + cleanliness + communication) / 4).toFixed(1)
    );
  }

  function RatingRow({
    label,
    value,
    setValue,
  }: {
    label: string;
    value: number;
    setValue: (value: number) => void;
  }) {
    return (
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{label}</Text>

        <View style={styles.ratingButtons}>
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.ratingButton,
                value === num && styles.ratingButtonActive,
              ]}
              onPress={() => setValue(num)}
            >
              <Text
                style={[
                  styles.ratingButtonText,
                  value === num && styles.ratingButtonTextActive,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  async function submitRating() {
    try {
      setSubmitting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/driver-login");
        return;
      }

      const { error } = await supabase.from("passenger_ratings").insert({
        booking_id: Number(bookingId),
        passenger_user_id: booking?.user_id || null,
        passenger_email: booking?.email || null,
        passenger_name: booking?.name || booking?.passenger_name || null,

        driver_id: user.id,

        respectful,
        on_time: onTime,
        cleanliness,
        communication,
        overall_rating: averageRating(),

        notes: notes.trim(),
      });

      if (error) throw error;

      await supabase
        .from("bookings")
        .update({
          status: "completed",
        })
        .eq("id", bookingId);

      Alert.alert("Feedback Submitted", "Passenger rating has been saved.");

      router.replace("/driver-dashboard");
    } catch (err: any) {
      Alert.alert("Submit Failed", err.message || "Unable to submit rating.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#d4af37" size="large" />
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
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Rate Passenger</Text>

          <Text style={styles.subtitle}>
            Help Angel Express maintain a safe and respectful travel community.
          </Text>

          <View style={styles.card}>
            <Text style={styles.passengerName}>
              {booking?.name || booking?.passenger_name || "Passenger"}
            </Text>

            <Text style={styles.tripText}>
              {booking?.pickup || booking?.pickup_address || "Pickup"} →{" "}
              {booking?.dropoff || booking?.dropoff_address || "Drop-off"}
            </Text>
          </View>

          <RatingRow label="Respectful" value={respectful} setValue={setRespectful} />
          <RatingRow label="On Time" value={onTime} setValue={setOnTime} />
          <RatingRow label="Cleanliness" value={cleanliness} setValue={setCleanliness} />
          <RatingRow label="Communication" value={communication} setValue={setCommunication} />

          <View style={styles.averageCard}>
            <Text style={styles.averageLabel}>Overall Rating</Text>
            <Text style={styles.averageValue}>{averageRating()} / 5</Text>
          </View>

          <TextInput
            style={styles.notes}
            placeholder="Notes to Angel Express owner..."
            placeholderTextColor="#94a3b8"
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={submitRating}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#07111f" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Passenger Rating</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/driver-dashboard")}
          >
            <Text style={styles.backButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)" },
  loading: {
    flex: 1,
    backgroundColor: "#07111f",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 65,
    paddingBottom: 45,
  },
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
  card: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  passengerName: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  tripText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
  },
  ratingRow: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  ratingLabel: {
    color: "#d4af37",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  ratingButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ratingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#64748b",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingButtonActive: {
    backgroundColor: "#d4af37",
    borderColor: "#d4af37",
  },
  ratingButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  ratingButtonTextActive: {
    color: "#07111f",
  },
  averageCard: {
    backgroundColor: "rgba(212,175,55,0.14)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  averageLabel: {
    color: "#e5e7eb",
    fontWeight: "800",
  },
  averageValue: {
    color: "#d4af37",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  notes: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#334155",
    color: "#ffffff",
    borderRadius: 16,
    padding: 15,
    height: 110,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#d4af37",
    paddingVertical: 17,
    borderRadius: 16,
    marginBottom: 14,
  },
  submitButtonText: {
    color: "#07111f",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 16,
    textTransform: "uppercase",
  },
  backButton: {
    borderWidth: 1,
    borderColor: "#64748b",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.75)",
  },
  backButtonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "800",
  },
});