import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Building2,
  Camera,
  CarFront,
  CheckCircle,
  Globe2,
  HeartHandshake,
  Mail,
  MapPinned,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const SUPPORT_EMAIL = "support@angelexpressus.com";
const SUPPORT_PHONE_DISPLAY = "(972) 836-7910";
const SUPPORT_PHONE_RAW = "19728367910";
const SOCIAL_HANDLE = "@angelexpresss";

export default function AboutScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

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
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>ABOUT ANGEL EXPRESS</Text>

            <Text style={styles.title}>About Angel Express</Text>

            <Text style={styles.subtitle}>
              Premium private transportation built around comfort, operational
              excellence, reliability, safety, and clean professional service.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CarFront size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Welcome to Angel Express Mobility</Text>
                <Text style={styles.heroText}>
                  Safe, comfortable, and reliable travel across Texas and beyond.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<Building2 size={24} color={colors.gold} />}
                title="Who We Are"
                styles={styles}
              />

              <Text style={styles.text}>
                Angel Express Mobility is a premium transportation service designed
                to provide safe, comfortable, and reliable travel across Texas and
                beyond.
              </Text>

              <Text style={styles.text}>
                Whether you are traveling between cities, heading to the airport,
                attending a major event, or visiting family and friends, Angel Express
                delivers a personalized transportation experience focused on
                convenience, professionalism, and peace of mind.
              </Text>
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<Sparkles size={24} color={colors.gold} />}
                title="Our Mission"
                styles={styles}
              />

              <Text style={styles.text}>
                To provide dependable transportation solutions that combine comfort,
                safety, and exceptional customer service while making travel simple,
                organized, and stress-free.
              </Text>
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<Star size={24} color={colors.gold} />}
                title="Why Ride With Us?"
                styles={styles}
              />

              <FeatureGrid
                styles={styles}
                colors={colors}
                items={[
                  "Professional drivers",
                  "Safe transportation",
                  "Real-time booking",
                  "Student discounts",
                  "Airport transfers",
                  "Texas city-to-city rides",
                  "Family Check-In+",
                  "Transparent pricing",
                ]}
              />
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<MapPinned size={24} color={colors.gold} />}
                title="Service Areas"
                styles={styles}
              />

              <FeatureGrid
                styles={styles}
                colors={colors}
                items={[
                  "Dallas",
                  "Fort Worth",
                  "Austin",
                  "Houston",
                  "San Antonio",
                  "College Station",
                  "Oklahoma City",
                  "Custom destinations",
                ]}
              />
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<ShieldCheck size={24} color={colors.gold} />}
                title="Our Core Values"
                styles={styles}
              />

              <ValueCard
                title="Comfort"
                text="Travel in clean, comfortable vehicles designed for a relaxing journey."
                styles={styles}
              />

              <ValueCard
                title="Operational Excellence"
                text="Every ride is managed with professionalism and attention to detail."
                styles={styles}
              />

              <ValueCard
                title="Reliability"
                text="Dependable service you can trust when it matters most."
                styles={styles}
              />

              <ValueCard
                title="Safety"
                text="Your safety remains our highest priority from pickup to drop-off."
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<Globe2 size={24} color={colors.gold} />}
                title="Angel Express Ecosystem"
                styles={styles}
              />

              <Text style={styles.text}>
                Angel Express connects the website, passenger app, driver app, and
                owner operations app into one seamless ride management ecosystem.
              </Text>

              <FeatureGrid
                styles={styles}
                colors={colors}
                items={[
                  "Passenger App",
                  "Driver App",
                  "Owner App",
                  "Website Booking",
                  "Live Trip Tracking",
                  "Rewards",
                  "Student Travel Mode+",
                  "Safety Share",
                ]}
              />
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<HeartHandshake size={24} color={colors.gold} />}
                title="Contact Us"
                styles={styles}
              />

              <ContactButton
                icon={<Globe2 size={18} color={colors.gold} />}
                title="Website"
                onPress={() => Linking.openURL("https://angelexpressus.com")}
                styles={styles}
              />

              <ContactButton
                icon={<Phone size={18} color={colors.gold} />}
                title={`Call ${SUPPORT_PHONE_DISPLAY}`}
                onPress={() => Linking.openURL(`tel:+${SUPPORT_PHONE_RAW}`)}
                styles={styles}
              />

              <ContactButton
                icon={<Mail size={18} color={colors.gold} />}
                title={SUPPORT_EMAIL}
                onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
                styles={styles}
              />

              <ContactButton
                icon={<Camera size={18} color={colors.gold} />}
                title={`Instagram ${SOCIAL_HANDLE}`}
                onPress={() => Linking.openURL("https://instagram.com/angelexpresss")}
                styles={styles}
              />
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>App Information</Text>
              <Text style={styles.infoText}>Version: 1.0.0</Text>
              <Text style={styles.infoText}>© 2026 Angel Express Mobility</Text>
              <Text style={styles.infoText}>All Rights Reserved.</Text>
            </View>

            <View style={styles.footerCard}>
              <Text style={styles.footerText}>
                “Your journey matters. Thank you for choosing Angel Express Mobility.”
              </Text>
            </View>

            <TouchableOpacity
              style={styles.dashboardButton}
              onPress={() => router.push("/dashboard" as any)}
              activeOpacity={0.88}
            >
              <Text style={styles.dashboardButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function CardHeader({
  icon,
  title,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  styles: any;
}) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

function FeatureGrid({
  items,
  styles,
  colors,
}: {
  items: string[];
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.featureGrid}>
      {items.map((item) => (
        <View key={item} style={styles.featurePill}>
          <CheckCircle size={15} color={colors.gold} />
          <Text style={styles.featureText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ValueCard({
  title,
  text,
  styles,
}: {
  title: string;
  text: string;
  styles: any;
}) {
  return (
    <View style={styles.valueCard}>
      <Text style={styles.valueTitle}>{title}</Text>
      <Text style={styles.valueText}>{text}</Text>
    </View>
  );
}

function ContactButton({
  icon,
  title,
  onPress,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
  styles: any;
}) {
  return (
    <TouchableOpacity style={styles.contactButton} onPress={onPress} activeOpacity={0.85}>
      {icon}
      <Text style={styles.contactButtonText}>{title}</Text>
      <Text style={styles.contactArrow}>›</Text>
    </TouchableOpacity>
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
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },

    heroCard: {
      minHeight: 132,
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
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.navy,
      fontSize: 14.5,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },

    text: {
      color: c.text,
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 12,
      fontWeight: "700",
    },

    featureGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    featurePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card2,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    featureText: {
      color: c.text,
      fontSize: 13,
      fontWeight: "800",
    },

    valueCard: {
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 16,
      padding: 15,
      marginBottom: 12,
    },
    valueTitle: {
      color: c.gold,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 6,
    },
    valueText: {
      color: c.text2,
      fontSize: 14.5,
      lineHeight: 22,
      fontWeight: "700",
    },

    contactButton: {
      minHeight: 56,
      backgroundColor: c.card2,
      borderRadius: 15,
      paddingHorizontal: 15,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.borderSoft,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    contactButtonText: {
      color: c.text,
      fontSize: 15,
      fontWeight: "800",
      flex: 1,
    },
    contactArrow: {
      color: c.gold,
      fontSize: 30,
      fontWeight: "300",
      marginTop: -2,
    },

    infoCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    infoTitle: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 12,
    },
    infoText: {
      color: c.text,
      fontSize: 15,
      marginBottom: 8,
      fontWeight: "700",
    },

    footerCard: {
      backgroundColor: c.gold,
      borderRadius: 22,
      padding: 22,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    footerText: {
      color: c.navy,
      fontSize: 18,
      textAlign: "center",
      fontWeight: "900",
      lineHeight: 28,
    },

    dashboardButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    dashboardButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}