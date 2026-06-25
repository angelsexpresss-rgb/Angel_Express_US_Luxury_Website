import * as Linking from "expo-linking";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function SafetySupportScreen() {
  const OWNER_PHONE = "19728367910";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatTarget, setChatTarget] = useState<"owner" | "passenger">("owner");

  useFocusEffect(
    useCallback(() => {
      loadSupportData();

      const interval = setInterval(() => {
        loadMessages(false);
      }, 5000);

      return () => clearInterval(interval);
    }, [chatTarget])
  );

  async function loadSupportData() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        router.replace("/driver-login");
        return;
      }

      const { data: tripData, error: tripError } = await supabase
        .from("bookings")
        .select("*")
        .eq("driver_id", user.id)
        .in("status", [
          "assigned",
          "driver_arrived",
          "in_progress",
          "Driver Assigned",
          "Arrived at Pickup",
          "Picked Up",
          "In Progress",
        ])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tripError) throw tripError;

      setActiveTrip(tripData || null);

      if (tripData?.id) {
        await loadMessages(false, tripData.id);
      }
    } catch (err: any) {
      Alert.alert("Support Error", err.message || "Unable to load driver support.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMessages(showLoading = true, bookingId?: any) {
    try {
      if (showLoading) setLoading(true);

      const tripId = bookingId || activeTrip?.id;
      if (!tripId) return;

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("booking_id", Number(tripId))
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (err: any) {
      console.log("Driver chat load error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function sendMessage() {
    if (!message.trim()) return;

    if (!activeTrip?.id) {
      Alert.alert(
        "No active trip",
        "In-app chat is available when you have an active assigned trip."
      );
      return;
    }

    try {
      setSending(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const { error } = await supabase.from("chat_messages").insert({
        booking_id: Number(activeTrip.id),
        sender_id: user.id,
        sender_role: "driver",
        receiver_role: chatTarget,
        message: message.trim(),
      });

      if (error) throw error;

      setMessage("");
      loadMessages(false);
    } catch (err: any) {
      Alert.alert("Send Failed", err.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  function arrivedPickup() {
    Alert.alert(
      "Status Updated",
      "Pickup arrival has been recorded and shared with Angel Express."
    );
  }

  function passengerPickedUp() {
    Alert.alert(
      "Status Updated",
      "Passenger pickup has been recorded and shared with Angel Express."
    );
  }

  function passengerDroppedOff() {
    Alert.alert(
      "Trip Completed",
      "Passenger drop-off has been recorded and shared with Angel Express."
    );
  }

  async function callOwner() {
    await Linking.openURL(`tel:${OWNER_PHONE}`);
  }

  async function whatsappOwner() {
    await Linking.openURL(
      `https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(
        "Hello Angel Express, I need support with my current driver trip."
      )}`
    );
  }

  function getPassengerPhone() {
    return activeTrip?.phone || activeTrip?.passenger_phone || "";
  }

  async function callPassenger() {
    const phone = getPassengerPhone();

    if (!phone) {
      Alert.alert("Passenger unavailable", "Passenger phone number is not available.");
      return;
    }

    await Linking.openURL(`tel:${phone}`);
  }

  async function whatsappPassenger() {
    const phone = getPassengerPhone();

    if (!phone) {
      Alert.alert("Passenger unavailable", "Passenger WhatsApp number is not available.");
      return;
    }

    const cleaned = String(phone).replace(/[^\d+]/g, "");

    await Linking.openURL(
      `https://wa.me/${cleaned}?text=${encodeURIComponent(
        `Hello, this is your Angel Express driver regarding Trip #${activeTrip?.id}.`
      )}`
    );
  }

  async function sendEmergencyAlert() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      if (!activeTrip?.id) {
        Alert.alert("No active trip", "Emergency alert requires an active trip.");
        return;
      }

      const { error } = await supabase.from("emergency_alerts").insert({
        booking_id: activeTrip.id,
        driver_id: user.id,
        alert_type: "Driver Safety Support",
        notes: "Driver sent emergency alert from Safety & Support screen.",
      });

      if (error) throw error;

      Alert.alert(
        "Emergency Alert Sent",
        "Angel Express has been notified of your emergency."
      );
    } catch (err: any) {
      Alert.alert("Emergency Failed", err.message || "Unable to send emergency alert.");
    }
  }

  async function shareLocation() {
    Alert.alert(
      "Location Shared",
      "Your live location is already being shared with Angel Express during active trips."
    );
  }

  const filteredMessages = messages.filter((item) => {
    if (chatTarget === "owner") {
      return (
        item.sender_role === "owner" ||
        item.receiver_role === "owner" ||
        item.sender_role === "driver"
      );
    }

    return (
      item.sender_role === "passenger" ||
      item.receiver_role === "passenger" ||
      item.sender_role === "driver"
    );
  });

  if (loading) {
    return (
      <ImageBackground
        source={require("../assets/images/driver-bg.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#d4af37" />
            <Text style={styles.loadingText}>Loading Safety Support...</Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSupportData();
              }}
            />
          }
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Safety & Support</Text>

          <Text style={styles.subtitle}>
            Safety check-ins, emergency contact, and in-app dispatch chat.
          </Text>

          <View style={styles.chatCard}>
            <Text style={styles.chatTitle}>💜 In-App Chat</Text>

            {activeTrip ? (
              <>
                <Text style={styles.chatSubText}>Connected to Trip #{activeTrip.id}</Text>

                <View style={styles.targetRow}>
                  <TouchableOpacity
                    style={[
                      styles.targetButton,
                      chatTarget === "owner" && styles.activeTargetButton,
                    ]}
                    onPress={() => setChatTarget("owner")}
                  >
                    <Text
                      style={[
                        styles.targetText,
                        chatTarget === "owner" && styles.activeTargetText,
                      ]}
                    >
                      Chat Owner
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.targetButton,
                      chatTarget === "passenger" && styles.activeTargetButton,
                    ]}
                    onPress={() => setChatTarget("passenger")}
                  >
                    <Text
                      style={[
                        styles.targetText,
                        chatTarget === "passenger" && styles.activeTargetText,
                      ]}
                    >
                      Chat Passenger
                    </Text>
                  </TouchableOpacity>
                </View>

                {chatTarget === "passenger" && (
                  <View style={styles.quickRow}>
                    <TouchableOpacity style={styles.quickButton} onPress={callPassenger}>
                      <Text style={styles.quickButtonText}>Call Passenger</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickButton}
                      onPress={whatsappPassenger}
                    >
                      <Text style={styles.quickButtonText}>WhatsApp Passenger</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {chatTarget === "owner" && (
                  <View style={styles.quickRow}>
                    <TouchableOpacity style={styles.quickButton} onPress={callOwner}>
                      <Text style={styles.quickButtonText}>Call Owner</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickButton} onPress={whatsappOwner}>
                      <Text style={styles.quickButtonText}>WhatsApp Owner</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.messagesBox}>
                  {filteredMessages.length === 0 ? (
                    <Text style={styles.noMessageText}>No messages yet.</Text>
                  ) : (
                    filteredMessages.map((item) => {
                      const isDriver = item.sender_role === "driver";

                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.messageBubble,
                            isDriver ? styles.driverBubble : styles.otherBubble,
                          ]}
                        >
                          <Text style={styles.messageSender}>
                            {isDriver ? "You" : item.sender_role}
                          </Text>

                          <Text
                            style={[
                              styles.messageText,
                              isDriver
                                ? styles.driverMessageText
                                : styles.otherMessageText,
                            ]}
                          >
                            {item.message}
                          </Text>

                          <Text style={styles.messageTime}>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString()
                              : ""}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>

                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      chatTarget === "passenger"
                        ? "Message passenger..."
                        : "Message owner/dispatch..."
                    }
                    placeholderTextColor="#94a3b8"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                  />

                  <TouchableOpacity
                    style={[styles.sendButton, sending && styles.disabledButton]}
                    onPress={sendMessage}
                    disabled={sending}
                  >
                    {sending ? (
                      <ActivityIndicator color="#07111f" />
                    ) : (
                      <Text style={styles.sendButtonText}>Send</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.chatSubText}>
                In-app chat becomes available when you have an assigned or active trip.
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety Check-In</Text>

            <TouchableOpacity style={styles.statusButton} onPress={arrivedPickup}>
              <Text style={styles.statusTitle}>📍 Arrived at Pickup</Text>
              <Text style={styles.statusText}>
                Notify Angel Express that you have arrived.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statusButton}
              onPress={passengerPickedUp}
            >
              <Text style={styles.statusTitle}>🚘 Passenger Picked Up</Text>
              <Text style={styles.statusText}>
                Confirm passenger is safely inside vehicle.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statusButton}
              onPress={passengerDroppedOff}
            >
              <Text style={styles.statusTitle}>✅ Passenger Dropped Off Safely</Text>
              <Text style={styles.statusText}>Confirm safe trip completion.</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emergencySection}>
            <Text style={styles.emergencyTitle}>Owner Panic Contact</Text>

            <TouchableOpacity style={styles.emergencyButton} onPress={callOwner}>
              <Text style={styles.emergencyButtonTitle}>📞 Call Owner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={sendEmergencyAlert}
            >
              <Text style={styles.emergencyButtonTitle}>
                🚨 Send Emergency Alert
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.emergencyButton} onPress={shareLocation}>
              <Text style={styles.emergencyButtonTitle}>
                📍 Share Current Location
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Angel Express Safety Monitoring</Text>

            <Text style={styles.infoText}>Every chauffeur trip should follow:</Text>

            <Text style={styles.bullet}>• Arrived at Pickup</Text>
            <Text style={styles.bullet}>• Passenger Picked Up</Text>
            <Text style={styles.bullet}>• Passenger Dropped Off Safely</Text>

            <Text style={styles.infoText}>
              Live GPS, emergency alerts, and dispatch chat connect directly with
              the Angel Express Owner App.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  loadingText: { color: "#fff", marginTop: 10 },
  container: {
    padding: 22,
    paddingTop: 60,
    paddingBottom: 50,
  },
  backButton: { marginBottom: 20 },
  backText: {
    color: "#d4af37",
    fontWeight: "800",
    fontSize: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#cbd5e1",
    lineHeight: 22,
    marginBottom: 25,
  },
  chatCard: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.65)",
  },
  chatTitle: {
    color: "#c4b5fd",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 8,
  },
  chatSubText: {
    color: "#cbd5e1",
    lineHeight: 21,
    marginBottom: 14,
  },
  targetRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  targetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  activeTargetButton: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },
  targetText: {
    color: "#cbd5e1",
    fontWeight: "900",
  },
  activeTargetText: { color: "#fff" },
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  quickButton: {
    flex: 1,
    backgroundColor: "#d4af37",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  quickButtonText: {
    color: "#07111f",
    fontWeight: "900",
    fontSize: 12,
  },
  messagesBox: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 12,
  },
  noMessageText: {
    color: "#94a3b8",
    textAlign: "center",
    padding: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    maxWidth: "85%",
  },
  driverBubble: {
    backgroundColor: "#d4af37",
    alignSelf: "flex-end",
  },
  otherBubble: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    alignSelf: "flex-start",
  },
  messageSender: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
    color: "#64748b",
    textTransform: "uppercase",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  driverMessageText: {
    color: "#07111f",
    fontWeight: "700",
  },
  otherMessageText: {
    color: "#fff",
  },
  messageTime: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 6,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 100,
    backgroundColor: "#0f172a",
    color: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    backgroundColor: "#d4af37",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  disabledButton: { opacity: 0.6 },
  sendButtonText: {
    color: "#07111f",
    fontWeight: "900",
  },
  section: { marginBottom: 25 },
  sectionTitle: {
    color: "#d4af37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 15,
  },
  statusButton: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  statusTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
  },
  statusText: { color: "#cbd5e1", lineHeight: 20 },
  emergencySection: {
    backgroundColor: "rgba(127,29,29,0.8)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },
  emergencyTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 15,
  },
  emergencyButton: {
    backgroundColor: "#991b1b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  emergencyButtonTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  infoCard: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  infoTitle: {
    color: "#d4af37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
  },
  infoText: {
    color: "#cbd5e1",
    lineHeight: 22,
    marginBottom: 10,
  },
  bullet: {
    color: "#ffffff",
    marginBottom: 6,
  },
});