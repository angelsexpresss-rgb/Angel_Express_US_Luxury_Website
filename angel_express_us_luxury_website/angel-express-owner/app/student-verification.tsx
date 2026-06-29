import React, { useCallback, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  Linking,
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
  Gift,
  GraduationCap,
  IdCard,
  Mail,
  MapPinned,
  Percent,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";
const NAVY = "#050b16";
const GREEN = "#2ECC71";
const RED = "#FF6B6B";
const BUCKET = "student-ids";

export default function StudentVerificationQueue() {
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [rideRequests, setRideRequests] = useState<any[]>([]);
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

  function getRequestKey(item: any) {
    return (
      item.id ||
      item.user_id ||
      item.passenger_id ||
      item.email ||
      Math.random().toString()
    );
  }

  function extractStoragePath(rawValue: any) {
    const raw = String(rawValue || "").trim();

    if (!raw) return "";

    if (!raw.startsWith("http")) {
      return raw;
    }

    try {
      const url = new URL(raw);
      const decodedPath = decodeURIComponent(url.pathname);

      const publicMarker = `/storage/v1/object/public/${BUCKET}/`;
      const signedMarker = `/storage/v1/object/sign/${BUCKET}/`;

      if (decodedPath.includes(publicMarker)) {
        return decodedPath.split(publicMarker)[1] || "";
      }

      if (decodedPath.includes(signedMarker)) {
        return decodedPath.split(signedMarker)[1] || "";
      }

      return "";
    } catch {
      return "";
    }
  }

  function getPublicStudentIdUrl(item: any) {
    const raw =
      item.student_id_photo_url ||
      item.student_id_path ||
      item.student_id_url ||
      item.id_photo_url ||
      item.id_photo_path ||
      "";

    const rawString = String(raw || "").trim();

    if (!rawString) return null;

    if (rawString.startsWith("http")) {
      return rawString;
    }

    const path = extractStoragePath(rawString);

    if (!path) return null;

    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null;
  }

  function normalizeVerificationRows(studentRows: any[], profileRows: any[]) {
    const map = new Map<string, any>();

    (studentRows || []).forEach((item) => {
      const key =
        item.passenger_id ||
        item.user_id ||
        String(item.email || "").trim().toLowerCase() ||
        item.id;

      map.set(String(key), {
        ...item,
        queue_source: "student_verifications",
      });
    });

    (profileRows || []).forEach((profile) => {
      const key =
        profile.id ||
        profile.user_id ||
        String(profile.email || "").trim().toLowerCase();

      if (map.has(String(key))) {
        const existing = map.get(String(key));
        map.set(String(key), {
          ...profile,
          ...existing,
          first_name: existing.first_name || profile.first_name,
          last_name: existing.last_name || profile.last_name,
          phone: existing.phone || profile.phone,
          email: existing.email || profile.email,
          student_campus: existing.student_campus || profile.student_campus,
          student_level: existing.student_level || profile.student_level,
          student_expected_graduation:
            existing.student_expected_graduation || profile.student_expected_graduation,
          student_id_photo_url:
            existing.student_id_photo_url ||
            profile.student_id_url ||
            profile.student_id_path,
          student_id_path: existing.student_id_path || profile.student_id_path,
          queue_source: "both",
        });
      } else {
        map.set(String(key), {
          id: profile.id,
          passenger_id: profile.id,
          user_id: profile.user_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          email: profile.email,
          student_email: profile.student_email,
          student_id_last4: profile.student_id_number,
          school_name: profile.student_university,
          student_campus: profile.student_campus,
          student_level: profile.student_level,
          student_expected_graduation: profile.student_expected_graduation,
          student_id_photo_url: profile.student_id_url || profile.student_id_path,
          student_id_path: profile.student_id_path,
          notes: profile.student_verification_notes,
          status: profile.student_verification_status || "Pending Review",
          student_verified: profile.student_verified,
          submitted_at: profile.student_verification_submitted_at,
          created_at: profile.student_verification_submitted_at || profile.created_at,
          queue_source: "passenger_profiles",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const dateA = new Date(a.submitted_at || a.created_at || 0).getTime();
      const dateB = new Date(b.submitted_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }

  async function loadQueue() {
    setLoading(true);

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let studentVerificationRows: any[] = [];
      let passengerProfileRows: any[] = [];
      let bookingsRows: any[] = [];

      const verificationResult = await supabase
        .from("student_verifications")
        .select("*")
        .in("status", [
          "pending",
          "Pending",
          "Pending Review",
          "submitted",
          "Submitted",
        ])
        .order("created_at", { ascending: false });

      if (verificationResult.error) {
        console.log("student_verifications load skipped:", verificationResult.error.message);
      } else {
        studentVerificationRows = verificationResult.data || [];
      }

      const profileResult = await supabase
        .from("passenger_profiles")
        .select("*")
        .or(
          "student_verification_status.eq.Pending Review,student_verification_status.eq.pending,student_verification_status.eq.submitted,student_id_uploaded.eq.true"
        )
        .order("student_verification_submitted_at", { ascending: false });

      if (profileResult.error) {
        console.log("passenger_profiles verification load skipped:", profileResult.error.message);
      } else {
        passengerProfileRows = (profileResult.data || []).filter((profile) => {
          const status = String(profile.student_verification_status || "").toLowerCase();
          const uploaded = profile.student_id_uploaded === true;
          const pending =
            status === "pending review" ||
            status === "pending" ||
            status === "submitted";

          return uploaded || pending;
        });
      }

      const combinedRows = normalizeVerificationRows(
        studentVerificationRows,
        passengerProfileRows
      );

      const rowsWithPublicUrls = combinedRows.map((item) => {
        const publicUrl = getPublicStudentIdUrl(item);
        return { ...item, publicUrl };
      });

      const approvedResult = await supabase
        .from("student_verifications")
        .select("id", { count: "exact", head: true })
        .in("status", ["approved", "Approved"])
        .gte("reviewed_at", todayStart.toISOString());

      if (!approvedResult.error) {
        setApprovedToday(approvedResult.count || 0);
      } else {
        console.log("approved count skipped:", approvedResult.error.message);
        setApprovedToday(0);
      }

      const rejectedResult = await supabase
        .from("student_verifications")
        .select("id", { count: "exact", head: true })
        .in("status", ["rejected", "Rejected"])
        .gte("reviewed_at", todayStart.toISOString());

      if (!rejectedResult.error) {
        setRejectedToday(rejectedResult.count || 0);
      } else {
        console.log("rejected count skipped:", rejectedResult.error.message);
        setRejectedToday(0);
      }

      const bookingsResult = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80);

      if (bookingsResult.error) {
        console.log("bookings reward/shared ride load skipped:", bookingsResult.error.message);
      } else {
        bookingsRows = bookingsResult.data || [];
      }

      const filteredRideRequests = bookingsRows.filter((b) => {
        const referralApplied = b.referral_applied === true;
        const referralPending =
          referralApplied && b.referral_credit_awarded !== true;

        const studentDiscount = Number(b.student_discount || 0) > 0;

        const sharedRide =
          b.shared_ride === true ||
          b.is_shared_ride === true ||
          b.student_shared_ride === true ||
          String(b.shared_ride_status || "").trim().length > 0 ||
          Number(b.shared_ride_discount || 0) > 0;

        return referralApplied || referralPending || studentDiscount || sharedRide;
      });

      setPendingRequests(rowsWithPublicUrls);
      setRideRequests(filteredRideRequests);
    } catch (error: any) {
      console.log("Verification Queue Error:", error);
      Alert.alert(
        "Verification Queue Error",
        error.message || "Could not load queue."
      );
    } finally {
      setLoading(false);
    }
  }

  async function notifyPassenger(userId: string, status: "Approved" | "Rejected") {
    if (!userId) return;

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

  async function updatePassengerProfile(item: any, approved: boolean, notes: string) {
    const updatePayload = {
      student_verified: approved,
      student_status: approved,
      student_discount_eligible: approved,
      student_verification_status: approved ? "Approved" : "Rejected",
      student_verified_at: approved ? new Date().toISOString() : null,
      student_review_notes: notes,
      student_email: item.student_email || item.email || null,
      student_id_number: item.student_id_last4 || null,
      student_university: item.school_name || null,
    };

    try {
      if (item.passenger_id) {
        await supabase
          .from("passenger_profiles")
          .update(updatePayload)
          .eq("id", item.passenger_id);
        return;
      }

      if (item.user_id) {
        await supabase
          .from("passenger_profiles")
          .update(updatePayload)
          .eq("user_id", item.user_id);
        return;
      }

      if (item.email) {
        await supabase
          .from("passenger_profiles")
          .update(updatePayload)
          .ilike("email", String(item.email).trim().toLowerCase());
      }
    } catch {
      console.log("Passenger profile update skipped.");
    }
  }

  async function approveStudent(item: any) {
    const key = getRequestKey(item);
    const notes = reviewNotes[key] || "Verified by Angel Express.";

    const { error } = await supabase
      .from("student_verifications")
      .update({
        status: "approved",
        student_verified: true,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      Alert.alert("Approval Error", error.message);
      return;
    }

    await updatePassengerProfile(item, true, notes);

    try {
      await supabase.from("student_verification_reviews").insert({
        passenger_user_id: item.user_id || null,
        passenger_id: item.passenger_id || null,
        student_verification_id: item.id,
        decision: "approved",
        review_notes: notes,
      });
    } catch {
      console.log("Review log insert skipped.");
    }

    await notifyPassenger(item.user_id, "Approved");

    Alert.alert("Approved", "Student verification approved.");
    setReviewNotes((prev) => ({ ...prev, [key]: "" }));
    loadQueue();
  }

  async function rejectStudent(item: any) {
    const key = getRequestKey(item);
    const notes = reviewNotes[key] || "Student ID could not be verified.";

    const { error } = await supabase
      .from("student_verifications")
      .update({
        status: "rejected",
        student_verified: false,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      Alert.alert("Rejection Error", error.message);
      return;
    }

    await updatePassengerProfile(item, false, notes);

    try {
      await supabase.from("student_verification_reviews").insert({
        passenger_user_id: item.user_id || null,
        passenger_id: item.passenger_id || null,
        student_verification_id: item.id,
        decision: "rejected",
        review_notes: notes,
      });
    } catch {
      console.log("Review log insert skipped.");
    }

    await notifyPassenger(item.user_id, "Rejected");

    Alert.alert("Rejected", "Student verification rejected.");
    setReviewNotes((prev) => ({ ...prev, [key]: "" }));
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
    Alert.alert("Reject Student", "Reject this student verification request?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reject", style: "destructive", onPress: () => rejectStudent(item) },
    ]);
  }

  async function markReferralCreditAwarded(item: any) {
    if (!item.id) return;

    const { error } = await supabase
      .from("bookings")
      .update({ referral_credit_awarded: true })
      .eq("id", item.id);

    if (error) {
      Alert.alert("Reward Error", error.message);
      return;
    }

    Alert.alert("Updated", "Referral credit marked as awarded.");
    loadQueue();
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
                  Review student IDs, approve student benefits, monitor shared
                  ride requests, and track referral rewards.
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

            <Text style={styles.sectionHeader}>Student Verification Queue</Text>

            {pendingRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <ShieldCheck size={38} color={GOLD} />
                <Text style={styles.emptyTitle}>Queue Clear</Text>
                <Text style={styles.emptyText}>
                  No pending student verification requests.
                </Text>
              </View>
            ) : (
              pendingRequests.map((item) => {
                const key = getRequestKey(item);

                return (
                  <VerificationCard
                    key={key}
                    item={item}
                    note={reviewNotes[key] || ""}
                    setNote={(text) =>
                      setReviewNotes((prev) => ({
                        ...prev,
                        [key]: text,
                      }))
                    }
                    onApprove={() => confirmApprove(item)}
                    onReject={() => confirmReject(item)}
                  />
                );
              })
            )}

            <Text style={styles.sectionHeader}>
              Student Rides, Referrals & Shared Ride Requests
            </Text>

            {rideRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Gift size={38} color={GOLD} />
                <Text style={styles.emptyTitle}>No Reward Requests</Text>
                <Text style={styles.emptyText}>
                  No student discounts, shared ride requests, or pending referral
                  credits found yet.
                </Text>
              </View>
            ) : (
              rideRequests.map((item) => (
                <RideRewardCard
                  key={item.id || item.invoice_no}
                  item={item}
                  onMarkReferralCredit={() => markReferralCreditAwarded(item)}
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
  const submittedRaw =
    item.submitted_at || item.created_at || item.student_verification_submitted_at;

  const submitted = submittedRaw ? new Date(submittedRaw) : null;

  function openImage() {
    if (!item.publicUrl) {
      Alert.alert("Image Unavailable", "Could not load the student ID image from the public bucket.");
      return;
    }

    Linking.openURL(item.publicUrl);
  }

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
            {item.first_name || item.name || "Passenger"} {item.last_name || ""}
          </Text>

          <Text style={styles.smallMuted}>
            {item.email || item.student_email || "No email"}
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
          value={item.school_name || item.student_university}
        />

        <QuickInfo
          icon={<Mail size={16} color={GOLD} />}
          label="Student Email"
          value={item.student_email || item.email}
        />

        <QuickInfo
          icon={<MapPinned size={16} color={GOLD} />}
          label="Campus"
          value={item.student_campus || item.campus}
        />

        <QuickInfo
          icon={<BadgeCheck size={16} color={GOLD} />}
          label="Status"
          value={item.status || "Pending"}
        />

        <QuickInfo
          icon={<CalendarDays size={16} color={GOLD} />}
          label="Graduation"
          value={item.student_expected_graduation}
        />

        <QuickInfo
          icon={<IdCard size={16} color={GOLD} />}
          label="ID Last 4"
          value={item.student_id_last4 || item.student_id_number}
        />
      </View>

      <View style={styles.timeRow}>
        <Clock size={16} color={GOLD} />
        <Text style={styles.timeText}>
          Submitted: {submitted ? submitted.toLocaleString() : "N/A"}
        </Text>
      </View>

      <View style={styles.idPreviewBox}>
        <Text style={styles.cardSectionTitle}>Student ID Preview</Text>

        {item.publicUrl ? (
          <>
            <Image
              source={{ uri: item.publicUrl }}
              style={styles.idImage}
              resizeMode="contain"
              onError={(e) => {
                console.log("Student ID image load error:", e.nativeEvent.error);
                Alert.alert("Image Error", e.nativeEvent.error || "Could not display student ID image.");
              }}
            />

            <TouchableOpacity style={styles.openImageButton} onPress={openImage}>
              <IdCard size={18} color={NAVY} />
              <Text style={styles.openImageButtonText}>Open Full ID Image</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.noImageBox}>
            <IdCard size={28} color={GOLD} />
            <Text style={styles.noImageText}>
              No student ID image available. Check that the file path exists in the
              public student-ids bucket.
            </Text>
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
          <XCircle size={18} color={RED} />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RideRewardCard({
  item,
  onMarkReferralCredit,
}: {
  item: any;
  onMarkReferralCredit: () => void;
}) {
  const referralApplied = item.referral_applied === true;
  const pendingCredit = referralApplied && item.referral_credit_awarded !== true;

  const sharedRide =
    item.shared_ride === true ||
    item.is_shared_ride === true ||
    item.student_shared_ride === true;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Gift size={25} color={GOLD} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {item.passenger_name || item.name || "Website Passenger"}
          </Text>
          <Text style={styles.smallMuted}>{item.email || "No email"}</Text>
        </View>
      </View>

      <View style={styles.quickInfoGrid}>
        <QuickInfo
          icon={<Gift size={16} color={GOLD} />}
          label="Referral Code Used"
          value={item.referral_code_used || item.referral_code || "None"}
        />

        <QuickInfo
          icon={<Percent size={16} color={GOLD} />}
          label="Referral Discount"
          value={money(item.referral_discount)}
        />

        <QuickInfo
          icon={<UserRound size={16} color={GOLD} />}
          label="Referrer"
          value={item.referrer_user_id || "None"}
        />

        <QuickInfo
          icon={<GraduationCap size={16} color={GOLD} />}
          label="Student Discount"
          value={money(item.student_discount)}
        />

        <QuickInfo
          icon={<Users size={16} color={GOLD} />}
          label="Shared Ride Status"
          value={item.shared_ride_status || (sharedRide ? "Requested" : "Not Shared")}
        />

        <QuickInfo
          icon={<Clock size={16} color={GOLD} />}
          label="Pending Referral Credit"
          value={pendingCredit ? "Yes" : "No"}
        />
      </View>

      <View style={styles.routeBox}>
        <Text style={styles.routeText}>
          {item.pickup || item.pickup_address || "Pickup N/A"}
        </Text>

        <Text style={styles.routeArrow}>↓</Text>

        <Text style={styles.routeText}>
          {item.dropoff || item.dropoff_address || "Drop-off N/A"}
        </Text>
      </View>

      <View style={styles.quickInfoGrid}>
        <QuickInfo
          icon={<Users size={16} color={GOLD} />}
          label="Shared Ride"
          value={sharedRide ? "Yes" : "No"}
        />

        <QuickInfo
          icon={<Percent size={16} color={GOLD} />}
          label="Shared Discount"
          value={money(item.shared_ride_discount)}
        />

        <QuickInfo
          icon={<CalendarDays size={16} color={GOLD} />}
          label="Trip Date"
          value={item.ride_date || item.date}
        />

        <QuickInfo
          icon={<Clock size={16} color={GOLD} />}
          label="Trip Time"
          value={item.ride_time || item.time}
        />
      </View>

      {pendingCredit ? (
        <TouchableOpacity style={styles.approveButton} onPress={onMarkReferralCredit}>
          <BadgeCheck size={18} color={NAVY} />
          <Text style={styles.approveText}>Mark Referral Credit Awarded</Text>
        </TouchableOpacity>
      ) : null}
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
      <Text style={styles.quickValue}>
        {value || value === 0 ? String(value) : "N/A"}
      </Text>
    </View>
  );
}

function money(value: any) {
  return "$" + Number(value || 0).toFixed(2);
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: NAVY,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,11,22,0.92)",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 22,
    paddingTop: 60,
    paddingBottom: 50,
  },
  center: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
  },
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
    color: GREEN,
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
  sectionHeader: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: "rgba(13,20,34,0.86)",
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    marginBottom: 20,
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
  smallMuted: {
    color: "#B8C1CC",
    fontSize: 13,
    fontWeight: "700",
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
    color: GREEN,
    fontSize: 10,
  },
  pendingText: {
    color: GREEN,
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
  cardSectionTitle: {
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
  openImageButton: {
    marginTop: 12,
    backgroundColor: GOLD,
    borderRadius: 16,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  openImageButtonText: {
    color: NAVY,
    fontWeight: "900",
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
    textAlign: "center",
    lineHeight: 20,
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
    borderColor: RED,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  rejectText: {
    color: RED,
    fontSize: 15,
    fontWeight: "900",
  },
  routeBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    marginBottom: 14,
  },
  routeText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },
  routeArrow: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    marginVertical: 4,
  },
});