import { router } from "expo-router";
import { useEffect, useRef } from "react";
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
  Building2,
  CarFront,
  CheckCircle,
  Globe2,
  HeartHandshake,
 Camera,
  Mail,
  MapPinned,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react-native";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

export default function AboutScreen() {
  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
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
              <Text style={styles.kickerText}>A  ABOUT ANGEL EXPRESS</Text>
            </View>

            <Text style={styles.title}>About Angel Express</Text>

            <Text style={styles.subtitle}>
              Premium private transportation built around comfort, operational
              excellence, reliability, safety, and clean professional service.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CarFront size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Welcome to Angel Express Mobility</Text>
                <Text style={styles.heroText}>
                  Safe, comfortable, and reliable travel across Texas and beyond.
                </Text>
              </View>
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<Building2 size={24} color={GOLD} />}
                title="Who We Are"
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
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<Sparkles size={24} color={GOLD} />}
                title="Our Mission"
              />

              <Text style={styles.text}>
                To provide dependable transportation solutions that combine comfort,
                safety, and exceptional customer service while making travel simple,
                organized, and stress-free.
              </Text>
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<Star size={24} color={GOLD} />}
                title="Why Ride With Us?"
              />

              <FeatureGrid
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
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<MapPinned size={24} color={GOLD} />}
                title="Service Areas"
              />

              <FeatureGrid
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
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<ShieldCheck size={24} color={GOLD} />}
                title="Our Core Values"
              />

              <ValueCard
                title="Comfort"
                text="Travel in clean, comfortable vehicles designed for a relaxing journey."
              />

              <ValueCard
                title="Operational Excellence"
                text="Every ride is managed with professionalism and attention to detail."
              />

              <ValueCard
                title="Reliability"
                text="Dependable service you can trust when it matters most."
              />

              <ValueCard
                title="Safety"
                text="Your safety remains our highest priority from pickup to drop-off."
              />
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<Globe2 size={24} color={GOLD} />}
                title="Angel Express Ecosystem"
              />

              <Text style={styles.text}>
                Angel Express connects the website, passenger app, driver app, and
                owner operations app into one seamless ride management ecosystem.
              </Text>

              <FeatureGrid
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
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<HeartHandshake size={24} color={GOLD} />}
                title="Contact Us"
              />

              <ContactButton
                icon={<Globe2 size={18} color={GOLD} />}
                title="Website"
                onPress={() => Linking.openURL("https://angelexpressus.com")}
              />

              <ContactButton
                icon={<Phone size={18} color={GOLD} />}
                title="Call (972) 836-7910"
                onPress={() => Linking.openURL("tel:+19728367910")}
              />

              <ContactButton
                icon={<Mail size={18} color={GOLD} />}
                title="Email Support"
                onPress={() => Linking.openURL("mailto:angelsexpresss@gmail.com")}
              />

              <ContactButton
  icon={<Camera size={18} color={GOLD} />}
  title="Instagram @angelexpresss"
  onPress={() => Linking.openURL("https://instagram.com/angelexpresss")}
/>
            </AngelCard>

            <AngelCard style={styles.infoCard}>
              <Text style={styles.infoTitle}>App Information</Text>
              <Text style={styles.infoText}>Version: 1.0.0</Text>
              <Text style={styles.infoText}>© 2026 Angel Express Mobility</Text>
              <Text style={styles.infoText}>All Rights Reserved.</Text>
            </AngelCard>

            <AngelCard variant="gold" style={styles.footerCard}>
              <Text style={styles.footerText}>
                “Your journey matters. Thank you for choosing Angel Express Mobility.”
              </Text>
            </AngelCard>

            <AngelHeroButton
              title="Back to Dashboard"
              onPress={() => router.push("/dashboard" as any)}
              variant="outline"
              style={styles.dashboardButton}
            />
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

function FeatureGrid({ items }: { items: string[] }) {
  return (
    <View style={styles.featureGrid}>
      {items.map((item) => (
        <View key={item} style={styles.featurePill}>
          <CheckCircle size={15} color={GOLD} />
          <Text style={styles.featureText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ValueCard({ title, text }: { title: string; text: string }) {
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
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.contactButton} onPress={onPress} activeOpacity={0.85}>
      {icon}
      <Text style={styles.contactButtonText}>{title}</Text>
      <Text style={styles.contactArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AE_COLORS.navy, overflow: "hidden" },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(5,11,22,0.91)" },
  container: { flex: 1 },
  content: { padding: 22, paddingTop: 56, paddingBottom: 50 },

  backButton: { alignSelf: "flex-start", marginBottom: 18 },
  backText: { color: GOLD, fontSize: 18, fontWeight: "900" },

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
  },
  subtitle: {
    color: AE_COLORS.textSoft,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },

  heroCard: {
    minHeight: 132,
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
  heroCopy: { flex: 1 },
  heroTitle: {
    color: AE_COLORS.navy2,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  heroText: {
    color: "rgba(6,17,31,0.78)",
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: "700",
  },

  card: { padding: 20, marginBottom: 18 },
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
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },

  text: {
    color: AE_COLORS.white,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
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
    borderColor: "rgba(212,175,55,0.22)",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  featureText: {
    color: AE_COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },

  valueCard: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.16)",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },
  valueTitle: {
    color: GOLD,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  valueText: {
    color: AE_COLORS.textSoft,
    fontSize: 14.5,
    lineHeight: 22,
  },

  contactButton: {
    minHeight: 56,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactButtonText: {
    color: AE_COLORS.white,
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  contactArrow: {
    color: GOLD,
    fontSize: 30,
    fontWeight: "300",
    marginTop: -2,
  },

  infoCard: {
    padding: 20,
    marginBottom: 18,
  },
  infoTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  infoText: {
    color: AE_COLORS.white,
    fontSize: 15,
    marginBottom: 8,
  },

  footerCard: {
    padding: 22,
    marginBottom: 18,
  },
  footerText: {
    color: AE_COLORS.navy2,
    fontSize: 18,
    textAlign: "center",
    fontWeight: "900",
    lineHeight: 28,
  },

  dashboardButton: {
    marginTop: 4,
  },
});