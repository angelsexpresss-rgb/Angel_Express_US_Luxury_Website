import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  BadgeDollarSign,
  Crown,
  Gift,
  Medal,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const REFERRAL_DISCOUNT = 10;
const REFERRAL_CREDIT = 10;
const NEXT_REWARD_POINTS = 500;

function normalizeStatus(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function numberValue(...values: any[]) {
  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return 0;
}

function displayDate(value: any) {
  if (!value) return "Date unavailable";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function rewardTier(points: number) {
  if (points >= 2000) {
    return {
      name: "Platinum Angel",
      minimum: 2000,
      next: null,
    };
  }

  if (points >= 1000) {
    return {
      name: "Gold Angel",
      minimum: 1000,
      next: 2000,
    };
  }

  if (points >= 500) {
    return {
      name: "Silver Angel",
      minimum: 500,
      next: 1000,
    };
  }

  return {
    name: "Angel Member",
    minimum: 0,
    next: 500,
  };
}

export default function RewardsScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [referralRows, setReferralRows] = useState<any[]>([]);

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
      loadRewards();
    }, [])
  );

  function generateCode(email?: string) {
    const prefix =
      email
        ?.split("@")[0]
        ?.replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 5)
        .toUpperCase() || "ANGEL";

    const random = Math.floor(1000 + Math.random() * 9000);

    return `${prefix}${random}`;
  }

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
        Alert.alert("Sign In Required", "Please sign in again.");
        router.replace("/login" as any);
        return;
      }

      const userEmail = String(user.email || "")
        .trim()
        .toLowerCase();

      let { data: profileData, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData?.referral_code) {
        const newCode = generateCode(user.email || "");

        const { error: upsertError } = await supabase
          .from("passenger_profiles")
          .upsert(
            {
              user_id: user.id,
              email: user.email,
              referral_code: newCode,
              referral_credits: numberValue(
                profileData?.referral_credits,
                0
              ),
              reward_points: numberValue(
                profileData?.reward_points,
                0
              ),
            },
            { onConflict: "user_id" }
          );

        if (upsertError) throw upsertError;

        const { data: refreshedProfile, error: refreshedError } =
          await supabase
            .from("passenger_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (refreshedError) throw refreshedError;

        profileData = refreshedProfile;
      }

      setProfile(profileData);

      const bookingFilter = userEmail
        ? `user_id.eq.${user.id},email.ilike.${userEmail},passenger_email.ilike.${userEmail}`
        : `user_id.eq.${user.id}`;

      const { data: trips, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(bookingFilter)
        .in("status", ["Completed", "completed"])
        .order("created_at", { ascending: false });

      if (tripsError) throw tripsError;

      const safeTrips = trips || [];

      setCompletedTrips(safeTrips);

      const { data: referrals, error: referralError } = await supabase
        .from("referral_rewards")
        .select("*")
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });

      const safeReferrals = referralError ? [] : referrals || [];

      if (referralError) {
        console.log(
          "Referral activity could not be loaded:",
          referralError.message
        );
      }

      setReferralRows(safeReferrals);

      await syncRewardTotals(
        user.id,
        safeTrips,
        safeReferrals,
        profileData
      );
    } catch (error: any) {
      Alert.alert(
        "Rewards Error",
        error.message || "Could not load rewards."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function syncRewardTotals(
    userId: string,
    trips: any[],
    referrals: any[],
    profileData: any
  ) {
    try {
      const totalMiles = trips.reduce(
        (sum, trip) =>
          sum +
          numberValue(
            trip.actual_miles,
            trip.estimated_miles,
            trip.distance_miles,
            trip.miles
          ),
        0
      );

      const rewardPoints = Math.round(totalMiles);

      const completedReferralCredits = referrals
        .filter((item) =>
          ["completed", "earned", "available"].includes(
            normalizeStatus(item.status)
          )
        )
        .reduce(
          (sum, item) =>
            sum +
            numberValue(
              item.credit_earned,
              item.reward_amount,
              item.amount
            ),
          0
        );

      const profilePoints = numberValue(
        profileData?.reward_points,
        0
      );

      const profileCredits = numberValue(
        profileData?.referral_credits,
        0
      );

      if (
        profilePoints !== rewardPoints ||
        profileCredits !== completedReferralCredits
      ) {
        const { error } = await supabase
          .from("passenger_profiles")
          .update({
            reward_points: rewardPoints,
            referral_credits: completedReferralCredits,
          })
          .eq("user_id", userId);

        if (error) {
          console.log(
            "Reward totals could not be synchronized:",
            error.message
          );
        } else {
          setProfile((current: any) => ({
            ...(current || {}),
            reward_points: rewardPoints,
            referral_credits: completedReferralCredits,
          }));
        }
      }
    } catch (error) {
      console.log("Reward synchronization skipped:", error);
    }
  }

  async function shareReferralCode() {
    if (!profile?.referral_code) {
      Alert.alert(
        "No Code Yet",
        "Your referral code is still loading."
      );
      return;
    }

    await Share.share({
      message: `Book your Angel Express ride and use my referral code ${profile.referral_code} to get $${REFERRAL_DISCOUNT} off your first ride. Visit https://angelexpressus.com`,
    });
  }

  const totalTrips = completedTrips.length;

  const totalMiles = completedTrips.reduce(
    (sum, trip) =>
      sum +
      numberValue(
        trip.actual_miles,
        trip.estimated_miles,
        trip.distance_miles,
        trip.miles
      ),
    0
  );

  const studentSavings = completedTrips.reduce(
    (sum, trip) =>
      sum +
      numberValue(
        trip.student_discount,
        trip.student_discount_amount,
        trip.discount_amount,
        trip.discount
      ),
    0
  );

  const lifetimeReferralCredits = referralRows
    .filter((item) =>
      ["completed", "earned", "available", "redeemed", "used"].includes(
        normalizeStatus(item.status)
      )
    )
    .reduce(
      (sum, item) =>
        sum +
        numberValue(
          item.credit_earned,
          item.reward_amount,
          item.amount
        ),
      0
    );

  const pendingReferralCredits = referralRows
    .filter((item) =>
      ["pending", "pending_review", "processing"].includes(
        normalizeStatus(item.status)
      )
    )
    .reduce(
      (sum, item) =>
        sum +
        numberValue(
          item.credit_earned,
          item.reward_amount,
          item.amount
        ),
      0
    );

  const redeemedCredits = referralRows
    .filter((item) =>
      ["redeemed", "used", "spent"].includes(
        normalizeStatus(item.status)
      )
    )
    .reduce(
      (sum, item) =>
        sum +
        numberValue(
          item.credit_earned,
          item.reward_amount,
          item.amount
        ),
      0
    );

  const profileAvailableCredits = numberValue(
    profile?.referral_credits,
    0
  );

  const availableCredits = Math.max(
    0,
    profileAvailableCredits || lifetimeReferralCredits - redeemedCredits
  );

  const referralDiscountsUsed = completedTrips.reduce(
    (sum, trip) =>
      sum +
      numberValue(
        trip.referral_discount,
        trip.referral_discount_amount
      ),
    0
  );

  const rewardPoints = Math.max(
    Math.round(totalMiles),
    numberValue(profile?.reward_points, 0)
  );

  const tier = rewardTier(rewardPoints);

  const nextTierTarget = tier.next || rewardPoints;
  const tierProgress =
    tier.next === null
      ? 100
      : Math.min(
          ((rewardPoints - tier.minimum) /
            (tier.next - tier.minimum)) *
            100,
          100
        );

  const standardRewardProgress = Math.min(
    (rewardPoints / NEXT_REWARD_POINTS) * 100,
    100
  );

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.bgWrap,
          { transform: [{ scale: bgScale }] },
        ]}
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
              onRefresh={() => loadRewards(true)}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.85}
              onPress={() => router.back()}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => loadRewards(true)}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.gold}
                  />
                ) : (
                  <RefreshCw size={18} color={colors.gold} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.themePill}
                onPress={toggleTheme}
              >
                <Text style={styles.themeText}>
                  {themeMode === "dark"
                    ? "☀️ Light"
                    : "🌙 Dark"}
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
            <Text style={styles.kicker}>
              PASSENGER LOYALTY CENTER
            </Text>

            <Text style={styles.title}>Angel Rewards</Text>

            <Text style={styles.subtitle}>
              Track completed rides, miles traveled, student
              savings, referral credits, and reward progress.
            </Text>

            {loading ? (
              <View style={styles.card}>
                <ActivityIndicator
                  color={colors.gold}
                  size="large"
                />
                <Text style={styles.loadingText}>
                  Loading rewards...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.heroCard}>
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroIcon}>
                      <Trophy
                        size={32}
                        color={colors.navy}
                      />
                    </View>

                    <View style={styles.tierPill}>
                      <Crown
                        size={15}
                        color={colors.navy}
                      />
                      <Text style={styles.tierPillText}>
                        {tier.name}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.heroLabel}>
                    Angel Rewards Points
                  </Text>

                  <Text style={styles.heroPoints}>
                    {rewardPoints}
                  </Text>

                  <Text style={styles.heroText}>
                    Earn one point for every completed mile.
                  </Text>

                  <View style={styles.progressBackground}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${standardRewardProgress}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.progressText}>
                    {rewardPoints} / {NEXT_REWARD_POINTS} points
                    toward your first reward milestone
                  </Text>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Crown size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>
                      Reward Tier
                    </Text>
                  </View>

                  <View style={styles.tierSummary}>
                    <Text style={styles.tierName}>
                      {tier.name}
                    </Text>

                    <Text style={styles.tierDescription}>
                      {tier.next === null
                        ? "You have reached the highest Angel Rewards tier."
                        : `${Math.max(
                            0,
                            nextTierTarget - rewardPoints
                          )} points until your next tier.`}
                    </Text>

                    <View style={styles.tierProgressTrack}>
                      <View
                        style={[
                          styles.tierProgressFill,
                          { width: `${tierProgress}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Gift size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>
                      Your Referral Code
                    </Text>
                  </View>

                  <View style={styles.referralBox}>
                    <Text style={styles.referralCode}>
                      {profile?.referral_code || "LOADING"}
                    </Text>
                  </View>

                  <Text style={styles.text}>
                    Share this code. New passengers get $
                    {REFERRAL_DISCOUNT} off their first ride. You
                    earn ${REFERRAL_CREDIT} ride credit after
                    their ride is completed.
                  </Text>

                  <TouchableOpacity
                    style={styles.goldButton}
                    onPress={shareReferralCode}
                  >
                    <Share2 size={18} color={colors.navy} />
                    <Text style={styles.goldButtonText}>
                      Share Referral Code
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.grid}>
                  <RewardCard
                    title="Completed Rides"
                    value={String(totalTrips)}
                    iconColor={colors.gold}
                    styles={styles}
                  />

                  <RewardCard
                    title="Miles Traveled"
                    value={totalMiles.toFixed(1)}
                    iconColor={colors.gold}
                    styles={styles}
                  />

                  <RewardCard
                    title="Student Savings"
                    value={`$${studentSavings.toFixed(2)}`}
                    iconColor={colors.gold}
                    styles={styles}
                  />

                  <RewardCard
                    title="Available Credits"
                    value={`$${availableCredits.toFixed(2)}`}
                    iconColor={colors.gold}
                    styles={styles}
                  />

                  <RewardCard
                    title="Lifetime Credits"
                    value={`$${lifetimeReferralCredits.toFixed(
                      2
                    )}`}
                    iconColor={colors.gold}
                    styles={styles}
                  />

                  <RewardCard
                    title="Pending Credits"
                    value={`$${pendingReferralCredits.toFixed(
                      2
                    )}`}
                    iconColor={colors.gold}
                    styles={styles}
                  />

                  <RewardCard
                    title="Referral Discounts Used"
                    value={`$${referralDiscountsUsed.toFixed(
                      2
                    )}`}
                    iconColor={colors.gold}
                    styles={styles}
                  />

                  <RewardCard
                    title="Reward Points"
                    value={String(rewardPoints)}
                    iconColor={colors.gold}
                    styles={styles}
                  />
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Sparkles
                      size={22}
                      color={colors.gold}
                    />
                    <Text style={styles.cardTitle}>
                      How Referrals Work
                    </Text>
                  </View>

                  <Step
                    text="1. Share your referral code."
                    iconColor={colors.gold}
                    styles={styles}
                  />

                  <Step
                    text="2. A new passenger enters your code during booking."
                    iconColor={colors.gold}
                    styles={styles}
                  />

                  <Step
                    text={`3. The new passenger gets $${REFERRAL_DISCOUNT} off the eligible ride.`}
                    iconColor={colors.gold}
                    styles={styles}
                  />

                  <Step
                    text={`4. You earn $${REFERRAL_CREDIT} ride credit after that ride is completed.`}
                    iconColor={colors.gold}
                    styles={styles}
                  />
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Medal size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>
                      Referral Activity
                    </Text>
                  </View>

                  {referralRows.length === 0 ? (
                    <Text style={styles.text}>
                      No referral activity yet.
                    </Text>
                  ) : (
                    referralRows.map((item) => {
                      const status = normalizeStatus(
                        item.status
                      );

                      const amount = numberValue(
                        item.credit_earned,
                        item.reward_amount,
                        item.amount
                      );

                      return (
                        <View
                          key={String(
                            item.id ||
                              `${item.referred_passenger_email}-${item.created_at}`
                          )}
                          style={styles.activityRow}
                        >
                          <View style={styles.activityTopRow}>
                            <Text style={styles.activityTitle}>
                              {item.referred_passenger_email ||
                                item.referred_email ||
                                "Referred passenger"}
                            </Text>

                            <View
                              style={[
                                styles.statusBadge,
                                [
                                  "completed",
                                  "earned",
                                  "available",
                                ].includes(status) &&
                                  styles.statusBadgeComplete,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  [
                                    "completed",
                                    "earned",
                                    "available",
                                  ].includes(status) &&
                                    styles.statusBadgeTextComplete,
                                ]}
                              >
                                {String(item.status || "Pending")}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.activityText}>
                            Credit: ${amount.toFixed(2)}
                          </Text>

                          <Text style={styles.activityDate}>
                            {displayDate(item.created_at)}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function RewardCard({
  title,
  value,
  iconColor,
  styles,
}: {
  title: string;
  value: string;
  iconColor: string;
  styles: any;
}) {
  return (
    <View style={styles.rewardCard}>
      <BadgeDollarSign size={20} color={iconColor} />
      <Text style={styles.rewardValue}>{value}</Text>
      <Text style={styles.rewardTitle}>{title}</Text>
    </View>
  );
}

function Step({
  text,
  iconColor,
  styles,
}: {
  text: string;
  iconColor: string;
  styles: any;
}) {
  return (
    <View style={styles.stepRow}>
      <Star size={15} color={iconColor} />
      <Text style={styles.stepText}>{text}</Text>
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

    refreshButton: {
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
    },

    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      padding: 20,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.borderSoft,
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

    loadingText: {
      color: c.text,
      marginTop: 14,
      textAlign: "center",
      fontWeight: "800",
    },

    heroCard: {
      backgroundColor: c.gold,
      borderRadius: 26,
      padding: 22,
      marginBottom: 20,
      ...v5Shadow(c),
    },

    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },

    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },

    tierPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(255,255,255,0.3)",
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 999,
    },

    tierPillText: {
      color: c.navy,
      fontSize: 12,
      fontWeight: "900",
    },

    heroLabel: {
      color: c.navy,
      fontSize: 16,
      marginBottom: 8,
      fontWeight: "900",
    },

    heroPoints: {
      color: c.navy,
      fontSize: 54,
      fontWeight: "900",
      letterSpacing: -1,
    },

    heroText: {
      color: c.navy,
      fontSize: 15,
      marginBottom: 18,
      fontWeight: "800",
      opacity: 0.82,
    },

    progressBackground: {
      height: 12,
      backgroundColor: "rgba(255,255,255,0.35)",
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 10,
    },

    progressFill: {
      height: "100%",
      backgroundColor: c.navy,
    },

    progressText: {
      color: c.navy,
      fontSize: 14,
      fontWeight: "800",
      opacity: 0.86,
    },

    tierSummary: {
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 18,
      padding: 16,
    },

    tierName: {
      color: c.gold,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 6,
    },

    tierDescription: {
      color: c.text2,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
      marginBottom: 14,
    },

    tierProgressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: c.soft,
      overflow: "hidden",
    },

    tierProgressFill: {
      height: "100%",
      backgroundColor: c.gold,
    },

    referralBox: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
    },

    referralCode: {
      color: c.gold,
      fontSize: 30,
      fontWeight: "900",
      letterSpacing: 2,
      textAlign: "center",
    },

    text: {
      color: c.text,
      fontSize: 15,
      lineHeight: 23,
      marginBottom: 8,
      fontWeight: "700",
    },

    goldButton: {
      backgroundColor: c.gold,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      flexDirection: "row",
      gap: 8,
      ...v5Shadow(c),
    },

    goldButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    rewardCard: {
      width: "48%",
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.borderSoft,
      ...v5Shadow(c),
    },

    rewardValue: {
      color: c.gold,
      fontSize: 24,
      fontWeight: "900",
      marginTop: 8,
      marginBottom: 8,
    },

    rewardTitle: {
      color: c.text,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "800",
    },

    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      marginBottom: 10,
    },

    stepText: {
      color: c.text,
      fontSize: 15,
      lineHeight: 23,
      flex: 1,
      fontWeight: "700",
    },

    activityRow: {
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
      paddingTop: 14,
      marginTop: 14,
    },

    activityTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    activityTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: "900",
      flex: 1,
    },

    activityText: {
      color: c.text2,
      fontSize: 14,
      marginTop: 7,
      fontWeight: "700",
    },

    activityDate: {
      color: c.text2,
      fontSize: 12.5,
      marginTop: 4,
      fontWeight: "700",
    },

    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft,
    },

    statusBadgeComplete: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },

    statusBadgeText: {
      color: c.text,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "capitalize",
    },

    statusBadgeTextComplete: {
      color: c.navy,
    },
  });
}
