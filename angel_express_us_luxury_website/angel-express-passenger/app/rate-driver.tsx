import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CarFront,
  HeartHandshake,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  TimerReset,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

export default function RateDriverScreen() {
  const params = useLocalSearchParams();

  const bookingId = Number(params.booking_id || 0);
  const invoiceNo = String(params.invoice_no || "");

  const [comfort, setComfort] = useState(5);
  const [operational, setOperational] = useState(5);
  const [reliability, setReliability] = useState(5);
  const [safety, setSafety] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

  const overall = Number(
    ((comfort + operational + reliability + safety) / 4).toFixed(1)
  );

  async function submitReview() {
    try {
      if (saving) return;

      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase.from("driver_reviews").insert({
        booking_id: bookingId || null,
        invoice_no: invoiceNo || null,
        user_id: user.id,
        passenger_email: user.email,
        comfort_rating: comfort,
        operational_rating: operational,
        reliability_rating: reliability,
        safety_rating: safety,
        overall_rating: overall,
        comment: comment.trim(),
        source: "passenger_app",
      });

      if (error) throw error;

      Alert.alert(
        "Review Submitted",
        "Thank you for rating your Angel Express ride.",
        [{ text: "OK", onPress: () => router.replace("/my-trips" as any) }]
      );
    } catch (error: any) {
      Alert.alert("Review Error", error.message || "Could not submit review.");
    } finally {
      setSaving(false);
    }
  }

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
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>A  RIDE QUALITY REVIEW</Text>
            </View>

            <Text style={styles.title}>Rate Your Driver</Text>

            <Text style={styles.subtitle}>
              Rate your completed Angel Express ride using our COR safety and service values.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Star size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Overall Rating</Text>
                <Text style={styles.heroScore}>{overall} / 5</Text>
                <Text style={styles.heroText}>
                  {invoiceNo ? `Invoice ${invoiceNo}` : "Completed ride review"}
                </Text>
              </View>
            </AngelCard>

            <View style={styles.scoreGrid}>
              <ScorePill title="Comfort" value={comfort} />
              <ScorePill title="Operations" value={operational} />
              <ScorePill title="Reliability" value={reliability} />
              <ScorePill title="Safety" value={safety} />
            </View>

            <RatingRow
              icon={<HeartHandshake size={24} color={GOLD} />}
              title="Comfort"
              description="Vehicle cleanliness, ride smoothness, and passenger comfort."
              value={comfort}
              setValue={setComfort}
            />

            <RatingRow
              icon={<Sparkles size={24} color={GOLD} />}
              title="Operational Excellence"
              description="Professional conduct, communication, and ride organization."
              value={operational}
              setValue={setOperational}
            />

            <RatingRow
              icon={<TimerReset size={24} color={GOLD} />}
              title="Reliability"
              description="On-time pickup, dependable service, and route confidence."
              value={reliability}
              setValue={setReliability}
            />

            <RatingRow
              icon={<ShieldCheck size={24} color={GOLD} />}
              title="Safety"
              description="Safe driving, calm experience, and passenger protection."
              value={safety}
              setValue={setSafety}
            />

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <MessageSquareText size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Ride Comment</Text>
              </View>

              <Text style={styles.helperText}>
                Tell us what went well or what Angel Express should improve.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Leave a comment about your ride..."
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={comment}
                onChangeText={setComment}
                multiline
              />
            </AngelCard>

            <AngelCard style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <CarFront size={22} color={GOLD} />
                <Text style={styles.noticeTitle}>Why This Matters</Text>
              </View>

              <Text style={styles.noticeText}>
                Your review helps Angel Express improve driver quality, safety,
                passenger comfort, and service reliability.
              </Text>
            </AngelCard>

            <AngelHeroButton
              title={saving ? "Submitting..." : "Submit Review"}
              onPress={submitReview}
              variant="gold"
              style={styles.submitButton}
            />

            <AngelHeroButton
              title="Back to My Trips"
              onPress={() => router.replace("/my-trips" as any)}
              variant="outline"
              style={styles.backTripsButton}
            />
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function RatingRow({
  icon,
  title,
  description,
  value,
  setValue,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: number;
  setValue: (v: number) => void;
}) {
  return (
    <AngelCard style={styles.ratingCard}>
      <View style={styles.ratingHeader}>
        <View style={styles.iconBox}>{icon}</View>

        <View style={styles.ratingTextBox}>
          <Text style={styles.ratingTitle}>{title}</Text>
          <Text style={styles.ratingDescription}>{description}</Text>
        </View>

        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeText}>{value}/5</Text>
        </View>
      </View>

      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setValue(star)}>
            <Text style={styles.star}>{star <= value ? "★" : "☆"}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </AngelCard>
  );
}

function ScorePill({ title, value }: { title: string; value: number }) {
  return (
    <View style={styles.scorePill}>
      <Text style={styles.scoreValue}>{value}</Text>
      <Text style={styles.scoreTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AE_COLORS.navy, overflow: "hidden" },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(5,11,22,0.91)" },
  container: { flex: 1 },
  content: { padding: 22, paddingTop: 56, paddingBottom: 50 },

  backButton: { alignSelf: "flex-start", marginBottom: 18 },
  backText: { color: GOLD, fontSize: 18, fontWeight: "900" },

  kicker: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  kickerText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  title: {
    color: GOLD,
    fontSize: 38,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    color: AE_COLORS.textSoft,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },

  heroCard: {
    minHeight: 138,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: "rgba(6,17,31,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroCopy: { flex: 1 },
  heroTitle: {
    color: AE_COLORS.navy2,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 2,
  },
  heroScore: {
    color: AE_COLORS.navy2,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroText: {
    color: "rgba(6,17,31,0.78)",
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: "800",
  },

  scoreGrid: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 18,
  },
  scorePill: {
    flex: 1,
    backgroundColor: "rgba(13,20,34,0.84)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 17,
    padding: 12,
    alignItems: "center",
  },
  scoreValue: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
  },
  scoreTitle: {
    color: AE_COLORS.white,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 5,
    textAlign: "center",
  },

  ratingCard: {
    padding: 18,
    marginBottom: 16,
  },
  ratingHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingTextBox: { flex: 1 },
  ratingTitle: {
    color: GOLD,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 5,
  },
  ratingDescription: {
    color: AE_COLORS.textSoft,
    fontSize: 13.5,
    lineHeight: 20,
  },
  ratingBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.08)",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  ratingBadgeText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
  },
  stars: {
    flexDirection: "row",
    gap: 8,
  },
  star: {
    color: GOLD,
    fontSize: 35,
  },

  card: { padding: 20, marginBottom: 18 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardTitle: {
    color: GOLD,
    fontSize: 21,
    fontWeight: "900",
    flex: 1,
  },
  helperText: {
    color: AE_COLORS.textSoft,
    fontSize: 14.5,
    lineHeight: 22,
    marginBottom: 14,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    color: AE_COLORS.white,
    borderRadius: 16,
    padding: 16,
    minHeight: 124,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontSize: 16,
  },

  noticeCard: {
    padding: 20,
    marginBottom: 18,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  noticeTitle: {
    color: GOLD,
    fontSize: 21,
    fontWeight: "900",
  },
  noticeText: {
    color: AE_COLORS.textSoft,
    fontSize: 15,
    lineHeight: 23,
  },

  submitButton: { marginTop: 2 },
  backTripsButton: { marginTop: 14 },
});