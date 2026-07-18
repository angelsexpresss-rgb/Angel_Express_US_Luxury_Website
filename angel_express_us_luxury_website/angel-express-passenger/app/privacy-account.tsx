import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Animated,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Database,
  FileText,
  Headphones,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const SUPPORT_EMAIL = "support@angelexpressus.com";

export default function PrivacyAccountScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.04,
          duration: 8500,
          useNativeDriver: true,
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 8500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, []);

  function openPrivacyPolicy() {
    router.push("/privacy" as any);
  }

  function requestAccountDeletion() {
    Alert.alert(
      "Delete Account",
      "This will submit a request to permanently delete your Angel Express account and associated data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Deletion",
          style: "destructive",
          onPress: () => {
            const subject = "Account Deletion Request";
            const body =
              "I would like to permanently delete my Angel Express account and associated data.";

            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                subject
              )}&body=${encodeURIComponent(body)}`
            );
          },
        },
      ]
    );
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/dashboard-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>PRIVACY & ACCOUNT CONTROL</Text>

            <Text style={styles.title}>Privacy & Account</Text>

            <Text style={styles.subtitle}>
              Manage how Angel Express protects your information, supports safety,
              and handles account deletion requests.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <ShieldCheck size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Your Data. Protected.</Text>
                <Text style={styles.heroText}>
                  Angel Express uses your information only to support rides,
                  safety, communication, payments, rewards, and customer service.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<LockKeyhole size={24} color={colors.gold} />}
                title="Privacy Policy"
                styles={styles}
              />

              <Text style={styles.cardText}>
                Angel Express collects only the information needed to provide
                transportation services, safety features, notifications, trip history,
                rewards, and customer support.
              </Text>

              <TouchableOpacity style={styles.goldButton} onPress={openPrivacyPolicy}>
                <Text style={styles.goldButtonText}>View App Privacy Policy</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<Database size={24} color={colors.gold} />}
                title="Data We Collect"
                styles={styles}
              />

              <DataGrid
                styles={styles}
                iconColor={colors.gold}
                items={[
                  "Name",
                  "Email Address",
                  "Phone Number",
                  "Trip Information",
                  "Pickup & Drop-off",
                  "Emergency Contacts",
                  "Push Tokens",
                  "Rewards Activity",
                ]}
              />
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<UserCheck size={24} color={colors.gold} />}
                title="How We Use Your Data"
                styles={styles}
              />

              <Bullet text="Process ride bookings and trip requests." styles={styles} />
              <Bullet text="Provide safety notifications and live trip updates." styles={styles} />
              <Bullet text="Support Family Check-In+ and Safety Share." styles={styles} />
              <Bullet text="Connect passengers with owner and driver support." styles={styles} />
              <Bullet text="Manage rewards, referrals, discounts, and ride history." styles={styles} />
              <Bullet text="Improve customer service and travel assistance." styles={styles} />
            </View>

            <View style={styles.dangerCard}>
              <CardHeader
                icon={<Trash2 size={24} color={colors.danger} />}
                title="Request Account Deletion"
                danger
                styles={styles}
              />

              <Text style={styles.cardText}>
                You may request permanent deletion of your Angel Express account and
                personal information.
              </Text>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={requestAccountDeletion}
                activeOpacity={0.85}
              >
                <Trash2 size={18} color={colors.danger} />
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                Some records may be retained where required by law, safety,
                accounting, payment, fraud prevention, or regulatory compliance.
              </Text>
            </View>

            <View style={styles.card}>
              <CardHeader
                icon={<Headphones size={24} color={colors.gold} />}
                title="Need Help?"
                styles={styles}
              />

              <Text style={styles.cardText}>
                Contact Angel Express support for account, privacy, booking, reward,
                or safety questions.
              </Text>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => router.push("/support" as any)}
              >
                <Text style={styles.outlineButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function CardHeader({
  icon,
  title,
  danger,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  danger?: boolean;
  styles: any;
}) {
  return (
    <View style={styles.cardHeader}>
      <View style={[styles.iconBox, danger && styles.dangerIconBox]}>{icon}</View>
      <Text style={[styles.cardTitle, danger && styles.dangerTitle]}>
        {title}
      </Text>
    </View>
  );
}

function Bullet({ text, styles }: { text: string; styles: any }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function DataGrid({
  items,
  styles,
  iconColor,
}: {
  items: string[];
  styles: any;
  iconColor: string;
}) {
  return (
    <View style={styles.dataGrid}>
      {items.map((item) => (
        <View key={item} style={styles.dataPill}>
          <FileText size={15} color={iconColor} />
          <Text style={styles.dataPillText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(c: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
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
      backgroundColor: c.overlay,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 22,
      paddingTop: 58,
      paddingBottom: 54,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },
    themePill: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
    },
    title: {
      color: c.text,
      fontSize: 36,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },

    heroCard: {
      minHeight: 135,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      color: c.navy,
      fontSize: 23,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.navy,
      fontSize: 14.5,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    dangerCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.mode === "dark" ? "rgba(239,68,68,0.42)" : "rgba(220,38,38,0.28)",
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    dangerIconBox: {
      borderColor: c.mode === "dark" ? "rgba(239,68,68,0.5)" : "rgba(220,38,38,0.3)",
      backgroundColor: c.dangerSoft,
    },
    cardTitle: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },
    dangerTitle: {
      color: c.danger,
    },

    cardText: {
      color: c.text,
      fontSize: 15,
      lineHeight: 24,
      fontWeight: "700",
    },

    goldButton: {
      backgroundColor: c.gold,
      paddingVertical: 16,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 18,
      ...v5Shadow(c),
    },
    goldButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    outlineButton: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingVertical: 16,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 18,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    dataGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    dataPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card2,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    dataPillText: {
      color: c.text,
      fontSize: 13,
      fontWeight: "800",
    },

    bulletRow: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 10,
    },
    bulletDot: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      lineHeight: 23,
    },
    bulletText: {
      color: c.text,
      fontSize: 15,
      lineHeight: 23,
      flex: 1,
      fontWeight: "700",
    },

    deleteButton: {
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.mode === "dark" ? "rgba(239,68,68,0.48)" : "rgba(220,38,38,0.28)",
      paddingVertical: 16,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 18,
    },
    deleteButtonText: {
      color: c.danger,
      fontSize: 16,
      fontWeight: "900",
    },
    disclaimer: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 14,
      fontWeight: "700",
    },
  });
}