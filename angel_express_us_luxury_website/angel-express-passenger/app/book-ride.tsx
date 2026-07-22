import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
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
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const REFERRAL_DISCOUNT = 10;

type AddressSuggestion = {
  label: string;
  longitude: number;
  latitude: number;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function normalizeStateCode(value?: string) {
  const state = (value || "").trim();

  const stateMap: Record<string, string> = {
    texas: "TX",
    oklahoma: "OK",
  };

  return stateMap[state.toLowerCase()] || state.toUpperCase() || "TX";
}

function detectAirportDetails(pickup: string, dropoff: string) {
  const pickupText = pickup.toLowerCase();
  const dropoffText = dropoff.toLowerCase();

  const detectCode = (value: string) => {
    if (
      value.includes("dfw") ||
      value.includes("dallas fort worth international")
    ) {
      return "DFW";
    }

    if (
      value.includes("love field") ||
      value.includes("dallas love field") ||
      value.includes(" dal airport")
    ) {
      return "DAL";
    }

    return "";
  };

  const pickupCode = detectCode(pickupText);
  const dropoffCode = detectCode(dropoffText);

  if (pickupCode) {
    return { airportCode: pickupCode, airportAction: "pickup" };
  }

  if (dropoffCode) {
    return { airportCode: dropoffCode, airportAction: "dropoff" };
  }

  return { airportCode: "", airportAction: "" };
}

export default function BookRideScreen() {
  const params = useLocalSearchParams<{
    ride_category?: string;
    student_mode?: string;
    shared_ride?: string;
    create_student_pool?: string;
    pickup?: string;
    seats_requested?: string;
    passenger_type?: string;
    student_pool_id?: string;
  }>();

  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor =
    themeMode === "dark"
      ? "rgba(255,255,255,0.45)"
      : "rgba(7,20,38,0.45)";

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");

  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropoffLat, setDropoffLat] = useState<number | null>(null);
  const [dropoffLng, setDropoffLng] = useState<number | null>(null);

  const [pickupCity, setPickupCity] = useState("");
  const [pickupState, setPickupState] = useState("TX");
  const [pickupPostalCode, setPickupPostalCode] = useState("");

  const [dropoffCity, setDropoffCity] = useState("");
  const [dropoffState, setDropoffState] = useState("TX");
  const [dropoffPostalCode, setDropoffPostalCode] = useState("");

  const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<AddressSuggestion[]>([]);

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
  const [studentPoolMode, setStudentPoolMode] = useState<
    "none" | "create" | "join"
  >("none");
  const [expectedPoolSize, setExpectedPoolSize] = useState("3");
  const [studentPoolId, setStudentPoolId] = useState("");

  const [referralCode, setReferralCode] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralChecking, setReferralChecking] = useState(false);
  const [referrerUserId, setReferrerUserId] = useState("");
  const [referralMessage, setReferralMessage] = useState("");
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [passengerProfile, setPassengerProfile] = useState<Record<string, any> | null>(null);
  const [flightNumber, setFlightNumber] = useState("");
  const [airportTerminal, setAirportTerminal] = useState("");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const pickupSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropoffSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickupAbortRef = useRef<AbortController | null>(null);
  const dropoffAbortRef = useRef<AbortController | null>(null);
  const pickupRequestRef = useRef(0);
  const dropoffRequestRef = useRef(0);
  const submitLockRef = useRef(false);

  useEffect(() => {
    const backgroundAnimation = Animated.loop(
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
    );

    const entranceAnimation = Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    });

    backgroundAnimation.start();
    entranceAnimation.start();
    void loadPassengerProfile();

    return () => {
      backgroundAnimation.stop();
      entranceAnimation.stop();

      if (pickupSearchTimerRef.current) {
        clearTimeout(pickupSearchTimerRef.current);
      }

      if (dropoffSearchTimerRef.current) {
        clearTimeout(dropoffSearchTimerRef.current);
      }

      pickupAbortRef.current?.abort();
      dropoffAbortRef.current?.abort();
    };
  }, []);


  useEffect(() => {
    const requestedCategory = String(params.ride_category || "")
      .trim()
      .toLowerCase();

    const requestedStudentMode =
      String(params.student_mode || "").toLowerCase() === "true";

    const requestedSharedRide =
      String(params.shared_ride || "").toLowerCase() === "true";

    const requestedPoolCreation =
      String(params.create_student_pool || "").toLowerCase() === "true";

    const requestedPoolId = String(params.student_pool_id || "").trim();

    if (params.pickup && !pickupAddress) {
      setPickupAddress(String(params.pickup));
    }

    if (params.seats_requested) {
      const requestedSeats = Number.parseInt(
        String(params.seats_requested),
        10
      );

      if (
        Number.isInteger(requestedSeats) &&
        requestedSeats >= 1 &&
        requestedSeats <= 4
      ) {
        setPassengers(String(requestedSeats));
      }
    }

    if (
      requestedCategory === "student_pool" ||
      requestedSharedRide ||
      requestedPoolCreation ||
      requestedPoolId
    ) {
      setRideCategory("Student Pool Ride");
      setStudentSharedRide(true);
      setStudentPoolMode(requestedPoolId ? "join" : "create");
      setStudentPoolId(requestedPoolId);
      return;
    }

    if (
      requestedCategory === "student" ||
      requestedCategory === "student_private" ||
      requestedStudentMode
    ) {
      setRideCategory("Standard Ride");
      setStudentSharedRide(false);
      setStudentPoolMode("none");
    }
  }, [
    params.ride_category,
    params.student_mode,
    params.shared_ride,
    params.create_student_pool,
    params.pickup,
    params.seats_requested,
    params.student_pool_id,
  ]);

  async function loadPassengerProfile() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const [passengerResult, profileResult] = await Promise.all([
        supabase
          .from("passengers")
          .select(
            "id,first_name,last_name,email,phone,student_verified"
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("passenger_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (passengerResult.error) {
        throw passengerResult.error;
      }

      if (profileResult.error) {
        console.log(
          "Optional passenger profile load skipped:",
          profileResult.error.message
        );
      }

      const passenger = (passengerResult.data || {}) as Record<string, any>;
      const profile = (profileResult.data || {}) as Record<string, any>;

      const mergedProfile = {
        ...profile,
        ...passenger,
        user_id: user.id,
        email: passenger.email || profile.email || user.email || "",
      };

      setPassengerProfile(mergedProfile);

      const verificationStatus = String(
        profile.student_verification_status ||
          profile.verification_status ||
          ""
      )
        .trim()
        .toLowerCase();

      const approvedStudent = Boolean(
        passenger.student_verified ||
          profile.student_verified ||
          profile.student_discount_eligible ||
          ["approved", "verified", "active"].includes(verificationStatus)
      );

      setStudentVerified(approvedStudent);
      setStudentDiscountEligible(approvedStudent);
      setStudentStatus(
        profile.student_verification_status ||
          (approvedStudent ? "Verified" : "Not Submitted")
      );
      setStudentCampus(
        profile.student_campus ||
          profile.student_university ||
          profile.school_name ||
          ""
      );
    } catch (error: any) {
      console.log("Passenger profile load skipped:", error?.message);
    }
  }

  function searchAddress(text: string, type: "pickup" | "dropoff") {
    const trimmedText = text.trimStart();

    if (type === "pickup") {
      setPickupAddress(trimmedText);
      setPickupLat(null);
      setPickupLng(null);
      setPickupCity("");
      setPickupState("TX");
      setPickupPostalCode("");
      setPickupSuggestions([]);

      if (pickupSearchTimerRef.current) {
        clearTimeout(pickupSearchTimerRef.current);
      }

      pickupAbortRef.current?.abort();
    } else {
      setDropoffAddress(trimmedText);
      setDropoffLat(null);
      setDropoffLng(null);
      setDropoffCity("");
      setDropoffState("TX");
      setDropoffPostalCode("");
      setDropoffSuggestions([]);

      if (dropoffSearchTimerRef.current) {
        clearTimeout(dropoffSearchTimerRef.current);
      }

      dropoffAbortRef.current?.abort();
    }

    if (trimmedText.trim().length < 4) {
      return;
    }

    const timer = setTimeout(async () => {
      const requestId =
        type === "pickup"
          ? ++pickupRequestRef.current
          : ++dropoffRequestRef.current;

      const controller = new AbortController();

      if (type === "pickup") {
        pickupAbortRef.current = controller;
      } else {
        dropoffAbortRef.current = controller;
      }

      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(
            `${trimmedText}, Texas, USA`
          )}&limit=6&lang=en`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Address search is temporarily unavailable.");
        }

        const data = await response.json();

        const suggestions: AddressSuggestion[] = (data.features || [])
          .map((item: any) => {
            const props = item.properties || {};
            const coordinates = item.geometry?.coordinates || [];

            const label = [
              props.name,
              props.housenumber && props.street
                ? `${props.housenumber} ${props.street}`
                : props.street,
              props.city || props.town || props.village,
              props.state,
              props.postcode,
              props.country,
            ]
              .filter(Boolean)
              .join(", ");

            return {
              label,
              longitude: Number(coordinates[0]),
              latitude: Number(coordinates[1]),
              city:
                props.city ||
                props.town ||
                props.village ||
                props.county ||
                "",
              state: normalizeStateCode(props.state),
              postalCode: props.postcode || "",
              country: props.country || "",
            };
          })
          .filter(
            (item: AddressSuggestion) =>
              item.label &&
              Number.isFinite(item.latitude) &&
              Number.isFinite(item.longitude)
          );

        const isLatest =
          type === "pickup"
            ? requestId === pickupRequestRef.current
            : requestId === dropoffRequestRef.current;

        if (!isLatest) return;

        if (type === "pickup") {
          setPickupSuggestions(suggestions);
        } else {
          setDropoffSuggestions(suggestions);
        }
      } catch (error: any) {
        if (error?.name === "AbortError") return;

        console.log("Address search error:", error?.message);

        if (type === "pickup") {
          setPickupSuggestions([]);
        } else {
          setDropoffSuggestions([]);
        }
      }
    }, 450);

    if (type === "pickup") {
      pickupSearchTimerRef.current = timer;
    } else {
      dropoffSearchTimerRef.current = timer;
    }
  }

  function formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function buildScheduledAt() {
    const scheduledAt = new Date(rideDate);
    scheduledAt.setHours(rideTime.getHours(), rideTime.getMinutes(), 0, 0);
    return scheduledAt;
  }

  function getNormalizedRideCategory(activeCategory: string) {
    if (activeCategory === "Student Pool Ride") return "student_pool";
    if (activeCategory === "Airport Transfer") return "airport";
    if (activeCategory === "Tourist/Event Ride") return "tourist_event";

    if (studentVerified && studentDiscountEligible) {
      return "student_private";
    }

    return "private";
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

      const { data: previousUse, error: previousUseError } = await supabase
        .from("bookings")
        .select("id")
        .or(
          `user_id.eq.${user.id},passenger_user_id.eq.${user.id},email.ilike.${userEmail}`
        )
        .eq("referral_applied", true)
        .limit(1);

      if (previousUseError) {
        console.log(
          "Referral usage lookup skipped:",
          previousUseError.message
        );
      }

      if (!previousUseError && previousUse && previousUse.length > 0) {
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
    if (category === "Student Pool Ride") {
      if (!studentVerified) {
        setStudentSharedRide(false);
        setStudentPoolMode("none");
        Alert.alert(
          "Student Verification Required",
          "Student Pool Ride is available after your student status is approved by Angel Express."
        );
        return;
      }

      setRideCategory(category);
      setStudentSharedRide(true);
      setStudentPoolMode(studentPoolId ? "join" : "create");
      return;
    }

    setRideCategory(category);
    setStudentSharedRide(false);
    setStudentPoolMode("none");
    setStudentPoolId("");
  }

  async function continueToFareEstimate() {
    if (creatingDraft || submitLockRef.current) return;

    if (!pickupAddress || !dropoffAddress) {
      Alert.alert("Missing Information", "Please enter pickup and drop-off addresses.");
      return;
    }

    if (
      pickupLat === null ||
      pickupLng === null ||
      dropoffLat === null ||
      dropoffLng === null
    ) {
      Alert.alert(
        "Select Address Suggestions",
        "Please select pickup and drop-off addresses from the suggestions so GPS coordinates can be saved for chauffeur navigation."
      );
      return;
    }

    const passengerCount = Number.parseInt(passengers, 10);
    const luggageTotal = Number.parseInt(luggageCount, 10);

    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 4) {
      Alert.alert("Passenger Limit", "Please enter between 1 and 4 passengers.");
      return;
    }

    if (!Number.isInteger(luggageTotal) || luggageTotal < 0) {
      Alert.alert("Luggage Count", "Please enter a valid luggage count.");
      return;
    }

    const poolSize = Number.parseInt(expectedPoolSize, 10);

    if (
      studentSharedRide &&
      (!Number.isInteger(poolSize) || poolSize < 2 || poolSize > 4)
    ) {
      Alert.alert(
        "Pool Size",
        "Choose a Student Pool size between 2 and 4 seats."
      );
      return;
    }

    if (studentSharedRide && !studentVerified) {
      Alert.alert(
        "Student Verification Required",
        "Please complete and get approved for Student Verification before booking a Student Pool Ride."
      );
      return;
    }

    const scheduledAt = buildScheduledAt();

    if (scheduledAt.getTime() < Date.now() - 10 * 60 * 1000) {
      Alert.alert(
        "Invalid Ride Time",
        "Please select a ride date and time that is not in the past."
      );
      return;
    }

    const activeRideCategory = studentSharedRide
      ? "Student Pool Ride"
      : rideCategory;

    const normalizedRideCategory = getNormalizedRideCategory(activeRideCategory);
    const normalizedTripType = tripType === "Round Trip" ? "round_trip" : "one_way";
    const { airportCode, airportAction } = detectAirportDetails(
      pickupAddress,
      dropoffAddress
    );

    if (activeRideCategory === "Airport Transfer" && !airportCode) {
      Alert.alert(
        "Select a Supported Airport",
        "For airport pricing, select DFW Airport or Dallas Love Field in either the pickup or drop-off address."
      );
      return;
    }

    try {
      submitLockRef.current = true;
      setCreatingDraft(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        throw new Error("Please sign in again before booking your ride.");
      }

      const passengerFirstName =
        passengerProfile?.first_name ||
        user.user_metadata?.first_name ||
        "";

      const passengerLastName =
        passengerProfile?.last_name ||
        user.user_metadata?.last_name ||
        "";

      const passengerName = [passengerFirstName, passengerLastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      const payload = {
        source_platform: "passenger_app",
        user_id: user.id,
        passenger_user_id: user.id,
        passenger_id: user.id,
        passenger_name: passengerName || "Passenger",
        first_name: passengerFirstName || null,
        last_name: passengerLastName || null,
        email:
          passengerProfile?.email ||
          user.email ||
          null,
        phone:
          passengerProfile?.phone ||
          user.user_metadata?.phone ||
          null,

        pickup_address: pickupAddress.trim(),
        pickup_city: pickupCity.trim(),
        pickup_state: pickupState || "TX",
        pickup_postal_code: pickupPostalCode.trim(),
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,

        dropoff_address: dropoffAddress.trim(),
        dropoff_city: dropoffCity.trim(),
        dropoff_state: dropoffState || "TX",
        dropoff_postal_code: dropoffPostalCode.trim(),
        dropoff_latitude: dropoffLat,
        dropoff_longitude: dropoffLng,

        scheduled_at: scheduledAt.toISOString(),

        trip_type: normalizedTripType,
        ride_category: normalizedRideCategory,
        ride_category_label: activeRideCategory,

        passenger_count: passengerCount,
        luggage_count: luggageTotal,
        notes: notes.trim(),

        airport_code: airportCode || null,
        airport_action: airportAction || null,
        flight_number:
          activeRideCategory === "Airport Transfer"
            ? flightNumber.trim() || null
            : null,
        airport_terminal:
          activeRideCategory === "Airport Transfer"
            ? airportTerminal.trim() || null
            : null,

        student_verified: studentVerified,
        student_discount_eligible: studentDiscountEligible,
        student_campus: studentCampus.trim(),

        student_pool_requested:
          normalizedRideCategory === "student_pool",

        shared_ride:
          normalizedRideCategory === "student_pool",

        student_pool_mode:
          normalizedRideCategory === "student_pool"
            ? studentPoolMode || "create"
            : null,

        create_student_pool:
          normalizedRideCategory === "student_pool" &&
          studentPoolMode !== "join",

        student_pool_id:
          normalizedRideCategory === "student_pool" &&
          studentPoolId
            ? studentPoolId
            : null,

        seats_requested:
          normalizedRideCategory === "student_pool"
            ? passengerCount
            : 1,

        expected_pool_size:
          normalizedRideCategory === "student_pool"
            ? poolSize
            : null,

        student_pool_route:
          normalizedRideCategory === "student_pool"
            ? `${pickupAddress.trim()} → ${dropoffAddress.trim()}`
            : null,

        pool_member_status:
          normalizedRideCategory === "student_pool"
            ? "pending"
            : null,

        referral_code: referralApplied
          ? referralCode.trim().toUpperCase()
          : null,

        referrer_user_id: referralApplied ? referrerUserId : null,
        referral_applied: referralApplied,

        promotion_code: referralApplied
          ? referralCode.trim().toUpperCase()
          : null,

        metadata: {
          legacy_trip_type_label: tripType,
          legacy_ride_category_label: activeRideCategory,
          referral_discount_preview: referralApplied ? REFERRAL_DISCOUNT : 0,
          client_request_id: `${user.id}-${Date.now()}`,
          local_timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone || null,
          student_pool_entry_point:
            normalizedRideCategory === "student_pool"
              ? "passenger_app_book_ride"
              : null,
          student_pool_requested_from_mode:
            normalizedRideCategory === "student_pool"
              ? studentPoolMode
              : null,
        },
      };

      const { data, error } = await supabase.rpc("create_booking_draft_v2", {
        p_request: payload,
      });

      if (error) throw error;

      const draftId = data?.draft_id;
      const accessToken = data?.access_token;

      if (!draftId) {
        throw new Error("The booking draft was created without a draft ID.");
      }

      router.push({
        pathname: "/fare-estimate" as any,
        params: {
          draftId: String(draftId),
          accessToken: accessToken ? String(accessToken) : "",
        },
      });
    } catch (error: any) {
      console.error("Create booking draft error:", error);

      Alert.alert(
        "Could Not Start Booking",
        error?.message ||
          "Angel Express could not save your ride details. Please try again."
      );
    } finally {
      submitLockRef.current = false;
      setCreatingDraft(false);
    }
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
                <Route size={30} color={colors.onGold || colors.navy} />
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
                placeholderTextColor={placeholderColor}
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
                    setPickupCity(item.city);
                    setPickupState(item.state || "TX");
                    setPickupPostalCode(item.postalCode);
                    setPickupSuggestions([]);
                  }}
                >
                  <Text style={styles.suggestionText}>{item.label}</Text>
                </TouchableOpacity>
              ))}

              {pickupLat !== null && pickupLng !== null ? (
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
                placeholderTextColor={placeholderColor}
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
                    setDropoffCity(item.city);
                    setDropoffState(item.state || "TX");
                    setDropoffPostalCode(item.postalCode);
                    setDropoffSuggestions([]);
                  }}
                >
                  <Text style={styles.suggestionText}>{item.label}</Text>
                </TouchableOpacity>
              ))}

              {dropoffLat !== null && dropoffLng !== null ? (
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
                "Student Pool Ride",
                "Tourist/Event Ride",
              ].map((item) => (
                <OptionButton
                  key={item}
                  full
                  title={item}
                  active={
                    rideCategory === item ||
                    (item === "Student Pool Ride" && studentSharedRide)
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
                      Verified student-private pricing is active. Student Pool Ride can also be selected.
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
                      Student discount and Student Pool Ride unlock after owner approval.
                    </Text>
                  </View>
                </View>
              )}

              {studentSharedRide ? (
                <View style={styles.sharedRideBox}>
                  <Users size={20} color="#22c55e" />
                  <View style={styles.studentBoxText}>
                    <Text style={styles.studentTitle}>Student Pool Ride Enabled</Text>
                    <Text style={styles.studentText}>
                      This request will use the same Student Pool system as the website, Driver App, and Owner App. Operations will review and publish a new pool before other students can join.
                    </Text>
                  </View>
                </View>
              ) : null}

              {studentSharedRide ? (
                <View style={styles.poolSetupBox}>
                  <Text style={styles.poolSetupTitle}>
                    {studentPoolMode === "join"
                      ? "Joining Existing Student Pool"
                      : "Create New Student Pool"}
                  </Text>

                  <Text style={styles.poolSetupText}>
                    {studentPoolMode === "join"
                      ? "Your booking will reserve seats in the selected pool."
                      : "Choose the total pool capacity. Angel Express Operations can adjust the final capacity before publishing."}
                  </Text>

                  {studentPoolMode !== "join" ? (
                    <View style={styles.optionRow}>
                      {["2", "3", "4"].map((size) => (
                        <OptionButton
                          key={size}
                          title={`${size} Seats`}
                          active={expectedPoolSize === size}
                          onPress={() => setExpectedPoolSize(size)}
                          styles={styles}
                        />
                      ))}
                    </View>
                  ) : null}

                  <Text style={styles.poolSetupFootnote}>
                    Your passenger count is the number of seats you are reserving.
                    Pool capacity is the total number of passenger seats available
                    across the shared ride.
                  </Text>
                </View>
              ) : null}

              {rideCategory === "Airport Transfer" ? (
                <>
                  <Section
                    title="Airport Details"
                    icon={<ShieldCheck size={19} color={colors.gold} />}
                    styles={styles}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Flight number (optional)"
                    placeholderTextColor={placeholderColor}
                    value={flightNumber}
                    onChangeText={setFlightNumber}
                    autoCapitalize="characters"
                    maxLength={20}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Terminal or airline (optional)"
                    placeholderTextColor={placeholderColor}
                    value={airportTerminal}
                    onChangeText={setAirportTerminal}
                    maxLength={80}
                  />
                </>
              ) : null}

              <Section
                title="Passengers & Luggage"
                icon={<Users size={19} color={colors.gold} />}
                styles={styles}
              />

              <TextInput
                style={styles.input}
                placeholder="Number of Passengers"
                placeholderTextColor={placeholderColor}
                value={passengers}
                onChangeText={setPassengers}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Luggage Count"
                placeholderTextColor={placeholderColor}
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
                placeholderTextColor={placeholderColor}
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
                placeholderTextColor={placeholderColor}
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
                style={[
                  styles.submitButton,
                  creatingDraft && styles.submitButtonDisabled,
                ]}
                onPress={continueToFareEstimate}
                activeOpacity={0.88}
                disabled={creatingDraft}
              >
                {creatingDraft ? (
                  <View style={styles.submitLoadingRow}>
                    <ActivityIndicator color={colors.onGold || colors.navy} />
                    <Text style={styles.submitButtonText}>
                      Saving Ride Details
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>
                    Continue to Fare Estimate
                  </Text>
                )}
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
      color: c.text2 || c.textSecondary,
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
      color: c.onGold || c.navy,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.onGold || c.navy,
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
      borderColor: c.borderSoft || c.lightBorder,
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
      borderColor: c.borderSoft || c.lightBorder,
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
      borderColor: c.borderSoft || c.lightBorder,
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
      borderColor: c.borderSoft || c.lightBorder,
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
      color: c.onGold || c.navy,
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
      color: c.text2 || c.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },
    poolSetupBox: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
    },
    poolSetupTitle: {
      color: c.gold,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 6,
    },
    poolSetupText: {
      color: c.text2 || c.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
      marginBottom: 12,
    },
    poolSetupFootnote: {
      color: c.text2 || c.textSecondary,
      fontSize: 11.5,
      lineHeight: 17,
      fontWeight: "700",
      marginTop: 2,
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
    submitButtonDisabled: {
      opacity: 0.72,
    },
    submitLoadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    submitButtonText: {
      color: c.onGold || c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
    },
  });
}