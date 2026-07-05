import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { supabase } from "../lib/supabase";

const REFERRAL_DISCOUNT = 10;
const REFERRAL_CREDIT = 10;

export default function RewardsScreen() {
  const [loading, setLoading] = useState(true);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [referralRows, setReferralRows] = useState<any[]>([]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.85}
        onPress={() => router.back()}
      >
        <ArrowLeft size={20} color="#D4AF37" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Angel Rewards</Text>

      <Text style={styles.subtitle}>
        Track completed rides, miles traveled, student savings, referral credits,
        referral discounts, and reward points.
      </Text>

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator color="#D4AF37" size="large" />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
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
            <Text style={styles.cardTitle}>Your Referral Code</Text>

            <Text style={styles.referralCode}>
              {profile?.referral_code || "LOADING"}
            </Text>

            <Text style={styles.text}>
              Share this code. New passengers get ${REFERRAL_DISCOUNT} off their
              first ride. You earn ${REFERRAL_CREDIT} ride credit after their ride
              is completed.
            </Text>

            <TouchableOpacity style={styles.button} onPress={shareReferralCode}>
              <Text style={styles.buttonText}>Share Referral Code</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            <RewardCard title="Completed Rides" value={String(totalTrips)} />
            <RewardCard title="Miles Traveled" value={totalMiles.toFixed(1)} />
            <RewardCard
              title="Student Savings"
              value={`$${studentSavings.toFixed(2)}`}
            />
            <RewardCard
              title="Referral Credits"
              value={`$${referralCredits.toFixed(2)}`}
            />
            <RewardCard
              title="Pending Credits"
              value={`$${pendingReferralCredits.toFixed(2)}`}
            />
            <RewardCard
              title="Referral Discounts Used"
              value={`$${referralDiscountsUsed.toFixed(2)}`}
            />
            <RewardCard title="Reward Points" value={String(rewardPoints)} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How Referrals Work</Text>
            <Text style={styles.text}>1. Share your referral code.</Text>
            <Text style={styles.text}>
              2. New passenger enters your code during booking.
            </Text>
            <Text style={styles.text}>
              3. New passenger gets ${REFERRAL_DISCOUNT} off that ride.
            </Text>
            <Text style={styles.text}>
              4. You earn ${REFERRAL_CREDIT} ride credit after their ride is
              completed.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Referral Activity</Text>

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
    </ScrollView>
  );
}

function RewardCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.rewardCard}>
      <Text style={styles.rewardValue}>{value}</Text>
      <Text style={styles.rewardTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#040C18" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 50 },
  title: {
    color: "#D4AF37",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    color: "#C9D0D8",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  heroCard: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderColor: "rgba(212,175,55,0.3)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
  },
  heroLabel: { color: "#FFFFFF", fontSize: 16, marginBottom: 8 },
  heroPoints: { color: "#D4AF37", fontSize: 52, fontWeight: "900" },
  heroText: { color: "#FFFFFF", fontSize: 15, marginBottom: 18 },
  progressBackground: {
    height: 12,
    backgroundColor: "#071426",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: { height: "100%", backgroundColor: "#D4AF37" },
  progressText: { color: "#C9D0D8", fontSize: 14 },
  card: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  cardTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },
  referralCode: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 12,
  },
  text: { color: "#FFFFFF", fontSize: 15, lineHeight: 23, marginBottom: 8 },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 14,
  },
  buttonText: { color: "#071426", fontSize: 17, fontWeight: "900" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  rewardCard: {
    width: "48%",
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  rewardValue: {
    color: "#D4AF37",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
  },
  rewardTitle: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  loadingText: { color: "#FFFFFF", marginTop: 14, textAlign: "center" },
  activityRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(212,175,55,0.14)",
    paddingTop: 12,
    marginTop: 12,
  },
  activityTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  activityText: { color: "#C9D0D8", fontSize: 14, marginTop: 4 },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#071426",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.30)",
  },

  backText: {
    color: "#D4AF37",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },
});