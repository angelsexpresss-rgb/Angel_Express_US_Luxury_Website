import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  BadgeCheck,
  CarFront,
  Clock,
  CreditCard,
  GraduationCap,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

const REFERRAL_DISCOUNT_AMOUNT = 10;
const SHARED_RIDE_ESTIMATED_SAVINGS_RATE = 0.15;

function calculateTieredFare(distanceMiles: number) {
  if (distanceMiles <= 20) {
    return {
      pricingTier: "local",
      pricingTierLabel: "Local Trip",
      baseFareAmount: 15,
      mileageRate: 1.5,
    };
  }

  if (distanceMiles <= 100) {
    return {
      pricingTier: "medium",
      pricingTierLabel: "Medium Trip",
      baseFareAmount: 25,
      mileageRate: 1.25,
    };
  }

  return {
    pricingTier: "long_distance",
    pricingTierLabel: "Long Distance Trip",
    baseFareAmount: 35,
    mileageRate: 1.1,
  };
}

export default function FareEstimateScreen() {
  const params = useLocalSearchParams();

  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pickupAddress = String(params.pickupAddress || "");
  const dropoffAddress = String(params.dropoffAddress || "");

  const pickupLat = String(params.pickupLat || "");
  const pickupLng = String(params.pickupLng || "");
  const dropoffLat = String(params.dropoffLat || "");
  const dropoffLng = String(params.dropoffLng || "");

  const rideDate = String(params.rideDate || "");
  const rideTime = String(params.rideTime || "");
  const tripType = String(params.tripType || "One Way");
  const rideCategory = String(params.rideCategory || "Standard Ride");
  const passengers = String(params.passengers || "1");
  const luggageCount = String(params.luggageCount || "0");
  const notes = String(params.notes || "");

  const studentSharedRide =
    String(params.studentSharedRide || params.student_shared_ride || "false") ===
      "true" ||
    rideCategory.toLowerCase().includes("shared") ||
    rideCategory.toLowerCase().includes("pool");

  const studentCampus = String(params.studentCampus || params.student_campus || "");
  const studentPoolRoute = String(
    params.studentPoolRoute || params.student_pool_route || ""
  );

  const incomingReferralCode = String(
    params.referralCode || params.promoCode || ""
  )
    .trim()
    .toUpperCase();

  const incomingReferrerUserId = String(params.referrerUserId || "");
  const incomingReferralApplied =
    String(params.referralApplied || "false") === "true";

  const incomingStudentVerified =
    String(params.studentVerified || params.student_verified || "false") === "true";

  const incomingStudentEligible =
    String(
      params.studentDiscountEligible ||
        params.student_discount_eligible ||
        "false"
    ) === "true";

  const [loading, setLoading] = useState(true);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [durationText, setDurationText] = useState("");

  const [studentVerified, setStudentVerified] = useState(incomingStudentVerified);
  const [studentDiscountEligible, setStudentDiscountEligible] =
    useState(incomingStudentEligible);

  const [referralCode, setReferralCode] = useState(incomingReferralCode);
  const [referrerUserId, setReferrerUserId] = useState(incomingReferrerUserId);
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralMessage, setReferralMessage] = useState(
    incomingReferralCode ? "Checking referral..." : ""
  );

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

    loadEstimate();
  }, []);

  const tier = calculateTieredFare(distanceMiles);
  const mileageFare = distanceMiles * tier.mileageRate;
  const oneWayFare = tier.baseFareAmount + mileageFare;
  const roundTripAdjustment = tripType === "Round Trip" ? oneWayFare : 0;
  const subtotal = oneWayFare + roundTripAdjustment;

  const approvedStudent = studentVerified || studentDiscountEligible;

  const studentDiscount = approvedStudent ? subtotal * 0.2 : 0;

  const referralDiscount =
    referralApplied && referralCode
      ? Math.min(REFERRAL_DISCOUNT_AMOUNT, Math.max(subtotal - studentDiscount, 0))
      : 0;

  const beforeSharedRide = Math.max(subtotal - studentDiscount - referralDiscount, 0);

  const sharedRideEstimatedSavings =
    studentSharedRide && approvedStudent
      ? beforeSharedRide * SHARED_RIDE_ESTIMATED_SAVINGS_RATE
      : 0;

  const totalDiscount =
    studentDiscount + referralDiscount + sharedRideEstimatedSavings;

  const finalPrice = Math.max(subtotal - totalDiscount, 0);

  const driverPayout = finalPrice * 0.7;
  const companyShare = finalPrice * 0.3;

  async function loadEstimate() {
    try {
      setLoading(true);

      await calculateRoute();
      await loadStudentStatus();
      await validateReferralCode();
    } catch (error: any) {
      Alert.alert(
        "Fare Estimate Error",
        error.message || "Could not calculate fare estimate."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentStatus() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) return;

    const { data, error } = await supabase
      .from("passenger_profiles")
      .select("student_verified, student_discount_eligible")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    const verified = Boolean(data?.student_verified);
    const eligible = Boolean(data?.student_discount_eligible);

    setStudentVerified(verified || incomingStudentVerified);
    setStudentDiscountEligible(eligible || incomingStudentEligible);
  }

  async function validateReferralCode() {
    if (!incomingReferralCode) {
      setReferralApplied(false);
      setReferrerUserId("");
      setReferralMessage("");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      setReferralApplied(false);
      setReferrerUserId("");
      setReferralMessage("Please sign in to use a referral code.");
      return;
    }

    if (
      incomingReferralApplied &&
      incomingReferrerUserId &&
      incomingReferrerUserId !== user.id
    ) {
      setReferralApplied(true);
      setReferrerUserId(incomingReferrerUserId);
      setReferralMessage(`Referral applied: $${REFERRAL_DISCOUNT_AMOUNT} off`);
      return;
    }

    const { data: referrer, error } = await supabase
      .from("passenger_profiles")
      .select("user_id, email, referral_code")
      .ilike("referral_code", incomingReferralCode)
      .maybeSingle();

    if (error) throw error;

    if (!referrer?.user_id) {
      setReferralApplied(false);
      setReferrerUserId("");
      setReferralMessage("Invalid referral code");
      return;
    }

    if (referrer.user_id === user.id) {
      setReferralApplied(false);
      setReferrerUserId("");
      setReferralMessage("You cannot use your own referral code");
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
      setReferralApplied(false);
      setReferrerUserId("");
      setReferralMessage("Referral already used by this account");
      return;
    }

    setReferralCode(incomingReferralCode);
    setReferralApplied(true);
    setReferrerUserId(referrer.user_id);
    setReferralMessage(`Referral applied: $${REFERRAL_DISCOUNT_AMOUNT} off`);
  }

  async function getCoordinates(address: string) {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`
    );

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error(`Could not find location: ${address}`);
    }

    const [longitude, latitude] = data.features[0].geometry.coordinates;

    return { latitude, longitude };
  }

  async function calculateRoute() {
    let pickup;
    let dropoff;

    if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
      pickup = {
        latitude: Number(pickupLat),
        longitude: Number(pickupLng),
      };

      dropoff = {
        latitude: Number(dropoffLat),
        longitude: Number(dropoffLng),
      };
    } else {
      pickup = await getCoordinates(pickupAddress);
      dropoff = await getCoordinates(dropoffAddress);
    }

    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}?overview=false`;

    const response = await fetch(routeUrl);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error("Could not calculate route distance.");
    }

    const meters = data.routes[0].distance;
    const seconds = data.routes[0].duration;

    const miles = meters / 1609.344;
    const minutes = Math.round(seconds / 60);

    setDistanceMiles(Number(miles.toFixed(1)));

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    setDurationText(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
  }

  function confirmBooking() {
    router.push({
      pathname: "/confirm-booking" as any,
      params: {
        pickupAddress,
        dropoffAddress,

        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,

        rideDate,
        rideTime,
        tripType,
        rideCategory: studentSharedRide ? "Student Shared Ride" : rideCategory,
        passengers,
        luggageCount,
        notes,

        referralCode: referralApplied ? referralCode : "",
        referrerUserId: referralApplied ? referrerUserId : "",
        referralDiscount: referralApplied ? referralDiscount.toFixed(2) : "0",
        referralApplied: referralApplied ? "true" : "false",
        promoCode: referralApplied ? referralCode : "",

        studentVerified: approvedStudent ? "true" : "false",
        student_verified: approvedStudent ? "true" : "false",
        studentDiscountEligible: approvedStudent ? "true" : "false",
        student_discount_eligible: approvedStudent ? "true" : "false",

        studentSharedRide: studentSharedRide ? "true" : "false",
        student_shared_ride: studentSharedRide ? "true" : "false",
        studentCampus,
        student_campus: studentCampus,
        studentPoolRoute: studentPoolRoute || `${pickupAddress} → ${dropoffAddress}`,
        student_pool_route: studentPoolRoute || `${pickupAddress} → ${dropoffAddress}`,

        sharedRideDiscount: sharedRideEstimatedSavings.toFixed(2),
        shared_ride_discount: sharedRideEstimatedSavings.toFixed(2),

        distanceMiles: distanceMiles.toString(),
        durationText,

        pricingModel: "tiered",
        pricingTier: tier.pricingTier,
        pricingTierLabel: tier.pricingTierLabel,
        baseFareAmount: tier.baseFareAmount.toFixed(2),
        mileageRate: tier.mileageRate.toFixed(2),
        mileageFare: mileageFare.toFixed(2),

        baseFare: subtotal.toFixed(2),
        studentDiscount: studentDiscount.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        roundTripAdjustment: roundTripAdjustment.toFixed(2),
        finalPrice: finalPrice.toFixed(2),

        driverPayout: driverPayout.toFixed(2),
        companyShare: companyShare.toFixed(2),
      },
    });
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Calculating fare estimate...</Text>
      </View>
    );
  }

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
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backTopButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backTopText}>Back</Text>
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
              <Text style={styles.kickerText}>A  RIDE PRICE REVIEW</Text>
            </View>

            <Text style={styles.title}>Fare Estimate</Text>

            <Text style={styles.subtitle}>
              Review your distance, drive time, verified student discount, referral reward, shared ride estimate, and final fare.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CreditCard size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Estimated Fare</Text>
                <Text style={styles.heroPrice}>${finalPrice.toFixed(2)}</Text>
                <Text style={styles.heroText}>
                  {distanceMiles} miles • {durationText || "Drive time unavailable"}
                </Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <MiniStat
                icon={<Route size={18} color={colors.gold} />}
                title="Distance"
                value={`${distanceMiles} mi`}
                styles={styles}
              />
              <MiniStat
                icon={<Clock size={18} color={colors.gold} />}
                title="Drive Time"
                value={durationText || "N/A"}
                styles={styles}
              />
              <MiniStat
                icon={<CarFront size={18} color={colors.gold} />}
                title="Trip Type"
                value={tripType}
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPinned size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Trip Route</Text>
              </View>

              <Info label="Pickup" value={pickupAddress} styles={styles} />
              <Info label="Drop-off" value={dropoffAddress} styles={styles} />
              <Info label="Date & Time" value={`${rideDate} at ${rideTime}`} styles={styles} />
              <Info
                label="Ride Category"
                value={studentSharedRide ? "Student Shared Ride" : rideCategory}
                styles={styles}
              />

              {studentSharedRide ? (
                <View style={styles.sharedBox}>
                  <Users size={18} color="#22c55e" />
                  <Text style={styles.sharedText}>
                    Student Shared Ride is enabled. Your seat may be matched with verified students on a similar route/date.
                  </Text>
                </View>
              ) : null}

              <View style={styles.gpsBox}>
                <ShieldCheck size={18} color="#22c55e" />
                <Text style={styles.gpsText}>
                  GPS coordinates saved for chauffeur navigation.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Sparkles size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Fare Breakdown</Text>
              </View>

              <BreakdownRow label="Pricing Tier" value={tier.pricingTierLabel} styles={styles} />
              <BreakdownRow
                label="Fare Method"
                value={`$${tier.baseFareAmount.toFixed(2)} base + $${tier.mileageRate.toFixed(2)}/mile`}
                styles={styles}
              />
              <BreakdownRow label="Mileage Fare" value={`$${mileageFare.toFixed(2)}`} styles={styles} />
              <BreakdownRow label="Base + Mileage" value={`$${oneWayFare.toFixed(2)}`} styles={styles} />

              {tripType === "Round Trip" ? (
                <BreakdownRow
                  label="Round-trip Adjustment"
                  value={`$${roundTripAdjustment.toFixed(2)}`}
                  styles={styles}
                />
              ) : null}

              <View style={styles.divider} />

              <BreakdownRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} styles={styles} />

              {studentDiscount > 0 ? (
                <DiscountRow
                  icon={<BadgeCheck size={17} color="#22c55e" />}
                  label="Verified Student Discount"
                  value={`-$${studentDiscount.toFixed(2)}`}
                  styles={styles}
                />
              ) : (
                <BreakdownRow
                  label="Student Discount"
                  value={approvedStudent ? "$0.00" : "Not verified"}
                  styles={styles}
                />
              )}

              {referralCode ? (
                referralApplied ? (
                  <DiscountRow
                    icon={<Tag size={17} color="#22c55e" />}
                    label={`Referral Discount (${referralCode})`}
                    value={`-$${referralDiscount.toFixed(2)}`}
                    styles={styles}
                  />
                ) : (
                  <WarningRow
                    label={`Referral Code (${referralCode})`}
                    value={referralMessage || "Not applied"}
                    styles={styles}
                  />
                )
              ) : (
                <BreakdownRow label="Referral Discount" value="$0.00" styles={styles} />
              )}

              {studentSharedRide ? (
                approvedStudent ? (
                  <DiscountRow
                    icon={<Users size={17} color="#22c55e" />}
                    label="Student Shared Ride Estimate"
                    value={`-$${sharedRideEstimatedSavings.toFixed(2)}`}
                    styles={styles}
                  />
                ) : (
                  <WarningRow
                    label="Student Shared Ride"
                    value="Student verification required"
                    styles={styles}
                  />
                )
              ) : (
                <BreakdownRow label="Student Shared Ride" value="Not selected" styles={styles} />
              )}

              <View style={styles.divider} />

              <BreakdownRow
                label="Total Savings"
                value={`-$${totalDiscount.toFixed(2)}`}
                styles={styles}
              />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Final Price</Text>
                <Text style={styles.totalValue}>${finalPrice.toFixed(2)}</Text>
              </View>
            </View>

            {studentSharedRide ? (
              <View style={styles.noticeCard}>
                <View style={styles.cardHeader}>
                  <GraduationCap size={22} color={colors.gold} />
                  <Text style={styles.cardTitle}>Shared Ride Notice</Text>
                </View>

                <Text style={styles.notice}>
                  Student Shared Ride pricing is an estimate. Angel Express will confirm
                  final shared ride pricing based on student match availability, route,
                  date, seat availability, and operational approval.
                </Text>
              </View>
            ) : null}

            <View style={styles.noticeCard}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Estimate Notice</Text>
              </View>

              <Text style={styles.notice}>
                This is an estimate. Angel Express may review and confirm the final fare
                based on route, wait time, airport pickup, event traffic, tolls, and special
                requests. Referral credits are awarded to the referrer only after the ride is completed.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={confirmBooking}
              activeOpacity={0.88}
            >
              <Text style={styles.actionButtonText}>Continue to Confirm Booking</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.88}
            >
              <Text style={styles.backButtonText}>Back to Booking Form</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function MiniStat({
  icon,
  title,
  value,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.miniStat}>
      {icon}
      <Text style={styles.miniTitle}>{title}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function Info({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "N/A"}</Text>
    </View>
  );
}

function BreakdownRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

function DiscountRow({
  icon,
  label,
  value,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.discountRow}>
      <View style={styles.discountLeft}>
        {icon}
        <Text style={styles.discountLabel}>{label}</Text>
      </View>
      <Text style={styles.discountValue}>{value}</Text>
    </View>
  );
}

function WarningRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.warningRow}>
      <Text style={styles.warningLabel}>{label}</Text>
      <Text style={styles.warningValue}>{value}</Text>
    </View>
  );
}

function createStyles(c: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, overflow: "hidden" },
    bgWrap: { ...StyleSheet.absoluteFillObject },
    background: { flex: 1 },
    overlay: { flex: 1, backgroundColor: c.overlay },
    container: { flex: 1 },
    content: { padding: 22, paddingTop: 58, paddingBottom: 54 },

    center: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: c.text,
      marginTop: 12,
      fontWeight: "800",
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backTopButton: {
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
    backTopText: {
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
      minHeight: 132,
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
      width: 58,
      height: 58,
      borderRadius: 19,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: { flex: 1 },
    heroTitle: {
      color: c.navy,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 4,
    },
    heroPrice: {
      color: c.navy,
      fontSize: 42,
      fontWeight: "900",
      letterSpacing: -1,
    },
    heroText: {
      color: c.navy,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
      opacity: 0.82,
    },

    summaryGrid: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 18,
    },
    miniStat: {
      flex: 1,
      minHeight: 88,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      padding: 8,
      gap: 5,
      ...v5Shadow(c),
    },
    miniTitle: {
      color: c.text2,
      fontSize: 11,
      fontWeight: "800",
      textAlign: "center",
    },
    miniValue: {
      color: c.text,
      fontSize: 13,
      fontWeight: "900",
      textAlign: "center",
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    noticeCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },

    infoRow: {
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      paddingBottom: 11,
    },
    infoLabel: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    infoValue: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 23,
      fontWeight: "700",
    },

    sharedBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(34,197,94,0.10)",
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.35)",
      borderRadius: 15,
      padding: 13,
      marginTop: 4,
      marginBottom: 10,
    },
    sharedText: {
      color: "#22c55e",
      fontSize: 13,
      fontWeight: "900",
      flex: 1,
      lineHeight: 19,
    },

    gpsBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(34,197,94,0.10)",
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.35)",
      borderRadius: 15,
      padding: 13,
      marginTop: 6,
    },
    gpsText: {
      color: "#22c55e",
      fontSize: 13,
      fontWeight: "900",
      flex: 1,
    },

    breakdownRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 13,
    },
    breakdownLabel: {
      color: c.text2,
      fontSize: 15,
      flex: 1,
      fontWeight: "700",
    },
    breakdownValue: {
      color: c.text,
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
      flex: 1,
    },

    warningRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 13,
    },
    warningLabel: {
      color: "#FF6B6B",
      fontSize: 15,
      fontWeight: "900",
      flex: 1,
    },
    warningValue: {
      color: "#FF6B6B",
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
      flex: 1,
    },

    divider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 10,
    },

    discountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 13,
    },
    discountLeft: {
      flex: 1,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    discountLabel: {
      color: "#22c55e",
      fontSize: 15,
      fontWeight: "900",
      flex: 1,
    },
    discountValue: {
      color: "#22c55e",
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
    },

    totalRow: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 16,
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    totalLabel: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
    },
    totalValue: {
      color: c.gold,
      fontSize: 25,
      fontWeight: "900",
    },

    notice: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "700",
    },

    actionButton: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      ...v5Shadow(c),
    },
    actionButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
    },
    backButton: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      backgroundColor: c.card,
    },
    backButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}