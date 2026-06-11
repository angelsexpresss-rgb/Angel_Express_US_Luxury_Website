import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzfjXYUphz8-nyETcdMYOpHCPoBY33V17OkAZMODpBRVT2V6m8H9DTG5iBM63QqbHtR/exec";

export default function BookRideScreen() {
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");

  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);

  const [rideDate, setRideDate] = useState(new Date());
  const [rideTime, setRideTime] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [tripType, setTripType] = useState("One Way");
  const [rideCategory, setRideCategory] = useState("Standard Ride");

  const [passengers, setPassengers] = useState("1");
  const [luggageCount, setLuggageCount] = useState("0");
  const [estimatedMiles, setEstimatedMiles] = useState("0");

  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");

  const [loading, setLoading] = useState(false);

  const miles = Number(estimatedMiles) || 0;
  const baseFare = tripType === "Round Trip" ? miles * 2 : miles;
  const studentDiscount =
    rideCategory === "Student Group Ride" ? baseFare * 0.2 : 0;
  const totalFare = baseFare - studentDiscount;

  async function searchAddress(text: string, type: "pickup" | "dropoff") {
    if (type === "pickup") {
      setPickupAddress(text);
    } else {
      setDropoffAddress(text);
    }

    if (text.length < 4) {
      if (type === "pickup") setPickupSuggestions([]);
      if (type === "dropoff") setDropoffSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          text
        )}&limit=5&countrycodes=us`
      );

      const data = await response.json();

      if (type === "pickup") {
        setPickupSuggestions(data);
      } else {
        setDropoffSuggestions(data);
      }
    } catch {
  if (type === "pickup") setPickupSuggestions([]);
  if (type === "dropoff") setDropoffSuggestions([]);
}
  }

  function formatDate(date: Date) {
    return date.toISOString().split("T")[0];
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function createInvoicePdf(invoiceNo: string, bookingData: any) {
    const html = `
      <html>
        <body style="font-family: Arial; padding: 30px; color: #222;">
          <div style="background:#0B2A4A;color:white;padding:25px;text-align:center;border-radius:12px;">
            <h1>ANGEL EXPRESS</h1>
            <p>COMFORT. RELIABILITY. SECURITY. CLEANLINESS.</p>
          </div>

          <h2>Invoice: ${invoiceNo}</h2>

          <p><b>Passenger:</b> ${bookingData.passenger_name}</p>
          <p><b>Email:</b> ${bookingData.email}</p>
          <p><b>Phone:</b> ${bookingData.phone}</p>

          <hr />

          <p><b>Pickup:</b> ${bookingData.pickup_address}</p>
          <p><b>Drop-off:</b> ${bookingData.dropoff_address}</p>
          <p><b>Date:</b> ${bookingData.ride_date}</p>
          <p><b>Time:</b> ${bookingData.ride_time}</p>
          <p><b>Trip Type:</b> ${bookingData.trip_type}</p>
          <p><b>Ride Category:</b> ${bookingData.ride_category}</p>
          <p><b>Passengers:</b> ${bookingData.passengers}</p>
          <p><b>Luggage Count:</b> ${bookingData.luggage_count}</p>

          <hr />

          <p><b>Estimated Distance:</b> ${bookingData.estimated_miles} miles</p>
          <p><b>Rate:</b> $1 per mile</p>
          <p><b>Base Fare:</b> $${bookingData.base_fare.toFixed(2)}</p>
          <p><b>Student Discount:</b> $${bookingData.student_discount.toFixed(2)}</p>
          <h2>Total Fare: $${bookingData.total_fare.toFixed(2)}</h2>

          <p>Please use invoice number <b>${invoiceNo}</b> as payment reference.</p>
        </body>
      </html>
    `;

    const file = await Print.printToFileAsync({ html });

  const base64 = await FileSystem.readAsStringAsync(file.uri, {
  encoding: "base64",
});
    return base64;
  }

  async function handleBooking() {
    if (loading) return;

    if (!pickupAddress || !dropoffAddress) {
      Alert.alert(
        "Missing Information",
        "Please enter pickup and drop-off addresses."
      );
      return;
    }

    if (miles <= 0) {
      Alert.alert(
        "Estimated Miles Required",
        "Please enter the estimated miles for this trip."
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

      const invoiceNo = `AE-${Date.now()}`;

      const bookingData = {
        user_id: user.id,
        passenger_name: passengerName || user.email || "",
        email: passenger?.email || user.email || "",
        phone: passenger?.phone || "",

        pickup_address: pickupAddress.trim(),
        dropoff_address: dropoffAddress.trim(),

        ride_date: formatDate(rideDate),
        ride_time: formatTime(rideTime),

        trip_type: tripType,
        ride_category: rideCategory,

        passengers: Number(passengers) || 1,
        luggage_count: Number(luggageCount) || 0,

        notes: notes.trim(),
        promo_code: promoCode.trim(),

        source: "app",
        status: "Pending",

        estimated_miles: miles,
        base_fare: baseFare,
        student_discount: studentDiscount,
        round_trip_adjustment: tripType === "Round Trip" ? miles : 0,
        total_fare: totalFare,
        balance_due: totalFare,
        invoice_no: invoiceNo,
      };

      const { error } = await supabase.from("bookings").insert(bookingData);

      if (error) throw error;

      const invoicePdf = await createInvoicePdf(invoiceNo, bookingData);

      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          invoice_no: invoiceNo,
          name: bookingData.passenger_name,
          email: bookingData.email,
          phone: bookingData.phone,
          pickup: bookingData.pickup_address,
          dropoff: bookingData.dropoff_address,
          date: bookingData.ride_date,
          time: bookingData.ride_time,
          trip_type: bookingData.trip_type,
          ride_category: bookingData.ride_category,
          passengers: bookingData.passengers,
          luggage_count: bookingData.luggage_count,
          notes: bookingData.notes,
          promo_code: bookingData.promo_code,
          miles: bookingData.estimated_miles,
          base: bookingData.base_fare,
          discount: bookingData.student_discount,
          total: bookingData.total_fare,
          amount_paid: 0,
          balance_due: bookingData.balance_due,
          invoice_pdf: invoicePdf,
        }),
      });

      Alert.alert(
        "Booking Submitted",
        "Your ride has been submitted and confirmation email sent.",
        [
          {
            text: "View My Trips",
            onPress: () => router.replace("/my-trips" as any),
          },
        ]
      );

      setPickupAddress("");
      setDropoffAddress("");
      setPickupSuggestions([]);
      setDropoffSuggestions([]);
      setRideDate(new Date());
      setRideTime(new Date());
      setTripType("One Way");
      setRideCategory("Standard Ride");
      setPassengers("1");
      setLuggageCount("0");
      setEstimatedMiles("0");
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
        Request a premium Angel Express ride with fare estimate and confirmation email.
      </Text>

      <Section title="Pickup Address" />

      <TextInput
        style={styles.input}
        placeholder="Start typing pickup address"
        placeholderTextColor="#8A93A3"
        value={pickupAddress}
        onChangeText={(text) => searchAddress(text, "pickup")}
      />

      {pickupSuggestions.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.suggestion}
          onPress={() => {
            setPickupAddress(item.display_name);
            setPickupSuggestions([]);
          }}
        >
          <Text style={styles.suggestionText}>{item.display_name}</Text>
        </TouchableOpacity>
      ))}

      <Section title="Drop-off Address" />

      <TextInput
        style={styles.input}
        placeholder="Start typing drop-off address"
        placeholderTextColor="#8A93A3"
        value={dropoffAddress}
        onChangeText={(text) => searchAddress(text, "dropoff")}
      />

      {dropoffSuggestions.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.suggestion}
          onPress={() => {
            setDropoffAddress(item.display_name);
            setDropoffSuggestions([]);
          }}
        >
          <Text style={styles.suggestionText}>{item.display_name}</Text>
        </TouchableOpacity>
      ))}

      <Section title="Date & Time" />

      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.inputText}>Date: {formatDate(rideDate)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowTimePicker(true)}
      >
        <Text style={styles.inputText}>Time: {formatTime(rideTime)}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={rideDate}
          mode="date"
          onChange={(_, selectedDate) => {
            setShowDatePicker(Platform.OS === "ios");
            if (selectedDate) setRideDate(selectedDate);
          }}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={rideTime}
          mode="time"
          onChange={(_, selectedTime) => {
            setShowTimePicker(Platform.OS === "ios");
            if (selectedTime) setRideTime(selectedTime);
          }}
        />
      )}

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

      {[
        "Standard Ride",
        "Airport Transfer",
        "Student Group Ride",
        "Tourist/Event Ride",
      ].map((item) => (
        <OptionButton
          key={item}
          full
          title={item}
          active={rideCategory === item}
          onPress={() => setRideCategory(item)}
        />
      ))}

      <Section title="Fare Estimate" />

      <TextInput
        style={styles.input}
        placeholder="Estimated Miles e.g. 195"
        placeholderTextColor="#8A93A3"
        value={estimatedMiles}
        onChangeText={setEstimatedMiles}
        keyboardType="numeric"
      />

      <View style={styles.fareCard}>
        <Text style={styles.fareTitle}>Fare Estimate</Text>
        <Text style={styles.fareText}>Miles: {miles}</Text>
        <Text style={styles.fareText}>Rate: $1 per mile</Text>
        <Text style={styles.fareText}>Base Fare: ${baseFare.toFixed(2)}</Text>
        <Text style={styles.fareText}>
          Student Discount: -${studentDiscount.toFixed(2)}
        </Text>
        <Text style={styles.fareTotal}>Total: ${totalFare.toFixed(2)}</Text>
      </View>

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
          {loading ? "Submitting..." : "Submit Ride Request"}
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
    borderColor: "rgba(212,175,55,0.16)",
  },

  inputText: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  suggestion: {
    backgroundColor: "#101F33",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.14)",
  },

  suggestionText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },

  optionRow: {
    flexDirection: "row",
    gap: 12,
  },

  optionButton: {
    backgroundColor: "#071426",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
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
    fontWeight: "800",
  },

  optionTextActive: {
    color: "#071426",
  },

  notesInput: {
    height: 100,
    textAlignVertical: "top",
  },

  fareCard: {
    backgroundColor: "rgba(212,175,55,0.1)",
    borderColor: "rgba(212,175,55,0.25)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
    marginBottom: 10,
  },

  fareTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },

  fareText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 6,
  },

  fareTotal: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
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