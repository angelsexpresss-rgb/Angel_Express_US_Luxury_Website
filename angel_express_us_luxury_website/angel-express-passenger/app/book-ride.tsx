import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const REFERRAL_DISCOUNT = 10;

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

  const [referralCode, setReferralCode] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralChecking, setReferralChecking] = useState(false);
  const [referrerUserId, setReferrerUserId] = useState("");
  const [referralMessage, setReferralMessage] = useState("");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

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

      if (type === "pickup") setPickupSuggestions(suggestions);
      else setDropoffSuggestions(suggestions);
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

  function resetReferral() {
    setReferralApplied(false);
    setReferrerUserId("");
    setReferralMessage("");
  }

  async function applyReferralCode() {
    const cleanCode = referralCode.trim().toUpperCase();

    if (!cleanCode) {
      Alert.alert("Referral Code", "Please enter a referral code first.");
      return;
    }

    try {
      setReferralChecking(true);
      resetReferral();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const { data: referrer, error } = await supabase
        .from("passenger_profiles")
        .select("user_id, first_name, last_name, email, referral_code")
        .eq("referral_code", cleanCode)
        .maybeSingle();

      if (error) throw error;

      if (!referrer) {
        setReferralMessage("Referral code not found.");
        Alert.alert("Invalid Code", "This referral code was not found.");
        return;
      }

      if (user?.id && referrer.user_id === user.id) {
        setReferralMessage("You cannot use your own referral code.");
        Alert.alert("Invalid Code", "You cannot use your own referral code.");
        return;
      }

      setReferralApplied(true);
      setReferrerUserId(referrer.user_id);
      setReferralCode(cleanCode);
      setReferralMessage(`Referral applied: $${REFERRAL_DISCOUNT} off this ride.`);

      Alert.alert(
        "Referral Applied",
        `$${REFERRAL_DISCOUNT} referral discount will be applied to your fare estimate.`
      );
    } catch (error: any) {
      Alert.alert("Referral Error", error.message || "Could not verify referral code.");
    } finally {
      setReferralChecking(false);
    }
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

        referralCode: referralApplied ? referralCode.trim().toUpperCase() : "",
        referrerUserId: referralApplied ? referrerUserId : "",
        referralDiscount: referralApplied ? String(REFERRAL_DISCOUNT) : "0",
        referralApplied: referralApplied ? "true" : "false",

        promoCode: referralApplied ? referralCode.trim().toUpperCase() : "",
      },
    });
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/dashboard-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.title}>Book a Ride</Text>

            <Text style={styles.subtitle}>
              Enter your trip details. Your fare estimate will be calculated next.
            </Text>

            <AngelCard style={styles.card}>
              <Section title="Pickup Address" />

              <TextInput
                style={styles.input}
                placeholder="Start typing pickup address"
                placeholderTextColor="rgba(255,255,255,0.45)"
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
                <Text style={styles.gpsText}>Pickup GPS saved</Text>
              )}

              <Section title="Drop-off Address" />

              <TextInput
                style={styles.input}
                placeholder="Start typing drop-off address"
                placeholderTextColor="rgba(255,255,255,0.45)"
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
                <Text style={styles.gpsText}>Drop-off GPS saved</Text>
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
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={passengers}
                onChangeText={setPassengers}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Luggage Count"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={luggageCount}
                onChangeText={setLuggageCount}
                keyboardType="numeric"
              />

              <Section title="Extra Details" />

              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Notes e.g. flight number, pickup instructions, luggage details"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <Section title="Referral Code" />

              <TextInput
                style={styles.input}
                placeholder="Enter referral code"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={referralCode}
                onChangeText={(text) => {
                  setReferralCode(text.toUpperCase());
                  resetReferral();
                }}
                autoCapitalize="characters"
              />

              {referralMessage ? (
                <Text
                  style={[
                    styles.referralText,
                    referralApplied ? styles.referralSuccess : styles.referralError,
                  ]}
                >
                  {referralMessage}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.referralButton,
                  referralChecking && styles.referralButtonDisabled,
                ]}
                onPress={applyReferralCode}
                disabled={referralChecking}
              >
                <Text style={styles.referralButtonText}>
                  {referralChecking ? "Checking Code..." : "Apply Referral Code"}
                </Text>
              </TouchableOpacity>

              {referralApplied ? (
                <View style={styles.referralAppliedBox}>
                  <Text style={styles.referralAppliedText}>
                    $10 referral discount will be passed to your fare estimate.
                  </Text>
                </View>
              ) : null}

              <AngelHeroButton
                title="Continue to Fare Estimate"
                onPress={continueToFareEstimate}
                variant="gold"
                style={styles.submitButton}
              />
            </AngelCard>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
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
      activeOpacity={0.85}
    >
      <Text style={[styles.optionText, active && styles.optionTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    overflow: "hidden",
  },
  bgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,11,22,0.91)",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 22,
    paddingTop: 56,
    paddingBottom: 50,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 18,
  },
  backText: {
    color: AE_COLORS.gold,
    fontSize: 18,
    fontWeight: "900",
  },
  title: {
    color: AE_COLORS.gold,
    fontSize: 38,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    color: AE_COLORS.textSoft,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  card: {
    padding: 22,
  },
  sectionTitle: {
    color: AE_COLORS.gold,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 14,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    color: AE_COLORS.white,
    padding: 17,
    borderRadius: 16,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  inputText: {
    color: AE_COLORS.white,
    fontSize: 16,
  },
  gpsText: {
    color: "#22c55e",
    fontSize: 13,
    fontWeight: "900",
    marginTop: -6,
    marginBottom: 8,
  },
  suggestion: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 13,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  suggestionText: {
    color: AE_COLORS.white,
    fontSize: 14,
    lineHeight: 20,
  },
  optionRow: {
    flexDirection: "row",
    gap: 12,
  },
  optionButton: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 16,
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
    backgroundColor: AE_COLORS.gold,
    borderColor: AE_COLORS.goldLight,
  },
  optionText: {
    color: AE_COLORS.white,
    fontWeight: "900",
    textAlign: "center",
  },
  optionTextActive: {
    color: AE_COLORS.navy2,
  },
  notesInput: {
    height: 105,
    textAlignVertical: "top",
  },
  referralText: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: -6,
    marginBottom: 10,
  },
  referralSuccess: {
    color: "#22c55e",
  },
  referralError: {
    color: "#FF6B6B",
  },
  referralButton: {
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    backgroundColor: "rgba(212,175,55,0.08)",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 14,
  },
  referralButtonDisabled: {
    opacity: 0.65,
  },
  referralButtonText: {
    color: AE_COLORS.gold,
    fontSize: 15,
    fontWeight: "900",
  },
  referralAppliedBox: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 14,
    padding: 13,
    marginBottom: 8,
  },
  referralAppliedText: {
    color: "#22c55e",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 19,
  },
  submitButton: {
    marginTop: 24,
  },
});