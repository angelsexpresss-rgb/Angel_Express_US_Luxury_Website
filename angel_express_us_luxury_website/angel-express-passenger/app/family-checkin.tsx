import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  BadgeCheck,
  BellRing,
  CarFront,
  CheckCircle2,
  Clock3,
  Copy,
  HeartHandshake,
  Mail,
  MapPinned,
  MessageCircle,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Siren,
  UserRound,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const SUPPORT_PHONE = "19728367910";

const ACTIVE_STATUSES = [
  "Pending",
  "Confirmed",
  "Driver Assigned",
  "Arrived at Pickup",
  "Picked Up",
  "In Progress",
  "pending_assignment",
  "assigned",
  "accepted",
  "confirmed",
  "driver_en_route",
  "en_route",
  "driver_arrived",
  "picked_up",
  "passenger_onboard",
  "in_progress",
];

export default function FamilyCheckInScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);
  const [connectionState, setConnectionState] =
    useState<"connecting" | "online" | "offline">("connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

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

  useEffect(() => {
    if (!activeTrip?.id) {
      setConnectionState("offline");
      return;
    }

    setConnectionState("connecting");

    const bookingChannel = supabase
      .channel(`family-checkin-booking-${activeTrip.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${activeTrip.id}`,
        },
        (payload) => {
          if (payload.new) {
            setActiveTrip((current: any) => ({
              ...current,
              ...(payload.new as any),
            }));
            setLastUpdatedAt(new Date());
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionState("online");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionState("offline");
        }
      });

    const checkInChannel = supabase
      .channel(`family-checkin-log-${activeTrip.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_checkins",
          filter: `booking_id=eq.${activeTrip.id}`,
        },
        () => loadCheckInHistory(activeTrip.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(checkInChannel);
    };
  }, [activeTrip?.id]);

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
          emergency_contact_email,
          emergency_relationship
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const normalizedProfile = {
        ...profileData,
        emergencyName: profileData?.emergency_name || "",
        emergencyPhone: profileData?.emergency_phone || "",
        emergencyEmail: profileData?.emergency_contact_email || "",
        emergencyRelationship:
          profileData?.emergency_relationship || "Primary Emergency Contact",
      };

      setProfile(normalizedProfile);

      const { data: trips, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1);

      if (tripsError) throw tripsError;

      const currentTrip = trips?.[0] || null;
      setActiveTrip(currentTrip);

      if (currentTrip?.id) {
        await loadCheckInHistory(currentTrip.id);
      } else {
        setCheckInHistory([]);
      }

      setLastUpdatedAt(new Date());
    } catch (error: any) {
      Alert.alert(
        "Family Check-In Error",
        error.message || "Could not load family check-in."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadCheckInHistory(bookingId: any) {
    try {
      const { data, error } = await supabase
        .from("family_checkins")
        .select("*")
        .eq("booking_id", bookingId)
        .order("sent_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setCheckInHistory(data || []);
    } catch (error) {
      console.log("Family check-in history unavailable:", error);
    }
  }

  function trackingLink() {
    if (!activeTrip) return "https://angelexpressus.com";

    return `https://angelexpressus.com/live-trip/${
      activeTrip.invoice_no ||
      activeTrip.invoice_number ||
      activeTrip.id
    }`;
  }

  function buildMessage(type: string) {
    const passengerName = `${profile?.first_name || ""} ${
      profile?.last_name || ""
    }`.trim();

    const driverName =
      activeTrip?.driver_name ||
      activeTrip?.assigned_driver_name ||
      "Driver assignment pending";

    const vehicle =
      activeTrip?.vehicle ||
      activeTrip?.vehicle_type ||
      [activeTrip?.vehicle_make, activeTrip?.vehicle_model]
        .filter(Boolean)
        .join(" ") ||
      "Vehicle details pending";

    const plate =
      activeTrip?.license_plate ||
      activeTrip?.vehicle_plate ||
      activeTrip?.plate_number ||
      "Plate pending";

    const tripBlock = activeTrip
      ? `

Trip Details:
Status: ${formatStatus(activeTrip.status)}
Pickup: ${activeTrip.pickup_address || activeTrip.pickup || "N/A"}
Drop-off: ${activeTrip.dropoff_address || activeTrip.dropoff || "N/A"}
Driver: ${driverName}
Vehicle: ${vehicle}
License Plate: ${plate}
Invoice: ${activeTrip.invoice_no || activeTrip.invoice_number || "N/A"}
Live Link: ${trackingLink()}`
      : "";

    const messages: Record<string, string> = {
      leaving: `${passengerName || "Your loved one"} is preparing to leave for an Angel Express trip.`,
      driver_assigned: `${passengerName || "Your loved one"} now has an assigned Angel Express driver.`,
      driver_arrived: `The Angel Express driver has arrived for ${passengerName || "your loved one"}.`,
      picked_up: `${passengerName || "Your loved one"} has been picked up safely and the ride has started.`,
      halfway: `${passengerName || "Your loved one"} is halfway to the destination.`,
      almost_there: `${passengerName || "Your loved one"} is almost at the destination.`,
      arrived: `${passengerName || "Your loved one"} has arrived safely.`,
    };

    return `Angel Express Family Check-In

${messages[type] || `${passengerName || "Your loved one"} is sharing a safety update.`}${tripBlock}

Angel Express Operations: +1 (972) 836-7910

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
        emergency_contact_relationship:
          profile?.emergencyRelationship || null,
        trip_status: activeTrip?.status || null,
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

  async function sendNative(type: string) {
    await saveCheckInLog(type, "native_share");

    await Share.share({
      title: "Angel Express Family Check-In",
      message: buildMessage(type),
      url: activeTrip ? trackingLink() : undefined,
    });
  }

  async function copyTrackingLink() {
    if (!activeTrip) {
      Alert.alert("No Active Trip", "There is no active trip link to share.");
      return;
    }

    await Share.share({
      title: "Angel Express Live Trip",
      message: trackingLink(),
    });
  }

  function callOperations() {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  }

  function openLiveTrip() {
    if (!activeTrip?.id) {
      Alert.alert("No Active Trip", "There is no active trip to open.");
      return;
    }

    router.push({
      pathname: "/live-trip" as any,
      params: {
        booking_id: activeTrip.id,
        invoice_no:
          activeTrip.invoice_no || activeTrip.invoice_number || "",
      },
    });
  }

  function sendAll(type: string) {
    Alert.alert(
      "Send Family Check-In",
      "Choose how you want to notify your emergency contact.",
      [
        { text: "WhatsApp", onPress: () => sendWhatsApp(type) },
        { text: "SMS", onPress: () => sendSMS(type) },
        { text: "Email", onPress: () => sendEmail(type) },
        { text: "More", onPress: () => sendNative(type) },
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.gold}
              onRefresh={() => {
                setRefreshing(true);
                loadFamilyCheckIn();
              }}
            />
          }
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
                <HeartHandshake size={30} color={colors.onGold || colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Keep Family Updated</Text>
                <Text style={styles.heroText}>
                  One tap to share picked up, halfway, and arrived safely updates.
                </Text>
              </View>
            </View>

            <View style={styles.connectionBanner}>
              {connectionState === "online" ? (
                <Wifi size={18} color={colors.success || "#22C55E"} />
              ) : (
                <WifiOff size={18} color={colors.warning || "#F59E0B"} />
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.connectionTitle}>
                  {connectionState === "online"
                    ? "Realtime family updates connected"
                    : connectionState === "connecting"
                    ? "Connecting to realtime trip updates"
                    : "Realtime trip updates unavailable"}
                </Text>
                <Text style={styles.connectionText}>
                  {lastUpdatedAt
                    ? `Last updated ${lastUpdatedAt.toLocaleTimeString()}`
                    : "Waiting for trip activity"}
                </Text>
              </View>

              <TouchableOpacity onPress={loadFamilyCheckIn}>
                <RefreshCw size={18} color={colors.gold} />
              </TouchableOpacity>
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
              <Info
                label="Relationship"
                value={profile?.emergencyRelationship || "Not added"}
                styles={styles}
              />

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
                  <View style={styles.liveBadge}>
                    <Radio size={13} color={colors.onGold || colors.navy} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                </View>

                <Info
                  label="Status"
                  value={formatStatus(activeTrip.status)}
                  styles={styles}
                />
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
                <Info
                  label="Driver"
                  value={
                    activeTrip.driver_name ||
                    activeTrip.assigned_driver_name ||
                    "Assignment pending"
                  }
                  styles={styles}
                />
                <Info
                  label="Vehicle"
                  value={
                    activeTrip.vehicle ||
                    activeTrip.vehicle_type ||
                    [activeTrip.vehicle_make, activeTrip.vehicle_model]
                      .filter(Boolean)
                      .join(" ") ||
                    "Details pending"
                  }
                  styles={styles}
                />
                <Info
                  label="License Plate"
                  value={
                    activeTrip.license_plate ||
                    activeTrip.vehicle_plate ||
                    activeTrip.plate_number ||
                    "Pending"
                  }
                  styles={styles}
                />
                <Info
                  label="Invoice"
                  value={
                    activeTrip.invoice_no ||
                    activeTrip.invoice_number ||
                    "N/A"
                  }
                  styles={styles}
                />

                <View style={styles.tripActionRow}>
                  <TouchableOpacity
                    style={styles.tripAction}
                    onPress={openLiveTrip}
                  >
                    <Navigation size={18} color={colors.gold} />
                    <Text style={styles.tripActionText}>Live Trip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tripAction}
                    onPress={copyTrackingLink}
                  >
                    <Copy size={18} color={colors.gold} />
                    <Text style={styles.tripActionText}>Share Link</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.tripBox}>
                <View style={styles.cardHeader}>
                  <ShieldCheck size={22} color={colors.gold} />
                  <Text style={styles.cardTitle}>No Active Trip</Text>
                </View>

                <Text style={styles.text}>
                  You can still send a family message. Live driver, vehicle, and
                  tracking details will appear once a trip is active.
                </Text>
              </View>
            )}

            <View style={styles.quickGrid}>
              <QuickAction
                title="Leaving"
                icon={<CarFront size={18} color={colors.gold} />}
                onPress={() => sendAll("leaving")}
                styles={styles}
              />
              <QuickAction
                title="Driver Assigned"
                icon={<BadgeCheck size={18} color={colors.gold} />}
                onPress={() => sendAll("driver_assigned")}
                styles={styles}
              />
              <QuickAction
                title="Driver Arrived"
                icon={<MapPinned size={18} color={colors.gold} />}
                onPress={() => sendAll("driver_arrived")}
                styles={styles}
              />
              <QuickAction
                title="Almost There"
                icon={<Clock3 size={18} color={colors.gold} />}
                onPress={() => sendAll("almost_there")}
                styles={styles}
              />
            </View>

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

            <View style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <BellRing size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Recent Check-Ins</Text>
              </View>

              {checkInHistory.length === 0 ? (
                <Text style={styles.emptyHistory}>
                  No family check-ins have been recorded for this trip yet.
                </Text>
              ) : (
                checkInHistory.map((item) => (
                  <View style={styles.historyRow} key={String(item.id)}>
                    <CheckCircle2 size={17} color={colors.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>
                        {formatStatus(item.checkin_type)} • {formatStatus(item.method)}
                      </Text>
                      <Text style={styles.historyTime}>
                        {item.sent_at
                          ? new Date(item.sent_at).toLocaleString()
                          : "Sent"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.safetyActionRow}>
              <TouchableOpacity
                style={styles.safetyAction}
                onPress={() => router.push("/safety-share" as any)}
              >
                <ShieldAlert size={18} color={colors.gold} />
                <Text style={styles.safetyActionText}>Safety Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.safetyAction}
                onPress={callOperations}
              >
                <Phone size={18} color={colors.gold} />
                <Text style={styles.safetyActionText}>Operations</Text>
              </TouchableOpacity>
            </View>

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

function QuickAction({
  title,
  icon,
  onPress,
  styles,
}: {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
  styles: any;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      {icon}
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );
}

function formatStatus(value: any) {
  if (!value) return "Pending";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
      color: c.text2 || c.textSecondary,
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
      color: c.onGold || c.navy,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.onGold || c.navy,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },


    connectionBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      backgroundColor: c.card,
      padding: 14,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    connectionTitle: {
      color: c.text,
      fontSize: 13.5,
      fontWeight: "900",
    },
    connectionText: {
      color: c.text2 || c.textSecondary,
      fontSize: 11.5,
      fontWeight: "700",
      marginTop: 2,
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
      borderColor: c.borderSoft || c.lightBorder,
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
      borderColor: c.borderSoft || c.lightBorder,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    tripBox: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },


    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.gold,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 9,
    },
    liveBadgeText: {
      color: c.onGold || c.navy,
      fontSize: 10,
      fontWeight: "900",
    },
    tripActionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
    tripAction: {
      flex: 1,
      minHeight: 54,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
    },
    tripActionText: {
      color: c.gold,
      fontSize: 12.5,
      fontWeight: "900",
    },
    quickGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 18,
    },
    quickAction: {
      width: "48%",
      minHeight: 74,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      ...v5Shadow(c),
    },
    quickActionText: {
      color: c.text,
      fontSize: 12.5,
      fontWeight: "900",
      textAlign: "center",
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
      borderColor: c.borderSoft || c.lightBorder,
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
      color: c.text2 || c.textSecondary,
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


    historyCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    emptyHistory: {
      color: c.text2 || c.textSecondary,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "700",
    },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 11,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft || c.lightBorder,
    },
    historyTitle: {
      color: c.text,
      fontSize: 13.5,
      fontWeight: "900",
    },
    historyTime: {
      color: c.text2 || c.textSecondary,
      fontSize: 11.5,
      marginTop: 3,
      fontWeight: "700",
    },
    safetyActionRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    },
    safetyAction: {
      flex: 1,
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    safetyActionText: {
      color: c.gold,
      fontSize: 12.5,
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