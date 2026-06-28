import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BadgeCheck,
  Bus,
  Gift,
  GraduationCap,
  MapPinned,
  Route,
  ShieldCheck,
  Users,
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

const campusHubs = ["UTD", "UT Arlington", "SMU", "UNT", "Texas A&M", "UT Austin"];

const poolRoutes = [
  {
    from: "UTD",
    to: "Austin",
    route: "UTD → Austin",
    seats: 3,
    fare: 29,
    time: "Friday • 4:00 PM",
  },
  {
    from: "UT Arlington",
    to: "Houston",
    route: "UT Arlington → Houston",
    seats: 2,
    fare: 35,
    time: "Saturday • 9:00 AM",
  },
  {
    from: "SMU",
    to: "College Station",
    route: "SMU → Texas A&M",
    seats: 4,
    fare: 32,
    time: "Sunday • 12:00 PM",
  },
];

export default function StudentTravelScreen() {
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [studentVerified, setStudentVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("Not Submitted");
  const [selectedCampus, setSelectedCampus] = useState("UTD");
  const [selectedPool, setSelectedPool] = useState(poolRoutes[0]);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStudentStatus();
    }, [])
  );

  async function loadStudentStatus() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const { data, error } = await supabase
        .from("passenger_profiles")
        .select("student_verified, student_verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      setStudentVerified(Boolean(data?.student_verified));
      setVerificationStatus(data?.student_verification_status || "Not Submitted");
    } catch (error: any) {
      Alert.alert("Student Mode Error", error.message || "Could not load student status.");
    } finally {
      setLoading(false);
    }
  }

  async function joinPoolRide() {
    try {
      if (!studentVerified) {
        Alert.alert(
          "Student Verification Required",
          "Please verify your student status before joining a student pool ride."
        );
        return;
      }

      setJoining(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase.from("student_ride_pools").insert({
        user_id: user.id,
        campus: selectedCampus,
        route: selectedPool.route,
        origin: selectedPool.from,
        destination: selectedPool.to,
        ride_time: selectedPool.time,
        student_fare: selectedPool.fare,
        seats_requested: 1,
        status: "joined",
      });

      if (error) throw error;

      Alert.alert(
        "Pool Ride Joined",
        `You joined the ${selectedPool.route} student pool ride. Angel Express will notify you when the ride is confirmed.`
      );
    } catch (error: any) {
      Alert.alert("Pool Ride Error", error.message || "Could not join this pool ride.");
    } finally {
      setJoining(false);
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
        <Text style={styles.loadingText}>Loading Student Travel Mode...</Text>
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

          <Animated.View style={{ opacity: pageFade, transform: [{ translateY: pageTranslate }] }}>
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>A  STUDENT MOBILITY NETWORK</Text>
            </View>

            <Text style={styles.title}>Student Travel Mode+</Text>

            <Text style={styles.subtitle}>
              Split rides, join campus pools, unlock student pricing, and travel between
              Texas campuses with Angel Express.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <GraduationCap size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  {studentVerified ? "Student Benefits Active" : "Verify to Unlock Pools"}
                </Text>
                <Text style={styles.heroText}>
                  {studentVerified
                    ? "You can join student pools, access discounts, and request shared campus rides."
                    : "Student verification unlocks pool rides, campus pickup priority, and discounts."}
                </Text>
              </View>
            </AngelCard>

            <View style={styles.statusRow}>
              <StatusPill title={studentVerified ? "Verified Student" : verificationStatus} active={studentVerified} />
              <StatusPill title="Pool Ride Eligible" active={studentVerified} />
              <StatusPill title="20% Student Discount" active />
            </View>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPinned size={23} color={GOLD} />
                <Text style={styles.cardTitle}>Choose Campus Hub</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.campusRow}>
                {campusHubs.map((campus) => (
                  <TouchableOpacity
                    key={campus}
                    style={[
                      styles.campusPill,
                      selectedCampus === campus && styles.campusPillActive,
                    ]}
                    onPress={() => setSelectedCampus(campus)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.campusPillText,
                        selectedCampus === campus && styles.campusPillTextActive,
                      ]}
                    >
                      {campus}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Users size={23} color={GOLD} />
                <Text style={styles.cardTitle}>Student Pool Rides</Text>
              </View>

              <Text style={styles.sectionText}>
                Join a shared ride with other verified students traveling from campus hubs.
              </Text>

              {poolRoutes.map((pool) => (
                <TouchableOpacity
                  key={pool.route}
                  style={[
                    styles.poolCard,
                    selectedPool.route === pool.route && styles.poolCardActive,
                  ]}
                  onPress={() => setSelectedPool(pool)}
                  activeOpacity={0.85}
                >
                  <View style={styles.poolIcon}>
                    <Bus size={24} color={GOLD} />
                  </View>

                  <View style={styles.poolCopy}>
                    <Text style={styles.poolRoute}>{pool.route}</Text>
                    <Text style={styles.poolMeta}>{pool.time}</Text>
                    <Text style={styles.poolMeta}>{pool.seats} seats remaining</Text>
                  </View>

                  <View style={styles.poolFareBox}>
                    <Text style={styles.poolFare}>${pool.fare}</Text>
                    <Text style={styles.poolFareSub}>each</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <AngelHeroButton
                title={joining ? "Joining Pool..." : "Join Selected Pool"}
                onPress={joinPoolRide}
                variant="gold"
                style={styles.joinButton}
              />
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Route size={23} color={GOLD} />
                <Text style={styles.cardTitle}>Create a New Student Pool</Text>
              </View>

              <Text style={styles.sectionText}>
                Need a different campus route? Start a ride request and Angel Express can
                match other students going the same direction.
              </Text>

              <AngelHeroButton
                title="Request Student Pool"
                onPress={() => router.push("/book-ride" as any)}
                variant="outline"
                style={styles.requestButton}
              />
            </AngelCard>

            <AngelCard style={styles.badgeCard}>
              <View style={styles.cardHeader}>
                <BadgeCheck size={23} color={GOLD} />
                <Text style={styles.cardTitle}>Student Verification Badge</Text>
              </View>

              <View style={styles.badgeStatusBox}>
                {studentVerified ? (
                  <Text style={styles.badge}>Verified Student</Text>
                ) : (
                  <Text style={styles.pendingBadge}>{verificationStatus}</Text>
                )}
              </View>

              <BenefitItem icon={<Gift size={18} color={GOLD} />} text="Student discounts" />
              <BenefitItem icon={<MapPinned size={18} color={GOLD} />} text="Priority campus pickups" />
              <BenefitItem icon={<Users size={18} color={GOLD} />} text="Split rides with verified students" />
              <BenefitItem icon={<ShieldCheck size={18} color={GOLD} />} text="Verified passenger safety badge" />

              {!studentVerified && (
                <AngelHeroButton
                  title="Verify Student Status"
                  onPress={() => router.push("/student-verification" as any)}
                  variant="gold"
                  style={styles.verifyButton}
                />
              )}
            </AngelCard>

            <AngelHeroButton
              title="Book Student Ride"
              onPress={() => router.push("/book-ride" as any)}
              variant="gold"
              style={styles.bookButton}
            />
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function StatusPill({ title, active }: { title: string; active?: boolean }) {
  return (
    <View style={[styles.statusPill, active && styles.statusPillActive]}>
      <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>
        {title}
      </Text>
    </View>
  );
}

function BenefitItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>{icon}</View>
      <Text style={styles.benefitText}>{text}</Text>
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

  center: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: { color: AE_COLORS.white, marginTop: 12, fontSize: 16 },

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
    marginBottom: 16,
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

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },

  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  statusPillActive: {
    backgroundColor: GOLD,
    borderColor: AE_COLORS.goldLight,
  },

  statusPillText: {
    color: AE_COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },

  statusPillTextActive: { color: AE_COLORS.navy2 },

  card: { padding: 20, marginBottom: 18 },
  badgeCard: { padding: 20, marginBottom: 18, borderColor: "rgba(212,175,55,0.36)" },

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

  sectionText: {
    color: AE_COLORS.textSoft,
    fontSize: 15.5,
    lineHeight: 23,
    marginBottom: 16,
  },

  campusRow: { gap: 10, paddingRight: 12 },

  campusPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  campusPillActive: {
    backgroundColor: GOLD,
    borderColor: AE_COLORS.goldLight,
  },

  campusPillText: {
    color: AE_COLORS.white,
    fontWeight: "900",
  },

  campusPillTextActive: {
    color: AE_COLORS.navy2,
  },

  poolCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.20)",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 14,
    marginBottom: 12,
  },

  poolCardActive: {
    borderColor: GOLD,
    backgroundColor: "rgba(212,175,55,0.12)",
  },

  poolIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  poolCopy: { flex: 1 },

  poolRoute: {
    color: AE_COLORS.white,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 5,
  },

  poolMeta: {
    color: AE_COLORS.muted,
    fontSize: 13.5,
    marginBottom: 2,
  },

  poolFareBox: {
    alignItems: "flex-end",
  },

  poolFare: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
  },

  poolFareSub: {
    color: AE_COLORS.muted,
    fontSize: 12,
  },

  joinButton: { marginTop: 12 },
  requestButton: { marginTop: 4 },

  badgeStatusBox: { marginBottom: 14 },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: GOLD,
    color: AE_COLORS.navy2,
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  pendingBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.07)",
    color: AE_COLORS.white,
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },

  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  benefitIcon: {
    width: 30,
    marginTop: 2,
  },

  benefitText: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 23,
    flex: 1,
  },

  verifyButton: { marginTop: 16 },
  bookButton: { marginTop: 4 },
});