import { router } from "expo-router";
import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  Animated,
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react-native";

import {
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

const DRIVER_TERMS_URL =
  "https://angelexpressus.com/terms.html";

export default function ChauffeurWelcomeScreen() {
  const {
    colors,
    themeMode,
    toggleTheme,
  } = useDriverTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const fadeAnim =
    useRef(new Animated.Value(0)).current;

  const slideAnim =
    useRef(new Animated.Value(28)).current;

  const scaleAnim =
    useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const entranceAnimation =
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
      ]);

    const backgroundAnimation =
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
      );

    entranceAnimation.start();
    backgroundAnimation.start();

    return () => {
      entranceAnimation.stop();
      backgroundAnimation.stop();
    };
  }, [
    fadeAnim,
    slideAnim,
    scaleAnim,
  ]);

  async function openDriverTerms() {
    try {
      const supported =
        await Linking.canOpenURL(
          DRIVER_TERMS_URL
        );

      if (!supported) {
        return;
      }

      await Linking.openURL(
        DRIVER_TERMS_URL
      );
    } catch (error) {
      console.warn(
        "Unable to open Driver Terms:",
        error
      );
    }
  }

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bgWrap,
          {
            transform: [
              {
                scale: scaleAnim,
              },
            ],
          },
        ]}
      >
        <ImageBackground
          source={require(
            "../assets/images/driver-bg.png"
          )}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={
            styles.container
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY:
                      slideAnim,
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.themePill}
              onPress={() => {
                void toggleTheme();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.themeText}>
                {themeMode === "dark"
                  ? "☀️ Light"
                  : "🌙 Dark"}
              </Text>
            </TouchableOpacity>

            <Image
              source={require(
                "../assets/images/angel-logo-transparent.png"
              )}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Angel Express"
            />

            <View style={styles.kickerBox}>
              <Text style={styles.kicker}>
                ANGEL EXPRESS DRIVER APP
              </Text>
            </View>

            <Text style={styles.heading}>
              Drive With{"\n"}
              <Text style={styles.goldText}>
                Excellence.
              </Text>
            </Text>

            <Text style={styles.subtitle}>
              Join a premium chauffeur network
              serving airport travelers, students,
              corporate clients, tourists, private
              groups, and special events.
            </Text>

            <View style={styles.actionCard}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() =>
                  router.push(
                    "/driver-login"
                  )
                }
                activeOpacity={0.86}
              >
                <View
                  style={
                    styles.buttonIconBox
                  }
                >
                  <LogIn
                    size={23}
                    color={colors.gold}
                  />
                </View>

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Chauffeur Login
                </Text>

                <Text
                  style={
                    styles.buttonArrow
                  }
                >
                  ›
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.secondaryButton
                }
                onPress={() =>
                  router.push(
                    "/driver-signup"
                  )
                }
                activeOpacity={0.86}
              >
                <View
                  style={
                    styles.outlineIconBox
                  }
                >
                  <UserPlus
                    size={23}
                    color={colors.gold}
                  />
                </View>

                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Apply As Chauffeur
                </Text>

                <Text
                  style={
                    styles.secondaryArrow
                  }
                >
                  ›
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.legalLinks}>
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    "/privacy-policy"
                  )
                }
                activeOpacity={0.8}
              >
                <Text style={styles.legalLink}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>

              <Text style={styles.legalDivider}>
                •
              </Text>

              <TouchableOpacity
                onPress={() => {
                  void openDriverTerms();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.legalLink}>
                  Driver Terms
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.commitmentBox}>
              <View
                style={
                  styles.commitmentIcon
                }
              >
                <ShieldCheck
                  size={22}
                  color={colors.gold}
                />
              </View>

              <View
                style={
                  styles.commitmentContent
                }
              >
                <Text
                  style={
                    styles.commitmentTitle
                  }
                >
                  Angel Express Commitment
                </Text>

                <Text
                  style={
                    styles.commitmentText
                  }
                >
                  Comfort • Reliability • Security •
                  Cleanliness
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
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
      backgroundColor: colors.overlay,
    },

    container: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 22,
      paddingTop: 58,
      paddingBottom: 46,
    },

    content: {
      width: "100%",
      maxWidth: 620,
      alignSelf: "center",
    },

    themePill: {
      alignSelf: "flex-end",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 14,
      marginBottom: 8,
    },

    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    logo: {
      width: "100%",
      height: 145,
      marginBottom: 10,
    },

    kickerBox: {
      alignSelf: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(255,255,255,0.06)"
          : colors.card,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 15,
      marginBottom: 18,
    },

    kicker: {
      color: colors.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.5,
    },

    heading: {
      color: colors.text,
      fontSize: 43,
      lineHeight: 48,
      fontWeight: "900",
      textAlign: "center",
      letterSpacing: -1.3,
      marginBottom: 15,
    },

    goldText: {
      color: colors.gold,
    },

    subtitle: {
      color: colors.text2,
      fontSize: 15.5,
      lineHeight: 24,
      textAlign: "center",
      fontWeight: "700",
      marginBottom: 24,
    },

    actionCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 30,
      padding: 16,
      marginBottom: 18,
      ...v5Shadow(colors),
    },

    primaryButton: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.gold,
      borderRadius: 22,
      paddingHorizontal: 14,
      marginBottom: 12,
    },

    buttonIconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.navy,
    },

    primaryButtonText: {
      flex: 1,
      color: colors.navy,
      fontSize: 17,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginLeft: 14,
    },

    buttonArrow: {
      color: colors.navy,
      fontSize: 38,
      fontWeight: "700",
    },

    secondaryButton: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1.5,
      borderColor: colors.gold,
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(5,11,22,0.78)"
          : colors.card,
      borderRadius: 22,
      paddingHorizontal: 14,
    },

    outlineIconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.08)"
          : "#FFF8E8",
    },

    secondaryButtonText: {
      flex: 1,
      color: colors.gold,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginLeft: 14,
    },

    secondaryArrow: {
      color: colors.gold,
      fontSize: 38,
      fontWeight: "700",
    },

    brandCard: {
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.08)"
          : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 19,
      marginBottom: 20,
    },

    brandTitle: {
      color: colors.gold,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 9,
    },

    brandText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
      textAlign: "center",
    },

    legalLinks: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },

    legalLink: {
      color: colors.gold,
      fontSize: 13,
      fontWeight: "900",
      textDecorationLine: "underline",
    },

    legalDivider: {
      color: colors.text2,
      marginHorizontal: 10,
    },

    commitmentBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.09)"
          : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 17,
    },

    commitmentIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.10)"
          : colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 13,
    },

    commitmentContent: {
      flex: 1,
    },

    commitmentTitle: {
      color: colors.gold,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "900",
      marginBottom: 5,
    },

    commitmentText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "800",
    },
  });
}