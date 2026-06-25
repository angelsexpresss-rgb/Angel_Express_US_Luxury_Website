import { useFocusEffect } from "expo-router";
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
import { supabase } from "../lib/supabase";

export default function RewardsScreen() {
  const [loading, setLoading] = useState(true);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadRewards();
    }, [])
  );

  function generateCode(email?: string) {
    const prefix = email?.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase() || "ANGEL";
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

      const { data: profileData, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .ilike("status", "Completed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCompletedTrips(data || []);
    } catch (error: any) {
      Alert.alert("Rewards Error", error.message || "Could not load rewards.");
    } finally {
      setLoading(false);
    }
  }

  async function createReferralCode() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const newCode = generateCode(user.email || "");

      const { error } = await supabase
        .from("passenger_profiles")
        .update({ referral_code: newCode })
        .eq("user_id", user.id);

      if (error) throw error;

      Alert.alert("Referral Code Created", `Your code is ${newCode}`);
      loadRewards();
    } catch (error: any) {
      Alert.alert("Referral Error", error.message || "Could not create referral code.");
    } finally {
      setLoading(false);
    }
  }

  async function shareReferralCode() {
    if (!profile?.referral_code) {
      Alert.alert("No Code Yet", "Please generate your referral code first.");
      return;
    }

    await Share.share({
      message: `Book your Angel Express ride and use my referral code ${profile.referral_code} for a discount. Visit https://angelexpressus.com`,
    });
  }

  const totalTrips = completedTrips.length;

  const totalMiles = completedTrips.reduce((sum, trip) => {
    return sum + Number(trip.estimated_miles || trip.miles || 0);
  }, 0);

  const studentSavings = completedTrips.reduce((sum, trip) => {
    return sum + Number(trip.student_discount || trip.discount || 0);
  }, 0);

  const referralCredits = Number(profile?.referral_credits || 0);

  const referralDiscountsUsed = completedTrips.reduce((sum, trip) => {
    return sum + Number(trip.referral_discount || 0);
  }, 0);

  const rewardPoints = Math.round(totalMiles);
  const nextRewardMiles = 500;
  const progress = Math.min((rewardPoints / nextRewardMiles) * 100, 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Rewards</Text>

      <Text style={styles.subtitle}>
        Track completed trips, miles, referral credits, and student discounts.
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
            <Text style={styles.heroText}>Earn 1 point for every completed mile.</Text>

            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>

            <Text style={styles.progressText}>
              {rewardPoints} / {nextRewardMiles} points toward your next reward
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Referral Code</Text>

            {profile?.referral_code ? (
              <>
                <Text style={styles.referralCode}>{profile.referral_code}</Text>
                <Text style={styles.text}>
                  Share this code. New passengers can use it for a discount.
                </Text>

                <TouchableOpacity style={styles.button} onPress={shareReferralCode}>
                  <Text style={styles.buttonText}>Share Referral Code</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.text}>
                  Generate a personal referral code to share with friends.
                </Text>

                <TouchableOpacity style={styles.button} onPress={createReferralCode}>
                  <Text style={styles.buttonText}>Generate Referral Code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.grid}>
            <RewardCard title="Completed Trips" value={String(totalTrips)} />
            <RewardCard title="Miles Traveled" value={totalMiles.toFixed(1)} />
            <RewardCard title="Student Savings" value={`$${studentSavings.toFixed(2)}`} />
            <RewardCard title="Referral Credits" value={`$${referralCredits.toFixed(2)}`} />
            <RewardCard title="Referral Discounts Used" value={`$${referralDiscountsUsed.toFixed(2)}`} />
            <RewardCard title="Reward Points" value={String(rewardPoints)} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How Referrals Work</Text>
            <Text style={styles.text}>• Passenger shares referral code</Text>
            <Text style={styles.text}>• New passenger enters code during booking</Text>
            <Text style={styles.text}>• New passenger gets $10 discount</Text>
            <Text style={styles.text}>• Referrer earns $10 ride credit after trip is completed</Text>
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
  title: { color: "#D4AF37", fontSize: 34, fontWeight: "900", marginBottom: 10 },
  subtitle: { color: "#C9D0D8", fontSize: 16, lineHeight: 24, marginBottom: 24 },
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
  cardTitle: { color: "#D4AF37", fontSize: 22, fontWeight: "900", marginBottom: 14 },
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
  rewardValue: { color: "#D4AF37", fontSize: 24, fontWeight: "900", marginBottom: 8 },
  rewardTitle: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  loadingText: { color: "#FFFFFF", marginTop: 14, textAlign: "center" },
});