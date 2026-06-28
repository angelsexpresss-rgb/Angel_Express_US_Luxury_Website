import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
  Building2,
  Bus,
  CalendarDays,
  Camera,
  ChevronRight,
  Globe2,
  GraduationCap,
  MapPinned,
  Plane,
  Route,
  Search,
  Trophy,
  Utensils,
} from "lucide-react-native";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

function openUrl(url: string) {
  Linking.openURL(url);
}

const conciergeItems = [
  {
    category: "Stay",
    title: "Hotels & Reservations",
    text: "Find hotels near Dallas, DFW Airport, Love Field, AT&T Stadium, and event venues.",
    button: "Search Hotels",
    icon: <Building2 size={26} color={GOLD} />,
    onPress: () => openUrl("https://www.google.com/travel/hotels/Dallas"),
  },
  {
    category: "Events",
    title: "Events in Dallas/Fort Worth",
    text: "Discover concerts, sports, festivals, conferences, and local events.",
    button: "Find Events",
    icon: <CalendarDays size={26} color={GOLD} />,
    onPress: () =>
      openUrl("https://www.google.com/search?q=events+in+Dallas+Fort+Worth+this+weekend"),
  },
  {
    category: "Events",
    title: "World Cup / Event Mode",
    text: "Plan private rides to stadiums, airports, hotels, fan zones, and watch parties.",
    button: "World Cup Travel Support",
    icon: <Trophy size={26} color={GOLD} />,
    onPress: () =>
      openUrl("https://www.google.com/search?q=World+Cup+2026+Dallas+matches+AT%26T+Stadium"),
  },
  {
    category: "Food",
    title: "Restaurants",
    text: "Find restaurants near your pickup, hotel, airport, or stadium.",
    button: "Search Restaurants",
    icon: <Utensils size={26} color={GOLD} />,
    onPress: () =>
      openUrl("https://www.google.com/maps/search/restaurants+near+Dallas+TX"),
  },
  {
    category: "Airport",
    title: "Flights",
    text: "Check flight status for DFW Airport and Dallas Love Field.",
    button: "Check Flights",
    icon: <Plane size={26} color={GOLD} />,
    onPress: () => openUrl("https://www.google.com/search?q=DFW+flight+status"),
  },
  {
    category: "Explore",
    title: "Tourism",
    text: "Explore Dallas attractions, museums, nightlife, shopping, and family activities.",
    button: "Explore Dallas",
    icon: <Camera size={26} color={GOLD} />,
    onPress: () => openUrl("https://www.visitdallas.com/"),
  },
  {
    category: "Transit",
    title: "Bus Routes",
    text: "Check Dallas public transit routes, schedules, and nearby stations.",
    button: "View DART Routes",
    icon: <Bus size={26} color={GOLD} />,
    onPress: () => openUrl("https://www.dart.org/"),
  },
  {
    category: "Transit",
    title: "Live Traffic Report",
    text: "Check live traffic before your ride and plan extra time.",
    button: "Open Live Traffic",
    icon: <Route size={26} color={GOLD} />,
    onPress: () =>
      openUrl("https://www.google.com/maps/@32.7767,-96.7970,11z/data=!5m1!1e1"),
  },
  {
    category: "Airport",
    title: "Airport Guide",
    text: "DFW Airport and Dallas Love Field pickup guidance, terminals, and travel tips.",
    button: "Airport Info",
    icon: <MapPinned size={26} color={GOLD} />,
    onPress: () =>
      openUrl("https://www.google.com/search?q=DFW+Airport+terminal+guide"),
  },
  {
    category: "Student",
    title: "Student Travel Guide",
    text: "Campus rides for UTD, UTA, SMU, UNT, Texas A&M, and UT Austin.",
    button: "Open Student Travel",
    icon: <GraduationCap size={26} color={GOLD} />,
    onPress: () => router.push("/student-travel" as any),
  },
  {
    category: "Events",
    title: "World Cup 2026 Travel Support",
    text: "Airport pickup, hotel transfer, stadium ride, group travel, and private city-to-city rides.",
    button: "Plan World Cup Ride",
    icon: <Globe2 size={26} color={GOLD} />,
    onPress: () => router.push("/book-ride" as any),
  },
];

const categories = ["All", "Airport", "Stay", "Food", "Events", "Transit", "Student", "Explore"];

export default function TravelConciergeScreen() {
  const [activeCategory, setActiveCategory] = useState("All");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const filteredItems =
    activeCategory === "All"
      ? conciergeItems
      : conciergeItems.filter((item) => item.category === activeCategory);

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
              <Text style={styles.kickerText}>A  PREMIUM TRAVEL SUPPORT</Text>
            </View>

            <Text style={styles.title}>Angel Travel Concierge</Text>

            <Text style={styles.subtitle}>
              Plan your stay, flight, food, traffic, student travel, airport movement,
              events, and World Cup ride support from one professional travel hub.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroTitle}>Need a private ride?</Text>
                <Text style={styles.heroText}>
                  Book airport, hotel, campus, event, or city-to-city transportation.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.heroAction}
                onPress={() => router.push("/book-ride" as any)}
              >
                <ChevronRight size={26} color={AE_COLORS.navy2} />
              </TouchableOpacity>
            </AngelCard>

            <View style={styles.searchBar}>
              <Search size={18} color={GOLD} />
              <Text style={styles.searchText}>
                Choose a travel need below. Angel Express will guide the next step.
              </Text>
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
                    activeCategory === category && styles.categoryPillActive,
                  ]}
                  onPress={() => setActiveCategory(category)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      activeCategory === category && styles.categoryTextActive,
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
                icon={<Plane size={19} color={GOLD} />}
              />
              <MiniFeature
                label="Events"
                value="World Cup Ready"
                icon={<Trophy size={19} color={GOLD} />}
              />
              <MiniFeature
                label="Students"
                value="Campus Travel"
                icon={<GraduationCap size={19} color={GOLD} />}
              />
            </View>

            <Text style={styles.sectionTitle}>
              {activeCategory === "All" ? "Concierge Services" : `${activeCategory} Support`}
            </Text>

            {filteredItems.map((item, index) => (
              <ConciergeCard
                key={`${item.title}-${index}`}
                icon={item.icon}
                title={item.title}
                text={item.text}
                button={item.button}
                onPress={item.onPress}
              />
            ))}

            <AngelHeroButton
              title="Plan a Ride Now"
              onPress={() => router.push("/book-ride" as any)}
              variant="gold"
              style={styles.bottomButton}
            />
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function MiniFeature({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
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
  title,
  text,
  button,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  button: string;
  onPress: () => void;
}) {
  return (
    <AngelCard style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>{icon}</View>

        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardText}>{text}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cardButton} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.cardButtonText}>{button}</Text>
        <ChevronRight size={19} color={AE_COLORS.navy2} />
      </TouchableOpacity>
    </AngelCard>
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
    backgroundColor: "rgba(5,11,22,0.92)",
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 22,
    paddingTop: 56,
    paddingBottom: 50,
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
    minHeight: 122,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  heroLeft: {
    flex: 1,
    paddingRight: 14,
  },

  heroTitle: {
    color: AE_COLORS.navy2,
    fontSize: 25,
    fontWeight: "900",
    marginBottom: 6,
  },

  heroText: {
    color: "rgba(6,17,31,0.78)",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },

  heroAction: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(6,17,31,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  searchBar: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  searchText: {
    color: AE_COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  categoryRow: {
    gap: 10,
    paddingRight: 20,
    marginBottom: 18,
  },

  categoryPill: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  categoryPillActive: {
    backgroundColor: GOLD,
    borderColor: AE_COLORS.goldLight,
  },

  categoryText: {
    color: AE_COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  categoryTextActive: {
    color: AE_COLORS.navy2,
  },

  featureGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },

  miniCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    backgroundColor: "rgba(13,20,34,0.84)",
    padding: 12,
    justifyContent: "space-between",
  },

  miniIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  miniLabel: {
    color: AE_COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
  },

  miniValue: {
    color: AE_COLORS.white,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },

  sectionTitle: {
    color: AE_COLORS.white,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 14,
  },

  card: {
    padding: 18,
    marginBottom: 16,
  },

  cardTop: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardCopy: {
    flex: 1,
  },

  cardTitle: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 7,
  },

  cardText: {
    color: AE_COLORS.white,
    fontSize: 14.5,
    lineHeight: 22,
  },

  cardButton: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: GOLD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  cardButtonText: {
    color: AE_COLORS.navy2,
    fontSize: 15,
    fontWeight: "900",
  },

  bottomButton: {
    marginTop: 8,
  },
});