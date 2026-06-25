import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LuxuryRidePrepScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Luxury Ride Prep+</Text>

      <Text style={styles.subtitle}>
        Prepare for every Angel Express ride with trip readiness, weather alerts,
        and traffic guidance.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trip Preparation Checklist</Text>

        <ChecklistItem text="Driver Assigned" checked />
        <ChecklistItem text="Pickup Time Confirmed" checked />
        <ChecklistItem text="Luggage Count Confirmed" checked />
        <ChecklistItem text="Flight Number Added" checked />
        <ChecklistItem text="Driver Contact Available" checked />
      </View>

      <View style={styles.alertCard}>
        <Text style={styles.alertTitle}>Weather Alert</Text>
        <Text style={styles.alertText}>Heavy traffic expected</Text>
        <Text style={styles.alertSubText}>Leave 15 minutes earlier</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Before Your Ride</Text>
        <Text style={styles.listItem}>• Keep your phone available.</Text>
        <Text style={styles.listItem}>• Be ready 5–10 minutes before pickup.</Text>
        <Text style={styles.listItem}>• Confirm luggage before the driver arrives.</Text>
        <Text style={styles.listItem}>• Share Family Check-In+ with your emergency contact.</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/family-checkin" as any)}
      >
        <Text style={styles.buttonText}>Open Family Check-In+</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/my-trips" as any)}
      >
        <Text style={styles.secondaryButtonText}>View My Trips</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ChecklistItem({ text, checked }: { text: string; checked: boolean }) {
  return (
    <View style={styles.checkRow}>
      <Text style={styles.checkIcon}>{checked ? "✓" : "○"}</Text>
      <Text style={styles.checkText}>{text}</Text>
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
    paddingBottom: 50,
  },
  title: {
    color: "#D4AF37",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    color: "#C9D0D8",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  cardTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  checkIcon: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    width: 34,
  },
  checkText: {
    color: "#FFFFFF",
    fontSize: 16,
    flex: 1,
  },
  alertCard: {
    backgroundColor: "#22170A",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
  },
  alertTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },
  alertText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  alertSubText: {
    color: "#C9D0D8",
    fontSize: 16,
  },
  listItem: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#071426",
    fontSize: 17,
    fontWeight: "900",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 14,
  },
  secondaryButtonText: {
    color: "#D4AF37",
    fontSize: 17,
    fontWeight: "900",
  },
});