import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function OwnerChatScreen() {
  const params = useLocalSearchParams();

  const bookingId = String(params.bookingId || "");
  const receiverRole = String(params.receiverRole || "passenger");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();

      const interval = setInterval(() => {
        loadMessages(false);
      }, 5000);

      return () => clearInterval(interval);
    }, [bookingId])
  );

  async function loadMessages(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (err: any) {
      Alert.alert("Chat Error", err.message || "Unable to load messages.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function sendMessage() {
    if (!message.trim()) return;

    try {
      setSending(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        Alert.alert("Not logged in", "Please log in again.");
        return;
      }

      const { error } = await supabase.from("chat_messages").insert({
        booking_id: Number(bookingId),
        sender_id: user.id,
        sender_role: "owner",
        receiver_role: receiverRole,
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

  function getChatTitle() {
    if (receiverRole === "driver") return "Driver Chat";
    if (receiverRole === "emergency") return "Emergency Contact Chat";
    return "Passenger Chat";
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading Chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{getChatTitle()}</Text>
        <Text style={styles.subtitle}>Trip #{bookingId}</Text>
      </View>

      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadMessages(false);
            }}
          />
        }
      >
        {messages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No messages yet.</Text>
          </View>
        ) : (
          messages.map((item) => {
            const isOwner = item.sender_role === "owner";

            return (
              <View
                key={item.id}
                style={[
                  styles.messageBubble,
                  isOwner ? styles.ownerBubble : styles.otherBubble,
                ]}
              >
                <Text style={styles.senderLabel}>
                  {isOwner ? "Owner" : item.sender_role}
                </Text>

                <Text
                  style={[
                    styles.messageText,
                    isOwner ? styles.ownerMessageText : styles.otherMessageText,
                  ]}
                >
                  {item.message}
                </Text>

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

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type message..."
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111f",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07111f",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
  },
  header: {
    padding: 20,
    paddingTop: 55,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#07111f",
  },
  backButton: {
    backgroundColor: "rgba(212,175,55,0.15)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 12,
    padding: 10,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  backButtonText: {
    color: "#d4af37",
    fontWeight: "900",
  },
  title: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "900",
  },
  subtitle: {
    color: "#d4af37",
    marginTop: 4,
    fontWeight: "800",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  emptyText: {
    color: "#cbd5e1",
  },
  messageBubble: {
    maxWidth: "82%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  ownerBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#d4af37",
  },
  otherBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
    color: "#475569",
    textTransform: "uppercase",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  ownerMessageText: {
    color: "#07111f",
    fontWeight: "700",
  },
  otherMessageText: {
    color: "#fff",
  },
  timeText: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 6,
  },
  inputBar: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    backgroundColor: "#07111f",
    gap: 10,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    backgroundColor: "#0f172a",
    color: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sendButton: {
    backgroundColor: "#d4af37",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: "#07111f",
    fontWeight: "900",
  },
});