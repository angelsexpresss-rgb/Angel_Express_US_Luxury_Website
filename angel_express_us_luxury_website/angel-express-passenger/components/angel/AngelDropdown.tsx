import React, { useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";

import { AE_COLORS, AE_RADIUS } from "./theme";
import { pressIn, pressOut } from "./animations";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface Props {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function AngelDropdown({
  title,
  children,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const scale = useRef(new Animated.Value(1)).current;

  function toggleDropdown() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={toggleDropdown}
        onPressIn={() => pressIn(scale).start()}
        onPressOut={() => pressOut(scale).start()}
      >
        <Animated.View style={[styles.header, { transform: [{ scale }] }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.symbol}>{open ? "−" : "+"}</Text>
        </Animated.View>
      </Pressable>

      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },

  header: {
    minHeight: 74,
    borderRadius: AE_RADIUS.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    color: AE_COLORS.white,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  symbol: {
    color: AE_COLORS.gold,
    fontSize: 40,
    fontWeight: "300",
  },

  body: {
    paddingBottom: 14,
  },
});