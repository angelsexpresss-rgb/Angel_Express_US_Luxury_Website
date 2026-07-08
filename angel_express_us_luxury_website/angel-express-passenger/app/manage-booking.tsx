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
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

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

  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bookingId = String(params.booking_id || "");
  const invoiceNo = String(params.invoice_no || "");

  const [requestType, setRequestType] = useState("");
  const [details, setDetails] = useState("");
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
            <Text style={styles.kicker}>BOOKING OPERATIONS</Text>
            <Text style={styles.title}>Manage Booking</Text>

            <Text style={styles.subtitle}>
              Submit a change or cancellation request. Angel Express operations will
              review it before your ride is updated.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Edit3 size={31} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Booking Change Request</Text>
                <Text style={styles.heroText}>
                  {invoiceNo ? `Invoice ${invoiceNo}` : "No invoice number provided"}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
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
                      <Icon
                        size={20}
                        color={selected ? colors.navy : colors.gold}
                      />
                    </View>

                    <View style={styles.optionTextBox}>
                      <Text
                        style={[
                          styles.optionTitle,
                          selected && styles.optionTitleActive,
                        ]}
                      >
                        {option.title}
                      </Text>
                      <Text
                        style={[
                          styles.optionSubtitle,
                          selected && styles.optionSubtitleActive,
                        ]}
                      >
                        {option.subtitle}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.optionArrow,
                        selected && styles.optionArrowActive,
                      ]}
                    >
                      ›
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MessageSquareText size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Request Details</Text>
              </View>

              <Text style={styles.helperText}>
                Add the new address, new date/time, cancellation reason, flight update,
                or any details Angel Express should review.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Additional details..."
                placeholderTextColor={colors.placeholder}
                multiline
                value={details}
                onChangeText={setDetails}
              />
            </View>

            <View style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <ShieldCheck size={20} color={colors.gold} />
                <Text style={styles.noticeTitle}>Important</Text>
              </View>

              <Text style={styles.noticeText}>
                This does not automatically change your booking. Angel Express will
                review your request and contact you if confirmation is needed.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.buttonDisabled]}
              onPress={submitRequest}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backTripsButton}
              onPress={() => router.push("/my-trips" as any)}
            >
              <Text style={styles.backTripsText}>Back to My Trips</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
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
      marginBottom: 8,
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

    heroCard: {
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      gap: 14,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      color: c.navy,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 4,
    },
    heroText: {
      color: c.navy,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
      opacity: 0.82,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
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
      fontSize: 21,
      fontWeight: "900",
      flex: 1,
    },

    option: {
      minHeight: 78,
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 18,
      padding: 14,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    selectedOption: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    optionIconActive: {
      backgroundColor: "rgba(255,255,255,0.28)",
      borderColor: "rgba(255,255,255,0.32)",
    },
    optionTextBox: {
      flex: 1,
    },
    optionTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 4,
    },
    optionTitleActive: {
      color: c.navy,
    },
    optionSubtitle: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },
    optionSubtitleActive: {
      color: c.navy,
      opacity: 0.78,
    },
    optionArrow: {
      color: c.gold,
      fontSize: 32,
      fontWeight: "300",
      marginTop: -2,
    },
    optionArrowActive: {
      color: c.navy,
    },

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
      minHeight: 128,
      borderWidth: 1,
      borderColor: c.borderSoft,
      textAlignVertical: "top",
      fontSize: 16,
      fontWeight: "700",
    },

    noticeCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    noticeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 8,
    },
    noticeTitle: {
      color: c.gold,
      fontSize: 19,
      fontWeight: "900",
    },
    noticeText: {
      color: c.text2,
      fontSize: 14.5,
      lineHeight: 22,
      fontWeight: "700",
    },

    submitButton: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      ...v5Shadow(c),
    },
    submitButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    backTripsButton: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      backgroundColor: c.card,
    },
    backTripsText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}