import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ArrowLeft,
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
  Send,
  Bot,
  UserCheck,
  Wifi,
  WifiOff,
  Share2,
  UsersRound,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const SUPPORT_PHONE = "19728367910";
const SUPPORT_EMAIL = "support@angelexpressus.com";

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
];

export default function SupportScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [userId, setUserId] = useState("");
  const [chatTarget, setChatTarget] = useState<"owner" | "driver">("owner");
  const [channelState, setChannelState] = useState<"connecting" | "online" | "offline">("connecting");
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [sendingIds, setSendingIds] = useState<string[]>([]);
  const [failedMessages, setFailedMessages] = useState<any[]>([]);

  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const chatRef = useRef<ScrollView | null>(null);

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSupportData();
    }, [])
  );

  useEffect(() => {
    if (!activeTrip?.id) return;

    setChannelState("connecting");

    const channel = supabase
      .channel(`passenger-support-${activeTrip.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `booking_id=eq.${normalizeBookingId(activeTrip.id)}`,
        },
        () => {
          loadMessages(false, activeTrip.id);
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (
          payload?.sender_role === chatTarget &&
          payload?.sender_id !== userId
        ) {
          setRemoteTyping(Boolean(payload?.typing));

          if (typingTimer.current) clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => {
            setRemoteTyping(false);
          }, 2500);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setChannelState("online");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setChannelState("offline");
        }
      });

    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      supabase.removeChannel(channel);
    };
  }, [activeTrip?.id, chatTarget, userId]);

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
          "driver_en_route",
          "en_route",
          "passenger_onboard",
          "picked_up",
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

  function ticketNumber() {
    const invoice =
      activeTrip?.invoice_number ||
      activeTrip?.invoice_no ||
      activeTrip?.booking_number ||
      activeTrip?.booking_no;

    if (invoice) return `AE-${String(invoice).replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase()}`;
    if (activeTrip?.id) return `AE-${String(activeTrip.id).slice(-10).toUpperCase()}`;
    return "Not assigned";
  }

  function tripContext() {
    if (!activeTrip) return "";

    return [
      "",
      "--- Trip Context ---",
      `Ticket: ${ticketNumber()}`,
      `Booking ID: ${activeTrip.id || "N/A"}`,
      `Invoice: ${activeTrip.invoice_number || activeTrip.invoice_no || "N/A"}`,
      `Status: ${activeTrip.status || "N/A"}`,
      `Pickup: ${activeTrip.pickup_address || activeTrip.pickup || "N/A"}`,
      `Drop-off: ${activeTrip.dropoff_address || activeTrip.dropoff || "N/A"}`,
      `Driver: ${activeTrip.driver_name || activeTrip.assigned_driver_name || "Not assigned"}`,
      `Vehicle: ${activeTrip.vehicle || activeTrip.vehicle_type || "Not available"}`,
    ].join("\\n");
  }

  async function broadcastTyping(typing: boolean) {
    if (!activeTrip?.id) return;

    try {
      await supabase
        .channel(`passenger-support-${activeTrip.id}`)
        .send({
          type: "broadcast",
          event: "typing",
          payload: {
            typing,
            sender_role: "passenger",
            sender_id: userId,
          },
        });
    } catch {
      // Typing presence is non-critical.
    }
  }

  function handleMessageChange(value: string) {
    setMessage(value);
    void broadcastTyping(Boolean(value.trim()));

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void broadcastTyping(false);
    }, 1200);
  }

  async function sendMessage(text?: string, retryPayload?: any) {
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

    const localId = `local-${Date.now()}`;
    const payload =
      retryPayload || {
        booking_id: normalizeBookingId(activeTrip.id),
        sender_id: userId,
        sender_role: "passenger",
        receiver_role: chatTarget,
        message:
          chatTarget === "owner"
            ? `${cleanMessage}${tripContext()}`
            : cleanMessage,
      };

    const optimisticMessage = {
      ...payload,
      id: localId,
      created_at: new Date().toISOString(),
      optimistic: true,
    };

    try {
      setSending(true);
      setSendingIds((current) => [...current, localId]);
      setMessages((current) => [...current, optimisticMessage]);
      setMessage("");
      void broadcastTyping(false);

      const { error } = await supabase.from("chat_messages").insert(payload);

      if (error) throw error;

      setFailedMessages((current) =>
        current.filter((item) => item.localId !== localId)
      );

      await loadMessages(false, activeTrip.id);
    } catch (error: any) {
      setMessages((current) =>
        current.filter((item) => item.id !== localId)
      );

      setFailedMessages((current) => [
        ...current,
        {
          localId,
          payload,
          displayMessage: cleanMessage,
          error: error.message || "Message failed to send.",
        },
      ]);

      Alert.alert(
        "Send Failed",
        error.message || "Unable to send message. You can retry below."
      );
    } finally {
      setSendingIds((current) => current.filter((id) => id !== localId));
      setSending(false);
    }
  }

  async function retryFailedMessage(item: any) {
    setFailedMessages((current) =>
      current.filter((failed) => failed.localId !== item.localId)
    );
    await sendMessage(item.displayMessage, item.payload);
  }


  function escalateToSupervisor() {
    Alert.alert(
      "Escalate Support Ticket",
      `Escalate ticket ${ticketNumber()} to an Angel Express supervisor?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Escalate",
          onPress: () =>
            sendMessage(
              `PRIORITY ESCALATION REQUEST: Please escalate ticket ${ticketNumber()} to a supervisor.`
            ),
        },
      ]
    );
  }

  async function shareTripContext() {
    if (!activeTrip) {
      Alert.alert("No Active Trip", "There is no active trip to share.");
      return;
    }

    const text = [
      "Angel Express Support Context",
      `Ticket: ${ticketNumber()}`,
      `Status: ${activeTrip.status || "N/A"}`,
      `Pickup: ${activeTrip.pickup_address || activeTrip.pickup || "N/A"}`,
      `Drop-off: ${activeTrip.dropoff_address || activeTrip.dropoff || "N/A"}`,
      `Invoice: ${activeTrip.invoice_number || activeTrip.invoice_no || "N/A"}`,
    ].join("\\n");

    const { Share } = await import("react-native");
    await Share.share({ message: text, title: "Angel Express Trip Support" });
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
        <ActivityIndicator color={colors.gold} size="large" />
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
              tintColor={colors.gold}
              onRefresh={() => {
                setRefreshing(true);
                loadSupportData();
              }}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
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
            <Text style={styles.kicker}>PASSENGER SUPPORT CENTER</Text>

            <Text style={styles.title}>Angel Express Support</Text>

            <Text style={styles.subtitle}>
              Chat with Angel Express Support or your assigned driver during active
              and upcoming trips.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Headphones size={30} color={colors.onGold || colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Trip-Aware Support</Text>
                <Text style={styles.heroText}>
                  Owner/support chat, driver chat, emergency help, and quick trip assistance.
                </Text>
              </View>
            </View>

            <View style={styles.emergencyCard}>
              <View style={styles.cardHeader}>
                <AlertTriangle size={24} color={colors.danger} />
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
            </View>

            <View style={styles.statusRow}>
              <StatusCard
                title="Connection"
                value={
                  channelState === "online"
                    ? "Live"
                    : channelState === "connecting"
                    ? "Connecting"
                    : "Offline"
                }
                styles={styles}
              />
              <StatusCard
                title="Driver"
                value={activeTrip ? "Trip Linked" : "No Trip"}
                styles={styles}
              />
              <StatusCard
                title="Ticket"
                value={ticketNumber()}
                styles={styles}
              />
            </View>

            <View style={styles.connectionBanner}>
              {channelState === "online" ? (
                <Wifi size={18} color={colors.success || "#22C55E"} />
              ) : (
                <WifiOff size={18} color={colors.warning || "#F59E0B"} />
              )}
              <Text style={styles.connectionText}>
                {channelState === "online"
                  ? "Realtime support is connected."
                  : channelState === "connecting"
                  ? "Connecting to realtime support..."
                  : "Realtime support is offline. Pull down to refresh."}
              </Text>
            </View>

            {activeTrip ? (
              <View style={styles.tripCard}>
                <View style={styles.cardHeader}>
                  <CarFront size={22} color={colors.gold} />
                  <Text style={styles.cardTitle}>Current / Upcoming Ride</Text>
                </View>

                <Info label="Status" value={activeTrip.status || "N/A"} styles={styles} />
                <Info
                  label="Pickup"
                  value={activeTrip.pickup_address || activeTrip.pickup || "N/A"}
                  styles={styles}
                />
                <Info
                  label="Drop-off"
                  value={activeTrip.dropoff_address || activeTrip.dropoff || "N/A"}
                  styles={styles}
                />
                <Info label="Invoice" value={activeTrip.invoice_no || "N/A"} styles={styles} />

                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={() =>
                    router.push({
                      pathname: "/live-trip" as any,
                      params: {
                        invoice_no: activeTrip.invoice_no || "",
                        booking_id: activeTrip.id || "",
                      },
                    })
                  }
                  activeOpacity={0.88}
                >
                  <Text style={styles.outlineButtonText}>Track Ride</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.tripCard}>
                <View style={styles.cardHeader}>
                  <MessageCircle size={22} color={colors.gold} />
                  <Text style={styles.cardTitle}>In-App Chat</Text>
                </View>
                <Text style={styles.text}>
                  In-app chat becomes available when you have an active or upcoming trip.
                </Text>
              </View>
            )}

            <View style={styles.operationsCard}>
              <View style={styles.cardHeader}>
                <UserCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Support Operations</Text>
              </View>

              <View style={styles.operationsGrid}>
                <TouchableOpacity
                  style={styles.operationButton}
                  onPress={() => router.push("/ai-assistant" as any)}
                >
                  <Bot size={20} color={colors.gold} />
                  <Text style={styles.operationTitle}>Ask AI Concierge</Text>
                  <Text style={styles.operationText}>
                    Get fast help with common ride questions.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.operationButton}
                  onPress={escalateToSupervisor}
                >
                  <AlertTriangle size={20} color={colors.gold} />
                  <Text style={styles.operationTitle}>Escalate Ticket</Text>
                  <Text style={styles.operationText}>
                    Request priority supervisor review.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.operationButton}
                  onPress={shareTripContext}
                >
                  <Share2 size={20} color={colors.gold} />
                  <Text style={styles.operationTitle}>Share Trip Context</Text>
                  <Text style={styles.operationText}>
                    Share ticket and ride details externally.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.operationButton}
                  onPress={() => router.push("/family-checkin" as any)}
                >
                  <UsersRound size={20} color={colors.gold} />
                  <Text style={styles.operationTitle}>Family Check-In</Text>
                  <Text style={styles.operationText}>
                    Update a trusted family member.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.chatCard}>
              <View style={styles.cardHeader}>
                <MessageCircle size={22} color={colors.gold} />
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

              {remoteTyping ? (
                <View style={styles.typingBanner}>
                  <View style={styles.typingDot} />
                  <Text style={styles.typingText}>
                    {chatTarget === "driver"
                      ? "Driver is typing..."
                      : "Angel Support is typing..."}
                  </Text>
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
                        <View style={styles.messageMeta}>
                          <Text style={styles.timeText}>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString()
                              : ""}
                          </Text>
                          {isPassenger ? (
                            <Text style={styles.deliveryText}>
                              {item.optimistic ? "Sending..." : "Sent"}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {failedMessages.length > 0 ? (
              <View style={styles.failedCard}>
                <View style={styles.cardHeader}>
                  <AlertTriangle size={22} color={colors.danger} />
                  <Text style={styles.failedTitle}>Messages Not Sent</Text>
                </View>

                {failedMessages.map((item) => (
                  <View style={styles.failedRow} key={item.localId}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.failedMessage} numberOfLines={2}>
                        {item.displayMessage}
                      </Text>
                      <Text style={styles.failedError}>{item.error}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => retryFailedMessage(item)}
                    >
                      <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.messageCard}>
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
                placeholderTextColor={colors.placeholder}
                value={message}
                onChangeText={handleMessageChange}
                multiline
              />

              <TouchableOpacity
                style={[styles.goldButton, sending && styles.disabledButton]}
                onPress={() => sendMessage()}
                disabled={sending}
                activeOpacity={0.88}
              >
                {sending ? (
                  <ActivityIndicator color={colors.onGold || colors.navy} />
                ) : (
                  <>
                    <Send size={18} color={colors.onGold || colors.navy} />
                    <Text style={styles.goldButtonText}>Send Message</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.contactGrid}>
                <TouchableOpacity style={styles.contactButton} onPress={openWhatsApp}>
                  <MessageCircle size={18} color={colors.gold} />
                  <Text style={styles.contactText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactButton} onPress={callSupport}>
                  <Phone size={18} color={colors.gold} />
                  <Text style={styles.contactText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactButton} onPress={emailSupport}>
                  <Mail size={18} color={colors.gold} />
                  <Text style={styles.contactText}>Email</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.quickCard}>
              <View style={styles.cardHeader}>
                <HelpCircle size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Quick Help</Text>
              </View>

              {quickQuestions.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.quickButton}
                  onPress={() => sendMessage(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.quickIcon}>{getQuickIcon(item, colors)}</View>
                  <Text style={styles.quickText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.faqCard}>
              <View style={styles.cardHeader}>
                <Sparkles size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>FAQ</Text>
              </View>

              <FAQ
                q="How do I book a ride?"
                a="Use the Book a Ride section of the app and submit your trip request."
                styles={styles}
              />
              <FAQ
                q="Can I cancel my trip?"
                a="Yes. Contact support as soon as possible for assistance."
                styles={styles}
              />
              <FAQ
                q="Do students receive discounts?"
                a="Verified students receive exclusive discounts and benefits."
                styles={styles}
              />
            </View>

            <View style={styles.safetyShortcutGrid}>
              <TouchableOpacity
                style={styles.safetyShortcut}
                onPress={() => router.push("/live-trip" as any)}
              >
                <MapPinned size={18} color={colors.gold} />
                <Text style={styles.safetyShortcutText}>Open Live Trip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.safetyShortcut}
                onPress={() => router.push("/family-checkin" as any)}
              >
                <UsersRound size={18} color={colors.gold} />
                <Text style={styles.safetyShortcutText}>Family Check-In</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.safetyButton}
              onPress={() => router.push("/safety-share" as any)}
              activeOpacity={0.88}
            >
              <ShieldCheck size={18} color={colors.gold} />
              <Text style={styles.safetyText}>Open Safety Share</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function StatusCard({
  title,
  value,
  styles,
}: {
  title: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusTitle}>{title}</Text>
    </View>
  );
}

function Info({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function FAQ({
  q,
  a,
  styles,
}: {
  q: string;
  a: string;
  styles: any;
}) {
  return (
    <View style={styles.faqItem}>
      <Text style={styles.question}>{q}</Text>
      <Text style={styles.answer}>{a}</Text>
    </View>
  );
}

function getQuickIcon(text: string, c: any) {
  const q = text.toLowerCase();

  if (q.includes("driver") || q.includes("pickup")) {
    return <MapPinned size={18} color={c.gold} />;
  }
  if (q.includes("payment") || q.includes("invoice")) {
    return <CreditCard size={18} color={c.gold} />;
  }
  if (q.includes("emergency") || q.includes("unsafe")) {
    return <AlertTriangle size={18} color={c.gold} />;
  }
  if (q.includes("airport") || q.includes("world cup")) {
    return <Clock size={18} color={c.gold} />;
  }

  return <Sparkles size={18} color={c.gold} />;
}

function createStyles(c: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, overflow: "hidden" },
    bgWrap: { ...StyleSheet.absoluteFillObject },
    background: { flex: 1 },
    overlay: { flex: 1, backgroundColor: c.overlay },
    container: { flex: 1 },
    content: { padding: 22, paddingTop: 58, paddingBottom: 54 },

    center: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: c.text,
      marginTop: 12,
      fontWeight: "800",
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
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
    backText: {
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
      marginBottom: 10,
    },
    title: {
      color: c.text,
      fontSize: 36,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },

    heroCard: {
      minHeight: 124,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: { flex: 1 },
    heroTitle: {
      color: c.onGold || c.navy,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.onGold || c.navy,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },

    emergencyCard: {
      padding: 20,
      marginBottom: 18,
      backgroundColor: c.dangerSoft,
      borderColor:
        c.mode === "dark" ? "rgba(239,68,68,0.65)" : "rgba(220,38,38,0.35)",
      borderWidth: 1,
      borderRadius: 22,
      ...v5Shadow(c),
    },
    emergencyTitle: {
      color: c.danger,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },
    emergencyText: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 16,
      fontWeight: "700",
    },
    emergencyActions: {
      flexDirection: "row",
      gap: 10,
    },
    call911Button: {
      flex: 1,
      backgroundColor: c.danger,
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
      borderColor: c.danger,
      borderRadius: 15,
      paddingVertical: 15,
      alignItems: "center",
      backgroundColor: c.card,
    },
    callSupportText: {
      color: c.danger,
      fontWeight: "900",
    },

    statusRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
    statusCard: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      borderRadius: 17,
      padding: 13,
      ...v5Shadow(c),
    },
    statusValue: { color: c.gold, fontSize: 16, fontWeight: "900" },
    statusTitle: {
      color: c.text,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 4,
    },

    connectionBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      padding: 13,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      backgroundColor: c.card,
      marginBottom: 18,
    },
    connectionText: {
      flex: 1,
      color: c.text2 || c.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "800",
    },
    operationsCard: cardBase(c),
    operationsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    operationButton: {
      width: "48%",
      minHeight: 132,
      borderRadius: 17,
      padding: 14,
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
    },
    operationTitle: {
      color: c.text,
      fontSize: 14.5,
      fontWeight: "900",
      marginTop: 9,
      marginBottom: 5,
    },
    operationText: {
      color: c.text2 || c.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
    },
    typingBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 13,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignSelf: "flex-start",
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.gold,
    },
    typingText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    failedCard: {
      ...cardBase(c),
      borderColor: c.danger,
    },
    failedTitle: {
      color: c.danger,
      fontSize: 20,
      fontWeight: "900",
      flex: 1,
    },
    failedRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      paddingVertical: 11,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft || c.lightBorder,
    },
    failedMessage: {
      color: c.text,
      fontSize: 14,
      fontWeight: "800",
    },
    failedError: {
      color: c.danger,
      fontSize: 11.5,
      marginTop: 4,
      fontWeight: "700",
    },
    retryButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.danger,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    retryText: {
      color: c.danger,
      fontSize: 12,
      fontWeight: "900",
    },
    tripCard: cardBase(c),
    quickCard: cardBase(c),
    chatCard: cardBase(c),
    messageCard: cardBase(c),
    faqCard: cardBase(c),

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: { color: c.gold, fontSize: 22, fontWeight: "900", flex: 1 },

    text: {
      color: c.text,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "700",
    },
    infoRow: { marginBottom: 12 },
    infoLabel: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    infoValue: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 22,
      fontWeight: "700",
    },

    outlineButton: {
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    targetRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 14,
    },
    targetButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 13,
      alignItems: "center",
      backgroundColor: c.card2,
    },
    activeTargetButton: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    targetText: {
      color: c.text,
      fontWeight: "900",
    },
    activeTargetText: {
      color: c.onGold || c.navy,
    },

    driverQuickRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 14,
    },
    driverQuickButton: {
      flex: 1,
      backgroundColor: c.gold,
      borderRadius: 14,
      padding: 13,
      alignItems: "center",
    },
    driverQuickText: {
      color: c.onGold || c.navy,
      fontWeight: "900",
      fontSize: 12,
    },

    chatScroll: {
      maxHeight: 360,
      backgroundColor: c.card2,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
    },
    chatContent: { paddingBottom: 8 },
    noMessageText: {
      color: c.text2 || c.textSecondary,
      textAlign: "center",
      padding: 12,
      lineHeight: 22,
      fontWeight: "700",
    },
    bubble: {
      padding: 15,
      borderRadius: 16,
      marginBottom: 12,
      maxWidth: "88%",
    },
    supportBubble: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      alignSelf: "flex-start",
    },
    passengerBubble: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignSelf: "flex-end",
    },
    bubbleRole: {
      color: c.gold,
      fontWeight: "900",
      fontSize: 12,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    bubbleText: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 23,
      fontWeight: "700",
    },
    messageMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 6,
    },
    timeText: {
      color: c.text2 || c.textSecondary,
      fontSize: 10,
      fontWeight: "700",
    },
    deliveryText: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
    },

    inputLabel: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 12,
    },
    input: {
      backgroundColor: c.input,
      color: c.inputText,
      padding: 16,
      borderRadius: 16,
      fontSize: 16,
      minHeight: 105,
      textAlignVertical: "top",
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      marginBottom: 16,
      fontWeight: "700",
    },

    goldButton: {
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 2,
      ...v5Shadow(c),
    },
    goldButtonText: {
      color: c.onGold || c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.7,
    },

    contactGrid: { flexDirection: "row", gap: 9, marginTop: 14 },
    contactButton: {
      flex: 1,
      minHeight: 58,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
      gap: 5,
    },
    contactText: { color: c.gold, fontSize: 12, fontWeight: "900" },

    quickButton: {
      backgroundColor: c.card2,
      padding: 15,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    quickIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    quickText: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 22,
      flex: 1,
      fontWeight: "700",
    },

    faqItem: {
      marginBottom: 16,
    },
    question: {
      color: c.text,
      fontWeight: "900",
      fontSize: 16,
      marginBottom: 5,
    },
    answer: {
      color: c.text2 || c.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "700",
    },

    safetyShortcutGrid: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    },
    safetyShortcut: {
      flex: 1,
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
    },
    safetyShortcutText: {
      color: c.gold,
      fontSize: 12.5,
      fontWeight: "900",
    },
    safetyButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    safetyText: { color: c.gold, fontSize: 15, fontWeight: "900" },
  });
}

function cardBase(c: any) {
  return {
    padding: 20,
    marginBottom: 18,
    backgroundColor: c.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.borderSoft || c.lightBorder,
    ...v5Shadow(c),
  };
}