import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DashboardScreen() {
  const firstName = "Jude";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Angel Express Mobility</Text>

      <Text style={styles.welcome}>Welcome, {firstName} 👋</Text>

      <Text style={styles.subtitle}>
        Premium travel, safety, and comfort in one place.
      </Text>

      <View style={styles.mainGrid}>
        <DashboardButton
          icon="🚗"
          title="Book a Ride"
          onPress={() => router.push("/book-ride" as any)}
        />

        <DashboardButton
          icon="📍"
          title="My Trips"
          onPress={() => router.push("/my-trips" as any)}
        />

        <DashboardButton
          icon="🛡️"
          title="Angel Safety Share"
          onPress={() => router.push("/safety-share" as any)}
        />

        <DashboardButton
          icon="🎁"
          title="Rewards"
          onPress={() => router.push("/rewards" as any)}
        />

        <DashboardButton
          icon="💬"
          title="AI Ride Assistant"
          onPress={() => router.push("/ai-assistant" as any)}
        />

        <DashboardButton
          icon="👤"
          title="Profile"
          onPress={() => router.push("/profile" as any)}
        />
      </View>

      <Text style={styles.sectionTitle}>Unique Angel Features</Text>

      <View style={styles.featureGrid}>
        <SmallFeatureCard
          title="Student Travel Mode"
          text="Discounted student routes, campus pickup points, and group rides."
        />

        <SmallFeatureCard
          title="World Cup/Event Mode"
          text="Hotel pickup, stadium routes, airport transfers, and event support."
        />

        <SmallFeatureCard
          title="Luxury Ride Prep"
          text="Get ready before pickup with luggage, ID, timing, and driver details."
        />

        <SmallFeatureCard
          title="Family Check-in"
          text="Send automatic pickup and arrival updates to loved ones."
        />
      </View>
    </ScrollView>
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

function SmallFeatureCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040C18",
  },

  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 40,
  },

  brand: {
    color: "#D4AF37",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 18,
    textTransform: "uppercase",
  },

  welcome: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },

  subtitle: {
    color: "#C9D0D8",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },

  mainGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 34,
  },

  dashboardButton: {
    width: "48%",
    backgroundColor: "#071426",
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.22)",
    minHeight: 130,
    justifyContent: "center",
  },

  buttonIcon: {
    fontSize: 32,
    marginBottom: 14,
  },

  dashboardButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },

  sectionTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },

  featureGrid: {
    gap: 14,
  },

  featureCard: {
    backgroundColor: "rgba(7, 20, 38, 0.9)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.18)",
  },

  featureTitle: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },

  featureText: {
    color: "#DDE3EA",
    fontSize: 15,
    lineHeight: 22,
  },
});