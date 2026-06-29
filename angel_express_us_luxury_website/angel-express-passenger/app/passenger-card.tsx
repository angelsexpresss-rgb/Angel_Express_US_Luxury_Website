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
  TouchableOpacity,
  View,
} from "react-native";
import {
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

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;
const DRIVER_WHATSAPP = "19728367910";

export default function PassengerCardScreen() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
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

      const userEmail = user.email?.trim().toLowerCase();

      const { data: profileData, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setProfile(profileData);

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
Rating: ${profile?.rating || "5.0"}
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

    const url = `https://wa.me/${DRIVER_WHATSAPP}?text=${encodeURIComponent(
      message
    )}`;

    Linking.openURL(url);
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} size="large" />
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
              <Text style={styles.kickerText}>A  DRIVER-READY PROFILE</Text>
            </View>

            <Text style={styles.title}>Passenger Card</Text>

            <Text style={styles.subtitle}>
              A professional ride profile that helps your chauffeur prepare for
              pickup, preferences, luggage, safety, and service quality.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <UserRound size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Prepared Ride Experience</Text>
                <Text style={styles.heroText}>
                  Share key ride details and preferences with your assigned chauffeur.
                </Text>
              </View>
            </AngelCard>

            {trips.length === 0 ? (
              <AngelCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <CarFront size={22} color={GOLD} />
                  <Text style={styles.cardTitle}>No Confirmed Ride</Text>
                </View>

                <Text style={styles.text}>
                  Passenger Card will appear when a ride is confirmed, assigned, or in progress.
                </Text>

                <AngelHeroButton
                  title="View My Trips"
                  onPress={() => router.push("/my-trips" as any)}
                  variant="outline"
                  style={styles.actionButton}
                />
              </AngelCard>
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
                  <AngelCard key={String(trip.id)} style={styles.card}>
                    <View style={styles.passengerHeader}>
                      <View style={styles.avatar}>
                        <UserRound size={26} color={GOLD} />
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
                        icon={<Star size={15} color={GOLD} />}
                        text={`${profile?.rating || "5.0"} Rating`}
                      />
                      <Badge
                        icon={<CarFront size={15} color={GOLD} />}
                        text={`${profile?.total_trips || 0} Trips`}
                      />
                      <Badge
                        icon={<BadgeCheck size={15} color={GOLD} />}
                        text={studentVerified ? "Verified Student" : "Standard Passenger"}
                      />
                    </View>

                    <SectionTitle title="Trip Details" />

                    <InfoLine
                      icon={<MapPinned size={18} color={GOLD} />}
                      label="Pickup"
                      value={trip.pickup_address || trip.pickup || "N/A"}
                    />

                    <InfoLine
                      icon={<MapPinned size={18} color={GOLD} />}
                      label="Drop-off"
                      value={trip.dropoff_address || trip.dropoff || "N/A"}
                    />

                    <InfoLine
                      icon={<FileText size={18} color={GOLD} />}
                      label="Date & Time"
                      value={`${trip.ride_date || trip.date || "N/A"} • ${
                        trip.ride_time || trip.time || "N/A"
                      }`}
                    />

                    <SectionTitle title="Passenger Details" />

                    <InfoLine
                      icon={<Phone size={18} color={GOLD} />}
                      label="Phone"
                      value={profile?.phone || trip.phone || "N/A"}
                    />

                    <InfoLine
                      icon={<Luggage size={18} color={GOLD} />}
                      label="Luggage"
                      value={`${trip.luggage_count || 0} item(s)`}
                    />

                    <InfoLine
                      icon={<ShieldCheck size={18} color={GOLD} />}
                      label="Emergency Contact"
                      value={
                        profile?.emergency_name && profile?.emergency_phone
                          ? "Added"
                          : "Not Added"
                      }
                    />

                    <SectionTitle title="Ride Preferences" />

                    <PreferenceGrid
                      items={[
                        {
                          icon: <MapPinned size={17} color={GOLD} />,
                          label: "Route",
                          value: profile?.preferred_route || "N/A",
                        },
                        {
                          icon: <Luggage size={17} color={GOLD} />,
                          label: "Luggage",
                          value: profile?.luggage_preference || "N/A",
                        },
                        {
                          icon: <Music size={17} color={GOLD} />,
                          label: "Music",
                          value: profile?.music_preference || "N/A",
                        },
                        {
                          icon: <Snowflake size={17} color={GOLD} />,
                          label: "AC",
                          value: profile?.ac_preference || "N/A",
                        },
                        {
                          icon: <MessageCircle size={17} color={GOLD} />,
                          label: "Conversation",
                          value: profile?.conversation_preference || "N/A",
                        },
                        {
                          icon: <FileText size={17} color={GOLD} />,
                          label: "Notes",
                          value: trip.notes || "No notes",
                        },
                      ]}
                    />

                    <View style={styles.noticeBox}>
                      <ShieldCheck size={18} color={GOLD} />
                      <Text style={styles.noticeText}>
                        Driver sees ride-relevant details only. Emergency contact details
                        stay protected unless needed for safety.
                      </Text>
                    </View>

                    <AngelHeroButton
                      title="Send Card to Driver"
                      onPress={() => sendToDriver(trip)}
                      variant="gold"
                      style={styles.actionButton}
                    />

                    <AngelHeroButton
                      title="Edit Profile Preferences"
                      onPress={() => router.push("/profile" as any)}
                      variant="outline"
                      style={styles.secondaryAction}
                    />
                  </AngelCard>
                );
              })
            )}

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => router.push("/support" as any)}
            >
              <Headphones size={18} color={GOLD} />
              <Text style={styles.supportText}>Get Support</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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
}: {
  items: { icon: React.ReactNode; label: string; value: string }[];
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
  },

  loadingText: {
    color: AE_COLORS.white,
    marginTop: 12,
  },

  backButton: { alignSelf: "flex-start", marginBottom: 18 },

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
    borderColor: "rgba(212,175,55,0.42)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  passengerName: {
    color: AE_COLORS.white,
    fontSize: 24,
    fontWeight: "900",
  },

  passengerSub: {
    color: GOLD,
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
    borderColor: "rgba(212,175,55,0.28)",
    backgroundColor: "rgba(212,175,55,0.08)",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  badgeText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
  },

  sectionTitle: {
    color: GOLD,
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

  preferenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  preferenceCard: {
    width: "48%",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.16)",
    backgroundColor: "rgba(255,255,255,0.055)",
    padding: 12,
  },

  preferenceIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.32)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  preferenceLabel: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  preferenceValue: {
    color: AE_COLORS.white,
    fontSize: 13.5,
    lineHeight: 19,
  },

  noticeBox: {
    flexDirection: "row",
    gap: 9,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    marginTop: 18,
    marginBottom: 16,
  },

  noticeText: {
    color: GOLD,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "700",
    flex: 1,
  },

  actionButton: {
    marginTop: 4,
  },

  secondaryAction: {
    marginTop: 14,
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