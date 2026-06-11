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
      source={require("./assets/images/gmc-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Image
         source={require("./assets/images/angel-logo-transparent.png")}
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
          Premium regional transportation across{"\n"}Texas and beyond.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/signup" as any)}
        >
          <Text style={styles.primaryButtonText}>Create an Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Safe. Reliable. Professional.</Text>

        <TouchableOpacity onPress={() => router.push("/privacy" as any)}>
          <Text style={styles.privacy}>Privacy Policy</Text>
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
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  logo: {
    width: 360,
    height: 210,
    marginBottom: 18,
  },

  headline: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 44,
    marginBottom: 14,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 5,
  },

  brandLine: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  gold: {
    color: "#D4AF37",
    fontWeight: "900",
  },

  divider: {
    width: 75,
    height: 4,
    borderRadius: 5,
    backgroundColor: "#D4AF37",
    marginBottom: 22,
  },

  subtitle: {
    color: "#FFFFFF",
    fontSize: 20,
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 50,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F5D76E",
  },

  primaryButtonText: {
    color: "#071426",
    fontSize: 22,
    fontWeight: "900",
  },

  secondaryButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 34,
    borderWidth: 2,
    borderColor: "#D4AF37",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  secondaryButtonText: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
  },

  footerText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginBottom: 14,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  privacy: {
    color: "#FFFFFF",
    fontSize: 17,
    textDecorationLine: "underline",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
});