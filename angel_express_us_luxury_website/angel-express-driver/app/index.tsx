import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChauffeurWelcomeScreen() {
  const [showBenefits, setShowBenefits] = useState(false);
  const [showWhyJoin, setShowWhyJoin] = useState(false);
  const [showStandards, setShowStandards] = useState(false);

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
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: scaleAnim }] }]}>
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
            <Image
              source={require("../assets/images/angel-logo-transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.title}>Professional Chauffeur Network</Text>

            <Text style={styles.heading}>
              Drive With <Text style={styles.goldText}>Excellence.</Text>
            </Text>

            <Text style={styles.subtitle}>
              Serve premium airport travelers, students, corporate clients,
              tourists, private groups, and special events across Texas.
            </Text>

            <View style={styles.actionCard}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/driver-login")}
                activeOpacity={0.85}
              >
                <View style={styles.buttonIconBox}>
                  <Text style={styles.buttonIcon}>A</Text>
                </View>

                <Text style={styles.primaryButtonText}>Chauffeur Login</Text>
                <Text style={styles.buttonArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push("/driver-signup")}
                activeOpacity={0.85}
              >
                <View style={styles.outlineIconBox}>
                  <Text style={styles.outlineIcon}>A</Text>
                </View>

                <Text style={styles.secondaryButtonText}>Apply As Chauffeur</Text>
                <Text style={styles.secondaryArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <Dropdown
              small="CHAUFFEUR BENEFITS"
              title="Why Become an Angel Express Chauffeur?"
              open={showBenefits}
              onPress={() => setShowBenefits(!showBenefits)}
            />

            {showBenefits && (
              <View style={styles.card}>
                <Benefit text="Earn up to 70% of trip revenue" />
                <Benefit text="Premium passengers and private bookings" />
                <Benefit text="Regional and airport transportation" />
                <Benefit text="Route preference matching" />
                <Benefit text="Flexible scheduling" />
                <Benefit text="Live trip management and GPS tracking" />
                <Benefit text="Direct support from Angel Express operations" />
              </View>
            )}

            <Dropdown
              small="WHY JOIN AEM"
              title="Why Join Angel Express Mobility?"
              open={showWhyJoin}
              onPress={() => setShowWhyJoin(!showWhyJoin)}
            />

            {showWhyJoin && (
              <View style={styles.card}>
                <Benefit text="Built for professional long-distance transportation" />
                <Benefit text="Focused on comfort, reliability, security, and cleanliness" />
                <Benefit text="Owner-managed dispatch and operational support" />
                <Benefit text="Student, airport, event, and private ride demand" />
                <Benefit text="Simple trip acceptance and active ride workflow" />
                <Benefit text="Clear earnings with Stripe Connect payout support" />
              </View>
            )}

            <Dropdown
              small="OUR STANDARDS & COMMITMENT"
              title="Chauffeur Expectations"
              open={showStandards}
              onPress={() => setShowStandards(!showStandards)}
            />

            {showStandards && (
              <View style={styles.card}>
                <Text style={styles.standardIntro}>
                  Angel Express chauffeurs represent a premium mobility brand.
                  Every ride should reflect professionalism, safety, care, and
                  respect.
                </Text>

                <Benefit text="Arrive on time and communicate clearly with passengers." />
                <Benefit text="Keep your vehicle clean, fresh, safe, and ride-ready." />
                <Benefit text="Drive calmly, professionally, and follow all road safety rules." />
                <Benefit text="Respect passenger privacy, comfort, music, and conversation preferences." />
                <Benefit text="Treat students, families, tourists, and airport travelers with patience and care." />
                <Benefit text="Use the Driver App during active trips for status updates and GPS tracking." />
                <Benefit text="Never share passenger personal details outside Angel Express operations." />
                <Benefit text="Report emergencies, delays, route issues, or passenger concerns immediately." />

                <View style={styles.commitmentBox}>
                  <Text style={styles.commitmentTitle}>Angel Express Commitment</Text>
                  <Text style={styles.commitmentText}>
                    Comfort • Reliability • Security • Cleanliness
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity onPress={() => router.push("/privacy-policy")}>
              <Text style={styles.privacyText}>Privacy Policy</Text>
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

function Dropdown({
  small,
  title,
  open,
  onPress,
}: {
  small: string;
  title: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.dropdownHeader} onPress={onPress} activeOpacity={0.85}>
      <View style={{ flex: 1 }}>
        <Text style={styles.dropdownSmall}>{small}</Text>
        <Text style={styles.dropdownTitle}>{title}</Text>
      </View>

      <Text style={styles.dropdownIcon}>{open ? "−" : "+"}</Text>
    </TouchableOpacity>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkText}>✓</Text>
      </View>

      <Text style={styles.cardText}>{text}</Text>
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
    backgroundColor: "rgba(5,11,22,0.91)",
  },

  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 58,
    paddingBottom: 46,
  },

  logo: {
    width: "100%",
    height: 150,
    marginBottom: 18,
  },

  title: {
    color: "#D4AF37",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1.7,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  heading: {
    color: "#ffffff",
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1.3,
    lineHeight: 46,
    marginBottom: 14,
  },

  goldText: {
    color: "#D4AF37",
  },

  subtitle: {
    color: "#DDE3EA",
    fontSize: 15.5,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
  },

  actionCard: {
    backgroundColor: "rgba(13,20,34,0.9)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 30,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  },

  primaryButton: {
    backgroundColor: "#D4AF37",
    minHeight: 66,
    borderRadius: 22,
    paddingHorizontal: 14,
    marginBottom: 12,
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

  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    backgroundColor: "rgba(5,11,22,0.78)",
    minHeight: 66,
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  outlineIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  outlineIcon: {
    color: "#D4AF37",
    fontSize: 25,
    fontWeight: "900",
  },

  secondaryButtonText: {
    flex: 1,
    color: "#D4AF37",
    fontWeight: "900",
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 14,
  },

  secondaryArrow: {
    color: "#D4AF37",
    fontSize: 38,
    fontWeight: "700",
  },

  dropdownHeader: {
    backgroundColor: "rgba(13,20,34,0.9)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownSmall: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 5,
  },

  dropdownTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
  },

  dropdownIcon: {
    color: "#D4AF37",
    fontSize: 30,
    fontWeight: "900",
    marginLeft: 16,
  },

  card: {
    backgroundColor: "rgba(13,20,34,0.95)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },

  standardIntro: {
    color: "#DDE3EA",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700",
    marginBottom: 16,
  },

  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 13,
  },

  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(212,175,55,0.16)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  checkText: {
    color: "#D4AF37",
    fontWeight: "900",
    fontSize: 13,
  },

  cardText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 23,
    flex: 1,
    fontWeight: "700",
  },

  commitmentBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(212,175,55,0.09)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
  },

  commitmentTitle: {
    color: "#D4AF37",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },

  commitmentText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "900",
    letterSpacing: 0.5,
    lineHeight: 22,
  },

  privacyText: {
    color: "#D4AF37",
    textAlign: "center",
    fontWeight: "800",
    textDecorationLine: "underline",
    marginBottom: 18,
    marginTop: 4,
  },

  footer: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
});