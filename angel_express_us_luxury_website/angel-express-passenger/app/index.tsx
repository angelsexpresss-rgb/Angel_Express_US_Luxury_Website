import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

export default function HomeScreen() {
  return (
    <ImageBackground
      source={require("../assets/images/gmc-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Image
          source={require("../assets/images/angel-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.headline}>
          Travel Smarter.{"\n"}Travel Safer.
        </Text>

        <Text style={styles.brandLine}>
          Travel with <Text style={styles.gold}>Angel Express Mobility.</Text>
        </Text>

        <View style={styles.divider} />

        <Text style={styles.subtitle}>
          Premium regional transportation across Texas and beyond.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/signup" as any)}
        >
          <Text style={styles.primaryButtonText}>
            Create an Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={styles.secondaryButtonText}>
            Sign In
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Safe. Reliable. Professional.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/privacy" as any)}
        >
          <Text style={styles.privacy}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
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
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  logo: {
    width: 280,
    height: 160,
    marginBottom: 20,
  },

  headline: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },

  brandLine: {
    color: "#FFFFFF",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 20,
  },

  gold: {
    color: "#D4AF37",
    fontWeight: "bold",
  },

  divider: {
    width: 70,
    height: 4,
    backgroundColor: "#D4AF37",
    marginBottom: 20,
    borderRadius: 4,
  },

  subtitle: {
    color: "#F5F5F5",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 50,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },

  primaryButtonText: {
    color: "#071426",
    fontSize: 20,
    fontWeight: "bold",
  },

  secondaryButton: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 30,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  secondaryButtonText: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "bold",
  },

  footerText: {
    color: "#FFFFFF",
    fontSize: 17,
    marginBottom: 15,
  },

  privacy: {
    color: "#FFFFFF",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});