import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  Alert,
  Animated,
  AppState,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  Gamepad2,
  Gift,
  GraduationCap,
  Headphones,
  Home,
  Info,
  Languages,
  Lock,
  LogOut,
  MapPinned,
  Menu,
  Plane,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  UserRound,
  Users,
  X,
  Settings,
  SunMoon,
  Accessibility,
  Fingerprint,
  ScanFace,
  SlidersHorizontal,
} from "lucide-react-native";

import { registerForPushNotifications } from "../lib/notifications";
import { supabase } from "../lib/supabase";
import { AngelThemeColors, useAngelTheme } from "../lib/angelTheme";

type BookingSummary = {
  [key: string]: any;
  id: number;
  status: string | null;
  booking_status: string | null;
  payment_status: string | null;
  ride_date: string | null;
  ride_time: string | null;
  date: string | null;
  time: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup: string | null;
  dropoff: string | null;
  assigned_driver_id: string | null;
  driver_id: string | null;
  total_fare: number | null;
  total: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function DashboardScreen() {
  const { colors, themeMode, toggleTheme } = useAngelTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("Passenger");
  const [rating, setRating] = useState(5);
  const [totalTrips, setTotalTrips] = useState(0);
  const [studentVerified, setStudentVerified] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [rewardCredit, setRewardCredit] = useState(0);
  const [activeBooking, setActiveBooking] = useState<BookingSummary | null>(
    null,
  );
  const [, setLoading] = useState(true);
  const [, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const toolFade = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);
  const realtimeReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;

    void registerForPushNotifications().catch((error) => {
      console.log("Push registration error:", error);
    });

    void loadDashboardData();

    const backgroundAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.045,
          duration: 8500,
          useNativeDriver: true,
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 8500,
          useNativeDriver: true,
        }),
      ]),
    );

    backgroundAnimation.start();

    const entranceAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(pageFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      fadeIn(headerFade, 80),
      fadeIn(cardFade, 90),
      fadeIn(toolFade, 90),
    ]);

    entranceAnimation.start();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (mounted && nextState === "active") {
          void loadDashboardData();
        }
      },
    );

    return () => {
      mounted = false;
      backgroundAnimation.stop();
      entranceAnimation.stop();
      appStateSubscription.remove();
      if (realtimeReloadTimerRef.current) {
        clearTimeout(realtimeReloadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    Animated.spring(menuAnim, {
      toValue: menuOpen ? 1 : 0,
      friction: 8,
      tension: 75,
      useNativeDriver: true,
    }).start();
  }, [menuOpen]);

  function fadeIn(value: Animated.Value, delay: number) {
    return Animated.timing(value, {
      toValue: 1,
      duration: 520,
      delay,
      useNativeDriver: true,
    });
  }

  useEffect(() => {
    if (!userId) return;

    const scheduleRealtimeReload = () => {
      if (realtimeReloadTimerRef.current) {
        clearTimeout(realtimeReloadTimerRef.current);
      }

      realtimeReloadTimerRef.current = setTimeout(() => {
        void loadDashboardData({ silent: true });
      }, 250);
    };

    const bookingChannel = supabase
      .channel(`passenger-dashboard-bookings-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          const row = (payload.new || payload.old) as Record<string, unknown>;
          if (row?.user_id === userId || row?.passenger_user_id === userId) {
            scheduleRealtimeReload();
          }
        },
      )
      .subscribe();

    const notificationChannel = supabase
      .channel(`passenger-dashboard-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passenger_notifications",
          filter: `passenger_id=eq.${userId}`,
        },
        scheduleRealtimeReload,
      )
      .subscribe();

    const rewardChannel = supabase
      .channel(`passenger-dashboard-rewards-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referral_rewards",
          filter: `referrer_user_id=eq.${userId}`,
        },
        scheduleRealtimeReload,
      )
      .subscribe();

    const passengerChannel = supabase
      .channel(`passenger-dashboard-profile-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "passengers",
          filter: `id=eq.${userId}`,
        },
        scheduleRealtimeReload,
      )
      .subscribe();

    const studentChannel = supabase
      .channel(`passenger-dashboard-student-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_verifications",
          filter: `user_id=eq.${userId}`,
        },
        scheduleRealtimeReload,
      )
      .subscribe();

    return () => {
      if (realtimeReloadTimerRef.current) {
        clearTimeout(realtimeReloadTimerRef.current);
      }
      void supabase.removeChannel(bookingChannel);
      void supabase.removeChannel(notificationChannel);
      void supabase.removeChannel(rewardChannel);
      void supabase.removeChannel(passengerChannel);
      void supabase.removeChannel(studentChannel);
    };
  }, [userId]);

  function getOperationalStatus(booking: BookingSummary) {
    return String(booking.status || booking.booking_status || "pending")
      .trim()
      .toLowerCase();
  }

  function formatBookingStatus(booking: BookingSummary) {
    return getOperationalStatus(booking)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getBookingDateTime(booking: BookingSummary) {
    const date = booking.ride_date || booking.date;
    const time = booking.ride_time || booking.time;

    if (!date && !time) return "Schedule pending";
    return [date, time].filter(Boolean).join(" • ");
  }

  function getBookingTimestamp(booking: BookingSummary) {
    const dateValue = booking.ride_date || booking.date;
    const timeValue = booking.ride_time || booking.time || "00:00:00";

    if (!dateValue) {
      return booking.created_at ? new Date(booking.created_at).getTime() : 0;
    }

    const normalizedTime =
      String(timeValue).length === 5 ? `${timeValue}:00` : timeValue;
    const timestamp = new Date(`${dateValue}T${normalizedTime}`).getTime();

    if (Number.isNaN(timestamp)) {
      return booking.created_at ? new Date(booking.created_at).getTime() : 0;
    }

    return timestamp;
  }

  function classifyBookings(bookings: BookingSummary[]) {
    const now = Date.now();
    const terminalStatuses = new Set([
      "completed",
      "cancelled",
      "canceled",
      "declined",
      "rejected",
      "no_show",
      "no show",
    ]);
    const liveStatuses = new Set([
      "in_progress",
      "in progress",
      "trip_started",
      "trip started",
      "driver_arrived",
      "driver arrived",
      "arrived",
      "accepted",
      "assigned",
      "en_route",
      "en route",
      "picked_up",
      "picked up",
    ]);
    const pendingStatuses = new Set([
      "pending",
      "requested",
      "awaiting_driver",
      "awaiting driver",
      "awaiting_assignment",
      "awaiting assignment",
    ]);
    const confirmedStatuses = new Set(["confirmed", "scheduled", "approved"]);

    const completed = bookings
      .filter((booking) => getOperationalStatus(booking) === "completed")
      .sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));

    const live = bookings
      .filter((booking) => liveStatuses.has(getOperationalStatus(booking)))
      .sort((a, b) => {
        const priority = [
          "in_progress",
          "in progress",
          "trip_started",
          "trip started",
          "picked_up",
          "picked up",
          "driver_arrived",
          "driver arrived",
          "arrived",
          "en_route",
          "en route",
          "accepted",
          "assigned",
        ];
        const aIndex = priority.indexOf(getOperationalStatus(a));
        const bIndex = priority.indexOf(getOperationalStatus(b));
        const safeA = aIndex === -1 ? priority.length : aIndex;
        const safeB = bIndex === -1 ? priority.length : bIndex;
        return safeA - safeB || getBookingTimestamp(a) - getBookingTimestamp(b);
      });

    const pending = bookings
      .filter((booking) => pendingStatuses.has(getOperationalStatus(booking)))
      .sort((a, b) => getBookingTimestamp(a) - getBookingTimestamp(b));

    const upcoming = bookings
      .filter((booking) => {
        const status = getOperationalStatus(booking);
        if (
          terminalStatuses.has(status) ||
          liveStatuses.has(status) ||
          pendingStatuses.has(status)
        ) {
          return false;
        }
        return (
          confirmedStatuses.has(status) || getBookingTimestamp(booking) >= now
        );
      })
      .sort((a, b) => getBookingTimestamp(a) - getBookingTimestamp(b));

    return {
      active: live[0] ?? pending[0] ?? upcoming[0] ?? null,
      pending: pending[0] ?? null,
      upcoming: upcoming[0] ?? null,
      completed: completed[0] ?? null,
      completedCount: completed.length,
    };
  }

  async function loadDashboardData(options?: {
    silent?: boolean;
    force?: boolean;
  }) {
    if (loadingRef.current && !options?.force) {
      return;
    }

    loadingRef.current = true;
    const requestId = ++requestIdRef.current;

    if (!options?.silent) {
      setLoading(true);
    }

    setLoadError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace("/login" as any);
        return;
      }

      setUserId(user.id);

      /*
       * Load the passenger identity first. Optional dashboard
       * queries must never prevent the passenger name from loading.
       */
      const passengerResult = await supabase
        .from("passengers")
        .select(
          "id, first_name, last_name, email, rating, total_trips, student_verified",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (passengerResult.error) {
        console.log(
          "Passenger dashboard profile error:",
          passengerResult.error,
        );
        throw passengerResult.error;
      }

      const passenger = passengerResult.data;

      const metadataFullName = String(
  user.user_metadata?.full_name ||
  user.user_metadata?.name ||
  ""
).trim();

const resolvedFirstName = String(
  passenger?.first_name ||
    user.user_metadata?.first_name ||
    metadataFullName.split(/\s+/)[0] ||
    "Passenger"
).trim();

setFirstName(
  resolvedFirstName || "Passenger"
);
      const safeRating = Number(passenger?.rating);
      setRating(Number.isFinite(safeRating) ? safeRating : 5);

      setStudentVerified(Boolean(passenger?.student_verified));

      /*
       * Optional data loads independently. A missing optional table,
       * column, or row will not take down the entire dashboard.
       */
      const [
        notificationResult,
        rewardsResult,
        studentVerificationResult,
        userBookingsResult,
        passengerBookingsResult,
        emailBookingsResult,
      ] = await Promise.all([
        supabase
          .from("passenger_notifications")
          .select("id", { count: "exact", head: true })
          .eq("passenger_id", user.id)
          .eq("is_read", false),

        supabase
          .from("referral_rewards")
          .select("*")
          .eq("referrer_user_id", user.id),

        supabase
          .from("student_verifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("bookings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("bookings")
          .select("*")
          .eq("passenger_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),

        user.email
          ? supabase
              .from("bookings")
              .select("*")
              .ilike("email", user.email.trim())
              .order("created_at", { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (notificationResult.error) {
        console.log(
          "Unread notification query error:",
          notificationResult.error,
        );
        setUnreadCount(0);
      } else {
        setUnreadCount(notificationResult.count ?? 0);
      }

      if (rewardsResult.error) {
        console.log("Referral reward query error:", rewardsResult.error);
        setRewardCredit(0);
      } else {
        const rewardRows = rewardsResult.data ?? [];

        const credit = rewardRows.reduce(
          (sum: number, reward: Record<string, any>) => {
            const status = String(reward.status || "")
              .trim()
              .toLowerCase();

            if (
              !["completed", "approved", "available", "earned"].includes(status)
            ) {
              return sum;
            }

            const amount = Number(
              reward.credit_earned ??
                reward.reward_amount ??
                reward.credit ??
                reward.amount ??
                0,
            );

            return sum + (Number.isFinite(amount) ? amount : 0);
          },
          0,
        );

        setRewardCredit(credit);
      }

      if (studentVerificationResult.error) {
        console.log(
          "Student verification query error:",
          studentVerificationResult.error,
        );
      } else {
        const verification = studentVerificationResult.data as Record<
          string,
          any
        > | null;

        const verificationStatus = String(verification?.status || "")
          .trim()
          .toLowerCase();

        setStudentVerified(
          Boolean(passenger?.student_verified) ||
            Boolean(verification?.verified) ||
            ["verified", "approved", "active"].includes(verificationStatus),
        );
      }

      if (userBookingsResult.error) {
        console.log("Bookings user_id query error:", userBookingsResult.error);
      }

      if (passengerBookingsResult.error) {
        console.log(
          "Bookings passenger_user_id query error:",
          passengerBookingsResult.error,
        );
      }

      if (emailBookingsResult.error) {
        console.log("Bookings email query error:", emailBookingsResult.error);
      }

      const userBookings = !userBookingsResult.error
        ? ((userBookingsResult.data ?? []) as BookingSummary[])
        : [];

      const passengerBookings = !passengerBookingsResult.error
        ? ((passengerBookingsResult.data ?? []) as BookingSummary[])
        : [];

      const emailBookings = !emailBookingsResult.error
        ? ((emailBookingsResult.data ?? []) as BookingSummary[])
        : [];

      const combinedBookings: BookingSummary[] = [
        ...userBookings,
        ...passengerBookings,
        ...emailBookings,
      ];

      const uniqueBookings = Array.from(
        new Map(
          combinedBookings.map((booking) => [booking.id, booking]),
        ).values(),
      );

      const classified = classifyBookings(uniqueBookings);

      setActiveBooking(classified.active);

      const storedTrips = Number(passenger?.total_trips || 0);
      setTotalTrips(
        Math.max(
          Number.isFinite(storedTrips) ? storedTrips : 0,
          classified.completedCount,
        ),
      );

      setLoadError(null);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.log("Passenger dashboard load error:", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load your dashboard. Please try again.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  async function onRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    await loadDashboardData({ silent: true, force: true });
  }

  function goTo(route: string) {
    setMenuOpen(false);
    router.push(route as any);
  }

  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();

          if (error) {
            Alert.alert(
              "Unable to Log Out",
              error.message || "Please try again.",
            );
            return;
          }

          router.replace("/login" as any);
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={themeMode === "dark" ? "light-content" : "dark-content"}
      />

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
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
            />
          }
        >
          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Animated.View style={{ opacity: headerFade }}>
              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setMenuOpen(!menuOpen)}
                  activeOpacity={0.85}
                >
                  {menuOpen ? (
                    <X size={26} color={colors.text} strokeWidth={3} />
                  ) : (
                    <Menu size={27} color={colors.text} strokeWidth={3} />
                  )}
                </TouchableOpacity>

                <View style={styles.brandBox}>
                  <Image
                    source={require("../assets/images/angel-logo-transparent.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>

                <TouchableOpacity
                  style={styles.bellButton}
                  onPress={() => goTo("/passenger-notifications")}
                  activeOpacity={0.85}
                >
                  <Bell size={23} color={colors.text} strokeWidth={2.6} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.greetingRow}>
                <View>
                  <Text style={styles.kicker}>PASSENGER DASHBOARD</Text>
                  <Text style={styles.greeting}>Welcome, {firstName}</Text>
                </View>

                <TouchableOpacity
                  style={styles.themePill}
                  onPress={() => void toggleTheme()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.themeText}>
                    {themeMode === "dark" ? "Light Mode" : "Dark Mode"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: cardFade }}>
              <TouchableOpacity
                style={styles.heroCard}
                onPress={() => goTo("/book-ride")}
                activeOpacity={0.9}
              >
                <View style={styles.heroTop}>
                  <View>
                    <Text style={styles.heroLabel}>Private Ride</Text>
                    <Text style={styles.heroTitle}>Book a Ride</Text>
                    <Text style={styles.heroSub}>
                      Reserve your next Angel Express trip
                    </Text>
                  </View>

                  <Text style={styles.arrowLight}>›</Text>
                </View>

                <View style={styles.statsRow}>
                  <StatBlock
                    label="Trips"
                    value={String(totalTrips)}
                    styles={styles}
                  />
                  <Divider styles={styles} />
                  <StatBlock
                    label="Rating"
                    value={rating.toFixed(1)}
                    styles={styles}
                  />
                  <Divider styles={styles} />
                  <StatBlock
                    label="Student"
                    value={studentVerified ? "Verified" : "Mode"}
                    styles={styles}
                    small
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.levelCard}
                onPress={() => goTo("/rewards")}
                activeOpacity={0.9}
              >
                <View style={styles.levelIcon}>
                  <Gift
                    size={27}
                    color={colors.mode === "dark" ? "#07111F" : "#FFFFFF"}
                    strokeWidth={2.8}
                  />
                </View>

                <View style={styles.levelMiddle}>
                  <Text style={styles.levelTitle}>Rewards & Referrals</Text>
                  <Text style={styles.levelText}>
                    {rewardCredit > 0
                      ? `$${rewardCredit.toFixed(2)} in available referral credit`
                      : "Earn ride credits, referral bonuses, and student savings."}
                  </Text>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(100, rewardCredit)}%` },
                      ]}
                    />
                  </View>
                </View>

                <Text style={styles.levelCount}>
                  ${rewardCredit.toFixed(0)}
                </Text>
                <Text style={styles.arrowDark}>›</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ opacity: toolFade }}>
              <Text style={styles.menuTitle}>Passenger Control Center</Text>

              <DropdownPanel title="Trips & Ride Management" styles={styles}>
                <ListItem
                  title="My Trips"
                  icon={
                    <CalendarDays
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/my-trips")}
                  styles={styles}
                />

                <ListItem
                  title="Track Live Trip"
                  icon={
                    <MapPinned
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() =>
                    activeBooking
                      ? goTo(`/live-trip?bookingId=${activeBooking.id}`)
                      : goTo("/my-trips")
                  }
                  styles={styles}
                />

                <ListItem
                  title="Manage Booking"
                  icon={
                    <Ticket size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() =>
                    activeBooking
                      ? goTo(`/manage-booking?bookingId=${activeBooking.id}`)
                      : goTo("/my-trips")
                  }
                  styles={styles}
                />

                <ListItem
                  title="Pay Ride"
                  icon={
                    <Ticket size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() =>
                    activeBooking
                      ? goTo(`/pay-ride?bookingId=${activeBooking.id}`)
                      : goTo("/my-trips")
                  }
                  styles={styles}
                />
              </DropdownPanel>

              <DropdownPanel title="Travel Services" styles={styles}>
                <ListItem
                  title="Luxury Ride Prep+"
                  icon={
                    <BriefcaseBusiness
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/luxury-ride-prep")}
                  styles={styles}
                />

                <ListItem
                  title="Angel Travel Concierge"
                  icon={
                    <Plane size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => goTo("/travel-concierge")}
                  styles={styles}
                />

                <ListItem
                  title="Student Travel Mode+"
                  icon={
                    <GraduationCap
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/student-travel")}
                  styles={styles}
                />

                <ListItem
                  title="AI Ride Assistant"
                  icon={
                    <Sparkles size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => goTo("/ai-assistant")}
                  styles={styles}
                />
              </DropdownPanel>

              <DropdownPanel title="Passenger Account" styles={styles}>
                <ListItem
                  title="Profile"
                  icon={
                    <UserRound
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/profile")}
                  styles={styles}
                />

                <ListItem
                  title="Passenger Card"
                  icon={
                    <BadgeCheck
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/passenger-card")}
                  styles={styles}
                />

                <ListItem
                  title="Rewards"
                  icon={
                    <Gift size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => goTo("/rewards")}
                  styles={styles}
                />
              </DropdownPanel>

              <DropdownPanel title="Entertainment & Events" styles={styles}>
                <ListItem
                  title="Entertainment Hub+"
                  icon={
                    <Gamepad2 size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => goTo("/entertainment-hub")}
                  styles={styles}
                />

                <ListItem
                  title="Event Mode"
                  icon={
                    <Trophy size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => goTo("/travel-concierge")}
                  styles={styles}
                />
              </DropdownPanel>

              <DropdownPanel title="Safety, Family & Support" styles={styles}>
                <ListItem
                  title="Angel Safety Share"
                  icon={
                    <ShieldCheck
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/safety-share")}
                  styles={styles}
                />

                <ListItem
                  title="Family Check-In+"
                  icon={
                    <Users size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => goTo("/family-checkin")}
                  styles={styles}
                />

                <ListItem
                  title="Support Center"
                  icon={
                    <Headphones
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/support")}
                  styles={styles}
                />
              </DropdownPanel>

              <DropdownPanel title="Settings & Information" styles={styles}>
                <ListItem
                  title="Settings"
                  icon={
                    <Settings size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => goTo("/settings")}
                  styles={styles}
                />

                <ListItem
                  title="Theme"
                  icon={
                    <SunMoon size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => void toggleTheme()}
                  styles={styles}
                />

                <ListItem
                  title="Notifications"
                  icon={
                    <Bell size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => goTo("/passenger-notifications")}
                  styles={styles}
                />

                <ListItem
                  title="Language"
                  icon={
                    <Languages
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/language-assistant")}
                  styles={styles}
                />

                <ListItem
                  title="Privacy"
                  icon={
                    <Lock size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => goTo("/privacy-account")}
                  styles={styles}
                />

                <ListItem
                  title="Accessibility"
                  icon={
                    <Accessibility
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/settings?section=accessibility")}
                  styles={styles}
                />

                <ListItem
                  title="Biometrics"
                  icon={
                    <Fingerprint
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/settings?section=biometrics")}
                  styles={styles}
                />

                <ListItem
                  title="Face ID"
                  icon={
                    <ScanFace
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/settings?section=face-id")}
                  styles={styles}
                />

                <ListItem
                  title="Preferences"
                  icon={
                    <SlidersHorizontal
                      size={21}
                      color={colors.gold}
                      strokeWidth={2.7}
                    />
                  }
                  onPress={() => goTo("/settings?section=preferences")}
                  styles={styles}
                />

                <ListItem
                  title="About Angel Express"
                  icon={
                    <Info size={21} color={colors.gold} strokeWidth={2.7} />
                  }
                  onPress={() => goTo("/about")}
                  styles={styles}
                />

                <ListItem
                  title="Log Out"
                  icon={
                    <LogOut size={21} color={colors.danger} strokeWidth={2.7} />
                  }
                  onPress={handleLogout}
                  styles={styles}
                  danger
                />
              </DropdownPanel>

              <View style={styles.footerCard}>
                <Text style={styles.footerTitle}>Angel Express Standard</Text>
                <Text style={styles.footerText}>
                  Comfort • Operational Service • Reliability • Cleanliness
                </Text>
              </View>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </View>

      {menuOpen && (
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        />
      )}

      <Animated.View
        pointerEvents={menuOpen ? "auto" : "none"}
        style={[
          styles.bottomMenuPanel,
          {
            opacity: menuAnim,
            transform: [
              {
                translateY: menuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [28, 0],
                }),
              },
              {
                scale: menuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.bottomMenuTitle}>Angel Passenger Menu</Text>

        <View style={styles.bottomMenuGrid}>
          <MenuOption
            icon={<Home size={27} color={colors.gold} strokeWidth={2.7} />}
            title="Home"
            onPress={() => setMenuOpen(false)}
            styles={styles}
          />

          <MenuOption
            icon={<CarFront size={27} color={colors.gold} strokeWidth={2.7} />}
            title="Book"
            onPress={() => goTo("/book-ride")}
            styles={styles}
          />

          <MenuOption
            icon={
              <CalendarDays size={27} color={colors.gold} strokeWidth={2.7} />
            }
            title="Trips"
            onPress={() => goTo("/my-trips")}
            styles={styles}
          />

          <MenuOption
            icon={<Gift size={27} color={colors.gold} strokeWidth={2.7} />}
            title="Rewards"
            onPress={() => goTo("/rewards")}
            styles={styles}
          />

          <MenuOption
            icon={
              <Headphones size={27} color={colors.gold} strokeWidth={2.7} />
            }
            title="Support"
            onPress={() => goTo("/support")}
            styles={styles}
          />

          <MenuOption
            icon={<UserRound size={27} color={colors.gold} strokeWidth={2.7} />}
            title="Account"
            onPress={() => goTo("/profile")}
            styles={styles}
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LogOut size={21} color={colors.danger} strokeWidth={2.7} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.bottomNav}>
        <BottomTab
          icon={<Home size={23} color={colors.gold} strokeWidth={2.7} />}
          label="Home"
          active
          styles={styles}
        />

        <BottomTab
          icon={<Ticket size={23} color={colors.muted} strokeWidth={2.7} />}
          label="Book"
          onPress={() => goTo("/book-ride")}
          styles={styles}
        />

        <TouchableOpacity
          style={styles.centerMenuButton}
          onPress={() => setMenuOpen(!menuOpen)}
          activeOpacity={0.9}
        >
          {menuOpen ? (
            <X
              size={31}
              color={colors.mode === "dark" ? "#07111F" : "#FFFFFF"}
              strokeWidth={3}
            />
          ) : (
            <Menu
              size={31}
              color={colors.mode === "dark" ? "#07111F" : "#FFFFFF"}
              strokeWidth={3}
            />
          )}
        </TouchableOpacity>

        <BottomTab
          icon={
            <CalendarDays size={23} color={colors.muted} strokeWidth={2.7} />
          }
          label="Trips"
          onPress={() => goTo("/my-trips")}
          styles={styles}
        />

        <BottomTab
          icon={<UserRound size={23} color={colors.muted} strokeWidth={2.7} />}
          label="Account"
          onPress={() => goTo("/profile")}
          styles={styles}
        />
      </View>
    </View>
  );
}

function StatBlock({ label, value, styles, small }: any) {
  return (
    <View style={styles.statBlock}>
      <Text
        style={[styles.statValue, small && styles.statValueSmall]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Divider({ styles }: any) {
  return <View style={styles.divider} />;
}

function ToolCard({ icon, title, subtitle, onPress, styles }: any) {
  return (
    <TouchableOpacity
      style={styles.toolCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.toolIconBox}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolSub}>{subtitle}</Text>
      </View>

      <Text style={styles.toolArrow}>›</Text>
    </TouchableOpacity>
  );
}

function BottomTab({ icon, label, active, onPress, styles }: any) {
  return (
    <TouchableOpacity
      style={styles.bottomTab}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon}
      <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MenuOption({ icon, title, onPress, styles }: any) {
  return (
    <TouchableOpacity
      style={styles.menuOption}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon}
      <Text style={styles.menuOptionTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

function ListItem({ title, onPress, icon, danger, styles }: any) {
  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.smallIcon, danger && styles.dangerIcon]}>
        {icon}
      </View>
      <Text style={[styles.listText, danger && styles.dangerText]}>
        {title}
      </Text>
      <Text style={[styles.listArrow, danger && styles.dangerText]}>›</Text>
    </TouchableOpacity>
  );
}

function DropdownPanel({ title, children, styles }: any) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.dropdownWrap}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setOpen(!open)}
        activeOpacity={0.85}
      >
        <Text style={styles.dropdownTitle}>{title}</Text>
        <Text style={styles.dropdownArrow}>{open ? "−" : "+"}</Text>
      </TouchableOpacity>

      {open && <View style={styles.dropdownBody}>{children}</View>}
    </View>
  );
}

function createStyles(c: AngelThemeColors) {
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
      width: "100%",
      height: "100%",
    },
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingTop: 54,
      paddingHorizontal: 20,
      paddingBottom: 150,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    menuButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lightBorder,
    },
    brandBox: {
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      paddingHorizontal: 12,
    },
    logo: {
      width: 178,
      height: 62,
    },
    bellButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lightBorder,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -3,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#FF3045",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.mode === "dark" ? "#050B16" : "#FFFFFF",
    },
    badgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "900",
    },
    greetingRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 14,
      marginBottom: 16,
    },
    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.5,
      marginBottom: 6,
    },
    greeting: {
      color: c.text,
      fontSize: 28,
      fontWeight: "900",
      letterSpacing: -0.7,
      maxWidth: 235,
    },
    themePill: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 999,
    },
    themeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    heroCard: {
      backgroundColor: c.gold,
      borderRadius: 26,
      padding: 22,
      marginBottom: 18,
      borderWidth: 1,
      borderColor:
        c.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(184,134,11,0.28)",
      shadowColor: c.gold,
      shadowOpacity: 0.28,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 26,
    },
    heroLabel: {
      color: c.mode === "dark" ? "#07111F" : "#FFFFFF",
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 8,
      opacity: 0.9,
    },
    heroTitle: {
      color: c.mode === "dark" ? "#07111F" : "#FFFFFF",
      fontSize: 42,
      fontWeight: "900",
      letterSpacing: -1.1,
    },
    heroSub: {
      color: c.mode === "dark" ? "#07111F" : "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
      marginTop: 5,
      opacity: 0.86,
    },
    arrowLight: {
      color: c.mode === "dark" ? "#07111F" : "#FFFFFF",
      fontSize: 42,
      fontWeight: "700",
      marginTop: 12,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statBlock: {
      flex: 1,
    },
    statValue: {
      color: c.mode === "dark" ? "#07111F" : "#FFFFFF",
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 5,
    },
    statValueSmall: {
      fontSize: 15,
    },
    statLabel: {
      color: c.mode === "dark" ? "#07111F" : "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
      opacity: 0.82,
    },
    divider: {
      width: 1,
      height: 58,
      backgroundColor:
        c.mode === "dark" ? "rgba(7,17,31,0.22)" : "rgba(255,255,255,0.28)",
      marginHorizontal: 12,
    },
    levelCard: {
      backgroundColor: c.mode === "dark" ? "rgba(21,31,43,0.94)" : "#FFF8E8",
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      marginBottom: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
    },
    levelIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: c.gold,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    levelMiddle: {
      flex: 1,
    },
    levelTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 4,
    },
    levelText: {
      color: c.muted,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      marginBottom: 10,
    },
    progressTrack: {
      height: 8,
      backgroundColor: c.mode === "dark" ? "rgba(212,175,55,0.18)" : "#F2DEAD",
      borderRadius: 999,
      overflow: "hidden",
    },
    progressFill: {
      width: "45%",
      height: "100%",
      backgroundColor: c.gold,
      borderRadius: 999,
    },
    levelCount: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
    },
    arrowDark: {
      color: c.text,
      fontSize: 30,
      fontWeight: "700",
    },
    menuTitle: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1.3,
      textTransform: "uppercase",
      marginBottom: 12,
      marginTop: 4,
    },
    toolCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lightBorder,
      borderRadius: 23,
      padding: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    toolIconBox: {
      width: 50,
      height: 50,
      borderRadius: 17,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    toolTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 4,
    },
    toolSub: {
      color: c.muted,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
    },
    toolArrow: {
      color: c.gold,
      fontSize: 32,
      fontWeight: "800",
    },
    dropdownWrap: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lightBorder,
      borderRadius: 23,
      marginBottom: 12,
      overflow: "hidden",
    },
    dropdownHeader: {
      minHeight: 64,
      paddingHorizontal: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.mode === "dark" ? "rgba(212,175,55,0.08)" : "#FFF8E8",
    },
    dropdownTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
    },
    dropdownArrow: {
      color: c.gold,
      fontSize: 28,
      fontWeight: "900",
    },
    dropdownBody: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      borderTopWidth: 1,
      borderTopColor: c.lightBorder,
    },
    listItem: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
    },
    smallIcon: {
      width: 36,
      height: 36,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    dangerIcon: {
      borderColor:
        c.mode === "dark" ? "rgba(239,68,68,0.45)" : "rgba(220,38,38,0.30)",
    },
    listText: {
      color: c.text,
      fontSize: 16.5,
      fontWeight: "800",
      flex: 1,
    },
    listArrow: {
      color: c.gold,
      fontSize: 27,
      fontWeight: "800",
    },
    dangerText: {
      color: c.danger,
    },
    footerCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 23,
      padding: 18,
      marginTop: 4,
    },
    footerTitle: {
      color: c.gold,
      textAlign: "center",
      fontWeight: "900",
      fontSize: 17,
      marginBottom: 8,
    },
    footerText: {
      color: c.text,
      textAlign: "center",
      fontWeight: "800",
      lineHeight: 22,
    },
    menuBackdrop: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor:
        c.mode === "dark" ? "rgba(0,0,0,0.38)" : "rgba(0,0,0,0.18)",
    },
    bottomMenuPanel: {
      position: "absolute",
      left: 18,
      right: 18,
      bottom: 102,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 28,
      padding: 18,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 16,
    },
    bottomMenuTitle: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 14,
      textAlign: "center",
    },
    bottomMenuGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    menuOption: {
      width: "31.5%",
      minHeight: 86,
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.lightBorder,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      paddingHorizontal: 6,
      gap: 7,
    },
    menuOptionTitle: {
      color: c.text,
      fontSize: 12.5,
      fontWeight: "900",
      textAlign: "center",
    },
    logoutButton: {
      marginTop: 4,
      height: 48,
      borderRadius: 17,
      backgroundColor: c.mode === "dark" ? "rgba(239,68,68,0.16)" : "#FEE2E2",
      borderWidth: 1,
      borderColor:
        c.mode === "dark" ? "rgba(239,68,68,0.4)" : "rgba(220,38,38,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    logoutText: {
      color: c.mode === "dark" ? "#FCA5A5" : "#991B1B",
      fontWeight: "900",
      fontSize: 15,
    },
    bottomNav: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 92,
      backgroundColor: c.nav,
      borderTopWidth: 1,
      borderTopColor: c.lightBorder,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingBottom: 14,
      paddingHorizontal: 8,
    },
    bottomTab: {
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
    },
    bottomLabel: {
      color: c.muted,
      fontSize: 11,
      fontWeight: "900",
      marginTop: 4,
    },
    bottomLabelActive: {
      color: c.gold,
    },
    centerMenuButton: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 26,
      shadowColor: c.gold,
      shadowOpacity: 0.35,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
      borderWidth: 4,
      borderColor: c.mode === "dark" ? "#050B16" : "#FFFFFF",
    },
  });
}
