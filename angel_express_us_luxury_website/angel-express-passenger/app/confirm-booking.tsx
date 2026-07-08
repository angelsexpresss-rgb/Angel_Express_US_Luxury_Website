import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
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
  CreditCard,
  Gift,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzfjXYUphz8-nyETcdMYOpHCPoBY33V17OkAZMODpBRVT2V6m8H9DTG5iBM63QqbHtR/exec";

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

  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const studentPoolRoute = String(
    params.studentPoolRoute || params.student_pool_route || ""
  );

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
            <Text style={styles.kicker}>FINAL RIDE REVIEW</Text>
            <Text style={styles.title}>Confirm Booking</Text>

            <Text style={styles.subtitle}>
              Review your ride, verified discounts, referral rewards, and final fare before submitting.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CreditCard size={31} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Final Fare</Text>
                <Text style={styles.heroPrice}>${finalPrice.toFixed(2)}</Text>
                <Text style={styles.heroText}>
                  {distanceMiles} miles • {durationText || "Drive time unavailable"}
                </Text>
              </View>
            </View>

            <View style={styles.statusGrid}>
              <StatusPill
                title="Student"
                value={studentVerified ? "Verified" : "Not Verified"}
                styles={styles}
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
                styles={styles}
              />

              <StatusPill
                title="Shared Ride"
                value={studentSharedRide ? "Yes" : "No"}
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPinned size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Trip Details</Text>
              </View>

              <Row label="Pickup" value={pickupAddress} styles={styles} />
              <Row label="Drop-off" value={dropoffAddress} styles={styles} />
              <Row label="Date" value={rideDate} styles={styles} />
              <Row label="Time" value={rideTime} styles={styles} />
              <Row label="Trip Type" value={tripType} styles={styles} />
              <Row
                label="Ride Category"
                value={studentSharedRide ? "Student Shared Ride" : rideCategory}
                styles={styles}
              />
              <Row label="Passengers" value={passengers} styles={styles} />
              <Row label="Luggage" value={luggageCount} styles={styles} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Route size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Fare Summary</Text>
              </View>

              <Row label="Pricing Tier" value={tier.pricingTierLabel} styles={styles} />
              <Row label="Distance" value={`${distanceMiles} miles`} styles={styles} />
              <Row label="Drive Time" value={durationText || "N/A"} styles={styles} />
              <Row label="Base Fare" value={`$${tier.baseFareAmount.toFixed(2)}`} styles={styles} />
              <Row
                label="Mileage Rate"
                value={`$${tier.mileageRate.toFixed(2)} / mile`}
                styles={styles}
              />
              <Row label="Mileage Fare" value={`$${mileageFare.toFixed(2)}`} styles={styles} />

              {roundTripAdjustment > 0 ? (
                <Row
                  label="Round Trip Adjustment"
                  value={`$${roundTripAdjustment.toFixed(2)}`}
                  styles={styles}
                />
              ) : null}

              {eventSurcharge > 0 ? (
                <Row label="Event Surcharge" value={`$${eventSurcharge.toFixed(2)}`} styles={styles} />
              ) : null}

              <DiscountRow
                icon={<BadgeCheck size={17} color="#22c55e" />}
                label="Student Discount"
                value={`-$${studentDiscount.toFixed(2)}`}
                active={studentDiscount > 0}
                styles={styles}
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
                  styles={styles}
                />
              ) : null}

              {studentSharedRide ? (
                <DiscountRow
                  icon={<Users size={17} color="#22c55e" />}
                  label="Student Shared Ride"
                  value="Enabled"
                  active
                  styles={styles}
                />
              ) : null}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Final Price</Text>
                <Text style={styles.totalValue}>${finalPrice.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.noticeCard}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Booking Notice</Text>
              </View>

              <Text style={styles.notice}>
                Payment is collected after your ride is completed. Referral credits are awarded after the referred ride is completed.
              </Text>

              <View style={styles.rewardBox}>
                <Sparkles size={18} color={colors.gold} />
                <Text style={styles.rewardText}>
                  This ride may earn {rewardPointsEarned} reward points after completion.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={confirmBooking}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.buttonText}>Confirm Booking</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Back to Fare Estimate</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
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

function DiscountRow({
  icon,
  label,
  value,
  active,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active?: boolean;
  styles: any;
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

function createStyles(c: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, overflow: "hidden" },
    bgWrap: { ...StyleSheet.absoluteFillObject },
    background: { flex: 1 },
    overlay: { flex: 1, backgroundColor: c.overlay },
    container: { flex: 1 },
    content: { padding: 22, paddingTop: 58, paddingBottom: 54 },

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
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
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
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      gap: 14,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: { flex: 1 },
    heroTitle: {
      color: c.navy,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 2,
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

    statusGrid: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 18,
    },
    statusPill: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 17,
      padding: 12,
      alignItems: "center",
      minHeight: 76,
      justifyContent: "center",
      ...v5Shadow(c),
    },
    statusValue: {
      color: c.gold,
      fontSize: 12.5,
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
      fontSize: 21,
      fontWeight: "900",
      flex: 1,
    },

    row: {
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      paddingBottom: 11,
    },
    rowLabel: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    rowValue: {
      color: c.text,
      fontSize: 15.5,
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
      color: c.text2,
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

    noticeCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    notice: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "700",
    },
    rewardBox: {
      marginTop: 14,
      flexDirection: "row",
      gap: 9,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      borderRadius: 16,
      padding: 13,
    },
    rewardText: {
      color: c.gold,
      fontSize: 13.5,
      fontWeight: "900",
      flex: 1,
      lineHeight: 20,
    },

    button: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      ...v5Shadow(c),
    },
    buttonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    buttonDisabled: {
      opacity: 0.65,
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