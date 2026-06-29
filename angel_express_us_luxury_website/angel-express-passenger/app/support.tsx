import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  CarFront,
  Clock,
  CreditCard,
  Headphones,
  HelpCircle,
  Mail,
  MapPinned,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
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
const SUPPORT_PHONE = "19728367910";
const SUPPORT_EMAIL = "angelsexpresss@gmail.com";

const quickQuestions = [
  "My driver is late",
  "Driver cannot find me",
  "I need airport pickup help",
  "I want to change my pickup address",
  "I want to change my destination",
  "I left an item in the car",
  "I need help with payment",
  "I need an invoice or receipt",
  "I want to cancel my ride",
  "I need to add luggage",
  "I need emergency support",
  "I need help with student verification",
  "I need World Cup travel support",
];

export default function SupportScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [userId, setUserId] = useState("");
  const [chatTarget, setChatTarget] = useState<"owner" | "driver">("owner");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const chatRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSupportData();

      const interval = setInterval(() => {
        loadMessages(false);
      }, 5000);

      return () => clearInterval(interval);
    }, [chatTarget, activeTrip?.id])
  );

  function normalizeBookingId(id: any) {
    const numeric = Number(id);
    return Number.isNaN(numeric) ? id : numeric;
  }

  async function loadSupportData() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      setUserId(user.id);

      const userEmail = user.email?.trim().toLowerCase();

      const { data: tripData, error: tripError } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .in("status", [
          "Pending",
          "Confirmed",
          "Driver Assigned",
          "Arrived at Pickup",
          "Picked Up",
          "In Progress",
          "assigned",
          "confirmed",
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
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      Alert.alert("Support Error", error.message || "Unable to load support.");
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
        .eq("booking_id", normalizeBookingId(tripId))
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      setTimeout(() => {
        chatRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } catch (error: any) {
      console.log("Chat load error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function sendMessage(text?: string) {
    const cleanMessage = (text || message).trim();

    if (!cleanMessage) {
      Alert.alert("Message Required", "Please type a message first.");
      return;
    }

    if (!activeTrip?.id) {
      Alert.alert(
        "No Active Trip",
        "In-app chat becomes available when you have an active or upcoming trip."
      );
      return;
    }

    try {
      setSending(true);

      const { error } = await supabase.from("chat_messages").insert({
        booking_id: normalizeBookingId(activeTrip.id),
        sender_id: userId,
        sender_role: "passenger",
        receiver_role: chatTarget,
        message: cleanMessage,
      });

      if (error) throw error;

      setMessage("");
      await loadMessages(false);
    } catch (error: any) {
      Alert.alert("Send Failed", error.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  function callSupport() {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  }

  function callEmergency() {
    Linking.openURL("tel:911");
  }

  function openWhatsApp() {
    const text = `Angel Express Support Request

Invoice: ${activeTrip?.invoice_no || "N/A"}

I need help with my ride.`;

    Linking.openURL(`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`);
  }

  function emailSupport() {
    const subject = "Angel Express Support Request";
    const body = `Hello Angel Express Support,

I need help with my ride.

Invoice: ${activeTrip?.invoice_no || "N/A"}

Message:
${message || ""}`;

    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`
    );
  }

  function callDriver() {
    const phone = activeTrip?.driver_phone || activeTrip?.assigned_driver_phone;

    if (!phone) {
      Alert.alert("Driver Not Available", "No driver phone number is available yet.");
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  function whatsappDriver() {
    const phone = activeTrip?.driver_phone || activeTrip?.assigned_driver_phone;

    if (!phone) {
      Alert.alert("Driver Not Available", "No driver WhatsApp number is available yet.");
      return;
    }

    const cleaned = String(phone).replace(/[^\d]/g, "");

    Linking.openURL(
      `https://wa.me/${cleaned}?text=${encodeURIComponent(
        `Hello, this is regarding my Angel Express trip #${activeTrip?.invoice_no || activeTrip?.id}.`
      )}`
    );
  }

  const filteredMessages = messages.filter((item) => {
    if (item.sender_role === chatTarget) return true;
    if (item.receiver_role === chatTarget) return true;

    return false;
  });

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={styles.loadingText}>Loading Support Center...</Text>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSupportData();
              }}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>A  PASSENGER SUPPORT CENTER</Text>
            </View>

            <Text style={styles.title}>Angel Express Support</Text>

            <Text style={styles.subtitle}>
              Chat with Angel Express Support or your assigned driver during active
              and upcoming trips.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Headphones size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Trip-Aware Support</Text>
                <Text style={styles.heroText}>
                  Owner/support chat, driver chat, emergency help, and quick trip assistance.
                </Text>
              </View>
            </AngelCard>

            <AngelCard style={styles.emergencyCard}>
              <View style={styles.cardHeader}>
                <AlertTriangle size={24} color="#FF6B6B" />
                <Text style={styles.emergencyTitle}>Emergency Help</Text>
              </View>

              <Text style={styles.emergencyText}>
                If you are experiencing an emergency, call 911 immediately. Then contact
                Angel Express Support.
              </Text>

              <View style={styles.emergencyActions}>
                <TouchableOpacity style={styles.call911Button} onPress={callEmergency}>
                  <Text style={styles.call911Text}>Call 911</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.callSupportButton} onPress={callSupport}>
                  <Text style={styles.callSupportText}>Call Support</Text>
                </TouchableOpacity>
              </View>
            </AngelCard>

            <View style={styles.statusRow}>
              <StatusCard title="Chat" value="Owner" />
              <StatusCard title="Driver" value={activeTrip ? "Trip Linked" : "No Trip"} />
              <StatusCard title="Priority" value="Safety" />
            </View>

            {activeTrip ? (
              <AngelCard style={styles.tripCard}>
                <View style={styles.cardHeader}>
                  <CarFront size={22} color={GOLD} />
                  <Text style={styles.cardTitle}>Current / Upcoming Ride</Text>
                </View>

                <Info label="Status" value={activeTrip.status || "N/A"} />
                <Info label="Pickup" value={activeTrip.pickup_address || activeTrip.pickup || "N/A"} />
                <Info label="Drop-off" value={activeTrip.dropoff_address || activeTrip.dropoff || "N/A"} />
                <Info label="Invoice" value={activeTrip.invoice_no || "N/A"} />

                <AngelHeroButton
                  title="Track Ride"
                  onPress={() =>
                    router.push({
                      pathname: "/live-trip" as any,
                      params: {
                        invoice_no: activeTrip.invoice_no || "",
                        booking_id: activeTrip.id || "",
                      },
                    })
                  }
                  variant="outline"
                  style={styles.trackButton}
                />
              </AngelCard>
            ) : (
              <AngelCard style={styles.tripCard}>
                <View style={styles.cardHeader}>
                  <MessageCircle size={22} color={GOLD} />
                  <Text style={styles.cardTitle}>In-App Chat</Text>
                </View>
                <Text style={styles.text}>
                  In-app chat becomes available when you have an active or upcoming trip.
                </Text>
              </AngelCard>
            )}

            <AngelCard style={styles.chatCard}>
              <View style={styles.cardHeader}>
                <MessageCircle size={22} color={GOLD} />
                <Text style={styles.cardTitle}>In-App Chat</Text>
              </View>

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

              {chatTarget === "driver" && activeTrip ? (
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
              ) : null}

              <ScrollView
                ref={chatRef}
                style={styles.chatScroll}
                contentContainerStyle={styles.chatContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {!activeTrip ? (
                  <Text style={styles.noMessageText}>
                    Chat is available when a ride is pending, confirmed, assigned, or in progress.
                  </Text>
                ) : filteredMessages.length === 0 ? (
                  <Text style={styles.noMessageText}>No messages yet.</Text>
                ) : (
                  filteredMessages.map((item, index) => {
                    const isPassenger = item.sender_role === "passenger";

                    return (
                      <View
                        key={`${item.id || index}`}
                        style={[
                          styles.bubble,
                          isPassenger ? styles.passengerBubble : styles.supportBubble,
                        ]}
                      >
                        <Text style={styles.bubbleRole}>
                          {isPassenger
                            ? "You"
                            : item.sender_role === "driver"
                            ? "Driver"
                            : "Angel Support"}
                        </Text>
                        <Text style={styles.bubbleText}>{item.message}</Text>
                        <Text style={styles.timeText}>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : ""}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </AngelCard>

            <AngelCard style={styles.messageCard}>
              <Text style={styles.inputLabel}>
                Message {chatTarget === "driver" ? "Driver" : "Angel Support"}
              </Text>

              <TextInput
                style={styles.input}
                placeholder={
                  chatTarget === "driver"
                    ? "Message your driver..."
                    : "Message Angel Express support..."
                }
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={message}
                onChangeText={setMessage}
                multiline
              />

              <AngelHeroButton
                title={sending ? "Sending..." : "Send Message"}
                onPress={() => sendMessage()}
                variant="gold"
                style={styles.sendButton}
              />

              <View style={styles.contactGrid}>
                <TouchableOpacity style={styles.contactButton} onPress={openWhatsApp}>
                  <MessageCircle size={18} color={GOLD} />
                  <Text style={styles.contactText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactButton} onPress={callSupport}>
                  <Phone size={18} color={GOLD} />
                  <Text style={styles.contactText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactButton} onPress={emailSupport}>
                  <Mail size={18} color={GOLD} />
                  <Text style={styles.contactText}>Email</Text>
                </TouchableOpacity>
              </View>
            </AngelCard>

            <AngelCard style={styles.quickCard}>
              <View style={styles.cardHeader}>
                <HelpCircle size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Quick Help</Text>
              </View>

              {quickQuestions.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.quickButton}
                  onPress={() => sendMessage(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.quickIcon}>{getQuickIcon(item)}</View>
                  <Text style={styles.quickText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </AngelCard>

            <AngelCard style={styles.faqCard}>
              <View style={styles.cardHeader}>
                <Sparkles size={22} color={GOLD} />
                <Text style={styles.cardTitle}>FAQ</Text>
              </View>

              <FAQ
                q="How do I book a ride?"
                a="Use the Book a Ride section of the app and submit your trip request."
              />
              <FAQ
                q="Can I cancel my trip?"
                a="Yes. Contact support as soon as possible for assistance."
              />
              <FAQ
                q="Do students receive discounts?"
                a="Verified students receive exclusive discounts and benefits."
              />
            </AngelCard>

            <TouchableOpacity
              style={styles.safetyButton}
              onPress={() => router.push("/safety-share" as any)}
            >
              <ShieldCheck size={18} color={GOLD} />
              <Text style={styles.safetyText}>Open Safety Share</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function StatusCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusTitle}>{title}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <View style={styles.faqItem}>
      <Text style={styles.question}>{q}</Text>
      <Text style={styles.answer}>{a}</Text>
    </View>
  );
}

function getQuickIcon(text: string) {
  const q = text.toLowerCase();

  if (q.includes("driver") || q.includes("pickup")) return <MapPinned size={18} color={GOLD} />;
  if (q.includes("payment") || q.includes("invoice")) return <CreditCard size={18} color={GOLD} />;
  if (q.includes("emergency") || q.includes("unsafe")) return <AlertTriangle size={18} color={GOLD} />;
  if (q.includes("airport") || q.includes("world cup")) return <Clock size={18} color={GOLD} />;

  return <Sparkles size={18} color={GOLD} />;
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

  backButton: { alignSelf: "flex-start", marginBottom: 18 },
  backText: { color: GOLD, fontSize: 18, fontWeight: "900" },

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
    fontSize: 36,
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
    minHeight: 124,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(6,17,31,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  heroCopy: { flex: 1 },

  heroTitle: {
    color: AE_COLORS.navy2,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },

  heroText: {
    color: "rgba(6,17,31,0.78)",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },

  emergencyCard: {
    padding: 20,
    marginBottom: 18,
    backgroundColor: "rgba(43,16,16,0.88)",
    borderColor: "rgba(255,107,107,0.65)",
  },

  emergencyTitle: {
    color: "#FF6B6B",
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },

  emergencyText: {
    color: AE_COLORS.white,
    fontSize: 15.5,
    lineHeight: 23,
    marginBottom: 16,
  },

  emergencyActions: {
    flexDirection: "row",
    gap: 10,
  },

  call911Button: {
    flex: 1,
    backgroundColor: "#FF6B6B",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
  },

  call911Text: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  callSupportButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#FF6B6B",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
  },

  callSupportText: {
    color: "#FF6B6B",
    fontWeight: "900",
  },

  statusRow: { flexDirection: "row", gap: 10, marginBottom: 18 },

  statusCard: {
    flex: 1,
    backgroundColor: "rgba(13,20,34,0.84)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 17,
    padding: 13,
  },

  statusValue: { color: GOLD, fontSize: 16, fontWeight: "900" },

  statusTitle: {
    color: AE_COLORS.white,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },

  tripCard: { padding: 20, marginBottom: 18 },
  quickCard: { padding: 20, marginBottom: 18 },
  chatCard: { padding: 20, marginBottom: 18 },
  messageCard: { padding: 20, marginBottom: 18 },
  faqCard: { padding: 20, marginBottom: 18 },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  cardTitle: { color: GOLD, fontSize: 22, fontWeight: "900", flex: 1 },

  text: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 24,
  },

  infoRow: { marginBottom: 12 },

  infoLabel: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  infoValue: { color: AE_COLORS.white, fontSize: 15.5, lineHeight: 22 },

  trackButton: { marginTop: 8 },

  targetRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  targetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    borderRadius: 14,
    padding: 13,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  activeTargetButton: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },

  targetText: {
    color: AE_COLORS.white,
    fontWeight: "900",
  },

  activeTargetText: {
    color: AE_COLORS.navy,
  },

  driverQuickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  driverQuickButton: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 14,
    padding: 13,
    alignItems: "center",
  },

  driverQuickText: {
    color: AE_COLORS.navy,
    fontWeight: "900",
    fontSize: 12,
  },

  chatScroll: {
    maxHeight: 360,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.12)",
  },

  chatContent: { paddingBottom: 8 },

  noMessageText: {
    color: AE_COLORS.textSoft,
    textAlign: "center",
    padding: 12,
    lineHeight: 22,
  },

  bubble: {
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: "88%",
  },

  supportBubble: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.14)",
    alignSelf: "flex-start",
  },

  passengerBubble: {
    backgroundColor: "rgba(212,175,55,0.16)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.24)",
    alignSelf: "flex-end",
  },

  bubbleRole: {
    color: GOLD,
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  bubbleText: {
    color: AE_COLORS.white,
    fontSize: 15.5,
    lineHeight: 23,
  },

  timeText: {
    color: AE_COLORS.muted,
    fontSize: 10,
    marginTop: 6,
  },

  inputLabel: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    color: AE_COLORS.white,
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    minHeight: 105,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 16,
  },

  sendButton: { marginTop: 2 },

  contactGrid: { flexDirection: "row", gap: 9, marginTop: 14 },

  contactButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,175,55,0.08)",
    gap: 5,
  },

  contactText: { color: GOLD, fontSize: 12, fontWeight: "900" },

  quickButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  quickText: {
    color: AE_COLORS.white,
    fontSize: 15.5,
    lineHeight: 22,
    flex: 1,
    fontWeight: "700",
  },

  faqItem: {
    marginBottom: 16,
  },

  question: {
    color: AE_COLORS.white,
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 5,
  },

  answer: {
    color: AE_COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
  },

  safetyButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  safetyText: { color: GOLD, fontSize: 15, fontWeight: "900" },
});