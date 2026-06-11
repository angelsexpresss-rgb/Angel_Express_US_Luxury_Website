import { View, Text, StyleSheet } from "react-native";

export default function RewardsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rewards</Text>
      <Text style={styles.text}>This feature is coming next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040C18",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#D4AF37",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
    textAlign: "center",
  },
});