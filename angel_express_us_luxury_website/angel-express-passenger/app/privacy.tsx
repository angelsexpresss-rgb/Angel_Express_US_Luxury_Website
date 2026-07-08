import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  FileText,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

const SUPPORT_EMAIL = "support@angelexpressus.com";
const SUPPORT_PHONE = "+1 (972) 836-7910";

export default function PrivacyScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const headerFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1)).current;

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

    Animated.sequence([
      fadeUp(headerFade, 80),
      fadeUp(cardFade, 50),
    ]).start();
  }, []);

  function fadeUp(value: Animated.Value, distance = 40) {
    value.setValue(0);

    return Animated.timing(value, {
      toValue: 1,
      duration: 520,
      delay: Math.max(0, distance),
      useNativeDriver: true,
    });
  }

  const headerTranslate = headerFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const cardTranslate = cardFade.interpolate({
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
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
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
                opacity: headerFade,
                transform: [{ translateY: headerTranslate }],
              }}
            >
              <Text style={styles.kicker}>TERMS & PRIVACY</Text>

              <Text style={styles.title}>
                Angel Express{"\n"}
                <Text style={styles.gold}>Terms & Privacy.</Text>
              </Text>

              <Text style={styles.intro}>
                These terms apply to the Angel Express website, Passenger App, Driver App,
                Owner App, booking system, live trip tracking, notifications, payments,
                chauffeur operations, and related services.
              </Text>

              <View style={styles.heroCard}>
                <View style={styles.heroIcon}>
                  <ShieldCheck size={31} color={colors.navy} />
                </View>

                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>Privacy First</Text>
                  <Text style={styles.heroText}>
                    Angel Express does not sell personal information. Data is used to
                    support rides, safety, communication, payments, rewards, and service.
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View
              style={{
                opacity: cardFade,
                transform: [{ translateY: cardTranslate }],
              }}
            >
              <View style={styles.card}>
                <Section
                  icon={<LockKeyhole size={22} color={colors.gold} />}
                  title="1. Privacy Commitment"
                  text="Angel Express Mobility respects your privacy. We collect only the information needed to create your account, manage bookings, contact you about rides, improve transportation services, and support safety."
                  styles={styles}
                />

                <Section
                  icon={<FileText size={22} color={colors.gold} />}
                  title="2. Information We Collect"
                  text="We may collect your name, email, phone number, pickup and drop-off locations, trip dates and times, emergency contact information, ride preferences, booking history, ratings, feedback, push notification tokens, and live trip information during active rides."
                  styles={styles}
                />

                <Section
                  icon={<ShieldCheck size={22} color={colors.gold} />}
                  title="3. How We Use Information"
                  text="Your information may be used for ride booking, driver assignment, confirmations, invoices, customer support, live trip tracking, safety monitoring, account management, service notifications, and payment coordination."
                  styles={styles}
                />

                <Section
                  icon={<FileText size={22} color={colors.gold} />}
                  title="4. Passenger App Data"
                  text="The Passenger App may store profile information, emergency contacts, ride preferences, trip history, ratings, feedback, booking activity, push notification tokens, and live trip updates."
                  styles={styles}
                />

                <Section
                  icon={<MapPin size={22} color={colors.gold} />}
                  title="5. Location & Live Tracking"
                  text="Angel Express may use location information during active rides to support navigation, passenger updates, owner monitoring, chauffeur coordination, and safety response."
                  styles={styles}
                />

                <Section
                  icon={<ShieldCheck size={22} color={colors.gold} />}
                  title="6. Payments"
                  text="Angel Express may use Stripe, Stripe Connect, Apple Pay, Google Pay, or other approved payment methods. Angel Express does not store full card details on its own systems."
                  styles={styles}
                />

                <Section
                  icon={<LockKeyhole size={22} color={colors.gold} />}
                  title="7. Information Sharing"
                  text="Angel Express does not sell personal information. Information may be shared only when needed to complete ride services, process payments, provide customer support, respond to legal requirements, address safety concerns, or support Angel Express operations."
                  styles={styles}
                />

                <Section
                  icon={<ShieldCheck size={22} color={colors.gold} />}
                  title="8. Data Security"
                  text="Angel Express uses reasonable safeguards to protect passenger and chauffeur information. Access to operational systems is limited to authorized personnel and service providers where needed."
                  styles={styles}
                />

                <Section
                  icon={<FileText size={22} color={colors.gold} />}
                  title="9. Third-Party Services"
                  text="Angel Express may use services such as Supabase, Stripe, Google Calendar, email providers, WhatsApp links, mapping services, push notification services, Cloudflare, and analytics tools."
                  styles={styles}
                />

                <Section
                  icon={<FileText size={22} color={colors.gold} />}
                  title="10. Updates"
                  text="Angel Express may update these Terms and Privacy details as the website, Passenger App, Driver App, Owner App, booking flow, payment systems, and operations evolve."
                  styles={styles}
                />

                <View style={styles.contactBox}>
                  <Text style={styles.contactTitle}>Angel Express Mobility</Text>

                  <View style={styles.contactRow}>
                    <MapPin size={17} color={colors.gold} />
                    <Text style={styles.contactText}>Dallas, Texas</Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Mail size={17} color={colors.gold} />
                    <Text style={styles.contactText}>{SUPPORT_EMAIL}</Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Phone size={17} color={colors.gold} />
                    <Text style={styles.contactText}>{SUPPORT_PHONE}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

function Section({
  icon,
  title,
  text,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  styles: any;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
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
    safeArea: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 46,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 22,
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
      fontSize: 44,
      fontWeight: "900",
      lineHeight: 46,
      letterSpacing: -1.2,
      marginBottom: 18,
    },
    gold: {
      color: c.gold,
    },
    intro: {
      color: c.text2,
      fontSize: 16,
      lineHeight: 27,
      marginBottom: 22,
      fontWeight: "700",
    },

    heroCard: {
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      color: c.navy,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 5,
    },
    heroText: {
      color: c.navy,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
      opacity: 0.82,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 22,
      ...v5Shadow(c),
    },

    section: {
      marginBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      paddingBottom: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      marginBottom: 10,
    },
    sectionIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      color: c.gold,
      fontSize: 19,
      fontWeight: "900",
      flex: 1,
    },
    sectionText: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 26,
      fontWeight: "700",
    },

    contactBox: {
      marginTop: 4,
      padding: 18,
      borderRadius: 20,
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.border,
    },
    contactTitle: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 12,
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 8,
    },
    contactText: {
      color: c.text,
      fontSize: 15,
      lineHeight: 24,
      fontWeight: "800",
      flex: 1,
    },
  });
}