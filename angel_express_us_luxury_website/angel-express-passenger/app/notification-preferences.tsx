import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Bell,
  Gift,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

export default function NotificationPreferencesScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rideAlerts, setRideAlerts] = useState(true);
  const [familyAlerts, setFamilyAlerts] = useState(true);
  const [promoAlerts, setPromoAlerts] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { data, error } = await supabase
        .from("passenger_profiles")
        .select(
          "ride_alerts_enabled,family_alerts_enabled,promo_alerts_enabled"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRideAlerts(data.ride_alerts_enabled ?? true);
        setFamilyAlerts(data.family_alerts_enabled ?? true);
        setPromoAlerts(data.promo_alerts_enabled ?? false);
      }
    } catch (error: any) {
      Alert.alert(
        "Notification Error",
        error.message || "Could not load notification preferences."
      );
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase
        .from("passenger_profiles")
        .update({
          ride_alerts_enabled: rideAlerts,
          family_alerts_enabled: familyAlerts,
          promo_alerts_enabled: promoAlerts,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      Alert.alert("Saved", "Your notification preferences have been updated.");
    } catch (error: any) {
      Alert.alert(
        "Save Error",
        error.message || "Could not save notification preferences."
      );
    } finally {
      setSaving(false);
    }
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

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
              <Text style={styles.kickerText}>A  NOTIFICATION CONTROL CENTER</Text>
            </View>

            <Text style={styles.title}>Notification Preferences</Text>

            <Text style={styles.subtitle}>
              Choose how Angel Express keeps you updated about rides, family safety,
              rewards, student travel, and promotions.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Bell size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Stay In Control</Text>
                <Text style={styles.heroText}>
                  Turn alerts on or off based on what matters most during your Angel Express ride.
                </Text>
              </View>
            </AngelCard>

            <View style={styles.statusGrid}>
              <StatusPill title="Ride" active={rideAlerts} />
              <StatusPill title="Family" active={familyAlerts} />
              <StatusPill title="Offers" active={promoAlerts} />
            </View>

            <PreferenceRow
              icon={<MessageCircle size={24} color={GOLD} />}
              title="Ride Alerts"
              text="Driver assigned, ride confirmed, driver arriving, trip started, completed, payment, reward updates, and live trip status."
              value={rideAlerts}
              onValueChange={setRideAlerts}
            />

            <PreferenceRow
              icon={<ShieldCheck size={24} color={GOLD} />}
              title="Family Check-In Alerts"
              text="Pickup, halfway, arrival, safety share, emergency contact, and family protection updates."
              value={familyAlerts}
              onValueChange={setFamilyAlerts}
            />

            <PreferenceRow
              icon={<Gift size={24} color={GOLD} />}
              title="Promotional Alerts"
              text="Student deals, referral bonuses, event travel offers, World Cup transportation updates, and Angel Express rewards."
              value={promoAlerts}
              onValueChange={setPromoAlerts}
            />

            <AngelCard style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <Sparkles size={22} color={GOLD} />
                <Text style={styles.noticeTitle}>Recommended Setting</Text>
              </View>

              <Text style={styles.noticeText}>
                Keep Ride Alerts and Family Check-In Alerts turned on for the best
                safety and live-trip experience.
              </Text>
            </AngelCard>

            <AngelHeroButton
              title={saving ? "Saving..." : "Save Preferences"}
              onPress={savePreferences}
              variant="gold"
              style={styles.saveButton}
            />

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

function PreferenceRow({
  icon,
  title,
  text,
  value,
  onValueChange,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <AngelCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconBox}>{icon}</View>

        <View style={styles.textBox}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardText}>{text}</Text>

          <View style={[styles.badge, value ? styles.badgeOn : styles.badgeOff]}>
            <Text style={[styles.badgeText, value ? styles.badgeTextOn : styles.badgeTextOff]}>
              {value ? "Enabled" : "Disabled"}
            </Text>
          </View>
        </View>

        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#334155", true: GOLD }}
          thumbColor={value ? "#FFFFFF" : "#CBD5E1"}
        />
      </View>
    </AngelCard>
  );
}

function StatusPill({ title, active }: { title: string; active: boolean }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusValue}>{active ? "ON" : "OFF"}</Text>
      <Text style={styles.statusTitle}>{title}</Text>
    </View>
  );
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

  center: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    color: AE_COLORS.white,
    marginTop: 12,
    fontSize: 16,
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

  statusGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  statusPill: {
    flex: 1,
    backgroundColor: "rgba(13,20,34,0.84)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 17,
    padding: 13,
    alignItems: "center",
  },

  statusValue: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
  },

  statusTitle: {
    color: AE_COLORS.white,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },

  card: {
    padding: 18,
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  textBox: {
    flex: 1,
  },

  cardTitle: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },

  cardText: {
    color: AE_COLORS.white,
    fontSize: 15,
    lineHeight: 22,
  },

  badge: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
  },

  badgeOn: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(34,197,94,0.35)",
  },

  badgeOff: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.14)",
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "900",
  },

  badgeTextOn: {
    color: "#22c55e",
  },

  badgeTextOff: {
    color: AE_COLORS.textSoft,
  },

  noticeCard: {
    padding: 20,
    marginTop: 4,
    marginBottom: 18,
  },

  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  noticeTitle: {
    color: GOLD,
    fontSize: 21,
    fontWeight: "900",
  },

  noticeText: {
    color: AE_COLORS.textSoft,
    fontSize: 15,
    lineHeight: 23,
  },

  saveButton: {
    marginTop: 4,
  },

  dashboardButton: {
    marginTop: 14,
  },
});