import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { useOwnerTheme } from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

type GenericRecord = Record<string, any>;

type StudentRecord = GenericRecord & {
  id?: string | number;
  verification_id?: string | number | null;
  profile_id?: string | number | null;
  passenger_id?: string | null;
  user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  student_email?: string | null;
  phone?: string | null;
  school_name?: string | null;
  student_university?: string | null;
  student_campus?: string | null;
  student_level?: string | null;
  student_expected_graduation?: string | null;
  student_id_last4?: string | null;
  student_id_number?: string | null;
  student_id_photo_url?: string | null;
  student_id_url?: string | null;
  student_id_path?: string | null;
  id_photo_url?: string | null;
  id_photo_path?: string | null;
  student_id_uploaded?: boolean | null;
  student_verified?: boolean | null;
  student_verification_status?: string | null;
  status?: string | null;
  reviewer_notes?: string | null;
  student_review_notes?: string | null;
  notes?: string | null;
  submitted_at?: string | null;
  student_verification_submitted_at?: string | null;
  created_at?: string | null;
  reviewed_at?: string | null;
  student_verified_at?: string | null;
  profile_photo_url?: string | null;
  queue_source?: "student_verifications" | "passenger_profiles" | "both";
  publicUrl?: string | null;
};

type StudentTab = "pending" | "verified" | "rejected" | "rides";

const BUCKET = "student-ids";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function recordStatus(item: StudentRecord) {
  if (item.student_verified === true) return "verified";

  const status = normalize(
    item.status || item.student_verification_status
  );

  if (["approved", "verified", "active"].includes(status)) {
    return "verified";
  }

  if (["rejected", "denied", "declined"].includes(status)) {
    return "rejected";
  }

  return "pending";
}

function displayName(item: StudentRecord) {
  return (
    `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
    item.full_name ||
    item.name ||
    item.email ||
    "Student Passenger"
  );
}

function submittedDate(item: StudentRecord) {
  return (
    item.submitted_at ||
    item.student_verification_submitted_at ||
    item.created_at ||
    null
  );
}

function money(value: any) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

export default function StudentVerificationScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [rideRequests, setRideRequests] = useState<GenericRecord[]>([]);
  const [reviewNotes, setReviewNotes] =
    useState<Record<string, string>>({});

  const [tab, setTab] = useState<StudentTab>("pending");
  const [query, setQuery] = useState("");

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadStudentOperations();
    }, [])
  );

  function identityKeys(item: StudentRecord) {
    return [
      item.user_id,
      item.passenger_id,
      item.profile_id,
      item.email?.trim().toLowerCase(),
      item.student_email?.trim().toLowerCase(),
    ]
      .filter(Boolean)
      .map(String);
  }

  function stableKey(item: StudentRecord) {
    return String(
      item.verification_id ||
        item.user_id ||
        item.passenger_id ||
        item.profile_id ||
        item.email ||
        item.student_email ||
        item.id
    );
  }

  function extractStoragePath(rawValue: any) {
    const raw = String(rawValue || "").trim();

    if (!raw) return "";
    if (!raw.startsWith("http")) return raw;

    try {
      const url = new URL(raw);
      const decodedPath = decodeURIComponent(url.pathname);

      const publicMarker =
        `/storage/v1/object/public/${BUCKET}/`;
      const signedMarker =
        `/storage/v1/object/sign/${BUCKET}/`;

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

  function getStudentIdUrl(item: StudentRecord) {
    const raw =
      item.student_id_photo_url ||
      item.student_id_url ||
      item.student_id_path ||
      item.id_photo_url ||
      item.id_photo_path ||
      "";

    const rawString = String(raw || "").trim();

    if (!rawString) return null;
    if (rawString.startsWith("http")) return rawString;

    const path = extractStoragePath(rawString);

    if (!path) return null;

    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return data?.publicUrl || null;
  }

  function mergeStudentRows(
    verificationRows: GenericRecord[],
    profileRows: GenericRecord[]
  ) {
    const records: StudentRecord[] = [];
    const map = new Map<string, StudentRecord>();

    function findExisting(item: StudentRecord) {
      const keys = identityKeys(item);

      return keys
        .map((key) => map.get(key))
        .find(Boolean);
    }

    function save(item: StudentRecord) {
      const existing = findExisting(item);

      const merged: StudentRecord = existing
        ? {
            ...existing,
            ...item,
            verification_id:
              item.verification_id ||
              existing.verification_id,
            profile_id:
              item.profile_id || existing.profile_id,
            first_name:
              item.first_name || existing.first_name,
            last_name:
              item.last_name || existing.last_name,
            email: item.email || existing.email,
            student_email:
              item.student_email ||
              existing.student_email,
            phone: item.phone || existing.phone,
            school_name:
              item.school_name ||
              item.student_university ||
              existing.school_name ||
              existing.student_university,
            student_campus:
              item.student_campus ||
              existing.student_campus,
            student_level:
              item.student_level ||
              existing.student_level,
            student_expected_graduation:
              item.student_expected_graduation ||
              existing.student_expected_graduation,
            student_id_photo_url:
              item.student_id_photo_url ||
              item.student_id_url ||
              item.student_id_path ||
              existing.student_id_photo_url ||
              existing.student_id_url ||
              existing.student_id_path,
            profile_photo_url:
              item.profile_photo_url ||
              existing.profile_photo_url,
            queue_source: "both",
          }
        : item;

      identityKeys(merged).forEach((key) =>
        map.set(key, merged)
      );

      if (!existing) {
        records.push(merged);
      } else {
        const index = records.indexOf(existing);

        if (index >= 0) records[index] = merged;
      }
    }

    verificationRows.forEach((row) => {
      save({
        ...row,
        verification_id: row.id,
        queue_source: "student_verifications",
      });
    });

    profileRows.forEach((profile) => {
      save({
        ...profile,
        id: profile.id,
        profile_id: profile.id,
        passenger_id:
          profile.passenger_id || profile.id,
        school_name:
          profile.student_university ||
          profile.school_name,
        student_id_last4:
          profile.student_id_number ||
          profile.student_id_last4,
        student_id_photo_url:
          profile.student_id_url ||
          profile.student_id_path ||
          profile.student_id_photo_url,
        status:
          profile.student_verification_status ||
          profile.status,
        submitted_at:
          profile.student_verification_submitted_at ||
          profile.submitted_at,
        reviewer_notes:
          profile.student_review_notes ||
          profile.reviewer_notes,
        queue_source: "passenger_profiles",
      });
    });

    return records
      .map((item) => ({
        ...item,
        publicUrl: getStudentIdUrl(item),
      }))
      .filter((item) => {
        /*
         * Preserve every real submission:
         * - a verification row,
         * - an uploaded student ID,
         * - a student status,
         * - or student profile data.
         */
        return Boolean(
          item.verification_id ||
            item.student_id_uploaded ||
            item.student_id_photo_url ||
            item.student_id_url ||
            item.student_id_path ||
            item.student_verification_status ||
            item.status ||
            item.student_email ||
            item.school_name ||
            item.student_university
        );
      })
      .sort((a, b) => {
        const dateA = new Date(
          submittedDate(a) || 0
        ).getTime();

        const dateB = new Date(
          submittedDate(b) || 0
        ).getTime();

        return dateB - dateA;
      });
  }

  async function safeSelect(table: string) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*");

      if (error) {
        console.log(`${table} load skipped:`, error.message);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  async function loadStudentOperations(
    showLoader = true
  ) {
    try {
      if (showLoader) setLoading(true);

      /*
       * Load all verification records, not only exact pending spellings.
       * Client-side normalization prevents older submissions from disappearing.
       */
      const [
        verificationRows,
        profileRows,
        bookingRows,
      ] = await Promise.all([
        safeSelect("student_verifications"),
        safeSelect("passenger_profiles"),
        safeSelect("bookings"),
      ]);

      setStudents(
        mergeStudentRows(
          verificationRows,
          profileRows
        )
      );

      setRideRequests(
        bookingRows
          .filter((booking) => {
            const referral =
              booking.referral_applied === true;

            const studentDiscount =
              Number(booking.student_discount || 0) >
              0;

            const sharedRide =
              booking.shared_ride === true ||
              booking.is_shared_ride === true ||
              booking.student_shared_ride === true ||
              Boolean(booking.shared_ride_status) ||
              Number(
                booking.shared_ride_discount || 0
              ) > 0;

            return referral || studentDiscount || sharedRide;
          })
          .sort((a, b) => {
            return (
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime()
            );
          })
      );
    } catch (error: any) {
      Alert.alert(
        "Student Operations Error",
        error?.message ||
          "Unable to load student operations."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function updateProfile(
    item: StudentRecord,
    approved: boolean,
    notes: string
  ) {
    const payload = {
      student_verified: approved,
      student_status: approved,
      student_discount_eligible: approved,
      student_verification_status: approved
        ? "Approved"
        : "Rejected",
      student_verified_at: approved
        ? new Date().toISOString()
        : null,
      student_review_notes: notes,
      student_email:
        item.student_email || item.email || null,
      student_id_number:
        item.student_id_last4 ||
        item.student_id_number ||
        null,
      student_university:
        item.school_name ||
        item.student_university ||
        null,
    };

    if (item.profile_id || item.passenger_id) {
      const id =
        item.profile_id || item.passenger_id;

      const response = await supabase
        .from("passenger_profiles")
        .update(payload)
        .eq("id", id);

      if (!response.error) return;
    }

    if (item.user_id) {
      const response = await supabase
        .from("passenger_profiles")
        .update(payload)
        .eq("user_id", item.user_id);

      if (!response.error) return;
    }

    if (item.email) {
      await supabase
        .from("passenger_profiles")
        .update(payload)
        .ilike(
          "email",
          String(item.email).trim()
        );
    }
  }

  async function updateVerification(
    item: StudentRecord,
    approved: boolean,
    notes: string
  ) {
    const payload = {
      status: approved ? "approved" : "rejected",
      student_verified: approved,
      reviewer_notes: notes,
      reviewed_at: new Date().toISOString(),
    };

    if (item.verification_id) {
      const { error } = await supabase
        .from("student_verifications")
        .update(payload)
        .eq("id", item.verification_id);

      if (error) throw error;

      return;
    }

    /*
     * Profile-only legacy submissions did not always create a row in
     * student_verifications. Create a history row instead of losing them.
     */
    const insertPayload = {
      passenger_id:
        item.passenger_id ||
        item.profile_id ||
        null,
      user_id: item.user_id || null,
      email:
        item.email ||
        item.student_email ||
        null,
      student_email:
        item.student_email ||
        item.email ||
        null,
      school_name:
        item.school_name ||
        item.student_university ||
        null,
      student_id_last4:
        item.student_id_last4 ||
        item.student_id_number ||
        null,
      student_id_photo_url:
        item.student_id_photo_url ||
        item.student_id_url ||
        item.student_id_path ||
        null,
      ...payload,
    };

    const { error } = await supabase
      .from("student_verifications")
      .insert(insertPayload);

    if (error) {
      console.log(
        "Verification history insert skipped:",
        error.message
      );
    }
  }

  async function notifyPassenger(
    item: StudentRecord,
    approved: boolean
  ) {
    const passengerId =
      item.user_id ||
      item.passenger_id ||
      item.profile_id;

    if (!passengerId) return;

    const payload = {
      passenger_id: passengerId,
      title: approved
        ? "Student Verification Approved"
        : "Student Verification Rejected",
      message: approved
        ? "Your Angel Express student benefits are now active."
        : "Your student verification could not be approved. Please review your details and resubmit.",
      type: "student_verification",
      priority: "normal",
      is_read: false,
      sent_by: "owner",
    };

    const response = await supabase
      .from("passenger_notifications")
      .insert(payload);

    if (response.error) {
      await supabase.from("notifications").insert({
        user_id: passengerId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        read: false,
      });
    }
  }

  async function reviewStudent(
    item: StudentRecord,
    approved: boolean
  ) {
    const key = stableKey(item);

    const notes =
      reviewNotes[key] ||
      (approved
        ? "Verified by Angel Express."
        : "Student ID could not be verified.");

    try {
      setReviewingKey(key);

      await updateVerification(
        item,
        approved,
        notes
      );

      await updateProfile(
        item,
        approved,
        notes
      );

      try {
        await supabase
          .from("student_verification_reviews")
          .insert({
            passenger_user_id:
              item.user_id || null,
            passenger_id:
              item.passenger_id ||
              item.profile_id ||
              null,
            student_verification_id:
              item.verification_id || null,
            decision: approved
              ? "approved"
              : "rejected",
            review_notes: notes,
          });
      } catch {
        console.log("Review log insert skipped.");
      }

      await notifyPassenger(item, approved);

      /*
       * Move the student immediately to Verified or Rejected.
       * Do not delete the submission from the module.
       */
      setStudents((current) =>
        current.map((student) =>
          stableKey(student) === key
            ? {
                ...student,
                status: approved
                  ? "approved"
                  : "rejected",
                student_verification_status:
                  approved
                    ? "Approved"
                    : "Rejected",
                student_verified: approved,
                reviewed_at:
                  new Date().toISOString(),
                reviewer_notes: notes,
                student_review_notes: notes,
              }
            : student
        )
      );

      setReviewNotes((current) => ({
        ...current,
        [key]: "",
      }));

      setTab(approved ? "verified" : "rejected");

      Alert.alert(
        approved ? "Student Verified" : "Student Rejected",
        approved
          ? "The submission has moved to Verified Students."
          : "The submission has moved to Rejected Students."
      );

      await loadStudentOperations(false);
    } catch (error: any) {
      Alert.alert(
        approved
          ? "Approval Error"
          : "Rejection Error",
        error?.message ||
          "Unable to complete the review."
      );
    } finally {
      setReviewingKey(null);
    }
  }

  function confirmReview(
    item: StudentRecord,
    approved: boolean
  ) {
    Alert.alert(
      approved
        ? "Approve Student"
        : "Reject Student",
      approved
        ? "Approve this submission and activate verified student benefits?"
        : "Reject this student verification submission?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: approved ? "Approve" : "Reject",
          style: approved
            ? "default"
            : "destructive",
          onPress: () =>
            reviewStudent(item, approved),
        },
      ]
    );
  }

  async function markReferralAwarded(
    booking: GenericRecord
  ) {
    if (!booking.id) return;

    const { error } = await supabase
      .from("bookings")
      .update({
        referral_credit_awarded: true,
      })
      .eq("id", booking.id);

    if (error) {
      Alert.alert(
        "Reward Error",
        error.message
      );
      return;
    }

    Alert.alert(
      "Reward Updated",
      "Referral credit marked as awarded."
    );

    loadStudentOperations(false);
  }

  const pendingStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          recordStatus(student) === "pending"
      ),
    [students]
  );

  const verifiedStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          recordStatus(student) === "verified"
      ),
    [students]
  );

  const rejectedStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          recordStatus(student) === "rejected"
      ),
    [students]
  );

  const displayedStudents = useMemo(() => {
    const source =
      tab === "pending"
        ? pendingStudents
        : tab === "verified"
          ? verifiedStudents
          : rejectedStudents;

    const search = query
      .trim()
      .toLowerCase();

    if (!search) return source;

    return source.filter((item) =>
      [
        displayName(item),
        item.email,
        item.student_email,
        item.school_name,
        item.student_university,
        item.student_campus,
        item.student_id_last4,
        item.student_id_number,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [
    tab,
    query,
    pendingStudents,
    verifiedStudents,
    rejectedStudents,
  ]);

  function metricWidth() {
    if (isLarge) return "23.5%";
    if (isTablet) return "31.8%";
    return "48%";
  }

  function cardWidth() {
    if (isLarge) return "48.8%";
    return "100%";
  }

  function MetricCard({
    label,
    value,
    icon,
    color,
    background,
  }: {
    label: string;
    value: number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    background: string;
  }) {
    return (
      <View
        style={[
          styles.metricCard,
          {
            width: metricWidth(),
            backgroundColor:
              theme.colors.card,
            borderColor:
              theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View
          style={[
            styles.metricIcon,
            { backgroundColor: background },
          ]}
        >
          <Ionicons
            name={icon}
            size={21}
            color={color}
          />
        </View>

        <Text
          style={[
            styles.metricValue,
            { color: theme.colors.text },
          ]}
        >
          {value}
        </Text>

        <Text
          style={[
            styles.metricLabel,
            { color: theme.colors.textMuted },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }

  function StudentCard({
    item,
  }: {
    item: StudentRecord;
  }) {
    const key = stableKey(item);
    const status = recordStatus(item);
    const reviewing = reviewingKey === key;

    const statusColor =
      status === "verified"
        ? theme.colors.success
        : status === "rejected"
          ? theme.colors.danger
          : theme.colors.warning;

    const statusBackground =
      status === "verified"
        ? theme.colors.successSoft
        : status === "rejected"
          ? theme.colors.dangerSoft
          : theme.colors.warningSoft;

    const submitted = submittedDate(item);

    return (
      <View
        style={[
          styles.studentCard,
          {
            width: cardWidth(),
            backgroundColor:
              theme.colors.card,
            borderColor: statusColor,
          },
          theme.shadows.soft,
        ]}
      >
        <View style={styles.studentHeader}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
              },
            ]}
          >
            {item.profile_photo_url ? (
              <Image
                source={{
                  uri: item.profile_photo_url,
                }}
                style={styles.avatarImage}
              />
            ) : (
              <Text
                style={[
                  styles.avatarText,
                  { color: theme.colors.gold },
                ]}
              >
                {displayName(item)
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            )}
          </View>

          <View style={styles.studentTitleArea}>
            <Text
              style={[
                styles.studentName,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {displayName(item)}
            </Text>

            <Text
              style={[
                styles.studentEmail,
                {
                  color:
                    theme.colors.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {item.student_email ||
                item.email ||
                "Email not provided"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  statusBackground,
              },
            ]}
          >
            <Ionicons
              name={
                status === "verified"
                  ? "shield-checkmark-outline"
                  : status === "rejected"
                    ? "close-circle-outline"
                    : "time-outline"
              }
              size={13}
              color={statusColor}
            />

            <Text
              style={[
                styles.statusText,
                { color: statusColor },
              ]}
            >
              {status === "verified"
                ? "Verified"
                : status === "rejected"
                  ? "Rejected"
                  : "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          {[
            [
              "school-outline",
              "University",
              item.school_name ||
                item.student_university ||
                "Not provided",
            ],
            [
              "location-outline",
              "Campus",
              item.student_campus ||
                "Not provided",
            ],
            [
              "ribbon-outline",
              "Level",
              item.student_level ||
                "Not provided",
            ],
            [
              "calendar-outline",
              "Graduation",
              item.student_expected_graduation ||
                "Not provided",
            ],
            [
              "card-outline",
              "ID Last 4",
              item.student_id_last4 ||
                item.student_id_number ||
                "Not provided",
            ],
            [
              "server-outline",
              "Record Source",
              item.queue_source ||
                "Unknown",
            ],
          ].map(([icon, label, value]) => (
            <View
              key={label}
              style={[
                styles.infoItem,
                {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                  borderColor:
                    theme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name={icon as any}
                size={17}
                color={theme.colors.gold}
              />

              <Text
                style={[
                  styles.infoLabel,
                  {
                    color:
                      theme.colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>

              <Text
                style={[
                  styles.infoValue,
                  { color: theme.colors.text },
                ]}
                numberOfLines={2}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.submittedRow}>
          <Ionicons
            name="time-outline"
            size={17}
            color={theme.colors.info}
          />

          <Text
            style={[
              styles.submittedText,
              {
                color:
                  theme.colors.textSecondary,
              },
            ]}
          >
            Submitted:{" "}
            {submitted
              ? new Date(
                  submitted
                ).toLocaleString()
              : "Date unavailable"}
          </Text>
        </View>

        <View style={styles.idSection}>
          <Text
            style={[
              styles.sectionLabel,
              { color: theme.colors.gold },
            ]}
          >
            STUDENT ID
          </Text>

          {item.publicUrl ? (
            <>
              <Image
                source={{ uri: item.publicUrl }}
                style={[
                  styles.idImage,
                  {
                    backgroundColor:
                      theme.colors.surfaceSoft,
                  },
                ]}
                resizeMode="contain"
              />

              <TouchableOpacity
                style={[
                  styles.openImageButton,
                  {
                    backgroundColor:
                      theme.colors.goldTransparent,
                    borderColor:
                      theme.colors.gold,
                  },
                ]}
                onPress={() =>
                  Linking.openURL(
                    String(item.publicUrl)
                  )
                }
              >
                <Ionicons
                  name="expand-outline"
                  size={18}
                  color={theme.colors.gold}
                />

                <Text
                  style={[
                    styles.openImageText,
                    { color: theme.colors.gold },
                  ]}
                >
                  Open Full ID
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View
              style={[
                styles.noImageBox,
                {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                  borderColor:
                    theme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name="image-outline"
                size={28}
                color={theme.colors.textMuted}
              />

              <Text
                style={[
                  styles.noImageText,
                  {
                    color:
                      theme.colors.textMuted,
                  },
                ]}
              >
                No student ID image is linked to this submission.
              </Text>
            </View>
          )}
        </View>

        {(item.reviewer_notes ||
          item.student_review_notes) &&
        status !== "pending" ? (
          <View
            style={[
              styles.reviewBox,
              {
                backgroundColor:
                  statusBackground,
                borderColor: statusColor,
              },
            ]}
          >
            <Text
              style={[
                styles.reviewLabel,
                { color: statusColor },
              ]}
            >
              OWNER REVIEW
            </Text>

            <Text
              style={[
                styles.reviewText,
                {
                  color:
                    theme.colors.textSecondary,
                },
              ]}
            >
              {item.reviewer_notes ||
                item.student_review_notes}
            </Text>
          </View>
        ) : null}

        {status === "pending" ? (
          <>
            <TextInput
              style={[
                styles.notesInput,
                {
                  color: theme.colors.text,
                  backgroundColor:
                    theme.colors.inputBackground,
                  borderColor:
                    theme.colors.inputBorder,
                },
              ]}
              placeholder="Owner review notes"
              placeholderTextColor={
                theme.colors.inputPlaceholder
              }
              value={reviewNotes[key] || ""}
              onChangeText={(text) =>
                setReviewNotes((current) => ({
                  ...current,
                  [key]: text,
                }))
              }
              multiline
              textAlignVertical="top"
            />

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.approveButton,
                  {
                    backgroundColor:
                      theme.colors.success,
                  },
                ]}
                disabled={reviewing}
                onPress={() =>
                  confirmReview(item, true)
                }
              >
                {reviewing ? (
                  <ActivityIndicator
                    color="#ffffff"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#ffffff"
                    />

                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Approve & Verify
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rejectButton,
                  {
                    backgroundColor:
                      theme.colors.dangerSoft,
                    borderColor:
                      theme.colors.danger,
                  },
                ]}
                disabled={reviewing}
                onPress={() =>
                  confirmReview(item, false)
                }
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={theme.colors.danger}
                />

                <Text
                  style={[
                    styles.secondaryButtonText,
                    {
                      color:
                        theme.colors.danger,
                    },
                  ]}
                >
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>
    );
  }

  function RideCard({
    booking,
  }: {
    booking: GenericRecord;
  }) {
    const referralApplied =
      booking.referral_applied === true;

    const pendingCredit =
      referralApplied &&
      booking.referral_credit_awarded !== true;

    const sharedRide =
      booking.shared_ride === true ||
      booking.is_shared_ride === true ||
      booking.student_shared_ride === true;

    return (
      <View
        style={[
          styles.rideCard,
          {
            width: cardWidth(),
            backgroundColor:
              theme.colors.card,
            borderColor:
              theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View style={styles.rideHeader}>
          <View
            style={[
              styles.rideIcon,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
              },
            ]}
          >
            <Ionicons
              name="gift-outline"
              size={22}
              color={theme.colors.gold}
            />
          </View>

          <View style={styles.rideTitleArea}>
            <Text
              style={[
                styles.rideTitle,
                { color: theme.colors.text },
              ]}
            >
              Trip #{booking.id}
            </Text>

            <Text
              style={[
                styles.rideSubtitle,
                {
                  color:
                    theme.colors.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {booking.passenger_name ||
                booking.name ||
                booking.email ||
                "Passenger"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.routeBox,
            {
              backgroundColor:
                theme.colors.surfaceSoft,
              borderColor:
                theme.colors.cardBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.routeText,
              {
                color:
                  theme.colors.textSecondary,
              },
            ]}
          >
            {booking.pickup_address ||
              booking.pickup ||
              "Pickup unavailable"}
          </Text>

          <Ionicons
            name="arrow-down"
            size={17}
            color={theme.colors.gold}
          />

          <Text
            style={[
              styles.routeText,
              {
                color:
                  theme.colors.textSecondary,
              },
            ]}
          >
            {booking.dropoff_address ||
              booking.dropoff ||
              "Drop-off unavailable"}
          </Text>
        </View>

        <View style={styles.rewardGrid}>
          {[
            [
              "Referral",
              booking.referral_code_used ||
                booking.referral_code ||
                "None",
            ],
            [
              "Referral Discount",
              money(
                booking.referral_discount
              ),
            ],
            [
              "Student Discount",
              money(
                booking.student_discount
              ),
            ],
            [
              "Shared Ride",
              sharedRide ? "Yes" : "No",
            ],
            [
              "Shared Discount",
              money(
                booking.shared_ride_discount
              ),
            ],
            [
              "Credit Pending",
              pendingCredit ? "Yes" : "No",
            ],
          ].map(([label, value]) => (
            <View
              key={label}
              style={styles.rewardItem}
            >
              <Text
                style={[
                  styles.rewardLabel,
                  {
                    color:
                      theme.colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>

              <Text
                style={[
                  styles.rewardValue,
                  { color: theme.colors.text },
                ]}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>

        {pendingCredit ? (
          <TouchableOpacity
            style={[
              styles.awardButton,
              {
                backgroundColor:
                  theme.colors.gold,
              },
            ]}
            onPress={() =>
              markReferralAwarded(booking)
            }
          >
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={theme.colors.textInverse}
            />

            <Text
              style={[
                styles.awardButtonText,
                {
                  color:
                    theme.colors.textInverse,
                },
              ]}
            >
              Mark Referral Credit Awarded
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.gold}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                theme.colors.textSecondary,
            },
          ]}
        >
          Loading Student Operations Center...
        </Text>
      </View>
    );
  }

  const tabs: {
    key: StudentTab;
    label: string;
    count: number;
  }[] = [
    {
      key: "pending",
      label: "Pending",
      count: pendingStudents.length,
    },
    {
      key: "verified",
      label: "Verified",
      count: verifiedStudents.length,
    },
    {
      key: "rejected",
      label: "Rejected",
      count: rejectedStudents.length,
    },
    {
      key: "rides",
      label: "Rides & Rewards",
      count: rideRequests.length,
    },
  ];

  return (
    <ImageBackground
      source={require("../assets/images/owner-bg.png")}
      style={[
        styles.background,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
      resizeMode="cover"
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? "rgba(3,8,17,0.94)"
              : "rgba(245,247,250,0.96)",
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.container,
            {
              maxWidth: isLarge
                ? 1350
                : 1100,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadStudentOperations(
                  false
                );
              }}
              tintColor={theme.colors.gold}
              colors={[theme.colors.gold]}
            />
          }
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor:
                    theme.colors.card,
                  borderColor:
                    theme.colors.cardBorder,
                },
              ]}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={theme.colors.gold}
              />
            </TouchableOpacity>

            <View style={styles.titleArea}>
              <Text
                style={[
                  styles.eyebrow,
                  { color: theme.colors.gold },
                ]}
              >
                ANGEL EXPRESS STUDENT OPERATIONS
              </Text>

              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Student Verification Center
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  {
                    color:
                      theme.colors.textMuted,
                  },
                ]}
              >
                Review student IDs, organize verified students,
                preserve review history, and manage student rides,
                shared rides, discounts, and referral rewards.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label="Pending Review"
              value={pendingStudents.length}
              icon="time-outline"
              color={theme.colors.warning}
              background={
                theme.colors.warningSoft
              }
            />

            <MetricCard
              label="Verified Students"
              value={verifiedStudents.length}
              icon="shield-checkmark-outline"
              color={theme.colors.success}
              background={
                theme.colors.successSoft
              }
            />

            <MetricCard
              label="Rejected"
              value={rejectedStudents.length}
              icon="close-circle-outline"
              color={theme.colors.danger}
              background={
                theme.colors.dangerSoft
              }
            />

            <MetricCard
              label="Rides & Rewards"
              value={rideRequests.length}
              icon="gift-outline"
              color={theme.colors.gold}
              background={
                theme.colors.goldTransparent
              }
            />
          </View>

          <View
            style={[
              styles.controlPanel,
              {
                backgroundColor:
                  theme.colors.card,
                borderColor:
                  theme.colors.cardBorderStrong,
              },
              theme.shadows.soft,
            ]}
          >
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor:
                    theme.colors.inputBackground,
                  borderColor:
                    theme.colors.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.colors.textMuted}
              />

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search student, email, university, campus, or ID"
                placeholderTextColor={
                  theme.colors.inputPlaceholder
                }
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.searchInput,
                  { color: theme.colors.text },
                ]}
              />

              {query ? (
                <TouchableOpacity
                  onPress={() => setQuery("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={
                      theme.colors.textMuted
                    }
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.tabRow
              }
            >
              {tabs.map((item) => {
                const selected =
                  tab === item.key;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.tabChip,
                      {
                        backgroundColor:
                          selected
                            ? theme.colors
                                .goldTransparent
                            : theme.colors
                                .surfaceSoft,
                        borderColor: selected
                          ? theme.colors.gold
                          : theme.colors
                              .cardBorder,
                      },
                    ]}
                    onPress={() =>
                      setTab(item.key)
                    }
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color: selected
                            ? theme.colors.gold
                            : theme.colors
                                .textMuted,
                        },
                      ]}
                    >
                      {item.label} ({item.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text
                style={[
                  styles.sectionEyebrow,
                  { color: theme.colors.gold },
                ]}
              >
                {tab === "rides"
                  ? "STUDENT TRAVEL BENEFITS"
                  : "STUDENT VERIFICATION RECORDS"}
              </Text>

              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                {
                  tabs.find(
                    (item) =>
                      item.key === tab
                  )?.label
                }
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.refreshButton,
                {
                  backgroundColor:
                    theme.colors.card,
                  borderColor:
                    theme.colors.cardBorder,
                },
              ]}
              onPress={() =>
                loadStudentOperations(false)
              }
            >
              <Ionicons
                name="refresh"
                size={18}
                color={theme.colors.gold}
              />

              <Text
                style={[
                  styles.refreshText,
                  {
                    color:
                      theme.colors
                        .textSecondary,
                  },
                ]}
              >
                Refresh
              </Text>
            </TouchableOpacity>
          </View>

          {tab === "rides" ? (
            rideRequests.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor:
                      theme.colors.card,
                    borderColor:
                      theme.colors.cardBorder,
                  },
                ]}
              >
                <Ionicons
                  name="gift-outline"
                  size={36}
                  color={theme.colors.gold}
                />

                <Text
                  style={[
                    styles.emptyTitle,
                    {
                      color:
                        theme.colors.text,
                    },
                  ]}
                >
                  No student ride rewards
                </Text>

                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        theme.colors
                          .textMuted,
                    },
                  ]}
                >
                  Student discounts, shared rides, and referral
                  rewards will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.cardGrid}>
                {rideRequests.map(
                  (booking) => (
                    <RideCard
                      key={String(
                        booking.id ||
                          booking.invoice_no
                      )}
                      booking={booking}
                    />
                  )
                )}
              </View>
            )
          ) : displayedStudents.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor:
                    theme.colors.card,
                  borderColor:
                    theme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name={
                  tab === "verified"
                    ? "shield-checkmark-outline"
                    : tab === "rejected"
                      ? "close-circle-outline"
                      : "school-outline"
                }
                size={38}
                color={
                  tab === "verified"
                    ? theme.colors.success
                    : tab === "rejected"
                      ? theme.colors.danger
                      : theme.colors.gold
                }
              />

              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No {tab} student records
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.colors.textMuted,
                  },
                ]}
              >
                {tab === "pending"
                  ? "New student verification submissions will appear here."
                  : tab === "verified"
                    ? "Approved submissions will be organized here."
                    : "Rejected submissions will remain here for review history."}
              </Text>
            </View>
          ) : (
            <View style={styles.cardGrid}>
              {displayedStudents.map(
                (item) => (
                  <StudentCard
                    key={stableKey(item)}
                    item={item}
                  />
                )
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
  },

  container: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 60,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 28,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  titleArea: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  pageTitle: {
    fontSize: 29,
    fontWeight: "900",
  },

  pageSubtitle: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 780,
  },

  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  metricCard: {
    minHeight: 132,
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    marginBottom: 13,
  },

  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  metricValue: {
    fontSize: 27,
    fontWeight: "900",
  },

  metricLabel: {
    marginTop: 5,
    fontSize: 11.5,
    fontWeight: "700",
  },

  controlPanel: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
  },

  searchBox: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
  },

  searchInput: {
    flex: 1,
    height: 52,
    marginHorizontal: 10,
    fontSize: 14,
    fontWeight: "600",
  },

  tabRow: {
    gap: 9,
    paddingTop: 14,
    paddingRight: 10,
  },

  tabChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  tabText: {
    fontSize: 11,
    fontWeight: "800",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  sectionEyebrow: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
  },

  refreshButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
  },

  refreshText: {
    marginLeft: 7,
    fontSize: 12,
    fontWeight: "800",
  },

  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  studentCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },

  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontSize: 23,
    fontWeight: "900",
  },

  studentTitleArea: {
    flex: 1,
    paddingRight: 8,
  },

  studentName: {
    fontSize: 16,
    fontWeight: "900",
  },

  studentEmail: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  statusText: {
    marginLeft: 5,
    fontSize: 8.5,
    fontWeight: "900",
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 18,
  },

  infoItem: {
    width: "48.5%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },

  infoLabel: {
    marginTop: 8,
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  infoValue: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "700",
  },

  submittedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 16,
  },

  submittedText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 10.5,
    fontWeight: "700",
  },

  idSection: {
    marginBottom: 15,
  },

  sectionLabel: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 9,
  },

  idImage: {
    width: "100%",
    height: 260,
    borderRadius: 18,
  },

  openImageButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 10,
  },

  openImageText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },

  noImageBox: {
    minHeight: 145,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },

  noImageText: {
    marginTop: 9,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },

  reviewBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
  },

  reviewLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  reviewText: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
  },

  notesInput: {
    minHeight: 94,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    fontSize: 13,
    marginBottom: 13,
  },

  actionRow: {
    flexDirection: "row",
    gap: 9,
  },

  approveButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },

  rejectButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 15,
  },

  primaryButtonText: {
    color: "#ffffff",
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },

  secondaryButtonText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },

  rideCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    marginBottom: 15,
  },

  rideHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  rideIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  rideTitleArea: {
    flex: 1,
  },

  rideTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  rideSubtitle: {
    marginTop: 4,
    fontSize: 10.5,
    fontWeight: "600",
  },

  routeBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginTop: 16,
    gap: 7,
  },

  routeText: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
  },

  rewardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },

  rewardItem: {
    width: "50%",
    marginBottom: 14,
  },

  rewardLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  rewardValue: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "900",
  },

  awardButton: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    marginTop: 4,
  },

  awardButtonText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },

  emptyState: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    padding: 30,
  },

  emptyTitle: {
    marginTop: 13,
    fontSize: 17,
    fontWeight: "900",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
