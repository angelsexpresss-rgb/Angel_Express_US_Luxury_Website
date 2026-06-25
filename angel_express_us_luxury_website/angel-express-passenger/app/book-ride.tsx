import DateTimePicker from "@react-native-community/datetimepicker";
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

export default function BookRideScreen() {
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");

  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropoffLat, setDropoffLat] = useState<number | null>(null);
  const [dropoffLng, setDropoffLng] = useState<number | null>(null);

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

  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");

  async function searchAddress(text: string, type: "pickup" | "dropoff") {
    if (type === "pickup") {
      setPickupAddress(text);
      setPickupLat(null);
      setPickupLng(null);
    } else {
      setDropoffAddress(text);
      setDropoffLat(null);
      setDropoffLng(null);
    }

    if (text.length < 4) {
      type === "pickup" ? setPickupSuggestions([]) : setDropoffSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`
      );

      const data = await response.json();

      const suggestions =
        data.features?.map((item: any) => {
          const props = item.properties;
          const address = [
            props.name,
            props.street,
            props.city,
            props.state,
            props.country,
          ]
            .filter(Boolean)
            .join(", ");

          return {
            label: address,
            longitude: item.geometry.coordinates[0],
            latitude: item.geometry.coordinates[1],
          };
        }) || [];

      if (type === "pickup") {
        setPickupSuggestions(suggestions);
      } else {
        setDropoffSuggestions(suggestions);
      }
    } catch {
      type === "pickup" ? setPickupSuggestions([]) : setDropoffSuggestions([]);
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

  function continueToFareEstimate() {
    if (!pickupAddress || !dropoffAddress) {
      Alert.alert(
        "Missing Information",
        "Please enter pickup and drop-off addresses."
      );
      return;
    }

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      Alert.alert(
        "Select Address Suggestions",
        "Please select pickup and drop-off addresses from the suggestions so GPS coordinates can be saved for chauffeur navigation."
      );
      return;
    }

    router.push({
      pathname: "/fare-estimate" as any,
      params: {
        pickupAddress: pickupAddress.trim(),
        dropoffAddress: dropoffAddress.trim(),

        pickupLat: pickupLat.toString(),
        pickupLng: pickupLng.toString(),
        dropoffLat: dropoffLat.toString(),
        dropoffLng: dropoffLng.toString(),

        rideDate: formatDate(rideDate),
        rideTime: formatTime(rideTime),
        tripType,
        rideCategory,
        passengers,
        luggageCount,
        notes: notes.trim(),
        promoCode: promoCode.trim(),
      },
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Book a Ride</Text>

      <Text style={styles.subtitle}>
        Enter your trip details. Your fare estimate will be calculated next.
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
            setPickupAddress(item.label);
            setPickupLat(item.latitude);
            setPickupLng(item.longitude);
            setPickupSuggestions([]);
          }}
        >
          <Text style={styles.suggestionText}>{item.label}</Text>
        </TouchableOpacity>
      ))}

      {pickupLat && pickupLng && (
        <Text style={styles.gpsText}>Pickup GPS saved ✓</Text>
      )}

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
            setDropoffAddress(item.label);
            setDropoffLat(item.latitude);
            setDropoffLng(item.longitude);
            setDropoffSuggestions([]);
          }}
        >
          <Text style={styles.suggestionText}>{item.label}</Text>
        </TouchableOpacity>
      ))}

      {dropoffLat && dropoffLng && (
        <Text style={styles.gpsText}>Drop-off GPS saved ✓</Text>
      )}

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

      <TouchableOpacity style={styles.button} onPress={continueToFareEstimate}>
        <Text style={styles.buttonText}>Continue to Fare Estimate</Text>
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
  gpsText: {
    color: "#22c55e",
    fontSize: 13,
    fontWeight: "800",
    marginTop: -6,
    marginBottom: 8,
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
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: "#071426",
    fontSize: 19,
    fontWeight: "900",
  },
});