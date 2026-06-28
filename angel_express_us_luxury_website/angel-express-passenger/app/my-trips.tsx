import * as Linking from "expo-linking";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  CalendarDays,
  CarFront,
  CreditCard,
  MapPinned,
  MessageCircle,
  Phone,
  ReceiptText,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelDropdown,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

export default function MyTripsScreen() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.title}>My Trips</Text>
            <Text style={styles.subtitle}>
              View rides booked from the Angel Express app or website.
            </Text>

            {loading ? (
              <AngelCard style={styles.loadingBox}>
                <ActivityIndicator color={GOLD} size="large" />
                <Text style={styles.loadingText}>Loading your trips...</Text>
              </AngelCard>
            ) : trips.length === 0 ? (
              <AngelCard style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Trips Yet</Text>
                <Text style={styles.emptyText}>
                  Your bookings will appear here after you request a ride.
                </Text>

                <AngelHeroButton
                  title="Book a Ride"
                  onPress={() => router.push("/book-ride" as any)}
                  variant="gold"
                  style={styles.emptyButton}
                />
              </AngelCard>
            ) : (
              <View style={styles.dropdownBox}>
                {sections.map((section, index) => (
                  <AngelDropdown
                    key={section.title}
                    title={`${section.title} (${section.trips.length})`}
                    defaultOpen={index === 0}
                  >
                    {section.trips.length === 0 ? (
                      <Text style={styles.noTripsText}>
                        No {section.title.toLowerCase()} trips.
                      </Text>
                    ) : (
                      section.trips.map((trip) => (
                        <TripCard key={String(trip.id)} trip={trip} />
                      ))
                    )}
                  </AngelDropdown>
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
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
    <AngelCard style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.invoiceRow}>
          <ReceiptText size={18} color={GOLD} />
          <Text style={styles.invoice}>{invoice}</Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.status}>{status}</Text>
        </View>
      </View>

      <View style={styles.lifecycleBox}>
        <ShieldCheck size={18} color={GOLD} />
        <Text style={styles.lifecycleText}>
          {getLifecycleMessage(status, paymentStatus)}
        </Text>
      </View>

      {trip.driver_id ? (
        <View style={styles.driverCard}>
          <View style={styles.driverTitleRow}>
            <UserRound size={20} color={GOLD} />
            <Text style={styles.driverCardTitle}>Your Chauffeur</Text>
          </View>

          {driverLoading ? (
            <Text style={styles.driverMuted}>Loading chauffeur details...</Text>
          ) : driver ? (
            <>
              <Text style={styles.driverName}>
                {driver.full_name ||
                  `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
                  "Angel Express Chauffeur"}
              </Text>

              <View style={styles.driverMetaRow}>
                <Star size={16} color={GOLD} />
                <Text style={styles.driverRating}>
                  {Number(driver.rating || 5).toFixed(1)} Rating •{" "}
                  {driver.total_trips || 0} Trips
                </Text>
              </View>

              <Text style={styles.driverLevel}>
                {driver.driver_level || "Bronze"} Chauffeur
              </Text>

              <InfoLine
                label="Vehicle"
                value={
                  [driver.vehicle_year, driver.vehicle_make, driver.vehicle_model]
                    .filter(Boolean)
                    .join(" ") || "Vehicle not added"
                }
              />

              <InfoLine
                label="Plate Number"
                value={driver.plate_number || "Not provided"}
              />

              <InfoLine
                label="Experience"
                value={
                  driver.years_driving
                    ? `${driver.years_driving} year(s) driving`
                    : "Experience not added"
                }
              />

              <View style={styles.safetyBadge}>
                <Text style={styles.safetyBadgeText}>
                  {driver.safety_badge
                    ? "Angel Express Safety Verified"
                    : "Angel Express Approved Chauffeur"}
                </Text>
              </View>

              <View style={styles.driverContactRow}>
                <TouchableOpacity style={styles.driverContactButton} onPress={callDriver}>
                  <Phone size={16} color={AE_COLORS.navy2} />
                  <Text style={styles.driverContactText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.driverContactButton} onPress={textDriver}>
                  <MessageCircle size={16} color={AE_COLORS.navy2} />
                  <Text style={styles.driverContactText}>Text</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.driverMuted}>
              Chauffeur assigned. Details will appear shortly.
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.noDriverBox}>
          <Text style={styles.noDriverText}>Chauffeur assignment pending.</Text>
        </View>
      )}

      <View style={styles.routeBox}>
        <View style={styles.routeLine}>
          <MapPinned size={18} color={GOLD} />
          <Text style={styles.route}>{pickup}</Text>
        </View>

        <Text style={styles.routeArrow}>↓</Text>

        <View style={styles.routeLine}>
          <CarFront size={18} color={GOLD} />
          <Text style={styles.route}>{dropoff}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Detail icon={<CalendarDays size={16} color={GOLD} />} text={`Date: ${date}`} />
        <Detail icon={<CalendarDays size={16} color={GOLD} />} text={`Time: ${time}`} />
        <Detail icon={<NavigationIcon />} text={`Distance: ${miles} miles`} />
        <Detail icon={<CreditCard size={16} color={GOLD} />} text={`Total: $${total.toFixed(2)}`} />
        <Detail icon={<CreditCard size={16} color={GOLD} />} text={`Payment: ${paymentStatus}`} />
        <Detail icon={<ReceiptText size={16} color={GOLD} />} text={`Source: ${source}`} />
      </View>

      {canPayRide && (
        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>Ride Completed — Payment Due</Text>
          <Text style={styles.paymentText}>
            Full Ride Fare: ${total.toFixed(2)}
          </Text>

          <AngelHeroButton
            title="Pay Ride"
            onPress={openPayRide}
            variant="gold"
            style={styles.payButton}
          />
        </View>
      )}

      {isPaid && (
        <View style={styles.paidBox}>
          <Text style={styles.paidText}>Paid</Text>
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
    </AngelCard>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.driverInfoBox}>
      <Text style={styles.driverInfoLabel}>{label}</Text>
      <Text style={styles.driverInfoValue}>{value}</Text>
    </View>
  );
}

function Detail({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.detailRow}>
      {icon}
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

function NavigationIcon() {
  return <MapPinned size={16} color={GOLD} />;
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
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
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

  loadingBox: {
    alignItems: "center",
    padding: 28,
  },

  loadingText: {
    color: AE_COLORS.white,
    marginTop: 14,
    fontSize: 16,
  },

  emptyBox: {
    padding: 24,
  },

  emptyTitle: {
    color: GOLD,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 10,
  },

  emptyText: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 22,
  },

  emptyButton: {
    marginTop: 6,
  },

  dropdownBox: {
    gap: 14,
  },

  noTripsText: {
    color: AE_COLORS.muted,
    fontSize: 15,
    paddingVertical: 12,
  },

  card: {
    padding: 18,
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
    alignItems: "center",
  },

  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  invoice: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "900",
    flex: 1,
  },

  statusPill: {
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.34)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(212,175,55,0.10)",
  },

  status: {
    color: AE_COLORS.white,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  lifecycleBox: {
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
    flexDirection: "row",
    gap: 10,
  },

  lifecycleText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    flex: 1,
  },

  driverCard: {
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },

  driverTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 8,
  },

  driverCardTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
  },

  driverName: {
    color: AE_COLORS.white,
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 6,
  },

  driverMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 5,
  },

  driverRating: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "800",
  },

  driverLevel: {
    color: AE_COLORS.white,
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
    color: AE_COLORS.white,
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
    gap: 10,
  },

  driverContactButton: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  driverContactText: {
    color: AE_COLORS.navy2,
    fontSize: 14,
    fontWeight: "900",
  },

  driverMuted: {
    color: AE_COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },

  noDriverBox: {
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
  },

  noDriverText: {
    color: GOLD,
    fontWeight: "800",
  },

  routeBox: {
    marginTop: 2,
  },

  routeLine: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },

  route: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 23,
    flex: 1,
  },

  routeArrow: {
    color: GOLD,
    fontSize: 20,
    marginVertical: 4,
    marginLeft: 4,
  },

  details: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(212,175,55,0.12)",
    paddingTop: 12,
    gap: 8,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  detailText: {
    color: AE_COLORS.muted,
    fontSize: 14,
    flex: 1,
  },

  paymentBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: GOLD,
  },

  paymentTitle: {
    color: GOLD,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },

  paymentText: {
    color: AE_COLORS.white,
    fontSize: 14,
    marginBottom: 10,
    fontWeight: "700",
  },

  payButton: {
    marginTop: 8,
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
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 14,
  },

  manageButtonText: {
    color: AE_COLORS.navy2,
    fontSize: 15,
    fontWeight: "900",
  },

  rateButton: {
    borderWidth: 1,
    borderColor: GOLD,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },

  rateButtonText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "900",
  },
});