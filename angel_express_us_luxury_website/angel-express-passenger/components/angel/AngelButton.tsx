import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import {
  AE_COLORS,
  AE_RADIUS,
  AE_SHADOWS,
} from "./theme";

import {
  pressIn,
  pressOut,
  shimmerLoop,
} from "./animations";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "gold" | "outline" | "dark";
  style?: ViewStyle;
}

export default function AngelButton({
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
    outputRange: [-260, 260],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => pressIn(scale).start()}
        onPressOut={() => pressOut(scale).start()}
      >
        <Animated.View
          style={[
            styles.button,
            styles[variant],
            style,
          ]}
        >

          {variant === "gold" && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shimmer,
                {
                  transform: [
                    {
                      translateX,
                    },
                    {
                      rotate: "18deg",
                    },
                  ],
                },
              ]}
            />
          )}

          <Text
            style={[
              styles.text,
              variant === "gold"
                ? styles.darkText
                : styles.lightText,
            ]}
          >
            {title}
          </Text>

        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({

  button: {
    height: 60,
    borderRadius: AE_RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  gold: {
    backgroundColor: AE_COLORS.gold,
    borderWidth: 1,
    borderColor: AE_COLORS.goldLight,
    ...AE_SHADOWS.goldGlow,
  },

  outline: {
    borderWidth: 1,
    borderColor: AE_COLORS.gold,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  dark: {
    backgroundColor: AE_COLORS.glass,
    borderWidth: 1,
    borderColor: AE_COLORS.borderGold,
  },

  text: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  darkText: {
    color: AE_COLORS.navy,
  },

  lightText: {
    color: AE_COLORS.white,
  },

  shimmer: {
    position: "absolute",
    width: 90,
    height: 180,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

});