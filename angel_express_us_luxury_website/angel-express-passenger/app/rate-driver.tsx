import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

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

  const overall = Number(
    ((comfort + operational + reliability + safety) / 4).toFixed(1)
  );

  async function submitReview() {
    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase.from("driver_reviews").insert({
        booking_id: bookingId,
        invoice_no: invoiceNo,
        user_id: user.id,
        passenger_email: user.email,
        comfort_rating: comfort,
        operational_rating: operational,
        reliability_rating: reliability,
        safety_rating: safety,
        overall_rating: overall,
        comment: comment.trim(),
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Rate Your Driver</Text>
      <Text style={styles.subtitle}>
        Rate your ride based on Angel Express COR values.
      </Text>

      <Text style={styles.invoice}>{invoiceNo}</Text>

      <RatingRow title="Comfort" value={comfort} setValue={setComfort} />
      <RatingRow
        title="Operational Excellence"
        value={operational}
        setValue={setOperational}
      />
      <RatingRow title="Reliability" value={reliability} setValue={setReliability} />
      <RatingRow title="Safety" value={safety} setValue={setSafety} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall Rating</Text>
        <Text style={styles.overall}>{overall} / 5</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Leave a comment about your ride..."
        placeholderTextColor="#8A93A3"
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <TouchableOpacity
        style={styles.button}
        onPress={submitReview}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Submitting..." : "Submit Review"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function RatingRow({
  title,
  value,
  setValue,
}: {
  title: string;
  value: number;
  setValue: (v: number) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

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
    marginBottom: 16,
  },
  invoice: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  cardTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  stars: {
    flexDirection: "row",
    gap: 8,
  },
  star: {
    color: "#D4AF37",
    fontSize: 34,
  },
  overall: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  input: {
    backgroundColor: "#071426",
    color: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    marginBottom: 18,
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "#071426",
    fontSize: 17,
    fontWeight: "900",
  },
});