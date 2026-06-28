import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { AE_COLORS } from "./theme";
import { fadeDown, fadeUp } from "./animations";

interface Props {
  smallText?: string;
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

export default function AngelHeader({
  smallText = "Welcome back,",
  title,
  subtitle = "Safe. Reliable. Professional.",
  showLogo = true,
}: Props) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeDown(fade, 80).start();
  }, []);

  const translateY = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 0],
  });

  return (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fade,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.textBox}>
        <Text style={styles.smallText}>{smallText}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {showLogo && (
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>A</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },

  textBox: {
    flex: 1,
    paddingRight: 14,
  },

  smallText: {
    color: "#DDE3EA",
    fontSize: 18,
  },

  title: {
    color: AE_COLORS.gold,
    fontSize: 38,
    fontWeight: "900",
    marginTop: 4,
  },

  subtitle: {
    color: AE_COLORS.muted,
    fontSize: 15,
    marginTop: 8,
  },

  logoMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: AE_COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  logoMarkText: {
    color: AE_COLORS.navy2,
    fontSize: 32,
    fontWeight: "900",
    fontStyle: "italic",
  },
});