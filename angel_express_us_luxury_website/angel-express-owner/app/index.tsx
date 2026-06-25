import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function OwnerIndexScreen() {
  return <Redirect href="/owner-login" />;
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    color: "#d4af37",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  text: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});