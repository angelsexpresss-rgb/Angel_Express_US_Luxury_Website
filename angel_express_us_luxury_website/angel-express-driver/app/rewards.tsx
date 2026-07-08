import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  getDriverPayoutAmount,
  getTripMilesValue,
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

type RewardTier = {
  name: string;
  minTrips: number;
  minRating: number;
  perk: string;
};

const TIERS: RewardTier[] = [
  {
    name: "Bronze",
    minTrips: 0,
    minRating: 0,
    perk: "Access to standard Angel Express trips.",
  },
  {
    name: "Silver",
    minTrips: 10,
    minRating: 4.5,
    perk: "Better visibility for upcoming trip opportunities.",
  },
  {
    name: "Gold",
    minTrips: 25,
    minRating: 4.7,
    perk: "Priority access to premium and longer-distance trips.",
  },
  {
    name: "Angel Elite",
    minTrips: 50,
    minRating: 4.9,
    perk: "Top priority for VIP, airport, event, and private bookings.",
  },
];

export default function DriverRewardsScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [driver, setDriver] = useState<any>(null);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadRewards();
    }, [])
  );

  async function loadRewards(isRefresh = false) {
    try {
      if (isRefresh) {
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
        router.replace("/driver-login");
        return;
      }

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (driverError) throw driverError;

      setDriver(driverData);

      const { data: tripsData, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(`driver_id.eq.${user.id},assigned_driver_id.eq.${user.id}`)
        .in("status", ["completed", "Completed"])
        .order("completed_at", { ascending: false });

      if (tripsError) throw tripsError;

      setCompletedTrips(tripsData || []);
    } catch (err: any) {
      Alert.alert("Rewards Error", err.message || "Unable to load rewards.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const totalTrips = completedTrips.length;

  const rating = Number(driver?.rating || 5);

  const totalMiles = completedTrips.reduce((sum, trip) => {
    return sum + getTripMilesValue(trip);
  }, 0);

  const totalPayout = completedTrips.reduce((sum, trip) => {
    return sum + getDriverPayoutAmount(trip);
  }, 0);

  function getCurrentTier() {
    if (totalTrips >= 50 && rating >= 4.9) return TIERS[3];
    if (totalTrips >= 25 && rating >= 4.7) return TIERS[2];
    if (totalTrips >= 10 && rating >= 4.5) return TIERS[1];
    return TIERS[0];
  }

  function getNextTier() {
    const current = getCurrentTier();

    if (current.name === "Bronze") return TIERS[1];
    if (current.name === "Silver") return TIERS[2];
    if (current.name === "Gold") return TIERS[3];

    return null;
  }

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();

  const tripsNeeded = nextTier
    ? Math.max(nextTier.minTrips - totalTrips, 0)
    : 0;

  const ratingNeeded = nextTier
    ? Math.max(nextTier.minRating - rating, 0)
    : 0;

  const progressPercent = nextTier
    ? Math.min((totalTrips / nextTier.minTrips) * 100, 100)
    : 100;

  function getTierStatus(tier: RewardTier) {
    const unlocked = totalTrips >= tier.minTrips && rating >= tier.minRating;
    return unlocked ? "Unlocked" : "Locked";
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading rewards...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRewards(true)}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.kicker}>ANGEL EXPRESS DRIVER APP</Text>
          <Text style={styles.title}>Driver Rewards</Text>

          <Text style={styles.subtitle}>
            Track your chauffeur level, unlock priority trips, and grow toward
            Angel Elite status.
          </Text>

          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Current Level</Text>
                <Text style={styles.heroTitle}>{currentTier.name}</Text>
              </View>

              <View style={styles.rewardIcon}>
                <Text style={styles.rewardIconText}>🎁</Text>
              </View>
            </View>

            <Text style={styles.heroPerk}>{currentTier.perk}</Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>

            {nextTier ? (
              <Text style={styles.progressText}>
                {tripsNeeded > 0
                  ? `${tripsNeeded} more completed trip${
                      tripsNeeded === 1 ? "" : "s"
                    } to reach ${nextTier.name}.`
                  : ratingNeeded > 0
                  ? `Raise rating by ${ratingNeeded.toFixed(
                      1
                    )} to reach ${nextTier.name}.`
                  : `You are ready for ${nextTier.name}.`}
              </Text>
            ) : (
              <Text style={styles.progressText}>
                You reached Angel Elite. Keep delivering premium service.
              </Text>
            )}
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalTrips}</Text>
              <Text style={styles.statLabel}>Completed Trips</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Driver Rating</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalMiles.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Miles Driven</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>${totalPayout.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Lifetime Payout</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Reward Tiers</Text>

            {TIERS.map((tier) => {
              const unlocked = getTierStatus(tier) === "Unlocked";
              const active = tier.name === currentTier.name;

              return (
                <View
                  key={tier.name}
                  style={[
                    styles.tierRow,
                    unlocked && styles.tierUnlocked,
                    active && styles.tierActive,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierName}>{tier.name}</Text>
                    <Text style={styles.tierRequirement}>
                      {tier.minTrips} trips • {tier.minRating.toFixed(1)} rating
                    </Text>
                    <Text style={styles.tierPerk}>{tier.perk}</Text>
                  </View>

                  <Text
                    style={[
                      styles.tierStatus,
                      unlocked && styles.tierStatusUnlocked,
                    ]}
                  >
                    {unlocked ? "✓" : "○"}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>How To Earn Rewards</Text>

            <RewardTip
              text="Complete assigned trips safely and professionally."
              styles={styles}
            />
            <RewardTip
              text="Keep your driver rating high with clean vehicles and clear communication."
              styles={styles}
            />
            <RewardTip
              text="Use active trip status updates correctly: arrived, picked up, and dropped off."
              styles={styles}
            />
            <RewardTip
              text="Avoid cancellations, missed pickups, and passenger complaints."
              styles={styles}
            />
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Angel Express Standard</Text>
            <Text style={styles.noticeText}>
              Rewards are based on Comfort, Reliability, Security, Cleanliness,
              trip completion, and passenger experience.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

function RewardTip({ text, styles }: { text: string; styles: any }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipDot}>
        <Text style={styles.tipDotText}>✓</Text>
      </View>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: colors.text2,
      marginTop: 14,
      fontWeight: "800",
    },
    container: {
      flexGrow: 1,
      padding: 22,
      paddingTop: 60,
      paddingBottom: 48,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    backButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 14,
    },
    themePill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    kicker: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 36,
      fontWeight: "900",
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "700",
      marginBottom: 20,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,
      padding: 22,
      marginBottom: 18,
      ...v5Shadow(colors),
    },
    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    heroLabel: {
      color: colors.text2,
      fontSize: 13,
      fontWeight: "800",
      textTransform: "uppercase",
      marginBottom: 5,
    },
    heroTitle: {
      color: colors.gold,
      fontSize: 34,
      fontWeight: "900",
    },
    rewardIcon: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.16)" : "#FFF8E8",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    rewardIconText: {
      fontSize: 30,
    },
    heroPerk: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "700",
      marginBottom: 16,
    },
    progressTrack: {
      height: 10,
      backgroundColor:
        colors.mode === "dark" ? "rgba(255,255,255,0.10)" : "#E5E7EB",
      borderRadius: 999,
      overflow: "hidden",
      marginBottom: 10,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.gold,
      borderRadius: 999,
    },
    progressText: {
      color: colors.text2,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "800",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    statCard: {
      width: "48%",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
    },
    statValue: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "900",
      marginBottom: 5,
    },
    statLabel: {
      color: colors.text2,
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 18,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 18,
      marginBottom: 18,
    },
    sectionTitle: {
      color: colors.gold,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 14,
    },
    tierRow: {
      flexDirection: "row",
      gap: 12,
      padding: 15,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      backgroundColor: colors.card2,
      marginBottom: 12,
    },
    tierUnlocked: {
      borderColor: colors.border,
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.08)" : "#FFF8E8",
    },
    tierActive: {
      borderColor: colors.gold,
    },
    tierName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 4,
    },
    tierRequirement: {
      color: colors.gold,
      fontSize: 13,
      fontWeight: "900",
      marginBottom: 5,
    },
    tierPerk: {
      color: colors.text2,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },
    tierStatus: {
      color: colors.muted2,
      fontSize: 28,
      fontWeight: "900",
    },
    tierStatusUnlocked: {
      color: colors.gold,
    },
    tipRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 12,
    },
    tipDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.16)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    tipDotText: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 13,
    },
    tipText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
      flex: 1,
      fontWeight: "700",
    },
    noticeCard: {
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.10)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 18,
    },
    noticeTitle: {
      color: colors.gold,
      fontSize: 18,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 8,
    },
    noticeText: {
      color: colors.text2,
      textAlign: "center",
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
    },
  });
}