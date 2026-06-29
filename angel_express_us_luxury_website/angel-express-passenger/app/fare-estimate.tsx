import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;
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
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
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
        <ActivityIndicator color={GOLD} size="large" />
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
          <TouchableOpacity style={styles.backTopButton} onPress={() => router.back()}>
            <Text style={styles.backTopText}>‹ Back</Text>
          </TouchableOpacity>

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

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CreditCard size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Estimated Fare</Text>
                <Text style={styles.heroPrice}>${finalPrice.toFixed(2)}</Text>
                <Text style={styles.heroText}>
                  {distanceMiles} miles • {durationText || "Drive time unavailable"}
                </Text>
              </View>
            </AngelCard>

            <View style={styles.summaryGrid}>
              <MiniStat
                icon={<Route size={18} color={GOLD} />}
                title="Distance"
                value={`${distanceMiles} mi`}
              />
              <MiniStat
                icon={<Clock size={18} color={GOLD} />}
                title="Drive Time"
                value={durationText || "N/A"}
              />
              <MiniStat
                icon={<CarFront size={18} color={GOLD} />}
                title="Trip Type"
                value={tripType}
              />
            </View>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPinned size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Trip Route</Text>
              </View>

              <Info label="Pickup" value={pickupAddress} />
              <Info label="Drop-off" value={dropoffAddress} />
              <Info label="Date & Time" value={`${rideDate} at ${rideTime}`} />
              <Info
                label="Ride Category"
                value={studentSharedRide ? "Student Shared Ride" : rideCategory}
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
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Sparkles size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Fare Breakdown</Text>
              </View>

              <BreakdownRow label="Pricing Tier" value={tier.pricingTierLabel} />
              <BreakdownRow
                label="Fare Method"
                value={`$${tier.baseFareAmount.toFixed(2)} base + $${tier.mileageRate.toFixed(2)}/mile`}
              />
              <BreakdownRow label="Mileage Fare" value={`$${mileageFare.toFixed(2)}`} />
              <BreakdownRow label="Base + Mileage" value={`$${oneWayFare.toFixed(2)}`} />

              {tripType === "Round Trip" ? (
                <BreakdownRow
                  label="Round-trip Adjustment"
                  value={`$${roundTripAdjustment.toFixed(2)}`}
                />
              ) : null}

              <View style={styles.divider} />

              <BreakdownRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />

              {studentDiscount > 0 ? (
                <DiscountRow
                  icon={<BadgeCheck size={17} color="#22c55e" />}
                  label="Verified Student Discount"
                  value={`-$${studentDiscount.toFixed(2)}`}
                />
              ) : (
                <BreakdownRow
                  label="Student Discount"
                  value={approvedStudent ? "$0.00" : "Not verified"}
                />
              )}

              {referralCode ? (
                referralApplied ? (
                  <DiscountRow
                    icon={<Tag size={17} color="#22c55e" />}
                    label={`Referral Discount (${referralCode})`}
                    value={`-$${referralDiscount.toFixed(2)}`}
                  />
                ) : (
                  <WarningRow
                    label={`Referral Code (${referralCode})`}
                    value={referralMessage || "Not applied"}
                  />
                )
              ) : (
                <BreakdownRow label="Referral Discount" value="$0.00" />
              )}

              {studentSharedRide ? (
                approvedStudent ? (
                  <DiscountRow
                    icon={<Users size={17} color="#22c55e" />}
                    label="Student Shared Ride Estimate"
                    value={`-$${sharedRideEstimatedSavings.toFixed(2)}`}
                  />
                ) : (
                  <WarningRow
                    label="Student Shared Ride"
                    value="Student verification required"
                  />
                )
              ) : (
                <BreakdownRow label="Student Shared Ride" value="Not selected" />
              )}

              <View style={styles.divider} />

              <BreakdownRow
                label="Total Savings"
                value={`-$${totalDiscount.toFixed(2)}`}
              />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Final Price</Text>
                <Text style={styles.totalValue}>${finalPrice.toFixed(2)}</Text>
              </View>
            </AngelCard>

            {studentSharedRide ? (
              <AngelCard style={styles.noticeCard}>
                <View style={styles.cardHeader}>
                  <GraduationCap size={22} color={GOLD} />
                  <Text style={styles.cardTitle}>Shared Ride Notice</Text>
                </View>

                <Text style={styles.notice}>
                  Student Shared Ride pricing is an estimate. Angel Express will confirm
                  final shared ride pricing based on student match availability, route,
                  date, seat availability, and operational approval.
                </Text>
              </AngelCard>
            ) : null}

            <AngelCard style={styles.noticeCard}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Estimate Notice</Text>
              </View>

              <Text style={styles.notice}>
                This is an estimate. Angel Express may review and confirm the final fare
                based on route, wait time, airport pickup, event traffic, tolls, and special
                requests. Referral credits are awarded to the referrer only after the ride is completed.
              </Text>
            </AngelCard>

            <AngelHeroButton
              title="Continue to Confirm Booking"
              onPress={confirmBooking}
              variant="gold"
              style={styles.actionButton}
            />

            <AngelHeroButton
              title="Back to Booking Form"
              onPress={() => router.back()}
              variant="outline"
              style={styles.backButton}
            />
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
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.miniStat}>
      {icon}
      <Text style={styles.miniTitle}>{title}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "N/A"}</Text>
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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

function WarningRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.warningRow}>
      <Text style={styles.warningLabel}>{label}</Text>
      <Text style={styles.warningValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AE_COLORS.navy, overflow: "hidden" },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(5,11,22,0.91)" },
  container: { flex: 1 },
  content: { padding: 22, paddingTop: 56, paddingBottom: 50 },

  center: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: AE_COLORS.white, marginTop: 12 },

  backTopButton: { alignSelf: "flex-start", marginBottom: 18 },
  backTopText: { color: GOLD, fontSize: 18, fontWeight: "900" },

  kicker: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  kickerText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  title: {
    color: GOLD,
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

  heroCard: {
    minHeight: 132,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: "rgba(6,17,31,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroCopy: { flex: 1 },
  heroTitle: {
    color: AE_COLORS.navy2,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  heroPrice: {
    color: AE_COLORS.navy2,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroText: {
    color: "rgba(6,17,31,0.78)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
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
    borderColor: "rgba(212,175,55,0.22)",
    backgroundColor: "rgba(13,20,34,0.84)",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 5,
  },
  miniTitle: {
    color: AE_COLORS.textSoft,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  miniValue: {
    color: AE_COLORS.white,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },

  card: { padding: 20, marginBottom: 18 },
  noticeCard: { padding: 20, marginBottom: 18 },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: { color: GOLD, fontSize: 22, fontWeight: "900", flex: 1 },

  infoRow: { marginBottom: 14 },
  infoLabel: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoValue: {
    color: AE_COLORS.white,
    fontSize: 15.5,
    lineHeight: 23,
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
    color: AE_COLORS.textSoft,
    fontSize: 15,
    flex: 1,
  },
  breakdownValue: {
    color: AE_COLORS.white,
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
    backgroundColor: "rgba(212,175,55,0.22)",
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
    borderTopColor: "rgba(212,175,55,0.25)",
    paddingTop: 16,
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
  },
  totalValue: {
    color: GOLD,
    fontSize: 25,
    fontWeight: "900",
  },

  notice: {
    color: AE_COLORS.textSoft,
    fontSize: 15,
    lineHeight: 23,
  },

  actionButton: {
    marginTop: 2,
  },
  backButton: {
    marginTop: 14,
  },
});