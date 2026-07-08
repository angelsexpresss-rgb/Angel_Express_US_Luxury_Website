import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  getDropoffValue,
  getPassengerNameValue,
  getPickupValue,
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

export default function RatePassengerScreen() {
  const { bookingId } = useLocalSearchParams();
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  function getPassengerUserId() {
    return (
      booking?.user_id ||
      booking?.passenger_id ||
      booking?.passenger_user_id ||
      booking?.customer_id ||
      null
    );
  }

  function getPassengerEmail() {
    return (
      booking?.email ||
      booking?.passenger_email ||
      booking?.customer_email ||
      null
    );
  }

  function getPassengerName() {
    return (
      booking?.name ||
      booking?.passenger_name ||
      booking?.customer_name ||
      booking?.full_name ||
      getPassengerNameValue(booking) ||
      "Passenger"
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
              activeOpacity={0.8}
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

      if (!bookingId) {
        Alert.alert("Missing Trip", "Booking ID was not found.");
        return;
      }

      const passengerUserId = getPassengerUserId();
      const passengerEmail = getPassengerEmail();
      const passengerName = getPassengerName();

      const cleanNotes = notes.trim();
      const overall = averageRating();

      const { error: ratingError } = await supabase
        .from("passenger_ratings")
        .insert({
          booking_id: Number(bookingId),

          passenger_user_id: passengerUserId,
          passenger_email: passengerEmail,
          passenger_name: passengerName,

          driver_id: user.id,

          respectful,
          on_time: onTime,
          cleanliness,
          communication,
          overall_rating: overall,

          notes: cleanNotes,
          is_visible_to_passenger: true,
        });

      if (ratingError) throw ratingError;

      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          status: "completed",
          passenger_rating_by_driver: overall,
          passenger_rating_note_by_driver: cleanNotes,
          passenger_rating_completed_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (bookingError) throw bookingError;

      Alert.alert(
        "Feedback Submitted",
        "Passenger rating and note have been saved and will appear in the passenger app."
      );

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
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading trip...</Text>
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backPill}
              onPress={() => router.replace("/driver-dashboard")}
              activeOpacity={0.85}
            >
              <Text style={styles.backPillText}>← Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.themePill}
              onPress={toggleTheme}
              activeOpacity={0.85}
            >
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.kicker}>ANGEL EXPRESS DRIVER APP</Text>
          <Text style={styles.title}>Rate Passenger</Text>

          <Text style={styles.subtitle}>
            Help Angel Express maintain a safe, respectful, and reliable travel
            community.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Passenger</Text>

            <Text style={styles.passengerName}>
              {getPassengerNameValue(booking)}
            </Text>

            <Text style={styles.tripText}>
              {getPickupValue(booking)} → {getDropoffValue(booking)}
            </Text>
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Live Passenger Feedback</Text>
            <Text style={styles.noticeText}>
              Your rating and note will update the passenger app rating summary
              and passenger rating history.
            </Text>
          </View>

          <RatingRow
            label="Respectful"
            value={respectful}
            setValue={setRespectful}
          />

          <RatingRow label="On Time" value={onTime} setValue={setOnTime} />

          <RatingRow
            label="Cleanliness"
            value={cleanliness}
            setValue={setCleanliness}
          />

          <RatingRow
            label="Communication"
            value={communication}
            setValue={setCommunication}
          />

          <View style={styles.averageCard}>
            <Text style={styles.averageLabel}>Overall Rating</Text>
            <Text style={styles.averageValue}>{averageRating()} / 5</Text>
          </View>

          <Text style={styles.notesLabel}>Driver Feedback Note</Text>

          <TextInput
            style={styles.notes}
            placeholder="Add a note about passenger behavior, readiness, communication, or concerns..."
            placeholderTextColor={colors.placeholder}
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={submitRating}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.navy} />
            ) : (
              <Text style={styles.submitButtonText}>
                Submit Passenger Rating
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/driver-dashboard")}
            activeOpacity={0.85}
          >
            <Text style={styles.backButtonText}>Skip for Now</Text>
          </TouchableOpacity>
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
    loading: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: colors.text2,
      marginTop: 12,
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
    backPill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backPillText: {
      color: colors.gold,
      fontSize: 14,
      fontWeight: "900",
    },
    themePill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    kicker: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
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
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 18,
      marginBottom: 14,
      ...v5Shadow(colors),
    },
    cardLabel: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 7,
    },
    passengerName: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 8,
    },
    tripText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },
    noticeCard: {
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.12)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 15,
      marginBottom: 16,
    },
    noticeTitle: {
      color: colors.gold,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 5,
    },
    noticeText: {
      color: colors.text2,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "700",
    },
    ratingRow: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
    },
    ratingLabel: {
      color: colors.gold,
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
      borderColor: colors.borderSoft,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card2,
    },
    ratingButtonActive: {
      backgroundColor: colors.gold,
      borderColor: colors.gold,
    },
    ratingButtonText: {
      color: colors.text,
      fontWeight: "900",
    },
    ratingButtonTextActive: {
      color: colors.navy,
    },
    averageCard: {
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.14)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.gold,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
    },
    averageLabel: {
      color: colors.text2,
      fontWeight: "800",
    },
    averageValue: {
      color: colors.gold,
      fontSize: 24,
      fontWeight: "900",
      marginTop: 6,
    },
    notesLabel: {
      color: colors.gold,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 8,
      letterSpacing: 0.8,
    },
    notes: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      color: colors.inputText,
      borderRadius: 18,
      padding: 15,
      height: 120,
      textAlignVertical: "top",
      marginBottom: 16,
      fontWeight: "700",
      lineHeight: 20,
    },
    submitButton: {
      backgroundColor: colors.gold,
      paddingVertical: 17,
      borderRadius: 16,
      marginBottom: 14,
    },
    submitButtonText: {
      color: colors.navy,
      textAlign: "center",
      fontWeight: "900",
      fontSize: 16,
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.7,
    },
    backButton: {
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: colors.card,
    },
    backButtonText: {
      color: colors.text,
      textAlign: "center",
      fontWeight: "800",
    },
  });
}