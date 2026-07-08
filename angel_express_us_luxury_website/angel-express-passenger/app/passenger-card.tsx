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
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  BadgeCheck,
  CarFront,
  FileText,
  Headphones,
  Luggage,
  MapPinned,
  MessageCircle,
  Music,
  Phone,
  ShieldCheck,
  Snowflake,
  Star,
  UserRound,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

const DRIVER_WHATSAPP = "19728367910";

export default function PassengerCardScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [ratingSummary, setRatingSummary] = useState<any>(null);

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
      loadPassengerCardData();
    }, [])
  );

  async function loadPassengerCardData() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const userEmail = user.email?.trim().toLowerCase() || "";

      const { data: profileData, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setProfile(profileData);

      const { data: summaryByUser } = await supabase
        .from("passenger_rating_summary")
        .select("*")
        .eq("passenger_user_id", user.id)
        .maybeSingle();

      if (summaryByUser) {
        setRatingSummary(summaryByUser);
      } else if (userEmail) {
        const { data: summaryByEmail } = await supabase
          .from("passenger_rating_summary")
          .select("*")
          .ilike("passenger_email", userEmail)
          .maybeSingle();

        setRatingSummary(summaryByEmail || null);
      } else {
        setRatingSummary(null);
      }

      const { data: tripData, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .in("status", [
          "Confirmed",
          "In Progress",
          "Driver Assigned",
          "confirmed",
          "in_progress",
          "assigned",
          "driver_arrived",
          "driver_assigned",
        ])
        .order("created_at", { ascending: false });

      if (tripsError) throw tripsError;

      setTrips(tripData || []);
    } catch (error: any) {
      Alert.alert("Passenger Card Error", error.message || "Could not load card.");
    } finally {
      setLoading(false);
    }
  }

  function getLiveRating() {
    return Number(ratingSummary?.average_rating || profile?.rating || 5).toFixed(1);
  }

  function getReviewCount() {
    return Number(ratingSummary?.total_reviews || 0);
  }

  function sendToDriver(trip: any) {
    const passengerName =
      trip.passenger_name ||
      trip.name ||
      `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

    const studentVerified =
      Boolean(profile?.student_verified) ||
      Boolean(profile?.student_status) ||
      Boolean(trip.student_verified);

    const message = `ANGEL EXPRESS PASSENGER CARD

Passenger: ${passengerName || "N/A"}
Phone: ${profile?.phone || trip.phone || "N/A"}
Email: ${profile?.email || trip.email || "N/A"}

Pickup: ${trip.pickup_address || trip.pickup || "N/A"}
Drop-off: ${trip.dropoff_address || trip.dropoff || "N/A"}

Date: ${trip.ride_date || trip.date || "N/A"}
Time: ${trip.ride_time || trip.time || "N/A"}
Invoice: ${trip.invoice_no || "N/A"}
Status: ${trip.status || "N/A"}

Passenger Profile:
Trips: ${profile?.total_trips || "0"}
Rating: ${getLiveRating()}
Driver Reviews: ${getReviewCount()}
Student Verified: ${studentVerified ? "Yes" : "No"}
Luggage Count: ${trip.luggage_count || "0"}

Preferences:
Preferred Route: ${profile?.preferred_route || "N/A"}
Luggage Preference: ${profile?.luggage_preference || "N/A"}
Music: ${profile?.music_preference || "N/A"}
AC: ${profile?.ac_preference || "N/A"}
Conversation: ${profile?.conversation_preference || "N/A"}

Emergency Contact:
${profile?.emergency_name && profile?.emergency_phone ? "Added" : "Not Added"}

Notes:
${trip.notes || "No notes added."}`;

    const url = `https://wa.me/${DRIVER_WHATSAPP}?text=${encodeURIComponent(message)}`;

    Linking.openURL(url);
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading Passenger Card...</Text>
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
            <Text style={styles.kicker}>DRIVER-READY PROFILE</Text>
            <Text style={styles.title}>Passenger Card</Text>

            <Text style={styles.subtitle}>
              A professional ride profile that helps your chauffeur prepare for
              pickup, preferences, luggage, safety, and service quality.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <UserRound size={31} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroLabel}>Prepared Ride Experience</Text>
                <Text style={styles.heroRating}>⭐ {getLiveRating()}</Text>
                <Text style={styles.heroText}>
                  {getReviewCount()} chauffeur review{getReviewCount() === 1 ? "" : "s"} • Live passenger rating
                </Text>
              </View>
            </View>

            {trips.length === 0 ? (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <CarFront size={22} color={colors.gold} />
                  <Text style={styles.cardTitle}>No Confirmed Ride</Text>
                </View>

                <Text style={styles.text}>
                  Passenger Card will appear when a ride is confirmed, assigned, or in progress.
                </Text>

                <TouchableOpacity
                  style={styles.goldButton}
                  onPress={() => router.push("/my-trips" as any)}
                >
                  <Text style={styles.goldButtonText}>View My Trips</Text>
                </TouchableOpacity>
              </View>
            ) : (
              trips.map((trip) => {
                const passengerName =
                  trip.passenger_name ||
                  trip.name ||
                  `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
                  "Passenger";

                const studentVerified =
                  Boolean(profile?.student_verified) ||
                  Boolean(profile?.student_status) ||
                  Boolean(trip.student_verified);

                return (
                  <View key={String(trip.id)} style={styles.card}>
                    <View style={styles.passengerHeader}>
                      <View style={styles.avatar}>
                        <UserRound size={27} color={colors.gold} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.passengerName}>{passengerName}</Text>
                        <Text style={styles.passengerSub}>
                          {trip.status || "Confirmed"} • {trip.invoice_no || "No invoice"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.badgeRow}>
                      <Badge
                        icon={<Star size={15} color={colors.gold} />}
                        text={`${getLiveRating()} Rating • ${getReviewCount()} Review${getReviewCount() === 1 ? "" : "s"}`}
                        styles={styles}
                      />
                      <Badge
                        icon={<CarFront size={15} color={colors.gold} />}
                        text={`${profile?.total_trips || 0} Trips`}
                        styles={styles}
                      />
                      <Badge
                        icon={<BadgeCheck size={15} color={colors.gold} />}
                        text={studentVerified ? "Verified Student" : "Standard Passenger"}
                        styles={styles}
                      />
                    </View>

                    <SectionTitle title="Trip Details" styles={styles} />

                    <InfoLine
                      icon={<MapPinned size={18} color={colors.gold} />}
                      label="Pickup"
                      value={trip.pickup_address || trip.pickup || "N/A"}
                      styles={styles}
                    />

                    <InfoLine
                      icon={<MapPinned size={18} color={colors.gold} />}
                      label="Drop-off"
                      value={trip.dropoff_address || trip.dropoff || "N/A"}
                      styles={styles}
                    />

                    <InfoLine
                      icon={<FileText size={18} color={colors.gold} />}
                      label="Date & Time"
                      value={`${trip.ride_date || trip.date || "N/A"} • ${
                        trip.ride_time || trip.time || "N/A"
                      }`}
                      styles={styles}
                    />

                    <SectionTitle title="Passenger Details" styles={styles} />

                    <InfoLine
                      icon={<Phone size={18} color={colors.gold} />}
                      label="Phone"
                      value={profile?.phone || trip.phone || "N/A"}
                      styles={styles}
                    />

                    <InfoLine
                      icon={<Luggage size={18} color={colors.gold} />}
                      label="Luggage"
                      value={`${trip.luggage_count || 0} item(s)`}
                      styles={styles}
                    />

                    <InfoLine
                      icon={<ShieldCheck size={18} color={colors.gold} />}
                      label="Emergency Contact"
                      value={
                        profile?.emergency_name && profile?.emergency_phone
                          ? "Added"
                          : "Not Added"
                      }
                      styles={styles}
                    />

                    <SectionTitle title="Ride Preferences" styles={styles} />

                    <PreferenceGrid
                      styles={styles}
                      items={[
                        {
                          icon: <MapPinned size={17} color={colors.gold} />,
                          label: "Route",
                          value: profile?.preferred_route || "N/A",
                        },
                        {
                          icon: <Luggage size={17} color={colors.gold} />,
                          label: "Luggage",
                          value: profile?.luggage_preference || "N/A",
                        },
                        {
                          icon: <Music size={17} color={colors.gold} />,
                          label: "Music",
                          value: profile?.music_preference || "N/A",
                        },
                        {
                          icon: <Snowflake size={17} color={colors.gold} />,
                          label: "AC",
                          value: profile?.ac_preference || "N/A",
                        },
                        {
                          icon: <MessageCircle size={17} color={colors.gold} />,
                          label: "Conversation",
                          value: profile?.conversation_preference || "N/A",
                        },
                        {
                          icon: <FileText size={17} color={colors.gold} />,
                          label: "Notes",
                          value: trip.notes || "No notes",
                        },
                      ]}
                    />

                    <View style={styles.noticeBox}>
                      <ShieldCheck size={18} color={colors.gold} />
                      <Text style={styles.noticeText}>
                        Driver sees ride-relevant details only. Emergency contact details
                        stay protected unless needed for safety.
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.goldButton}
                      onPress={() => sendToDriver(trip)}
                    >
                      <Text style={styles.goldButtonText}>Send Card to Driver</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={() => router.push("/profile" as any)}
                    >
                      <Text style={styles.outlineButtonText}>
                        Edit Profile Preferences
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => router.push("/support" as any)}
            >
              <Headphones size={18} color={colors.gold} />
              <Text style={styles.supportText}>Get Support</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function SectionTitle({ title, styles }: { title: string; styles: any }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Badge({
  icon,
  text,
  styles,
}: {
  icon: React.ReactNode;
  text: string;
  styles: any;
}) {
  return (
    <View style={styles.badge}>
      {icon}
      <Text style={styles.badgeText}>{text}</Text>
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
    <View style={styles.infoLine}>
      <View style={styles.infoIcon}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function PreferenceGrid({
  items,
  styles,
}: {
  items: { icon: React.ReactNode; label: string; value: string }[];
  styles: any;
}) {
  return (
    <View style={styles.preferenceGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.preferenceCard}>
          <View style={styles.preferenceIcon}>{item.icon}</View>
          <Text style={styles.preferenceLabel}>{item.label}</Text>
          <Text style={styles.preferenceValue}>{item.value}</Text>
        </View>
      ))}
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
    center: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: { color: c.text, marginTop: 12, fontWeight: "800" },
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
    heroLabel: { color: c.navy, fontSize: 16, fontWeight: "900" },
    heroRating: {
      color: c.navy,
      fontSize: 34,
      fontWeight: "900",
      marginTop: 2,
    },
    heroText: {
      color: c.navy,
      fontSize: 13.5,
      lineHeight: 19,
      fontWeight: "800",
      opacity: 0.82,
    },
    card: {
      backgroundColor: c.card,
      padding: 20,
      marginBottom: 18,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      ...v5Shadow(c),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: { color: c.gold, fontSize: 22, fontWeight: "900", flex: 1 },
    text: { color: c.text, fontSize: 16, lineHeight: 24 },
    passengerHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 16,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    passengerName: { color: c.text, fontSize: 24, fontWeight: "900" },
    passengerSub: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 4,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 18,
    },
    badge: {
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    badgeText: { color: c.gold, fontSize: 12, fontWeight: "900" },
    sectionTitle: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 12,
      marginBottom: 14,
    },
    infoLine: {
      flexDirection: "row",
      gap: 11,
      alignItems: "flex-start",
      marginBottom: 14,
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
    infoValue: { color: c.text, fontSize: 15.5, lineHeight: 22 },
    preferenceGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    preferenceCard: {
      width: "48%",
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card2,
      padding: 12,
    },
    preferenceIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 9,
    },
    preferenceLabel: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    preferenceValue: { color: c.text, fontSize: 13.5, lineHeight: 19 },
    noticeBox: {
      flexDirection: "row",
      gap: 9,
      padding: 14,
      borderRadius: 16,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 18,
      marginBottom: 16,
    },
    noticeText: {
      color: c.gold,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "700",
      flex: 1,
    },
    goldButton: {
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    goldButtonText: { color: c.navy, fontSize: 15, fontWeight: "900" },
    outlineButton: {
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      backgroundColor: c.card,
    },
    outlineButtonText: { color: c.gold, fontSize: 15, fontWeight: "900" },
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
    supportText: { color: c.gold, fontSize: 15, fontWeight: "900" },
  });
}