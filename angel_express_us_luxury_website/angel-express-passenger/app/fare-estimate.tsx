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
  const promoCode = String(params.promoCode || "");

  const [loading, setLoading] = useState(true);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [durationText, setDurationText] = useState("");

  const tier = calculateTieredFare(distanceMiles);
  const mileageFare = distanceMiles * tier.mileageRate;

  const oneWayFare = tier.baseFareAmount + mileageFare;
  const roundTripAdjustment = tripType === "Round Trip" ? oneWayFare : 0;
  const subtotal = oneWayFare + roundTripAdjustment;

  const studentDiscount =
    rideCategory === "Student Group Ride" ? subtotal * 0.2 : 0;

  const finalPrice = Math.max(subtotal - studentDiscount, 0);

  const driverPayout = finalPrice * 0.7;
  const companyShare = finalPrice * 0.3;

  useEffect(() => {
    calculateRoute();
  }, []);

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
    try {
      setLoading(true);

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
    } catch (error: any) {
      Alert.alert(
        "Route Error",
        error.message || "Could not calculate fare estimate."
      );
    } finally {
      setLoading(false);
    }
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
        rideCategory,
        passengers,
        luggageCount,
        notes,
        promoCode,

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
        roundTripAdjustment: roundTripAdjustment.toFixed(2),
        finalPrice: finalPrice.toFixed(2),

        driverPayout: driverPayout.toFixed(2),
        companyShare: companyShare.toFixed(2),
      },
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Fare Estimate</Text>

      <Text style={styles.subtitle}>
        Review your estimated trip distance, price, and ride details.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trip Route</Text>

        <Text style={styles.label}>Pickup</Text>
        <Text style={styles.value}>{pickupAddress}</Text>

        <Text style={styles.label}>Drop-off</Text>
        <Text style={styles.value}>{dropoffAddress}</Text>

        <Text style={styles.label}>Date & Time</Text>
        <Text style={styles.value}>
          {rideDate} at {rideTime}
        </Text>

        <Text style={styles.gpsText}>
          GPS coordinates saved for chauffeur navigation ✓
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={styles.loadingText}>Calculating route...</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estimate Summary</Text>

          <Row label="Pricing Tier" value={tier.pricingTierLabel} />
          <Row label="Distance" value={`${distanceMiles} miles`} />
          <Row label="Estimated Drive Time" value={durationText || "N/A"} />
          <Row
            label="Fare Method"
            value={`$${tier.baseFareAmount.toFixed(2)} base + $${tier.mileageRate.toFixed(2)}/mile`}
          />
          <Row label="Trip Type" value={tripType} />
          <Row label="Ride Category" value={rideCategory} />
          <Row label="Mileage Fare" value={`$${mileageFare.toFixed(2)}`} />
          <Row label="Base + Mileage" value={`$${oneWayFare.toFixed(2)}`} />

          {tripType === "Round Trip" && (
            <Row
              label="Round-trip Adjustment"
              value={`$${roundTripAdjustment.toFixed(2)}`}
            />
          )}

          <Row
            label="Student Discount"
            value={`-$${studentDiscount.toFixed(2)}`}
          />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Final Price</Text>
            <Text style={styles.totalValue}>${finalPrice.toFixed(2)}</Text>
          </View>
        </View>
      )}

      <Text style={styles.notice}>
        This is an estimate. Angel Express may review and confirm the final fare
        based on route, wait time, airport pickup, event traffic, and special
        requests.
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={confirmBooking}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Continue to Confirm Booking</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back to Booking Form</Text>
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

  label: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 4,
  },

  value: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
  },

  gpsText: {
    color: "#22c55e",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 14,
  },

  loadingCard: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 30,
    marginBottom: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },

  loadingText: {
    color: "#FFFFFF",
    marginTop: 14,
    fontSize: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  rowLabel: {
    color: "#C9D0D8",
    fontSize: 15,
    flex: 1,
  },

  rowValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
    flex: 1,
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