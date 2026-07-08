import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
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
  Gift,
  Medal,
  Share2,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

const REFERRAL_DISCOUNT = 10;
const REFERRAL_CREDIT = 10;

export default function RewardsScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [referralRows, setReferralRows] = useState<any[]>([]);

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

  async function loadRewards() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const userEmail = user.email?.trim().toLowerCase();

      let { data: profileData, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData?.referral_code) {
        const newCode = generateCode(user.email || "");

        const { error: updateError } = await supabase
          .from("passenger_profiles")
          .upsert(
            {
              user_id: user.id,
              email: user.email,
              referral_code: newCode,
              referral_credits: profileData?.referral_credits || 0,
              reward_points: profileData?.reward_points || 0,
            },
            { onConflict: "user_id" }
          );

        if (updateError) throw updateError;

        const { data: refreshedProfile } = await supabase
          .from("passenger_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        profileData = refreshedProfile;
      }

      setProfile(profileData);

      const { data: trips, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .in("status", ["Completed", "completed"])
        .order("created_at", { ascending: false });

      if (tripsError) throw tripsError;

      setCompletedTrips(trips || []);

      const { data: referrals, error: referralError } = await supabase
        .from("referral_rewards")
        .select("*")
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });

      if (!referralError) {
        setReferralRows(referrals || []);
      }

      await syncRewardTotals(user.id, trips || [], referrals || [], profileData);
    } catch (error: any) {
      Alert.alert("Rewards Error", error.message || "Could not load rewards.");
    } finally {
      setLoading(false);
    }
  }

  async function syncRewardTotals(
    userId: string,
    trips: any[],
    referrals: any[],
    profileData: any
  ) {
    const totalMiles = trips.reduce(
      (sum, trip) => sum + Number(trip.estimated_miles || trip.miles || 0),
      0
    );

    const rewardPoints = Math.round(totalMiles);

    const completedReferralCredits = referrals
      .filter((item) => item.status === "completed")
      .reduce((sum, item) => sum + Number(item.credit_earned || 0), 0);

    const currentCredit = Number(profileData?.referral_credits || 0);

    if (
      Number(profileData?.reward_points || 0) !== rewardPoints ||
      currentCredit !== completedReferralCredits
    ) {
      await supabase
        .from("passenger_profiles")
        .update({
          reward_points: rewardPoints,
          referral_credits: completedReferralCredits,
        })
        .eq("user_id", userId);
    }
  }

  async function shareReferralCode() {
    if (!profile?.referral_code) {
      Alert.alert("No Code Yet", "Your referral code is still loading.");
      return;
    }

    await Share.share({
      message: `Book your Angel Express ride and use my referral code ${profile.referral_code} to get $${REFERRAL_DISCOUNT} off your first ride. Visit https://angelexpressus.com`,
    });
  }

  const totalTrips = completedTrips.length;

  const totalMiles = completedTrips.reduce(
    (sum, trip) => sum + Number(trip.estimated_miles || trip.miles || 0),
    0
  );

  const studentSavings = completedTrips.reduce(
    (sum, trip) => sum + Number(trip.student_discount || trip.discount || 0),
    0
  );

  const referralCredits = referralRows
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + Number(item.credit_earned || 0), 0);

  const pendingReferralCredits = referralRows
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + Number(item.credit_earned || 0), 0);

  const referralDiscountsUsed = completedTrips.reduce(
    (sum, trip) => sum + Number(trip.referral_discount || 0),
    0
  );

  const rewardPoints = Math.round(totalMiles);
  const nextRewardMiles = 500;
  const progress = Math.min((rewardPoints / nextRewardMiles) * 100, 100);

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

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
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.85}
              onPress={() => router.back()}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>PASSENGER LOYALTY CENTER</Text>

            <Text style={styles.title}>Angel Rewards</Text>

            <Text style={styles.subtitle}>
              Track completed rides, miles traveled, student savings, referral credits,
              referral discounts, and reward points.
            </Text>

            {loading ? (
              <View style={styles.card}>
                <ActivityIndicator color={colors.gold} size="large" />
                <Text style={styles.loadingText}>Loading rewards...</Text>
              </View>
            ) : (
              <>
                <View style={styles.heroCard}>
                  <View style={styles.heroIcon}>
                    <Trophy size={32} color={colors.navy} />
                  </View>

                  <Text style={styles.heroLabel}>Angel Rewards Points</Text>
                  <Text style={styles.heroPoints}>{rewardPoints}</Text>
                  <Text style={styles.heroText}>
                    Earn 1 point for every completed mile.
                  </Text>

                  <View style={styles.progressBackground}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>

                  <Text style={styles.progressText}>
                    {rewardPoints} / {nextRewardMiles} points toward your next reward
                  </Text>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Gift size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>Your Referral Code</Text>
                  </View>

                  <View style={styles.referralBox}>
                    <Text style={styles.referralCode}>
                      {profile?.referral_code || "LOADING"}
                    </Text>
                  </View>

                  <Text style={styles.text}>
                    Share this code. New passengers get ${REFERRAL_DISCOUNT} off their
                    first ride. You earn ${REFERRAL_CREDIT} ride credit after their ride
                    is completed.
                  </Text>

                  <TouchableOpacity style={styles.goldButton} onPress={shareReferralCode}>
                    <Share2 size={18} color={colors.navy} />
                    <Text style={styles.goldButtonText}>Share Referral Code</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.grid}>
                  <RewardCard title="Completed Rides" value={String(totalTrips)} styles={styles} />
                  <RewardCard title="Miles Traveled" value={totalMiles.toFixed(1)} styles={styles} />
                  <RewardCard
                    title="Student Savings"
                    value={`$${studentSavings.toFixed(2)}`}
                    styles={styles}
                  />
                  <RewardCard
                    title="Referral Credits"
                    value={`$${referralCredits.toFixed(2)}`}
                    styles={styles}
                  />
                  <RewardCard
                    title="Pending Credits"
                    value={`$${pendingReferralCredits.toFixed(2)}`}
                    styles={styles}
                  />
                  <RewardCard
                    title="Referral Discounts Used"
                    value={`$${referralDiscountsUsed.toFixed(2)}`}
                    styles={styles}
                  />
                  <RewardCard title="Reward Points" value={String(rewardPoints)} styles={styles} />
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Sparkles size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>How Referrals Work</Text>
                  </View>

                  <Step text="1. Share your referral code." styles={styles} />
                  <Step text="2. New passenger enters your code during booking." styles={styles} />
                  <Step
                    text={`3. New passenger gets $${REFERRAL_DISCOUNT} off that ride.`}
                    styles={styles}
                  />
                  <Step
                    text={`4. You earn $${REFERRAL_CREDIT} ride credit after their ride is completed.`}
                    styles={styles}
                  />
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Medal size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>Referral Activity</Text>
                  </View>

                  {referralRows.length === 0 ? (
                    <Text style={styles.text}>No referral activity yet.</Text>
                  ) : (
                    referralRows.map((item) => (
                      <View key={item.id} style={styles.activityRow}>
                        <Text style={styles.activityTitle}>
                          {item.referred_passenger_email || "Referred passenger"}
                        </Text>
                        <Text style={styles.activityText}>
                          Status: {item.status} • Credit: $
                          {Number(item.credit_earned || 0).toFixed(2)}
                        </Text>
                      </View>
                    ))
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
  styles,
}: {
  title: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.rewardCard}>
      <BadgeDollarSign size={20} color={styles.__goldColor || "#D4AF37"} />
      <Text style={styles.rewardValue}>{value}</Text>
      <Text style={styles.rewardTitle}>{title}</Text>
    </View>
  );
}

function Step({ text, styles }: { text: string; styles: any }) {
  return (
    <View style={styles.stepRow}>
      <Star size={15} color={styles.__goldColor || "#D4AF37"} />
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function createStyles(c: any) {
  const styleObj: any = StyleSheet.create({
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
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
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
      paddingTop: 12,
      marginTop: 12,
    },
    activityTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: "900",
    },
    activityText: {
      color: c.text2,
      fontSize: 14,
      marginTop: 4,
      fontWeight: "700",
    },
  });

  styleObj.__goldColor = c.gold;
  return styleObj;
}