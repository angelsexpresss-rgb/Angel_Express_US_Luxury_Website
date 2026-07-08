import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import {
  ArrowLeft,
  BadgeCheck,
  Gift,
  GraduationCap,
  MapPinned,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

const REFERRAL_DISCOUNT = 10;

export default function BookRideScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const [studentVerified, setStudentVerified] = useState(false);
  const [studentStatus, setStudentStatus] = useState("Not Submitted");
  const [studentDiscountEligible, setStudentDiscountEligible] = useState(false);
  const [studentCampus, setStudentCampus] = useState("");
  const [studentSharedRide, setStudentSharedRide] = useState(false);

  const [referralCode, setReferralCode] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralChecking, setReferralChecking] = useState(false);
  const [referrerUserId, setReferrerUserId] = useState("");
  const [referralMessage, setReferralMessage] = useState("");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.04,
          duration: 8500,
          useNativeDriver: true,
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 8500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    loadPassengerProfile();
  }, []);

  async function loadPassengerProfile() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const { data, error } = await supabase
        .from("passenger_profiles")
        .select(
          "student_verified,student_verification_status,student_discount_eligible,student_university,student_campus"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return;

      const approvedStudent = Boolean(
        data.student_verified || data.student_discount_eligible
      );

      setStudentVerified(approvedStudent);
      setStudentDiscountEligible(approvedStudent);
      setStudentStatus(data.student_verification_status || "Not Submitted");
      setStudentCampus(data.student_campus || data.student_university || "");
    } catch (error: any) {
      console.log("Student profile load skipped:", error?.message);
    }
  }

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
      if (!user) throw new Error("Please sign in again.");

      const { data: referrer, error } = await supabase
        .from("passenger_profiles")
        .select("user_id, first_name, last_name, email, referral_code")
        .ilike("referral_code", cleanCode)
        .maybeSingle();

      if (error) throw error;

      if (!referrer) {
        setReferralMessage("Referral code not found.");
        Alert.alert("Invalid Code", "This referral code was not found.");
        return;
      }

      if (referrer.user_id === user.id) {
        setReferralMessage("You cannot use your own referral code.");
        Alert.alert("Invalid Code", "You cannot use your own referral code.");
        return;
      }

      const userEmail = user.email?.trim().toLowerCase() || "";

      const { data: previousUse } = await supabase
        .from("bookings")
        .select("id")
        .ilike("email", userEmail)
        .eq("referral_applied", true)
        .limit(1);

      if (previousUse && previousUse.length > 0) {
        setReferralMessage("Referral already used by this account.");
        Alert.alert(
          "Referral Already Used",
          "This account has already used a referral discount."
        );
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

  function selectRideCategory(category: string) {
    setRideCategory(category);

    if (category === "Student Shared Ride") {
      if (!studentVerified) {
        setStudentSharedRide(false);
        Alert.alert(
          "Student Verification Required",
          "Student Shared Ride is available after your student status is approved by Angel Express."
        );
        return;
      }

      setStudentSharedRide(true);
    } else {
      setStudentSharedRide(false);
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

    if (studentSharedRide && !studentVerified) {
      Alert.alert(
        "Student Verification Required",
        "Please complete and get approved for Student Verification before booking a Student Shared Ride."
      );
      return;
    }

    const activeRideCategory = studentSharedRide
      ? "Student Shared Ride"
      : rideCategory;

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
        rideCategory: activeRideCategory,

        passengers,
        luggageCount,
        notes: notes.trim(),

        referralCode: referralApplied ? referralCode.trim().toUpperCase() : "",
        referrerUserId: referralApplied ? referrerUserId : "",
        referralDiscount: referralApplied ? String(REFERRAL_DISCOUNT) : "0",
        referralApplied: referralApplied ? "true" : "false",
        promoCode: referralApplied ? referralCode.trim().toUpperCase() : "",

        studentVerified: studentVerified ? "true" : "false",
        student_verified: studentVerified ? "true" : "false",
        studentDiscountEligible: studentDiscountEligible ? "true" : "false",
        student_discount_eligible: studentDiscountEligible ? "true" : "false",
        studentCampus,
        student_campus: studentCampus,

        studentSharedRide: studentSharedRide ? "true" : "false",
        student_shared_ride: studentSharedRide ? "true" : "false",
        studentPoolRoute: `${pickupAddress.trim()} → ${dropoffAddress.trim()}`,
        student_pool_route: `${pickupAddress.trim()} → ${dropoffAddress.trim()}`,
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
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>A  RIDE BOOKING</Text>
            </View>

            <Text style={styles.title}>Book a Ride</Text>

            <Text style={styles.subtitle}>
              Enter your trip details. Student discounts, shared rides, and referral rewards will be applied on the fare estimate.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Route size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Plan Your Trip</Text>
                <Text style={styles.heroText}>
                  GPS pickup, referral rewards, student travel mode, and fare estimate in one flow.
                </Text>
              </View>
            </View>

            <View style={styles.statusGrid}>
              <StatusPill
                title="Student"
                value={studentVerified ? "Verified" : studentStatus || "Not Submitted"}
                styles={styles}
              />
              <StatusPill
                title="Referral"
                value={referralApplied ? "Applied" : "Optional"}
                styles={styles}
              />
              <StatusPill
                title="Shared Ride"
                value={studentSharedRide ? "On" : "Off"}
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <Section
                title="Pickup Address"
                icon={<MapPinned size={19} color={colors.gold} />}
                styles={styles}
              />

              <TextInput
                style={styles.input}
                placeholder="Start typing pickup address"
                placeholderTextColor={colors.placeholder}
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

              {pickupLat && pickupLng ? (
                <Text style={styles.gpsText}>✓ Pickup GPS saved</Text>
              ) : null}

              <Section
                title="Drop-off Address"
                icon={<MapPinned size={19} color={colors.gold} />}
                styles={styles}
              />

              <TextInput
                style={styles.input}
                placeholder="Start typing drop-off address"
                placeholderTextColor={colors.placeholder}
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

              {dropoffLat && dropoffLng ? (
                <Text style={styles.gpsText}>✓ Drop-off GPS saved</Text>
              ) : null}

              <Section
                title="Date & Time"
                icon={<ShieldCheck size={19} color={colors.gold} />}
                styles={styles}
              />

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

              <Section
                title="Trip Type"
                icon={<Route size={19} color={colors.gold} />}
                styles={styles}
              />

              <View style={styles.optionRow}>
                <OptionButton
                  title="One Way"
                  active={tripType === "One Way"}
                  onPress={() => setTripType("One Way")}
                  styles={styles}
                />

                <OptionButton
                  title="Round Trip"
                  active={tripType === "Round Trip"}
                  onPress={() => setTripType("Round Trip")}
                  styles={styles}
                />
              </View>

              <Section
                title="Ride Category"
                icon={<CarIcon color={colors.gold} />}
                styles={styles}
              />

              {[
                "Standard Ride",
                "Airport Transfer",
                "Student Shared Ride",
                "Tourist/Event Ride",
              ].map((item) => (
                <OptionButton
                  key={item}
                  full
                  title={item}
                  active={
                    rideCategory === item ||
                    (item === "Student Shared Ride" && studentSharedRide)
                  }
                  onPress={() => selectRideCategory(item)}
                  styles={styles}
                />
              ))}

              {studentVerified ? (
                <View style={styles.studentBox}>
                  <GraduationCap size={20} color="#22c55e" />
                  <View style={styles.studentBoxText}>
                    <Text style={styles.studentTitle}>Student Travel Mode Active</Text>
                    <Text style={styles.studentText}>
                      20% verified student discount is eligible. Student Shared Ride can be selected.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.pendingStudentBox}>
                  <GraduationCap size={20} color={colors.gold} />
                  <View style={styles.studentBoxText}>
                    <Text style={styles.pendingStudentTitle}>
                      Student Verification: {studentStatus || "Not Submitted"}
                    </Text>
                    <Text style={styles.studentText}>
                      Student discount and Student Shared Ride unlock after owner approval.
                    </Text>
                  </View>
                </View>
              )}

              {studentSharedRide ? (
                <View style={styles.sharedRideBox}>
                  <Users size={20} color="#22c55e" />
                  <View style={styles.studentBoxText}>
                    <Text style={styles.studentTitle}>Student Shared Ride Enabled</Text>
                    <Text style={styles.studentText}>
                      Your booking will be saved as a student pool request for matching route/date.
                    </Text>
                  </View>
                </View>
              ) : null}

              <Section
                title="Passengers & Luggage"
                icon={<Users size={19} color={colors.gold} />}
                styles={styles}
              />

              <TextInput
                style={styles.input}
                placeholder="Number of Passengers"
                placeholderTextColor={colors.placeholder}
                value={passengers}
                onChangeText={setPassengers}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Luggage Count"
                placeholderTextColor={colors.placeholder}
                value={luggageCount}
                onChangeText={setLuggageCount}
                keyboardType="numeric"
              />

              <Section
                title="Extra Details"
                icon={<ShieldCheck size={19} color={colors.gold} />}
                styles={styles}
              />

              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Notes e.g. flight number, pickup instructions, luggage details"
                placeholderTextColor={colors.placeholder}
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <Section
                title="Referral Code"
                icon={<Gift size={19} color={colors.gold} />}
                styles={styles}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter referral code"
                placeholderTextColor={colors.placeholder}
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
                {referralChecking ? (
                  <ActivityIndicator color={colors.gold} />
                ) : (
                  <Text style={styles.referralButtonText}>Apply Referral Code</Text>
                )}
              </TouchableOpacity>

              {referralApplied ? (
                <View style={styles.referralAppliedBox}>
                  <BadgeCheck size={18} color="#22c55e" />
                  <Text style={styles.referralAppliedText}>
                    $10 referral discount will be passed to your fare estimate.
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={continueToFareEstimate}
                activeOpacity={0.88}
              >
                <Text style={styles.submitButtonText}>
                  Continue to Fare Estimate
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Section({
  title,
  icon,
  styles,
}: {
  title: string;
  icon?: React.ReactNode;
  styles: any;
}) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function CarIcon({ color }: { color: string }) {
  return <Route size={19} color={color} />;
}

function StatusPill({
  title,
  value,
  styles,
}: {
  title: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusTitle}>{title}</Text>
    </View>
  );
}

function OptionButton({
  title,
  active,
  onPress,
  full,
  styles,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
  full?: boolean;
  styles: any;
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

function createStyles(c: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
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
      backgroundColor: c.overlay,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 22,
      paddingTop: 58,
      paddingBottom: 54,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },
    themePill: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    kicker: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 14,
      marginBottom: 18,
    },
    kickerText: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.3,
    },
    title: {
      color: c.text,
      fontSize: 38,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },
    heroCard: {
      minHeight: 126,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      color: c.navy,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.navy,
      fontSize: 14.5,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },
    statusGrid: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 18,
    },
    statusPill: {
      flex: 1,
      minHeight: 76,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      padding: 9,
      ...v5Shadow(c),
    },
    statusValue: {
      color: c.gold,
      fontSize: 11.5,
      fontWeight: "900",
      textAlign: "center",
    },
    statusTitle: {
      color: c.text,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 5,
      textAlign: "center",
    },
    card: {
      padding: 22,
      backgroundColor: c.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.borderSoft,
      ...v5Shadow(c),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginTop: 20,
      marginBottom: 14,
    },
    sectionTitle: {
      color: c.gold,
      fontSize: 19,
      fontWeight: "900",
    },
    input: {
      backgroundColor: c.input,
      color: c.inputText,
      padding: 17,
      borderRadius: 16,
      fontSize: 16,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: c.borderSoft,
      fontWeight: "700",
    },
    inputText: {
      color: c.inputText,
      fontSize: 16,
      fontWeight: "700",
    },
    gpsText: {
      color: "#22c55e",
      fontSize: 13,
      fontWeight: "900",
      marginTop: -6,
      marginBottom: 8,
    },
    suggestion: {
      backgroundColor: c.card2,
      padding: 13,
      borderRadius: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    suggestionText: {
      color: c.text,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "700",
    },
    optionRow: {
      flexDirection: "row",
      gap: 12,
    },
    optionButton: {
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft,
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
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    optionText: {
      color: c.text,
      fontWeight: "900",
      textAlign: "center",
    },
    optionTextActive: {
      color: c.navy,
    },
    studentBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: "rgba(34,197,94,0.10)",
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.35)",
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    pendingStudentBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    sharedRideBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: "rgba(34,197,94,0.10)",
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.35)",
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    studentBoxText: {
      flex: 1,
    },
    studentTitle: {
      color: "#22c55e",
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 5,
    },
    pendingStudentTitle: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 5,
    },
    studentText: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
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
      borderColor: c.border,
      backgroundColor: c.soft,
      borderRadius: 15,
      paddingVertical: 15,
      alignItems: "center",
      marginBottom: 14,
    },
    referralButtonDisabled: {
      opacity: 0.65,
    },
    referralButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    referralAppliedBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
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
      flex: 1,
    },
    submitButton: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 24,
      ...v5Shadow(c),
    },
    submitButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
    },
  });
}