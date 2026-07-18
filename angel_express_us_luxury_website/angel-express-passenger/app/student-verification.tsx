import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  GraduationCap,
  IdCard,
  ShieldCheck,
  Upload,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

export default function StudentVerificationScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [university, setUniversity] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [campus, setCampus] = useState("");
  const [studentLevel, setStudentLevel] = useState("");
  const [expectedGraduation, setExpectedGraduation] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [idImage, setIdImage] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.04,
          duration: 8500,
          useNativeDriver: true,
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 8500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, []);

  async function pickStudentId() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow photo access to upload your student ID."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setIdImage(result.assets[0]);
    }
  }

  async function uploadStudentId(userId: string) {
    if (!idImage?.uri) return { path: null, publicUrl: null };

    const fileExt = "jpg";
    const filePath = `${userId}/student-id-${Date.now()}.${fileExt}`;

    const response = await fetch(idImage.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("student-ids")
      .upload(filePath, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("student-ids").getPublicUrl(filePath);

    return {
      path: filePath,
      publicUrl: data?.publicUrl || null,
    };
  }

  async function submitVerification() {
    if (
      !university.trim() ||
      !studentEmail.trim() ||
      !campus.trim() ||
      !studentLevel.trim() ||
      !expectedGraduation.trim()
    ) {
      Alert.alert(
        "Missing Information",
        "Please complete university, student email, campus, student level, and expected graduation."
      );
      return;
    }

    if (!idImage?.uri) {
      Alert.alert(
        "Student ID Required",
        "Please upload a clear photo of your student ID."
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { data: passengerProfile, error: profileFetchError } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileFetchError) throw profileFetchError;
      if (!passengerProfile) throw new Error("Passenger profile not found.");

      const uploadedId = await uploadStudentId(user.id);
      const submittedAt = new Date().toISOString();

      const { error: profileUpdateError } = await supabase
        .from("passenger_profiles")
        .update({
          student_university: university.trim(),
          student_email: studentEmail.trim().toLowerCase(),
          student_campus: campus.trim(),
          student_level: studentLevel.trim(),
          student_expected_graduation: expectedGraduation.trim(),
          student_id_number: studentIdNumber.trim(),
          student_verification_notes: notes.trim(),

          student_id_path: uploadedId.path,
          student_id_url: uploadedId.publicUrl,
          student_id_uploaded: true,

          student_status: true,
          student_verified: false,
          student_discount_eligible: false,
          student_verification_status: "Pending Review",
          student_verification_submitted_at: submittedAt,
        })
        .eq("user_id", user.id);

      if (profileUpdateError) throw profileUpdateError;

      const { error: queueInsertError } = await supabase
        .from("student_verifications")
        .insert({
          passenger_id: passengerProfile.id,
          user_id: user.id,
          email: passengerProfile.email || user.email || "",
          student_email: studentEmail.trim().toLowerCase(),
          student_id_last4: studentIdNumber.trim(),
          school_name: university.trim(),
          student_id_photo_url: uploadedId.publicUrl || uploadedId.path,
          notes: notes.trim(),
          status: "Pending Review",
          student_verified: false,
          submitted_at: submittedAt,
        });

      if (queueInsertError) throw queueInsertError;

      Alert.alert(
        "Verification Submitted",
        "Your student verification has been submitted. Once approved, your student badge will show in Angel Express and driver-side ride details.",
        [{ text: "OK", onPress: () => router.replace("/student-travel" as any) }]
      );
    } catch (error: any) {
      Alert.alert(
        "Submission Error",
        error.message || "Could not submit verification."
      );
    } finally {
      setSaving(false);
    }
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/dashboard-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>STUDENT IDENTITY REVIEW</Text>

            <Text style={styles.title}>Student Verification</Text>

            <Text style={styles.subtitle}>
              Verify your student identity to unlock student discounts, campus
              pickup priority, ride pooling, and verified student status.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <GraduationCap size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Unlock Student Travel+</Text>
                <Text style={styles.heroText}>
                  Your ID is securely reviewed by Angel Express before benefits
                  are activated.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <BadgeCheck size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>School Information</Text>
              </View>

              <Label text="University / School" styles={styles} />
              <TextInput
                style={styles.input}
                placeholder="e.g. University of Texas at Dallas"
                placeholderTextColor={colors.placeholder}
                value={university}
                onChangeText={setUniversity}
              />

              <Label text="Student Email" styles={styles} />
              <TextInput
                style={styles.input}
                placeholder="e.g. name@utdallas.edu"
                placeholderTextColor={colors.placeholder}
                value={studentEmail}
                onChangeText={setStudentEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Label text="Campus / Main Pickup Area" styles={styles} />
              <TextInput
                style={styles.input}
                placeholder="e.g. UTD Richardson Campus"
                placeholderTextColor={colors.placeholder}
                value={campus}
                onChangeText={setCampus}
              />

              <Label text="Student Level" styles={styles} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Undergraduate, Masters, PhD"
                placeholderTextColor={colors.placeholder}
                value={studentLevel}
                onChangeText={setStudentLevel}
              />

              <Label text="Expected Graduation" styles={styles} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Fall 2026"
                placeholderTextColor={colors.placeholder}
                value={expectedGraduation}
                onChangeText={setExpectedGraduation}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IdCard size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>Student ID Upload</Text>
              </View>

              <Text style={styles.helperText}>
                Upload a clear photo of your student ID. Make sure your name and
                school are visible.
              </Text>

              <TouchableOpacity
                style={styles.uploadBox}
                onPress={pickStudentId}
                activeOpacity={0.85}
              >
                {idImage?.uri ? (
                  <Image source={{ uri: idImage.uri }} style={styles.previewImage} />
                ) : (
                  <>
                    <Camera size={34} color={colors.gold} />
                    <Text style={styles.uploadTitle}>Upload Student ID</Text>
                    <Text style={styles.uploadText}>
                      Tap to select from your photos
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {idImage?.uri && (
                <TouchableOpacity style={styles.changeButton} onPress={pickStudentId}>
                  <Upload size={17} color={colors.gold} />
                  <Text style={styles.changeButtonText}>
                    Change Student ID Photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={23} color={colors.gold} />
                <Text style={styles.cardTitle}>Verification Questions</Text>
              </View>

              <Label text="Student ID Number / Last 4 Digits" styles={styles} />
              <TextInput
                style={styles.input}
                placeholder="Optional, if available"
                placeholderTextColor={colors.placeholder}
                value={studentIdNumber}
                onChangeText={setStudentIdNumber}
              />

              <Label text="Notes for Angel Express Review" styles={styles} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Fall 2026 student, campus pickup preference, class schedule, or ID details"
                placeholderTextColor={colors.placeholder}
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  Your uploaded ID is stored privately for Angel Express review.
                  Drivers will only see your verified student badge/status after
                  approval, not your ID image.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.mainButton, saving && styles.disabledButton]}
              onPress={submitVerification}
              disabled={saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.mainButtonText}>Submit Verification</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.back()}
              activeOpacity={0.88}
            >
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Label({ text, styles }: { text: string; styles: any }) {
  return <Text style={styles.label}>{text}</Text>;
}

function createStyles(c: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
      overflow: "hidden",
    },
    bgWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    background: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 22,
      paddingTop: 58,
      paddingBottom: 54,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },
    themePill: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 10,
    },
    title: {
      color: c.text,
      fontSize: 36,
      fontWeight: "900",
      marginBottom: 10,
      letterSpacing: -0.7,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },

    heroCard: {
      minHeight: 120,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      color: c.navy,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.navy,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },

    label: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    input: {
      backgroundColor: c.input,
      color: c.inputText,
      padding: 17,
      borderRadius: 16,
      fontSize: 16,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.borderSoft,
      fontWeight: "700",
    },
    textArea: {
      height: 120,
      textAlignVertical: "top",
    },

    helperText: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 23,
      marginBottom: 16,
      fontWeight: "700",
    },
    uploadBox: {
      minHeight: 190,
      borderRadius: 20,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
      overflow: "hidden",
    },
    uploadTitle: {
      color: c.gold,
      fontSize: 19,
      fontWeight: "900",
      marginTop: 12,
      marginBottom: 6,
    },
    uploadText: {
      color: c.text2,
      fontSize: 14,
      fontWeight: "700",
    },
    previewImage: {
      width: "100%",
      height: 220,
      borderRadius: 18,
    },
    changeButton: {
      marginTop: 14,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      backgroundColor: c.soft,
    },
    changeButtonText: {
      color: c.gold,
      fontWeight: "900",
    },

    noticeBox: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
    },
    noticeText: {
      color: c.gold,
      fontSize: 13.5,
      lineHeight: 21,
      fontWeight: "800",
    },

    mainButton: {
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
      ...v5Shadow(c),
    },
    mainButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.7,
    },
    secondaryButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
    },
    secondaryButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}