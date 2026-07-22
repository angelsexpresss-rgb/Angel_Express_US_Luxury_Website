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
  CalendarDays,
  CarFront,
  ChevronRight,
  CircleCheckBig,
  FileText,
  Headphones,
  HeartHandshake,
  Luggage,
  Mail,
  MapPinned,
  MessageCircle,
  Music,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Star,
  UserRound,
  Users,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const DRIVER_WHATSAPP = "19728367910";

export default function PassengerCardScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [ratingSummary, setRatingSummary] = useState<any>(null);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const pageRise = useRef(new Animated.Value(20)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const backgroundLoop = Animated.loop(
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
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.045,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );

    Animated.parallel([
      Animated.timing(pageFade, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(pageRise, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();

    backgroundLoop.start();
    pulseLoop.start();
    glowLoop.start();

    return () => {
      backgroundLoop.stop();
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPassengerCardData();
    }, [])
  );

  async function loadPassengerCardData(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

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

      const orFilters = [`user_id.eq.${user.id}`];

      if (userEmail) {
        orFilters.push(`email.ilike.${userEmail}`);
      }

      const { data: tripData, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(orFilters.join(","))
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
      Alert.alert(
        "Passenger Card Error",
        error?.message || "Could not load your passenger card."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getLiveRating() {
    return Number(ratingSummary?.average_rating || profile?.rating || 5).toFixed(1);
  }

  function getReviewCount() {
    return Number(ratingSummary?.total_reviews || 0);
  }

  function getTotalTrips() {
    return Number(profile?.total_trips || 0);
  }

  function getProfileCompletion() {
    const fields = [
      profile?.first_name,
      profile?.last_name,
      profile?.phone,
      profile?.emergency_name,
      profile?.emergency_phone,
      profile?.music_preference,
      profile?.ac_preference,
      profile?.conversation_preference,
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
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
Trips: ${getTotalTrips()}
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
${
  profile?.emergency_name && profile?.emergency_phone
    ? `${profile.emergency_name} added`
    : "Not Added"
}

Notes:
${trip.notes || "No notes added."}`;

    const url = `https://wa.me/${DRIVER_WHATSAPP}?text=${encodeURIComponent(
      message
    )}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Unable to Open WhatsApp",
        "Please confirm WhatsApp is installed or try again later."
      );
    });
  }

  const glowBorder = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "rgba(212,175,55,0.25)",
      "rgba(212,175,55,0.95)",
    ],
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <View style={styles.loadingIcon}>
            <UserRound size={32} color={colors.navy} />
          </View>
        </Animated.View>

        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingTitle}>Preparing Passenger Card</Text>
        <Text style={styles.loadingText}>
          Loading your ride profile, preferences, and active trips.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}
      >
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.iconPill}
                onPress={() => loadPassengerCardData(true)}
                disabled={refreshing}
                activeOpacity={0.8}
              >
                {refreshing ? (
                  <ActivityIndicator color={colors.gold} size="small" />
                ) : (
                  <RefreshCw size={17} color={colors.gold} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.themePill}
                onPress={toggleTheme}
                activeOpacity={0.8}
              >
                <Text style={styles.themeText}>
                  {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageRise }],
            }}
          >
            <View style={styles.hero}>
              <Animated.View
                style={[styles.heroIconLarge, { transform: [{ scale: pulse }] }]}
              >
                <UserRound size={34} color={colors.navy} />
              </Animated.View>

              <Text style={styles.kicker}>ANGEL EXPRESS PASSENGER PROFILE</Text>
              <Text style={styles.title}>Passenger Card+</Text>

              <Text style={styles.subtitle}>
                Your driver-ready ride profile keeps every chauffeur informed,
                prepared, and aligned with your service preferences.
              </Text>

              <View style={styles.heroPills}>
                <View style={styles.heroPill}>
                  <ShieldCheck size={14} color={colors.gold} />
                  <Text style={styles.heroPillText}>Privacy Protected</Text>
                </View>

                <View style={styles.heroPill}>
                  <CarFront size={14} color={colors.gold} />
                  <Text style={styles.heroPillText}>Driver Ready</Text>
                </View>

                <View style={styles.heroPill}>
                  <Sparkles size={14} color={colors.gold} />
                  <Text style={styles.heroPillText}>Premium Service</Text>
                </View>
              </View>
            </View>

            <Animated.View
              style={[styles.ratingCard, { borderColor: glowBorder }]}
            >
              <View style={styles.ratingTop}>
                <View style={styles.ratingIcon}>
                  <Star size={29} color={colors.navy} fill={colors.navy} />
                </View>

                <View style={styles.ratingCopy}>
                  <Text style={styles.ratingEyebrow}>LIVE PASSENGER RATING</Text>
                  <Text style={styles.ratingNumber}>⭐ {getLiveRating()}</Text>
                  <Text style={styles.ratingText}>
                    Based on {getReviewCount()} chauffeur review
                    {getReviewCount() === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <StatBox
                  label="Trips"
                  value={String(getTotalTrips())}
                  styles={styles}
                />
                <StatBox
                  label="Reviews"
                  value={String(getReviewCount())}
                  styles={styles}
                />
                <StatBox
                  label="Profile"
                  value={`${getProfileCompletion()}%`}
                  styles={styles}
                />
              </View>
            </Animated.View>

            <View style={styles.profileHealthCard}>
              <View style={styles.profileHealthHeader}>
                <View>
                  <Text style={styles.profileHealthEyebrow}>
                    PROFILE READINESS
                  </Text>
                  <Text style={styles.profileHealthTitle}>
                    {getProfileCompletion() >= 80
                      ? "Your profile is driver-ready"
                      : "Complete your ride preferences"}
                  </Text>
                </View>

                <CircleCheckBig size={26} color={colors.gold} />
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${getProfileCompletion()}%` },
                  ]}
                />
              </View>

              <Text style={styles.profileHealthText}>
                A complete profile helps drivers prepare for luggage, comfort,
                communication, and safety needs before arrival.
              </Text>

              {getProfileCompletion() < 100 && (
                <TouchableOpacity
                  style={styles.smallOutlineButton}
                  onPress={() => router.push("/profile" as any)}
                  activeOpacity={0.84}
                >
                  <Text style={styles.smallOutlineButtonText}>
                    Complete Profile
                  </Text>
                  <ChevronRight size={17} color={colors.gold} />
                </TouchableOpacity>
              )}
            </View>

            {trips.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <CarFront size={34} color={colors.gold} />
                </View>

                <Text style={styles.emptyTitle}>No Active Passenger Card</Text>
                <Text style={styles.emptyText}>
                  Your ride-specific passenger card appears when a booking is
                  confirmed, assigned to a driver, or in progress.
                </Text>

                <TouchableOpacity
                  style={styles.goldButton}
                  onPress={() => router.push("/my-trips" as any)}
                  activeOpacity={0.85}
                >
                  <CarFront size={18} color={colors.navy} />
                  <Text style={styles.goldButtonText}>View My Trips</Text>
                  <ChevronRight size={19} color={colors.navy} />
                </TouchableOpacity>
              </View>
            ) : (
              trips.map((trip, index) => {
                const passengerName =
                  trip.passenger_name ||
                  trip.name ||
                  `${profile?.first_name || ""} ${
                    profile?.last_name || ""
                  }`.trim() ||
                  "Passenger";

                const studentVerified =
                  Boolean(profile?.student_verified) ||
                  Boolean(profile?.student_status) ||
                  Boolean(trip.student_verified);

                return (
                  <View key={String(trip.id)} style={styles.card}>
                    <View style={styles.activeRideRibbon}>
                      <View style={styles.liveDot} />
                      <Text style={styles.activeRideText}>
                        ACTIVE RIDE PROFILE {index + 1}
                      </Text>
                    </View>

                    <View style={styles.passengerHeader}>
                      <View style={styles.avatar}>
                        <UserRound size={28} color={colors.gold} />
                      </View>

                      <View style={styles.passengerHeaderCopy}>
                        <Text style={styles.passengerName}>{passengerName}</Text>
                        <Text style={styles.passengerSub}>
                          {trip.status || "Confirmed"} •{" "}
                          {trip.invoice_no || "No invoice"}
                        </Text>
                      </View>

                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                          {String(trip.status || "Confirmed").toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.badgeRow}>
                      <Badge
                        icon={<Star size={15} color={colors.gold} />}
                        text={`${getLiveRating()} Rating`}
                        styles={styles}
                      />
                      <Badge
                        icon={<CarFront size={15} color={colors.gold} />}
                        text={`${getTotalTrips()} Trips`}
                        styles={styles}
                      />
                      <Badge
                        icon={<BadgeCheck size={15} color={colors.gold} />}
                        text={
                          studentVerified
                            ? "Verified Student"
                            : "Standard Passenger"
                        }
                        styles={styles}
                      />
                    </View>

                    <SectionTitle
                      icon={<MapPinned size={19} color={colors.gold} />}
                      title="Trip Details"
                      styles={styles}
                    />

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
                      icon={<CalendarDays size={18} color={colors.gold} />}
                      label="Date & Time"
                      value={`${trip.ride_date || trip.date || "N/A"} • ${
                        trip.ride_time || trip.time || "N/A"
                      }`}
                      styles={styles}
                    />

                    <InfoLine
                      icon={<FileText size={18} color={colors.gold} />}
                      label="Invoice"
                      value={trip.invoice_no || "Not yet issued"}
                      styles={styles}
                    />

                    <SectionTitle
                      icon={<UserRound size={19} color={colors.gold} />}
                      title="Passenger Details"
                      styles={styles}
                    />

                    <InfoLine
                      icon={<Phone size={18} color={colors.gold} />}
                      label="Phone"
                      value={profile?.phone || trip.phone || "N/A"}
                      styles={styles}
                    />

                    <InfoLine
                      icon={<Mail size={18} color={colors.gold} />}
                      label="Email"
                      value={profile?.email || trip.email || "N/A"}
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
                          ? `${profile.emergency_name} added`
                          : "Not Added"
                      }
                      styles={styles}
                    />

                    <SectionTitle
                      icon={<HeartHandshake size={19} color={colors.gold} />}
                      title="Ride Preferences"
                      styles={styles}
                    />

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
                          icon: (
                            <MessageCircle size={17} color={colors.gold} />
                          ),
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

                    <View style={styles.privacyBox}>
                      <View style={styles.privacyIcon}>
                        <ShieldCheck size={20} color={colors.gold} />
                      </View>

                      <View style={styles.privacyCopy}>
                        <Text style={styles.privacyTitle}>
                          Protected Passenger Information
                        </Text>
                        <Text style={styles.privacyText}>
                          Drivers only receive ride-relevant information.
                          Emergency contact details remain protected unless
                          required for safety.
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.goldButton}
                      onPress={() => sendToDriver(trip)}
                      activeOpacity={0.85}
                    >
                      <Send size={18} color={colors.navy} />
                      <Text style={styles.goldButtonText}>
                        Send Card to Driver
                      </Text>
                      <ChevronRight size={19} color={colors.navy} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={() => router.push("/profile" as any)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.outlineButtonText}>
                        Edit Profile Preferences
                      </Text>
                      <ChevronRight size={18} color={colors.gold} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            <View style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <Users size={24} color={colors.navy} />
              </View>

              <View style={styles.serviceCopy}>
                <Text style={styles.serviceTitle}>
                  Built for Better Chauffeur Service
                </Text>
                <Text style={styles.serviceText}>
                  Your Passenger Card helps reduce pickup confusion and gives
                  drivers the information they need to prepare for your ride.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => router.push("/support" as any)}
              activeOpacity={0.85}
            >
              <Headphones size={18} color={colors.gold} />
              <Text style={styles.supportText}>Get Passenger Support</Text>
              <ChevronRight size={18} color={colors.gold} />
            </TouchableOpacity>

            <Text style={styles.footer}>
              Angel Express • Personalized Comfort In Every Ride
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function StatBox({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({
  icon,
  title,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  styles: any;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleIcon}>{icon}</View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
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

      <View style={styles.infoCopy}>
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
      paddingHorizontal: 28,
    },
    loadingIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    loadingTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: "900",
      marginTop: 16,
    },
    loadingText: {
      color: c.text2,
      marginTop: 8,
      fontWeight: "700",
      textAlign: "center",
      lineHeight: 20,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    topActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
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
    iconPill: {
      width: 42,
      height: 42,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
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

    hero: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 30,
      padding: 24,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    heroIconLarge: {
      width: 74,
      height: 74,
      borderRadius: 26,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    kicker: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 2,
      marginBottom: 9,
    },
    title: {
      color: c.text,
      fontSize: 38,
      fontWeight: "900",
      lineHeight: 43,
      marginBottom: 11,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "700",
    },
    heroPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 17,
    },
    heroPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 999,
    },
    heroPillText: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
    },

    ratingCard: {
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderRadius: 26,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    ratingTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 16,
    },
    ratingIcon: {
      width: 62,
      height: 62,
      borderRadius: 21,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    ratingCopy: {
      flex: 1,
    },
    ratingEyebrow: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginBottom: 3,
    },
    ratingNumber: {
      color: c.text,
      fontSize: 30,
      fontWeight: "900",
    },
    ratingText: {
      color: c.text2,
      fontSize: 12.5,
      fontWeight: "700",
      marginTop: 2,
    },
    statsRow: {
      flexDirection: "row",
      gap: 9,
    },
    statBox: {
      flex: 1,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingVertical: 13,
      paddingHorizontal: 9,
      alignItems: "center",
    },
    statValue: {
      color: c.text,
      fontSize: 19,
      fontWeight: "900",
    },
    statLabel: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
      marginTop: 3,
    },

    profileHealthCard: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 22,
      padding: 18,
      marginBottom: 18,
    },
    profileHealthHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 13,
    },
    profileHealthEyebrow: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
      marginBottom: 4,
    },
    profileHealthTitle: {
      color: c.text,
      fontSize: 19,
      fontWeight: "900",
    },
    progressTrack: {
      height: 9,
      borderRadius: 999,
      backgroundColor: c.card,
      overflow: "hidden",
      marginBottom: 11,
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: c.gold,
    },
    profileHealthText: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "700",
    },
    smallOutlineButton: {
      marginTop: 14,
      minHeight: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    smallOutlineButtonText: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
    },

    emptyCard: {
      backgroundColor: c.card,
      padding: 22,
      marginBottom: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.borderSoft,
      alignItems: "center",
      ...v5Shadow(c),
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 15,
    },
    emptyTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 8,
    },
    emptyText: {
      color: c.text2,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 16,
    },

    card: {
      backgroundColor: c.card,
      padding: 20,
      marginBottom: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.borderSoft,
      ...v5Shadow(c),
    },
    activeRideRibbon: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 10,
      marginBottom: 15,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: c.gold,
    },
    activeRideText: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    passengerHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      marginBottom: 15,
    },
    passengerHeaderCopy: {
      flex: 1,
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
    passengerName: {
      color: c.text,
      fontSize: 22,
      fontWeight: "900",
    },
    passengerSub: {
      color: c.gold,
      fontSize: 12.5,
      fontWeight: "800",
      marginTop: 4,
    },
    statusBadge: {
      maxWidth: 98,
      backgroundColor: c.gold,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 7,
    },
    statusBadgeText: {
      color: c.navy,
      fontSize: 8.5,
      fontWeight: "900",
      textAlign: "center",
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 6,
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
    badgeText: {
      color: c.gold,
      fontSize: 11.5,
      fontWeight: "900",
    },

    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginTop: 20,
      marginBottom: 14,
    },
    sectionTitleIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "900",
    },

    infoLine: {
      flexDirection: "row",
      gap: 11,
      alignItems: "flex-start",
      marginBottom: 13,
      paddingBottom: 13,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
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
    infoCopy: {
      flex: 1,
    },
    infoLabel: {
      color: c.gold,
      fontSize: 10.5,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    infoValue: {
      color: c.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "700",
    },

    preferenceGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    preferenceCard: {
      width: "48%",
      minHeight: 128,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card2,
      padding: 13,
    },
    preferenceIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 9,
    },
    preferenceLabel: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 5,
      letterSpacing: 0.5,
    },
    preferenceValue: {
      color: c.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },

    privacyBox: {
      flexDirection: "row",
      gap: 11,
      padding: 14,
      borderRadius: 17,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 18,
      marginBottom: 16,
    },
    privacyIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    privacyCopy: {
      flex: 1,
    },
    privacyTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 4,
    },
    privacyText: {
      color: c.text2,
      fontSize: 12.5,
      lineHeight: 19,
      fontWeight: "700",
    },

    goldButton: {
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
    },
    goldButtonText: {
      color: c.navy,
      fontSize: 14.5,
      fontWeight: "900",
      flex: 1,
      textAlign: "center",
    },
    outlineButton: {
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
      marginTop: 13,
      backgroundColor: c.card,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 14.5,
      fontWeight: "900",
    },

    serviceCard: {
      backgroundColor: c.gold,
      borderRadius: 22,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    serviceIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    serviceCopy: {
      flex: 1,
    },
    serviceTitle: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 4,
    },
    serviceText: {
      color: c.navy,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "800",
      opacity: 0.82,
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
      paddingHorizontal: 16,
    },
    supportText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      flex: 1,
      textAlign: "center",
    },
    footer: {
      color: c.text,
      textAlign: "center",
      fontSize: 12.5,
      fontWeight: "700",
      opacity: 0.9,
      marginTop: 20,
    },
  });
}
