import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useDriverTheme, v5Shadow } from "../lib/driverTheme";

export default function DriverAccountScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [driver, setDriver] = useState<any>(null);

  const [phone, setPhone] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [preferredRoutes, setPreferredRoutes] = useState("");
  const [zelle, setZelle] = useState("");
  const [cashApp, setCashApp] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadDriverAccount();
    }, [])
  );

  async function loadDriverAccount(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/driver-login");
        return;
      }

      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      setDriver(data);

      setPhone(data?.phone || "");
      setVehicleYear(String(data?.vehicle_year || ""));
      setVehicleMake(data?.vehicle_make || "");
      setVehicleModel(data?.vehicle_model || "");
      setPlateNumber(data?.plate_number || data?.license_plate || "");
      setPreferredRoutes(data?.preferred_routes || "");
      setZelle(data?.zelle || "");
      setCashApp(data?.cash_app || "");
    } catch (err: any) {
      Alert.alert("Account Error", err.message || "Unable to load account.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function saveDriverAccount() {
    if (!driver?.id) return;

    try {
      setSaving(true);

      const updateData: any = {
        phone: phone.trim(),
        vehicle_year: vehicleYear.trim(),
        vehicle_make: vehicleMake.trim(),
        vehicle_model: vehicleModel.trim(),
        plate_number: plateNumber.trim(),
        preferred_routes: preferredRoutes.trim(),
        zelle: zelle.trim(),
        cash_app: cashApp.trim(),
      };

      const { error } = await supabase
        .from("drivers")
        .update(updateData)
        .eq("id", driver.id);

      if (error) throw error;

      setDriver((current: any) => ({
        ...current,
        ...updateData,
      }));

      setEditing(false);

      Alert.alert("Saved", "Your account information has been updated.");
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Unable to save account.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setPhone(driver?.phone || "");
    setVehicleYear(String(driver?.vehicle_year || ""));
    setVehicleMake(driver?.vehicle_make || "");
    setVehicleModel(driver?.vehicle_model || "");
    setPlateNumber(driver?.plate_number || driver?.license_plate || "");
    setPreferredRoutes(driver?.preferred_routes || "");
    setZelle(driver?.zelle || "");
    setCashApp(driver?.cash_app || "");
    setEditing(false);
  }

  async function toggleOnlineStatus() {
    if (!driver?.id) return;

    const nextStatus = !driver?.is_online;

    try {
      setDriver((current: any) => ({
        ...current,
        is_online: nextStatus,
      }));

      const { error } = await supabase
        .from("drivers")
        .update({
          is_online: nextStatus,
        })
        .eq("id", driver.id);

      if (error) throw error;
    } catch (err: any) {
      setDriver((current: any) => ({
        ...current,
        is_online: !nextStatus,
      }));

      Alert.alert("Update Failed", err.message || "Unable to update status.");
    }
  }

  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/");
        },
      },
    ]);
  }

  function getFullName() {
    return (
      driver?.full_name ||
      driver?.name ||
      `${driver?.first_name || ""} ${driver?.last_name || ""}`.trim() ||
      "Angel Express Chauffeur"
    );
  }

  function getVehicle() {
    const vehicle = `${vehicleYear || ""} ${vehicleMake || ""} ${
      vehicleModel || ""
    }`.trim();

    return vehicle || "Vehicle not added";
  }

  function getPayoutStatus() {
    if (driver?.stripe_onboarding_complete) return "Stripe Connected";
    return driver?.payout_status || "Not Started";
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading account...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.gold}
              onRefresh={() => loadDriverAccount(true)}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.kicker}>ANGEL EXPRESS DRIVER APP</Text>
          <Text style={styles.title}>Account</Text>

          <Text style={styles.subtitle}>
            Manage your chauffeur profile, vehicle, payout backups, and driver tools.
          </Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(driver?.first_name?.[0] || driver?.full_name?.[0] || "A").toUpperCase()}
              </Text>
            </View>

            <Text style={styles.name}>{getFullName()}</Text>
            <Text style={styles.email}>{driver?.email || "No email added"}</Text>

            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusPill,
                  driver?.status === "approved" && styles.approvedPill,
                ]}
              >
                <Text style={styles.statusPillText}>
                  {String(driver?.status || "pending").toUpperCase()}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  driver?.is_online && styles.onlinePill,
                ]}
              >
                <Text style={styles.statusPillText}>
                  {driver?.is_online ? "ONLINE" : "OFFLINE"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Editable Information</Text>

              {!editing ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditing(true)}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelEditing}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            {editing ? (
              <>
                <EditInput
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  styles={styles}
                  colors={colors}
                  keyboardType="phone-pad"
                />

                <EditInput
                  label="Vehicle Year"
                  value={vehicleYear}
                  onChangeText={setVehicleYear}
                  styles={styles}
                  colors={colors}
                  keyboardType="number-pad"
                />

                <EditInput
                  label="Vehicle Make"
                  value={vehicleMake}
                  onChangeText={setVehicleMake}
                  styles={styles}
                  colors={colors}
                />

                <EditInput
                  label="Vehicle Model"
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  styles={styles}
                  colors={colors}
                />

                <EditInput
                  label="Plate Number"
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  styles={styles}
                  colors={colors}
                  autoCapitalize="characters"
                />

                <EditInput
                  label="Preferred Routes"
                  value={preferredRoutes}
                  onChangeText={setPreferredRoutes}
                  styles={styles}
                  colors={colors}
                  multiline
                />

                <EditInput
                  label="Backup Zelle"
                  value={zelle}
                  onChangeText={setZelle}
                  styles={styles}
                  colors={colors}
                />

                <EditInput
                  label="Backup Cash App"
                  value={cashApp}
                  onChangeText={setCashApp}
                  styles={styles}
                  colors={colors}
                />

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.disabledButton]}
                  onPress={saveDriverAccount}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.navy} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Info label="Phone" value={phone || "Not added"} styles={styles} />
                <Info label="Vehicle" value={getVehicle()} styles={styles} />
                <Info label="Plate Number" value={plateNumber || "Not added"} styles={styles} />
                <Info
                  label="Preferred Routes"
                  value={preferredRoutes || "Not added"}
                  styles={styles}
                />
                <Info label="Backup Zelle" value={zelle || "Not added"} styles={styles} />
                <Info
                  label="Backup Cash App"
                  value={cashApp || "Not added"}
                  styles={styles}
                />
              </>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Driver Status</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Online Status</Text>
              <Text style={styles.infoValue}>
                {driver?.is_online ? "Online" : "Offline"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                driver?.is_online && styles.outlineButton,
              ]}
              onPress={toggleOnlineStatus}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  driver?.is_online && styles.outlineButtonText,
                ]}
              >
                {driver?.is_online ? "Go Offline" : "Go Online"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Locked Profile Information</Text>

            <Info label="Full Name" value={getFullName()} styles={styles} />
            <Info label="Email" value={driver?.email || "Not added"} styles={styles} />
            <Info
              label="Driver License"
              value={driver?.driver_license || "Not added"}
              styles={styles}
            />
            <Info
              label="Years Driving"
              value={driver?.years_driving || "Not added"}
              styles={styles}
            />
            <Info label="Rating" value={driver?.rating || "5.0"} styles={styles} />
            <Info
              label="Driver Level"
              value={driver?.driver_level || "Bronze"}
              styles={styles}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payout Information</Text>

            <Info label="Payout Status" value={getPayoutStatus()} styles={styles} />
            <Info
              label="Stripe Account"
              value={driver?.stripe_account_id || "Not connected"}
              styles={styles}
            />
          </View>

          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push("/driver-card")}
            >
              <Text style={styles.quickIcon}>🪪</Text>
              <Text style={styles.quickTitle}>Driver Card</Text>
              <Text style={styles.quickText}>Passenger-facing profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push("/rewards")}
            >
              <Text style={styles.quickIcon}>🎁</Text>
              <Text style={styles.quickTitle}>Rewards</Text>
              <Text style={styles.quickText}>Level and perks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push("/earnings")}
            >
              <Text style={styles.quickIcon}>💳</Text>
              <Text style={styles.quickTitle}>Earnings</Text>
              <Text style={styles.quickText}>Trips and payouts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push("/support")}
            >
              <Text style={styles.quickIcon}>🎧</Text>
              <Text style={styles.quickTitle}>Support</Text>
              <Text style={styles.quickText}>Get help</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>🚪 Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

function Info({
  label,
  value,
  styles,
}: {
  label: string;
  value: any;
  styles: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value || "Not added")}</Text>
    </View>
  );
}

function EditInput({
  label,
  value,
  onChangeText,
  styles,
  colors,
  ...rest
}: any) {
  return (
    <View style={styles.editInputWrap}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.placeholder}
        style={[styles.editInput, rest.multiline && styles.editTextArea]}
        {...rest}
      />
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: colors.text2,
      marginTop: 14,
      fontWeight: "800",
    },
    container: {
      padding: 22,
      paddingTop: 60,
      paddingBottom: 50,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    backButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 14,
    },
    themePill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    kicker: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 36,
      fontWeight: "900",
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "700",
      marginBottom: 20,
    },
    profileCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,
      padding: 22,
      alignItems: "center",
      marginBottom: 18,
      ...v5Shadow(colors),
    },
    avatar: {
      width: 86,
      height: 86,
      borderRadius: 43,
      backgroundColor: colors.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    avatarText: {
      color: colors.navy,
      fontSize: 34,
      fontWeight: "900",
    },
    name: {
      color: colors.text,
      fontSize: 25,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 5,
    },
    email: {
      color: colors.text2,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 14,
    },
    statusRow: {
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    statusPill: {
      borderWidth: 1,
      borderColor: colors.borderSoft,
      backgroundColor: colors.card2,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 13,
    },
    approvedPill: {
      borderColor: colors.success,
      backgroundColor: colors.successSoft,
    },
    onlinePill: {
      borderColor: colors.gold,
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.16)" : "#FFF8E8",
    },
    statusPillText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "900",
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(colors),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      gap: 12,
    },
    sectionTitle: {
      color: colors.gold,
      fontSize: 21,
      fontWeight: "900",
      flex: 1,
    },
    editButton: {
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    editButtonText: {
      color: colors.navy,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    cancelButton: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    infoRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
      paddingBottom: 12,
      marginBottom: 12,
    },
    infoLabel: {
      color: colors.muted2,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 5,
    },
    infoValue: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
    },
    editInputWrap: {
      marginBottom: 14,
    },
    editLabel: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 7,
      letterSpacing: 0.8,
    },
    editInput: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      color: colors.inputText,
      borderRadius: 16,
      padding: 14,
      fontSize: 15,
      fontWeight: "700",
    },
    editTextArea: {
      minHeight: 92,
      textAlignVertical: "top",
    },
    saveButton: {
      backgroundColor: colors.gold,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 6,
    },
    saveButtonText: {
      color: colors.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.55,
    },
    primaryButton: {
      backgroundColor: colors.gold,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 4,
    },
    primaryButtonText: {
      color: colors.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    outlineButton: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    outlineButtonText: {
      color: colors.gold,
    },
    quickGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    quickCard: {
      width: "48%",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 16,
      marginBottom: 12,
      minHeight: 130,
    },
    quickIcon: {
      fontSize: 28,
      marginBottom: 10,
    },
    quickTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 5,
    },
    quickText: {
      color: colors.text2,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },
    logoutButton: {
      backgroundColor:
        colors.mode === "dark" ? "rgba(239,68,68,0.16)" : "#FEE2E2",
      borderWidth: 1,
      borderColor:
        colors.mode === "dark" ? "rgba(239,68,68,0.4)" : "rgba(220,38,38,0.28)",
      borderRadius: 18,
      paddingVertical: 17,
      alignItems: "center",
    },
    logoutText: {
      color: colors.mode === "dark" ? "#FCA5A5" : "#991B1B",
      fontSize: 17,
      fontWeight: "900",
    },
  });
}