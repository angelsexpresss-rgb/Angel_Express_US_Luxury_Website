import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  AE_COLORS,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

export default function HomeScreen() {
  const logoFade = useRef(new Animated.Value(0)).current;
  const headlineFade = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const buttonsFade = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();

    Animated.sequence([
      fadeUp(logoFade, 80),
      fadeUp(headlineFade, 60),
      fadeUp(subtitleFade, 50),
      fadeUp(buttonsFade, 40),
    ]).start();
  }, []);

  const logoTranslate = logoFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const headlineTranslate = headlineFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const subtitleTranslate = subtitleFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const buttonsTranslate = buttonsFade.interpolate({
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
          <View style={styles.content}>
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
                opacity: headlineFade,
                transform: [{ translateY: headlineTranslate }],
              }}
            >
              <Text style={styles.headline}>
                Travel Smarter.{"\n"}Travel Safer.
              </Text>

              <View style={styles.divider} />
            </Animated.View>

            <Animated.View
              style={{
                opacity: subtitleFade,
                transform: [{ translateY: subtitleTranslate }],
              }}
            >
              <Text style={styles.subtitle}>
                Premium regional transportation across{"\n"}Texas and beyond.
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.buttonArea,
                {
                  opacity: buttonsFade,
                  transform: [{ translateY: buttonsTranslate }],
                },
              ]}
            >
              <AngelHeroButton
                title="Create an Account"
                onPress={() => router.push("/signup" as any)}
                variant="gold"
                style={styles.heroButton}
              />

              <AngelHeroButton
                title="Sign In"
                onPress={() => router.push("/login" as any)}
                variant="outline"
                style={styles.heroButton}
              />

              <Text style={styles.footerMark}>⌄</Text>
              <Text style={styles.footerText}>Safe. Reliable. Professional.</Text>

              <TouchableOpacity onPress={() => router.push("/privacy" as any)}>
                <Text style={styles.privacy}>Privacy Policy</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
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
    backgroundColor: "rgba(5,11,22,0.84)",
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
    color: AE_COLORS.white,
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
    alignSelf: "center",
    width: 120,
    height: 3,
    borderRadius: 20,
    backgroundColor: AE_COLORS.gold,
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

  buttonArea: {
    width: "100%",
    alignItems: "center",
  },

  heroButton: {
    marginBottom: 16,
  },

  footerMark: {
    color: AE_COLORS.gold,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
    marginBottom: 4,
  },

  footerText: {
    color: AE_COLORS.white,
    fontSize: 16,
    marginBottom: 20,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  privacy: {
    color: AE_COLORS.gold,
    fontSize: 16,
    textDecorationLine: "underline",
  },
});