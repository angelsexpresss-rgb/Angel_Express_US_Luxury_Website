import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ArrowLeft,
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
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

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
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [studentVerified, setStudentVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("Not Submitted");
  const [selectedCampus, setSelectedCampus] = useState("UTD");
  const [selectedPool, setSelectedPool] = useState(poolRoutes[0]);

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
      Alert.alert(
        "Student Mode Error",
        error.message || "Could not load student status."
      );
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
        <ActivityIndicator color={colors.gold} size="large" />
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

          <Animated.View style={{ opacity: pageFade, transform: [{ translateY: pageTranslate }] }}>
            <Text style={styles.kicker}>STUDENT MOBILITY NETWORK</Text>

            <Text style={styles.title}>Student Travel Mode+</Text>

            <Text style={styles.subtitle}>
              Split rides, join campus pools, unlock student pricing, and travel between
              Texas campuses with Angel Express.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <GraduationCap size={30} color={colors.navy} />
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
            </View>

            <View style={styles.statusRow}>
              <StatusPill
                title={studentVerified ? "Verified Student" : verificationStatus}
                active={studentVerified}
                styles={styles}
              />
              <StatusPill
                title="Pool Ride Eligible"
                active={studentVerified}
                styles={styles}
              />
              <StatusPill
                title="20% Student Discount"
                active
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPinned size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>Choose Campus Hub</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.campusRow}
              >
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
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Users size={23} color={colors.gold} />
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
                    <Bus size={24} color={colors.gold} />
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

              <TouchableOpacity
                style={[styles.goldButton, joining && styles.buttonDisabled]}
                onPress={joinPoolRide}
                disabled={joining}
                activeOpacity={0.88}
              >
                {joining ? (
                  <ActivityIndicator color={colors.navy} />
                ) : (
                  <Text style={styles.goldButtonText}>Join Selected Pool</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Route size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>Create a New Student Pool</Text>
              </View>

              <Text style={styles.sectionText}>
                Need a different campus route? Start a ride request and Angel Express can
                match other students going the same direction.
              </Text>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => router.push("/book-ride" as any)}
                activeOpacity={0.88}
              >
                <Text style={styles.outlineButtonText}>Request Student Pool</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.badgeCard}>
              <View style={styles.cardHeader}>
                <BadgeCheck size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>Student Verification Badge</Text>
              </View>

              <View style={styles.badgeStatusBox}>
                {studentVerified ? (
                  <Text style={styles.badge}>Verified Student</Text>
                ) : (
                  <Text style={styles.pendingBadge}>{verificationStatus}</Text>
                )}
              </View>

              <BenefitItem
                icon={<Gift size={18} color={colors.gold} />}
                text="Student discounts"
                styles={styles}
              />
              <BenefitItem
                icon={<MapPinned size={18} color={colors.gold} />}
                text="Priority campus pickups"
                styles={styles}
              />
              <BenefitItem
                icon={<Users size={18} color={colors.gold} />}
                text="Split rides with verified students"
                styles={styles}
              />
              <BenefitItem
                icon={<ShieldCheck size={18} color={colors.gold} />}
                text="Verified passenger safety badge"
                styles={styles}
              />

              {!studentVerified && (
                <TouchableOpacity
                  style={styles.goldButton}
                  onPress={() => router.push("/student-verification" as any)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.goldButtonText}>Verify Student Status</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => router.push("/book-ride" as any)}
              activeOpacity={0.88}
            >
              <Text style={styles.bookButtonText}>Book Student Ride</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function StatusPill({
  title,
  active,
  styles,
}: {
  title: string;
  active?: boolean;
  styles: any;
}) {
  return (
    <View style={[styles.statusPill, active && styles.statusPillActive]}>
      <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>
        {title}
      </Text>
    </View>
  );
}

function BenefitItem({
  icon,
  text,
  styles,
}: {
  icon: React.ReactNode;
  text: string;
  styles: any;
}) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>{icon}</View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function createStyles(c: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, overflow: "hidden" },
    bgWrap: { ...StyleSheet.absoluteFillObject },
    background: { flex: 1 },
    overlay: { flex: 1, backgroundColor: c.overlay },
    container: { flex: 1 },
    content: { padding: 22, paddingTop: 58, paddingBottom: 54 },

    center: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },

    loadingText: {
      color: c.text,
      marginTop: 12,
      fontSize: 16,
      fontWeight: "800",
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
      letterSpacing: -0.7,
    },

    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },

    heroCard: {
      minHeight: 124,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
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

    heroCopy: { flex: 1 },

    heroTitle: {
      color: c.navy,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 6,
    },

    heroText: {
      color: c.navy,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
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
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: c.card,
    },

    statusPillActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },

    statusPillText: {
      color: c.text,
      fontSize: 13,
      fontWeight: "900",
    },

    statusPillTextActive: {
      color: c.navy,
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

    badgeCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },

    cardTitle: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },

    sectionText: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 16,
      fontWeight: "700",
    },

    campusRow: {
      gap: 10,
      paddingRight: 12,
    },

    campusPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 15,
      paddingVertical: 10,
      backgroundColor: c.card2,
    },

    campusPillActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },

    campusPillText: {
      color: c.text,
      fontWeight: "900",
    },

    campusPillTextActive: {
      color: c.navy,
    },

    poolCard: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card2,
      padding: 14,
      marginBottom: 12,
    },

    poolCardActive: {
      borderColor: c.gold,
      backgroundColor: c.soft,
    },

    poolIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },

    poolCopy: {
      flex: 1,
    },

    poolRoute: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 5,
    },

    poolMeta: {
      color: c.text2,
      fontSize: 13.5,
      marginBottom: 2,
      fontWeight: "700",
    },

    poolFareBox: {
      alignItems: "flex-end",
    },

    poolFare: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
    },

    poolFareSub: {
      color: c.text2,
      fontSize: 12,
      fontWeight: "700",
    },

    goldButton: {
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
      ...v5Shadow(c),
    },

    goldButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    outlineButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },

    outlineButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    buttonDisabled: {
      opacity: 0.7,
    },

    badgeStatusBox: {
      marginBottom: 14,
    },

    badge: {
      alignSelf: "flex-start",
      backgroundColor: c.gold,
      color: c.navy,
      fontSize: 13,
      fontWeight: "900",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      overflow: "hidden",
    },

    pendingBadge: {
      alignSelf: "flex-start",
      backgroundColor: c.card2,
      color: c.text,
      fontSize: 13,
      fontWeight: "900",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
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
      color: c.text,
      fontSize: 16,
      lineHeight: 23,
      flex: 1,
      fontWeight: "700",
    },

    bookButton: {
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      ...v5Shadow(c),
    },

    bookButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}