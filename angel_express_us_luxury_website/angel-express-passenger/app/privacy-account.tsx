import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Alert,
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
  Database,
  FileText,
  Headphones,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react-native";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

export default function PrivacyAccountScreen() {
  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

  function openPrivacyPolicy() {
    router.push("/privacy" as any);
  }

  function requestAccountDeletion() {
    Alert.alert(
      "Delete Account",
      "This will submit a request to permanently delete your Angel Express account and associated data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Deletion",
          style: "destructive",
          onPress: () => {
            Linking.openURL(
              "mailto:angelexpresss@gmail.com?subject=Account Deletion Request&body=I would like to permanently delete my Angel Express account and associated data."
            );
          },
        },
      ]
    );
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
              <Text style={styles.kickerText}>A  PRIVACY & ACCOUNT CONTROL</Text>
            </View>

            <Text style={styles.title}>Privacy & Account</Text>

            <Text style={styles.subtitle}>
              Manage how Angel Express protects your information, supports safety,
              and handles account deletion requests.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <ShieldCheck size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Your Data. Protected.</Text>
                <Text style={styles.heroText}>
                  Angel Express uses your information only to support rides,
                  safety, communication, payments, rewards, and customer service.
                </Text>
              </View>
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<LockKeyhole size={24} color={GOLD} />}
                title="Privacy Policy"
              />

              <Text style={styles.cardText}>
                Angel Express collects only the information needed to provide
                transportation services, safety features, notifications, trip history,
                rewards, and customer support.
              </Text>

              <AngelHeroButton
                title="View App Privacy Policy"
                onPress={openPrivacyPolicy}
                variant="gold"
                style={styles.cardButton}
              />
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<Database size={24} color={GOLD} />}
                title="Data We Collect"
              />

              <DataGrid
                items={[
                  "Name",
                  "Email Address",
                  "Phone Number",
                  "Trip Information",
                  "Pickup & Drop-off",
                  "Emergency Contacts",
                  "Push Tokens",
                  "Rewards Activity",
                ]}
              />
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<UserCheck size={24} color={GOLD} />}
                title="How We Use Your Data"
              />

              <Bullet text="Process ride bookings and trip requests." />
              <Bullet text="Provide safety notifications and live trip updates." />
              <Bullet text="Support Family Check-In+ and Safety Share." />
              <Bullet text="Connect passengers with owner and driver support." />
              <Bullet text="Manage rewards, referrals, discounts, and ride history." />
              <Bullet text="Improve customer service and travel assistance." />
            </AngelCard>

            <AngelCard style={styles.dangerCard}>
              <CardHeader
                icon={<Trash2 size={24} color="#FF6B6B" />}
                title="Request Account Deletion"
                danger
              />

              <Text style={styles.cardText}>
                You may request permanent deletion of your Angel Express account and
                personal information.
              </Text>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={requestAccountDeletion}
                activeOpacity={0.85}
              >
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                Some records may be retained where required by law, safety,
                accounting, payment, fraud prevention, or regulatory compliance.
              </Text>
            </AngelCard>

            <AngelCard style={styles.card}>
              <CardHeader
                icon={<Headphones size={24} color={GOLD} />}
                title="Need Help?"
              />

              <Text style={styles.cardText}>
                Contact Angel Express support for account, privacy, booking, reward,
                or safety questions.
              </Text>

              <AngelHeroButton
                title="Contact Support"
                onPress={() => router.push("/support" as any)}
                variant="outline"
                style={styles.cardButton}
              />
            </AngelCard>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function CardHeader({
  icon,
  title,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.cardHeader}>
      <View style={[styles.iconBox, danger && styles.dangerIconBox]}>{icon}</View>
      <Text style={[styles.cardTitle, danger && styles.dangerTitle]}>{title}</Text>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function DataGrid({ items }: { items: string[] }) {
  return (
    <View style={styles.dataGrid}>
      {items.map((item) => (
        <View key={item} style={styles.dataPill}>
          <FileText size={15} color={GOLD} />
          <Text style={styles.dataPillText}>{item}</Text>
        </View>
      ))}
    </View>
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
    minHeight: 135,
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
    fontSize: 23,
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
  dangerCard: {
    padding: 20,
    marginBottom: 18,
    borderColor: "rgba(255,107,107,0.35)",
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
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerIconBox: {
    borderColor: "rgba(255,107,107,0.45)",
    backgroundColor: "rgba(255,107,107,0.08)",
  },
  cardTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },
  dangerTitle: { color: "#FF6B6B" },

  cardText: {
    color: AE_COLORS.white,
    fontSize: 15,
    lineHeight: 24,
  },

  cardButton: { marginTop: 18 },

  dataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dataPill: {
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
  dataPillText: {
    color: AE_COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },

  bulletRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 10,
  },
  bulletDot: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  bulletText: {
    color: AE_COLORS.white,
    fontSize: 15,
    lineHeight: 23,
    flex: 1,
  },

  deleteButton: {
    backgroundColor: "#8B0000",
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 18,
  },
  deleteButtonText: {
    color: AE_COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  disclaimer: {
    color: AE_COLORS.textSoft,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },
});