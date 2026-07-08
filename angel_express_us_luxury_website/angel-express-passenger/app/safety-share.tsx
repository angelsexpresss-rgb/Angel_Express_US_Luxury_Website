import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  Linking,
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
  CheckCircle2,
  MapPinned,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

export default function SafetyShareScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [relationship, setRelationship] = useState("");

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
      loadSafetyShareData();
    }, [])
  );

  async function loadSafetyShareData() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const userEmail = user.email?.trim().toLowerCase();

      const { data: profile, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("emergency_name, emergency_phone, emergency_relationship")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setContactName(profile?.emergency_name || "");
      setContactPhone(profile?.emergency_phone || "");
      setRelationship(profile?.emergency_relationship || "");

      const { data: trips, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .in("status", ["In Progress", "in_progress", "driver_arrived"])
        .order("created_at", { ascending: false });

      if (tripsError) throw tripsError;

      setActiveTrips(trips || []);
    } catch (error: any) {
      Alert.alert(
        "Safety Share Error",
        error.message || "Could not load active trips."
      );
    } finally {
      setLoading(false);
    }
  }

  async function enableSafetyShare(trip: any) {
    if (!contactName.trim() || !contactPhone.trim() || !relationship.trim()) {
      Alert.alert(
        "Missing Information",
        "Emergency contact name, phone number, and relationship are required."
      );
      return;
    }

    try {
      setSaving(true);

      const trackingLink = `https://angelexpressus.com/live-trip/${
        trip.invoice_no || trip.id
      }`;

      const { error } = await supabase
        .from("bookings")
        .update({
          safety_share_enabled: true,
          emergency_contact_name: contactName.trim(),
          emergency_contact_phone: contactPhone.trim(),
          emergency_contact_relationship: relationship.trim(),
          live_tracking_link: trackingLink,
        })
        .eq("id", trip.id);

      if (error) throw error;

      const message = `Angel Safety Share

${trip.passenger_name || trip.name || "Passenger"} has started an Angel Express trip.

Pickup:
${trip.pickup_address || trip.pickup || "N/A"}

Drop-off:
${trip.dropoff_address || trip.dropoff || "N/A"}

Invoice:
${trip.invoice_no || "N/A"}

Live tracking link:
${trackingLink}

Angel Express Mobility
Safe. Reliable. Professional.`;

      const whatsappUrl = `https://wa.me/${cleanPhone(
        contactPhone
      )}?text=${encodeURIComponent(message)}`;

      Alert.alert(
        "Safety Share Enabled",
        "Your emergency contact is ready. Send the live trip link by WhatsApp.",
        [
          {
            text: "Send WhatsApp",
            onPress: () => Linking.openURL(whatsappUrl),
          },
          { text: "OK" },
        ]
      );

      loadSafetyShareData();
    } catch (error: any) {
      Alert.alert(
        "Save Error",
        error.message || "Could not enable Safety Share."
      );
    } finally {
      setSaving(false);
    }
  }

  function cleanPhone(phone: string) {
    return phone.replace(/\D/g, "");
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Checking active trips...</Text>
      </View>
    );
  }

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
            <Text style={styles.kicker}>LIVE SAFETY SHARE</Text>

            <Text style={styles.title}>Angel Safety Share</Text>

            <Text style={styles.subtitle}>
              Share your active Angel Express trip with a trusted emergency contact
              for peace of mind during your ride.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <ShieldCheck size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Ride With Backup</Text>
                <Text style={styles.heroText}>
                  Send pickup, drop-off, invoice, and live trip link to someone you trust.
                </Text>
              </View>
            </View>

            <View style={styles.featureGrid}>
              <SafetyFeature title="Live Link" styles={styles} colors={colors} />
              <SafetyFeature title="Emergency Contact" styles={styles} colors={colors} />
              <SafetyFeature title="WhatsApp Share" styles={styles} colors={colors} />
            </View>

            <View style={styles.contactCard}>
              <View style={styles.cardHeader}>
                <UserRound size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Trusted Contact</Text>
              </View>

              <Text style={styles.label}>Contact Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Emergency contact name"
                placeholderTextColor={colors.placeholder}
                value={contactName}
                onChangeText={setContactName}
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Emergency contact phone"
                placeholderTextColor={colors.placeholder}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Relationship</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mother, Sister, Friend"
                placeholderTextColor={colors.placeholder}
                value={relationship}
                onChangeText={setRelationship}
              />
            </View>

            {activeTrips.length === 0 ? (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <CarFront size={22} color={colors.gold} />
                  <Text style={styles.cardTitle}>No Active Trip</Text>
                </View>

                <Text style={styles.text}>
                  Safety Share will appear here when your ride status becomes In
                  Progress.
                </Text>

                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={() => router.push("/my-trips" as any)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.outlineButtonText}>View My Trips</Text>
                </TouchableOpacity>
              </View>
            ) : (
              activeTrips.map((trip) => (
                <View key={String(trip.id)} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <ShieldCheck size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>Share Active Trip</Text>
                  </View>

                  <InfoLine
                    icon={<MapPinned size={18} color={colors.gold} />}
                    label="Pickup"
                    value={trip.pickup_address || trip.pickup || "Pickup not available"}
                    styles={styles}
                  />

                  <InfoLine
                    icon={<CarFront size={18} color={colors.gold} />}
                    label="Drop-off"
                    value={trip.dropoff_address || trip.dropoff || "Drop-off not available"}
                    styles={styles}
                  />

                  <InfoLine
                    icon={<CheckCircle2 size={18} color={colors.gold} />}
                    label="Invoice"
                    value={trip.invoice_no || "N/A"}
                    styles={styles}
                  />

                  <View style={styles.noticeBox}>
                    <MessageCircle size={18} color={colors.gold} />
                    <Text style={styles.noticeText}>
                      This will open WhatsApp with a prepared safety message for
                      your trusted contact.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.goldButton, saving && styles.disabledButton]}
                    onPress={() => enableSafetyShare(trip)}
                    disabled={saving}
                    activeOpacity={0.88}
                  >
                    {saving ? (
                      <ActivityIndicator color={colors.navy} />
                    ) : (
                      <Text style={styles.goldButtonText}>Enable & Send WhatsApp</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => router.push("/support" as any)}
              activeOpacity={0.88}
            >
              <Phone size={18} color={colors.gold} />
              <Text style={styles.supportText}>Get Support</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function SafetyFeature({
  title,
  styles,
  colors,
}: {
  title: string;
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.featureCard}>
      <ShieldCheck size={18} color={colors.gold} />
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

function InfoLine({
  icon,
  label,
  value,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
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

    center: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    loadingText: {
      color: c.text,
      marginTop: 12,
      fontSize: 16,
      fontWeight: "800",
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
      letterSpacing: -0.7,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },

    heroCard: {
      minHeight: 124,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      color: c.navy,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.navy,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },

    featureGrid: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 18,
    },
    featureCard: {
      flex: 1,
      minHeight: 78,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingHorizontal: 8,
      ...v5Shadow(c),
    },
    featureText: {
      color: c.text,
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
    },

    contactCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
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
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },

    text: {
      color: c.text,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "700",
    },
    label: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    input: {
      backgroundColor: c.input,
      color: c.inputText,
      padding: 17,
      borderRadius: 16,
      fontSize: 16,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.borderSoft,
      fontWeight: "700",
    },

    infoRow: {
      flexDirection: "row",
      gap: 11,
      alignItems: "flex-start",
      marginBottom: 15,
    },
    infoIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    infoLabel: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    infoValue: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 22,
      fontWeight: "700",
    },

    noticeBox: {
      flexDirection: "row",
      gap: 9,
      padding: 14,
      borderRadius: 16,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 4,
      marginBottom: 16,
    },
    noticeText: {
      color: c.gold,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "800",
      flex: 1,
    },

    goldButton: {
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      ...v5Shadow(c),
    },
    goldButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.7,
    },

    outlineButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 18,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    supportButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    supportText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },
  });
}