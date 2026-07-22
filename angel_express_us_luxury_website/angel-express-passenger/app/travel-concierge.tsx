import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  Building2,
  Bus,
  CalendarDays,
  Camera,
  CarFront,
  ChevronRight,
  Clock3,
  Compass,
  GraduationCap,
  Headphones,
  MapPinned,
  Navigation,
  Plane,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {
    // Keep navigation failures from crashing the concierge screen.
  });
}

const categories = [
  "All",
  "Airport",
  "Stay",
  "Food",
  "Events",
  "Transit",
  "Student",
  "Explore",
];

export default function TravelConciergeScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeCategory, setActiveCategory] = useState("All");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const heroPulse = useRef(new Animated.Value(1)).current;

  const conciergeItems = useMemo(
    () => [
      {
        category: "Airport",
        title: "Airport Ride Planning",
        text: "Plan pickup or drop-off at DFW Airport and Dallas Love Field with terminal-aware travel guidance.",
        button: "Book Airport Ride",
        badge: "Private Ride",
        icon: <Plane size={25} color={colors.gold} />,
        onPress: () => router.push("/book-ride" as any),
      },
      {
        category: "Stay",
        title: "Hotels & Reservations",
        text: "Find hotels near airports, downtown Dallas, campuses, event venues, and major business districts.",
        button: "Search Hotels",
        badge: "Stay",
        icon: <Building2 size={25} color={colors.gold} />,
        onPress: () =>
          openUrl("https://www.google.com/travel/hotels/Dallas"),
      },
      {
        category: "Events",
        title: "Event Transportation",
        text: "Arrange professional rides for concerts, conferences, games, ceremonies, private functions, and group outings.",
        button: "Plan Event Ride",
        badge: "Event Service",
        icon: <CalendarDays size={25} color={colors.gold} />,
        onPress: () => router.push("/book-ride" as any),
      },
      {
        category: "Food",
        title: "Restaurants & Dining",
        text: "Discover restaurants near your hotel, airport, campus, event venue, or current destination.",
        button: "Find Restaurants",
        badge: "Dining",
        icon: <Utensils size={25} color={colors.gold} />,
        onPress: () =>
          openUrl(
            "https://www.google.com/maps/search/restaurants+near+Dallas+TX"
          ),
      },
      {
        category: "Airport",
        title: "Flight Status",
        text: "Check arrivals, departures, delays, and gate updates before leaving for the airport.",
        button: "Check Flights",
        badge: "Live Information",
        icon: <Clock3 size={25} color={colors.gold} />,
        onPress: () =>
          openUrl("https://www.google.com/search?q=DFW+flight+status"),
      },
      {
        category: "Explore",
        title: "Explore Dallas",
        text: "Discover museums, shopping, family attractions, nightlife, landmarks, and local experiences.",
        button: "Explore Dallas",
        badge: "City Guide",
        icon: <Camera size={25} color={colors.gold} />,
        onPress: () => openUrl("https://www.visitdallas.com/"),
      },
      {
        category: "Transit",
        title: "Public Transit Routes",
        text: "Check DART rail, bus routes, schedules, stations, and connections across the Dallas area.",
        button: "View DART Routes",
        badge: "Transit",
        icon: <Bus size={25} color={colors.gold} />,
        onPress: () => openUrl("https://www.dart.org/"),
      },
      {
        category: "Transit",
        title: "Live Traffic Conditions",
        text: "Review current traffic before your ride and allow extra travel time when roads are busy.",
        button: "Open Live Traffic",
        badge: "Road Update",
        icon: <Route size={25} color={colors.gold} />,
        onPress: () =>
          openUrl(
            "https://www.google.com/maps/@32.7767,-96.7970,11z/data=!5m1!1e1"
          ),
      },
      {
        category: "Airport",
        title: "Airport Terminal Guide",
        text: "Find terminal information, pickup zones, airline locations, and airport navigation support.",
        button: "Open Airport Guide",
        badge: "Terminal Help",
        icon: <MapPinned size={25} color={colors.gold} />,
        onPress: () =>
          openUrl(
            "https://www.google.com/search?q=DFW+Airport+terminal+guide"
          ),
      },
      {
        category: "Student",
        title: "Student Travel Guide",
        text: "Access campus ride support for UTD, UTA, SMU, UNT, Texas A&M, UT Austin, and surrounding areas.",
        button: "Open Student Travel",
        badge: "Student Support",
        icon: <GraduationCap size={25} color={colors.gold} />,
        onPress: () => router.push("/student-travel" as any),
      },
      {
        category: "Explore",
        title: "City-to-City Travel",
        text: "Plan private transportation between Dallas, Austin, Houston, San Antonio, College Station, and nearby cities.",
        button: "Plan Long-Distance Ride",
        badge: "Long Distance",
        icon: <Navigation size={25} color={colors.gold} />,
        onPress: () => router.push("/book-ride" as any),
      },
      {
        category: "Events",
        title: "Group & Private Travel",
        text: "Coordinate transportation for families, teams, colleagues, guests, and small private groups.",
        button: "Request Group Ride",
        badge: "Group Travel",
        icon: <CarFront size={25} color={colors.gold} />,
        onPress: () => router.push("/book-ride" as any),
      },
    ],
    [colors]
  );

  useEffect(() => {
    const backgroundAnimation = Animated.loop(
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

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, {
          toValue: 1.03,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(heroPulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    backgroundAnimation.start();
    pulseAnimation.start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    return () => {
      backgroundAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const filteredItems =
    activeCategory === "All"
      ? conciergeItems
      : conciergeItems.filter(
          (item) => item.category === activeCategory
        );

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.bgWrap,
          { transform: [{ scale: bgScale }] },
        ]}
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
              activeOpacity={0.85}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.themePill}
              onPress={toggleTheme}
              activeOpacity={0.85}
            >
              <Text style={styles.themeText}>
                {themeMode === "dark"
                  ? "☀️ Light"
                  : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <View style={styles.headingBlock}>
              <View style={styles.eyebrowRow}>
                <Sparkles size={15} color={colors.gold} />
                <Text style={styles.kicker}>
                  PREMIUM TRAVEL SUPPORT
                </Text>
              </View>

              <Text style={styles.title}>
                Angel Travel Concierge
              </Text>

              <Text style={styles.subtitle}>
                Plan transportation, airport movement, hotels,
                dining, traffic, campus travel, events, and city
                experiences from one polished travel hub.
              </Text>
            </View>

            <Animated.View
              style={[
                styles.heroCard,
                { transform: [{ scale: heroPulse }] },
              ]}
            >
              <View style={styles.heroIconWrap}>
                <CarFront
                  size={31}
                  color={colors.navy}
                  strokeWidth={2.3}
                />
              </View>

              <View style={styles.heroLeft}>
                <Text style={styles.heroLabel}>
                  ANGEL EXPRESS PRIVATE RIDES
                </Text>
                <Text style={styles.heroTitle}>
                  Where can we take you?
                </Text>
                <Text style={styles.heroText}>
                  Book airport, hotel, campus, event, local, or
                  city-to-city transportation.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.heroAction}
                onPress={() =>
                  router.push("/book-ride" as any)
                }
                activeOpacity={0.85}
              >
                <ChevronRight
                  size={25}
                  color={colors.navy}
                />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.trustRow}>
              <TrustBadge
                icon={
                  <ShieldCheck
                    size={16}
                    color="#22c55e"
                  />
                }
                text="Trusted Travel"
                styles={styles}
              />

              <TrustBadge
                icon={
                  <Clock3 size={16} color="#22c55e" />
                }
                text="Scheduled Rides"
                styles={styles}
              />

              <TrustBadge
                icon={
                  <Headphones
                    size={16}
                    color="#22c55e"
                  />
                }
                text="Support"
                styles={styles}
              />
            </View>

            <View style={styles.searchBar}>
              <Search size={18} color={colors.gold} />

              <View style={styles.searchCopy}>
                <Text style={styles.searchTitle}>
                  Choose a travel service
                </Text>
                <Text style={styles.searchText}>
                  Select a category below and continue to the
                  service you need.
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryPill,
                    activeCategory === category &&
                      styles.categoryPillActive,
                  ]}
                  onPress={() =>
                    setActiveCategory(category)
                  }
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      activeCategory === category &&
                        styles.categoryTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.featureGrid}>
              <MiniFeature
                label="Airport"
                value="DFW & Love Field"
                icon={
                  <Plane size={19} color={colors.gold} />
                }
                styles={styles}
              />

              <MiniFeature
                label="Private Travel"
                value="Local & Long Distance"
                icon={
                  <Navigation
                    size={19}
                    color={colors.gold}
                  />
                }
                styles={styles}
              />

              <MiniFeature
                label="Students"
                value="Campus Travel"
                icon={
                  <GraduationCap
                    size={19}
                    color={colors.gold}
                  />
                }
                styles={styles}
              />
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>
                  PERSONALIZED SUPPORT
                </Text>

                <Text style={styles.sectionTitle}>
                  {activeCategory === "All"
                    ? "Concierge Services"
                    : `${activeCategory} Support`}
                </Text>
              </View>

              <View style={styles.countPill}>
                <Text style={styles.countText}>
                  {filteredItems.length}
                </Text>
              </View>
            </View>

            {filteredItems.map((item, index) => (
              <ConciergeCard
                key={`${item.title}-${index}`}
                icon={item.icon}
                badge={item.badge}
                title={item.title}
                text={item.text}
                button={item.button}
                onPress={item.onPress}
                styles={styles}
                colors={colors}
              />
            ))}

            <View style={styles.supportCard}>
              <View style={styles.supportIcon}>
                <Compass size={28} color={colors.gold} />
              </View>

              <View style={styles.supportCopy}>
                <Text style={styles.supportTitle}>
                  Need help planning the full trip?
                </Text>

                <Text style={styles.supportText}>
                  Start your ride request and include any airport,
                  hotel, group, student, or special travel details.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.bottomButton}
              onPress={() =>
                router.push("/book-ride" as any)
              }
              activeOpacity={0.88}
            >
              <CarFront size={20} color={colors.navy} />
              <Text style={styles.bottomButtonText}>
                Plan a Ride Now
              </Text>
              <ChevronRight
                size={20}
                color={colors.navy}
              />
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Angel Express Mobility • Premium Private
              Transportation
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function TrustBadge({
  icon,
  text,
  styles,
}: {
  icon: React.ReactNode;
  text: string;
  styles: any;
}) {
  return (
    <View style={styles.trustBadge}>
      {icon}
      <Text style={styles.trustBadgeText}>{text}</Text>
    </View>
  );
}

function MiniFeature({
  label,
  value,
  icon,
  styles,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  styles: any;
}) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniIcon}>{icon}</View>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function ConciergeCard({
  icon,
  badge,
  title,
  text,
  button,
  onPress,
  styles,
  colors,
}: {
  icon: React.ReactNode;
  badge: string;
  title: string;
  text: string;
  button: string;
  onPress: () => void;
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>{icon}</View>

        <View style={styles.cardCopy}>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>
              {badge}
            </Text>
          </View>

          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardText}>{text}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.cardButton}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.cardButtonText}>{button}</Text>

        <ChevronRight
          size={19}
          color={colors.navy}
        />
      </TouchableOpacity>
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

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 22,
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

    headingBlock: {
      marginBottom: 22,
    },
    eyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 10,
    },
    kicker: {
      color: c.gold,
      fontSize: 11.5,
      fontWeight: "900",
      letterSpacing: 1.5,
    },
    title: {
      color: c.text,
      fontSize: 38,
      lineHeight: 43,
      fontWeight: "900",
      marginBottom: 11,
      letterSpacing: -0.9,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      fontWeight: "700",
      maxWidth: 620,
    },

    heroCard: {
      minHeight: 150,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      backgroundColor: c.gold,
      borderRadius: 25,
      padding: 18,
      gap: 13,
      ...v5Shadow(c),
    },
    heroIconWrap: {
      width: 55,
      height: 55,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.29)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroLeft: {
      flex: 1,
    },
    heroLabel: {
      color: c.navy,
      fontSize: 9.5,
      fontWeight: "900",
      letterSpacing: 1,
      opacity: 0.78,
      marginBottom: 4,
    },
    heroTitle: {
      color: c.navy,
      fontSize: 23,
      lineHeight: 27,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.navy,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "800",
      opacity: 0.82,
    },
    heroAction: {
      width: 45,
      height: 45,
      borderRadius: 15,
      backgroundColor: "rgba(255,255,255,0.32)",
      alignItems: "center",
      justifyContent: "center",
    },

    trustRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 18,
    },
    trustBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(34,197,94,0.10)",
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.28)",
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    trustBadgeText: {
      color: "#22c55e",
      fontSize: 11.5,
      fontWeight: "900",
    },

    searchBar: {
      minHeight: 70,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    searchCopy: {
      flex: 1,
    },
    searchTitle: {
      color: c.text,
      fontSize: 14.5,
      fontWeight: "900",
      marginBottom: 3,
    },
    searchText: {
      color: c.text2,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },

    categoryRow: {
      gap: 10,
      paddingRight: 20,
      marginBottom: 20,
    },
    categoryPill: {
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    categoryPillActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    categoryText: {
      color: c.text,
      fontSize: 13.5,
      fontWeight: "900",
    },
    categoryTextActive: {
      color: c.navy,
    },

    featureGrid: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 26,
    },
    miniCard: {
      flex: 1,
      minHeight: 112,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card,
      padding: 12,
      justifyContent: "space-between",
      ...v5Shadow(c),
    },
    miniIcon: {
      width: 35,
      height: 35,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    miniLabel: {
      color: c.text2,
      fontSize: 10.5,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    miniValue: {
      color: c.text,
      fontSize: 13,
      fontWeight: "900",
      lineHeight: 17,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 14,
      marginBottom: 15,
    },
    sectionKicker: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 25,
      fontWeight: "900",
    },
    countPill: {
      minWidth: 39,
      height: 39,
      borderRadius: 14,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    countText: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 18,
      marginBottom: 16,
      ...v5Shadow(c),
    },
    cardTop: {
      flexDirection: "row",
      gap: 14,
      marginBottom: 17,
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardCopy: {
      flex: 1,
    },
    cardBadge: {
      alignSelf: "flex-start",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
      marginBottom: 8,
    },
    cardBadgeText: {
      color: c.gold,
      fontSize: 9.5,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    cardTitle: {
      color: c.text,
      fontSize: 19,
      fontWeight: "900",
      marginBottom: 7,
    },
    cardText: {
      color: c.text2,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },
    cardButton: {
      minHeight: 50,
      borderRadius: 15,
      backgroundColor: c.gold,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    cardButtonText: {
      color: c.navy,
      fontSize: 13.5,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
    },

    supportCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 18,
      marginTop: 4,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      ...v5Shadow(c),
    },
    supportIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    supportCopy: {
      flex: 1,
    },
    supportTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 5,
    },
    supportText: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },

    bottomButton: {
      minHeight: 57,
      borderRadius: 17,
      backgroundColor: c.gold,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      marginTop: 2,
      ...v5Shadow(c),
    },
    bottomButtonText: {
      color: c.navy,
      fontSize: 15.5,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    footerText: {
      color: c.text2,
      textAlign: "center",
      fontSize: 10.5,
      lineHeight: 16,
      fontWeight: "800",
      letterSpacing: 0.4,
      marginTop: 20,
    },
  });
}
