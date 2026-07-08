import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useDriverTheme, v5Shadow } from "../lib/driverTheme";

export default function TripChatScreen() {
  const { booking_id, passenger_name, passenger_phone } =
    useLocalSearchParams<{
      booking_id?: string;
      passenger_name?: string;
      passenger_phone?: string;
    }>();

  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const scrollRef = useRef<ScrollView | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [booking, setBooking] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");

  const [currentUserId, setCurrentUserId] = useState("");
  const [senderName, setSenderName] = useState("Driver");

  useFocusEffect(
    useCallback(() => {
      loadChat();
    }, [booking_id])
  );

  useEffect(() => {
    if (!booking_id) return;

    const channel = supabase
      .channel(`trip-chat-${booking_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_chat_messages",
          filter: `booking_id=eq.${booking_id}`,
        },
        () => {
          loadMessages(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [booking_id]);

  async function loadChat() {
    try {
      setLoading(true);

      if (!booking_id) {
        Alert.alert("Missing Trip", "No booking ID was provided for this chat.");
        router.back();
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/driver-login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", String(booking_id))
        .maybeSingle();

      if (bookingError) throw bookingError;

      if (!bookingData) {
        Alert.alert("Trip Not Found", "This booking could not be found.");
        router.back();
        return;
      }

      setBooking(bookingData);

      const { data: driverData } = await supabase
        .from("drivers")
        .select("first_name, last_name, full_name, name")
        .eq("id", user.id)
        .maybeSingle();

      const driverName =
        driverData?.full_name ||
        driverData?.name ||
        `${driverData?.first_name || ""} ${driverData?.last_name || ""}`.trim() ||
        "Driver";

      setSenderName(driverName);

      await loadMessages(false);
    } catch (err: any) {
      Alert.alert("Chat Error", err.message || "Unable to load chat.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMessages(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      if (!booking_id) return;

      const { data, error } = await supabase
        .from("trip_chat_messages")
        .select("*")
        .eq("booking_id", String(booking_id))
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } catch (err: any) {
      console.log("Load messages error:", err.message || err);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadChat();
  }

  function getPassengerName() {
    return (
      String(passenger_name || "").trim() ||
      booking?.name ||
      booking?.passenger_name ||
      booking?.customer_name ||
      booking?.full_name ||
      booking?.email ||
      "Passenger"
    );
  }

  function getPassengerPhone() {
    return (
      String(passenger_phone || "").trim() ||
      booking?.phone ||
      booking?.passenger_phone ||
      booking?.customer_phone ||
      "No phone provided"
    );
  }

  function formatTime(value: string) {
    if (!value) return "";

    try {
      return new Date(value).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  async function sendMessage() {
    try {
      const cleanMessage = messageText.trim();

      if (!cleanMessage) return;

      if (!booking_id) {
        Alert.alert("Missing Trip", "No booking ID was provided.");
        return;
      }

      setSending(true);
      setMessageText("");

      const { error } = await supabase.from("trip_chat_messages").insert({
        booking_id: String(booking_id),
        sender_id: currentUserId || null,
        sender_role: "driver",
        sender_name: senderName || "Driver",
        message: cleanMessage,
      });

      if (error) throw error;

      await loadMessages(false);
    } catch (err: any) {
      Alert.alert("Send Failed", err.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading trip chat...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <View style={styles.topRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
                <Text style={styles.themeText}>
                  {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>Trip Chat</Text>

            <Text style={styles.subtitle}>
              Chat with passenger and Angel Express Owner Control.
            </Text>

            <View style={styles.passengerCard}>
              <Text style={styles.cardLabel}>Passenger</Text>
              <Text style={styles.passengerName}>{getPassengerName()}</Text>
              <Text style={styles.passengerPhone}>{getPassengerPhone()}</Text>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.gold}
              />
            }
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Messages Yet</Text>
                <Text style={styles.emptyText}>
                  Start the conversation with the passenger or owner.
                </Text>
              </View>
            ) : (
              messages.map((item) => {
                const mine = item.sender_id === currentUserId;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.messageBubble,
                      mine ? styles.myBubble : styles.otherBubble,
                    ]}
                  >
                    <Text style={styles.senderLine}>
                      {item.sender_role?.toUpperCase()} •{" "}
                      {item.sender_name || "Angel Express"}
                    </Text>

                    <Text style={styles.messageText}>{item.message}</Text>

                    <Text style={styles.timeText}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type message..."
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              multiline
            />

            <TouchableOpacity
              style={[styles.sendButton, sending && styles.disabledButton]}
              onPress={sendMessage}
              disabled={sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
    },
    keyboard: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: colors.text2,
      marginTop: 14,
      fontWeight: "800",
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    backButton: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.card,
    },
    backButtonText: {
      color: colors.gold,
      fontWeight: "900",
    },
    themePill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    title: {
      color: colors.gold,
      fontSize: 31,
      fontWeight: "900",
      marginBottom: 6,
    },
    subtitle: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 14,
      fontWeight: "700",
    },
    passengerCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
      ...v5Shadow(colors),
    },
    cardLabel: {
      color: colors.muted2,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    passengerName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 4,
    },
    passengerPhone: {
      color: colors.gold,
      fontSize: 14,
      fontWeight: "800",
    },
    messagesScroll: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 18,
    },
    emptyBox: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "900",
      marginBottom: 8,
    },
    emptyText: {
      color: colors.text2,
      lineHeight: 21,
      fontWeight: "700",
    },
    messageBubble: {
      maxWidth: "86%",
      borderRadius: 18,
      padding: 13,
      marginBottom: 12,
      borderWidth: 1,
    },
    myBubble: {
      alignSelf: "flex-end",
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.22)" : "#FFF8E8",
      borderColor: colors.border,
    },
    otherBubble: {
      alignSelf: "flex-start",
      backgroundColor: colors.card,
      borderColor: colors.borderSoft,
    },
    senderLine: {
      color: colors.gold,
      fontSize: 11,
      fontWeight: "900",
      marginBottom: 5,
    },
    messageText: {
      color: colors.text,
      fontSize: 15.5,
      lineHeight: 22,
      fontWeight: "700",
    },
    timeText: {
      color: colors.muted2,
      fontSize: 11,
      fontWeight: "700",
      alignSelf: "flex-end",
      marginTop: 6,
    },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 30 : 18,
      backgroundColor: colors.nav || colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
    },
    input: {
      flex: 1,
      minHeight: 48,
      maxHeight: 110,
      borderRadius: 16,
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      color: colors.inputText,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: "700",
    },
    sendButton: {
      backgroundColor: colors.gold,
      minHeight: 48,
      paddingHorizontal: 18,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    disabledButton: {
      opacity: 0.55,
    },
    sendButtonText: {
      color: colors.navy,
      fontWeight: "900",
      fontSize: 15,
    },
  });
}