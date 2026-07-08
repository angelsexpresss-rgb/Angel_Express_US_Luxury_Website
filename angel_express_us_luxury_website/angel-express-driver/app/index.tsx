import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useDriverTheme, v5Shadow } from "../lib/driverTheme";

export default function ChauffeurWelcomeScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
              </Text>
            </TouchableOpacity>

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
              styles={styles}
            />

            {showBenefits && (
              <View style={styles.card}>
                <Benefit text="Earn up to 70% of trip revenue" styles={styles} />
                <Benefit text="Premium passengers and private bookings" styles={styles} />
                <Benefit text="Regional and airport transportation" styles={styles} />
                <Benefit text="Route preference matching" styles={styles} />
                <Benefit text="Flexible scheduling" styles={styles} />
                <Benefit text="Live trip management and GPS tracking" styles={styles} />
                <Benefit text="Direct support from Angel Express operations" styles={styles} />
              </View>
            )}

            <Dropdown
              small="WHY JOIN AEM"
              title="Why Join Angel Express Mobility?"
              open={showWhyJoin}
              onPress={() => setShowWhyJoin(!showWhyJoin)}
              styles={styles}
            />

            {showWhyJoin && (
              <View style={styles.card}>
                <Benefit text="Built for professional long-distance transportation" styles={styles} />
                <Benefit text="Focused on comfort, reliability, security, and cleanliness" styles={styles} />
                <Benefit text="Owner-managed dispatch and operational support" styles={styles} />
                <Benefit text="Student, airport, event, and private ride demand" styles={styles} />
                <Benefit text="Simple trip acceptance and active ride workflow" styles={styles} />
                <Benefit text="Clear earnings with Stripe Connect payout support" styles={styles} />
              </View>
            )}

            <Dropdown
              small="OUR STANDARDS & COMMITMENT"
              title="Chauffeur Expectations"
              open={showStandards}
              onPress={() => setShowStandards(!showStandards)}
              styles={styles}
            />

            {showStandards && (
              <View style={styles.card}>
                <Text style={styles.standardIntro}>
                  Angel Express chauffeurs represent a premium mobility brand.
                  Every ride should reflect professionalism, safety, care, and
                  respect.
                </Text>

                <Benefit text="Arrive on time and communicate clearly with passengers." styles={styles} />
                <Benefit text="Keep your vehicle clean, fresh, safe, and ride-ready." styles={styles} />
                <Benefit text="Drive calmly, professionally, and follow all road safety rules." styles={styles} />
                <Benefit text="Respect passenger privacy, comfort, music, and conversation preferences." styles={styles} />
                <Benefit text="Treat students, families, tourists, and airport travelers with patience and care." styles={styles} />
                <Benefit text="Use the Driver App during active trips for status updates and GPS tracking." styles={styles} />
                <Benefit text="Never share passenger personal details outside Angel Express operations." styles={styles} />
                <Benefit text="Report emergencies, delays, route issues, or passenger concerns immediately." styles={styles} />

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
  styles,
}: {
  small: string;
  title: string;
  open: boolean;
  onPress: () => void;
  styles: any;
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

function Benefit({ text, styles }: { text: string; styles: any }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkText}>✓</Text>
      </View>

      <Text style={styles.cardText}>{text}</Text>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
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
      backgroundColor: colors.overlay,
    },

    container: {
      flexGrow: 1,
      padding: 22,
      paddingTop: 58,
      paddingBottom: 46,
    },

    themePill: {
      alignSelf: "flex-end",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 14,
      marginBottom: 14,
    },

    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    logo: {
      width: "100%",
      height: 150,
      marginBottom: 18,
    },

    title: {
      color: colors.gold,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
      letterSpacing: 1.7,
      textTransform: "uppercase",
      marginBottom: 14,
    },

    heading: {
      color: colors.text,
      fontSize: 40,
      fontWeight: "900",
      textAlign: "center",
      letterSpacing: -1.3,
      lineHeight: 46,
      marginBottom: 14,
    },

    goldText: {
      color: colors.gold,
    },

    subtitle: {
      color: colors.text2,
      fontSize: 15.5,
      lineHeight: 24,
      textAlign: "center",
      marginBottom: 24,
    },

    actionCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 30,
      padding: 16,
      marginBottom: 18,
      ...v5Shadow(colors),
    },

    primaryButton: {
      backgroundColor: colors.gold,
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
      backgroundColor: colors.navy,
      alignItems: "center",
      justifyContent: "center",
    },

    buttonIcon: {
      color: colors.gold,
      fontSize: 25,
      fontWeight: "900",
    },

    primaryButtonText: {
      flex: 1,
      color: colors.navy,
      fontWeight: "900",
      fontSize: 17,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginLeft: 14,
    },

    buttonArrow: {
      color: colors.navy,
      fontSize: 38,
      fontWeight: "700",
    },

    secondaryButton: {
      borderWidth: 1.5,
      borderColor: colors.gold,
      backgroundColor: colors.mode === "dark" ? "rgba(5,11,22,0.78)" : colors.card,
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
      borderColor: colors.border,
      backgroundColor: colors.mode === "dark" ? "rgba(212,175,55,0.08)" : "#FFF8E8",
      alignItems: "center",
      justifyContent: "center",
    },

    outlineIcon: {
      color: colors.gold,
      fontSize: 25,
      fontWeight: "900",
    },

    secondaryButtonText: {
      flex: 1,
      color: colors.gold,
      fontWeight: "900",
      fontSize: 16,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginLeft: 14,
    },

    secondaryArrow: {
      color: colors.gold,
      fontSize: 38,
      fontWeight: "700",
    },

    dropdownHeader: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 18,
      marginBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    dropdownSmall: {
      color: colors.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.3,
      marginBottom: 5,
    },

    dropdownTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "900",
      lineHeight: 23,
    },

    dropdownIcon: {
      color: colors.gold,
      fontSize: 30,
      fontWeight: "900",
      marginLeft: 16,
    },

    card: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 18,
      marginBottom: 18,
    },

    standardIntro: {
      color: colors.text2,
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
      backgroundColor: colors.mode === "dark" ? "rgba(212,175,55,0.16)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },

    checkText: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 13,
    },

    cardText: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 23,
      flex: 1,
      fontWeight: "700",
    },

    commitmentBox: {
      marginTop: 8,
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.mode === "dark" ? "rgba(212,175,55,0.09)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
    },

    commitmentTitle: {
      color: colors.gold,
      fontSize: 17,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 8,
    },

    commitmentText: {
      color: colors.text,
      textAlign: "center",
      fontWeight: "900",
      letterSpacing: 0.5,
      lineHeight: 22,
    },

    privacyText: {
      color: colors.gold,
      textAlign: "center",
      fontWeight: "800",
      textDecorationLine: "underline",
      marginBottom: 18,
      marginTop: 4,
    },

    footer: {
      color: colors.text,
      textAlign: "center",
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.9,
    },
  });
}