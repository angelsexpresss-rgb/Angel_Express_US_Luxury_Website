import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { AE_COLORS, AE_RADIUS, AE_SHADOWS } from "./theme";
import { pressIn, pressOut, shimmerLoop } from "./animations";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "gold" | "outline";
  style?: ViewStyle;
}

export default function AngelHeroButton({
  title,
  onPress,
  variant = "gold",
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (variant === "gold") {
      shimmerLoop(shimmer).start();
    }
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-280, 360],
  });

  const isGold = variant === "gold";

  return (
    <Animated.View style={{ width: "100%", transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => pressIn(scale).start()}
        onPressOut={() => pressOut(scale).start()}
      >
        <View
          style={[
            styles.button,
            isGold ? styles.goldButton : styles.outlineButton,
            style,
          ]}
        >
          {isGold && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX }, { rotate: "18deg" }],
                },
              ]}
            />
          )}

          <View style={[styles.iconBox, !isGold && styles.iconBoxOutline]}>
            <Text style={[styles.iconText, !isGold && styles.iconTextOutline]}>
              A
            </Text>
          </View>

          <Text style={[styles.title, isGold ? styles.darkTitle : styles.lightTitle]}>
            {title}
          </Text>

          <Text style={[styles.arrow, isGold ? styles.darkArrow : styles.goldArrow]}>
            ›
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 68,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },

  goldButton: {
    backgroundColor: AE_COLORS.gold,
    borderWidth: 1,
    borderColor: AE_COLORS.goldLight,
    ...AE_SHADOWS.goldGlow,
  },

  outlineButton: {
    backgroundColor: "rgba(5,11,22,0.74)",
    borderWidth: 1.5,
    borderColor: AE_COLORS.gold,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: AE_COLORS.navy2,
    alignItems: "center",
    justifyContent: "center",
  },

  iconBoxOutline: {
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.50)",
  },

  iconText: {
    color: AE_COLORS.gold,
    fontSize: 27,
    fontWeight: "900",
    fontStyle: "italic",
  },

  iconTextOutline: {
    color: AE_COLORS.gold,
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  darkTitle: {
    color: AE_COLORS.navy2,
  },

  lightTitle: {
    color: AE_COLORS.white,
  },

  arrow: {
    fontSize: 42,
    fontWeight: "300",
    marginTop: -4,
  },

  darkArrow: {
    color: AE_COLORS.navy2,
  },

  goldArrow: {
    color: AE_COLORS.gold,
  },

  shimmer: {
    position: "absolute",
    width: 100,
    height: 190,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
});