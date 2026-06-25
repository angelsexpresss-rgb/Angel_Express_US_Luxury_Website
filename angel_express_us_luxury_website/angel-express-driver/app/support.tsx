import { router } from "expo-router";
import * as Linking from "expo-linking";
import {
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SupportScreen() {
  const DISPATCH_PHONE = "19728367910";
  const SUPPORT_EMAIL = "support@angelexpressus.com";

  async function callDispatch() {
    await Linking.openURL(`tel:${DISPATCH_PHONE}`);
  }

  async function openWhatsApp() {
    const message =
      "Hello Angel Express Support,%0A%0ADriver Name:%0ATrip ID:%0A%0AI need assistance with:";
    await Linking.openURL(`https://wa.me/${DISPATCH_PHONE}?text=${message}`);
  }

  async function emailSupport() {
    const subject = encodeURIComponent("Angel Express Driver Support");
    const body = encodeURIComponent(
      "Hello Angel Express Support,\n\nDriver Name:\nTrip ID:\n\nI need assistance with:\n"
    );

    await Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
    );
  }

  function reportIssue(issue: string) {
    Alert.alert(
      "Support Issue Selected",
      `${issue} has been selected. In the next step, we will connect this to Supabase support tickets.`
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Driver Support</Text>
          <Text style={styles.subtitle}>
            Contact Angel Express for trip, payment, vehicle, or account support.
          </Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact Dispatch</Text>

            <TouchableOpacity style={styles.primaryButton} onPress={callDispatch}>
              <Text style={styles.primaryText}>📞 Call Dispatch</Text>
              <Text style={styles.buttonSubtext}>(972) 836-7910</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.whatsAppButton} onPress={openWhatsApp}>
              <Text style={styles.primaryText}>💬 WhatsApp Support</Text>
              <Text style={styles.buttonSubtext}>
                Message Angel Express immediately
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.emailButton} onPress={emailSupport}>
              <Text style={styles.primaryText}>📧 Email Support</Text>
              <Text style={styles.buttonSubtext}>{SUPPORT_EMAIL}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Trip Issue</Text>

            <TouchableOpacity
              style={styles.issueButton}
              onPress={() => reportIssue("Passenger No Show")}
            >
              <Text style={styles.issueText}>Passenger No Show</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.issueButton}
              onPress={() => reportIssue("Vehicle Issue")}
            >
              <Text style={styles.issueText}>Vehicle Issue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.issueButton}
              onPress={() => reportIssue("Running Late")}
            >
              <Text style={styles.issueText}>Running Late</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.issueButton}
              onPress={() => reportIssue("Route Change")}
            >
              <Text style={styles.issueText}>Route Change</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.issueButton}
              onPress={() => reportIssue("Payment Question")}
            >
              <Text style={styles.issueText}>Payment Question</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyTitle}>Emergency Support</Text>
            <Text style={styles.emergencyText}>
              For active ride emergencies, use the Safety & Support panic tools.
            </Text>

            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={() => router.push("/safety-support")}
            >
              <Text style={styles.emergencyButtonText}>
                🚨 Open Emergency Tools
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  container: {
    padding: 22,
    paddingTop: 60,
    paddingBottom: 50,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: "#d4af37",
    fontWeight: "800",
    fontSize: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.93)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
  },
  sectionTitle: {
    color: "#d4af37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: "rgba(212,175,55,0.16)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
  },
  whatsAppButton: {
    backgroundColor: "rgba(34,197,94,0.16)",
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
  },
  emailButton: {
    backgroundColor: "rgba(59,130,246,0.16)",
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 16,
    padding: 17,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
  },
  buttonSubtext: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  issueButton: {
    backgroundColor: "rgba(30,41,59,0.9)",
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#475569",
  },
  issueText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  emergencyCard: {
    backgroundColor: "rgba(127,29,29,0.82)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 22,
    padding: 20,
  },
  emergencyTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  emergencyText: {
    color: "#fee2e2",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 15,
  },
  emergencyButton: {
    backgroundColor: "#991b1b",
    borderRadius: 15,
    padding: 16,
  },
  emergencyButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
});