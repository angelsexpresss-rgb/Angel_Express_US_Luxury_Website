import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import { supabase } from "../lib/supabase";

export default function ChauffeurDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [driver, setDriver] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);

  const [rating, setRating] = useState(5);
  const [completedTrips, setCompletedTrips] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [driverLevel, setDriverLevel] = useState("Bronze");

  const [showTrips, setShowTrips] = useState(true);
  const [showMoneyProfile, setShowMoneyProfile] = useState(false);
  const [showSafetySupport, setShowSafetySupport] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bgScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadDashboard();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bgScale, {
            toValue: 1.05,
            duration: 7000,
            useNativeDriver: true,
          }),
          Animated.timing(bgScale, {
            toValue: 1,
            duration: 7000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

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

      const { data: allCompletedTrips, error: completedError } = await supabase
        .from("bookings")
        .select("*")
        .eq("driver_id", user.id)
        .in("status", ["Completed", "completed"]);

      if (completedError) throw completedError;

      const completed = allCompletedTrips || [];
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
        return sum + Number(trip.total || trip.total_fare || trip.total_price || trip.price || 0);
      }, 0);

      const weeklyDriverPayout = weeklyRevenue * 0.7;

      const safetyCheckins = completed.filter(
        (trip) =>
          trip.driver_arrived_at_pickup &&
          trip.driver_picked_up_passenger &&
          trip.driver_dropped_off_passenger
      ).length;

      const passengerFeedbackRatings = completed
        .map((trip) => Number(trip.driver_rating || 0))
        .filter((value) => value > 0);

      const passengerFeedbackScore =
        passengerFeedbackRatings.length > 0
          ? passengerFeedbackRatings.reduce((sum, value) => sum + value, 0) /
            passengerFeedbackRatings.length
          : 5;

      const level = calculateDriverLevel(
        totalCompletedTrips,
        avgRating,
        safetyCheckins,
        passengerFeedbackScore
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
          passenger_feedback_score: Number(passengerFeedbackScore.toFixed(1)),
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

    Alert.alert(
      newStatus ? "You Are Online" : "You Are Offline",
      newStatus
        ? "You can now find and accept Angel Express trips."
        : "You cannot find or start trips while offline."
    );
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

    router.push(route as any);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.loadingText}>Loading chauffeur cockpit...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/driver-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D4AF37"
            />
          }
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View style={styles.topBar}>
              <View>
                <Text style={styles.kicker}>ANGEL EXPRESS DRIVER APP</Text>
                <Text style={styles.welcome}>
                  Hello, {driver?.first_name || driver?.full_name || "Chauffeur"}
                </Text>
              </View>

              <TouchableOpacity style={styles.logoutMini} onPress={handleLogout}>
                <Text style={styles.logoutMiniText}>Logout</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroSmall}>TODAY'S DRIVER MODE</Text>
                  <Text style={styles.heroTitle}>
                    {isOnline ? "Ready For Trips" : "Go Online To Drive"}
                  </Text>
                </View>

                <Animated.View
                  style={[
                    styles.livePill,
                    isOnline ? styles.livePillOnline : styles.livePillOffline,
                    { transform: [{ scale: isOnline ? pulseAnim : 1 }] },
                  ]}
                >
                  <Text style={styles.liveDot}>{isOnline ? "●" : "○"}</Text>
                  <Text style={styles.liveText}>{isOnline ? "ONLINE" : "OFFLINE"}</Text>
                </Animated.View>
              </View>

              <Text style={styles.heroText}>
                {isOnline
                  ? "You are visible to Angel Express operations and can claim available rides."
                  : "Switch online to unlock trip discovery, active ride tools, and smart trip queue."}
              </Text>

              <TouchableOpacity
                style={[
                  styles.goOnlineButton,
                  isOnline ? styles.goOfflineButton : styles.goOnlineActiveButton,
                ]}
                onPress={toggleOnlineStatus}
                activeOpacity={0.88}
              >
                <View style={styles.buttonIconBox}>
                  <Text style={styles.buttonIcon}>A</Text>
                </View>

                <Text style={styles.goOnlineText}>
                  {isOnline ? "Go Offline" : "Go Online"}
                </Text>

                <Text style={styles.buttonArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <StatCard icon="⭐" label="Rating" value={rating.toFixed(1)} />
              <StatCard icon="🚗" label="Trips" value={String(completedTrips)} />
              <StatCard icon="💰" label="Week" value={`$${weeklyEarnings.toFixed(0)}`} />
              <StatCard icon="🏆" label="Level" value={driverLevel} />
            </View>

            <View style={styles.earningsPanel}>
              <View>
                <Text style={styles.panelSmall}>70% DRIVER SHARE</Text>
                <Text style={styles.panelTitle}>${weeklyEarnings.toFixed(2)}</Text>
                <Text style={styles.panelText}>Estimated chauffeur earnings this week.</Text>
              </View>

              <TouchableOpacity
                style={styles.panelButton}
                onPress={() => router.push("/earnings")}
              >
                <Text style={styles.panelButtonText}>View</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.levelCard}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelTitle}>Angel Driver Level</Text>
                <Text style={styles.levelBadge}>{driverLevel}</Text>
              </View>

              <View style={styles.levelTrack}>
                <View
                  style={[
                    styles.levelProgress,
                    {
                      width:
                        driverLevel === "Angel Elite"
                          ? "100%"
                          : driverLevel === "Gold"
                          ? "75%"
                          : driverLevel === "Silver"
                          ? "50%"
                          : "25%",
                    },
                  ]}
                />
              </View>

              <Text style={styles.levelSubtext}>
                Bronze → Silver → Gold → Angel Elite. Based on completed trips,
                rating, safety check-ins, on-time pickup, and passenger feedback.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Driver Command Center</Text>

            <View style={styles.quickGrid}>
              <QuickAction
                title="Find Trips"
                subtitle="Claim open rides"
                icon="📍"
                locked={!isOnline}
                onPress={() => requireOnline("/find-trips")}
              />

              <QuickAction
                title="Active Trip"
                subtitle="Manage current ride"
                icon="🚘"
                locked={!isOnline}
                onPress={() => requireOnline("/active-trip")}
              />

              <QuickAction
                title="Upcoming"
                subtitle="Accepted trips"
                icon="📅"
                onPress={() => router.push("/upcoming-trips")}
              />

              <QuickAction
                title="Smart Queue"
                subtitle="Future claims"
                icon="⚡"
                locked={!isOnline}
                onPress={() => requireOnline("/smart-trip-queue")}
              />
            </View>

            <Dropdown
              title="Trips"
              subtitle="Find, accept, and manage ride assignments"
              icon="🛣"
              open={showTrips}
              onPress={() => setShowTrips(!showTrips)}
            />

            {showTrips && (
              <View style={styles.dropdownContent}>
                <ActionCard
                  title="Find Trips"
                  subtitle="View available website and passenger app bookings."
                  locked={!isOnline}
                  onPress={() => requireOnline("/find-trips")}
                />

                <ActionCard
                  title="My Active Trip"
                  subtitle="Navigate to pickup, update ride status, and complete the trip."
                  locked={!isOnline}
                  onPress={() => requireOnline("/active-trip")}
                />

                <ActionCard
                  title="Upcoming Trips"
                  subtitle="See today, this week, and future accepted rides."
                  onPress={() => router.push("/upcoming-trips")}
                />

                <ActionCard
                  title="Smart Trip Queue"
                  subtitle="Claim future trips before they become urgent."
                  locked={!isOnline}
                  onPress={() => requireOnline("/smart-trip-queue")}
                />
              </View>
            )}

            <Dropdown
              title="Money & Profile"
              subtitle="Earnings, chauffeur card, and passenger feedback"
              icon="💼"
              open={showMoneyProfile}
              onPress={() => setShowMoneyProfile(!showMoneyProfile)}
            />

            {showMoneyProfile && (
              <View style={styles.dropdownContent}>
                <ActionCard
                  title="Earnings"
                  subtitle="Track weekly payout, completed trip revenue, and Stripe Connect status."
                  onPress={() => router.push("/earnings")}
                />

                <ActionCard
                  title="Driver Card"
                  subtitle="Preview what passengers see after assignment."
                  onPress={() => router.push("/driver-card")}
                />

                <ActionCard
                  title="Passenger Ratings"
                  subtitle="Rate passengers and review completed trip feedback."
                  onPress={() => router.push("/passenger-ratings")}
                />
              </View>
            )}

            <Dropdown
              title="Safety & Support"
              subtitle="Emergency tools, check-ins, and Angel Express support"
              icon="🛡"
              open={showSafetySupport}
              onPress={() => setShowSafetySupport(!showSafetySupport)}
            />

            {showSafetySupport && (
              <View style={styles.dropdownContent}>
                <TouchableOpacity
                  style={styles.emergencyButton}
                  onPress={() => router.push("/safety-support")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emergencyTitle}>Emergency Button</Text>
                  <Text style={styles.emergencyText}>
                    Safety check-ins, panic contact, emergency alert, and location sharing.
                  </Text>
                </TouchableOpacity>

                <ActionCard
                  title="Support Center"
                  subtitle="Contact Angel Express for trip, payment, vehicle, or account support."
                  onPress={() => router.push("/support")}
                />
              </View>
            )}

            <View style={styles.footerCard}>
              <Text style={styles.footerTitle}>Angel Express Standard</Text>
              <Text style={styles.footerText}>
                Comfort • Reliability • Security • Cleanliness
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  title,
  subtitle,
  icon,
  locked,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  locked?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickCard, locked && styles.lockedCard]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.quickIcon}>
        <Text style={styles.quickIconText}>{icon}</Text>
      </View>

      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{locked ? "Go online first" : subtitle}</Text>
    </TouchableOpacity>
  );
}

function Dropdown({
  title,
  subtitle,
  icon,
  open,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.dropdownHeader} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.dropdownIconBox}>
        <Text style={styles.dropdownEmoji}>{icon}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.dropdownTitle}>{title}</Text>
        <Text style={styles.dropdownSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.dropdownArrow}>{open ? "−" : "+"}</Text>
    </TouchableOpacity>
  );
}

function ActionCard({
  title,
  subtitle,
  locked,
  onPress,
}: {
  title: string;
  subtitle: string;
  locked?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, locked && styles.disabledButton]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View>
        <Text style={styles.actionButtonTitle}>{title}</Text>
        <Text style={styles.actionButtonText}>
          {locked ? "You must be online to access this feature." : subtitle}
        </Text>
      </View>

      <Text style={styles.actionArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050b16",
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
    backgroundColor: "rgba(5,11,22,0.91)",
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#050b16",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#DDE3EA",
    marginTop: 14,
    fontWeight: "800",
  },

  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 60,
    paddingBottom: 46,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },

  kicker: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  welcome: {
    color: "#ffffff",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.9,
  },

  logoutMini: {
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },

  logoutMiniText: {
    color: "#D4AF37",
    fontWeight: "900",
    fontSize: 12,
  },

  heroCard: {
    backgroundColor: "rgba(13,20,34,0.92)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    borderRadius: 32,
    padding: 20,
    marginBottom: 18,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },

  heroSmall: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  heroTitle: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.7,
  },

  heroText: {
    color: "#DDE3EA",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 18,
    fontWeight: "700",
  },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderWidth: 1,
  },

  livePillOnline: {
    backgroundColor: "rgba(46,204,113,0.13)",
    borderColor: "rgba(46,204,113,0.45)",
  },

  livePillOffline: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.16)",
  },

  liveDot: {
    color: "#2ECC71",
    fontSize: 12,
  },

  liveText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },

  goOnlineButton: {
    minHeight: 66,
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  goOnlineActiveButton: {
    backgroundColor: "#D4AF37",
  },

  goOfflineButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },

  buttonIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#050b16",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonIcon: {
    color: "#D4AF37",
    fontSize: 25,
    fontWeight: "900",
  },

  goOnlineText: {
    flex: 1,
    color: "#050b16",
    fontWeight: "900",
    fontSize: 17,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 14,
  },

  buttonArrow: {
    color: "#050b16",
    fontSize: 38,
    fontWeight: "700",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  statCard: {
    width: "48%",
    backgroundColor: "rgba(13,20,34,0.9)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },

  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },

  statValue: {
    color: "#D4AF37",
    fontSize: 25,
    fontWeight: "900",
  },

  statLabel: {
    color: "#DDE3EA",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "800",
  },

  earningsPanel: {
    backgroundColor: "rgba(212,175,55,0.11)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  panelSmall: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  panelTitle: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
  },

  panelText: {
    color: "#DDE3EA",
    fontSize: 13,
    marginTop: 5,
    fontWeight: "700",
  },

  panelButton: {
    backgroundColor: "#D4AF37",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
  },

  panelButtonText: {
    color: "#050b16",
    fontWeight: "900",
  },

  levelCard: {
    backgroundColor: "rgba(13,20,34,0.9)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 26,
    padding: 18,
    marginBottom: 22,
  },

  levelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  levelTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
  },

  levelBadge: {
    color: "#D4AF37",
    fontWeight: "900",
  },

  levelTrack: {
    height: 9,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
  },

  levelProgress: {
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 999,
  },

  levelSubtext: {
    color: "#DDE3EA",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },

  sectionTitle: {
    color: "#D4AF37",
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 14,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  quickCard: {
    width: "48%",
    backgroundColor: "rgba(13,20,34,0.92)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 24,
    padding: 16,
    marginBottom: 13,
    minHeight: 132,
  },

  lockedCard: {
    opacity: 0.55,
  },

  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(212,175,55,0.1)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.24)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  quickIconText: {
    fontSize: 22,
  },

  quickTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 5,
  },

  quickSubtitle: {
    color: "#B8C1CC",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
  },

  dropdownHeader: {
    backgroundColor: "rgba(13,20,34,0.92)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    borderRadius: 24,
    padding: 17,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  dropdownIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(212,175,55,0.09)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownEmoji: {
    fontSize: 22,
  },

  dropdownTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },

  dropdownSubtitle: {
    color: "#B8C1CC",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: "700",
  },

  dropdownArrow: {
    color: "#D4AF37",
    fontSize: 30,
    fontWeight: "900",
  },

  dropdownContent: {
    marginBottom: 16,
  },

  actionCard: {
    backgroundColor: "rgba(13,20,34,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 22,
    padding: 17,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  disabledButton: {
    opacity: 0.55,
    borderColor: "rgba(255,255,255,0.14)",
  },

  actionButtonTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },

  actionButtonText: {
    color: "#B8C1CC",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    maxWidth: 280,
  },

  actionArrow: {
    color: "#D4AF37",
    fontSize: 34,
    fontWeight: "800",
  },

  emergencyButton: {
    backgroundColor: "rgba(127,29,29,0.82)",
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
  },

  emergencyTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 6,
  },

  emergencyText: {
    color: "#FEE2E2",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },

  footerCard: {
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    borderRadius: 24,
    padding: 18,
    marginTop: 4,
  },

  footerTitle: {
    color: "#D4AF37",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 17,
    marginBottom: 8,
  },

  footerText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "900",
    letterSpacing: 0.5,
    lineHeight: 22,
  },
});