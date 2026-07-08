import { router, useFocusEffect } from "expo-router";
import * as Linking from "expo-linking";
import { useCallback, useMemo, useRef, useState } from "react";
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

type SupportMessage = {
  id: string;
  driver_id?: string;
  sender_role: "driver" | "assistant" | "owner";
  message: string;
  issue_type?: string;
  status?: string;
  read_by_owner?: boolean;
  read_by_driver?: boolean;
  created_at?: string;
};

export default function SupportScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const scrollRef = useRef<ScrollView | null>(null);

  const DISPATCH_PHONE = "19728367910";
  const SUPPORT_EMAIL = "support@angelexpressus.com";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const [driver, setDriver] = useState<any>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: "assistant-welcome",
      sender_role: "assistant",
      message:
        "Hi, I’m Angel Assist. Choose a support issue below or type your question. I can help with simple driver issues first, and if needed I’ll connect you with the Angel Express owner.",
      issue_type: "Welcome",
      created_at: new Date().toISOString(),
    },
  ]);

  const [input, setInput] = useState("");
  const [selectedIssue, setSelectedIssue] = useState("General Support");
  const [ownerChatActive, setOwnerChatActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSupport();

      const interval = setInterval(() => {
        loadOwnerMessages(false);
      }, 5000);

      return () => clearInterval(interval);
    }, [driver?.id])
  );

  async function loadSupport() {
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

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (driverError) throw driverError;

      setDriver(driverData || { id: user.id });

      await loadOwnerMessages(false, user.id);
    } catch (err: any) {
      Alert.alert("Support Error", err.message || "Unable to load support.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadOwnerMessages(showLoading = true, driverId?: string) {
    try {
      if (showLoading) setLoading(true);

      const id = driverId || driver?.id;
      if (!id) return;

      const { data, error } = await supabase
        .from("driver_support_messages")
        .select("*")
        .eq("driver_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.log("Owner support chat table/RLS issue:", error.message);
        return;
      }

      if (data && data.length > 0) {
        setOwnerChatActive(true);

        setMessages((current) => {
          const welcomeMessage = current.find(
            (item) => item.id === "assistant-welcome"
          );

          const localAssistantMessages = current.filter(
            (item) =>
              item.sender_role === "assistant" &&
              String(item.id).startsWith("assistant-") &&
              item.id !== "assistant-welcome"
          );

          const merged = [
            ...(welcomeMessage ? [welcomeMessage] : []),
            ...localAssistantMessages,
            ...(data as SupportMessage[]),
          ];

          const unique = merged.filter(
            (item, index, array) =>
              array.findIndex((row) => row.id === item.id) === index
          );

          return unique.sort((a, b) => {
            const aTime = new Date(a.created_at || 0).getTime();
            const bTime = new Date(b.created_at || 0).getTime();
            return aTime - bTime;
          });
        });

        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 150);
      }
    } catch (err: any) {
      console.log("Load owner support messages error:", err.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadSupport();
  }

  async function callDispatch() {
    await Linking.openURL(`tel:${DISPATCH_PHONE}`);
  }

  async function openWhatsApp() {
    const message =
      "Hello Angel Express Support,%0A%0ADriver Name:%0ATrip ID:%0A%0AI need assistance with:";
    await Linking.openURL(`https://wa.me/${DISPATCH_PHONE}?text=${message}`);
  }

  async function emailSupport() {
    const subject = encodeURIComponent("Angel Express Driver Support");
    const body = encodeURIComponent(
      "Hello Angel Express Support,\n\nDriver Name:\nTrip ID:\n\nI need assistance with:\n"
    );

    await Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
    );
  }

  function getAssistantReply(issue: string) {
    if (issue === "Passenger No Show") {
      return "For a passenger no-show: stay parked safely, call or message the passenger once, and wait according to Angel Express policy. Do not cancel the trip yourself unless dispatch or the owner confirms. If the passenger still does not appear, tap “Connect Owner” so the owner can document and decide the next step.";
    }

    if (issue === "Vehicle Issue") {
      return "For a vehicle issue: pull over safely if you are driving. Do not continue an active ride if the vehicle is unsafe. Check tires, engine warning lights, fuel, battery, and passenger safety first. Tap “Connect Owner” immediately if this affects an active trip.";
    }

    if (issue === "Running Late") {
      return "If you are running late: safely notify the passenger, update the owner, and do not speed. Share your estimated arrival time. If the delay may affect pickup, airport timing, or the passenger’s schedule, tap “Connect Owner” so dispatch can assist.";
    }

    if (issue === "Route Change") {
      return "For a route change: confirm the passenger’s preferred destination or stop, then notify Angel Express if the route affects fare, timing, safety, or mileage. For major route changes, connect with the owner before continuing.";
    }

    if (issue === "Payment Question") {
      return "For payment questions: check your Earnings screen first. Driver payouts are based on the trip total, driver payout calculation, and payout status. If a completed trip is missing or the amount looks wrong, tap “Connect Owner” and include the trip ID.";
    }

    return "I can help with common support issues. Please describe what happened, include the trip ID if you have one, and tap “Connect Owner” if you need a real person to review it.";
  }

  function addLocalMessage(
    role: "driver" | "assistant",
    text: string,
    issue?: string
  ) {
    const localMessage: SupportMessage = {
      id: `${role}-${Date.now()}-${Math.random()}`,
      sender_role: role,
      message: text,
      issue_type: issue || selectedIssue,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, localMessage]);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }

  function reportIssue(issue: string) {
    setSelectedIssue(issue);

    addLocalMessage("driver", issue, issue);

    setTimeout(() => {
      addLocalMessage("assistant", getAssistantReply(issue), issue);
    }, 350);
  }

  async function connectOwner(prefill?: string) {
    try {
      const issue = selectedIssue || "General Support";
      const messageText =
        prefill || input.trim() || `Driver needs help with: ${issue}`;

      const driverId = driver?.id;

      if (!driverId) {
        Alert.alert("Driver Missing", "Please reload support and try again.");
        return;
      }

      setSending(true);
      setOwnerChatActive(true);

      const { error } = await supabase.from("driver_support_messages").insert({
        driver_id: driverId,
        sender_role: "driver",
        message: messageText,
        issue_type: issue,
        status: "open",
        read_by_owner: false,
        read_by_driver: true,
      });

      if (error) throw error;

      setInput("");

      addLocalMessage(
        "assistant",
        "Owner chat connected. Angel Express Owner/Dispatch can now see this issue and reply here.",
        issue
      );

      await loadOwnerMessages(false, driverId);
    } catch (err: any) {
      Alert.alert(
        "Owner Chat Error",
        err.message ||
          "Unable to connect owner chat. Check Supabase RLS policy for driver_support_messages."
      );
    } finally {
      setSending(false);
    }
  }

  async function sendChatMessage() {
    const clean = input.trim();

    if (!clean) return;

    if (!ownerChatActive) {
      addLocalMessage("driver", clean, selectedIssue);
      setInput("");

      setTimeout(() => {
        addLocalMessage("assistant", getAssistantReply(selectedIssue), selectedIssue);
      }, 350);

      return;
    }

    await connectOwner(clean);
  }

  function formatTime(value?: string) {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading Driver Support...</Text>
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
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.container}
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
            <View style={styles.topRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
                <Text style={styles.themeText}>
                  {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>Driver Support</Text>

            <Text style={styles.subtitle}>
              Angel Assist handles simple issues first. Connect to owner chat
              when you need human support.
            </Text>

            <View style={styles.assistantCard}>
              <View style={styles.assistantTop}>
                <View style={styles.botAvatar}>
                  <Text style={styles.botAvatarText}>AI</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.assistantTitle}>Angel Assist</Text>
                  <Text style={styles.assistantSub}>
                    {ownerChatActive
                      ? "Owner chat connected"
                      : "AI support assistant active"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusDot,
                    ownerChatActive && styles.statusDotOwner,
                  ]}
                />
              </View>

              <ScrollView
                style={styles.messageBox}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {messages.map((item) => {
                  const isDriver = item.sender_role === "driver";
                  const isOwner = item.sender_role === "owner";

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.messageBubble,
                        isDriver
                          ? styles.driverBubble
                          : isOwner
                          ? styles.ownerBubble
                          : styles.assistantBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageRole,
                          isDriver && styles.driverRole,
                        ]}
                      >
                        {isDriver
                          ? "You"
                          : isOwner
                          ? "Owner"
                          : "Angel Assist"}
                      </Text>

                      <Text
                        style={[
                          styles.messageText,
                          isDriver && styles.driverMessageText,
                        ]}
                      >
                        {item.message}
                      </Text>

                      <Text
                        style={[
                          styles.messageTime,
                          isDriver && styles.driverTime,
                        ]}
                      >
                        {formatTime(item.created_at)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.connectOwnerButton}
                onPress={() => connectOwner()}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color={colors.navy} />
                ) : (
                  <Text style={styles.connectOwnerText}>
                    Connect Owner / Dispatch Chat
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Contact Dispatch</Text>

              <TouchableOpacity style={styles.primaryButton} onPress={callDispatch}>
                <Text style={styles.primaryText}>📞 Call Dispatch</Text>
                <Text style={styles.buttonSubtext}>(972) 836-7910</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.whatsAppButton} onPress={openWhatsApp}>
                <Text style={styles.primaryText}>💬 WhatsApp Support</Text>
                <Text style={styles.buttonSubtext}>
                  Message Angel Express immediately
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.emailButton} onPress={emailSupport}>
                <Text style={styles.primaryText}>📧 Email Support</Text>
                <Text style={styles.buttonSubtext}>{SUPPORT_EMAIL}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Trip Issue</Text>

              {[
                "Passenger No Show",
                "Vehicle Issue",
                "Running Late",
                "Route Change",
                "Payment Question",
              ].map((issue) => (
                <TouchableOpacity
                  key={issue}
                  style={[
                    styles.issueButton,
                    selectedIssue === issue && styles.issueButtonActive,
                  ]}
                  onPress={() => reportIssue(issue)}
                >
                  <Text
                    style={[
                      styles.issueText,
                      selectedIssue === issue && styles.issueTextActive,
                    ]}
                  >
                    {issue}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyTitle}>Emergency Support</Text>
              <Text style={styles.emergencyText}>
                For active ride emergencies, use the Safety & Support panic tools.
              </Text>

              <TouchableOpacity
                style={styles.emergencyButton}
                onPress={() => router.push("/safety-support")}
              >
                <Text style={styles.emergencyButtonText}>
                  🚨 Open Emergency Tools
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={
                ownerChatActive
                  ? "Message owner/dispatch..."
                  : "Ask Angel Assist..."
              }
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              multiline
            />

            <TouchableOpacity
              style={[styles.sendButton, sending && styles.disabledButton]}
              onPress={sendChatMessage}
              disabled={sending}
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
      justifyContent: "center",
      alignItems: "center",
    },

    loadingText: {
      color: colors.text2,
      marginTop: 14,
      fontWeight: "800",
    },

    container: {
      padding: 22,
      paddingTop: 60,
      paddingBottom: 40,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },

    backButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },

    backText: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 14,
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
      color: colors.text,
      fontSize: 34,
      fontWeight: "900",
      marginBottom: 8,
    },

    subtitle: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 22,
      fontWeight: "700",
    },

    assistantCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(colors),
    },

    assistantTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
    },

    botAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.gold,
      alignItems: "center",
      justifyContent: "center",
    },

    botAvatarText: {
      color: colors.navy,
      fontWeight: "900",
      fontSize: 15,
    },

    assistantTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
    },

    assistantSub: {
      color: colors.text2,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 2,
    },

    statusDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.success,
    },

    statusDotOwner: {
      backgroundColor: colors.blue,
    },

    messageBox: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      padding: 12,
      maxHeight: 220,
      marginBottom: 14,
    },

    messageBubble: {
      padding: 12,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      maxWidth: "92%",
    },

    driverBubble: {
      alignSelf: "flex-end",
      backgroundColor: colors.gold,
      borderColor: colors.gold,
    },

    assistantBubble: {
      alignSelf: "flex-start",
      backgroundColor: colors.card,
      borderColor: colors.borderSoft,
    },

    ownerBubble: {
      alignSelf: "flex-start",
      backgroundColor: colors.blueSoft,
      borderColor: colors.blue,
    },

    messageRole: {
      color: colors.muted2,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 5,
    },

    driverRole: {
      color: colors.navy,
      opacity: 0.72,
    },

    messageText: {
      color: colors.text,
      fontSize: 14.5,
      lineHeight: 21,
      fontWeight: "700",
    },

    driverMessageText: {
      color: colors.navy,
    },

    messageTime: {
      color: colors.muted2,
      fontSize: 10,
      fontWeight: "700",
      marginTop: 6,
      alignSelf: "flex-end",
    },

    driverTime: {
      color: colors.navy,
      opacity: 0.68,
    },

    connectOwnerButton: {
      backgroundColor: colors.gold,
      borderRadius: 16,
      padding: 15,
      alignItems: "center",
    },

    connectOwnerText: {
      color: colors.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
    },

    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(colors),
    },

    sectionTitle: {
      color: colors.gold,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 15,
    },

    primaryButton: {
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.16)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 17,
      marginBottom: 12,
    },

    whatsAppButton: {
      backgroundColor: colors.successSoft,
      borderWidth: 1,
      borderColor: colors.success,
      borderRadius: 16,
      padding: 17,
      marginBottom: 12,
    },

    emailButton: {
      backgroundColor: colors.blueSoft,
      borderWidth: 1,
      borderColor: colors.blue,
      borderRadius: 16,
      padding: 17,
    },

    primaryText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 5,
    },

    buttonSubtext: {
      color: colors.text2,
      fontSize: 13,
      fontWeight: "700",
    },

    issueButton: {
      backgroundColor: colors.card2,
      borderRadius: 14,
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },

    issueButtonActive: {
      borderColor: colors.gold,
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.14)" : "#FFF8E8",
    },

    issueText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },

    issueTextActive: {
      color: colors.gold,
      fontWeight: "900",
    },

    emergencyCard: {
      backgroundColor:
        colors.mode === "dark" ? "rgba(127,29,29,0.82)" : "#FEE2E2",
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: 22,
      padding: 20,
    },

    emergencyTitle: {
      color: colors.mode === "dark" ? "#FFFFFF" : "#991B1B",
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 8,
    },

    emergencyText: {
      color: colors.mode === "dark" ? "#FEE2E2" : "#7F1D1D",
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 15,
      fontWeight: "700",
    },

    emergencyButton: {
      backgroundColor: colors.danger,
      borderRadius: 15,
      padding: 16,
    },

    emergencyButtonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "900",
      textAlign: "center",
    },

    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 22 : 14,
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