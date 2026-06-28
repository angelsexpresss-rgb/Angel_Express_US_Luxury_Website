import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
  Bell,
  BriefcaseBusiness,
  CalendarDays,
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

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

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
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

  function localAnswer(userQuestion: string) {
    const q = userQuestion.toLowerCase();

    if (q.includes("book") || q.includes("reserve")) {
      return "To book a ride, go to Book a Ride, enter your pickup and drop-off address, choose your ride date and time, then continue to fare estimate. After reviewing the estimate, you can confirm the booking.";
    }

    if (q.includes("price") || q.includes("cost") || q.includes("fare") || q.includes("dallas to austin")) {
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

    if (q.includes("change") || q.includes("edit") || q.includes("pickup address") || q.includes("drop")) {
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

    if (q.includes("contact my driver") || q.includes("call driver") || q.includes("text driver")) {
      return "When your chauffeur is assigned, driver contact details may appear in My Trips or Live Trip Tracking. You can call or text the driver from the trip page when available.";
    }

    if (q.includes("late") || q.includes("delay") || q.includes("traffic")) {
      return "If your driver is delayed, check Live Trip Tracking for ETA updates. Traffic, weather, airport congestion, and event routes may affect timing. For urgent delays, contact Angel Express support.";
    }

    if (q.includes("pay") || q.includes("payment") || q.includes("receipt") || q.includes("invoice")) {
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

    if (q.includes("support") || q.includes("human") || q.includes("whatsapp") || q.includes("help")) {
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
              <Text style={styles.kickerText}>A  RIDE SUPPORT ASSISTANT</Text>
            </View>

            <Text style={styles.title}>AI Ride Assistant</Text>

            <Text style={styles.subtitle}>
              Get quick help with booking, pricing, airports, luggage, student
              travel, live trips, payments, safety, and support.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Sparkles size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Ask Angel Express</Text>
                <Text style={styles.heroText}>
                  Fast answers for common ride questions before, during, and after your trip.
                </Text>
              </View>
            </AngelCard>

            <View style={styles.featureGrid}>
              <MiniFeature icon={<Plane size={19} color={GOLD} />} title="Airport" />
              <MiniFeature icon={<Route size={19} color={GOLD} />} title="Routes" />
              <MiniFeature icon={<CreditCard size={19} color={GOLD} />} title="Payment" />
              <MiniFeature icon={<ShieldCheck size={19} color={GOLD} />} title="Safety" />
            </View>

            <AngelCard style={styles.quickBox}>
              <View style={styles.cardHeader}>
                <HelpCircle size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Quick Questions</Text>
              </View>

              {quickQuestions.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.quickButton}
                  onPress={() => handleQuickQuestion(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.quickIcon}>{getQuestionIcon(item)}</View>
                  <Text style={styles.quickText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </AngelCard>

            <AngelCard style={styles.chatBox}>
              <View style={styles.cardHeader}>
                <MessageCircle size={22} color={GOLD} />
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
            </AngelCard>

            <AngelCard style={styles.askBox}>
              <Text style={styles.inputLabel}>Ask your own question</Text>

              <TextInput
                style={styles.input}
                placeholder="Example: Can my driver wait if my flight is delayed?"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={question}
                onChangeText={setQuestion}
                multiline
              />

              <AngelHeroButton
                title="Ask Assistant"
                onPress={() => sendMessage()}
                variant="gold"
                style={styles.askButton}
              />

              <AngelHeroButton
                title="Get Support"
                onPress={() => router.push("/support" as any)}
                variant="outline"
                style={styles.supportButton}
              />
            </AngelCard>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function MiniFeature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.miniFeature}>
      {icon}
      <Text style={styles.miniFeatureText}>{title}</Text>
    </View>
  );
}

function getQuestionIcon(question: string) {
  const q = question.toLowerCase();

  if (q.includes("airport") || q.includes("dfw") || q.includes("love field")) {
    return <Plane size={18} color={GOLD} />;
  }

  if (q.includes("price") || q.includes("pay") || q.includes("receipt") || q.includes("cost")) {
    return <CreditCard size={18} color={GOLD} />;
  }

  if (q.includes("luggage")) {
    return <Luggage size={18} color={GOLD} />;
  }

  if (q.includes("student")) {
    return <UserRound size={18} color={GOLD} />;
  }

  if (q.includes("track") || q.includes("driver")) {
    return <MapPinned size={18} color={GOLD} />;
  }

  if (q.includes("late") || q.includes("delay")) {
    return <Clock size={18} color={GOLD} />;
  }

  if (q.includes("world cup") || q.includes("hotel")) {
    return <BriefcaseBusiness size={18} color={GOLD} />;
  }

  if (q.includes("support") || q.includes("emergency")) {
    return <Bell size={18} color={GOLD} />;
  }

  return <CarFront size={18} color={GOLD} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
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
    backgroundColor: "rgba(5,11,22,0.91)",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 22,
    paddingTop: 56,
    paddingBottom: 50,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 18,
  },
  backText: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
  },
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
    letterSpacing: -0.7,
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
  heroCopy: {
    flex: 1,
  },
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
    borderColor: "rgba(212,175,55,0.22)",
    backgroundColor: "rgba(13,20,34,0.84)",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  miniFeatureText: {
    color: AE_COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
  quickBox: {
    padding: 20,
    marginBottom: 18,
  },
  chatBox: {
    padding: 20,
    marginBottom: 18,
  },
  chatScroll: {
    maxHeight: 360,
  },
  chatContent: {
    paddingBottom: 6,
  },
  askBox: {
    padding: 20,
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },
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
  messageBubble: {
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
  },
  aiBubble: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.14)",
  },
  userBubble: {
    backgroundColor: "rgba(212,175,55,0.16)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.24)",
  },
  messageRole: {
    color: GOLD,
    fontWeight: "900",
    marginBottom: 6,
    fontSize: 13,
    textTransform: "uppercase",
  },
  messageText: {
    color: AE_COLORS.white,
    fontSize: 15.5,
    lineHeight: 23,
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
  askButton: {
    marginTop: 2,
  },
  supportButton: {
    marginTop: 14,
  },
});