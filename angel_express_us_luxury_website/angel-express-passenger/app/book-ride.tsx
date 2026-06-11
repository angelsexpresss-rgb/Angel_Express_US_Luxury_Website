import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function BookRideScreen() {
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [rideDate, setRideDate] = useState("");
  const [rideTime, setRideTime] = useState("");
  const [tripType, setTripType] = useState("One Way");
  const [rideCategory, setRideCategory] = useState("Standard Ride");
  const [passengers, setPassengers] = useState("1");
  const [luggageCount, setLuggageCount] = useState("0");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleBooking() {
    if (loading) return;

    if (!pickupAddress || !dropoffAddress || !rideDate || !rideTime) {
      Alert.alert(
        "Missing Information",
        "Please complete pickup, drop-off, date, and time."
      );
      return;
    }

    try {
      setLoading(true);

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

      const { data: passenger, error: passengerError } = await supabase
        .from("passengers")
        .select("first_name,last_name,email,phone")
        .eq("id", user.id)
        .maybeSingle();

      if (passengerError) throw passengerError;

      const passengerName = `${passenger?.first_name || ""} ${
        passenger?.last_name || ""
      }`.trim();

      const { error } = await supabase.from("bookings").insert({
        user_id: user.id,

        passenger_name: passengerName || user.email,
        email: passenger?.email || user.email,
        phone: passenger?.phone || "",

        pickup_address: pickupAddress.trim(),
        dropoff_address: dropoffAddress.trim(),

        ride_date: rideDate.trim(),
        ride_time: rideTime.trim(),

        trip_type: tripType,
        ride_category: rideCategory,

        passengers: Number(passengers) || 1,
        luggage_count: Number(luggageCount) || 0,

        notes: notes.trim(),
        promo_code: promoCode.trim(),

        source: "app",
        status: "Pending",
      });

      if (error) throw error;

      Alert.alert(
        "Booking Submitted",
        "Your ride request has been submitted. Angel Express will review and confirm your trip.",
        [
          {
            text: "View My Trips",
            onPress: () => router.replace("/my-trips" as any),
          },
        ]
      );

      setPickupAddress("");
      setDropoffAddress("");
      setRideDate("");
      setRideTime("");
      setTripType("One Way");
      setRideCategory("Standard Ride");
      setPassengers("1");
      setLuggageCount("0");
      setNotes("");
      setPromoCode("");
    } catch (error: any) {
      Alert.alert("Booking Error", error.message || "Could not submit booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Book a Ride</Text>

      <Text style={styles.subtitle}>
        Request a premium Angel Express trip across Texas and beyond.
      </Text>

      <Section title="Trip Details" />

      <TextInput
        style={styles.input}
        placeholder="Pickup Address"
        placeholderTextColor="#8A93A3"
        value={pickupAddress}
        onChangeText={setPickupAddress}
      />

      <TextInput
        style={styles.input}
        placeholder="Drop-off Address"
        placeholderTextColor="#8A93A3"
        value={dropoffAddress}
        onChangeText={setDropoffAddress}
      />

      <TextInput
        style={styles.input}
        placeholder="Date e.g. 06/20/2026"
        placeholderTextColor="#8A93A3"
        value={rideDate}
        onChangeText={setRideDate}
      />

      <TextInput
        style={styles.input}
        placeholder="Time e.g. 9:30 AM"
        placeholderTextColor="#8A93A3"
        value={rideTime}
        onChangeText={setRideTime}
      />

      <Section title="Trip Type" />

      <View style={styles.optionRow}>
        <OptionButton
          title="One Way"
          active={tripType === "One Way"}
          onPress={() => setTripType("One Way")}
        />

        <OptionButton
          title="Round Trip"
          active={tripType === "Round Trip"}
          onPress={() => setTripType("Round Trip")}
        />
      </View>

      <Section title="Ride Category" />

      <OptionButton
        full
        title="Standard Ride"
        active={rideCategory === "Standard Ride"}
        onPress={() => setRideCategory("Standard Ride")}
      />

      <OptionButton
        full
        title="Airport Transfer"
        active={rideCategory === "Airport Transfer"}
        onPress={() => setRideCategory("Airport Transfer")}
      />

      <OptionButton
        full
        title="Student Group Ride"
        active={rideCategory === "Student Group Ride"}
        onPress={() => setRideCategory("Student Group Ride")}
      />

      <OptionButton
        full
        title="Tourist/Event Ride"
        active={rideCategory === "Tourist/Event Ride"}
        onPress={() => setRideCategory("Tourist/Event Ride")}
      />

      <Section title="Passengers & Luggage" />

      <TextInput
        style={styles.input}
        placeholder="Number of Passengers"
        placeholderTextColor="#8A93A3"
        value={passengers}
        onChangeText={setPassengers}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Luggage Count"
        placeholderTextColor="#8A93A3"
        value={luggageCount}
        onChangeText={setLuggageCount}
        keyboardType="numeric"
      />

      <Section title="Extra Details" />

      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Notes e.g. flight number, pickup instructions, luggage details"
        placeholderTextColor="#8A93A3"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <TextInput
        style={styles.input}
        placeholder="Promo / Referral Code"
        placeholderTextColor="#8A93A3"
        value={promoCode}
        onChangeText={setPromoCode}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleBooking}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Submitting Ride..." : "Submit Ride Request"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function OptionButton({
  title,
  active,
  onPress,
  full,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
  full?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        full ? styles.fullOption : styles.halfOption,
        active && styles.optionButtonActive,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, active && styles.optionTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
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

  sectionTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 14,
  },

  input: {
    backgroundColor: "#071426",
    color: "#FFFFFF",
    padding: 17,
    borderRadius: 14,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.16)",
  },

  notesInput: {
    height: 120,
    textAlignVertical: "top",
  },

  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  optionButton: {
    backgroundColor: "#071426",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.18)",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: "center",
  },

  halfOption: {
    flex: 1,
  },

  fullOption: {
    width: "100%",
  },

  optionButtonActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },

  optionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  optionTextActive: {
    color: "#071426",
  },

  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 24,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#071426",
    fontSize: 19,
    fontWeight: "900",
  },
});