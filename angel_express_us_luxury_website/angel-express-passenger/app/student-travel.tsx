import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  RefreshControl,
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
  RefreshCw,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

type VerificationState =
  | "verified"
  | "pending"
  | "rejected"
  | "expired"
  | "not_submitted";

type PoolRoute = {
  id: string;
  from: string;
  to: string;
  route: string;
  seats: number;
  fare: number;
  time: string;
};

const campusHubs = [
  "UTD",
  "UT Arlington",
  "SMU",
  "UNT",
  "Texas A&M",
  "UT Austin",
];

const poolRoutes: PoolRoute[] = [
  {
    id: "utd-austin-friday-4pm",
    from: "UTD",
    to: "Austin",
    route: "UTD → Austin",
    seats: 3,
    fare: 29,
    time: "Friday • 4:00 PM",
  },
  {
    id: "uta-houston-saturday-9am",
    from: "UT Arlington",
    to: "Houston",
    route: "UT Arlington → Houston",
    seats: 2,
    fare: 35,
    time: "Saturday • 9:00 AM",
  },
  {
    id: "smu-tamu-sunday-noon",
    from: "SMU",
    to: "College Station",
    route: "SMU → Texas A&M",
    seats: 4,
    fare: 32,
    time: "Sunday • 12:00 PM",
  },
];

function normalizeStatus(value: any): VerificationState {
  const status = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (
    ["verified", "approved", "active", "student_verified"].includes(status)
  ) {
    return "verified";
  }

  if (
    ["pending", "pending_review", "submitted", "under_review"].includes(status)
  ) {
    return "pending";
  }

  if (["rejected", "declined", "denied"].includes(status)) {
    return "rejected";
  }

  if (["expired", "inactive"].includes(status)) {
    return "expired";
  }

  return "not_submitted";
}

function verificationLabel(state: VerificationState) {
  switch (state) {
    case "verified":
      return "Verified Student";
    case "pending":
      return "Pending Review";
    case "rejected":
      return "Verification Rejected";
    case "expired":
      return "Verification Expired";
    default:
      return "Not Submitted";
  }
}

export default function StudentTravelScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);

  const [studentVerified, setStudentVerified] = useState(false);
  const [verificationState, setVerificationState] =
    useState<VerificationState>("not_submitted");

  const [selectedCampus, setSelectedCampus] = useState("UTD");
  const [selectedPool, setSelectedPool] = useState<PoolRoute>(poolRoutes[0]);
  const [joinedPoolIds, setJoinedPoolIds] = useState<string[]>([]);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
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
    );

    loop.start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    return () => loop.stop();
  }, [bgScale, pageFade]);

  useFocusEffect(
    useCallback(() => {
      loadStudentStatus();
    }, [])
  );

  async function loadStudentStatus(isManualRefresh = false) {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        Alert.alert("Sign In Required", "Please sign in again.");
        router.replace("/login" as any);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("student_verified, student_verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const profileVerified = Boolean(profile?.student_verified);
      const state = profileVerified
        ? "verified"
        : normalizeStatus(profile?.student_verification_status);

      setStudentVerified(profileVerified || state === "verified");
      setVerificationState(profileVerified ? "verified" : state);

      const { data: joinedPools, error: joinedPoolsError } = await supabase
        .from("student_ride_pools")
        .select("route, origin, destination, ride_time, status")
        .eq("user_id", user.id)
        .in("status", ["joined", "pending", "confirmed"]);

      if (joinedPoolsError) throw joinedPoolsError;

      const joinedIds = (joinedPools || []).map((item: any) => {
        const matched = poolRoutes.find(
          (pool) =>
            pool.route === item.route ||
            (pool.from === item.origin &&
              pool.to === item.destination &&
              pool.time === item.ride_time)
        );

        return matched?.id || "";
      });

      setJoinedPoolIds(joinedIds.filter(Boolean));
    } catch (error: any) {
      Alert.alert(
        "Student Mode Error",
        error.message || "Could not load student status."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function joinPoolRide() {
    try {
      if (joining) return;

      if (!studentVerified) {
        const message =
          verificationState === "pending"
            ? "Your student verification is still under review."
            : verificationState === "rejected"
            ? "Your verification was rejected. Please update and resubmit your student details."
            : verificationState === "expired"
            ? "Your verification has expired. Please submit a new student verification."
            : "Please verify your student status before joining a student pool ride.";

        Alert.alert("Student Verification Required", message);
        return;
      }

      if (selectedPool.seats <= 0) {
        Alert.alert(
          "Pool Ride Full",
          "This student pool ride currently has no remaining seats."
        );
        return;
      }

      if (joinedPoolIds.includes(selectedPool.id)) {
        Alert.alert(
          "Already Joined",
          "You have already joined this student pool ride."
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

      const { data: existingPool, error: existingPoolError } = await supabase
        .from("student_ride_pools")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("route", selectedPool.route)
        .eq("ride_time", selectedPool.time)
        .in("status", ["joined", "pending", "confirmed"])
        .limit(1)
        .maybeSingle();

      if (existingPoolError) throw existingPoolError;

      if (existingPool) {
        setJoinedPoolIds((current) => [
          ...new Set([...current, selectedPool.id]),
        ]);

        throw new Error("You have already joined this student pool ride.");
      }

      const { error: insertError } = await supabase
        .from("student_ride_pools")
        .insert({
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

      if (insertError) throw insertError;

      setJoinedPoolIds((current) => [
        ...new Set([...current, selectedPool.id]),
      ]);

      Alert.alert(
        "Pool Ride Joined",
        `You joined the ${selectedPool.route} student pool ride. Angel Express will notify you when the ride is confirmed.`
      );
    } catch (error: any) {
      Alert.alert(
        "Pool Ride",
        error.message || "Could not join this pool ride."
      );
    } finally {
      setJoining(false);
    }
  }

  function openVerification() {
    router.push("/student-verification" as any);
  }

  function openStudentBooking() {
    router.push({
      pathname: "/book-ride" as any,
      params: {
        ride_category: "student",
        student_mode: "true",
        pickup: selectedCampus,
      },
    });
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const selectedAlreadyJoined = joinedPoolIds.includes(selectedPool.id);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>
          Loading Student Travel Mode...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}
      >
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadStudentStatus(true)}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => loadStudentStatus(true)}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.gold} />
                ) : (
                  <RefreshCw size={18} color={colors.gold} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.themePill}
                onPress={toggleTheme}
              >
                <Text style={styles.themeText}>
                  {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>STUDENT MOBILITY NETWORK</Text>

            <Text style={styles.title}>Student Travel Mode+</Text>

            <Text style={styles.subtitle}>
              Split rides, join campus pools, unlock student pricing,
              and travel between Texas campuses with Angel Express.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <GraduationCap size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  {studentVerified
                    ? "Student Benefits Active"
                    : verificationState === "pending"
                    ? "Verification Under Review"
                    : verificationState === "rejected"
                    ? "Verification Needs Attention"
                    : verificationState === "expired"
                    ? "Verification Expired"
                    : "Verify to Unlock Pools"}
                </Text>

                <Text style={styles.heroText}>
                  {studentVerified
                    ? "You can join student pools, access discounts, and request shared campus rides."
                    : verificationState === "pending"
                    ? "Angel Express is reviewing your student verification submission."
                    : verificationState === "rejected"
                    ? "Update your student information and submit it again for approval."
                    : verificationState === "expired"
                    ? "Submit a new verification to restore your student benefits."
                    : "Student verification unlocks pool rides, campus pickup priority, and discounts."}
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <StatusPill
                title={verificationLabel(verificationState)}
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
                active={studentVerified}
                styles={styles}
              />
            </View>

            {!studentVerified && (
              <View style={styles.verificationNotice}>
                <ShieldCheck size={22} color={colors.gold} />
                <View style={styles.verificationNoticeCopy}>
                  <Text style={styles.verificationNoticeTitle}>
                    {verificationLabel(verificationState)}
                  </Text>
                  <Text style={styles.verificationNoticeText}>
                    {verificationState === "pending"
                      ? "No additional submission is needed while your current request is under review."
                      : "Student pool rides remain locked until your verification is approved."}
                  </Text>
                </View>

                {verificationState !== "pending" && (
                  <TouchableOpacity
                    style={styles.noticeAction}
                    onPress={openVerification}
                  >
                    <Text style={styles.noticeActionText}>
                      {verificationState === "rejected" ||
                      verificationState === "expired"
                        ? "Resubmit"
                        : "Verify"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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
                      selectedCampus === campus &&
                        styles.campusPillActive,
                    ]}
                    onPress={() => setSelectedCampus(campus)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.campusPillText,
                        selectedCampus === campus &&
                          styles.campusPillTextActive,
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
                <Text style={styles.cardTitle}>
                  Student Pool Rides
                </Text>
              </View>

              <Text style={styles.sectionText}>
                Join a shared ride with other verified students
                traveling from campus hubs.
              </Text>

              {poolRoutes.map((pool) => {
                const joined = joinedPoolIds.includes(pool.id);

                return (
                  <TouchableOpacity
                    key={pool.id}
                    style={[
                      styles.poolCard,
                      selectedPool.id === pool.id &&
                        styles.poolCardActive,
                      joined && styles.poolCardJoined,
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
                      <Text style={styles.poolMeta}>
                        {pool.seats} seats remaining
                      </Text>

                      {joined && (
                        <Text style={styles.joinedText}>
                          Already joined
                        </Text>
                      )}
                    </View>

                    <View style={styles.poolFareBox}>
                      <Text style={styles.poolFare}>${pool.fare}</Text>
                      <Text style={styles.poolFareSub}>each</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[
                  styles.goldButton,
                  (joining ||
                    selectedAlreadyJoined ||
                    !studentVerified) &&
                    styles.buttonDisabled,
                ]}
                onPress={joinPoolRide}
                disabled={
                  joining ||
                  selectedAlreadyJoined ||
                  !studentVerified
                }
                activeOpacity={0.88}
              >
                {joining ? (
                  <ActivityIndicator color={colors.navy} />
                ) : (
                  <Text style={styles.goldButtonText}>
                    {selectedAlreadyJoined
                      ? "Already Joined"
                      : !studentVerified
                      ? "Verification Required"
                      : "Join Selected Pool"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Route size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>
                  Create a New Student Pool
                </Text>
              </View>

              <Text style={styles.sectionText}>
                Need a different campus route? Start a student ride
                request and Angel Express can match other students
                going the same direction.
              </Text>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={openStudentBooking}
                activeOpacity={0.88}
              >
                <Text style={styles.outlineButtonText}>
                  Request Student Pool
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.badgeCard}>
              <View style={styles.cardHeader}>
                <BadgeCheck size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>
                  Student Verification Badge
                </Text>
              </View>

              <View style={styles.badgeStatusBox}>
                {studentVerified ? (
                  <Text style={styles.badge}>Verified Student</Text>
                ) : (
                  <Text style={styles.pendingBadge}>
                    {verificationLabel(verificationState)}
                  </Text>
                )}
              </View>

              <BenefitItem
                icon={<Gift size={18} color={colors.gold} />}
                text="20% student discount on eligible rides"
                styles={styles}
              />

              <BenefitItem
                icon={<MapPinned size={18} color={colors.gold} />}
                text="Priority campus pickup coordination"
                styles={styles}
              />

              <BenefitItem
                icon={<Users size={18} color={colors.gold} />}
                text="Shared rides with verified students"
                styles={styles}
              />

              <BenefitItem
                icon={<ShieldCheck size={18} color={colors.gold} />}
                text="Verified passenger safety badge"
                styles={styles}
              />

              {!studentVerified &&
                verificationState !== "pending" && (
                  <TouchableOpacity
                    style={styles.goldButton}
                    onPress={openVerification}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.goldButtonText}>
                      {verificationState === "rejected" ||
                      verificationState === "expired"
                        ? "Resubmit Verification"
                        : "Verify Student Status"}
                    </Text>
                  </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity
              style={styles.bookButton}
              onPress={openStudentBooking}
              activeOpacity={0.88}
            >
              <Text style={styles.bookButtonText}>
                Book Student Ride
              </Text>
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
    <View
      style={[
        styles.statusPill,
        active && styles.statusPillActive,
      ]}
    >
      <Text
        style={[
          styles.statusPillText,
          active && styles.statusPillTextActive,
        ]}
      >
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

    topActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
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

    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
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

    heroCopy: {
      flex: 1,
    },

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

    verificationNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 18,
      ...v5Shadow(c),
    },

    verificationNoticeCopy: {
      flex: 1,
    },

    verificationNoticeTitle: {
      color: c.gold,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 3,
    },

    verificationNoticeText: {
      color: c.text2,
      fontSize: 13.5,
      lineHeight: 19,
      fontWeight: "700",
    },

    noticeAction: {
      backgroundColor: c.gold,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 14,
    },

    noticeActionText: {
      color: c.navy,
      fontWeight: "900",
      fontSize: 12,
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

    poolCardJoined: {
      borderColor: c.gold,
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

    joinedText: {
      color: c.gold,
      fontSize: 12.5,
      fontWeight: "900",
      marginTop: 5,
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
      opacity: 0.58,
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
