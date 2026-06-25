import * as Linking from "expo-linking";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

export default function MyTripsScreen() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [openStatus, setOpenStatus] = useState("Pending");

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [])
  );

  async function loadTrips() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const userEmail = user.email?.trim().toLowerCase();

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTrips(data || []);
    } catch (error: any) {
      Alert.alert("Trips Error", error.message || "Could not load trips.");
    } finally {
      setLoading(false);
    }
  }

  const sections = [
    {
      title: "Pending",
      trips: trips.filter((t) => normalize(t.status) === "pending"),
    },
    {
      title: "Assigned",
      trips: trips.filter((t) =>
        ["assigned", "driver_arrived"].includes(normalize(t.status))
      ),
    },
    {
      title: "In Progress",
      trips: trips.filter((t) => normalize(t.status) === "in_progress"),
    },
    {
      title: "Completed",
      trips: trips.filter((t) => normalize(t.status) === "completed"),
    },
    {
      title: "Cancelled",
      trips: trips.filter((t) => normalize(t.status) === "cancelled"),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Trips</Text>
      <Text style={styles.subtitle}>
        View rides booked from the Angel Express app or website.
      </Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#D4AF37" size="large" />
          <Text style={styles.loadingText}>Loading your trips...</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No Trips Yet</Text>
          <Text style={styles.emptyText}>
            Your bookings will appear here after you request a ride.
          </Text>
        </View>
      ) : (
        <View style={styles.dropdownBox}>
          {sections.map((section) => (
            <View key={section.title} style={styles.dropdownSection}>
              <TouchableOpacity
                style={[
                  styles.dropdownHeader,
                  openStatus === section.title && styles.dropdownHeaderActive,
                ]}
                onPress={() =>
                  setOpenStatus(openStatus === section.title ? "" : section.title)
                }
              >
                <Text style={styles.dropdownTitle}>
                  {section.title} ({section.trips.length})
                </Text>
                <Text style={styles.dropdownIcon}>
                  {openStatus === section.title ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {openStatus === section.title && (
                <View style={styles.dropdownContent}>
                  {section.trips.length === 0 ? (
                    <Text style={styles.noTripsText}>
                      No {section.title.toLowerCase()} trips.
                    </Text>
                  ) : (
                    section.trips.map((trip) => (
                      <TripCard key={String(trip.id)} trip={trip} />
                    ))
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function TripCard({ trip }: { trip: any }) {
  const [driver, setDriver] = useState<any>(null);
  const [driverLoading, setDriverLoading] = useState(false);

  const pickup = trip.pickup_address || trip.pickup || "Pickup not added";
  const dropoff = trip.dropoff_address || trip.dropoff || "Drop-off not added";
  const date = trip.ride_date || trip.date || "Date not added";
  const time = trip.ride_time || trip.time || "Time not added";
  const status = trip.status || "Pending";
  const normalizedStatus = normalize(status);
  const paymentStatus = normalize(trip.payment_status || "unpaid");

  const invoice = trip.invoice_no || "No invoice yet";
  const total = Number(trip.total_fare || trip.total || 0);
  const source = trip.source || "website";
  const miles = Number(trip.estimated_miles || trip.miles || 0);

  const canPayRide = normalizedStatus === "completed" && paymentStatus !== "paid";
  const isPaid = normalizedStatus === "completed" && paymentStatus === "paid";

  useEffect(() => {
    if (trip.driver_id) {
      loadDriverCard();
    }
  }, [trip.driver_id]);

  async function loadDriverCard() {
    try {
      setDriverLoading(true);

      const { data, error } = await supabase
        .from("drivers")
        .select(
          "id, full_name, first_name, last_name, phone, rating, total_trips, driver_level, vehicle_make, vehicle_model, vehicle_year, plate_number, years_driving, safety_badge"
        )
        .eq("id", trip.driver_id)
        .maybeSingle();

      if (error) throw error;

      setDriver(data || null);
    } catch {
      setDriver(null);
    } finally {
      setDriverLoading(false);
    }
  }

  function cleanPhone(phone: string) {
    return phone.replace(/[^\d+]/g, "");
  }

  function callDriver() {
    if (!driver?.phone) {
      Alert.alert("Phone Missing", "Chauffeur phone number is not available.");
      return;
    }

    Linking.openURL(`tel:${cleanPhone(driver.phone)}`);
  }

  function textDriver() {
    if (!driver?.phone) {
      Alert.alert("Phone Missing", "Chauffeur phone number is not available.");
      return;
    }

    Linking.openURL(`sms:${cleanPhone(driver.phone)}`);
  }

  function openManageBooking() {
    router.push({
      pathname: "/manage-booking" as any,
      params: {
        booking_id: String(trip.id || ""),
        invoice_no: String(trip.invoice_no || ""),
      },
    });
  }

  function openRateDriver() {
    router.push({
      pathname: "/rate-driver" as any,
      params: {
        booking_id: String(trip.id || ""),
        invoice_no: String(trip.invoice_no || ""),
      },
    });
  }

  function openPayRide() {
    router.push({
      pathname: "/pay-ride" as any,
      params: {
        bookingId: String(trip.id || ""),
      },
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.invoice}>{invoice}</Text>
        <Text style={styles.status}>{status}</Text>
      </View>

      <View style={styles.lifecycleBox}>
        <Text style={styles.lifecycleText}>
          {getLifecycleMessage(status, paymentStatus)}
        </Text>
      </View>

      {trip.driver_id && (
        <View style={styles.driverCard}>
          <Text style={styles.driverCardTitle}>Your Chauffeur</Text>

          {driverLoading ? (
            <Text style={styles.driverMuted}>Loading chauffeur details...</Text>
          ) : driver ? (
            <>
              <Text style={styles.driverName}>
                {driver.full_name ||
                  `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
                  "Angel Express Chauffeur"}
              </Text>

              <Text style={styles.driverRating}>
                ⭐ {Number(driver.rating || 5).toFixed(1)} Rating •{" "}
                {driver.total_trips || 0} Trips
              </Text>

              <Text style={styles.driverLevel}>
                {driver.driver_level || "Bronze"} Chauffeur
              </Text>

              <View style={styles.driverInfoBox}>
                <Text style={styles.driverInfoLabel}>Vehicle</Text>
                <Text style={styles.driverInfoValue}>
                  {[driver.vehicle_year, driver.vehicle_make, driver.vehicle_model]
                    .filter(Boolean)
                    .join(" ") || "Vehicle not added"}
                </Text>
              </View>

              <View style={styles.driverInfoBox}>
                <Text style={styles.driverInfoLabel}>Plate Number</Text>
                <Text style={styles.driverInfoValue}>
                  {driver.plate_number || "Not provided"}
                </Text>
              </View>

              <View style={styles.driverInfoBox}>
                <Text style={styles.driverInfoLabel}>Experience</Text>
                <Text style={styles.driverInfoValue}>
                  {driver.years_driving
                    ? `${driver.years_driving} year(s) driving`
                    : "Experience not added"}
                </Text>
              </View>

              <View style={styles.safetyBadge}>
                <Text style={styles.safetyBadgeText}>
                  {driver.safety_badge
                    ? "Angel Express Safety Verified ✅"
                    : "Angel Express Approved Chauffeur"}
                </Text>
              </View>

              <View style={styles.driverContactRow}>
                <TouchableOpacity style={styles.driverContactButton} onPress={callDriver}>
                  <Text style={styles.driverContactText}>Call Chauffeur</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.driverContactButton} onPress={textDriver}>
                  <Text style={styles.driverContactText}>Text Chauffeur</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.driverMuted}>
              Chauffeur assigned. Details will appear shortly.
            </Text>
          )}
        </View>
      )}

      {!trip.driver_id && (
        <View style={styles.noDriverBox}>
          <Text style={styles.noDriverText}>
            Chauffeur assignment pending.
          </Text>
        </View>
      )}

      <Text style={styles.route}>{pickup}</Text>
      <Text style={styles.arrow}>↓</Text>
      <Text style={styles.route}>{dropoff}</Text>

      <View style={styles.details}>
        <Text style={styles.detailText}>Date: {date}</Text>
        <Text style={styles.detailText}>Time: {time}</Text>
        <Text style={styles.detailText}>Distance: {miles} miles</Text>
        <Text style={styles.detailText}>Total: ${total.toFixed(2)}</Text>
        <Text style={styles.detailText}>Payment: {paymentStatus}</Text>
        <Text style={styles.detailText}>Source: {source}</Text>
      </View>

      {canPayRide && (
        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>Ride Completed — Payment Due</Text>
          <Text style={styles.paymentText}>
            Full Ride Fare: ${total.toFixed(2)}
          </Text>

          <TouchableOpacity style={styles.payButton} onPress={openPayRide}>
            <Text style={styles.payButtonText}>Pay Ride</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPaid && (
        <View style={styles.paidBox}>
          <Text style={styles.paidText}>Paid ✅</Text>
        </View>
      )}

      <TouchableOpacity style={styles.manageButton} onPress={openManageBooking}>
        <Text style={styles.manageButtonText}>Manage Booking</Text>
      </TouchableOpacity>

      {normalizedStatus === "completed" && (
        <TouchableOpacity style={styles.rateButton} onPress={openRateDriver}>
          <Text style={styles.rateButtonText}>Rate Your Chauffeur</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function getLifecycleMessage(status: string, paymentStatus: string) {
  const normalizedStatus = normalize(status);
  const normalizedPayment = normalize(paymentStatus);

  if (normalizedStatus === "pending") {
    return "Waiting for Angel Express to review your ride.";
  }

  if (normalizedStatus === "assigned") {
    return "Your chauffeur has accepted this ride.";
  }

  if (normalizedStatus === "driver_arrived") {
    return "Your chauffeur has arrived at pickup.";
  }

  if (normalizedStatus === "in_progress") {
    return "Ride in progress.";
  }

  if (normalizedStatus === "completed" && normalizedPayment === "paid") {
    return "Ride completed and paid.";
  }

  if (normalizedStatus === "completed") {
    return "Ride completed. Payment is now due.";
  }

  if (normalizedStatus === "cancelled") {
    return "This ride was cancelled.";
  }

  return "Ride status updated.";
}

function normalize(status: string) {
  return String(status || "pending").trim().toLowerCase();
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
  loadingBox: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 14,
    fontSize: 16,
  },
  emptyBox: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  emptyTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },
  emptyText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
  },
  dropdownBox: {
    gap: 14,
  },
  dropdownSection: {
    backgroundColor: "#071426",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    overflow: "hidden",
  },
  dropdownHeader: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#071426",
  },
  dropdownHeaderActive: {
    backgroundColor: "rgba(212,175,55,0.1)",
  },
  dropdownTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "900",
  },
  dropdownIcon: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
  },
  dropdownContent: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(212,175,55,0.14)",
  },
  noTripsText: {
    color: "#C9D0D8",
    fontSize: 15,
    paddingVertical: 10,
  },
  card: {
    backgroundColor: "#040C18",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  invoice: {
    color: "#D4AF37",
    fontSize: 15,
    fontWeight: "900",
    flex: 1,
  },
  status: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  lifecycleBox: {
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  lifecycleText: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  driverCard: {
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "#D4AF37",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  driverCardTitle: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  driverName: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 5,
  },
  driverRating: {
    color: "#D4AF37",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 5,
  },
  driverLevel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  driverInfoBox: {
    marginBottom: 10,
  },
  driverInfoLabel: {
    color: "#8A93A3",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  driverInfoValue: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  safetyBadge: {
    backgroundColor: "rgba(46,204,113,0.12)",
    borderWidth: 1,
    borderColor: "rgba(46,204,113,0.45)",
    borderRadius: 12,
    padding: 11,
    marginTop: 4,
    marginBottom: 12,
  },
  safetyBadgeText: {
    color: "#2ECC71",
    fontWeight: "900",
    textAlign: "center",
  },
  driverContactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  driverContactButton: {
    flex: 1,
    backgroundColor: "#D4AF37",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  driverContactText: {
    color: "#071426",
    fontSize: 13,
    fontWeight: "900",
  },
  driverMuted: {
    color: "#C9D0D8",
    fontSize: 14,
    lineHeight: 20,
  },
  noDriverBox: {
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noDriverText: {
    color: "#D4AF37",
    fontWeight: "800",
  },
  route: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 23,
  },
  arrow: {
    color: "#D4AF37",
    fontSize: 20,
    marginVertical: 4,
  },
  details: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(212,175,55,0.12)",
    paddingTop: 12,
  },
  detailText: {
    color: "#C9D0D8",
    fontSize: 14,
    marginBottom: 6,
  },
  paymentBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(212,175,55,0.1)",
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  paymentTitle: {
    color: "#D4AF37",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  paymentText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "700",
  },
  payButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  payButtonText: {
    color: "#071426",
    fontSize: 15,
    fontWeight: "900",
  },
  paidBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(46,204,113,0.12)",
    borderWidth: 1,
    borderColor: "rgba(46,204,113,0.4)",
  },
  paidText: {
    color: "#2ECC71",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  manageButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 14,
  },
  manageButtonText: {
    color: "#071426",
    fontSize: 15,
    fontWeight: "900",
  },
  rateButton: {
    borderWidth: 1,
    borderColor: "#D4AF37",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  rateButtonText: {
    color: "#D4AF37",
    fontSize: 15,
    fontWeight: "900",
  },
});