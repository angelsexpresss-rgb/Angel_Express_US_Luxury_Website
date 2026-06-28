import React, { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import {
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  Gift,
  GraduationCap,
  Headphones,
  Info,
  Languages,
  Lock,
  LogOut,
  MapPinned,
  Navigation,
  Plane,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from "lucide-react-native";

import { registerForPushNotifications } from "../lib/notifications";
import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelDropdown,
  AngelHeader,
  AngelSection,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

export default function DashboardScreen() {
  const [firstName, setFirstName] = useState("Passenger");

  const bgScale = useRef(new Animated.Value(1)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const bookFade = useRef(new Animated.Value(0)).current;
  const rideFade = useRef(new Animated.Value(0)).current;
  const travelFade = useRef(new Animated.Value(0)).current;
  const menuFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registerForPushNotifications();
    loadPassengerName();
    slowBackgroundZoom(bgScale).start();

    Animated.sequence([
      fadeUp(headerFade, 40),
      fadeUp(bookFade, 50),
      fadeUp(rideFade, 50),
      fadeUp(travelFade, 50),
      fadeUp(menuFade, 50),
    ]).start();
  }, []);

  async function loadPassengerName() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: passenger } = await supabase
        .from("passengers")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();

      if (passenger?.first_name) {
        setFirstName(passenger.first_name);
        return;
      }

      const { data: profile } = await supabase
        .from("passenger_profiles")
        .select("first_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.first_name) setFirstName(profile.first_name);
    } catch (error) {
      console.log("Name load error:", error);
    }
  }

  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login" as any);
        },
      },
    ]);
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
          <Animated.View style={{ opacity: headerFade }}>
            <AngelHeader title={firstName} />
          </Animated.View>

          <Animated.View style={{ opacity: bookFade }}>
            <AngelCard
              variant="gold"
              style={styles.bookCard}
              onPress={() => router.push("/book-ride" as any)}
            >
              <View>
                <Text style={styles.bookTitle}>Book a Ride</Text>
                <Text style={styles.bookSub}>Reserve your next private trip</Text>
              </View>
              <Text style={styles.arrowDark}>›</Text>
            </AngelCard>
          </Animated.View>

          <Animated.View style={{ opacity: rideFade }}>
            <AngelSection title="Ride Management" horizontal>
              <QuickCard
                title="Book a Ride"
                icon={<CarFront size={24} color={GOLD} />}
                onPress={() => router.push("/book-ride" as any)}
              />

              <QuickCard
                title="My Trips"
                icon={<CalendarDays size={24} color={GOLD} />}
                onPress={() => router.push("/my-trips" as any)}
              />

              <QuickCard
                title="Track Live Trip"
                icon={<MapPinned size={24} color={GOLD} />}
                onPress={() =>
                  router.push({
                    pathname: "/live-trip" as any,
                    params: { invoice_no: "AE-20260614-723991" },
                  })
                }
              />

              <QuickCard
                title="Luxury Ride Prep+"
                icon={<BriefcaseBusiness size={24} color={GOLD} />}
                onPress={() => router.push("/luxury-ride-prep" as any)}
              />
            </AngelSection>
          </Animated.View>

          <Animated.View style={{ opacity: travelFade }}>
            <AngelSection title="Travel Concierge" horizontal>
              <QuickCard
                title="Angel Travel Concierge"
                icon={<Plane size={24} color={GOLD} />}
                onPress={() => router.push("/travel-concierge" as any)}
              />

              <QuickCard
                title="Student Travel Mode+"
                icon={<GraduationCap size={24} color={GOLD} />}
                onPress={() => router.push("/student-travel" as any)}
              />

              <QuickCard
                title="Multi-Language Assistant"
                icon={<Languages size={24} color={GOLD} />}
                onPress={() => router.push("/language-assistant" as any)}
              />

              <QuickCard
                title="AI Ride Assistant"
                icon={<Sparkles size={24} color={GOLD} />}
                onPress={() => router.push("/ai-assistant" as any)}
              />
            </AngelSection>
          </Animated.View>

          <Animated.View style={[styles.menuPanel, { opacity: menuFade }]}>
            <Text style={styles.menuTitle}>More Services</Text>

            <AngelDropdown title="Safety & Support">
              <ListItem
                title="Angel Safety Share"
                icon={<ShieldCheck size={20} color={GOLD} />}
                onPress={() => router.push("/safety-share" as any)}
              />
              <ListItem
                title="Family Check-In+"
                icon={<Users size={20} color={GOLD} />}
                onPress={() => router.push("/family-checkin" as any)}
              />
              <ListItem
                title="Support Center"
                icon={<Headphones size={20} color={GOLD} />}
                onPress={() => router.push("/support" as any)}
              />
            </AngelDropdown>

            <AngelDropdown title="Passenger Account">
              <ListItem
                title="Profile"
                icon={<UserRound size={20} color={GOLD} />}
                onPress={() => router.push("/profile" as any)}
              />
              <ListItem
                title="Passenger Card"
                icon={<BadgeCheck size={20} color={GOLD} />}
                onPress={() => router.push("/passenger-card" as any)}
              />
              <ListItem
                title="Rewards"
                icon={<Gift size={20} color={GOLD} />}
                onPress={() => router.push("/rewards" as any)}
              />
            </AngelDropdown>

            <AngelDropdown title="Account & Settings">
              <ListItem
                title="Notification Preferences"
                icon={<Bell size={20} color={GOLD} />}
                onPress={() => router.push("/notification-preferences" as any)}
              />
              <ListItem
                title="Privacy & Account"
                icon={<Lock size={20} color={GOLD} />}
                onPress={() => router.push("/privacy-account" as any)}
              />
              <ListItem
                title="About Angel Express"
                icon={<Info size={20} color={GOLD} />}
                onPress={() => router.push("/about" as any)}
              />
              <ListItem
                title="Log Out"
                icon={<LogOut size={20} color="#FF6B6B" />}
                onPress={handleLogout}
                danger
              />
            </AngelDropdown>

            <AngelDropdown title="Unique Angel Features">
              <FeatureItem
                title="Push Ride Updates"
                text="Driver assigned, ride confirmed, driver arriving, trip started, arrived safely, and rewards earned."
                icon={<Bell size={18} color={GOLD} />}
              />
              <FeatureItem
                title="Live GPS Tracking"
                text="Track your active ride, driver location, ETA, vehicle, and plate number."
                icon={<Navigation size={18} color={GOLD} />}
              />
              <FeatureItem
                title="Student Travel Mode"
                text="Discounted student routes, campus pickup points, and group rides."
                icon={<GraduationCap size={18} color={GOLD} />}
              />
              <FeatureItem
                title="World Cup/Event Mode"
                text="Hotel pickup, stadium routes, airport transfers, and event support."
                icon={<Trophy size={18} color={GOLD} />}
              />
              <FeatureItem
                title="Luxury Ride Prep"
                text="Luggage, ID, timing, and driver details before pickup."
                icon={<BriefcaseBusiness size={18} color={GOLD} />}
              />
              <FeatureItem
                title="Family Check-In"
                text="Send pickup, halfway, and arrival updates to loved ones."
                icon={<Users size={18} color={GOLD} />}
              />
            </AngelDropdown>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function QuickCard({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <AngelCard style={styles.quickCard} onPress={onPress}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.goldArrow}>›</Text>
    </AngelCard>
  );
}

function ListItem({
  title,
  onPress,
  icon,
  danger,
}: {
  title: string;
  onPress: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.smallIcon, danger && styles.dangerIcon]}>{icon}</View>
      <Text style={[styles.listText, danger && styles.dangerText]}>{title}</Text>
      <Text style={[styles.listArrow, danger && styles.dangerText]}>›</Text>
    </TouchableOpacity>
  );
}

function FeatureItem({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureHeader}>
        <View style={styles.featureIcon}>{icon}</View>
        <Text style={styles.featureTitle}>{title}</Text>
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
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
    backgroundColor: "rgba(5,11,22,0.90)",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingTop: 52,
    paddingHorizontal: 22,
    paddingBottom: 42,
  },

  bookCard: {
    minHeight: 108,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },

  bookTitle: {
    color: AE_COLORS.navy2,
    fontSize: 29,
    fontWeight: "900",
  },

  bookSub: {
    color: "rgba(6,17,31,0.75)",
    fontSize: 16,
    marginTop: 5,
    fontWeight: "700",
  },

  arrowDark: {
    color: AE_COLORS.navy2,
    fontSize: 48,
    fontWeight: "300",
  },

  quickCard: {
    width: 156,
    height: 150,
    justifyContent: "space-between",
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  quickTitle: {
    color: AE_COLORS.white,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },

  goldArrow: {
    color: AE_COLORS.gold,
    fontSize: 32,
    alignSelf: "flex-end",
  },

  menuPanel: {
    marginTop: 4,
    paddingTop: 4,
  },

  menuTitle: {
    color: AE_COLORS.gold,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  listItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
  },

  smallIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  listText: {
    color: "#E8EDF3",
    fontSize: 18,
    flex: 1,
  },

  listArrow: {
    color: AE_COLORS.gold,
    fontSize: 28,
  },

  featureItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  featureHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  featureTitle: {
    color: AE_COLORS.gold,
    fontSize: 17,
    fontWeight: "900",
  },

  featureText: {
    color: AE_COLORS.muted,
    fontSize: 14.5,
    lineHeight: 22,
  },

  dangerIcon: {
    borderColor: "rgba(255,107,107,0.45)",
  },

  dangerText: {
    color: AE_COLORS.danger,
  },
});