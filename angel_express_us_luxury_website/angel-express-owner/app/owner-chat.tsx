import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

import { useOwnerTheme } from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

type GenericRecord = Record<string, any>;

type ChatMessage = GenericRecord & {
  id: string;
  booking_id?: string | number | null;
  sender_id?: string | null;
  sender_role?: string | null;
  receiver_role?: string | null;
  message?: string | null;
  created_at?: string | null;
  is_read?: boolean | null;
  read_at?: string | null;
};

type BookingRecord = GenericRecord & {
  id: string | number;
  status?: string | null;
  name?: string | null;
  passenger_name?: string | null;
  phone?: string | null;
  passenger_phone?: string | null;
  driver_name?: string | null;
  assigned_driver_name?: string | null;
  driver_phone?: string | null;
  assigned_driver_phone?: string | null;
  pickup?: string | null;
  pickup_address?: string | null;
  dropoff?: string | null;
  dropoff_address?: string | null;
};

function passengerName(booking?: BookingRecord) {
  return (
    booking?.name ||
    booking?.passenger_name ||
    "Passenger"
  );
}

function driverName(booking?: BookingRecord) {
  return (
    booking?.assigned_driver_name ||
    booking?.driver_name ||
    "Driver"
  );
}

export default function OwnerChatScreen() {
  const { theme, isDark } = useOwnerTheme();
  const params = useLocalSearchParams<{
    bookingId?: string;
    receiverRole?: string;
    passengerName?: string;
    driverName?: string;
  }>();

  const bookingId = String(params.bookingId || "");
  const receiverRole = String(
    params.receiverRole || "passenger"
  );

  const scrollRef = useRef<ScrollView | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [booking, setBooking] =
    useState<BookingRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadChat();

      const interval = setInterval(() => {
        loadChat(false);
      }, 5000);

      return () => clearInterval(interval);
    }, [bookingId])
  );

  useEffect(() => {
    const channel = supabase
      .channel(`owner-chat-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        () => loadChat(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  async function loadChat(showLoading = true) {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);

      const [messagesResponse, bookingResponse] =
        await Promise.all([
          supabase
            .from("chat_messages")
            .select("*")
            .eq("booking_id", bookingId)
            .order("created_at", { ascending: true }),

          supabase
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .maybeSingle(),
        ]);

      if (messagesResponse.error) {
        throw messagesResponse.error;
      }

      setMessages(messagesResponse.data || []);
      setBooking(bookingResponse.data || null);

      const unreadIds = (messagesResponse.data || [])
        .filter(
          (item: ChatMessage) =>
            item.sender_role !== "owner" &&
            (item.is_read === false || item.read_at == null)
        )
        .map((item: ChatMessage) => item.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("chat_messages")
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .in("id", unreadIds);
      }

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({
          animated: showLoading,
        });
      }, 100);
    } catch (error: any) {
      Alert.alert(
        "Chat Error",
        error?.message || "Unable to load messages."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function sendMessage() {
    if (!message.trim() || !bookingId) return;

    try {
      setSending(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        Alert.alert(
          "Not logged in",
          "Please sign in again."
        );
        return;
      }

      const newMessage = {
        booking_id: Number(bookingId),
        sender_id: user.id,
        sender_role: "owner",
        receiver_role: receiverRole,
        message: message.trim(),
        is_read: false,
      };

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(newMessage)
        .select("*")
        .single();

      if (error) {
        const fallback = {
          booking_id: Number(bookingId),
          sender_id: user.id,
          sender_role: "owner",
          receiver_role: receiverRole,
          message: message.trim(),
        };

        const fallbackResponse = await supabase
          .from("chat_messages")
          .insert(fallback)
          .select("*")
          .single();

        if (fallbackResponse.error) {
          throw fallbackResponse.error;
        }

        if (fallbackResponse.data) {
          setMessages((current) => [
            ...current,
            fallbackResponse.data,
          ]);
        }
      } else if (data) {
        setMessages((current) => [...current, data]);
      }

      setMessage("");

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({
          animated: true,
        });
      }, 100);
    } catch (error: any) {
      Alert.alert(
        "Send Failed",
        error?.message || "Unable to send message."
      );
    } finally {
      setSending(false);
    }
  }

  function chatTitle() {
    if (receiverRole === "driver") return "Driver Chat";
    if (receiverRole === "emergency") {
      return "Emergency Contact Chat";
    }
    return "Passenger Chat";
  }

  const counterpartName = useMemo(() => {
    if (receiverRole === "driver") {
      return (
        params.driverName ||
        driverName(booking || undefined)
      );
    }

    if (receiverRole === "emergency") {
      return "Emergency Contact";
    }

    return (
      params.passengerName ||
      passengerName(booking || undefined)
    );
  }, [receiverRole, booking, params]);

  const quickReplies = [
    "Your driver is on the way.",
    "Please confirm your pickup location.",
    "Angel Express is reviewing your request.",
    "Thank you. We will update you shortly.",
  ];

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.gold}
        />
        <Text
          style={[
            styles.loadingText,
            { color: theme.colors.textSecondary },
          ]}
        >
          Loading Chat...
        </Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/owner-bg.png")}
      style={[
        styles.background,
        { backgroundColor: theme.colors.background },
      ]}
      resizeMode="cover"
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? "rgba(3,8,17,0.96)"
              : "rgba(245,247,250,0.97)",
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={
            Platform.OS === "ios" ? "padding" : undefined
          }
        >
          <View
            style={[
              styles.header,
              {
                backgroundColor: theme.colors.card,
                borderBottomColor: theme.colors.cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={theme.colors.gold}
              />
            </TouchableOpacity>

            <View style={styles.headerTextArea}>
              <Text
                style={[
                  styles.headerEyebrow,
                  { color: theme.colors.gold },
                ]}
              >
                ANGEL EXPRESS CHAT
              </Text>

              <Text
                style={[
                  styles.title,
                  { color: theme.colors.text },
                ]}
              >
                {chatTitle()}
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                {counterpartName} • Trip #{bookingId}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: theme.colors.successSoft,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: theme.colors.success },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: theme.colors.success },
                ]}
              >
                Live
              </Text>
            </View>
          </View>

          {booking ? (
            <View
              style={[
                styles.tripContext,
                {
                  backgroundColor: theme.colors.card,
                  borderBottomColor: theme.colors.cardBorder,
                },
              ]}
            >
              <View style={styles.tripContextItem}>
                <Ionicons
                  name="location-outline"
                  size={17}
                  color={theme.colors.success}
                />
                <Text
                  style={[
                    styles.tripContextText,
                    { color: theme.colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {booking.pickup_address ||
                    booking.pickup ||
                    "Pickup"}
                </Text>
              </View>

              <Ionicons
                name="arrow-forward"
                size={16}
                color={theme.colors.gold}
              />

              <View style={styles.tripContextItem}>
                <Ionicons
                  name="flag-outline"
                  size={17}
                  color={theme.colors.danger}
                />
                <Text
                  style={[
                    styles.tripContextText,
                    { color: theme.colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {booking.dropoff_address ||
                    booking.dropoff ||
                    "Drop-off"}
                </Text>
              </View>
            </View>
          ) : null}

          <ScrollView
            ref={(ref) => {
              scrollRef.current = ref;
            }}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({
                animated: false,
              })
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadChat(false);
                }}
                tintColor={theme.colors.gold}
                colors={[theme.colors.gold]}
              />
            }
          >
            {messages.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={34}
                  color={theme.colors.gold}
                />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  No messages yet
                </Text>
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Start the conversation with {counterpartName}.
                </Text>
              </View>
            ) : (
              messages.map((item) => {
                const isOwner =
                  item.sender_role === "owner";

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.messageBubble,
                      isOwner
                        ? styles.ownerBubble
                        : styles.otherBubble,
                      {
                        backgroundColor: isOwner
                          ? theme.colors.gold
                          : theme.colors.card,
                        borderColor: isOwner
                          ? theme.colors.gold
                          : theme.colors.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.senderLabel,
                        {
                          color: isOwner
                            ? theme.colors.textInverse
                            : theme.colors.textMuted,
                        },
                      ]}
                    >
                      {isOwner
                        ? "Owner"
                        : item.sender_role || "User"}
                    </Text>

                    <Text
                      style={[
                        styles.messageText,
                        {
                          color: isOwner
                            ? theme.colors.textInverse
                            : theme.colors.text,
                        },
                      ]}
                    >
                      {item.message}
                    </Text>

                    <View style={styles.messageFooter}>
                      <Text
                        style={[
                          styles.timeText,
                          {
                            color: isOwner
                              ? theme.colors.textInverse
                              : theme.colors.textMuted,
                          },
                        ]}
                      >
                        {item.created_at
                          ? new Date(
                              item.created_at
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </Text>

                      {isOwner ? (
                        <Ionicons
                          name={
                            item.is_read === true ||
                            item.read_at
                              ? "checkmark-done"
                              : "checkmark"
                          }
                          size={15}
                          color={
                            item.is_read === true ||
                            item.read_at
                              ? theme.colors.success
                              : theme.colors.textInverse
                          }
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View
            style={[
              styles.quickReplyArea,
              {
                backgroundColor: theme.colors.card,
                borderTopColor: theme.colors.cardBorder,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickReplyRow}
            >
              {quickReplies.map((reply) => (
                <TouchableOpacity
                  key={reply}
                  style={[
                    styles.quickReplyChip,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                  onPress={() => setMessage(reply)}
                >
                  <Text
                    style={[
                      styles.quickReplyText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {reply}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: theme.colors.card,
                borderTopColor: theme.colors.cardBorder,
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: theme.colors.inputBorder,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Type message..."
              placeholderTextColor={theme.colors.inputPlaceholder}
              value={message}
              onChangeText={setMessage}
              multiline
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: theme.colors.gold,
                },
                sending && styles.disabledButton,
              ]}
              onPress={sendMessage}
              disabled={sending || !message.trim()}
            >
              {sending ? (
                <ActivityIndicator
                  color={theme.colors.textInverse}
                />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={theme.colors.textInverse}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1 },
  keyboardView: { flex: 1 },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 15,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextArea: {
    flex: 1,
    paddingRight: 8,
  },
  headerEyebrow: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    marginTop: 3,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
  },

  tripContext: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  tripContextItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  tripContextText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 9.5,
    fontWeight: "700",
  },

  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },

  emptyCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 11.5,
    textAlign: "center",
  },

  messageBubble: {
    maxWidth: "84%",
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 17,
    borderWidth: 1,
    marginBottom: 10,
  },
  ownerBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
  },
  senderLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
    gap: 5,
  },
  timeText: {
    fontSize: 8.5,
    fontWeight: "600",
  },

  quickReplyArea: {
    borderTopWidth: 1,
    paddingTop: 9,
    paddingBottom: 8,
  },
  quickReplyRow: {
    gap: 8,
    paddingHorizontal: 12,
  },
  quickReplyChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  quickReplyText: {
    fontSize: 9.5,
    fontWeight: "700",
  },

  inputBar: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    gap: 10,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
