import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import { AE_COLORS, AE_RADIUS, AE_SHADOWS } from "./theme";
import { fadeUp, pressIn, pressOut } from "./animations";

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  delay?: number;
  variant?: "glass" | "gold" | "dark";
}

export default function AngelCard({
  children,
  onPress,
  style,
  delay = 0,
  variant = "glass",
}: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeUp(fade, delay).start();
  }, []);

  const translateY = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  const content = (
    <Animated.View
      style={[
        styles.card,
        styles[variant],
        style,
        {
          opacity: fade,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => pressIn(scale).start()}
      onPressOut={() => pressOut(scale).start()}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AE_RADIUS.xl,
    padding: 18,
    overflow: "hidden",
  },

  glass: {
    backgroundColor: AE_COLORS.glass,
    borderWidth: 1,
    borderColor: AE_COLORS.borderGold,
    ...AE_SHADOWS.darkGlow,
  },

  gold: {
    backgroundColor: AE_COLORS.gold,
    borderWidth: 1,
    borderColor: AE_COLORS.goldLight,
    ...AE_SHADOWS.goldGlow,
  },

  dark: {
    backgroundColor: AE_COLORS.glassDark,
    borderWidth: 1,
    borderColor: AE_COLORS.borderWhite,
  },
});