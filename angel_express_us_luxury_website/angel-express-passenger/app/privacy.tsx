import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  AE_COLORS,
  AngelCard,
  fadeUp,
} from "../components/angel";

export default function PrivacyScreen() {
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      fadeUp(headerFade, 80),
      fadeUp(cardFade, 50),
    ]).start();
  }, []);

  const headerTranslate = headerFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const cardTranslate = cardFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Animated.View
          style={{
            opacity: headerFade,
            transform: [{ translateY: headerTranslate }],
          }}
        >
          <View style={styles.kicker}>
            <Text style={styles.kickerText}>A  TERMS & PRIVACY</Text>
          </View>

          <Text style={styles.title}>
            Angel Express{"\n"}
            <Text style={styles.gold}>Terms & Privacy.</Text>
          </Text>

          <Text style={styles.intro}>
            These terms apply to the Angel Express website, Passenger App, Driver App,
            Owner App, booking system, live trip tracking, notifications, payments,
            chauffeur operations, and related services.
          </Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: cardFade,
            transform: [{ translateY: cardTranslate }],
          }}
        >
          <AngelCard style={styles.card}>
            <Section
              title="1. Privacy Commitment"
              text="Angel Express Mobility respects your privacy. We collect only the information needed to create your account, manage bookings, contact you about rides, improve transportation services, and support safety."
            />

            <Section
              title="2. Information We Collect"
              text="We may collect your name, email, phone number, pickup and drop-off locations, trip dates and times, emergency contact information, ride preferences, booking history, ratings, feedback, push notification tokens, and live trip information during active rides."
            />

            <Section
              title="3. How We Use Information"
              text="Your information may be used for ride booking, driver assignment, confirmations, invoices, customer support, live trip tracking, safety monitoring, account management, service notifications, and payment coordination."
            />

            <Section
              title="4. Passenger App Data"
              text="The Passenger App may store profile information, emergency contacts, ride preferences, trip history, ratings, feedback, booking activity, push notification tokens, and live trip updates."
            />

            <Section
              title="5. Location & Live Tracking"
              text="Angel Express may use location information during active rides to support navigation, passenger updates, owner monitoring, chauffeur coordination, and safety response."
            />

            <Section
              title="6. Payments"
              text="Angel Express may use Stripe, Stripe Connect, Apple Pay, Google Pay, or other approved payment methods. Angel Express does not store full card details on its own systems."
            />

            <Section
              title="7. Information Sharing"
              text="Angel Express does not sell personal information. Information may be shared only when needed to complete ride services, process payments, provide customer support, respond to legal requirements, address safety concerns, or support Angel Express operations."
            />

            <Section
              title="8. Data Security"
              text="Angel Express uses reasonable safeguards to protect passenger and chauffeur information. Access to operational systems is limited to authorized personnel and service providers where needed."
            />

            <Section
              title="9. Third-Party Services"
              text="Angel Express may use services such as Supabase, Stripe, Google Calendar, email providers, WhatsApp links, mapping services, push notification services, Cloudflare, and analytics tools."
            />

            <Section
              title="10. Updates"
              text="Angel Express may update these Terms and Privacy details as the website, Passenger App, Driver App, Owner App, booking flow, payment systems, and operations evolve."
            />

            <View style={styles.contactBox}>
              <Text style={styles.contactTitle}>Angel Express Mobility</Text>
              <Text style={styles.contactText}>Dallas, Texas</Text>
              <Text style={styles.contactText}>angelsexpresss@gmail.com</Text>
              <Text style={styles.contactText}>+1 (972) 836-7910</Text>
            </View>
          </AngelCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
  },

  container: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 22,
  },

  backText: {
    color: AE_COLORS.gold,
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
    marginBottom: 20,
  },

  kickerText: {
    color: AE_COLORS.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  title: {
    color: AE_COLORS.white,
    fontSize: 44,
    fontWeight: "900",
    lineHeight: 46,
    letterSpacing: -1.2,
    marginBottom: 18,
  },

  gold: {
    color: AE_COLORS.gold,
  },

  intro: {
    color: "#dce5ee",
    fontSize: 16,
    lineHeight: 27,
    marginBottom: 26,
  },

  card: {
    padding: 22,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    color: AE_COLORS.gold,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 9,
  },

  sectionText: {
    color: "#dce5ee",
    fontSize: 15.5,
    lineHeight: 26,
  },

  contactBox: {
    marginTop: 8,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
  },

  contactTitle: {
    color: AE_COLORS.gold,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },

  contactText: {
    color: AE_COLORS.white,
    fontSize: 15,
    lineHeight: 24,
  },
});