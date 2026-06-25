import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>

      <Text style={styles.text}>
        Angel Express Mobility collects chauffeur information for account
        verification, trip assignment, safety, payment processing, and platform
        operations.
      </Text>

      <Text style={styles.text}>
        Information may include your name, phone number, email, vehicle details,
        license information, payout details, location during active trips,
        ratings, and trip history.
      </Text>

      <Text style={styles.text}>
        Live location is used only when a chauffeur is online, assigned to a
        trip, navigating to pickup, or completing an active ride.
      </Text>

      <Text style={styles.text}>
        Angel Express does not sell chauffeur information. Data is used to
        operate the platform, support safety, manage trips, and process payouts.
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#07111f",
    padding: 24,
    paddingTop: 70,
  },
  title: {
    color: "#d4af37",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 24,
  },
  text: {
    color: "#e5e7eb",
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 18,
  },
  button: {
    backgroundColor: "#d4af37",
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  buttonText: {
    color: "#07111f",
    fontWeight: "900",
    textAlign: "center",
  },
});