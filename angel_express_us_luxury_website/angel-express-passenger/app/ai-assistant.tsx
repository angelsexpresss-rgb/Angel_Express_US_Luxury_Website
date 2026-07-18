import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  CarFront,
  Clock,
  CreditCard,
  HelpCircle,
  Luggage,
  MapPinned,
  MessageCircle,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const quickQuestions = [
  "How do I book a ride?",
  "How much is Dallas to Austin?",
  "Do you pick up from DFW Airport?",
  "Do you pick up from Dallas Love Field?",
  "Can I bring luggage?",
  "Can I book a round trip?",
  "Can I book for someone else?",
  "Can I change my pickup address?",
  "Can I cancel my ride?",
  "How does student discount work?",
  "How do student pool rides work?",
  "How do I track my driver?",
  "How do I contact my driver?",
  "What if my driver is late?",
  "How do I pay for my ride?",
  "Can I get a receipt?",
  "Do you support World Cup rides?",
  "Can Angel Express help with hotel pickup?",
  "What if I need emergency help?",
  "I need support from Angel Express",
];

export default function AIRideAssistantScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      text:
        "Welcome to Angel Ride Assistant. I can help with bookings, fares, airport pickups, luggage, student travel, live trip tracking, payments, safety, hotel pickup, events, and Angel Express support.",
    },
  ]);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef<ScrollView | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);

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

  function localAnswer(userQuestion: string) {
    const q = userQuestion.toLowerCase();

    if (q.includes("book") || q.includes("reserve")) {
      return "To book a ride, go to Book a Ride, enter your pickup and drop-off address, choose your ride date and time, then continue to fare estimate. After reviewing the estimate, you can confirm the booking.";
    }

    if (
      q.includes("price") ||
      q.includes("cost") ||
      q.includes("fare") ||
      q.includes("dallas to austin")
    ) {
      return "Angel Express calculates fares based on distance, trip type, airport/event demand, student discount eligibility, route timing, and special notes. For the most accurate price, use Book a Ride to generate a fare estimate.";
    }

    if (q.includes("airport") || q.includes("dfw") || q.includes("love field")) {
      return "Yes. Angel Express supports airport pickup and drop-off for DFW Airport, Dallas Love Field, Austin, Houston, and other airports. Add your flight number, terminal, airline, and luggage count in the booking notes.";
    }

    if (q.includes("luggage") || q.includes("bag") || q.includes("bags")) {
      return "You can add luggage count during booking. For large luggage, multiple suitcases, boxes, airport pickup, or group rides, add the details in the notes section so the chauffeur can prepare properly.";
    }

    if (q.includes("round trip") || q.includes("return")) {
      return "Yes. Angel Express supports one-way and round-trip rides. Choose Round Trip during booking and include return details in the notes if needed.";
    }

    if (q.includes("someone else") || q.includes("friend") || q.includes("family")) {
      return "Yes. You can book for someone else. Add the passenger name, phone number, pickup instructions, and emergency contact details in the booking notes.";
    }

    if (
      q.includes("change") ||
      q.includes("edit") ||
      q.includes("pickup address") ||
      q.includes("drop")
    ) {
      return "For changes to pickup, drop-off, ride time, luggage, or notes, go to My Trips and use Manage Booking. If the ride is close to pickup time, contact Angel Express support immediately.";
    }

    if (q.includes("cancel")) {
      return "To cancel a ride, go to My Trips and open Manage Booking. If a chauffeur has already been assigned or is already on the way, contact support for the fastest help.";
    }

    if (q.includes("student") || q.includes("discount") || q.includes("pool")) {
      return "Student Travel Mode+ supports verified student discounts, campus hubs, and student pool rides. Submit student verification first, then you can unlock student benefits and join or request student pool rides.";
    }

    if (q.includes("track") || q.includes("live") || q.includes("driver location")) {
      return "You can track an active ride from My Trips or Live Trip Tracking. Driver location appears once the chauffeur starts sharing GPS for the trip.";
    }

    if (
      q.includes("contact my driver") ||
      q.includes("call driver") ||
      q.includes("text driver")
    ) {
      return "When your chauffeur is assigned, driver contact details may appear in My Trips or Live Trip Tracking. You can call or text the driver from the trip page when available.";
    }

    if (q.includes("late") || q.includes("delay") || q.includes("traffic")) {
      return "If your driver is delayed, check Live Trip Tracking for ETA updates. Traffic, weather, airport congestion, and event routes may affect timing. For urgent delays, contact Angel Express support.";
    }

    if (
      q.includes("pay") ||
      q.includes("payment") ||
      q.includes("receipt") ||
      q.includes("invoice")
    ) {
      return "After your ride is completed, your trip page will show payment status and payment options. Receipts and invoices appear in My Trips when available.";
    }

    if (q.includes("world cup") || q.includes("event") || q.includes("stadium")) {
      return "Angel Express supports event rides, stadium transportation, hotel pickup, airport transfers, group movement, and World Cup travel planning. Use Travel Concierge or Book a Ride to plan your trip.";
    }

    if (q.includes("hotel")) {
      return "Yes. Angel Express can support hotel pickup and drop-off. Add hotel name, entrance area, and pickup instructions during booking.";
    }

    if (q.includes("emergency") || q.includes("unsafe") || q.includes("danger")) {
      return "If this is an emergency, call local emergency services immediately. You can also use Safety & Support, Family Check-In+, or Angel Express support for ride-related help.";
    }

    if (
      q.includes("support") ||
      q.includes("human") ||
      q.includes("whatsapp") ||
      q.includes("help")
    ) {
      return "For direct help, tap Get Support below. It will take you to the Angel Express Support Center.";
    }

    return "I can help with bookings, fare estimates, airport rides, luggage, student discounts, student pool rides, live tracking, driver contact, delays, payments, receipts, hotels, events, World Cup travel, safety, and support.";
  }

  function sendMessage(text?: string) {
    const userText = text || question.trim();

    if (!userText) {
      Alert.alert("Ask a Question", "Please type your question first.");
      return;
    }

    const answer = localAnswer(userText);

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
      { role: "assistant", text: answer },
    ]);

    setQuestion("");

    setTimeout(() => {
      mainScrollRef.current?.scrollToEnd({ animated: true });
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }

  function handleQuickQuestion(item: string) {
    sendMessage(item);
  }

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
          ref={mainScrollRef}
          style={styles.container}
          contentContainerStyle={styles.content}
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
            <Text style={styles.kicker}>RIDE SUPPORT ASSISTANT</Text>

            <Text style={styles.title}>AI Ride Assistant</Text>

            <Text style={styles.subtitle}>
              Get quick help with booking, pricing, airports, luggage, student
              travel, live trips, payments, safety, and support.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Sparkles size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Ask Angel Express</Text>
                <Text style={styles.heroText}>
                  Fast answers for common ride questions before, during, and after your trip.
                </Text>
              </View>
            </View>

            <View style={styles.featureGrid}>
              <MiniFeature
                icon={<Plane size={19} color={colors.gold} />}
                title="Airport"
                styles={styles}
              />
              <MiniFeature
                icon={<Route size={19} color={colors.gold} />}
                title="Routes"
                styles={styles}
              />
              <MiniFeature
                icon={<CreditCard size={19} color={colors.gold} />}
                title="Payment"
                styles={styles}
              />
              <MiniFeature
                icon={<ShieldCheck size={19} color={colors.gold} />}
                title="Safety"
                styles={styles}
              />
            </View>

            <View style={styles.quickBox}>
              <View style={styles.cardHeader}>
                <HelpCircle size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Quick Questions</Text>
              </View>

              {quickQuestions.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.quickButton}
                  onPress={() => handleQuickQuestion(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.quickIcon}>
                    {getQuestionIcon(item, colors)}
                  </View>
                  <Text style={styles.quickText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.chatBox}>
              <View style={styles.cardHeader}>
                <MessageCircle size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Conversation</Text>
              </View>

              <ScrollView
                ref={chatScrollRef}
                style={styles.chatScroll}
                contentContainerStyle={styles.chatContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {messages.map((message, index) => (
                  <View
                    key={index}
                    style={[
                      styles.messageBubble,
                      message.role === "user" ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    <Text style={styles.messageRole}>
                      {message.role === "user" ? "You" : "Angel Assistant"}
                    </Text>
                    <Text style={styles.messageText}>{message.text}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.askBox}>
              <Text style={styles.inputLabel}>Ask your own question</Text>

              <TextInput
                style={styles.input}
                placeholder="Example: Can my driver wait if my flight is delayed?"
                placeholderTextColor={colors.placeholder}
                value={question}
                onChangeText={setQuestion}
                multiline
              />

              <TouchableOpacity
                style={styles.goldButton}
                onPress={() => sendMessage()}
                activeOpacity={0.88}
              >
                <Text style={styles.goldButtonText}>Ask Assistant</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => router.push("/support" as any)}
                activeOpacity={0.88}
              >
                <Text style={styles.outlineButtonText}>Get Support</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function MiniFeature({
  icon,
  title,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  styles: any;
}) {
  return (
    <View style={styles.miniFeature}>
      {icon}
      <Text style={styles.miniFeatureText}>{title}</Text>
    </View>
  );
}

function getQuestionIcon(question: string, c: any) {
  const q = question.toLowerCase();

  if (q.includes("airport") || q.includes("dfw") || q.includes("love field")) {
    return <Plane size={18} color={c.gold} />;
  }

  if (
    q.includes("price") ||
    q.includes("pay") ||
    q.includes("receipt") ||
    q.includes("cost")
  ) {
    return <CreditCard size={18} color={c.gold} />;
  }

  if (q.includes("luggage")) {
    return <Luggage size={18} color={c.gold} />;
  }

  if (q.includes("student")) {
    return <UserRound size={18} color={c.gold} />;
  }

  if (q.includes("track") || q.includes("driver")) {
    return <MapPinned size={18} color={c.gold} />;
  }

  if (q.includes("late") || q.includes("delay")) {
    return <Clock size={18} color={c.gold} />;
  }

  if (q.includes("world cup") || q.includes("hotel")) {
    return <BriefcaseBusiness size={18} color={c.gold} />;
  }

  if (q.includes("support") || q.includes("emergency")) {
    return <Bell size={18} color={c.gold} />;
  }

  return <CarFront size={18} color={c.gold} />;
}

function createStyles(c: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
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
      backgroundColor: c.overlay,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 22,
      paddingTop: 58,
      paddingBottom: 54,
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
      letterSpacing: -0.7,
    },
    subtitle: {
      color: c.text2,
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
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      color: c.navy,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.navy,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },

    featureGrid: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 18,
    },
    miniFeature: {
      flex: 1,
      minHeight: 76,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      ...v5Shadow(c),
    },
    miniFeatureText: {
      color: c.text,
      fontSize: 12,
      fontWeight: "900",
    },

    quickBox: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    chatBox: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    askBox: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },

    chatScroll: {
      maxHeight: 360,
    },
    chatContent: {
      paddingBottom: 6,
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },

    quickButton: {
      backgroundColor: c.card2,
      padding: 15,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.borderSoft,
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

    messageBubble: {
      padding: 15,
      borderRadius: 16,
      marginBottom: 12,
    },
    aiBubble: {
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft,
    },
    userBubble: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
    },
    messageRole: {
      color: c.gold,
      fontWeight: "900",
      marginBottom: 6,
      fontSize: 13,
      textTransform: "uppercase",
    },
    messageText: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 23,
      fontWeight: "700",
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
      borderColor: c.borderSoft,
      marginBottom: 16,
      fontWeight: "700",
    },

    goldButton: {
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      ...v5Shadow(c),
    },
    goldButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    outlineButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}