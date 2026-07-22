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
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  Gift,
  GraduationCap,
  MapPinned,
  RefreshCw,
  Route,
  ShieldCheck,
  Ticket,
  UserRound,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

type VerificationState =
  | "verified"
  | "pending"
  | "rejected"
  | "expired"
  | "not_submitted";

type StudentPool = {
  id: string;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  fare_per_seat: number;
  status: string;
  campus_hub?: string | null;
  assigned_driver_id?: string | null;
  driver_name?: string | null;
  vehicle_description?: string | null;
  license_plate?: string | null;
  created_at?: string | null;
};

type PoolMembership = {
  id: string;
  pool_id: string;
  passenger_user_id: string;
  booking_id?: number | string | null;
  seats_reserved: number;
  fare_amount: number;
  status: string;
  created_at?: string | null;
  student_pool_rides?: StudentPool | null;
};

const campusHubs = [
  "UTD",
  "UT Arlington",
  "SMU",
  "UNT",
  "Texas A&M",
  "UT Austin",
];

function normalizeStatus(value: any): VerificationState {
  const status = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (["verified", "approved", "active", "student_verified"].includes(status)) {
    return "verified";
  }

  if (["pending", "pending_review", "submitted", "under_review"].includes(status)) {
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

function formatStatus(value: any) {
  return String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(dateValue: string, timeValue: string) {
  const parsed = new Date(`${dateValue}T${timeValue || "00:00:00"}`);

  if (Number.isNaN(parsed.getTime())) {
    return `${dateValue || "Date pending"} • ${timeValue || "Time pending"}`;
  }

  return parsed.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StudentTravelScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningPoolId, setJoiningPoolId] = useState<string | null>(null);
  const [connectionState, setConnectionState] =
    useState<"connecting" | "online" | "offline">("connecting");

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [studentVerified, setStudentVerified] = useState(false);
  const [verificationState, setVerificationState] =
    useState<VerificationState>("not_submitted");

  const [selectedCampus, setSelectedCampus] = useState("UTD");
  const [availablePools, setAvailablePools] = useState<StudentPool[]>([]);
  const [memberships, setMemberships] = useState<PoolMembership[]>([]);

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
      loadStudentTravel();
    }, [])
  );

  useEffect(() => {
    if (!userId) return;

    setConnectionState("connecting");

    const poolChannel = supabase
      .channel(`student-pools-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_pool_rides",
        },
        () => loadStudentTravel(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_pool_members",
          filter: `passenger_user_id=eq.${userId}`,
        },
        () => loadStudentTravel(true)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionState("online");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionState("offline");
        }
      });

    return () => {
      supabase.removeChannel(poolChannel);
    };
  }, [userId]);

  async function loadStudentTravel(silent = false) {
    try {
      if (!silent) setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/login" as any);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email?.trim().toLowerCase() || "");

      const [profileResult, poolsResult, membershipResult] = await Promise.all([
        supabase
          .from("passenger_profiles")
          .select("student_verified, student_verification_status")
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("student_pool_rides")
          .select("*")
          .in("status", ["open", "forming", "confirmed", "driver_assigned"])
          .gt("seats_available", 0)
          .order("departure_date", { ascending: true })
          .order("departure_time", { ascending: true }),

        supabase
          .from("student_pool_members")
          .select(`
            *,
            student_pool_rides (*)
          `)
          .eq("passenger_user_id", user.id)
          .in("status", ["joined", "confirmed", "driver_assigned", "in_progress"])
          .order("created_at", { ascending: false }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (poolsResult.error) throw poolsResult.error;
      if (membershipResult.error) throw membershipResult.error;

      const profileVerified = Boolean(profileResult.data?.student_verified);
      const state = profileVerified
        ? "verified"
        : normalizeStatus(profileResult.data?.student_verification_status);

      setStudentVerified(profileVerified || state === "verified");
      setVerificationState(profileVerified ? "verified" : state);
      setAvailablePools((poolsResult.data || []) as StudentPool[]);
      setMemberships((membershipResult.data || []) as PoolMembership[]);
    } catch (error: any) {
      Alert.alert(
        "Student Travel Error",
        error.message ||
          "Could not load student pools. Run the Student Pool SQL migration first."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function isJoined(poolId: string) {
    return memberships.some(
      (membership) =>
        membership.pool_id === poolId &&
        ["joined", "confirmed", "driver_assigned", "in_progress"].includes(
          String(membership.status).toLowerCase()
        )
    );
  }

  async function joinPool(pool: StudentPool) {
    if (!studentVerified) {
      const message =
        verificationState === "pending"
          ? "Your student verification is still under review."
          : verificationState === "rejected"
          ? "Your verification was rejected. Update and resubmit your student details."
          : verificationState === "expired"
          ? "Your verification expired. Submit a new student verification."
          : "Verify your student status before joining a Student Pool ride.";

      Alert.alert("Student Verification Required", message);
      return;
    }

    if (isJoined(pool.id)) {
      Alert.alert("Already Joined", "You already have a seat in this pool.");
      return;
    }

    if (pool.seats_available < 1) {
      Alert.alert("Pool Full", "This Student Pool has no seats remaining.");
      return;
    }

    try {
      setJoiningPoolId(pool.id);

      const { data, error } = await supabase.rpc("join_student_pool", {
        p_pool_id: pool.id,
        p_passenger_user_id: userId,
        p_passenger_email: userEmail,
        p_seats_requested: 1,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      Alert.alert(
        "Student Pool Joined",
        result?.booking_id
          ? `Your seat is reserved. Booking #${result.booking_id} now appears in My Trips and in Angel Express Operations.`
          : "Your seat is reserved and Angel Express Operations has been notified."
      );

      await loadStudentTravel(true);
    } catch (error: any) {
      Alert.alert(
        "Unable to Join Pool",
        error.message || "The Student Pool could not be joined."
      );
    } finally {
      setJoiningPoolId(null);
    }
  }

  function createNewPool() {
    if (!studentVerified) {
      Alert.alert(
        "Verification Required",
        "Only verified students can create a Student Pool request."
      );
      return;
    }

    router.push({
      pathname: "/book-ride" as any,
      params: {
        ride_category: "student_pool",
        student_mode: "true",
        shared_ride: "true",
        create_student_pool: "true",
        pickup: selectedCampus,
        seats_requested: "1",
        passenger_type: "verified_student",
      },
    });
  }

  function bookPrivateStudentRide() {
    router.push({
      pathname: "/book-ride" as any,
      params: {
        ride_category: "student",
        student_mode: "true",
        shared_ride: "false",
        pickup: selectedCampus,
        passenger_type: studentVerified
          ? "verified_student"
          : "student_unverified",
      },
    });
  }

  function openMembership(membership: PoolMembership) {
    if (membership.booking_id) {
      router.push({
        pathname: "/manage-booking" as any,
        params: {
          booking_id: membership.booking_id,
        },
      });
      return;
    }

    router.push("/my-trips" as any);
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const campusPools = availablePools.filter((pool) => {
    if (!selectedCampus) return true;
    return (
      pool.campus_hub === selectedCampus ||
      pool.origin.toLowerCase().includes(selectedCampus.toLowerCase())
    );
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadStudentTravel(true);
              }}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => loadStudentTravel(true)}
              >
                <RefreshCw size={18} color={colors.gold} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
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
              Book a private student ride, join an existing Student Pool, or create
              a new shared route through the same Angel Express booking system.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <GraduationCap
                  size={30}
                  color={colors.onGold || colors.navy}
                />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  {studentVerified
                    ? "Student Benefits Active"
                    : verificationState === "pending"
                    ? "Verification Under Review"
                    : "Verify to Unlock Student Pools"}
                </Text>
                <Text style={styles.heroText}>
                  {studentVerified
                    ? "Your verified student profile is connected to Book a Ride, My Trips, Driver Dispatch, and Owner Operations."
                    : "Student verification is required before joining or creating a shared Student Pool."}
                </Text>
              </View>
            </View>

            <View style={styles.connectionBanner}>
              {connectionState === "online" ? (
                <Wifi size={18} color={colors.success || "#22C55E"} />
              ) : (
                <WifiOff size={18} color={colors.warning || "#F59E0B"} />
              )}
              <Text style={styles.connectionText}>
                {connectionState === "online"
                  ? "Student Pool network is live."
                  : connectionState === "connecting"
                  ? "Connecting to Student Pool network..."
                  : "Realtime pool updates are unavailable. Pull down to refresh."}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <StatusPill
                title={verificationLabel(verificationState)}
                active={studentVerified}
                styles={styles}
              />
              <StatusPill
                title="Pool Eligible"
                active={studentVerified}
                styles={styles}
              />
              <StatusPill
                title="Student Pricing"
                active={studentVerified}
                styles={styles}
              />
            </View>

            {!studentVerified ? (
              <View style={styles.verificationNotice}>
                <ShieldCheck size={22} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.verificationNoticeTitle}>
                    {verificationLabel(verificationState)}
                  </Text>
                  <Text style={styles.verificationNoticeText}>
                    Student Pool seats remain locked until verification is approved.
                  </Text>
                </View>

                {verificationState !== "pending" ? (
                  <TouchableOpacity
                    style={styles.noticeAction}
                    onPress={() => router.push("/student-verification" as any)}
                  >
                    <Text style={styles.noticeActionText}>Verify</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

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

            {memberships.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ticket size={23} color={colors.gold} />
                  <Text style={styles.cardTitle}>My Student Pools</Text>
                </View>

                {memberships.map((membership) => {
                  const pool = membership.student_pool_rides;

                  return (
                    <TouchableOpacity
                      key={membership.id}
                      style={styles.membershipCard}
                      onPress={() => openMembership(membership)}
                    >
                      <View style={styles.membershipIcon}>
                        <CheckCircle2 size={22} color={colors.gold} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.membershipRoute}>
                          {pool
                            ? `${pool.origin} → ${pool.destination}`
                            : "Student Pool Ride"}
                        </Text>
                        <Text style={styles.membershipMeta}>
                          {pool
                            ? formatDate(
                                pool.departure_date,
                                pool.departure_time
                              )
                            : "Schedule pending"}
                        </Text>
                        <Text style={styles.membershipStatus}>
                          {formatStatus(membership.status)}
                        </Text>
                      </View>
                      <Text style={styles.membershipFare}>
                        ${Number(membership.fare_amount || 0).toFixed(0)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Users size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>Available Student Pools</Text>
              </View>

              <Text style={styles.sectionText}>
                These are live pool routes created through Book a Ride and approved
                by Angel Express Operations.
              </Text>

              {campusPools.length === 0 ? (
                <View style={styles.emptyPoolBox}>
                  <Bus size={28} color={colors.gold} />
                  <Text style={styles.emptyPoolTitle}>
                    No open pool from {selectedCampus}
                  </Text>
                  <Text style={styles.emptyPoolText}>
                    Create a new Student Pool request and other verified students
                    can join after Operations publishes it.
                  </Text>
                </View>
              ) : (
                campusPools.map((pool) => {
                  const joined = isJoined(pool.id);
                  const joining = joiningPoolId === pool.id;

                  return (
                    <View key={pool.id} style={styles.poolCard}>
                      <View style={styles.poolHeader}>
                        <View style={styles.poolIcon}>
                          <Bus size={24} color={colors.gold} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.poolRoute}>
                            {pool.origin} → {pool.destination}
                          </Text>
                          <Text style={styles.poolMeta}>
                            {formatDate(pool.departure_date, pool.departure_time)}
                          </Text>
                        </View>
                        <View style={styles.poolFareBox}>
                          <Text style={styles.poolFare}>
                            ${Number(pool.fare_per_seat).toFixed(0)}
                          </Text>
                          <Text style={styles.poolFareSub}>per seat</Text>
                        </View>
                      </View>

                      <View style={styles.poolStats}>
                        <PoolStat
                          icon={<Users size={16} color={colors.gold} />}
                          text={`${pool.seats_available} seats left`}
                          styles={styles}
                        />
                        <PoolStat
                          icon={<BadgeCheck size={16} color={colors.gold} />}
                          text={formatStatus(pool.status)}
                          styles={styles}
                        />
                        <PoolStat
                          icon={<GraduationCap size={16} color={colors.gold} />}
                          text="Verified students"
                          styles={styles}
                        />
                      </View>

                      {pool.assigned_driver_id ? (
                        <View style={styles.driverStrip}>
                          <CarFront size={17} color={colors.gold} />
                          <Text style={styles.driverStripText}>
                            {pool.driver_name || "Driver assigned"}
                            {pool.vehicle_description
                              ? ` • ${pool.vehicle_description}`
                              : ""}
                            {pool.license_plate ? ` • ${pool.license_plate}` : ""}
                          </Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        style={[
                          styles.goldButton,
                          (joined || joining || !studentVerified) &&
                            styles.buttonDisabled,
                        ]}
                        onPress={() => joinPool(pool)}
                        disabled={joined || joining || !studentVerified}
                      >
                        {joining ? (
                          <ActivityIndicator
                            color={colors.onGold || colors.navy}
                          />
                        ) : (
                          <Text style={styles.goldButtonText}>
                            {joined
                              ? "Already Joined"
                              : !studentVerified
                              ? "Verification Required"
                              : "Reserve One Seat"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Route size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>Create a New Student Pool</Text>
              </View>

              <Text style={styles.sectionText}>
                Complete the normal Book a Ride form. Choose Student Pool, enter
                pickup, destination, travel date, time, and seat request. Your ride
                becomes a pool only after Angel Express Operations reviews and
                publishes it.
              </Text>

              <TouchableOpacity
                style={styles.goldButton}
                onPress={createNewPool}
              >
                <Text style={styles.goldButtonText}>Create Student Pool</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={bookPrivateStudentRide}
              >
                <Text style={styles.outlineButtonText}>
                  Book Private Student Ride
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.processCard}>
              <View style={styles.cardHeader}>
                <Bus size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>How Student Pool Works</Text>
              </View>

              <ProcessStep
                number="1"
                title="Passenger creates or joins"
                text="A verified student books through Book a Ride or reserves a seat in an open pool."
                styles={styles}
              />
              <ProcessStep
                number="2"
                title="Owner reviews and publishes"
                text="Operations checks the route, timing, pricing, seats, and passenger eligibility."
                styles={styles}
              />
              <ProcessStep
                number="3"
                title="Driver receives one grouped trip"
                text="The assigned driver sees the shared route, total passenger count, pickup sequence, and payout."
                styles={styles}
              />
              <ProcessStep
                number="4"
                title="Each passenger keeps a booking"
                text="Every member sees the ride in My Trips and receives individual notifications, payment status, and safety tools."
                styles={styles}
              />
            </View>

            <View style={styles.badgeCard}>
              <View style={styles.cardHeader}>
                <BadgeCheck size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>Student Benefits</Text>
              </View>

              <BenefitItem
                icon={<Gift size={18} color={colors.gold} />}
                text="Student pricing on eligible private and pooled rides"
                styles={styles}
              />
              <BenefitItem
                icon={<Users size={18} color={colors.gold} />}
                text="Shared rides only with verified student passengers"
                styles={styles}
              />
              <BenefitItem
                icon={<ShieldCheck size={18} color={colors.gold} />}
                text="Passenger identity, emergency contact, and safety tools remain individual"
                styles={styles}
              />
              <BenefitItem
                icon={<CalendarDays size={18} color={colors.gold} />}
                text="One shared departure schedule managed by Operations"
                styles={styles}
              />
            </View>
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

function PoolStat({
  icon,
  text,
  styles,
}: {
  icon: React.ReactNode;
  text: string;
  styles: any;
}) {
  return (
    <View style={styles.poolStat}>
      {icon}
      <Text style={styles.poolStatText}>{text}</Text>
    </View>
  );
}

function ProcessStep({
  number,
  title,
  text,
  styles,
}: {
  number: string;
  title: string;
  text: string;
  styles: any;
}) {
  return (
    <View style={styles.processStep}>
      <View style={styles.processNumber}>
        <Text style={styles.processNumberText}>{number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.processTitle}>{title}</Text>
        <Text style={styles.processText}>{text}</Text>
      </View>
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
    topActions: { flexDirection: "row", alignItems: "center", gap: 10 },
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
    backText: { color: c.gold, fontSize: 15, fontWeight: "900" },
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
    themeText: { color: c.gold, fontSize: 12, fontWeight: "900" },
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
      color: c.text2 || c.textSecondary,
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
      color: c.onGold || c.navy,
      fontSize: 23,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.onGold || c.navy,
      fontSize: 14.5,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.84,
    },
    connectionBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      padding: 13,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      backgroundColor: c.card,
      marginBottom: 16,
    },
    connectionText: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "800",
      flex: 1,
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
    statusPillActive: { backgroundColor: c.gold, borderColor: c.gold },
    statusPillText: { color: c.text, fontSize: 13, fontWeight: "900" },
    statusPillTextActive: { color: c.onGold || c.navy },
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
    verificationNoticeTitle: {
      color: c.gold,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 3,
    },
    verificationNoticeText: {
      color: c.text2 || c.textSecondary,
      fontSize: 13,
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
      color: c.onGold || c.navy,
      fontWeight: "900",
      fontSize: 12,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
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
    processCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
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
      color: c.text2 || c.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 16,
      fontWeight: "700",
    },
    campusRow: { gap: 10, paddingRight: 12 },
    campusPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 15,
      paddingVertical: 10,
      backgroundColor: c.card2,
    },
    campusPillActive: { backgroundColor: c.gold, borderColor: c.gold },
    campusPillText: { color: c.text, fontWeight: "900" },
    campusPillTextActive: { color: c.onGold || c.navy },
    membershipCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      borderRadius: 17,
      padding: 14,
      marginBottom: 10,
    },
    membershipIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    membershipRoute: {
      color: c.text,
      fontSize: 15,
      fontWeight: "900",
    },
    membershipMeta: {
      color: c.text2 || c.textSecondary,
      fontSize: 12,
      marginTop: 3,
      fontWeight: "700",
    },
    membershipStatus: {
      color: c.gold,
      fontSize: 11,
      marginTop: 4,
      fontWeight: "900",
    },
    membershipFare: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
    },
    emptyPoolBox: {
      alignItems: "center",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      padding: 20,
    },
    emptyPoolTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
      marginTop: 10,
      marginBottom: 6,
      textAlign: "center",
    },
    emptyPoolText: {
      color: c.text2 || c.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
      textAlign: "center",
    },
    poolCard: {
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      backgroundColor: c.card2,
      padding: 15,
      marginBottom: 13,
    },
    poolHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
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
    },
    poolRoute: {
      color: c.text,
      fontSize: 16.5,
      fontWeight: "900",
      marginBottom: 4,
    },
    poolMeta: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5,
      fontWeight: "700",
    },
    poolFareBox: { alignItems: "flex-end" },
    poolFare: { color: c.gold, fontSize: 21, fontWeight: "900" },
    poolFareSub: {
      color: c.text2 || c.textSecondary,
      fontSize: 10.5,
      fontWeight: "700",
    },
    poolStats: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 13,
    },
    poolStat: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      paddingHorizontal: 9,
      paddingVertical: 7,
    },
    poolStatText: {
      color: c.text,
      fontSize: 10.5,
      fontWeight: "800",
    },
    driverStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      padding: 11,
      borderRadius: 13,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 11,
    },
    driverStripText: {
      color: c.text,
      fontSize: 11.5,
      fontWeight: "800",
      flex: 1,
    },
    goldButton: {
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 13,
      ...v5Shadow(c),
    },
    goldButtonText: {
      color: c.onGold || c.navy,
      fontSize: 14,
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
      marginTop: 10,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    buttonDisabled: { opacity: 0.58 },
    processStep: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft || c.lightBorder,
    },
    processNumber: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    processNumberText: {
      color: c.onGold || c.navy,
      fontSize: 14,
      fontWeight: "900",
    },
    processTitle: {
      color: c.text,
      fontSize: 14.5,
      fontWeight: "900",
      marginBottom: 4,
    },
    processText: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    benefitIcon: { width: 30, marginTop: 2 },
    benefitText: {
      color: c.text,
      fontSize: 15,
      lineHeight: 22,
      flex: 1,
      fontWeight: "700",
    },
  });
}
