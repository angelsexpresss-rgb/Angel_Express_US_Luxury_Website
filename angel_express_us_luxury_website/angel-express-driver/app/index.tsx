import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChauffeurWelcomeScreen() {
  const [showBenefits, setShowBenefits] = useState(false);

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.container}>
          <Image
            source={require("../assets/images/angel-logo-transparent.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>PROFESSIONAL CHAUFFEUR NETWORK</Text>

          <Text style={styles.heading}>Drive With Excellence.</Text>

          <Text style={styles.heading2}>Earn With Confidence.</Text>

          <Text style={styles.subtitle}>
            Join Angel Express Mobility and become part of a premium private
            transportation network serving airport travelers, students,
            corporate clients, tourists, and special events across Texas.
          </Text>

          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => setShowBenefits(!showBenefits)}
          >
            <Text style={styles.dropdownTitle}>
              Why Become an Angel Express Chauffeur?
            </Text>

            <Text style={styles.dropdownIcon}>
              {showBenefits ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {showBenefits && (
            <View style={styles.card}>
              <Text style={styles.cardText}>
                ✓ Earn up to 70% of trip revenue
              </Text>
              <Text style={styles.cardText}>
                ✓ Premium passengers and private bookings
              </Text>
              <Text style={styles.cardText}>
                ✓ Regional and airport transportation
              </Text>
              <Text style={styles.cardText}>
                ✓ Route preference matching
              </Text>
              <Text style={styles.cardText}>
                ✓ Flexible scheduling
              </Text>
              <Text style={styles.cardText}>
                ✓ Live trip management and GPS tracking
              </Text>
              <Text style={styles.cardText}>
                ✓ Direct support from Angel Express
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/driver-login")}
          >
            <Text style={styles.primaryButtonText}>Chauffeur Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/driver-signup")}
          >
            <Text style={styles.secondaryButtonText}>
              Apply As A Chauffeur
            </Text>
          </TouchableOpacity>

          <Text style={styles.approvalText}>
            All chauffeurs are carefully screened and approved by Angel Express
            before receiving trip assignments.
          </Text>

          <TouchableOpacity onPress={() => router.push("/privacy-policy")}>
            <Text style={styles.privacyText}>Privacy Policy</Text>
          </TouchableOpacity>

          <View style={styles.valuesCard}>
            <Text style={styles.valuesTitle}>Our Standards</Text>

            <Text style={styles.valuesText}>
              COMFORT • RELIABILITY • SECURITY • CLEANLINESS
            </Text>
          </View>

          <Text style={styles.footer}>
            Angel Express • Excellence In Every Ride
          </Text>
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
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "center",
  },

  logo: {
    width: "100%",
    height: 180,
    marginBottom: 5,
  },

  title: {
    color: "#d4af37",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 20,
  },

  heading: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
  },

  heading2: {
    color: "#d4af37",
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 16,
  },

  subtitle: {
    color: "#f1f5f9",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 25,
  },

  dropdownHeader: {
    backgroundColor: "rgba(15,23,42,0.90)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownTitle: {
    color: "#d4af37",
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },

  dropdownIcon: {
    color: "#d4af37",
    fontSize: 18,
    fontWeight: "900",
    marginLeft: 12,
  },

  card: {
    backgroundColor: "rgba(15,23,42,0.90)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
  },

  cardText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 28,
  },

  valuesCard: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 15,
    padding: 16,
    marginBottom: 24,
  },

  valuesTitle: {
    color: "#d4af37",
    textAlign: "center",
    fontWeight: "800",
    marginBottom: 8,
  },

  valuesText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 13,
  },

  primaryButton: {
    backgroundColor: "#d4af37",
    paddingVertical: 18,
    borderRadius: 18,
    marginBottom: 14,
  },

  primaryButtonText: {
    color: "#07111f",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 17,
    textTransform: "uppercase",
  },

  secondaryButton: {
    borderWidth: 2,
    borderColor: "#d4af37",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingVertical: 18,
    borderRadius: 18,
    marginBottom: 18,
  },

  secondaryButtonText: {
    color: "#d4af37",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 16,
    textTransform: "uppercase",
  },

  approvalText: {
    color: "#e2e8f0",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },

  privacyText: {
    color: "#d4af37",
    textAlign: "center",
    fontWeight: "700",
    textDecorationLine: "underline",
    marginBottom: 20,
  },

  footer: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 13,
  },
});