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
  const firstName = "Jude";
  const [openSection, setOpenSection] = useState("ride");

  useEffect(() => {
    registerForPushNotifications();
  }, []);

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
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.brand}>Angel Express Mobility</Text>
          <Text style={styles.pageTitle}>AEM Dashboard</Text>
          <Text style={styles.welcome}>Welcome, {firstName} 👋</Text>

          <Text style={styles.subtitle}>
            Premium travel, safety, comfort, and smart ride tools in one place.
          </Text>

          <DashboardSection
            title="Ride Management"
            icon="🚗"
            isOpen={openSection === "ride"}
            onPress={() => setOpenSection(openSection === "ride" ? "" : "ride")}
          >
            <DashboardButton icon="🚗" title="Book a Ride" onPress={() => router.push("/book-ride" as any)} />
            <DashboardButton icon="📍" title="My Trips" onPress={() => router.push("/my-trips" as any)} />
            <DashboardButton
              icon="🛰️"
              title="Track Live Trip"
              onPress={() =>
                router.push({
                  pathname: "/live-trip" as any,
                  params: { invoice_no: "AE-20260614-723991" },
                })
              }
            />
            <DashboardButton icon="🧳" title="Luxury Ride Prep+" onPress={() => router.push("/luxury-ride-prep" as any)} />
          </DashboardSection>

          <DashboardSection
            title="Safety & Support"
            icon="🛡️"
            isOpen={openSection === "safety"}
            onPress={() => setOpenSection(openSection === "safety" ? "" : "safety")}
          >
            <DashboardButton icon="🛡️" title="Angel Safety Share" onPress={() => router.push("/safety-share" as any)} />
            <DashboardButton icon="👨‍👩‍👧" title="Family Check-In+" onPress={() => router.push("/family-checkin" as any)} />
            <DashboardButton icon="🛟" title="Support Center" onPress={() => router.push("/support" as any)} />
          </DashboardSection>

          <DashboardSection
            title="Passenger Account"
            icon="👤"
            isOpen={openSection === "passenger"}
            onPress={() => setOpenSection(openSection === "passenger" ? "" : "passenger")}
          >
            <DashboardButton icon="👤" title="Profile" onPress={() => router.push("/profile" as any)} />
            <DashboardButton icon="🪪" title="Passenger Card" onPress={() => router.push("/passenger-card" as any)} />
            <DashboardButton icon="🎁" title="Rewards" onPress={() => router.push("/rewards" as any)} />
          </DashboardSection>

          <DashboardSection
            title="Travel Concierge"
            icon="🛎️"
            isOpen={openSection === "travel"}
            onPress={() => setOpenSection(openSection === "travel" ? "" : "travel")}
          >
            <DashboardButton icon="🛎️" title="Angel Travel Concierge" onPress={() => router.push("/travel-concierge" as any)} />
            <DashboardButton icon="🎓" title="Student Travel Mode+" onPress={() => router.push("/student-travel" as any)} />
            <DashboardButton icon="🌐" title="Multi-Language Assistant" onPress={() => router.push("/language-assistant" as any)} />
            <DashboardButton icon="💬" title="AI Ride Assistant" onPress={() => router.push("/ai-assistant" as any)} />
          </DashboardSection>

          <DashboardSection
            title="Account & Settings"
            icon="⚙️"
            isOpen={openSection === "settings"}
            onPress={() => setOpenSection(openSection === "settings" ? "" : "settings")}
          >
            <DashboardButton icon="🔔" title="Notification Preferences" onPress={() => router.push("/notification-preferences" as any)} />
            <DashboardButton icon="🔒" title="Privacy & Account" onPress={() => router.push("/privacy-account" as any)} />
            <DashboardButton icon="ℹ️" title="About Angel Express" onPress={() => router.push("/about" as any)} />
          </DashboardSection>

          <DashboardSection
            title="Unique Angel Features"
            icon="⭐"
            isOpen={openSection === "features"}
            onPress={() => setOpenSection(openSection === "features" ? "" : "features")}
          >
            <View style={styles.featureGrid}>
              <SmallFeatureCard title="Push Ride Updates" text="Get alerts for driver assigned, ride confirmed, driver arriving, trip started, arrived safely, and rewards earned." />
              <SmallFeatureCard title="Live GPS Tracking" text="Track your active ride, driver location, ETA, vehicle, and plate number." />
              <SmallFeatureCard title="Student Travel Mode" text="Discounted student routes, campus pickup points, and group rides." />
              <SmallFeatureCard title="World Cup/Event Mode" text="Hotel pickup, stadium routes, airport transfers, and event support." />
              <SmallFeatureCard title="Luxury Ride Prep" text="Get ready before pickup with luggage, ID, timing, and driver details." />
              <SmallFeatureCard title="Family Check-In" text="Send pickup, halfway, and arrival updates to loved ones." />
            </View>
          </DashboardSection>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

function DashboardSection({
  title,
  icon,
  isOpen,
  onPress,
  children,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionBox}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onPress}>
        <Text style={styles.sectionHeaderText}>
          {icon} {title}
        </Text>
        <Text style={styles.chevron}>{isOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {isOpen && <View style={styles.buttonGrid}>{children}</View>}
    </View>
  );
}

function DashboardButton({
  icon,
  title,
  onPress,
}: {
  icon: string;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.dashboardButton} onPress={onPress}>
      <Text style={styles.buttonIcon}>{icon}</Text>
      <Text style={styles.dashboardButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

function SmallFeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#040C18",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(4,12,24,0.78)",
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 50,
  },

  brand: {
    color: "#D4AF37",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: "uppercase",
  },

  pageTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 8,
  },

  welcome: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },

  subtitle: {
    color: "#C9D0D8",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },

  sectionBox: {
    backgroundColor: "rgba(7,20,38,0.9)",
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.22)",
    overflow: "hidden",
  },

  sectionHeader: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionHeaderText: {
    color: "#D4AF37",
    fontSize: 19,
    fontWeight: "900",
  },

  chevron: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  dashboardButton: {
    width: "48%",
    backgroundColor: "rgba(11,27,49,0.94)",
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.18)",
    minHeight: 118,
    justifyContent: "center",
  },

  buttonIcon: {
    fontSize: 30,
    marginBottom: 12,
  },

  dashboardButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },

  featureGrid: {
    gap: 14,
    paddingHorizontal: 6,
    paddingBottom: 10,
    width: "100%",
  },

  featureCard: {
    backgroundColor: "rgba(7, 20, 38, 0.9)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.18)",
    width: "100%",
  },

  featureTitle: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },

  featureText: {
    color: "#DDE3EA",
    fontSize: 15,
    lineHeight: 22,
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: "#FF6B6B",
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 18,
  },

  logoutText: {
    color: "#FF6B6B",
    fontSize: 17,
    fontWeight: "900",
  },
});