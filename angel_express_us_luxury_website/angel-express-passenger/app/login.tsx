import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const logoFade = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const linkFade = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();

    Animated.sequence([
      fadeUp(logoFade, 80),
      fadeUp(titleFade, 60),
      fadeUp(cardFade, 50),
      fadeUp(linkFade, 40),
    ]).start();
  }, []);

  async function syncWebsiteBookings(userId: string, userEmail: string) {
    const cleanEmail = userEmail.trim().toLowerCase();

    const { data: websiteBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .ilike("email", cleanEmail);

    if (fetchError) throw fetchError;
    if (!websiteBookings || websiteBookings.length === 0) return;

    for (const booking of websiteBookings) {
      const updatedBooking = {
        user_id: userId,
        passenger_name: booking.passenger_name || booking.name || "",
        pickup_address: booking.pickup_address || booking.pickup || "",
        dropoff_address: booking.dropoff_address || booking.dropoff || "",
        ride_date: booking.ride_date || booking.date || "",
        ride_time: booking.ride_time || booking.time || "",
        trip_type: booking.trip_type || booking.tripType || "One Way",
        ride_category: booking.ride_category || "Website Booking",
        estimated_miles: Number(booking.estimated_miles || booking.miles || 0),
        base_fare: Number(booking.base_fare || booking.base || 0),
        total_fare: Number(booking.total_fare || booking.total || 0),
        balance_due: Number(
          booking.balance_due || booking.total_fare || booking.total || 0
        ),
        source: booking.source || "website",
      };

      const { error: updateError } = await supabase
        .from("bookings")
        .update(updatedBooking)
        .eq("id", booking.id);

      if (updateError) throw updateError;
    }
  }

  async function handleLogin() {
    if (loading) return;

    if (!email || !password) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const userId = data.user?.id;
      const userEmail = data.user?.email;

      if (!userId || !userEmail) {
        Alert.alert("Login Error", "Unable to find user account.");
        return;
      }

      await syncWebsiteBookings(userId, userEmail);

      const { data: profile, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("profile_completed, terms_accepted")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || !profile.profile_completed || !profile.terms_accepted) {
        router.replace("/profile" as any);
      } else {
        router.replace("/dashboard" as any);
      }
    } catch (error: any) {
      Alert.alert("Login Error", error.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  const logoTranslate = logoFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const titleTranslate = titleFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const cardTranslate = cardFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const linkTranslate = linkFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.bgWrap,
          {
            transform: [{ scale: bgScale }],
          },
        ]}
      >
        <ImageBackground
          source={require("../assets/images/gmc-background.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>

            <Animated.View
              style={{
                opacity: logoFade,
                transform: [{ translateY: logoTranslate }],
              }}
            >
              <Image
                source={require("../assets/images/angel-logo-transparent.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.View
              style={{
                opacity: titleFade,
                transform: [{ translateY: titleTranslate }],
              }}
            >
              <Text style={styles.title}>
                Welcome{"\n"}
                <Text style={styles.gold}>Back.</Text>
              </Text>

              <Text style={styles.subtitle}>
                Sign in to continue your Angel Express ride experience.
              </Text>
            </Animated.View>

            <Animated.View
              style={{
                opacity: cardFade,
                transform: [{ translateY: cardTranslate }],
              }}
            >
              <AngelCard style={styles.card}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <AngelHeroButton
                  title={loading ? "Signing In..." : "Sign In"}
                  onPress={handleLogin}
                  variant="gold"
                  style={loading ? styles.buttonDisabled : undefined}
                />
              </AngelCard>
            </Animated.View>

            <Animated.View
              style={{
                opacity: linkFade,
                transform: [{ translateY: linkTranslate }],
              }}
            >
              <TouchableOpacity onPress={() => router.replace("/signup" as any)}>
                <Text style={styles.signupText}>
                  Don&apos;t have an account?{" "}
                  <Text style={styles.signupGold}>Create Account</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    overflow: "hidden",
  },

  bgWrap: {
    ...StyleSheet.absoluteFillObject,
  },

  background: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,11,22,0.88)",
  },

  safeArea: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    justifyContent: "center",
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 18,
  },

  backText: {
    color: AE_COLORS.gold,
    fontSize: 18,
    fontWeight: "900",
  },

  logo: {
    width: "100%",
    height: 145,
    marginBottom: 8,
  },

  title: {
    color: AE_COLORS.white,
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 50,
    letterSpacing: -1.3,
    marginBottom: 14,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },

  gold: {
    color: AE_COLORS.gold,
  },

  subtitle: {
    color: "#dce5ee",
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 24,
  },

  card: {
    padding: 22,
    marginBottom: 24,
  },

  label: {
    color: AE_COLORS.gold,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    color: AE_COLORS.white,
    padding: 17,
    borderRadius: 16,
    fontSize: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  signupText: {
    color: AE_COLORS.white,
    textAlign: "center",
    fontSize: 15.5,
    lineHeight: 24,
  },

  signupGold: {
    color: AE_COLORS.gold,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
});