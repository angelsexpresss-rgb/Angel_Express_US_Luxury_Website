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
  CalendarClock,
  Edit3,
  MapPin,
  MessageSquareText,
  Route,
  ShieldCheck,
  Timer,
  XCircle,
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

const OPTIONS = [
  {
    title: "Cancel Ride",
    subtitle: "Request cancellation review for this booking.",
    icon: XCircle,
  },
  {
    title: "Change Pickup Location",
    subtitle: "Update where your chauffeur should pick you up.",
    icon: MapPin,
  },
  {
    title: "Change Drop-off Location",
    subtitle: "Update your destination before the ride starts.",
    icon: Route,
  },
  {
    title: "Change Date",
    subtitle: "Request a new ride date.",
    icon: CalendarClock,
  },
  {
    title: "Change Time",
    subtitle: "Request a new pickup time.",
    icon: Timer,
  },
  {
    title: "Other Request",
    subtitle: "Ask Angel Express operations for help.",
    icon: MessageSquareText,
  },
];

export default function ManageBookingScreen() {
  const params = useLocalSearchParams();

  const bookingId = String(params.booking_id || "");
  const invoiceNo = String(params.invoice_no || "");

  const [requestType, setRequestType] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

  async function submitRequest() {
    try {
      if (!requestType) {
        Alert.alert("Select Request Type", "Please choose what you want to change.");
        return;
      }

      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase.from("booking_change_requests").insert({
        booking_id: bookingId || null,
        invoice_no: invoiceNo || null,
        user_id: user.id,
        passenger_email: user.email,
        request_type: requestType,
        request_details: details.trim(),
        status: "Pending Review",
        source: "passenger_app",
      });

      if (error) throw error;

      Alert.alert(
        "Request Submitted",
        "Angel Express has received your request and will review it shortly.",
        [
          {
            text: "View My Trips",
            onPress: () => router.push("/my-trips" as any),
          },
          { text: "OK" },
        ]
      );

      setDetails("");
      setRequestType("");
    } catch (error: any) {
      Alert.alert("Request Error", error.message || "Could not submit request.");
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
              <Text style={styles.kickerText}>A  BOOKING OPERATIONS</Text>
            </View>

            <Text style={styles.title}>Manage Booking</Text>

            <Text style={styles.subtitle}>
              Submit a change or cancellation request. Angel Express operations will review it before your ride is updated.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Edit3 size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Booking Change Request</Text>
                <Text style={styles.heroText}>
                  {invoiceNo ? `Invoice ${invoiceNo}` : "No invoice number provided"}
                </Text>
              </View>
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={GOLD} />
                <Text style={styles.cardTitle}>What do you need help with?</Text>
              </View>

              {OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = requestType === option.title;

                return (
                  <TouchableOpacity
                    key={option.title}
                    style={[styles.option, selected && styles.selectedOption]}
                    onPress={() => setRequestType(option.title)}
                    activeOpacity={0.86}
                  >
                    <View style={[styles.optionIcon, selected && styles.optionIconActive]}>
                      <Icon size={20} color={selected ? AE_COLORS.navy2 : GOLD} />
                    </View>

                    <View style={styles.optionTextBox}>
                      <Text style={[styles.optionTitle, selected && styles.optionTitleActive]}>
                        {option.title}
                      </Text>
                      <Text style={[styles.optionSubtitle, selected && styles.optionSubtitleActive]}>
                        {option.subtitle}
                      </Text>
                    </View>

                    <Text style={[styles.optionArrow, selected && styles.optionArrowActive]}>
                      ›
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <MessageSquareText size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Request Details</Text>
              </View>

              <Text style={styles.helperText}>
                Add the new address, new date/time, cancellation reason, flight update,
                or any details Angel Express should review.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Additional details..."
                placeholderTextColor="rgba(255,255,255,0.45)"
                multiline
                value={details}
                onChangeText={setDetails}
              />
            </AngelCard>

            <AngelCard style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Important</Text>
              <Text style={styles.noticeText}>
                This does not automatically change your booking. Angel Express will review your request and contact you if confirmation is needed.
              </Text>
            </AngelCard>

            <AngelHeroButton
              title={saving ? "Submitting..." : "Submit Request"}
              onPress={submitRequest}
              variant="gold"
              style={styles.submitButton}
            />

            <AngelHeroButton
              title="Back to My Trips"
              onPress={() => router.push("/my-trips" as any)}
              variant="outline"
              style={styles.backTripsButton}
            />
          </Animated.View>
        </ScrollView>
      </View>
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
    fontSize: 36,
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
    minHeight: 126,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(6,17,31,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroCopy: { flex: 1 },
  heroTitle: {
    color: AE_COLORS.navy2,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  heroText: {
    color: "rgba(6,17,31,0.78)",
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: "700",
  },

  card: { padding: 20, marginBottom: 18 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    color: GOLD,
    fontSize: 21,
    fontWeight: "900",
    flex: 1,
  },

  option: {
    minHeight: 78,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.16)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedOption: {
    backgroundColor: GOLD,
    borderColor: AE_COLORS.goldLight,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconActive: {
    backgroundColor: "rgba(6,17,31,0.12)",
    borderColor: "rgba(6,17,31,0.18)",
  },
  optionTextBox: { flex: 1 },
  optionTitle: {
    color: AE_COLORS.white,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  optionTitleActive: { color: AE_COLORS.navy2 },
  optionSubtitle: {
    color: AE_COLORS.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  optionSubtitleActive: { color: "rgba(6,17,31,0.78)" },
  optionArrow: {
    color: GOLD,
    fontSize: 32,
    fontWeight: "300",
    marginTop: -2,
  },
  optionArrowActive: { color: AE_COLORS.navy2 },

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
    minHeight: 128,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    textAlignVertical: "top",
    fontSize: 16,
  },

  noticeCard: {
    padding: 18,
    marginBottom: 18,
    borderColor: "rgba(212,175,55,0.32)",
  },
  noticeTitle: {
    color: GOLD,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 8,
  },
  noticeText: {
    color: AE_COLORS.textSoft,
    fontSize: 14.5,
    lineHeight: 22,
  },

  submitButton: { marginTop: 2 },
  backTripsButton: { marginTop: 14 },
});