import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CheckCircle2,
  HeartHandshake,
  Mail,
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

export default function FamilyCheckInScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFamilyCheckIn();
    }, [])
  );

  async function loadFamilyCheckIn() {
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
        .select(`
          first_name,
          last_name,
          email,
          phone,
          emergency_name,
          emergency_phone,
          emergency_contact_email
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const normalizedProfile = {
        ...profileData,
        emergencyName: profileData?.emergency_name || "",
        emergencyPhone: profileData?.emergency_phone || "",
        emergencyEmail: profileData?.emergency_contact_email || "",
      };

      setProfile(normalizedProfile);

      const { data: trips, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .in("status", ["In Progress", "in_progress", "driver_arrived"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (tripsError) throw tripsError;

      setActiveTrip(trips?.[0] || null);
    } catch (error: any) {
      Alert.alert(
        "Family Check-In Error",
        error.message || "Could not load family check-in."
      );
    } finally {
      setLoading(false);
    }
  }

  function buildMessage(type: string) {
    const passengerName = `${profile?.first_name || ""} ${
      profile?.last_name || ""
    }`.trim();

    const tripBlock = activeTrip
      ? `

Trip Details:
Pickup: ${activeTrip.pickup_address || activeTrip.pickup || "N/A"}
Drop-off: ${activeTrip.dropoff_address || activeTrip.dropoff || "N/A"}
Invoice: ${activeTrip.invoice_no || "N/A"}
Live Link: https://angelexpressus.com/live-trip/${
          activeTrip.invoice_no || activeTrip.id
        }`
      : "";

    if (type === "picked_up") {
      return `Angel Express Family Check-In

${passengerName || "Your loved one"} has been picked up safely.

The Angel Express ride has started.${tripBlock}

Safe. Reliable. Professional.`;
    }

    if (type === "halfway") {
      return `Angel Express Family Check-In

${passengerName || "Your loved one"} is halfway to the destination.

The trip is continuing safely.${tripBlock}

Safe. Reliable. Professional.`;
    }

    if (type === "arrived") {
      return `Angel Express Family Check-In

${passengerName || "Your loved one"} has arrived safely.

Thank you for trusting Angel Express.${tripBlock}

Safe. Reliable. Professional.`;
    }

    return `Angel Express Family Check-In

${passengerName || "Your loved one"} is sharing a safety update from Angel Express.${tripBlock}

Safe. Reliable. Professional.`;
  }

  async function saveCheckInLog(type: string, method: string) {
    try {
      if (!activeTrip?.id) return;

      await supabase.from("family_checkins").insert({
        booking_id: activeTrip.id,
        invoice_no: activeTrip.invoice_no || null,
        checkin_type: type,
        method,
        emergency_contact_name: profile?.emergencyName || null,
        emergency_contact_phone: profile?.emergencyPhone || null,
        emergency_contact_email: profile?.emergencyEmail || null,
        sent_at: new Date().toISOString(),
      });
    } catch {
      console.log("Family check-in log skipped.");
    }
  }

  async function sendWhatsApp(type: string) {
    const phone = String(profile?.emergencyPhone || "").replace(/[^\d]/g, "");

    if (!phone) {
      Alert.alert(
        "Missing Phone",
        "Please add an emergency contact phone number in your profile."
      );
      return;
    }

    await saveCheckInLog(type, "whatsapp");

    const message = buildMessage(type);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    await Linking.openURL(url);
  }

  async function sendSMS(type: string) {
    const phone = String(profile?.emergencyPhone || "").replace(/[^\d+]/g, "");

    if (!phone) {
      Alert.alert(
        "Missing Phone",
        "Please add an emergency contact phone number in your profile."
      );
      return;
    }

    await saveCheckInLog(type, "sms");

    const message = buildMessage(type);
    const url = `sms:${phone}?body=${encodeURIComponent(message)}`;

    await Linking.openURL(url);
  }

  async function sendEmail(type: string) {
    const email = profile?.emergencyEmail;

    if (!email) {
      Alert.alert(
        "Missing Email",
        "Please add an emergency contact email in your profile."
      );
      return;
    }

    await saveCheckInLog(type, "email");

    const message = buildMessage(type);
    const subject = "Angel Express Family Check-In";
    const url = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message)}`;

    await Linking.openURL(url);
  }

  function sendAll(type: string) {
    Alert.alert(
      "Send Family Check-In",
      "Choose how you want to notify your emergency contact.",
      [
        { text: "WhatsApp", onPress: () => sendWhatsApp(type) },
        { text: "SMS", onPress: () => sendSMS(type) },
        { text: "Email", onPress: () => sendEmail(type) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={styles.loadingText}>Loading Family Check-In...</Text>
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
              <Text style={styles.kickerText}>A  FAMILY SAFETY CHECK-IN</Text>
            </View>

            <Text style={styles.title}>Family Check-In+</Text>

            <Text style={styles.subtitle}>
              Send professional safety updates to your trusted emergency contact
              by WhatsApp, SMS, or Email during your Angel Express ride.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <HeartHandshake size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Keep Family Updated</Text>
                <Text style={styles.heroText}>
                  One tap to share picked up, halfway, and arrived safely updates.
                </Text>
              </View>
            </AngelCard>

            <View style={styles.featureGrid}>
              <Feature icon={<MessageCircle size={18} color={GOLD} />} title="WhatsApp" />
              <Feature icon={<Phone size={18} color={GOLD} />} title="SMS" />
              <Feature icon={<Mail size={18} color={GOLD} />} title="Email" />
            </View>

            <AngelCard style={styles.contactBox}>
              <View style={styles.cardHeader}>
                <UserRound size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Emergency Contact</Text>
              </View>

              <Info label="Name" value={profile?.emergencyName || "Not added"} />
              <Info label="Phone" value={profile?.emergencyPhone || "Not added"} />
              <Info label="Email" value={profile?.emergencyEmail || "Not added"} />

              <AngelHeroButton
                title="Edit Emergency Contact"
                onPress={() => router.push("/profile" as any)}
                variant="outline"
                style={styles.editButton}
              />
            </AngelCard>

            {activeTrip ? (
              <AngelCard style={styles.tripBox}>
                <View style={styles.cardHeader}>
                  <MapPinned size={22} color={GOLD} />
                  <Text style={styles.cardTitle}>Active Trip</Text>
                </View>

                <Info
                  label="Pickup"
                  value={activeTrip.pickup_address || activeTrip.pickup || "N/A"}
                />
                <Info
                  label="Drop-off"
                  value={activeTrip.dropoff_address || activeTrip.dropoff || "N/A"}
                />
                <Info label="Invoice" value={activeTrip.invoice_no || "N/A"} />
              </AngelCard>
            ) : (
              <AngelCard style={styles.tripBox}>
                <View style={styles.cardHeader}>
                  <ShieldCheck size={22} color={GOLD} />
                  <Text style={styles.cardTitle}>No Active Trip</Text>
                </View>

                <Text style={styles.text}>
                  You can still send a family check-in message, but live trip
                  details will appear when your ride is in progress.
                </Text>
              </AngelCard>
            )}

            <CheckInButton
              title="Passenger Picked Up"
              text="Let your family know the Angel Express ride has started safely."
              onPress={() => sendAll("picked_up")}
            />

            <CheckInButton
              title="Halfway To Destination"
              text="Send a mid-trip safety update to your trusted contact."
              onPress={() => sendAll("halfway")}
            />

            <CheckInButton
              title="Arrived Safely"
              text="Let your family know you arrived safely."
              onPress={() => sendAll("arrived")}
            />

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => router.push("/support" as any)}
            >
              <ShieldCheck size={18} color={GOLD} />
              <Text style={styles.supportText}>Get Support</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.featureCard}>
      {icon}
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function CheckInButton({
  title,
  text,
  onPress,
}: {
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.checkCard} onPress={onPress}>
      <View style={styles.checkIconBox}>
        <CheckCircle2 size={24} color={GOLD} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.checkTitle}>{title}</Text>
        <Text style={styles.checkText}>{text}</Text>
        <Text style={styles.checkAction}>Send Update →</Text>
      </View>
    </Pressable>
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
  },

  featureText: {
    color: AE_COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },

  contactBox: {
    padding: 20,
    marginBottom: 18,
  },

  tripBox: {
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

  infoRow: {
    marginBottom: 14,
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
    fontSize: 16,
    lineHeight: 23,
  },

  text: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 24,
  },

  editButton: {
    marginTop: 10,
  },

  checkCard: {
    backgroundColor: "rgba(13,20,34,0.86)",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.24)",
    flexDirection: "row",
    gap: 14,
  },

  checkIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.42)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,175,55,0.08)",
  },

  checkTitle: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 7,
  },

  checkText: {
    color: AE_COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },

  checkAction: {
    color: AE_COLORS.white,
    fontSize: 15,
    fontWeight: "900",
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
    marginTop: 4,
  },

  supportText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "900",
  },
});