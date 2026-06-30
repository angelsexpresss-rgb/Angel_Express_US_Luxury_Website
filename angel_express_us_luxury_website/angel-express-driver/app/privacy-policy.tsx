import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PrivacyPolicyScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.04,
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 6000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.bgWrap, { transform: [{ scale: scaleAnim }] }]}
      >
        <ImageBackground
          source={require("../assets/images/driver-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <TouchableOpacity style={styles.backTop} onPress={() => router.back()}>
              <Text style={styles.backTopText}>‹ Back</Text>
            </TouchableOpacity>

            <View style={styles.kickerBox}>
              <Text style={styles.kicker}>ANGEL EXPRESS DRIVER APP</Text>
            </View>

            <Text style={styles.title}>
              Privacy <Text style={styles.goldText}>Policy.</Text>
            </Text>

            <Text style={styles.subtitle}>
              This policy explains how Angel Express Mobility collects, protects,
              and uses chauffeur information across the Driver App, website, and
              Angel Express operations.
            </Text>

            <View style={styles.policyCard}>
              <Section
                title="1. Information We Collect"
                body="Angel Express Mobility collects chauffeur information for account verification, driver approval, trip assignment, safety, payment processing, communication, and platform operations."
              />

              <Section
                title="2. Chauffeur Profile Information"
                body="Information may include your name, phone number, email address, profile details, vehicle information, driver status, license or approval information, ratings, trip history, support notes, and account activity."
              />

              <Section
                title="3. Location & Live Trip Data"
                body="Live location is used only when a chauffeur is online, assigned to a trip, navigating to pickup, waiting at pickup, transporting a passenger, or completing an active ride. Location supports safety, owner oversight, passenger visibility, and trip coordination."
              />

              <Section
                title="4. Payments & Payouts"
                body="Angel Express may process trip payment and payout-related information for driver earnings, payout tracking, trip revenue split, and Stripe Connect onboarding. Angel Express does not require full bank details inside the Driver App."
              />

              <Section
                title="5. Safety & Communication"
                body="Angel Express may use chauffeur and trip information to contact passengers, contact drivers, support emergency assistance, handle complaints, review trip performance, and maintain service quality."
              />

              <Section
                title="6. Data Sharing"
                body="Angel Express does not sell chauffeur information. Information is used to operate the transportation platform, support safety, manage trips, process payments, resolve support issues, and comply with business or legal obligations."
              />

              <Section
                title="7. Passenger Visibility"
                body="Passengers may see limited chauffeur details such as driver name, vehicle description, plate number, estimated arrival, trip status, rating, and live location during an active ride."
              />

              <Section
                title="8. Owner Oversight"
                body="Angel Express ownership may view live trips, chauffeur status, driver activity, ride progress, passenger contact needs, payout status, complaints, ratings, and operational performance."
              />

              <Section
                title="9. Data Protection"
                body="Angel Express works to protect chauffeur information through controlled access, account authentication, Supabase backend security, and platform-level privacy practices."
              />

              <Section
                title="10. Continued Use"
                body="By using the Angel Express Driver App, applying as a chauffeur, or accepting ride assignments, you agree to this privacy policy and the operational use of your information."
              />
            </View>

            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Angel Express Standard</Text>
              <Text style={styles.noticeText}>
                Chauffeur data is used to support Comfort, Reliability, Security,
                and Cleanliness across the Angel Express Mobility ecosystem.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <View style={styles.buttonIconBox}>
                <Text style={styles.buttonIcon}>A</Text>
              </View>

              <Text style={styles.primaryButtonText}>Back</Text>

              <Text style={styles.buttonArrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>
              Angel Express • Excellence In Every Ride
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050b16",
  },

  bgWrap: {
    ...StyleSheet.absoluteFillObject,
  },

  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,11,22,0.92)",
  },

  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 58,
    paddingBottom: 46,
  },

  backTop: {
    alignSelf: "flex-start",
    marginBottom: 18,
  },

  backTopText: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
  },

  kickerBox: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 15,
    marginBottom: 18,
  },

  kicker: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  title: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1.3,
    lineHeight: 48,
    marginBottom: 14,
  },

  goldText: {
    color: "#D4AF37",
  },

  subtitle: {
    color: "#DDE3EA",
    fontSize: 15.5,
    lineHeight: 24,
    marginBottom: 24,
  },

  policyCard: {
    backgroundColor: "rgba(13,20,34,0.9)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 30,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  },

  section: {
    paddingBottom: 18,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  sectionTitle: {
    color: "#D4AF37",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },

  sectionBody: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600",
  },

  noticeCard: {
    backgroundColor: "rgba(212,175,55,0.09)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },

  noticeTitle: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },

  noticeText: {
    color: "#DDE3EA",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
  },

  primaryButton: {
    backgroundColor: "#D4AF37",
    minHeight: 66,
    borderRadius: 22,
    paddingHorizontal: 14,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  buttonIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#050b16",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonIcon: {
    color: "#D4AF37",
    fontSize: 25,
    fontWeight: "900",
  },

  primaryButtonText: {
    flex: 1,
    color: "#050b16",
    fontWeight: "900",
    fontSize: 17,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 14,
  },

  buttonArrow: {
    color: "#050b16",
    fontSize: 38,
    fontWeight: "700",
  },

  footer: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
});