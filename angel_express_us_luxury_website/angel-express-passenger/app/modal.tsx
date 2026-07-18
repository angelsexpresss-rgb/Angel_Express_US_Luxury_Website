import { router } from "expo-router";
import { useMemo } from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CheckCircle2,
  Gift,
  Home,
  Ticket,
  X,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

export default function ModalScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ImageBackground
      source={require("../assets/images/dashboard-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.closePill} onPress={() => router.back()}>
            <X size={18} color={colors.gold} />
            <Text style={styles.closePillText}>Close</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
            <Text style={styles.themeText}>
              {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <CheckCircle2 size={62} color={colors.gold} />
          </View>

          <Text style={styles.kicker}>ANGEL EXPRESS MOBILITY</Text>

          <Text style={styles.title}>Angel Express</Text>

          <Text style={styles.subtitle}>Operation Completed Successfully</Text>

          <Text style={styles.description}>
            Your request has been processed successfully. Continue exploring
            Angel Express.
          </Text>

          <TouchableOpacity
            style={styles.goldButton}
            onPress={() => router.replace("/dashboard" as any)}
            activeOpacity={0.88}
          >
            <Home color={colors.navy} size={22} />
            <Text style={styles.goldButtonText}>Go To Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push("/book-ride" as any)}
            activeOpacity={0.88}
          >
            <Ticket color={colors.gold} size={22} />
            <Text style={styles.outlineButtonText}>Book Another Ride</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push("/rewards" as any)}
            activeOpacity={0.88}
          >
            <Gift color={colors.gold} size={22} />
            <Text style={styles.outlineButtonText}>View Rewards</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

function createStyles(c: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },

    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },

    topRow: {
      position: "absolute",
      top: 58,
      left: 22,
      right: 22,
      zIndex: 5,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    closePill: {
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

    closePillText: {
      color: c.gold,
      fontSize: 14,
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

    card: {
      width: "100%",
      backgroundColor: c.card,
      borderRadius: 30,
      borderWidth: 1,
      borderColor: c.border,
      padding: 28,
      alignItems: "center",
      ...v5Shadow(c),
    },

    iconCircle: {
      width: 94,
      height: 94,
      borderRadius: 47,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 22,
    },

    kicker: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.4,
      marginBottom: 10,
      textAlign: "center",
    },

    title: {
      color: c.gold,
      fontSize: 34,
      fontWeight: "900",
      textAlign: "center",
    },

    subtitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: "900",
      marginTop: 10,
      textAlign: "center",
      lineHeight: 29,
    },

    description: {
      color: c.text2,
      fontSize: 16,
      textAlign: "center",
      lineHeight: 25,
      marginTop: 18,
      marginBottom: 30,
      fontWeight: "700",
    },

    goldButton: {
      width: "100%",
      minHeight: 60,
      backgroundColor: c.gold,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      marginBottom: 14,
      ...v5Shadow(c),
    },

    goldButtonText: {
      color: c.navy,
      fontSize: 17,
      fontWeight: "900",
      marginLeft: 10,
      textTransform: "uppercase",
    },

    outlineButton: {
      width: "100%",
      minHeight: 58,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card2,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      marginBottom: 14,
    },

    outlineButtonText: {
      color: c.gold,
      fontSize: 16,
      fontWeight: "900",
      marginLeft: 10,
      textTransform: "uppercase",
    },

    closeText: {
      color: c.text2,
      fontSize: 16,
      marginTop: 10,
      fontWeight: "800",
    },
  });
}