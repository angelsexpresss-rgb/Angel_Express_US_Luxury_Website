import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AE_COLORS } from "./theme";

interface Props {
  title: string;
  children: React.ReactNode;
  horizontal?: boolean;
}

export default function AngelSection({
  title,
  children,
  horizontal = false,
}: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>

      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.column}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },

  title: {
    color: AE_COLORS.white,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 14,
  },

  row: {
    gap: 14,
    paddingRight: 20,
  },

  column: {
    gap: 12,
  },
});