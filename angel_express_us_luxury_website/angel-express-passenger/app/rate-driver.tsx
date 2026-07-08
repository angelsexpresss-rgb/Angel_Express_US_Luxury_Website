import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  ArrowLeft,
  CarFront,
  HeartHandshake,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  TimerReset,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

export default function RateDriverScreen() {
  const params = useLocalSearchParams();
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

      let booking: any = null;

      if (bookingId) {
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();

        if (bookingError) throw bookingError;

        booking = bookingData;
      } else if (invoiceNo) {
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("invoice_no", invoiceNo)
          .maybeSingle();

        if (bookingError) throw bookingError;

        booking = bookingData;
      }

      const driverId =
        booking?.driver_id ||
        booking?.assigned_driver_id ||
        booking?.chauffeur_id ||
        null;

      if (!driverId) {
        Alert.alert(
          "Driver Not Found",
          "This ride does not have an assigned driver to review yet."
        );
        return;
      }

      const { error } = await supabase.from("driver_reviews").insert({
        booking_id: bookingId || booking?.id || null,
        invoice_no: invoiceNo || booking?.invoice_no || null,

        driver_id: driverId,

        user_id: user.id,
        passenger_email: user.email,

        comfort_rating: comfort,
        operational_rating: operational,
        reliability_rating: reliability,
        safety_rating: safety,
        overall_rating: overall,

        comment: comment.trim(),
        source: "passenger_app",
        is_visible_to_driver: true,
      });

      if (error) throw error;

      await supabase
        .from("bookings")
        .update({
          driver_rating_by_passenger: overall,
          driver_rating_comment_by_passenger: comment.trim(),
          driver_rating_completed_at: new Date().toISOString(),
        })
        .eq("id", booking?.id || bookingId);

      Alert.alert(
        "Review Submitted",
        "Thank you for rating your Angel Express ride. The driver's live rating has been updated.",
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
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
            <Text style={styles.kicker}>RIDE QUALITY REVIEW</Text>
            <Text style={styles.title}>Rate Your Driver</Text>

            <Text style={styles.subtitle}>
              Rate your completed Angel Express ride using our comfort,
              operations, reliability, and safety values.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Star size={30} color={colors.navy} fill={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Overall Rating</Text>
                <Text style={styles.heroScore}>{overall} / 5</Text>
                <Text style={styles.heroText}>
                  {invoiceNo ? `Invoice ${invoiceNo}` : "Completed ride review"}
                </Text>
              </View>
            </View>

            <View style={styles.scoreGrid}>
              <ScorePill title="Comfort" value={comfort} styles={styles} />
              <ScorePill title="Operations" value={operational} styles={styles} />
              <ScorePill title="Reliability" value={reliability} styles={styles} />
              <ScorePill title="Safety" value={safety} styles={styles} />
            </View>

            <RatingRow
              icon={<HeartHandshake size={24} color={colors.gold} />}
              title="Comfort"
              description="Vehicle cleanliness, ride smoothness, and passenger comfort."
              value={comfort}
              setValue={setComfort}
              styles={styles}
            />

            <RatingRow
              icon={<Sparkles size={24} color={colors.gold} />}
              title="Operational Excellence"
              description="Professional conduct, communication, and ride organization."
              value={operational}
              setValue={setOperational}
              styles={styles}
            />

            <RatingRow
              icon={<TimerReset size={24} color={colors.gold} />}
              title="Reliability"
              description="On-time pickup, dependable service, and route confidence."
              value={reliability}
              setValue={setReliability}
              styles={styles}
            />

            <RatingRow
              icon={<ShieldCheck size={24} color={colors.gold} />}
              title="Safety"
              description="Safe driving, calm experience, and passenger protection."
              value={safety}
              setValue={setSafety}
              styles={styles}
            />

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MessageSquareText size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Ride Comment</Text>
              </View>

              <Text style={styles.helperText}>
                Tell us what went well or what Angel Express should improve.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Leave a comment about your ride..."
                placeholderTextColor={colors.placeholder}
                value={comment}
                onChangeText={setComment}
                multiline
              />
            </View>

            <View style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <CarFront size={22} color={colors.gold} />
                <Text style={styles.noticeTitle}>Why This Matters</Text>
              </View>

              <Text style={styles.noticeText}>
                Your review helps Angel Express improve driver quality, safety,
                passenger comfort, and service reliability. It also updates the
                driver's live rating in the driver app.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.disabledButton]}
              onPress={submitReview}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => router.replace("/my-trips" as any)}
            >
              <Text style={styles.outlineButtonText}>Back to My Trips</Text>
            </TouchableOpacity>
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
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: number;
  setValue: (v: number) => void;
  styles: any;
}) {
  return (
    <View style={styles.ratingCard}>
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
    </View>
  );
}

function ScorePill({
  title,
  value,
  styles,
}: {
  title: string;
  value: number;
  styles: any;
}) {
  return (
    <View style={styles.scorePill}>
      <Text style={styles.scoreValue}>{value}</Text>
      <Text style={styles.scoreTitle}>{title}</Text>
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
    content: { padding: 22, paddingTop: 58, paddingBottom: 52 },
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
    backText: { color: c.gold, fontSize: 15, fontWeight: "900" },
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
      marginBottom: 8,
    },
    title: {
      color: c.text,
      fontSize: 37,
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
    heroCard: {
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    heroCopy: { flex: 1 },
    heroTitle: {
      color: c.navy,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 2,
    },
    heroScore: {
      color: c.navy,
      fontSize: 42,
      fontWeight: "900",
      letterSpacing: -1,
    },
    heroText: {
      color: c.navy,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
      opacity: 0.82,
    },
    scoreGrid: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 18,
    },
    scorePill: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 17,
      padding: 12,
      alignItems: "center",
      ...v5Shadow(c),
    },
    scoreValue: { color: c.gold, fontSize: 22, fontWeight: "900" },
    scoreTitle: {
      color: c.text,
      fontSize: 10,
      fontWeight: "800",
      marginTop: 5,
      textAlign: "center",
    },
    ratingCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      ...v5Shadow(c),
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
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    ratingTextBox: { flex: 1 },
    ratingTitle: { color: c.gold, fontSize: 19, fontWeight: "900" },
    ratingDescription: {
      color: c.text2,
      fontSize: 13.5,
      lineHeight: 20,
      marginTop: 5,
      fontWeight: "700",
    },
    ratingBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      paddingVertical: 7,
      paddingHorizontal: 10,
    },
    ratingBadgeText: { color: c.gold, fontSize: 12, fontWeight: "900" },
    stars: { flexDirection: "row", gap: 8 },
    star: { color: c.gold, fontSize: 35 },
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 20,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
    },
    cardTitle: { color: c.gold, fontSize: 21, fontWeight: "900", flex: 1 },
    helperText: {
      color: c.text2,
      fontSize: 14.5,
      lineHeight: 22,
      marginBottom: 14,
      fontWeight: "700",
    },
    input: {
      backgroundColor: c.input,
      color: c.inputText,
      borderRadius: 16,
      padding: 16,
      minHeight: 124,
      textAlignVertical: "top",
      borderWidth: 1,
      borderColor: c.borderSoft,
      fontSize: 16,
      fontWeight: "700",
    },
    noticeCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    noticeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    noticeTitle: { color: c.gold, fontSize: 21, fontWeight: "900" },
    noticeText: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "700",
    },
    submitButton: {
      backgroundColor: c.gold,
      paddingVertical: 17,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 2,
      ...v5Shadow(c),
    },
    submitButtonText: {
      color: c.navy,
      textAlign: "center",
      fontWeight: "900",
      fontSize: 16,
      textTransform: "uppercase",
    },
    disabledButton: { opacity: 0.7 },
    outlineButton: {
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 14,
      backgroundColor: c.card,
    },
    outlineButtonText: { color: c.gold, fontSize: 15, fontWeight: "900" },
  });
}