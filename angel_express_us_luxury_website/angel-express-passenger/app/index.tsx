import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TouchableOpacity,
  SafeAreaView,
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
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <Image
              source={require("../assets/images/angel-logo-transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.headline}>
              Travel Smarter.{"\n"}Travel Safer.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.subtitle}>
              Premium regional transportation across{"\n"}Texas and beyond.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => router.push("/signup" as any)}
            >
              <View style={styles.buttonIconBox}>
                <Text style={styles.buttonIcon}>A</Text>
              </View>
              <Text style={styles.primaryButtonText}>Create an Account</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={() => router.push("/login" as any)}
            >
              <View style={styles.buttonIconBoxSecondary}>
                <Text style={styles.buttonIconSecondary}>A</Text>
              </View>
              <Text style={styles.secondaryButtonText}>Sign In</Text>
              <Text style={styles.arrowGold}>›</Text>
            </TouchableOpacity>

            <Text style={styles.shield}>⌵</Text>
            <Text style={styles.footerText}>Safe. Reliable. Professional.</Text>

            <TouchableOpacity onPress={() => router.push("/privacy" as any)}>
              <Text style={styles.privacy}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#050b16",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,11,22,0.82)",
  },

  safeArea: {
    flex: 1,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },

  logo: {
    width: 330,
    height: 190,
    marginBottom: 16,
  },

  headline: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 46,
    letterSpacing: 0.4,
    marginBottom: 20,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },

  divider: {
    width: 120,
    height: 3,
    borderRadius: 20,
    backgroundColor: "#D4AF37",
    marginBottom: 24,
  },

  subtitle: {
    color: "#E8EDF3",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 44,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  primaryButton: {
    width: "100%",
    minHeight: 64,
    backgroundColor: "#D4AF37",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    paddingHorizontal: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F5D76E",
    shadowColor: "#D4AF37",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 5,
  },

  primaryButtonText: {
    color: "#06111f",
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  secondaryButton: {
    width: "100%",
    minHeight: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    paddingHorizontal: 18,
    marginBottom: 34,
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    backgroundColor: "rgba(5,11,22,0.72)",
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  buttonIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#06111f",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonIcon: {
    color: "#D4AF37",
    fontSize: 26,
    fontWeight: "900",
    fontStyle: "italic",
  },

  buttonIconBoxSecondary: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonIconSecondary: {
    color: "#D4AF37",
    fontSize: 26,
    fontWeight: "900",
    fontStyle: "italic",
  },

  arrow: {
    color: "#06111f",
    fontSize: 42,
    fontWeight: "300",
    marginTop: -4,
  },

  arrowGold: {
    color: "#D4AF37",
    fontSize: 42,
    fontWeight: "300",
    marginTop: -4,
  },

  shield: {
    color: "#D4AF37",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 6,
  },

  footerText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 22,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  privacy: {
    color: "#D4AF37",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});