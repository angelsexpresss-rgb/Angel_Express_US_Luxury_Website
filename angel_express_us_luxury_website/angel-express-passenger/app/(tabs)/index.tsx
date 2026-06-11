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
      source={require("../../assets/images/gmc-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Image
          source={require("../../assets/images/angel-logo.png")}
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
          Premium regional transportation{"\n"}across Texas and beyond.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/signup" as any)}
        >
          <Text style={styles.buttonText}>Create an Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.safeText}>Safe. Reliable. Professional.</Text>

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
    backgroundColor: "rgba(4, 12, 24, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  logo: {
    width: 320,
    height: 190,
    marginBottom: 25,
  },

  headline: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 12,
  },

  brandLine: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 18,
  },

  gold: {
    color: "#D4AF37",
  },

  divider: {
    width: 65,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#D4AF37",
    marginBottom: 22,
  },

  subtitle: {
    color: "#E0E0E0",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 80,
  },

  button: {
    width: "100%",
    backgroundColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  buttonText: {
    color: "#071426",
    fontSize: 21,
    fontWeight: "800",
  },

  safeText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginTop: 18,
    marginBottom: 18,
  },

  privacy: {
    color: "#FFFFFF",
    fontSize: 17,
    textDecorationLine: "underline",
  },
});