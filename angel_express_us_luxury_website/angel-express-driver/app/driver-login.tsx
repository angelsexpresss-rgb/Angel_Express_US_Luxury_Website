import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function ChauffeurLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.04,
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 6000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      const user = data.user;

      if (!user) {
        Alert.alert("Login Error", "Unable to find chauffeur account.");
        return;
      }

      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (driverError || !driver) {
        Alert.alert(
          "Profile Missing",
          "Your login exists, but no chauffeur profile was found."
        );
        return;
      }

      if (driver.status === "approved") {
        router.replace("/driver-dashboard");
        return;
      }

      if (driver.status === "pending") {
        router.replace("/driver-pending");
        return;
      }

      if (driver.status === "rejected") {
        Alert.alert(
          "Application Not Approved",
          "Your chauffeur application was not approved. Please contact Angel Express support."
        );
        return;
      }

      if (driver.status === "suspended") {
        Alert.alert(
          "Account Suspended",
          "Your chauffeur account has been suspended. Please contact Angel Express."
        );
        return;
      }

      router.replace("/driver-pending");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: scaleAnim }] }]}>
        <ImageBackground
          source={require("../assets/images/driver-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backTop}>‹ Back</Text>
            </TouchableOpacity>

            <Image
              source={require("../assets/images/angel-logo-transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.kickerBox}>
              <Text style={styles.kicker}>ANGEL EXPRESS DRIVER APP</Text>
            </View>

            <Text style={styles.heading}>
              Chauffeur <Text style={styles.goldText}>Login.</Text>
            </Text>

            <Text style={styles.subtitle}>
              Access your Angel Express chauffeur account, manage active trips,
              track earnings, and receive approved ride assignments.
            </Text>

            <View style={styles.loginCard}>
              <Text style={styles.formLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter chauffeur email"
                placeholderTextColor="rgba(255,255,255,0.45)"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.formLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="rgba(255,255,255,0.45)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.buttonIconBox}>
                  <Text style={styles.buttonIcon}>A</Text>
                </View>

                {loading ? (
                  <ActivityIndicator color="#050b16" style={{ flex: 1 }} />
                ) : (
                  <Text style={styles.primaryButtonText}>Login</Text>
                )}

                <Text style={styles.buttonArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/driver-signup")}
              activeOpacity={0.85}
            >
              <View style={styles.outlineIconBox}>
                <Text style={styles.outlineIcon}>A</Text>
              </View>

              <Text style={styles.secondaryButtonText}>Apply As Chauffeur</Text>
              <Text style={styles.secondaryArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Approved Chauffeurs Only</Text>
              <Text style={styles.noticeText}>
                New applicants must be reviewed by Angel Express before trip
                assignments become available.
              </Text>
            </View>

            <Text style={styles.footer}>
              Angel Express • Excellence In Every Ride
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050b16",
  },

  bgWrap: {
    ...StyleSheet.absoluteFillObject,
  },

  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,11,22,0.91)",
  },

  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 58,
    paddingBottom: 46,
    justifyContent: "center",
  },

  backTop: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 18,
  },

  logo: {
    width: "100%",
    height: 145,
    marginBottom: 12,
  },

  kickerBox: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 15,
    marginBottom: 18,
  },

  kicker: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    textAlign: "center",
  },

  heading: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1.3,
    lineHeight: 48,
    marginBottom: 14,
  },

  goldText: {
    color: "#D4AF37",
  },

  subtitle: {
    color: "#DDE3EA",
    fontSize: 15.5,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
  },

  loginCard: {
    backgroundColor: "rgba(13,20,34,0.9)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 30,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  },

  formLabel: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "rgba(5,11,22,0.82)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    color: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: "700",
  },

  primaryButton: {
    backgroundColor: "#D4AF37",
    minHeight: 66,
    borderRadius: 22,
    paddingHorizontal: 14,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  disabledButton: {
    opacity: 0.7,
  },

  buttonIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#050b16",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonIcon: {
    color: "#D4AF37",
    fontSize: 25,
    fontWeight: "900",
  },

  primaryButtonText: {
    flex: 1,
    color: "#050b16",
    fontWeight: "900",
    fontSize: 17,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 14,
  },

  buttonArrow: {
    color: "#050b16",
    fontSize: 38,
    fontWeight: "700",
  },

  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    backgroundColor: "rgba(5,11,22,0.78)",
    minHeight: 66,
    borderRadius: 22,
    paddingHorizontal: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  outlineIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  outlineIcon: {
    color: "#D4AF37",
    fontSize: 25,
    fontWeight: "900",
  },

  secondaryButtonText: {
    flex: 1,
    color: "#D4AF37",
    fontWeight: "900",
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 14,
  },

  secondaryArrow: {
    color: "#D4AF37",
    fontSize: 38,
    fontWeight: "700",
  },

  noticeCard: {
    backgroundColor: "rgba(212,175,55,0.09)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },

  noticeTitle: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },

  noticeText: {
    color: "#DDE3EA",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
  },

  footer: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
});