import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ArrowLeft,
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
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

export default function FamilyCheckInScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);

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
        <ActivityIndicator color={colors.gold} size="large" />
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
            <Text style={styles.kicker}>FAMILY SAFETY CHECK-IN</Text>

            <Text style={styles.title}>Family Check-In+</Text>

            <Text style={styles.subtitle}>
              Send professional safety updates to your trusted emergency contact
              by WhatsApp, SMS, or Email during your Angel Express ride.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <HeartHandshake size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Keep Family Updated</Text>
                <Text style={styles.heroText}>
                  One tap to share picked up, halfway, and arrived safely updates.
                </Text>
              </View>
            </View>

            <View style={styles.featureGrid}>
              <Feature
                icon={<MessageCircle size={18} color={colors.gold} />}
                title="WhatsApp"
                styles={styles}
              />
              <Feature
                icon={<Phone size={18} color={colors.gold} />}
                title="SMS"
                styles={styles}
              />
              <Feature
                icon={<Mail size={18} color={colors.gold} />}
                title="Email"
                styles={styles}
              />
            </View>

            <View style={styles.contactBox}>
              <View style={styles.cardHeader}>
                <UserRound size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Emergency Contact</Text>
              </View>

              <Info label="Name" value={profile?.emergencyName || "Not added"} styles={styles} />
              <Info label="Phone" value={profile?.emergencyPhone || "Not added"} styles={styles} />
              <Info label="Email" value={profile?.emergencyEmail || "Not added"} styles={styles} />

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => router.push("/profile" as any)}
                activeOpacity={0.88}
              >
                <Text style={styles.outlineButtonText}>Edit Emergency Contact</Text>
              </TouchableOpacity>
            </View>

            {activeTrip ? (
              <View style={styles.tripBox}>
                <View style={styles.cardHeader}>
                  <MapPinned size={22} color={colors.gold} />
                  <Text style={styles.cardTitle}>Active Trip</Text>
                </View>

                <Info
                  label="Pickup"
                  value={activeTrip.pickup_address || activeTrip.pickup || "N/A"}
                  styles={styles}
                />
                <Info
                  label="Drop-off"
                  value={activeTrip.dropoff_address || activeTrip.dropoff || "N/A"}
                  styles={styles}
                />
                <Info label="Invoice" value={activeTrip.invoice_no || "N/A"} styles={styles} />
              </View>
            ) : (
              <View style={styles.tripBox}>
                <View style={styles.cardHeader}>
                  <ShieldCheck size={22} color={colors.gold} />
                  <Text style={styles.cardTitle}>No Active Trip</Text>
                </View>

                <Text style={styles.text}>
                  You can still send a family check-in message, but live trip
                  details will appear when your ride is in progress.
                </Text>
              </View>
            )}

            <CheckInButton
              title="Passenger Picked Up"
              text="Let your family know the Angel Express ride has started safely."
              onPress={() => sendAll("picked_up")}
              styles={styles}
              colors={colors}
            />

            <CheckInButton
              title="Halfway To Destination"
              text="Send a mid-trip safety update to your trusted contact."
              onPress={() => sendAll("halfway")}
              styles={styles}
              colors={colors}
            />

            <CheckInButton
              title="Arrived Safely"
              text="Let your family know you arrived safely."
              onPress={() => sendAll("arrived")}
              styles={styles}
              colors={colors}
            />

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => router.push("/support" as any)}
              activeOpacity={0.88}
            >
              <ShieldCheck size={18} color={colors.gold} />
              <Text style={styles.supportText}>Get Support</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Feature({
  icon,
  title,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  styles: any;
}) {
  return (
    <View style={styles.featureCard}>
      {icon}
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

function Info({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
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
  styles,
  colors,
}: {
  title: string;
  text: string;
  onPress: () => void;
  styles: any;
  colors: any;
}) {
  return (
    <Pressable style={styles.checkCard} onPress={onPress}>
      <View style={styles.checkIconBox}>
        <CheckCircle2 size={24} color={colors.gold} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.checkTitle}>{title}</Text>
        <Text style={styles.checkText}>{text}</Text>
        <Text style={styles.checkAction}>Send Update →</Text>
      </View>
    </Pressable>
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
      ...v5Shadow(c),
    },
    featureText: {
      color: c.text,
      fontSize: 12,
      fontWeight: "900",
    },

    contactBox: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    tripBox: {
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

    infoRow: {
      marginBottom: 14,
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
      fontSize: 16,
      lineHeight: 23,
      fontWeight: "700",
    },
    text: {
      color: c.text,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "700",
    },

    outlineButton: {
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    checkCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.borderSoft,
      flexDirection: "row",
      gap: 14,
      ...v5Shadow(c),
    },
    checkIconBox: {
      width: 48,
      height: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
    },
    checkTitle: {
      color: c.gold,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 7,
    },
    checkText: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 12,
      fontWeight: "700",
    },
    checkAction: {
      color: c.text,
      fontSize: 15,
      fontWeight: "900",
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
      marginTop: 4,
    },
    supportText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },
  });
}