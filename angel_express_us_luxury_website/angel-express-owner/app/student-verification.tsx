import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
  BadgeCheck,
  Bell,
  CalendarDays,
  Clock,
  GraduationCap,
  IdCard,
  Mail,
  MapPinned,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";
const NAVY = "#050b16";

export default function StudentVerificationQueue() {
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [approvedToday, setApprovedToday] = useState(0);
  const [rejectedToday, setRejectedToday] = useState(0);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const fade = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadQueue();
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  async function loadQueue() {
    try {
      setLoading(true);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: pending, error: pendingError } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("student_verification_status", "Pending Review")
        .order("student_verification_submitted_at", { ascending: false });

      if (pendingError) throw pendingError;

      const { count: approvedCount } = await supabase
        .from("passenger_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("student_verification_status", "Approved")
        .gte("student_verified_at", todayStart.toISOString());

      const { count: rejectedCount } = await supabase
        .from("student_verification_reviews")
        .select("id", { count: "exact", head: true })
        .eq("decision", "rejected")
        .gte("created_at", todayStart.toISOString());

      const withSignedUrls = await Promise.all(
        (pending || []).map(async (item) => {
          if (!item.student_id_path) return { ...item, signedUrl: null };

          const { data: signed, error: signedError } = await supabase.storage
            .from("student-ids")
            .createSignedUrl(item.student_id_path, 60 * 10);

          if (signedError) return { ...item, signedUrl: null };

          return { ...item, signedUrl: signed?.signedUrl || null };
        })
      );

      setPendingRequests(withSignedUrls);
      setApprovedToday(approvedCount || 0);
      setRejectedToday(rejectedCount || 0);
    } catch (error: any) {
      Alert.alert("Verification Queue Error", error.message || "Could not load queue.");
    } finally {
      setLoading(false);
    }
  }

  async function notifyPassenger(userId: string, status: "Approved" | "Rejected") {
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        title:
          status === "Approved"
            ? "Student Verification Approved"
            : "Student Verification Rejected",
        message:
          status === "Approved"
            ? "Your Angel Express student benefits are now active."
            : "Your student verification could not be approved. Please review your details and resubmit.",
        type: "student_verification",
        read: false,
      });
    } catch {
      console.log("Passenger notification insert skipped.");
    }
  }

  async function approveStudent(item: any) {
    const notes = reviewNotes[item.user_id] || "Verified by Angel Express.";

    const { error } = await supabase
      .from("passenger_profiles")
      .update({
        student_verified: true,
        student_verification_status: "Approved",
        student_verified_at: new Date().toISOString(),
        student_review_notes: notes,
      })
      .eq("user_id", item.user_id);

    if (error) {
      Alert.alert("Approval Error", error.message);
      return;
    }

    await supabase.from("student_verification_reviews").insert({
      passenger_user_id: item.user_id,
      decision: "approved",
      review_notes: notes,
    });

    await notifyPassenger(item.user_id, "Approved");

    Alert.alert("Approved", "Student verification approved.");
    setReviewNotes((prev) => ({ ...prev, [item.user_id]: "" }));
    loadQueue();
  }

  async function rejectStudent(item: any) {
    const notes = reviewNotes[item.user_id] || "Student ID could not be verified.";

    const { error } = await supabase
      .from("passenger_profiles")
      .update({
        student_verified: false,
        student_verification_status: "Rejected",
        student_review_notes: notes,
      })
      .eq("user_id", item.user_id);

    if (error) {
      Alert.alert("Rejection Error", error.message);
      return;
    }

    await supabase.from("student_verification_reviews").insert({
      passenger_user_id: item.user_id,
      decision: "rejected",
      review_notes: notes,
    });

    await notifyPassenger(item.user_id, "Rejected");

    Alert.alert("Rejected", "Student verification rejected.");
    setReviewNotes((prev) => ({ ...prev, [item.user_id]: "" }));
    loadQueue();
  }

  function confirmApprove(item: any) {
    Alert.alert(
      "Approve Student",
      "Approve this student and activate student benefits?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve", onPress: () => approveStudent(item) },
      ]
    );
  }

  function confirmReject(item: any) {
    Alert.alert(
      "Reject Student",
      "Reject this student verification request?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: () => rejectStudent(item) },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={styles.loadingText}>Loading owner review center...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/owner-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>

          <Animated.View style={{ opacity: fade }}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>OWNER OPERATIONS CENTER</Text>
                <Text style={styles.title}>Student Verification</Text>
                <Text style={styles.subtitle}>
                  Review student IDs, approve verified passengers, and control
                  student benefits across Angel Express.
                </Text>
              </View>

              <View style={styles.liveBadge}>
                <Text style={styles.liveDot}>●</Text>
                <Text style={styles.liveText}>Live Queue</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatCard title="Pending" value={pendingRequests.length} />
              <StatCard title="Approved Today" value={approvedToday} />
              <StatCard title="Rejected Today" value={rejectedToday} />
            </View>

            {pendingRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <ShieldCheck size={38} color={GOLD} />
                <Text style={styles.emptyTitle}>Queue Clear</Text>
                <Text style={styles.emptyText}>
                  No pending student verification requests.
                </Text>
              </View>
            ) : (
              pendingRequests.map((item) => (
                <VerificationCard
                  key={item.user_id}
                  item={item}
                  note={reviewNotes[item.user_id] || ""}
                  setNote={(text) =>
                    setReviewNotes((prev) => ({
                      ...prev,
                      [item.user_id]: text,
                    }))
                  }
                  onApprove={() => confirmApprove(item)}
                  onReject={() => confirmReject(item)}
                />
              ))
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function VerificationCard({
  item,
  note,
  setNote,
  onApprove,
  onReject,
}: {
  item: any;
  note: string;
  setNote: (text: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const submitted = item.student_verification_submitted_at
    ? new Date(item.student_verification_submitted_at)
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          {item.profile_photo_url ? (
            <Image source={{ uri: item.profile_photo_url }} style={styles.avatarImage} />
          ) : (
            <UserRound size={25} color={GOLD} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {item.first_name || "Passenger"} {item.last_name || ""}
          </Text>

          <View style={styles.pendingPill}>
            <Text style={styles.pendingDot}>●</Text>
            <Text style={styles.pendingText}>Pending Review</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickInfoGrid}>
        <QuickInfo
          icon={<GraduationCap size={16} color={GOLD} />}
          label="University"
          value={item.student_university}
        />
        <QuickInfo
          icon={<Mail size={16} color={GOLD} />}
          label="Student Email"
          value={item.student_email}
        />
        <QuickInfo
          icon={<MapPinned size={16} color={GOLD} />}
          label="Campus"
          value={item.student_campus}
        />
        <QuickInfo
          icon={<BadgeCheck size={16} color={GOLD} />}
          label="Level"
          value={item.student_level}
        />
        <QuickInfo
          icon={<CalendarDays size={16} color={GOLD} />}
          label="Graduation"
          value={item.student_expected_graduation}
        />
        <QuickInfo
          icon={<IdCard size={16} color={GOLD} />}
          label="ID Number"
          value={item.student_id_number}
        />
      </View>

      <View style={styles.timeRow}>
        <Clock size={16} color={GOLD} />
        <Text style={styles.timeText}>
          Submitted: {submitted ? submitted.toLocaleString() : "N/A"}
        </Text>
      </View>

      <View style={styles.idPreviewBox}>
        <Text style={styles.sectionTitle}>Student ID Preview</Text>

        {item.signedUrl ? (
          <Image source={{ uri: item.signedUrl }} style={styles.idImage} />
        ) : (
          <View style={styles.noImageBox}>
            <IdCard size={28} color={GOLD} />
            <Text style={styles.noImageText}>No student ID image available.</Text>
          </View>
        )}
      </View>

      <View style={styles.driverNotice}>
        <Bell size={17} color={GOLD} />
        <Text style={styles.driverNoticeText}>
          After approval, the Passenger App unlocks Student Travel+ and the Driver
          App only sees a Verified Student badge — not the ID image.
        </Text>
      </View>

      <TextInput
        style={styles.notes}
        placeholder="Owner review notes"
        placeholderTextColor="#8A93A3"
        value={note}
        onChangeText={setNote}
        multiline
      />

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.approveButton} onPress={onApprove}>
          <BadgeCheck size={18} color={NAVY} />
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
          <XCircle size={18} color="#FF6B6B" />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function QuickInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
}) {
  return (
    <View style={styles.quickInfo}>
      <View style={styles.quickIcon}>{icon}</View>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickValue}>{value || "N/A"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: NAVY },
  overlay: { flex: 1, backgroundColor: "rgba(5,11,22,0.92)" },
  container: { flex: 1 },
  content: { padding: 22, paddingTop: 60, paddingBottom: 50 },
  center: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#fff", marginTop: 12 },

  back: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 18,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },

  kicker: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  title: {
    color: GOLD,
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 8,
  },

  subtitle: {
    color: "#DDE3EA",
    fontSize: 15.5,
    lineHeight: 23,
  },

  liveBadge: {
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    backgroundColor: "rgba(212,175,55,0.08)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  liveDot: {
    color: "#2ECC71",
    fontSize: 11,
  },

  liveText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },

  statCard: {
    flex: 1,
    backgroundColor: "rgba(13,20,34,0.88)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },

  statValue: {
    color: GOLD,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 3,
  },

  statTitle: {
    color: "#DDE3EA",
    fontSize: 12,
    fontWeight: "800",
  },

  emptyCard: {
    backgroundColor: "rgba(13,20,34,0.86)",
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },

  emptyTitle: {
    color: GOLD,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 8,
  },

  emptyText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },

  card: {
    backgroundColor: "rgba(13,20,34,0.90)",
    borderRadius: 26,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.30)",
  },

  cardTop: {
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    marginBottom: 18,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,175,55,0.08)",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  name: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 7,
  },

  pendingPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(46,204,113,0.12)",
    borderWidth: 1,
    borderColor: "rgba(46,204,113,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  pendingDot: {
    color: "#2ECC71",
    fontSize: 10,
  },

  pendingText: {
    color: "#2ECC71",
    fontSize: 12,
    fontWeight: "900",
  },

  quickInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },

  quickInfo: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.16)",
    borderRadius: 17,
    padding: 12,
  },

  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.32)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  quickLabel: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  quickValue: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 19,
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
  },

  timeText: {
    color: "#DDE3EA",
    fontSize: 14,
    fontWeight: "700",
  },

  idPreviewBox: {
    marginBottom: 14,
  },

  sectionTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },

  idImage: {
    width: "100%",
    height: 300,
    borderRadius: 20,
    backgroundColor: "#000",
  },

  noImageBox: {
    minHeight: 160,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    backgroundColor: "rgba(255,255,255,0.055)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  noImageText: {
    color: "#DDE3EA",
    marginTop: 10,
    fontSize: 14,
  },

  driverNotice: {
    flexDirection: "row",
    gap: 9,
    padding: 13,
    borderRadius: 16,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    marginBottom: 14,
  },

  driverNoticeText: {
    color: GOLD,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "700",
    flex: 1,
  },

  notes: {
    backgroundColor: "#0D1422",
    color: "#fff",
    borderRadius: 16,
    padding: 14,
    minHeight: 92,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
    textAlignVertical: "top",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  approveButton: {
    flex: 1,
    backgroundColor: GOLD,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  approveText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: "900",
  },

  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#FF6B6B",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  rejectText: {
    color: "#FF6B6B",
    fontSize: 15,
    fontWeight: "900",
  },
});