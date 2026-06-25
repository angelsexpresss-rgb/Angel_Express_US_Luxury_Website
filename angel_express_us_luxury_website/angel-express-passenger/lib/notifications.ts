import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";
import { supabase } from "./supabase";

export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) {
      console.log("Push notifications require a real device.");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log("No Expo projectId found.");
      Alert.alert(
        "Push Notification Setup",
        "Expo projectId is missing. Add it to app.json first."
      );
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Please allow notifications for ride updates."
      );
      return null;
    }

  const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: "3f75f532-576a-4c1f-a6ad-72928a7710ef",
});

    const token = tokenData.data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("ride-updates", {
        name: "Ride Updates",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

 if (user) {
  const { error } = await supabase
    .from("passengers")
    .update({ expo_push_token: token })
    .eq("id", user.id);

  if (error) throw error;

  console.log("Expo push token saved:", token);
}

    return token;
  } catch (error: any) {
    console.log("Push notification registration error:", error.message);
    return null;
  }
}