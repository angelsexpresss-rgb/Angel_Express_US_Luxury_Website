import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

type ThemeMode = "dark" | "light";

export default function ChauffeurDashboardScreen() {
  const systemMode = useColorScheme();

  const [themeMode, setThemeMode] = useState<ThemeMode>(
    systemMode === "light" ? "light" : "dark"
  );

  const colors = themeMode === "dark" ? darkTheme : lightTheme;
  const styles = useMemo(() => createStyles(colors), [themeMode]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [driver, setDriver] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);

  const [rating, setRating] = useState(5);
  const [completedTrips, setCompletedTrips] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [driverLevel, setDriverLevel] = useState("Bronze");

  const [menuOpen, setMenuOpen] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const bodyFade = useRef(new Animated.Value(0)).current;
  const toolFade = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDashboard();

    Animated.loop(
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
      ])
    ).start();

    Animated.sequence([
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
      fadeIn(bodyFade, 90),
      fadeIn(toolFade, 90),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
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

  function getWeekStartDate() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString();
  }

  function calculateDriverLevel(
    trips: number,
    avgRating: number,
    safetyCheckins: number,
    feedbackScore: number
  ) {
    if (trips >= 50 && avgRating >= 4.9 && safetyCheckins >= 40 && feedbackScore >= 4.8) {
      return "Angel Elite";
    }

    if (trips >= 25 && avgRating >= 4.7 && safetyCheckins >= 20 && feedbackScore >= 4.6) {
      return "Gold";
    }

    if (trips >= 10 && avgRating >= 4.5) {
      return "Silver";
    }

    return "Bronze";
  }

  async function loadDashboard() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/driver-login");
        return;
      }

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (driverError) throw driverError;

      if (driverData.status !== "approved") {
        router.replace("/driver-pending");
        return;
      }

      setDriver(driverData);
      setIsOnline(driverData.is_online || false);

      const { data: completedData, error: completedError } = await supabase
        .from("bookings")
        .select("*")
        .eq("driver_id", user.id)
        .in("status", ["Completed", "completed"]);

      if (completedError) throw completedError;

      const completed = completedData || [];
      const totalCompletedTrips = completed.length;

      const ratings = completed
        .map((trip) => Number(trip.driver_rating || 0))
        .filter((value) => value > 0);

      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
          : Number(driverData.rating || 5);

      const weekStart = getWeekStartDate();

      const weeklyTrips = completed.filter((trip) => {
        const completedDate = new Date(
          trip.completed_at || trip.updated_at || trip.created_at
        );
        return completedDate >= new Date(weekStart);
      });

      const weeklyRevenue = weeklyTrips.reduce((sum, trip) => {
        return (
          sum +
          Number(
            trip.total ||
              trip.total_fare ||
              trip.total_price ||
              trip.price ||
              0
          )
        );
      }, 0);

      const weeklyDriverPayout = weeklyRevenue * 0.7;

      const safetyCheckins = completed.filter(
        (trip) =>
          trip.driver_arrived_at_pickup &&
          trip.driver_picked_up_passenger &&
          trip.driver_dropped_off_passenger
      ).length;

      const feedbackScore = ratings.length > 0 ? avgRating : 5;

      const level = calculateDriverLevel(
        totalCompletedTrips,
        avgRating,
        safetyCheckins,
        feedbackScore
      );

      setRating(Number(avgRating.toFixed(1)));
      setCompletedTrips(totalCompletedTrips);
      setWeeklyEarnings(weeklyDriverPayout);
      setDriverLevel(level);

      await supabase
        .from("drivers")
        .update({
          rating: Number(avgRating.toFixed(1)),
          total_trips: totalCompletedTrips,
          weekly_earnings: weeklyDriverPayout,
          driver_level: level,
          safety_checkins: safetyCheckins,
          passenger_feedback_score: Number(feedbackScore.toFixed(1)),
        })
        .eq("id", user.id);
    } catch (err: any) {
      Alert.alert("Dashboard Error", err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboard();
  }

  async function toggleOnlineStatus() {
    if (!driver) return;

    const newStatus = !isOnline;
    setIsOnline(newStatus);

    const { error } = await supabase
      .from("drivers")
      .update({ is_online: newStatus })
      .eq("id", driver.id);

    if (error) {
      setIsOnline(!newStatus);
      Alert.alert("Error", "Unable to update online status.");
      return;
    }
  }

  function requireOnline(route: string) {
    if (!isOnline) {
      Alert.alert(
        "Go Online First",
        "You must go online before finding, accepting, or starting trips.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go Online", onPress: toggleOnlineStatus },
        ]
      );
      return;
    }

    setMenuOpen(false);
    router.push(route as any);
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
          await supabase.auth.signOut();
          router.replace("/");
        },
      },
    ]);
  }

  const driverName =
    driver?.first_name ||
    driver?.full_name ||
    driver?.name ||
    "Chauffeur";

  const levelProgress =
    driverLevel === "Angel Elite"
      ? "100%"
      : driverLevel === "Gold"
      ? "75%"
      : driverLevel === "Silver"
      ? "50%"
      : "25%";

  const levelCount =
    driverLevel === "Angel Elite"
      ? "4/4"
      : driverLevel === "Gold"
      ? "3/4"
      : driverLevel === "Silver"
      ? "2/4"
      : "1/4";

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading Angel Driver...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeMode === "dark" ? "light-content" : "dark-content"} />

      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/driver-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
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
                  <Text style={styles.menuIcon}>{menuOpen ? "×" : "☰"}</Text>
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
                  onPress={() => goTo("/support")}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name="bell-outline"
                    size={24}
                    color={colors.text}
                  />

                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>3</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.greetingRow}>
                <View>
                  <Text style={styles.kicker}>DRIVER DASHBOARD</Text>
                  <Text style={styles.greeting}>Welcome, {driverName}</Text>
                </View>

                <TouchableOpacity
                  style={styles.themePill}
                  onPress={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.themeText}>
                    {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: cardFade }}>
              <View style={styles.statusCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle}>
                    {isOnline ? "You are online" : "You are offline"}
                  </Text>
                  <Text style={styles.statusSub}>
                    {isOnline
                      ? "Ready to accept Angel Express ride requests."
                      : "Go online to start receiving trip requests."}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.switchTrack,
                    isOnline ? styles.switchOn : styles.switchOff,
                  ]}
                  onPress={toggleOnlineStatus}
                  activeOpacity={0.85}
                >
                  <Animated.View
                    style={[
                      styles.switchKnob,
                      isOnline && styles.switchKnobOn,
                      { transform: [{ scale: isOnline ? pulseAnim : 1 }] },
                    ]}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.earningsCard}
                onPress={() => goTo("/earnings")}
                activeOpacity={0.9}
              >
                <View style={styles.earningsTop}>
                  <View>
                    <Text style={styles.cardLabel}>Today's Earnings</Text>
                    <Text style={styles.amount}>${weeklyEarnings.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.arrowLight}>›</Text>
                </View>

                <View style={styles.statsRow}>
                  <StatBlock label="Trips" value={String(completedTrips)} styles={styles} />
                  <Divider styles={styles} />
                  <StatBlock label="Rating" value={rating.toFixed(1)} styles={styles} />
                  <Divider styles={styles} />
                  <StatBlock label="Level" value={driverLevel} styles={styles} small />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.levelCard}
                onPress={() => goTo("/driver-card")}
                activeOpacity={0.9}
              >
                <View style={styles.levelIcon}>
                  <MaterialCommunityIcons
                    name="star-four-points"
                    size={28}
                    color={colors.mode === "dark" ? "#07111F" : "#FFFFFF"}
                  />
                </View>

                <View style={styles.levelMiddle}>
                  <Text style={styles.levelTitle}>Angel Level Progress</Text>
                  <Text style={styles.levelText}>
                    Complete safe trips to unlock higher chauffeur status.
                  </Text>

                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: levelProgress }]} />
                  </View>
                </View>

                <Text style={styles.levelCount}>{levelCount}</Text>
                <Text style={styles.arrowDark}>›</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ opacity: bodyFade }}>
              <View style={styles.goOnlineCard}>
                <View style={styles.cityArt}>
                  <Text style={styles.cityEmoji}>🏙️</Text>
                  <Text style={styles.carEmoji}>{themeMode === "dark" ? "🚘" : "🚕"}</Text>
                </View>

                <Text style={styles.goOnlineTitle}>
                  {isOnline ? "You're Online & Ready" : "Go Online to Get Trips"}
                </Text>

                <Text style={styles.goOnlineText}>
                  {isOnline
                    ? "Trip discovery, active ride tools, and smart queue are open."
                    : "You're offline. Go online to start receiving Angel Express requests."}
                </Text>

                <TouchableOpacity
                  style={[styles.primaryButton, isOnline && styles.outlineButton]}
                  onPress={toggleOnlineStatus}
                  activeOpacity={0.88}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      isOnline && styles.outlineButtonText,
                    ]}
                  >
                    {isOnline ? "Go Offline" : "Go Online"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Upcoming Opportunities</Text>

                <TouchableOpacity onPress={() => goTo("/smart-trip-queue")}>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.opportunityCard}
                onPress={() => requireOnline("/smart-trip-queue")}
                activeOpacity={0.9}
              >
                <View style={styles.smartQueueIcon}>
                  <MaterialCommunityIcons
                    name="map-marker-path"
                    size={31}
                    color={colors.gold}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.opportunityTitle}>Smart Queue</Text>
                  <Text style={styles.opportunitySub}>
                    High-demand trips near your location
                  </Text>
                  <Text style={styles.opportunityGreen}>
                    ~12 min away • Priority opportunity
                  </Text>
                </View>

                <View style={styles.pricePill}>
                  <Text style={styles.priceText}>+ $8-12</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ opacity: toolFade }}>
              <Text style={styles.menuTitle}>Driver Tools</Text>

              <ToolCard
                icon="map-search-outline"
                title="Find Trips"
                subtitle="View available website and passenger app bookings."
                locked={!isOnline}
                onPress={() => requireOnline("/find-trips")}
                styles={styles}
                colors={colors}
              />

              <ToolCard
                icon="car-clock"
                title="My Active Trip"
                subtitle="Navigate to pickup, update status, and complete the ride."
                locked={!isOnline}
                onPress={() => requireOnline("/active-trip")}
                styles={styles}
                colors={colors}
              />

              <ToolCard
                icon="calendar-clock"
                title="Upcoming Trips"
                subtitle="See today, this week, and future accepted rides."
                onPress={() => goTo("/upcoming-trips")}
                styles={styles}
                colors={colors}
              />

              <ToolCard
                icon="map-marker-path"
                title="Smart Queue"
                subtitle="Claim future trips before they become urgent."
                locked={!isOnline}
                onPress={() => requireOnline("/smart-trip-queue")}
                styles={styles}
                colors={colors}
              />

              <ToolCard
                icon="wallet-outline"
                title="Money Profile"
                subtitle="Earnings, payout status, driver card, and passenger ratings."
                onPress={() => goTo("/earnings")}
                styles={styles}
                colors={colors}
              />

              <ToolCard
                icon="star-check-outline"
                title="Passenger Ratings"
                subtitle="Review completed trip feedback and passenger ratings."
                onPress={() => goTo("/passenger-ratings")}
                styles={styles}
                colors={colors}
              />

              <ToolCard
                icon="shield-check-outline"
                title="Safety & Support"
                subtitle="Emergency button, safety check-ins, and Angel Express support."
                onPress={() => goTo("/safety-support")}
                styles={styles}
                colors={colors}
                danger
              />

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
        <Text style={styles.bottomMenuTitle}>Angel Driver Menu</Text>

        <View style={styles.bottomMenuGrid}>
          <MenuOption
            icon="home-variant-outline"
            title="Home"
            onPress={() => setMenuOpen(false)}
            styles={styles}
            colors={colors}
          />

          <MenuOption
            icon="car-clock"
            title="Trips"
            onPress={() => requireOnline("/active-trip")}
            styles={styles}
            colors={colors}
          />

          <MenuOption
            icon="wallet-outline"
            title="Earnings"
            onPress={() => goTo("/earnings")}
            styles={styles}
            colors={colors}
          />

          <MenuOption
            icon="headset"
            title="Support"
            onPress={() => goTo("/support")}
            styles={styles}
            colors={colors}
          />

          <MenuOption
            icon="gift-outline"
            title="Rewards"
            onPress={() => goTo("/driver-card")}
            styles={styles}
            colors={colors}
          />

          <MenuOption
            icon="account-circle-outline"
            title="Account"
            onPress={() => goTo("/driver-card")}
            styles={styles}
            colors={colors}
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>🚪 Log Out</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.bottomNav}>
        <BottomTab
          icon="home-variant"
          label="Home"
          active
          styles={styles}
          colors={colors}
        />

        <BottomTab
          icon="car-clock"
          label="Trips"
          onPress={() => requireOnline("/active-trip")}
          styles={styles}
          colors={colors}
        />

        <TouchableOpacity
          style={styles.centerMenuButton}
          onPress={() => setMenuOpen(!menuOpen)}
          activeOpacity={0.9}
        >
          <Text style={styles.centerMenuIcon}>{menuOpen ? "×" : "☰"}</Text>
        </TouchableOpacity>

        <BottomTab
          icon="wallet"
          label="Earnings"
          onPress={() => goTo("/earnings")}
          styles={styles}
          colors={colors}
        />

        <BottomTab
          icon="account-circle"
          label="Account"
          onPress={() => goTo("/driver-card")}
          styles={styles}
          colors={colors}
        />
      </View>
    </View>
  );
}

function StatBlock({ label, value, styles, small }: any) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, small && styles.statValueSmall]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Divider({ styles }: any) {
  return <View style={styles.divider} />;
}

function ToolCard({
  icon,
  title,
  subtitle,
  onPress,
  locked,
  styles,
  colors,
  danger,
}: any) {
  return (
    <TouchableOpacity
      style={[styles.toolCard, locked && styles.lockedCard, danger && styles.dangerCard]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.toolIconBox}>
        <MaterialCommunityIcons
          name={icon}
          size={26}
          color={danger ? colors.danger : colors.gold}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolSub}>
          {locked ? "Go online first to access this feature." : subtitle}
        </Text>
      </View>

      <Text style={styles.toolArrow}>›</Text>
    </TouchableOpacity>
  );
}

function BottomTab({ icon, label, active, onPress, styles, colors }: any) {
  return (
    <TouchableOpacity
      style={styles.bottomTab}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={active ? colors.gold : colors.muted}
      />
      <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MenuOption({ icon, title, onPress, styles, colors }: any) {
  return (
    <TouchableOpacity
      style={styles.menuOption}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <MaterialCommunityIcons name={icon} size={27} color={colors.gold} />
      <Text style={styles.menuOptionTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const darkTheme = {
  mode: "dark",
  bg: "#050B16",
  overlay: "rgba(5,11,22,0.91)",
  card: "rgba(16,24,39,0.94)",
  card2: "rgba(21,31,43,0.95)",
  text: "#FFFFFF",
  muted: "#B8C1CC",
  soft: "rgba(255,255,255,0.07)",
  border: "rgba(212,175,55,0.26)",
  lightBorder: "rgba(255,255,255,0.10)",
  gold: "#D4AF37",
  gold2: "#B8860B",
  navy: "#050B16",
  green: "#20C461",
  danger: "#EF4444",
  nav: "rgba(8,14,24,0.98)",
};

const lightTheme = {
  mode: "light",
  bg: "#F7F7F5",
  overlay: "rgba(247,247,245,0.88)",
  card: "rgba(255,255,255,0.96)",
  card2: "#FFF8E8",
  text: "#07111F",
  muted: "#5D6673",
  soft: "rgba(7,17,31,0.05)",
  border: "rgba(184,134,11,0.24)",
  lightBorder: "rgba(7,17,31,0.10)",
  gold: "#B8860B",
  gold2: "#D4AF37",
  navy: "#07111F",
  green: "#16A34A",
  danger: "#DC2626",
  nav: "rgba(255,255,255,0.98)",
};

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
      width: "100%",
      height: "100%",
    },

    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
    },

    loadingContainer: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      color: c.text,
      fontWeight: "900",
      marginTop: 14,
      letterSpacing: 0.3,
    },

    scroll: {
      flex: 1,
    },

    container: {
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

    menuIcon: {
      color: c.text,
      fontSize: 27,
      fontWeight: "900",
      marginTop: -2,
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

    statusCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 22,
      padding: 17,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },

    statusTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 5,
    },

    statusSub: {
      color: c.muted,
      fontSize: 13.5,
      fontWeight: "700",
      lineHeight: 20,
    },

    switchTrack: {
      width: 54,
      height: 31,
      borderRadius: 999,
      padding: 3,
      justifyContent: "center",
    },

    switchOn: {
      backgroundColor: c.green,
      alignItems: "flex-end",
    },

    switchOff: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.lightBorder,
      alignItems: "flex-start",
    },

    switchKnob: {
      width: 25,
      height: 25,
      borderRadius: 13,
      backgroundColor: "#FFFFFF",
    },

    switchKnobOn: {
      backgroundColor: "#FFFFFF",
    },

    earningsCard: {
      backgroundColor: c.mode === "dark" ? "rgba(7,17,31,0.98)" : "#07111F",
      borderRadius: 26,
      padding: 22,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.mode === "dark" ? c.border : "rgba(0,0,0,0.06)",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },

    earningsTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 26,
    },

    cardLabel: {
      color: "#EAF0F6",
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 8,
    },

    amount: {
      color: "#FFFFFF",
      fontSize: 46,
      fontWeight: "900",
      letterSpacing: -1.2,
    },

    arrowLight: {
      color: "#FFFFFF",
      fontSize: 42,
      fontWeight: "500",
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
      color: "#FFFFFF",
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 5,
    },

    statValueSmall: {
      fontSize: 15,
    },

    statLabel: {
      color: "#D6DEE8",
      fontSize: 14,
      fontWeight: "700",
    },

    divider: {
      width: 1,
      height: 58,
      backgroundColor: "rgba(255,255,255,0.16)",
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

    goOnlineCard: {
      backgroundColor: c.card,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
      marginBottom: 28,
      overflow: "hidden",
    },

    cityArt: {
      position: "absolute",
      right: 16,
      top: 22,
      alignItems: "center",
      opacity: c.mode === "dark" ? 0.72 : 0.9,
    },

    cityEmoji: {
      fontSize: 64,
      opacity: 0.35,
    },

    carEmoji: {
      fontSize: 54,
      marginTop: -34,
    },

    goOnlineTitle: {
      color: c.text,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 10,
      maxWidth: "72%",
    },

    goOnlineText: {
      color: c.muted,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 22,
      marginBottom: 20,
      maxWidth: "78%",
    },

    primaryButton: {
      backgroundColor: c.gold,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      shadowColor: c.gold,
      shadowOpacity: 0.25,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
    },

    primaryButtonText: {
      color: c.mode === "dark" ? "#07111F" : "#FFFFFF",
      fontSize: 17,
      fontWeight: "900",
    },

    outlineButton: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      shadowOpacity: 0,
    },

    outlineButtonText: {
      color: c.gold,
    },

    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    sectionTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 14,
      letterSpacing: -0.4,
    },

    seeAll: {
      color: c.gold,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 14,
    },

    opportunityCard: {
      backgroundColor: c.card,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: c.lightBorder,
      padding: 17,
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
      marginBottom: 30,
    },

    smartQueueIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.mode === "dark" ? "rgba(212,175,55,0.20)" : "#FCE8B6",
      alignItems: "center",
      justifyContent: "center",
    },

    opportunityTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 4,
    },

    opportunitySub: {
      color: c.muted,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 4,
    },

    opportunityGreen: {
      color: "#16A34A",
      fontSize: 13,
      fontWeight: "800",
    },

    pricePill: {
      backgroundColor: c.mode === "dark" ? "rgba(212,175,55,0.16)" : "#FFF0CC",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
    },

    priceText: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
    },

    menuTitle: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1.3,
      textTransform: "uppercase",
      marginBottom: 12,
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

    dangerCard: {
      borderColor: c.mode === "dark" ? "rgba(239,68,68,0.45)" : "rgba(220,38,38,0.30)",
    },

    lockedCard: {
      opacity: 0.48,
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
      backgroundColor: c.mode === "dark" ? "rgba(0,0,0,0.38)" : "rgba(0,0,0,0.18)",
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
      borderColor: c.mode === "dark" ? "rgba(239,68,68,0.4)" : "rgba(220,38,38,0.28)",
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

    centerMenuIcon: {
      color: c.mode === "dark" ? "#07111F" : "#FFFFFF",
      fontSize: 31,
      fontWeight: "900",
      marginTop: -2,
    },
  });
}