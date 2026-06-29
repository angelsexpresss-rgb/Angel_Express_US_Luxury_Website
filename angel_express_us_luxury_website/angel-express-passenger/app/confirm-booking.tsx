import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
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
  View,
} from "react-native";
import {
  BadgeCheck,
  CarFront,
  CreditCard,
  FileCheck,
  Gift,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
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

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzfjXYUphz8-nyETcdMYOpHCPoBY33V17OkAZMODpBRVT2V6m8H9DTG5iBM63QqbHtR/exec";

const GOLD = AE_COLORS.gold;
const REFERRAL_DISCOUNT_AMOUNT = 10;

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

export default function ConfirmBookingScreen() {
  const params = useLocalSearchParams();

  const pickupAddress = String(params.pickupAddress || "");
  const dropoffAddress = String(params.dropoffAddress || "");

  const rideDate = String(params.rideDate || "");
  const rideTime = String(params.rideTime || "");
  const tripType = String(params.tripType || "One Way");
  const rideCategory = String(params.rideCategory || "Standard Ride");
  const passengers = String(params.passengers || "1");
  const luggageCount = String(params.luggageCount || "0");
  const notes = String(params.notes || "");

  const promoCode = String(params.promoCode || params.referralCode || "")
    .trim()
    .toUpperCase();

  const distanceMiles = Number(params.distanceMiles || 0);
  const durationText = String(params.durationText || "");

  const incomingReferralApplied =
    String(params.referralApplied || "false") === "true";
  const incomingReferrerUserId = String(params.referrerUserId || "");
  const incomingReferralDiscount = Number(params.referralDiscount || 0);

  const incomingStudentVerified =
    String(params.studentVerified || params.student_verified || "false") === "true";
  const incomingStudentDiscount = Number(params.studentDiscount || 0);

  const roundTripAdjustment = Number(params.roundTripAdjustment || 0);
  const eventSurcharge = Number(params.eventSurcharge || 0);

  const studentSharedRide =
    String(params.studentSharedRide || params.student_shared_ride || "false") ===
      "true" ||
    rideCategory.toLowerCase().includes("shared") ||
    rideCategory.toLowerCase().includes("pool");

  const studentPoolId = String(params.studentPoolId || params.student_pool_id || "");
  const studentCampus = String(params.studentCampus || params.student_campus || "");
  const studentPoolRoute = String(params.studentPoolRoute || params.student_pool_route || "");

  const [loading, setLoading] = useState(false);
  const [checkingReferral, setCheckingReferral] = useState(true);

  const [referralValid, setReferralValid] = useState(false);
  const [referrerUserId, setReferrerUserId] = useState("");
  const [referralMessage, setReferralMessage] = useState("");

  const [studentVerified, setStudentVerified] = useState(incomingStudentVerified);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  const tier = calculateTieredFare(distanceMiles);
  const mileageFare = distanceMiles * tier.mileageRate;
  const subtotal =
    tier.baseFareAmount + mileageFare + roundTripAdjustment + eventSurcharge;

  const studentDiscount = studentVerified
    ? incomingStudentDiscount > 0
      ? incomingStudentDiscount
      : subtotal * 0.2
    : 0;

  const referralDiscount = referralValid
    ? incomingReferralDiscount > 0
      ? incomingReferralDiscount
      : Math.min(REFERRAL_DISCOUNT_AMOUNT, subtotal - studentDiscount)
    : 0;

  const totalDiscount = studentDiscount + referralDiscount;
  const finalPrice = Math.max(subtotal - totalDiscount, 0);

  const driverShare = finalPrice * 0.7;
  const companyShare = finalPrice * 0.3;
  const rewardPointsEarned = Math.round(distanceMiles);

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
    loadVerificationAndReferral();
  }, []);

  async function loadVerificationAndReferral() {
    try {
      setCheckingReferral(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const { data: profile } = await supabase
        .from("passenger_profiles")
        .select("student_verified,student_discount_eligible")
        .eq("user_id", user.id)
        .maybeSingle();

      const approvedStudent = Boolean(
        profile?.student_verified || profile?.student_discount_eligible
      );

      setStudentVerified(approvedStudent || incomingStudentVerified);

      if (!promoCode) {
        setReferralValid(false);
        setReferrerUserId("");
        setReferralMessage("");
        return;
      }

      if (
        incomingReferralApplied &&
        incomingReferrerUserId &&
        incomingReferrerUserId !== user.id
      ) {
        setReferralValid(true);
        setReferrerUserId(incomingReferrerUserId);
        setReferralMessage("Referral applied");
        return;
      }

      const { data: referrer, error } = await supabase
        .from("passenger_profiles")
        .select("user_id,referral_code,email")
        .ilike("referral_code", promoCode)
        .maybeSingle();

      if (error) throw error;

      if (!referrer?.user_id) {
        setReferralValid(false);
        setReferrerUserId("");
        setReferralMessage("Invalid referral code");
        return;
      }

      if (referrer.user_id === user.id) {
        setReferralValid(false);
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
        setReferralValid(false);
        setReferrerUserId("");
        setReferralMessage("Referral already used by this account");
        return;
      }

      setReferralValid(true);
      setReferrerUserId(referrer.user_id);
      setReferralMessage("Referral applied");
    } catch {
      setReferralValid(false);
      setReferrerUserId("");
      setReferralMessage("Referral could not be verified");
    } finally {
      setCheckingReferral(false);
    }
  }

  async function getCoordinates(address: string) {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`
    );

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error(`Could not find GPS coordinates for: ${address}`);
    }

    const [longitude, latitude] = data.features[0].geometry.coordinates;

    return {
      latitude: Number(latitude),
      longitude: Number(longitude),
    };
  }

  async function resolveCoordinates() {
    let pickupLat = Number(params.pickupLat || 0);
    let pickupLng = Number(params.pickupLng || 0);
    let dropoffLat = Number(params.dropoffLat || 0);
    let dropoffLng = Number(params.dropoffLng || 0);

    if (!pickupLat || !pickupLng) {
      const pickupCoords = await getCoordinates(pickupAddress);
      pickupLat = pickupCoords.latitude;
      pickupLng = pickupCoords.longitude;
    }

    if (!dropoffLat || !dropoffLng) {
      const dropoffCoords = await getCoordinates(dropoffAddress);
      dropoffLat = dropoffCoords.latitude;
      dropoffLng = dropoffCoords.longitude;
    }

    return {
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
    };
  }

  function makeInvoiceNo() {
    const random = Math.floor(100000 + Math.random() * 900000);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `AE-${date}-${random}`;
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
          <p><b>Student Shared Ride:</b> ${bookingData.student_shared_ride ? "Yes" : "No"}</p>

          <hr />

          <p><b>Pricing Tier:</b> ${bookingData.pricing_tier}</p>
          <p><b>Distance:</b> ${bookingData.estimated_miles} miles</p>
          <p><b>Base Fare:</b> $${Number(bookingData.base_fare_amount).toFixed(2)}</p>
          <p><b>Mileage Fare:</b> $${Number(bookingData.mileage_fare).toFixed(2)}</p>
          <p><b>Student Discount:</b> -$${Number(bookingData.student_discount).toFixed(2)}</p>
          <p><b>Referral Discount:</b> -$${Number(bookingData.referral_discount).toFixed(2)}</p>
          <h2>Total Fare: $${Number(bookingData.total_fare).toFixed(2)}</h2>

          <p>Payment is collected after ride completion.</p>
          <p>Please use invoice number <b>${invoiceNo}</b> as payment reference.</p>
        </body>
      </html>
    `;

    const file = await Print.printToFileAsync({ html });

    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: "base64" as any,
    });

    return base64;
  }

  async function confirmBooking() {
    if (loading) return;

    try {
      setLoading(true);

      const coords = await resolveCoordinates();

      if (
        !coords.pickupLat ||
        !coords.pickupLng ||
        !coords.dropoffLat ||
        !coords.dropoffLng
      ) {
        Alert.alert(
          "GPS Coordinates Missing",
          "Please go back and select pickup and drop-off addresses from the suggestions."
        );
        return;
      }

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

      const invoiceNo = makeInvoiceNo();

      const bookingData = {
        user_id: user.id,

        passenger_name: passengerName || user.email || "",
        name: passengerName || user.email || "",

        email: passenger?.email || user.email || "",
        phone: passenger?.phone || "",

        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        pickup: pickupAddress,
        dropoff: dropoffAddress,
        route: `${pickupAddress} → ${dropoffAddress}`,

        pickup_lat: coords.pickupLat,
        pickup_lng: coords.pickupLng,
        dropoff_lat: coords.dropoffLat,
        dropoff_lng: coords.dropoffLng,

        ride_date: rideDate,
        ride_time: rideTime,
        date: rideDate,
        time: rideTime,

        trip_type: tripType,
        tripType: tripType,
        ride_category: studentSharedRide ? "Student Shared Ride" : rideCategory,

        passengers: Number(passengers) || 1,
        luggage_count: Number(luggageCount) || 0,
        notes,

        promo_code: promoCode || null,

        referral_code: referralValid ? promoCode : null,
        referral_code_used: referralValid ? promoCode : null,
        referrer_user_id: referralValid ? referrerUserId : null,
        referral_discount: referralValid ? referralDiscount : 0,
        referral_applied: referralValid,
        referral_credit_awarded: false,

        student_verified: studentVerified,
        student_discount: studentDiscount,
        student_shared_ride: studentSharedRide,
        student_pool_id: studentPoolId || null,

        source: "app",
        status: "pending",

        pricing_model: "tiered",
        pricing_tier: tier.pricingTier,
        base_fare_amount: tier.baseFareAmount,
        mileage_rate: tier.mileageRate,
        mileage_fare: mileageFare,
        event_surcharge: eventSurcharge,

        estimated_miles: distanceMiles,
        miles: distanceMiles,

        base_fare: subtotal,
        base: subtotal,

        round_trip_adjustment: roundTripAdjustment,
        total_discount: totalDiscount,

        total_fare: finalPrice,
        total: finalPrice,
        balance_due: finalPrice,

        reward_points_earned: rewardPointsEarned,

        driver_share: driverShare,
        company_share: companyShare,
        driver_payout: driverShare,

        invoice_no: invoiceNo,
        invoice_status: "Pending",

        payment_status: "unpaid",
        payment_method: null,

        duration_text: durationText,
      };

      const { data: insertedBooking, error } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select("*")
        .single();

      if (error) throw error;

      if (studentSharedRide) {
        try {
          await supabase.from("student_pool_members").insert({
            booking_id: insertedBooking.id,
            passenger_user_id: user.id,
            passenger_email: user.email,
            invoice_no: invoiceNo,
            campus: studentCampus || null,
            pool_route:
              studentPoolRoute || `${pickupAddress} → ${dropoffAddress}`,
            status: "pending",
          });
        } catch {
          console.log("Student pool member record skipped.");
        }
      }

      if (referralValid && referrerUserId) {
        try {
          await supabase.from("referral_rewards").insert({
            referrer_user_id: referrerUserId,
            referred_booking_id: insertedBooking.id,
            referred_passenger_email: passenger?.email || user.email || "",
            referral_code: promoCode,
            discount_given: referralDiscount,
            credit_earned: 10,
            status: "pending",
          });
        } catch {
          console.log("Pending referral reward skipped.");
        }
      }

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
          pickup: pickupAddress,
          dropoff: dropoffAddress,
          pickup_lat: coords.pickupLat,
          pickup_lng: coords.pickupLng,
          dropoff_lat: coords.dropoffLat,
          dropoff_lng: coords.dropoffLng,
          date: rideDate,
          time: rideTime,
          trip_type: tripType,
          ride_category: bookingData.ride_category,
          passengers: Number(passengers) || 1,
          luggage_count: Number(luggageCount) || 0,
          notes,
          promo_code: promoCode,
          referral_code: referralValid ? promoCode : "",
          referral_discount: referralDiscount,
          referral_applied: referralValid,
          student_verified: studentVerified,
          student_discount: studentDiscount,
          student_shared_ride: studentSharedRide,
          miles: distanceMiles,
          pricing_tier: tier.pricingTier,
          base: subtotal,
          discount: totalDiscount,
          total: finalPrice,
          amount_paid: 0,
          balance_due: finalPrice,
          invoice_pdf: invoicePdf,
        }),
      });

      Alert.alert(
        "Booking Saved",
        "Your ride request has been submitted. A confirmation email and invoice have been sent.",
        [
          {
            text: "View My Trips",
            onPress: () => router.replace("/my-trips" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Booking Error", error.message || "Could not confirm booking.");
    } finally {
      setLoading(false);
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
        >
          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>A  FINAL RIDE REVIEW</Text>
            </View>

            <Text style={styles.title}>Confirm Booking</Text>

            <Text style={styles.subtitle}>
              Review your ride, verified discounts, referral rewards, and final fare before submitting.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CreditCard size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Final Fare</Text>
                <Text style={styles.heroPrice}>${finalPrice.toFixed(2)}</Text>
                <Text style={styles.heroText}>
                  {distanceMiles} miles • {durationText || "Drive time unavailable"}
                </Text>
              </View>
            </AngelCard>

            <View style={styles.statusGrid}>
              <StatusPill
                title="Student"
                value={studentVerified ? "Verified" : "Not Verified"}
              />
              <StatusPill
                title="Referral"
                value={
                  checkingReferral
                    ? "Checking"
                    : referralValid
                    ? "Applied"
                    : promoCode
                    ? "Invalid"
                    : "None"
                }
              />
              <StatusPill
                title="Shared Ride"
                value={studentSharedRide ? "Yes" : "No"}
              />
            </View>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPinned size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Trip Details</Text>
              </View>

              <Row label="Pickup" value={pickupAddress} />
              <Row label="Drop-off" value={dropoffAddress} />
              <Row label="Date" value={rideDate} />
              <Row label="Time" value={rideTime} />
              <Row label="Trip Type" value={tripType} />
              <Row
                label="Ride Category"
                value={studentSharedRide ? "Student Shared Ride" : rideCategory}
              />
              <Row label="Passengers" value={passengers} />
              <Row label="Luggage" value={luggageCount} />
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Route size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Fare Summary</Text>
              </View>

              <Row label="Pricing Tier" value={tier.pricingTierLabel} />
              <Row label="Distance" value={`${distanceMiles} miles`} />
              <Row label="Drive Time" value={durationText || "N/A"} />
              <Row label="Base Fare" value={`$${tier.baseFareAmount.toFixed(2)}`} />
              <Row
                label="Mileage Rate"
                value={`$${tier.mileageRate.toFixed(2)} / mile`}
              />
              <Row label="Mileage Fare" value={`$${mileageFare.toFixed(2)}`} />

              {roundTripAdjustment > 0 ? (
                <Row
                  label="Round Trip Adjustment"
                  value={`$${roundTripAdjustment.toFixed(2)}`}
                />
              ) : null}

              {eventSurcharge > 0 ? (
                <Row label="Event Surcharge" value={`$${eventSurcharge.toFixed(2)}`} />
              ) : null}

              <DiscountRow
                icon={<BadgeCheck size={17} color="#22c55e" />}
                label="Student Discount"
                value={`-$${studentDiscount.toFixed(2)}`}
                active={studentDiscount > 0}
              />

              {promoCode ? (
                <DiscountRow
                  icon={<Gift size={17} color="#22c55e" />}
                  label={referralValid ? `Referral Discount (${promoCode})` : "Referral Code"}
                  value={
                    checkingReferral
                      ? "Checking..."
                      : referralValid
                      ? `-$${referralDiscount.toFixed(2)}`
                      : referralMessage || "Invalid / Not applied"
                  }
                  active={referralValid}
                />
              ) : null}

              {studentSharedRide ? (
                <DiscountRow
                  icon={<Users size={17} color="#22c55e" />}
                  label="Student Shared Ride"
                  value="Enabled"
                  active
                />
              ) : null}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Final Price</Text>
                <Text style={styles.totalValue}>${finalPrice.toFixed(2)}</Text>
              </View>
            </AngelCard>

            <AngelCard style={styles.noticeCard}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Booking Notice</Text>
              </View>

              <Text style={styles.notice}>
                Payment is collected after your ride is completed. Referral credits are awarded after the referred ride is completed.
              </Text>

              <View style={styles.rewardBox}>
                <Sparkles size={18} color={GOLD} />
                <Text style={styles.rewardText}>
                  This ride may earn {rewardPointsEarned} reward points after completion.
                </Text>
              </View>
            </AngelCard>

            <AngelHeroButton
              title={loading ? "Confirming..." : "Confirm Booking"}
              onPress={confirmBooking}
              variant="gold"
              style={styles.button}
            />

            <AngelHeroButton
              title="Back to Fare Estimate"
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function StatusPill({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusTitle}>{title}</Text>
    </View>
  );
}

function DiscountRow({
  icon,
  label,
  value,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <View style={styles.discountRow}>
      <View style={styles.discountLeft}>
        {icon}
        <Text style={[styles.discountLabel, !active && styles.discountInactive]}>
          {label}
        </Text>
      </View>

      <Text style={[styles.discountValue, !active && styles.discountInactive]}>
        {value}
      </Text>
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
    minHeight: 138,
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
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: "800",
  },

  statusGrid: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 18,
  },
  statusPill: {
    flex: 1,
    backgroundColor: "rgba(13,20,34,0.84)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 17,
    padding: 12,
    alignItems: "center",
    minHeight: 76,
    justifyContent: "center",
  },
  statusValue: {
    color: GOLD,
    fontSize: 12.5,
    fontWeight: "900",
    textAlign: "center",
  },
  statusTitle: {
    color: AE_COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
    textAlign: "center",
  },

  card: { padding: 20, marginBottom: 18 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },

  row: { marginBottom: 14 },
  rowLabel: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  rowValue: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
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
  discountInactive: {
    color: AE_COLORS.textSoft,
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

  noticeCard: {
    padding: 20,
    marginBottom: 18,
  },
  notice: {
    color: AE_COLORS.textSoft,
    fontSize: 15,
    lineHeight: 23,
  },
  rewardBox: {
    marginTop: 14,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    backgroundColor: "rgba(212,175,55,0.08)",
    borderRadius: 16,
    padding: 13,
  },
  rewardText: {
    color: GOLD,
    fontSize: 13.5,
    fontWeight: "900",
    flex: 1,
    lineHeight: 20,
  },

  button: { marginTop: 2 },
  backButton: { marginTop: 14 },
});