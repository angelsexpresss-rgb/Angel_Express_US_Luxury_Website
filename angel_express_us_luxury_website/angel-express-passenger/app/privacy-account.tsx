import { router } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PrivacyAccountScreen() {
  function openPrivacyPolicy() {
    Linking.openURL("https://angelexpressus.com/privacy");
  }

  function requestAccountDeletion() {
    Alert.alert(
      "Delete Account",
      "This will submit a request to permanently delete your Angel Express account and associated data. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Request Deletion",
          style: "destructive",
          onPress: () => {
            Linking.openURL(
              "mailto:angelexpresss@gmail.com?subject=Account Deletion Request&body=I would like to permanently delete my Angel Express account and associated data."
            );
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy & Account</Text>

      <Text style={styles.subtitle}>
        Learn how Angel Express uses your information and manage your account.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy Policy</Text>

        <Text style={styles.cardText}>
          Angel Express collects only the information necessary to provide
          transportation services, safety features, notifications, trip history,
          and customer support.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={openPrivacyPolicy}
        >
          <Text style={styles.buttonText}>
            View Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data We Collect</Text>

        <Text style={styles.bullet}>• Name</Text>
        <Text style={styles.bullet}>• Email Address</Text>
        <Text style={styles.bullet}>• Phone Number</Text>
        <Text style={styles.bullet}>• Trip Information</Text>
        <Text style={styles.bullet}>• Emergency Contacts</Text>
        <Text style={styles.bullet}>• Push Notification Tokens</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How We Use Your Data</Text>

        <Text style={styles.bullet}>
          • Process ride bookings
        </Text>

        <Text style={styles.bullet}>
          • Provide safety notifications
        </Text>

        <Text style={styles.bullet}>
          • Support Family Check-In+
        </Text>

        <Text style={styles.bullet}>
          • Improve customer support
        </Text>

        <Text style={styles.bullet}>
          • Provide travel assistance services
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Request Account Deletion</Text>

        <Text style={styles.cardText}>
          You may request permanent deletion of your Angel Express account and
          personal information.
        </Text>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={requestAccountDeletion}
        >
          <Text style={styles.deleteButtonText}>
            Delete My Account
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Some records may be retained where required by law, safety,
          accounting, payment, fraud prevention, or regulatory compliance.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Need Help?</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/support" as any)}
        >
          <Text style={styles.buttonText}>
            Contact Support
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    marginBottom: 12,
  },

  cardText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 24,
  },

  bullet: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 6,
  },

  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 14,
  },

  buttonText: {
    color: "#071426",
    fontSize: 16,
    fontWeight: "900",
  },

  deleteButton: {
    backgroundColor: "#8B0000",
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 14,
  },

  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  disclaimer: {
    color: "#8A93A3",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },
});