import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  CarFront,
  CheckCircle2,
  MapPinned,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
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

export default function SafetyShareScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
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
        <ActivityIndicator color={GOLD} size="large" />
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
              <Text style={styles.kickerText}>A  LIVE SAFETY SHARE</Text>
            </View>

            <Text style={styles.title}>Angel Safety Share</Text>

            <Text style={styles.subtitle}>
              Share your active Angel Express trip with a trusted emergency contact
              for peace of mind during your ride.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <ShieldCheck size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Ride With Backup</Text>
                <Text style={styles.heroText}>
                  Send pickup, drop-off, invoice, and live trip link to someone you trust.
                </Text>
              </View>
            </AngelCard>

            <View style={styles.featureGrid}>
              <SafetyFeature title="Live Link" />
              <SafetyFeature title="Emergency Contact" />
              <SafetyFeature title="WhatsApp Share" />
            </View>

            <AngelCard style={styles.contactCard}>
              <View style={styles.cardHeader}>
                <UserRound size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Trusted Contact</Text>
              </View>

              <Text style={styles.label}>Contact Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Emergency contact name"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={contactName}
                onChangeText={setContactName}
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Emergency contact phone"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Relationship</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mother, Sister, Friend"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={relationship}
                onChangeText={setRelationship}
              />
            </AngelCard>

            {activeTrips.length === 0 ? (
              <AngelCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <CarFront size={22} color={GOLD} />
                  <Text style={styles.cardTitle}>No Active Trip</Text>
                </View>

                <Text style={styles.text}>
                  Safety Share will appear here when your ride status becomes In
                  Progress.
                </Text>

                <AngelHeroButton
                  title="View My Trips"
                  onPress={() => router.push("/my-trips" as any)}
                  variant="outline"
                  style={styles.viewTripsButton}
                />
              </AngelCard>
            ) : (
              activeTrips.map((trip) => (
                <AngelCard key={String(trip.id)} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <ShieldCheck size={22} color={GOLD} />
                    <Text style={styles.cardTitle}>Share Active Trip</Text>
                  </View>

                  <InfoLine
                    icon={<MapPinned size={18} color={GOLD} />}
                    label="Pickup"
                    value={trip.pickup_address || trip.pickup || "Pickup not available"}
                  />

                  <InfoLine
                    icon={<CarFront size={18} color={GOLD} />}
                    label="Drop-off"
                    value={trip.dropoff_address || trip.dropoff || "Drop-off not available"}
                  />

                  <InfoLine
                    icon={<CheckCircle2 size={18} color={GOLD} />}
                    label="Invoice"
                    value={trip.invoice_no || "N/A"}
                  />

                  <View style={styles.noticeBox}>
                    <MessageCircle size={18} color={GOLD} />
                    <Text style={styles.noticeText}>
                      This will open WhatsApp with a prepared safety message for
                      your trusted contact.
                    </Text>
                  </View>

                  <AngelHeroButton
                    title={saving ? "Saving..." : "Enable & Send WhatsApp"}
                    onPress={() => enableSafetyShare(trip)}
                    variant="gold"
                    style={saving ? styles.disabledButton : styles.shareButton}
                  />
                </AngelCard>
              ))
            )}

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => router.push("/support" as any)}
            >
              <Phone size={18} color={GOLD} />
              <Text style={styles.supportText}>Get Support</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function SafetyFeature({ title }: { title: string }) {
  return (
    <View style={styles.featureCard}>
      <ShieldCheck size={18} color={GOLD} />
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AE_COLORS.navy, overflow: "hidden" },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(5,11,22,0.91)" },
  container: { flex: 1 },
  content: { padding: 22, paddingTop: 56, paddingBottom: 50 },

  center: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    color: AE_COLORS.white,
    marginTop: 12,
    fontSize: 16,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 18,
  },

  backText: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
  },

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
    letterSpacing: -0.7,
  },

  subtitle: {
    color: AE_COLORS.textSoft,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },

  heroCard: {
    minHeight: 124,
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
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },

  heroText: {
    color: "rgba(6,17,31,0.78)",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
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
    borderColor: "rgba(212,175,55,0.22)",
    backgroundColor: "rgba(13,20,34,0.84)",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 8,
  },

  featureText: {
    color: AE_COLORS.white,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },

  contactCard: {
    padding: 20,
    marginBottom: 18,
  },

  card: {
    padding: 20,
    marginBottom: 18,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  cardTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },

  text: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 24,
  },

  label: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    color: AE_COLORS.white,
    padding: 17,
    borderRadius: 16,
    fontSize: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
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
    borderColor: "rgba(212,175,55,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  infoLabel: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  infoValue: {
    color: AE_COLORS.white,
    fontSize: 15.5,
    lineHeight: 22,
  },

  noticeBox: {
    flexDirection: "row",
    gap: 9,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    marginTop: 4,
    marginBottom: 16,
  },

  noticeText: {
    color: GOLD,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "700",
    flex: 1,
  },

  shareButton: {
    marginTop: 2,
  },

  disabledButton: {
    opacity: 0.7,
    marginTop: 2,
  },

  viewTripsButton: {
    marginTop: 18,
  },

  supportButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  supportText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "900",
  },
});