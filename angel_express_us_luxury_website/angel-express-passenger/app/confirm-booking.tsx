import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzfjXYUphz8-nyETcdMYOpHCPoBY33V17OkAZMODpBRVT2V6m8H9DTG5iBM63QqbHtR/exec";

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

  const [loading, setLoading] = useState(false);
  const [checkingReferral, setCheckingReferral] = useState(true);
  const [referralValid, setReferralValid] = useState(false);

  const pickupAddress = String(params.pickupAddress || "");
  const dropoffAddress = String(params.dropoffAddress || "");

  const rideDate = String(params.rideDate || "");
  const rideTime = String(params.rideTime || "");
  const tripType = String(params.tripType || "One Way");
  const rideCategory = String(params.rideCategory || "Standard Ride");
  const passengers = String(params.passengers || "1");
  const luggageCount = String(params.luggageCount || "0");
  const notes = String(params.notes || "");
  const promoCode = String(params.promoCode || "").trim();

  const distanceMiles = Number(params.distanceMiles || 0);
  const durationText = String(params.durationText || "");
  const studentDiscount = Number(params.studentDiscount || 0);
  const roundTripAdjustment = Number(params.roundTripAdjustment || 0);
  const eventSurcharge = Number(params.eventSurcharge || 0);

  const tier = calculateTieredFare(distanceMiles);
  const mileageFare = distanceMiles * tier.mileageRate;
  const subtotal =
    tier.baseFareAmount + mileageFare + roundTripAdjustment + eventSurcharge;

  const referralDiscount = referralValid ? Math.min(10, subtotal) : 0;
  const finalPrice = Math.max(subtotal - studentDiscount - referralDiscount, 0);

  const driverShare = finalPrice * 0.7;
  const companyShare = finalPrice * 0.3;

  useEffect(() => {
    checkReferralCode();
  }, []);

  async function checkReferralCode() {
    try {
      setCheckingReferral(true);

      if (!promoCode) {
        setReferralValid(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setReferralValid(false);
        return;
      }

      const { data, error } = await supabase
        .from("passenger_profiles")
        .select("user_id, referral_code")
        .ilike("referral_code", promoCode)
        .neq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      setReferralValid(!!data);
    } catch {
      setReferralValid(false);
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
          <p><b>Passengers:</b> ${bookingData.passengers}</p>
          <p><b>Luggage Count:</b> ${bookingData.luggage_count}</p>

          <hr />

          <p><b>Pricing Tier:</b> ${bookingData.pricing_tier}</p>
          <p><b>Distance:</b> ${bookingData.estimated_miles} miles</p>
          <p><b>Estimated Drive Time:</b> ${bookingData.duration_text}</p>
          <p><b>Base Fare:</b> $${Number(bookingData.base_fare_amount).toFixed(2)}</p>
          <p><b>Mileage Rate:</b> $${Number(bookingData.mileage_rate).toFixed(2)} per mile</p>
          <p><b>Mileage Fare:</b> $${Number(bookingData.mileage_fare).toFixed(2)}</p>
          <p><b>Student Discount:</b> $${Number(bookingData.student_discount).toFixed(2)}</p>
          <p><b>Referral Discount:</b> $${Number(bookingData.referral_discount).toFixed(2)}</p>
          <h2>Total Fare: $${Number(bookingData.total_fare).toFixed(2)}</h2>

          <p><b>Pickup GPS:</b> ${bookingData.pickup_lat}, ${bookingData.pickup_lng}</p>
          <p><b>Drop-off GPS:</b> ${bookingData.dropoff_lat}, ${bookingData.dropoff_lng}</p>

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
        ride_category: rideCategory,

        passengers: Number(passengers) || 1,
        luggage_count: Number(luggageCount) || 0,

        notes,
        promo_code: promoCode,
        referral_code_used: referralValid ? promoCode : null,
        referral_discount: referralDiscount,

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

        student_discount: studentDiscount,
        round_trip_adjustment: roundTripAdjustment,

        total_fare: finalPrice,
        total: finalPrice,
        balance_due: finalPrice,

        driver_share: driverShare,
        company_share: companyShare,
        driver_payout: driverShare,

        invoice_no: invoiceNo,
        invoice_status: "Pending",

        payment_status: "unpaid",
        payment_method: null,

        duration_text: durationText,
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
          pickup: pickupAddress,
          dropoff: dropoffAddress,
          pickup_lat: coords.pickupLat,
          pickup_lng: coords.pickupLng,
          dropoff_lat: coords.dropoffLat,
          dropoff_lng: coords.dropoffLng,
          date: rideDate,
          time: rideTime,
          trip_type: tripType,
          ride_category: rideCategory,
          passengers: Number(passengers) || 1,
          luggage_count: Number(luggageCount) || 0,
          notes,
          promo_code: promoCode,
          referral_discount: referralDiscount,
          miles: distanceMiles,
          pricing_tier: tier.pricingTier,
          base: subtotal,
          discount: studentDiscount + referralDiscount,
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

  const displayPickupLat = String(params.pickupLat || "Auto lookup");
  const displayPickupLng = String(params.pickupLng || "Auto lookup");
  const displayDropoffLat = String(params.dropoffLat || "Auto lookup");
  const displayDropoffLng = String(params.dropoffLng || "Auto lookup");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Confirm Booking</Text>

      <Text style={styles.subtitle}>
        Review your trip details before submitting your ride request.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trip Details</Text>

        <Row label="Pickup" value={pickupAddress} />
        <Row label="Drop-off" value={dropoffAddress} />
        <Row label="Pickup GPS" value={`${displayPickupLat}, ${displayPickupLng}`} />
        <Row label="Drop-off GPS" value={`${displayDropoffLat}, ${displayDropoffLng}`} />
        <Row label="Date" value={rideDate} />
        <Row label="Time" value={rideTime} />
        <Row label="Trip Type" value={tripType} />
        <Row label="Ride Category" value={rideCategory} />
        <Row label="Passengers" value={passengers} />
        <Row label="Luggage" value={luggageCount} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fare Summary</Text>

        <Row label="Pricing Tier" value={tier.pricingTierLabel} />
        <Row label="Distance" value={`${distanceMiles} miles`} />
        <Row label="Drive Time" value={durationText || "N/A"} />
        <Row label="Base Fare" value={`$${tier.baseFareAmount.toFixed(2)}`} />
        <Row label="Mileage Rate" value={`$${tier.mileageRate.toFixed(2)} / mile`} />
        <Row label="Mileage Fare" value={`$${mileageFare.toFixed(2)}`} />

        {roundTripAdjustment > 0 && (
          <Row
            label="Round Trip Adjustment"
            value={`$${roundTripAdjustment.toFixed(2)}`}
          />
        )}

        {eventSurcharge > 0 && (
          <Row label="Event Surcharge" value={`$${eventSurcharge.toFixed(2)}`} />
        )}

        <Row label="Student Discount" value={`-$${studentDiscount.toFixed(2)}`} />

        {promoCode ? (
          <Row
            label={referralValid ? "Referral Discount Applied" : "Referral Code"}
            value={
              checkingReferral
                ? "Checking..."
                : referralValid
                ? `-$${referralDiscount.toFixed(2)}`
                : "Invalid / Not applied"
            }
          />
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Final Price</Text>
          <Text style={styles.totalValue}>${finalPrice.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.notice}>
        Payment is collected after your ride is completed.
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={confirmBooking}
        disabled={loading || checkingReferral}
      >
        {loading ? (
          <ActivityIndicator color="#071426" />
        ) : (
          <Text style={styles.buttonText}>Confirm Booking</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back to Fare Estimate</Text>
      </TouchableOpacity>
    </ScrollView>
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

  card: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },

  cardTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },

  row: {
    marginBottom: 14,
  },

  rowLabel: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  rowValue: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
  },

  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(212,175,55,0.25)",
    paddingTop: 16,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  totalLabel: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
  },

  totalValue: {
    color: "#D4AF37",
    fontSize: 24,
    fontWeight: "900",
  },

  notice: {
    color: "#C9D0D8",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 16,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#071426",
    fontSize: 18,
    fontWeight: "900",
  },

  backButton: {
    alignItems: "center",
    paddingVertical: 12,
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});