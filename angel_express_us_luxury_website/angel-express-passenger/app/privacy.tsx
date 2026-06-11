import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>

      <Text style={styles.text}>
        Angel Express Mobility respects your privacy. We collect only the
        information needed to create your account, manage bookings, contact you
        about rides, and improve our transportation services.
      </Text>

      <Text style={styles.text}>
        Your personal information will not be sold. Booking details may be used
        only for ride confirmation, customer support, safety, and service
        communication.
      </Text>

      <Text style={styles.text}>
        By using Angel Express Mobility, you agree to our use of your information
        for service-related purposes.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071426",
  },

  content: {
    padding: 24,
  },

  title: {
    color: "#D4AF37",
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 20,
  },

  text: {
    color: "#fff",
    fontSize: 17,
    lineHeight: 28,
    marginBottom: 18,
  },
});