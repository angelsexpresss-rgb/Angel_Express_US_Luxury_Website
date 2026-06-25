import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function ContactCenterScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  async function loadContacts() {
    try {
      setLoading(true);

      const { data: tripsData, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .in("status", [
          "Pending",
          "Confirmed",
          "Driver Assigned",
          "Arrived at Pickup",
          "Picked Up",
          "In Progress",
          "assigned",
          "driver_arrived",
          "in_progress",
        ])
        .order("created_at", { ascending: false });

      if (tripsError) throw tripsError;

      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

      if (driversError) throw driversError;

      setActiveTrips(tripsData || []);
      setDrivers(driversData || []);
    } catch (err: any) {
      Alert.alert("Contact Center Error", err.message || "Unable to load contacts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function cleanPhone(phone?: string) {
    return String(phone || "").replace(/[^\d+]/g, "");
  }

  function callNumber(phone?: string) {
    const cleaned = cleanPhone(phone);
    if (!cleaned) return Alert.alert("No phone number", "No phone number is available.");
    Linking.openURL(`tel:${cleaned}`);
  }

  function textNumber(phone?: string, message?: string) {
    const cleaned = cleanPhone(phone);
    if (!cleaned) return Alert.alert("No phone number", "No phone number is available.");
    Linking.openURL(`sms:${cleaned}?body=${encodeURIComponent(message || "")}`);
  }

  function whatsappNumber(phone?: string, message?: string) {
    const cleaned = cleanPhone(phone);
    if (!cleaned) return Alert.alert("No phone number", "No WhatsApp number is available.");
    Linking.openURL(`https://wa.me/${cleaned}?text=${encodeURIComponent(message || "")}`);
  }

  function openChat(trip: any, receiverRole: "passenger" | "driver" | "emergency") {
    router.push({
      pathname: "/owner-chat",
      params: {
        bookingId: String(trip.id),
        receiverRole,
        passengerName: getPassengerName(trip),
        driverName: getDriverName(trip),
      },
    } as any);
  }

  function getPassengerName(trip: any) {
    return trip.name || trip.passenger_name || trip.full_name || "Passenger";
  }

  function getPassengerPhone(trip: any) {
    return trip.phone || trip.passenger_phone || "";
  }

  function getEmergencyName(trip: any) {
    return trip.emergency_contact_name || "Emergency Contact";
  }

  function getEmergencyPhone(trip: any) {
    return trip.emergency_contact_phone || "";
  }

  function getDriverName(trip: any) {
    return trip.driver_name || trip.assigned_driver_name || "Assigned Driver";
  }

  function getDriverPhone(trip: any) {
    return trip.driver_phone || trip.assigned_driver_phone || "";
  }

  function getDriverDisplayName(driver: any) {
    return (
      `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
      driver.full_name ||
      driver.name ||
      "Driver"
    );
  }

  function getDriverPhoneFromDriver(driver: any) {
    return driver.phone || driver.driver_phone || "";
  }

  const tripsWithPassengers = activeTrips.filter((trip) => getPassengerPhone(trip));
  const tripsWithDrivers = activeTrips.filter((trip) => getDriverPhone(trip));
  const tripsWithEmergency = activeTrips.filter((trip) => getEmergencyPhone(trip));
  const onlineDrivers = drivers.filter((driver) => driver.is_online === true);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading Contact Center...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadContacts();
          }}
        />
      }
    >
      <Text style={styles.title}>☎️ Contact Center</Text>

      <Text style={styles.subtitle}>
        Contact passengers, drivers, emergency contacts, and active trip teams.
      </Text>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{tripsWithPassengers.length}</Text>
          <Text style={styles.statLabel}>Active Passengers</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{tripsWithDrivers.length}</Text>
          <Text style={styles.statLabel}>Assigned Drivers</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{tripsWithEmergency.length}</Text>
          <Text style={styles.statLabel}>Emergency Contacts</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{onlineDrivers.length}</Text>
          <Text style={styles.statLabel}>Online Drivers</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Passengers On Active Trips</Text>

      {tripsWithPassengers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active passengers available.</Text>
        </View>
      ) : (
        tripsWithPassengers.map((trip) => {
          const passengerName = getPassengerName(trip);
          const passengerPhone = getPassengerPhone(trip);
          const message = `Hello ${passengerName}, this is Angel Express contacting you about Trip #${trip.id}.`;

          return (
            <View key={`passenger-${trip.id}`} style={styles.contactCard}>
              <Text style={styles.contactName}>{passengerName}</Text>
              <Text style={styles.contactText}>Trip #{trip.id}</Text>
              <Text style={styles.contactText}>Phone: {passengerPhone}</Text>
              <Text style={styles.contactText}>Status: {trip.status || "Active"}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.callButton} onPress={() => callNumber(passengerPhone)}>
                  <Text style={styles.buttonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.smsButton} onPress={() => textNumber(passengerPhone, message)}>
                  <Text style={styles.whiteButtonText}>SMS</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.whatsappButton} onPress={() => whatsappNumber(passengerPhone, message)}>
                  <Text style={styles.whiteButtonText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chatButton} onPress={() => openChat(trip, "passenger")}>
                  <Text style={styles.whiteButtonText}>In-App Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.sectionTitle}>Assigned Drivers On Active Trips</Text>

      {tripsWithDrivers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No assigned driver contacts available yet.</Text>
        </View>
      ) : (
        tripsWithDrivers.map((trip) => {
          const driverName = getDriverName(trip);
          const driverPhone = getDriverPhone(trip);
          const message = `Angel Express dispatch update for Trip #${trip.id}.`;

          return (
            <View key={`driver-trip-${trip.id}`} style={styles.contactCard}>
              <Text style={styles.contactName}>{driverName}</Text>
              <Text style={styles.contactText}>Trip #{trip.id}</Text>
              <Text style={styles.contactText}>Phone: {driverPhone}</Text>
              <Text style={styles.contactText}>Passenger: {getPassengerName(trip)}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.callButton} onPress={() => callNumber(driverPhone)}>
                  <Text style={styles.buttonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.smsButton} onPress={() => textNumber(driverPhone, message)}>
                  <Text style={styles.whiteButtonText}>SMS</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.whatsappButton} onPress={() => whatsappNumber(driverPhone, message)}>
                  <Text style={styles.whiteButtonText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chatButton} onPress={() => openChat(trip, "driver")}>
                  <Text style={styles.whiteButtonText}>In-App Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.sectionTitle}>Emergency Contacts</Text>

      {tripsWithEmergency.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No emergency contacts found for active trips.</Text>
        </View>
      ) : (
        tripsWithEmergency.map((trip) => {
          const emergencyName = getEmergencyName(trip);
          const emergencyPhone = getEmergencyPhone(trip);
          const message = `Hello ${emergencyName}, this is Angel Express contacting you regarding ${getPassengerName(trip)}'s active trip.`;

          return (
            <View key={`emergency-${trip.id}`} style={styles.emergencyCard}>
              <Text style={styles.contactName}>🚨 {emergencyName}</Text>
              <Text style={styles.contactText}>For passenger: {getPassengerName(trip)}</Text>
              <Text style={styles.contactText}>Trip #{trip.id}</Text>
              <Text style={styles.contactText}>Phone: {emergencyPhone}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.emergencyCallButton} onPress={() => callNumber(emergencyPhone)}>
                  <Text style={styles.whiteButtonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.smsButton} onPress={() => textNumber(emergencyPhone, message)}>
                  <Text style={styles.whiteButtonText}>SMS</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.whatsappButton} onPress={() => whatsappNumber(emergencyPhone, message)}>
                  <Text style={styles.whiteButtonText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chatButton} onPress={() => openChat(trip, "emergency")}>
                  <Text style={styles.whiteButtonText}>In-App Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.sectionTitle}>All Drivers</Text>

      {drivers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No drivers found.</Text>
        </View>
      ) : (
        drivers.map((driver) => {
          const driverName = getDriverDisplayName(driver);
          const driverPhone = getDriverPhoneFromDriver(driver);
          const message = `Hello ${driverName}, this is Angel Express dispatch.`;

          return (
            <View key={`driver-${driver.id}`} style={styles.driverDirectoryCard}>
              <Text style={styles.contactName}>{driverName}</Text>
              <Text style={styles.contactText}>Phone: {driverPhone || "Not available"}</Text>
              <Text style={styles.contactText}>
                Status: {driver.status || "unknown"} {driver.is_online ? "• 🟢 Online" : ""}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.callButton} onPress={() => callNumber(driverPhone)}>
                  <Text style={styles.buttonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.smsButton} onPress={() => textNumber(driverPhone, message)}>
                  <Text style={styles.whiteButtonText}>SMS</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.whatsappButton} onPress={() => whatsappNumber(driverPhone, message)}>
                  <Text style={styles.whiteButtonText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.disabledChatButton}
                  onPress={() =>
                    Alert.alert(
                      "Driver Chat",
                      "In-app chat with all drivers will be added after we connect driver accounts to chat threads."
                    )
                  }
                >
                  <Text style={styles.whiteButtonText}>In-App Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07111f", padding: 20 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07111f",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#fff", marginTop: 10 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginTop: 50,
  },
  subtitle: {
    color: "#d4af37",
    marginBottom: 14,
    lineHeight: 21,
  },
  backButton: {
    backgroundColor: "rgba(212,175,55,0.15)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  backButtonText: {
    color: "#d4af37",
    fontWeight: "900",
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#d4af37",
    marginBottom: 12,
  },
  statNumber: {
    color: "#d4af37",
    fontSize: 34,
    fontWeight: "900",
  },
  statLabel: { color: "#fff", marginTop: 4 },
  sectionTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 18,
  },
  emptyText: { color: "#cbd5e1", lineHeight: 21 },
  contactCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 12,
  },
  emergencyCard: {
    backgroundColor: "#1f0f12",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ef4444",
    marginBottom: 12,
  },
  driverDirectoryCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 12,
  },
  contactName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  contactText: {
    color: "#cbd5e1",
    marginBottom: 5,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  callButton: {
    flex: 1,
    backgroundColor: "#d4af37",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  emergencyCallButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  smsButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  chatButton: {
    flex: 1,
    backgroundColor: "#7c3aed",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledChatButton: {
    flex: 1,
    backgroundColor: "#475569",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#07111f",
    fontWeight: "900",
    fontSize: 12,
  },
  whiteButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  bottomSpace: { height: 50 },
});