import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";

export default function SupportScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatTarget, setChatTarget] = useState<"owner" | "driver">("owner");

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
      if (!user) return;

      const userEmail = user.email?.trim().toLowerCase();

      const { data: tripData, error: tripError } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
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
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tripError) throw tripError;

      setActiveTrip(tripData || null);

      if (tripData?.id) {
        await loadMessages(false, tripData.id);
      }
    } catch (err: any) {
      Alert.alert("Support Error", err.message || "Unable to load support.");
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
      console.log("Chat load error:", err.message);
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
        "In-app chat is available when you have an active or upcoming trip."
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
        sender_role: "passenger",
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

  function callSupport() {
    Linking.openURL("tel:+19728367910");
  }

  function openWhatsApp() {
    Linking.openURL("https://wa.me/19728367910");
  }

  function emailSupport() {
    Linking.openURL(
      "mailto:angelsexpresss@gmail.com?subject=Angel Express Support Request"
    );
  }

  function callDriver() {
    const phone = activeTrip?.driver_phone || activeTrip?.assigned_driver_phone;

    if (!phone) {
      Alert.alert("Driver not available", "No driver phone number is available yet.");
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  function whatsappDriver() {
    const phone = activeTrip?.driver_phone || activeTrip?.assigned_driver_phone;

    if (!phone) {
      Alert.alert("Driver not available", "No driver WhatsApp number is available yet.");
      return;
    }

    const cleaned = String(phone).replace(/[^\d+]/g, "");
    Linking.openURL(
      `https://wa.me/${cleaned}?text=${encodeURIComponent(
        `Hello, this is regarding my Angel Express Trip #${activeTrip?.id}.`
      )}`
    );
  }

  const filteredMessages = messages.filter((item) => {
    if (chatTarget === "owner") {
      return (
        item.sender_role === "owner" ||
        item.receiver_role === "owner" ||
        item.sender_role === "passenger"
      );
    }

    return (
      item.sender_role === "driver" ||
      item.receiver_role === "driver" ||
      item.sender_role === "passenger"
    );
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.loadingText}>Loading Support Center...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
      <Text style={styles.title}>Support Center</Text>

      <Text style={styles.subtitle}>
        We're here to help before, during, and after your trip.
      </Text>

      <TouchableOpacity style={styles.card} onPress={callSupport}>
        <Text style={styles.cardTitle}>📞 Call Angel Express</Text>
        <Text style={styles.cardText}>Speak directly with Angel Express support.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={openWhatsApp}>
        <Text style={styles.cardTitle}>💬 WhatsApp Support</Text>
        <Text style={styles.cardText}>Chat instantly with our support team.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={emailSupport}>
        <Text style={styles.cardTitle}>📧 Email Support</Text>
        <Text style={styles.cardText}>Send us questions, feedback, or requests.</Text>
      </TouchableOpacity>

      <View style={styles.chatCard}>
        <Text style={styles.chatTitle}>💜 In-App Chat</Text>

        {activeTrip ? (
          <>
            <Text style={styles.chatSubText}>
              Connected to Trip #{activeTrip.id}
            </Text>

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
                  Chat Support
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.targetButton,
                  chatTarget === "driver" && styles.activeTargetButton,
                ]}
                onPress={() => setChatTarget("driver")}
              >
                <Text
                  style={[
                    styles.targetText,
                    chatTarget === "driver" && styles.activeTargetText,
                  ]}
                >
                  Chat Driver
                </Text>
              </TouchableOpacity>
            </View>

            {chatTarget === "driver" && (
              <View style={styles.driverQuickRow}>
                <TouchableOpacity style={styles.driverQuickButton} onPress={callDriver}>
                  <Text style={styles.driverQuickText}>Call Driver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.driverQuickButton}
                  onPress={whatsappDriver}
                >
                  <Text style={styles.driverQuickText}>WhatsApp Driver</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.messagesBox}>
              {filteredMessages.length === 0 ? (
                <Text style={styles.noMessageText}>No messages yet.</Text>
              ) : (
                filteredMessages.map((item) => {
                  const isPassenger = item.sender_role === "passenger";

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.messageBubble,
                        isPassenger ? styles.passengerBubble : styles.otherBubble,
                      ]}
                    >
                      <Text style={styles.messageSender}>
                        {isPassenger ? "You" : item.sender_role}
                      </Text>

                      <Text
                        style={[
                          styles.messageText,
                          isPassenger
                            ? styles.passengerMessageText
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
                  chatTarget === "driver"
                    ? "Message your driver..."
                    : "Message Angel Express support..."
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
                  <ActivityIndicator color="#040C18" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={styles.chatSubText}>
            In-app chat becomes available when you have an active or upcoming trip.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>❓ FAQ</Text>

        <Text style={styles.question}>How do I book a ride?</Text>
        <Text style={styles.answer}>
          Use the Book Ride section of the app and submit your trip request.
        </Text>

        <Text style={styles.question}>Can I cancel my trip?</Text>
        <Text style={styles.answer}>
          Yes. Contact support as soon as possible for assistance.
        </Text>

        <Text style={styles.question}>Do students receive discounts?</Text>
        <Text style={styles.answer}>
          Verified students receive exclusive discounts and benefits.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🧳 Lost & Found</Text>

        <Text style={styles.cardText}>Left something in a vehicle?</Text>
        <Text style={styles.cardText}>Contact Angel Express immediately with:</Text>

        <Text style={styles.bullet}>• Trip date</Text>
        <Text style={styles.bullet}>• Pickup location</Text>
        <Text style={styles.bullet}>• Item description</Text>
      </View>

      <View style={styles.emergencyCard}>
        <Text style={styles.emergencyTitle}>🚨 Emergency Help</Text>

        <Text style={styles.emergencyText}>
          If you are experiencing an emergency, call 911 immediately.
        </Text>

        <Text style={styles.emergencyText}>
          Then contact Angel Express Support.
        </Text>

        <TouchableOpacity style={styles.emergencyButton} onPress={callSupport}>
          <Text style={styles.emergencyButtonText}>Call Support Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#040C18" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 50 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#040C18",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#fff", marginTop: 10 },
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
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  cardText: { color: "#FFFFFF", fontSize: 15, lineHeight: 22 },
  chatCard: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.6)",
  },
  chatTitle: {
    color: "#C4B5FD",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 8,
  },
  chatSubText: {
    color: "#C9D0D8",
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
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  targetText: {
    color: "#C9D0D8",
    fontWeight: "900",
  },
  activeTargetText: {
    color: "#fff",
  },
  driverQuickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  driverQuickButton: {
    flex: 1,
    backgroundColor: "#D4AF37",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  driverQuickText: {
    color: "#040C18",
    fontWeight: "900",
    fontSize: 12,
  },
  messagesBox: {
    backgroundColor: "#040C18",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 12,
  },
  noMessageText: {
    color: "#94A3B8",
    textAlign: "center",
    padding: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    maxWidth: "85%",
  },
  passengerBubble: {
    backgroundColor: "#D4AF37",
    alignSelf: "flex-end",
  },
  otherBubble: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    alignSelf: "flex-start",
  },
  messageSender: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
    color: "#64748B",
    textTransform: "uppercase",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  passengerMessageText: {
    color: "#040C18",
    fontWeight: "700",
  },
  otherMessageText: {
    color: "#fff",
  },
  messageTime: {
    fontSize: 10,
    color: "#64748B",
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
    backgroundColor: "#0F172A",
    color: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    backgroundColor: "#D4AF37",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  disabledButton: { opacity: 0.6 },
  sendButtonText: {
    color: "#040C18",
    fontWeight: "900",
  },
  question: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 4,
    fontSize: 15,
  },
  answer: { color: "#C9D0D8", lineHeight: 22 },
  bullet: { color: "#FFFFFF", marginTop: 6, fontSize: 15 },
  emergencyCard: {
    backgroundColor: "#2B1010",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  emergencyTitle: {
    color: "#FF6B6B",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  emergencyText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  emergencyButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 14,
    alignItems: "center",
  },
  emergencyButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
});