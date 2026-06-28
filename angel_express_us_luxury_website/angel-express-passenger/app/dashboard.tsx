import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { registerForPushNotifications } from "../lib/notifications";
import { supabase } from "../lib/supabase";

export default function DashboardScreen() {
  const [firstName, setFirstName] = useState("Passenger");
  const [openSection, setOpenSection] = useState<string | null>("safety");

  useEffect(() => {
    registerForPushNotifications();
    loadPassengerName();
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
    <ImageBackground
      source={require("../assets/images/dashboard-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.smallText}>Welcome back,</Text>
              <Text style={styles.name}>{firstName}</Text>
              <Text style={styles.tagline}>Safe. Reliable. Professional.</Text>
            </View>

            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>A</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bookCard}
            onPress={() => router.push("/book-ride" as any)}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.bookTitle}>Book a Ride</Text>
              <Text style={styles.bookSub}>Reserve your next private trip</Text>
            </View>
            <Text style={styles.arrowDark}>›</Text>
          </TouchableOpacity>

          <HorizontalSection title="Ride Management">
            <QuickCard title="Book a Ride" onPress={() => router.push("/book-ride" as any)} />
            <QuickCard title="My Trips" onPress={() => router.push("/my-trips" as any)} />
            <QuickCard
              title="Track Live Trip"
              onPress={() =>
                router.push({
                  pathname: "/live-trip" as any,
                  params: { invoice_no: "AE-20260614-723991" },
                })
              }
            />
            <QuickCard title="Luxury Ride Prep+" onPress={() => router.push("/luxury-ride-prep" as any)} />
          </HorizontalSection>

          <HorizontalSection title="Travel Concierge">
            <QuickCard title="Angel Travel Concierge" onPress={() => router.push("/travel-concierge" as any)} />
            <QuickCard title="Student Travel Mode+" onPress={() => router.push("/student-travel" as any)} />
            <QuickCard title="Multi-Language Assistant" onPress={() => router.push("/language-assistant" as any)} />
            <QuickCard title="AI Ride Assistant" onPress={() => router.push("/ai-assistant" as any)} />
          </HorizontalSection>

          <DropdownSection
            title="Safety & Support"
            isOpen={openSection === "safety"}
            onPress={() => setOpenSection(openSection === "safety" ? null : "safety")}
          >
            <ListItem title="Angel Safety Share" onPress={() => router.push("/safety-share" as any)} />
            <ListItem title="Family Check-In+" onPress={() => router.push("/family-checkin" as any)} />
            <ListItem title="Support Center" onPress={() => router.push("/support" as any)} />
          </DropdownSection>

          <DropdownSection
            title="Passenger Account"
            isOpen={openSection === "passenger"}
            onPress={() => setOpenSection(openSection === "passenger" ? null : "passenger")}
          >
            <ListItem title="Profile" onPress={() => router.push("/profile" as any)} />
            <ListItem title="Passenger Card" onPress={() => router.push("/passenger-card" as any)} />
            <ListItem title="Rewards" onPress={() => router.push("/rewards" as any)} />
          </DropdownSection>

          <DropdownSection
            title="Account & Settings"
            isOpen={openSection === "settings"}
            onPress={() => setOpenSection(openSection === "settings" ? null : "settings")}
          >
            <ListItem title="Notification Preferences" onPress={() => router.push("/notification-preferences" as any)} />
            <ListItem title="Privacy & Account" onPress={() => router.push("/privacy-account" as any)} />
            <ListItem title="About Angel Express" onPress={() => router.push("/about" as any)} />
            <ListItem title="Log Out" onPress={handleLogout} danger />
          </DropdownSection>

          <DropdownSection
            title="Unique Angel Features"
            isOpen={openSection === "features"}
            onPress={() => setOpenSection(openSection === "features" ? null : "features")}
          >
            <FeatureItem title="Push Ride Updates" text="Driver assigned, ride confirmed, driver arriving, trip started, arrived safely, and rewards earned." />
            <FeatureItem title="Live GPS Tracking" text="Track your active ride, driver location, ETA, vehicle, and plate number." />
            <FeatureItem title="Student Travel Mode" text="Discounted student routes, campus pickup points, and group rides." />
            <FeatureItem title="World Cup/Event Mode" text="Hotel pickup, stadium routes, airport transfers, and event support." />
            <FeatureItem title="Luxury Ride Prep" text="Luggage, ID, timing, and driver details before pickup." />
            <FeatureItem title="Family Check-In" text="Send pickup, halfway, and arrival updates to loved ones." />
          </DropdownSection>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

function HorizontalSection({ title, children }: any) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {children}
      </ScrollView>
    </View>
  );
}

function QuickCard({ title, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>A</Text>
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.goldArrow}>›</Text>
    </TouchableOpacity>
  );
}

function DropdownSection({ title, isOpen, onPress, children }: any) {
  return (
    <View style={styles.dropdown}>
      <TouchableOpacity style={styles.dropdownHeader} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.dropdownTitle}>{title}</Text>
        <Text style={styles.dropdownArrow}>{isOpen ? "−" : "+"}</Text>
      </TouchableOpacity>

      {isOpen && <View style={styles.dropdownBody}>{children}</View>}
    </View>
  );
}

function ListItem({ title, onPress, danger }: any) {
  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.smallIcon, danger && styles.dangerIcon]}>
        <Text style={[styles.smallIconText, danger && styles.dangerText]}>A</Text>
      </View>

      <Text style={[styles.listText, danger && styles.dangerText]}>{title}</Text>
      <Text style={[styles.listArrow, danger && styles.dangerText]}>›</Text>
    </TouchableOpacity>
  );
}

function FeatureItem({ title, text }: any) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#050b16" },
  overlay: { flex: 1, backgroundColor: "rgba(5,11,22,0.90)" },
  container: { flex: 1 },
  content: { paddingTop: 64, paddingHorizontal: 22, paddingBottom: 42 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },

  smallText: { color: "#DDE3EA", fontSize: 18 },
  name: { color: "#D4AF37", fontSize: 38, fontWeight: "900", marginTop: 4 },
  tagline: { color: "#B8C1CC", fontSize: 15, marginTop: 8 },

  logoMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },

  logoMarkText: {
    color: "#06111f",
    fontSize: 32,
    fontWeight: "900",
    fontStyle: "italic",
  },

  bookCard: {
    backgroundColor: "#D4AF37",
    borderRadius: 24,
    padding: 22,
    minHeight: 104,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },

  bookTitle: { color: "#06111f", fontSize: 28, fontWeight: "900" },
  bookSub: { color: "rgba(6,17,31,0.75)", fontSize: 16, marginTop: 5 },
  arrowDark: { color: "#06111f", fontSize: 46, fontWeight: "300" },

  section: { marginBottom: 28 },
  sectionTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", marginBottom: 14 },
  row: { gap: 14, paddingRight: 20 },

  quickCard: {
    width: 152,
    height: 148,
    backgroundColor: "rgba(13,20,34,0.9)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    padding: 16,
    justifyContent: "space-between",
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  iconText: { color: "#D4AF37", fontSize: 24, fontWeight: "900", fontStyle: "italic" },
  quickTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900", lineHeight: 22 },
  goldArrow: { color: "#D4AF37", fontSize: 30, alignSelf: "flex-end" },

  dropdown: { marginBottom: 10 },

  dropdownHeader: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  dropdownTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  dropdownArrow: { color: "#D4AF37", fontSize: 30, fontWeight: "300" },
  dropdownBody: { paddingTop: 8, paddingBottom: 10 },

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

  smallIconText: { color: "#D4AF37", fontSize: 19, fontWeight: "900", fontStyle: "italic" },
  listText: { color: "#E8EDF3", fontSize: 18, flex: 1 },
  listArrow: { color: "#D4AF37", fontSize: 28 },

  featureItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  featureTitle: { color: "#D4AF37", fontSize: 17, fontWeight: "900", marginBottom: 5 },
  featureText: { color: "#B8C1CC", fontSize: 14.5, lineHeight: 22 },

  dangerIcon: { borderColor: "rgba(255,107,107,0.45)" },
  dangerText: { color: "#FF6B6B" },
});