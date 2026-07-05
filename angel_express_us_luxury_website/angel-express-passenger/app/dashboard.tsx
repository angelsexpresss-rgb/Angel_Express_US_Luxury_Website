import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  Gamepad2,
  Gift,
  GraduationCap,
  Headphones,
  Home,
  Info,
  Languages,
  Lock,
  LogOut,
  MapPinned,
  Menu,
  Navigation,
  Plane,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react-native";

import { registerForPushNotifications } from "../lib/notifications";
import { supabase } from "../lib/supabase";

type ThemeMode = "dark" | "light";

export default function DashboardScreen() {
  const systemMode = useColorScheme();

  const [themeMode, setThemeMode] = useState<ThemeMode>(
    systemMode === "light" ? "light" : "dark"
  );

  const colors = themeMode === "dark" ? darkTheme : lightTheme;
  const styles = useMemo(() => createStyles(colors), [themeMode]);

  const [firstName, setFirstName] = useState("Passenger");
  const [rating, setRating] = useState(5);
  const [totalTrips, setTotalTrips] = useState(0);
  const [studentVerified, setStudentVerified] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const bodyFade = useRef(new Animated.Value(0)).current;
  const toolFade = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registerForPushNotifications();
    loadPassengerInfo();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.045,
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

    Animated.sequence([
      Animated.parallel([
        Animated.timing(pageFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      fadeIn(headerFade, 80),
      fadeIn(cardFade, 90),
      fadeIn(bodyFade, 90),
      fadeIn(toolFade, 90),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(menuAnim, {
      toValue: menuOpen ? 1 : 0,
      friction: 8,
      tension: 75,
      useNativeDriver: true,
    }).start();
  }, [menuOpen]);

  function fadeIn(value: Animated.Value, delay: number) {
    return Animated.timing(value, {
      toValue: 1,
      duration: 520,
      delay,
      useNativeDriver: true,
    });
  }

  async function loadPassengerInfo() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: passenger } = await supabase
        .from("passengers")
        .select("first_name, rating, total_trips, student_verified")
        .eq("id", user.id)
        .maybeSingle();

      if (passenger) {
        if (passenger.first_name) setFirstName(passenger.first_name);
        if (passenger.rating) setRating(Number(passenger.rating));
        if (passenger.total_trips) setTotalTrips(Number(passenger.total_trips));
        if (passenger.student_verified) setStudentVerified(Boolean(passenger.student_verified));
        return;
      }

      const { data: profile } = await supabase
        .from("passenger_profiles")
        .select("first_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.first_name) setFirstName(profile.first_name);
    } catch (error) {
      console.log("Passenger dashboard load error:", error);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadPassengerInfo();
    setRefreshing(false);
  }

  function goTo(route: string) {
    setMenuOpen(false);
    router.push(route as any);
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
      <StatusBar barStyle={themeMode === "dark" ? "light-content" : "dark-content"} />

      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/dashboard-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
            />
          }
        >
          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Animated.View style={{ opacity: headerFade }}>
              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setMenuOpen(!menuOpen)}
                  activeOpacity={0.85}
                >
                  {menuOpen ? (
                    <X size={26} color={colors.text} strokeWidth={3} />
                  ) : (
                    <Menu size={27} color={colors.text} strokeWidth={3} />
                  )}
                </TouchableOpacity>

                <View style={styles.brandBox}>
                  <Image
                    source={require("../assets/images/angel-logo-transparent.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>

                <TouchableOpacity
                  style={styles.bellButton}
                  onPress={() => goTo("/notification-preferences")}
                  activeOpacity={0.85}
                >
                  <Bell size={23} color={colors.text} strokeWidth={2.6} />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>3</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.greetingRow}>
                <View>
                  <Text style={styles.kicker}>PASSENGER DASHBOARD</Text>
                  <Text style={styles.greeting}>Welcome, {firstName}</Text>
                </View>

                <TouchableOpacity
                  style={styles.themePill}
                  onPress={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.themeText}>
                    {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: cardFade }}>
              <TouchableOpacity
                style={styles.heroCard}
                onPress={() => goTo("/book-ride")}
                activeOpacity={0.9}
              >
                <View style={styles.heroTop}>
                  <View>
                    <Text style={styles.heroLabel}>Private Ride</Text>
                    <Text style={styles.heroTitle}>Book a Ride</Text>
                    <Text style={styles.heroSub}>Reserve your next Angel Express trip</Text>
                  </View>

                  <Text style={styles.arrowLight}>›</Text>
                </View>

                <View style={styles.statsRow}>
                  <StatBlock label="Trips" value={String(totalTrips)} styles={styles} />
                  <Divider styles={styles} />
                  <StatBlock label="Rating" value={rating.toFixed(1)} styles={styles} />
                  <Divider styles={styles} />
                  <StatBlock
                    label="Student"
                    value={studentVerified ? "Verified" : "Mode"}
                    styles={styles}
                    small
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.levelCard}
                onPress={() => goTo("/rewards")}
                activeOpacity={0.9}
              >
                <View style={styles.levelIcon}>
                  <Gift size={27} color={colors.mode === "dark" ? "#07111F" : "#FFFFFF"} strokeWidth={2.8} />
                </View>

                <View style={styles.levelMiddle}>
                  <Text style={styles.levelTitle}>Rewards & Referrals</Text>
                  <Text style={styles.levelText}>
                    Earn ride credits, referral bonuses, and student savings.
                  </Text>

                  <View style={styles.progressTrack}>
                    <View style={styles.progressFill} />
                  </View>
                </View>

                <Text style={styles.levelCount}>AE</Text>
                <Text style={styles.arrowDark}>›</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ opacity: bodyFade }}>
              <View style={styles.goOnlineCard}>
                <View style={styles.cityArt}>
                  <Text style={styles.cityEmoji}>🏙️</Text>
                  <Text style={styles.carEmoji}>{themeMode === "dark" ? "🚘" : "🚕"}</Text>
                </View>

                <Text style={styles.goOnlineTitle}>Ready for Your Next Trip?</Text>

                <Text style={styles.goOnlineText}>
                  Book private rides, airport transfers, long-distance travel,
                  student trips, and event transportation.
                </Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => goTo("/book-ride")}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryButtonText}>Book a Ride</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Upcoming Opportunities</Text>

                <TouchableOpacity onPress={() => goTo("/travel-concierge")}>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.opportunityCard}
                onPress={() => goTo("/travel-concierge")}
                activeOpacity={0.9}
              >
                <View style={styles.smartIcon}>
                  <Plane size={31} color={colors.gold} strokeWidth={2.7} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.opportunityTitle}>Travel Concierge</Text>
                  <Text style={styles.opportunitySub}>
                    Airport, hotel, event, and long-distance trip help
                  </Text>
                  <Text style={styles.opportunityGreen}>
                    Smart planning • Private comfort
                  </Text>
                </View>

                <View style={styles.pricePill}>
                  <Text style={styles.priceText}>Plan</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ opacity: toolFade }}>
              <Text style={styles.menuTitle}>Passenger Tools</Text>

              <ToolCard
                icon={<CarFront size={26} color={colors.gold} strokeWidth={2.7} />}
                title="Book a Ride"
                subtitle="Reserve your next private Angel Express trip."
                onPress={() => goTo("/book-ride")}
                styles={styles}
              />

              <ToolCard
                icon={<CalendarDays size={26} color={colors.gold} strokeWidth={2.7} />}
                title="My Trips"
                subtitle="View pending, confirmed, in-progress, and completed rides."
                onPress={() => goTo("/my-trips")}
                styles={styles}
              />

             <ToolCard
  icon={<MapPinned size={26} color={colors.gold} strokeWidth={2.7} />}
  title="Track Live Trip"
  subtitle="Track your active ride, driver location, ETA, vehicle, and plate."
  onPress={() => goTo("/live-trip")}
  styles={styles}
/>
            

              <ToolCard
                icon={<BriefcaseBusiness size={26} color={colors.gold} strokeWidth={2.7} />}
                title="Luxury Ride Prep+"
                subtitle="Prepare luggage, pickup timing, preferences, and special notes."
                onPress={() => goTo("/luxury-ride-prep")}
                styles={styles}
              />

              <ToolCard
                icon={<Plane size={26} color={colors.gold} strokeWidth={2.7} />}
                title="Angel Travel Concierge"
                subtitle="Hotels, airports, events, restaurants, tourism, and travel planning."
                onPress={() => goTo("/travel-concierge")}
                styles={styles}
              />

              <ToolCard
                icon={<GraduationCap size={26} color={colors.gold} strokeWidth={2.7} />}
                title="Student Travel Mode+"
                subtitle="Student discounts, campus pickup points, and verified student features."
                onPress={() => goTo("/student-travel")}
                styles={styles}
              />

              <ToolCard
                icon={<Sparkles size={26} color={colors.gold} strokeWidth={2.7} />}
                title="AI Ride Assistant"
                subtitle="Ask questions about booking, luggage, airport pickup, pricing, and support."
                onPress={() => goTo("/ai-assistant")}
                styles={styles}
              />

              <ToolCard
                icon={<ShieldCheck size={26} color={colors.gold} strokeWidth={2.7} />}
                title="Safety & Support"
                subtitle="Angel Safety Share, Family Check-In, and Support Center."
                onPress={() => goTo("/safety-share")}
                styles={styles}
              />

              <Text style={styles.menuTitle}>More Services</Text>

              <DropdownPanel title="Passenger Account" styles={styles}>
                <ListItem
                  title="Profile"
                  icon={<UserRound size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/profile")}
                  styles={styles}
                />
                <ListItem
                  title="Passenger Card"
                  icon={<BadgeCheck size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/passenger-card")}
                  styles={styles}
                />
                <ListItem
                  title="Rewards"
                  icon={<Gift size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/rewards")}
                  styles={styles}
                />
              </DropdownPanel>

              <DropdownPanel title="Travel & Entertainment" styles={styles}>
                <ListItem
                  title="Entertainment Hub+"
                  icon={<Gamepad2 size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/entertainment-hub")}
                  styles={styles}
                />
                <ListItem
                  title="Multi-Language Assistant"
                  icon={<Languages size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/language-assistant")}
                  styles={styles}
                />
                <ListItem
                  title="World Cup & Event Mode"
                  icon={<Trophy size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/travel-concierge")}
                  styles={styles}
                />
              </DropdownPanel>

              <DropdownPanel title="Account & Settings" styles={styles}>
                <ListItem
                  title="Notification Preferences"
                  icon={<Bell size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/notification-preferences")}
                  styles={styles}
                />
                <ListItem
                  title="Privacy & Account"
                  icon={<Lock size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/privacy-account")}
                  styles={styles}
                />
                <ListItem
                  title="About Angel Express"
                  icon={<Info size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/about")}
                  styles={styles}
                />
                <ListItem
                  title="Log Out"
                  icon={<LogOut size={21} color={colors.danger} strokeWidth={2.7} />}
                  onPress={handleLogout}
                  styles={styles}
                  danger
                />
              </DropdownPanel>

              <DropdownPanel title="Safety & Family" styles={styles}>
                <ListItem
                  title="Angel Safety Share"
                  icon={<ShieldCheck size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/safety-share")}
                  styles={styles}
                />
                <ListItem
                  title="Family Check-In+"
                  icon={<Users size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/family-checkin")}
                  styles={styles}
                />
                <ListItem
                  title="Support Center"
                  icon={<Headphones size={21} color={colors.gold} strokeWidth={2.7} />}
                  onPress={() => goTo("/support")}
                  styles={styles}
                />
              </DropdownPanel>

              <View style={styles.footerCard}>
                <Text style={styles.footerTitle}>Angel Express Standard</Text>
                <Text style={styles.footerText}>
                  Comfort • Operational Service • Reliability • Cleanliness
                </Text>
              </View>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </View>

      {menuOpen && (
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        />
      )}

      <Animated.View
        pointerEvents={menuOpen ? "auto" : "none"}
        style={[
          styles.bottomMenuPanel,
          {
            opacity: menuAnim,
            transform: [
              {
                translateY: menuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [28, 0],
                }),
              },
              {
                scale: menuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.bottomMenuTitle}>Angel Passenger Menu</Text>

        <View style={styles.bottomMenuGrid}>
          <MenuOption
            icon={<Home size={27} color={colors.gold} strokeWidth={2.7} />}
            title="Home"
            onPress={() => setMenuOpen(false)}
            styles={styles}
          />

          <MenuOption
            icon={<CarFront size={27} color={colors.gold} strokeWidth={2.7} />}
            title="Book"
            onPress={() => goTo("/book-ride")}
            styles={styles}
          />

          <MenuOption
            icon={<CalendarDays size={27} color={colors.gold} strokeWidth={2.7} />}
            title="Trips"
            onPress={() => goTo("/my-trips")}
            styles={styles}
          />

          <MenuOption
            icon={<Gift size={27} color={colors.gold} strokeWidth={2.7} />}
            title="Rewards"
            onPress={() => goTo("/rewards")}
            styles={styles}
          />

          <MenuOption
            icon={<Headphones size={27} color={colors.gold} strokeWidth={2.7} />}
            title="Support"
            onPress={() => goTo("/support")}
            styles={styles}
          />

          <MenuOption
            icon={<UserRound size={27} color={colors.gold} strokeWidth={2.7} />}
            title="Account"
            onPress={() => goTo("/profile")}
            styles={styles}
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>🚪 Log Out</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.bottomNav}>
        <BottomTab
          icon={<Home size={23} color={colors.gold} strokeWidth={2.7} />}
          label="Home"
          active
          styles={styles}
        />

        <BottomTab
          icon={<Ticket size={23} color={colors.muted} strokeWidth={2.7} />}
          label="Book"
          onPress={() => goTo("/book-ride")}
          styles={styles}
        />

        <TouchableOpacity
          style={styles.centerMenuButton}
          onPress={() => setMenuOpen(!menuOpen)}
          activeOpacity={0.9}
        >
          {menuOpen ? (
            <X size={31} color={colors.mode === "dark" ? "#07111F" : "#FFFFFF"} strokeWidth={3} />
          ) : (
            <Menu size={31} color={colors.mode === "dark" ? "#07111F" : "#FFFFFF"} strokeWidth={3} />
          )}
        </TouchableOpacity>

        <BottomTab
          icon={<CalendarDays size={23} color={colors.muted} strokeWidth={2.7} />}
          label="Trips"
          onPress={() => goTo("/my-trips")}
          styles={styles}
        />

        <BottomTab
          icon={<UserRound size={23} color={colors.muted} strokeWidth={2.7} />}
          label="Account"
          onPress={() => goTo("/profile")}
          styles={styles}
        />
      </View>
    </View>
  );
}

function StatBlock({ label, value, styles, small }: any) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, small && styles.statValueSmall]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Divider({ styles }: any) {
  return <View style={styles.divider} />;
}

function ToolCard({ icon, title, subtitle, onPress, styles }: any) {
  return (
    <TouchableOpacity style={styles.toolCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.toolIconBox}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolSub}>{subtitle}</Text>
      </View>

      <Text style={styles.toolArrow}>›</Text>
    </TouchableOpacity>
  );
}

function BottomTab({ icon, label, active, onPress, styles }: any) {
  return (
    <TouchableOpacity style={styles.bottomTab} onPress={onPress} activeOpacity={0.85}>
      {icon}
      <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MenuOption({ icon, title, onPress, styles }: any) {
  return (
    <TouchableOpacity style={styles.menuOption} onPress={onPress} activeOpacity={0.85}>
      {icon}
      <Text style={styles.menuOptionTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

function ListItem({ title, onPress, icon, danger, styles }: any) {
  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.smallIcon, danger && styles.dangerIcon]}>{icon}</View>
      <Text style={[styles.listText, danger && styles.dangerText]}>{title}</Text>
      <Text style={[styles.listArrow, danger && styles.dangerText]}>›</Text>
    </TouchableOpacity>
  );
}

function DropdownPanel({ title, children, styles }: any) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.dropdownWrap}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setOpen(!open)}
        activeOpacity={0.85}
      >
        <Text style={styles.dropdownTitle}>{title}</Text>
        <Text style={styles.dropdownArrow}>{open ? "−" : "+"}</Text>
      </TouchableOpacity>

      {open && <View style={styles.dropdownBody}>{children}</View>}
    </View>
  );
}

const darkTheme = {
  mode: "dark",
  bg: "#050B16",
  overlay: "rgba(5,11,22,0.91)",
  card: "rgba(16,24,39,0.94)",
  card2: "rgba(21,31,43,0.95)",
  text: "#FFFFFF",
  muted: "#B8C1CC",
  soft: "rgba(255,255,255,0.07)",
  border: "rgba(212,175,55,0.26)",
  lightBorder: "rgba(255,255,255,0.10)",
  gold: "#D4AF37",
  gold2: "#B8860B",
  navy: "#050B16",
  green: "#20C461",
  danger: "#EF4444",
  nav: "rgba(8,14,24,0.98)",
};

const lightTheme = {
  mode: "light",
  bg: "#F7F7F5",
  overlay: "rgba(247,247,245,0.88)",
  card: "rgba(255,255,255,0.96)",
  card2: "#FFF8E8",
  text: "#07111F",
  muted: "#5D6673",
  soft: "rgba(7,17,31,0.05)",
  border: "rgba(184,134,11,0.24)",
  lightBorder: "rgba(7,17,31,0.10)",
  gold: "#B8860B",
  gold2: "#D4AF37",
  navy: "#07111F",
  green: "#16A34A",
  danger: "#DC2626",
  nav: "rgba(255,255,255,0.98)",
};

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
      width: "100%",
      height: "100%",
    },

    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
    },

    scroll: {
      flex: 1,
    },

    content: {
      paddingTop: 54,
      paddingHorizontal: 20,
      paddingBottom: 150,
    },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    menuButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lightBorder,
    },

    brandBox: {
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      paddingHorizontal: 12,
    },

    logo: {
      width: 178,
      height: 62,
    },

    bellButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lightBorder,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },

    badge: {
      position: "absolute",
      top: -4,
      right: -3,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#FF3045",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.mode === "dark" ? "#050B16" : "#FFFFFF",
    },

    badgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "900",
    },

    greetingRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 14,
      marginBottom: 16,
    },

    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.5,
      marginBottom: 6,
    },

    greeting: {
      color: c.text,
      fontSize: 28,
      fontWeight: "900",
      letterSpacing: -0.7,
      maxWidth: 235,
    },

    themePill: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 999,
    },

    themeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    heroCard: {
      backgroundColor: c.mode === "dark" ? "rgba(7,17,31,0.98)" : "#07111F",
      borderRadius: 26,
      padding: 22,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.mode === "dark" ? c.border : "rgba(0,0,0,0.06)",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },

    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 26,
    },

    heroLabel: {
      color: "#EAF0F6",
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 8,
    },

    heroTitle: {
      color: "#FFFFFF",
      fontSize: 42,
      fontWeight: "900",
      letterSpacing: -1.1,
    },

    heroSub: {
      color: "#D6DEE8",
      fontSize: 14,
      fontWeight: "700",
      marginTop: 5,
    },

    arrowLight: {
      color: "#FFFFFF",
      fontSize: 42,
      fontWeight: "500",
      marginTop: 12,
    },

    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    statBlock: {
      flex: 1,
    },

    statValue: {
      color: "#FFFFFF",
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 5,
    },

    statValueSmall: {
      fontSize: 15,
    },

    statLabel: {
      color: "#D6DEE8",
      fontSize: 14,
      fontWeight: "700",
    },

    divider: {
      width: 1,
      height: 58,
      backgroundColor: "rgba(255,255,255,0.16)",
      marginHorizontal: 12,
    },

    levelCard: {
      backgroundColor: c.mode === "dark" ? "rgba(21,31,43,0.94)" : "#FFF8E8",
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      marginBottom: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
    },

    levelIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: c.gold,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },

    levelMiddle: {
      flex: 1,
    },

    levelTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 4,
    },

    levelText: {
      color: c.muted,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      marginBottom: 10,
    },

    progressTrack: {
      height: 8,
      backgroundColor: c.mode === "dark" ? "rgba(212,175,55,0.18)" : "#F2DEAD",
      borderRadius: 999,
      overflow: "hidden",
    },

    progressFill: {
      width: "45%",
      height: "100%",
      backgroundColor: c.gold,
      borderRadius: 999,
    },

    levelCount: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
    },

    arrowDark: {
      color: c.text,
      fontSize: 30,
      fontWeight: "700",
    },

    goOnlineCard: {
      backgroundColor: c.card,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
      marginBottom: 28,
      overflow: "hidden",
    },

    cityArt: {
      position: "absolute",
      right: 16,
      top: 22,
      alignItems: "center",
      opacity: c.mode === "dark" ? 0.72 : 0.9,
    },

    cityEmoji: {
      fontSize: 64,
      opacity: 0.35,
    },

    carEmoji: {
      fontSize: 54,
      marginTop: -34,
    },

    goOnlineTitle: {
      color: c.text,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 10,
      maxWidth: "72%",
    },

    goOnlineText: {
      color: c.muted,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 22,
      marginBottom: 20,
      maxWidth: "78%",
    },

    primaryButton: {
      backgroundColor: c.gold,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      shadowColor: c.gold,
      shadowOpacity: 0.25,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
    },

    primaryButtonText: {
      color: c.mode === "dark" ? "#07111F" : "#FFFFFF",
      fontSize: 17,
      fontWeight: "900",
    },

    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    sectionTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 14,
      letterSpacing: -0.4,
    },

    seeAll: {
      color: c.gold,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 14,
    },

    opportunityCard: {
      backgroundColor: c.card,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: c.lightBorder,
      padding: 17,
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
      marginBottom: 30,
    },

    smartIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.mode === "dark" ? "rgba(212,175,55,0.20)" : "#FCE8B6",
      alignItems: "center",
      justifyContent: "center",
    },

    opportunityTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 4,
    },

    opportunitySub: {
      color: c.muted,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 4,
    },

    opportunityGreen: {
      color: "#16A34A",
      fontSize: 13,
      fontWeight: "800",
    },

    pricePill: {
      backgroundColor: c.mode === "dark" ? "rgba(212,175,55,0.16)" : "#FFF0CC",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },

    priceText: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
    },

    menuTitle: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1.3,
      textTransform: "uppercase",
      marginBottom: 12,
      marginTop: 4,
    },

    toolCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lightBorder,
      borderRadius: 23,
      padding: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },

    toolIconBox: {
      width: 50,
      height: 50,
      borderRadius: 17,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
    },

    toolTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 4,
    },

    toolSub: {
      color: c.muted,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
    },

    toolArrow: {
      color: c.gold,
      fontSize: 32,
      fontWeight: "800",
    },

    dropdownWrap: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.lightBorder,
      borderRadius: 23,
      marginBottom: 12,
      overflow: "hidden",
    },

    dropdownHeader: {
      minHeight: 62,
      paddingHorizontal: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    dropdownTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
    },

    dropdownArrow: {
      color: c.gold,
      fontSize: 28,
      fontWeight: "900",
    },

    dropdownBody: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      borderTopWidth: 1,
      borderTopColor: c.lightBorder,
    },

    listItem: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
    },

    smallIcon: {
      width: 36,
      height: 36,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },

    dangerIcon: {
      borderColor: c.mode === "dark" ? "rgba(239,68,68,0.45)" : "rgba(220,38,38,0.30)",
    },

    listText: {
      color: c.text,
      fontSize: 16.5,
      fontWeight: "800",
      flex: 1,
    },

    listArrow: {
      color: c.gold,
      fontSize: 27,
      fontWeight: "800",
    },

    dangerText: {
      color: c.danger,
    },

    footerCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 23,
      padding: 18,
      marginTop: 4,
    },

    footerTitle: {
      color: c.gold,
      textAlign: "center",
      fontWeight: "900",
      fontSize: 17,
      marginBottom: 8,
    },

    footerText: {
      color: c.text,
      textAlign: "center",
      fontWeight: "800",
      lineHeight: 22,
    },

    menuBackdrop: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: c.mode === "dark" ? "rgba(0,0,0,0.38)" : "rgba(0,0,0,0.18)",
    },

    bottomMenuPanel: {
      position: "absolute",
      left: 18,
      right: 18,
      bottom: 102,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 28,
      padding: 18,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 16,
    },

    bottomMenuTitle: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 14,
      textAlign: "center",
    },

    bottomMenuGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },

    menuOption: {
      width: "31.5%",
      minHeight: 86,
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.lightBorder,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      paddingHorizontal: 6,
      gap: 7,
    },

    menuOptionTitle: {
      color: c.text,
      fontSize: 12.5,
      fontWeight: "900",
      textAlign: "center",
    },

    logoutButton: {
      marginTop: 4,
      height: 48,
      borderRadius: 17,
      backgroundColor: c.mode === "dark" ? "rgba(239,68,68,0.16)" : "#FEE2E2",
      borderWidth: 1,
      borderColor: c.mode === "dark" ? "rgba(239,68,68,0.4)" : "rgba(220,38,38,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },

    logoutText: {
      color: c.mode === "dark" ? "#FCA5A5" : "#991B1B",
      fontWeight: "900",
      fontSize: 15,
    },

    bottomNav: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 92,
      backgroundColor: c.nav,
      borderTopWidth: 1,
      borderTopColor: c.lightBorder,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingBottom: 14,
      paddingHorizontal: 8,
    },

    bottomTab: {
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
    },

    bottomLabel: {
      color: c.muted,
      fontSize: 11,
      fontWeight: "900",
      marginTop: 4,
    },

    bottomLabelActive: {
      color: c.gold,
    },

    centerMenuButton: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 26,
      shadowColor: c.gold,
      shadowOpacity: 0.35,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
      borderWidth: 4,
      borderColor: c.mode === "dark" ? "#050B16" : "#FFFFFF",
    },
  });
}