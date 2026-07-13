import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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

type TicketSource =
  | "support_messages"
  | "driver_support_messages"
  | "booking_change_requests";

type TicketCategory =
  | "passenger"
  | "driver"
  | "booking_change";

type TicketFilter =
  | "all"
  | "open"
  | "urgent"
  | "overdue"
  | "resolved"
  | "passenger"
  | "driver"
  | "booking_change";

type TicketRecord = GenericRecord & {
  id: string | number;
  created_at?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;

  source_table: TicketSource;
  category: TicketCategory;

  status?: string | null;
  ticket_status?: string | null;
  resolution_status?: string | null;
  priority?: string | null;

  title?: string | null;
  subject?: string | null;
  issue_type?: string | null;
  request_type?: string | null;

  message?: string | null;
  body?: string | null;
  description?: string | null;
  notes?: string | null;
  reason?: string | null;

  owner_response?: string | null;
  response?: string | null;
  admin_response?: string | null;
  resolution_notes?: string | null;

  booking_id?: string | number | null;

  passenger_id?: string | null;
  user_id?: string | null;
  passenger_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  passenger_email?: string | null;
  email?: string | null;
  passenger_phone?: string | null;
  phone?: string | null;

  driver_id?: string | null;
  driver_name?: string | null;
  driver_email?: string | null;
  driver_phone?: string | null;

  requested_pickup?: string | null;
  requested_dropoff?: string | null;
  requested_date?: string | null;
  requested_time?: string | null;
  change_type?: string | null;
};

type ResponseModalState = {
  visible: boolean;
  ticket: TicketRecord | null;
  response: string;
  priority: string;
};

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function ticketStatus(ticket: TicketRecord) {
  return normalize(
    ticket.status ||
      ticket.ticket_status ||
      ticket.resolution_status
  );
}

function isResolved(ticket: TicketRecord) {
  return ["resolved", "closed", "completed"].includes(
    ticketStatus(ticket)
  );
}

function isUrgent(ticket: TicketRecord) {
  const priority = normalize(ticket.priority);

  if (["urgent", "critical", "high"].includes(priority)) {
    return true;
  }

  const text = normalize(
    `${ticket.title} ${ticket.subject} ${ticket.issue_type} ${ticket.message} ${ticket.description}`
  );

  return (
    text.includes("emergency") ||
    text.includes("safety") ||
    text.includes("accident") ||
    text.includes("refund") ||
    text.includes("stranded")
  );
}

function isOverdue(ticket: TicketRecord) {
  if (isResolved(ticket) || !ticket.created_at) {
    return false;
  }

  const created = new Date(ticket.created_at);

  if (Number.isNaN(created.getTime())) {
    return false;
  }

  const ageHours =
    (Date.now() - created.getTime()) / 3600000;

  return ageHours >= 24;
}

function ticketTitle(ticket: TicketRecord) {
  if (ticket.category === "booking_change") {
    return (
      ticket.request_type ||
      ticket.change_type ||
      "Booking Change Request"
    );
  }

  return (
    ticket.title ||
    ticket.subject ||
    ticket.issue_type ||
    (ticket.category === "driver"
      ? "Driver Support Request"
      : "Passenger Support Request")
  );
}

function ticketMessage(ticket: TicketRecord) {
  return (
    ticket.message ||
    ticket.body ||
    ticket.description ||
    ticket.notes ||
    ticket.reason ||
    "No additional details were provided."
  );
}

function contactName(ticket: TicketRecord) {
  if (ticket.category === "driver") {
    return (
      ticket.driver_name ||
      ticket.full_name ||
      ticket.name ||
      ticket.driver_email ||
      "Driver"
    );
  }

  return (
    ticket.passenger_name ||
    ticket.full_name ||
    ticket.name ||
    ticket.passenger_email ||
    ticket.email ||
    "Passenger"
  );
}

function contactEmail(ticket: TicketRecord) {
  if (ticket.category === "driver") {
    return ticket.driver_email || ticket.email || "";
  }

  return ticket.passenger_email || ticket.email || "";
}

function contactPhone(ticket: TicketRecord) {
  if (ticket.category === "driver") {
    return ticket.driver_phone || ticket.phone || "";
  }

  return ticket.passenger_phone || ticket.phone || "";
}

function existingResponse(ticket: TicketRecord) {
  return (
    ticket.owner_response ||
    ticket.admin_response ||
    ticket.response ||
    ticket.resolution_notes ||
    ""
  );
}

function formatAge(value?: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  const minutes = Math.floor(
    (Date.now() - date.getTime()) / 60000
  );

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

export default function OwnerSupportScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [updatingId, setUpdatingId] =
    useState<string | number | null>(null);

  const [tickets, setTickets] =
    useState<TicketRecord[]>([]);
  const [filter, setFilter] =
    useState<TicketFilter>("open");
  const [search, setSearch] = useState("");

  const [expanded, setExpanded] =
    useState<Record<string, boolean>>({});

  const [modal, setModal] =
    useState<ResponseModalState>({
      visible: false,
      ticket: null,
      response: "",
      priority: "normal",
    });

  const isLarge = width >= 1050;
  const isTablet = width >= 700;

  useFocusEffect(
    useCallback(() => {
      loadSupportCenter();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-support-v6")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
        },
        () => loadSupportCenter(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_support_messages",
        },
        () => loadSupportCenter(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_change_requests",
        },
        () => loadSupportCenter(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function safeRows(table: TicketSource) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.log(`${table} skipped:`, error.message);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  async function enrichTickets(
    rows: TicketRecord[]
  ) {
    const passengerIds = Array.from(
      new Set(
        rows
          .map(
            (item) =>
              item.passenger_id || item.user_id
          )
          .filter(Boolean)
          .map(String)
      )
    );

    const driverIds = Array.from(
      new Set(
        rows
          .map((item) => item.driver_id)
          .filter(Boolean)
          .map(String)
      )
    );

    let passengerProfiles: GenericRecord[] = [];
    let drivers: GenericRecord[] = [];

    try {
      if (passengerIds.length > 0) {
        const { data } = await supabase
          .from("passenger_profiles")
          .select("*")
          .or(
            `id.in.(${passengerIds.join(",")}),user_id.in.(${passengerIds.join(",")})`
          );

        passengerProfiles = data || [];
      }
    } catch {
      passengerProfiles = [];
    }

    try {
      if (driverIds.length > 0) {
        const { data } = await supabase
          .from("drivers")
          .select("*")
          .in("id", driverIds);

        drivers = data || [];
      }
    } catch {
      drivers = [];
    }

    return rows.map((ticket) => {
      const profile = passengerProfiles.find(
        (item) =>
          String(item.id) ===
            String(
              ticket.passenger_id || ticket.user_id
            ) ||
          String(item.user_id) ===
            String(
              ticket.passenger_id || ticket.user_id
            )
      );

      const driver = drivers.find(
        (item) =>
          String(item.id) ===
          String(ticket.driver_id || "")
      );

      return {
        ...ticket,
        passenger_name:
          ticket.passenger_name ||
          profile?.full_name ||
          `${profile?.first_name || ""} ${
            profile?.last_name || ""
          }`.trim() ||
          profile?.name ||
          null,
        passenger_email:
          ticket.passenger_email ||
          ticket.email ||
          profile?.email ||
          profile?.student_email ||
          null,
        passenger_phone:
          ticket.passenger_phone ||
          ticket.phone ||
          profile?.phone ||
          null,
        driver_name:
          ticket.driver_name ||
          driver?.full_name ||
          `${driver?.first_name || ""} ${
            driver?.last_name || ""
          }`.trim() ||
          null,
        driver_email:
          ticket.driver_email ||
          driver?.email ||
          null,
        driver_phone:
          ticket.driver_phone ||
          driver?.phone ||
          null,
      };
    });
  }

  async function loadSupportCenter(
    showLoader = true
  ) {
    try {
      if (showLoader) setLoading(true);

      const [
        passengerRows,
        driverRows,
        bookingChangeRows,
      ] = await Promise.all([
        safeRows("support_messages"),
        safeRows("driver_support_messages"),
        safeRows("booking_change_requests"),
      ]);

      /*
       * Explicitly type each source array before merging.
       * Without this, TypeScript may infer only id/source_table/category
       * and then reject created_at inside the sort callback.
       */
      const passengerTickets: TicketRecord[] =
        passengerRows.map((item: GenericRecord) => ({
          ...(item as TicketRecord),
          id: item.id,
          source_table: "support_messages",
          category: "passenger",
        }));

      const driverTickets: TicketRecord[] =
        driverRows.map((item: GenericRecord) => ({
          ...(item as TicketRecord),
          id: item.id,
          source_table: "driver_support_messages",
          category: "driver",
        }));

      const bookingChangeTickets: TicketRecord[] =
        bookingChangeRows.map((item: GenericRecord) => ({
          ...(item as TicketRecord),
          id: item.id,
          source_table: "booking_change_requests",
          category: "booking_change",
        }));

      const merged: TicketRecord[] = [
        ...passengerTickets,
        ...driverTickets,
        ...bookingChangeTickets,
      ].sort((a: TicketRecord, b: TicketRecord) => {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });

      const enriched = await enrichTickets(merged);

      setTickets(enriched);
    } catch (error: any) {
      Alert.alert(
        "Support Center Error",
        error?.message ||
          "Unable to load support tickets."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function updateTicketWithFallback(
    ticket: TicketRecord,
    payloads: GenericRecord[]
  ) {
    let lastError: any = null;

    for (const payload of payloads) {
      const { error } = await supabase
        .from(ticket.source_table)
        .update(payload)
        .eq("id", ticket.id);

      if (!error) {
        return payload;
      }

      lastError = error;
    }

    throw (
      lastError ||
      new Error("No compatible support update columns were found.")
    );
  }

  async function resolveTicket(
    ticket: TicketRecord
  ) {
    try {
      setUpdatingId(ticket.id);

      const now = new Date().toISOString();

      const applied =
        await updateTicketWithFallback(ticket, [
          /*
           * Your current support tables already use a status column,
           * but do not consistently include resolved_at, closed_at,
           * ticket_status, resolution_status, or resolved.
           *
           * Try the smallest compatible update first.
           */
          {
            status: "resolved",
          },
          {
            status: "resolved",
            resolved_at: now,
          },
          {
            ticket_status: "resolved",
          },
          {
            ticket_status: "resolved",
            resolved_at: now,
          },
          {
            resolution_status: "resolved",
          },
          {
            resolution_status: "resolved",
            resolved_at: now,
          },
          {
            status: "closed",
          },
          {
            status: "closed",
            closed_at: now,
          },
          {
            resolved: true,
          },
        ]);

      setTickets((current) =>
        current.map((item) =>
          item.source_table ===
            ticket.source_table &&
          String(item.id) === String(ticket.id)
            ? {
                ...item,
                ...applied,
              }
            : item
        )
      );

      Alert.alert(
        "Ticket Resolved",
        "The support ticket was marked as resolved."
      );
    } catch (error: any) {
      Alert.alert(
        "Resolve Failed",
        error?.message ||
          "Unable to resolve the ticket."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function reopenTicket(
    ticket: TicketRecord
  ) {
    try {
      setUpdatingId(ticket.id);

      const applied =
        await updateTicketWithFallback(ticket, [
          /*
           * Reopen with the existing status column first.
           */
          {
            status: "open",
          },
          {
            status: "open",
            resolved_at: null,
          },
          {
            ticket_status: "open",
          },
          {
            ticket_status: "open",
            resolved_at: null,
          },
          {
            resolution_status: "open",
          },
          {
            resolution_status: "open",
            resolved_at: null,
          },
          {
            status: "pending",
          },
          {
            status: "pending",
            closed_at: null,
          },
          {
            resolved: false,
          },
        ]);

      setTickets((current) =>
        current.map((item) =>
          item.source_table ===
            ticket.source_table &&
          String(item.id) === String(ticket.id)
            ? {
                ...item,
                ...applied,
              }
            : item
        )
      );

      Alert.alert(
        "Ticket Reopened",
        "The support ticket is active again."
      );
    } catch (error: any) {
      Alert.alert(
        "Reopen Failed",
        error?.message ||
          "Unable to reopen the ticket."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveResponse() {
    const ticket = modal.ticket;
    const responseText = modal.response.trim();

    if (!ticket) return;

    if (!responseText) {
      Alert.alert(
        "Response Required",
        "Enter an owner response before saving."
      );
      return;
    }

    try {
      setUpdatingId(ticket.id);

      const priority =
        modal.priority || "normal";

      const payloads = [
        {
          owner_response: responseText,
          priority,
          updated_at: new Date().toISOString(),
        },
        {
          admin_response: responseText,
          priority,
          updated_at: new Date().toISOString(),
        },
        {
          response: responseText,
          priority,
        },
        {
          resolution_notes: responseText,
          priority,
        },
        {
          notes: responseText,
          priority,
        },
      ];

      const applied =
        await updateTicketWithFallback(
          ticket,
          payloads
        );

      setTickets((current) =>
        current.map((item) =>
          item.source_table ===
            ticket.source_table &&
          String(item.id) === String(ticket.id)
            ? {
                ...item,
                ...applied,
              }
            : item
        )
      );

      setModal({
        visible: false,
        ticket: null,
        response: "",
        priority: "normal",
      });

      Alert.alert(
        "Response Saved",
        "Your owner response was saved successfully."
      );
    } catch (error: any) {
      Alert.alert(
        "Response Failed",
        error?.message ||
          "Unable to save the owner response."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function openResponseModal(
    ticket: TicketRecord
  ) {
    setModal({
      visible: true,
      ticket,
      response: existingResponse(ticket),
      priority: ticket.priority || "normal",
    });
  }

  function toggleExpanded(
    ticket: TicketRecord
  ) {
    const key = `${ticket.source_table}-${ticket.id}`;

    setExpanded((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function callContact(ticket: TicketRecord) {
    const phone = contactPhone(ticket);

    if (!phone) {
      Alert.alert(
        "Phone Unavailable",
        "No phone number is available for this contact."
      );
      return;
    }

    Linking.openURL(
      `tel:${String(phone).replace(/\s+/g, "")}`
    );
  }

  function textContact(ticket: TicketRecord) {
    const phone = contactPhone(ticket);

    if (!phone) {
      Alert.alert(
        "Phone Unavailable",
        "No phone number is available for this contact."
      );
      return;
    }

    Linking.openURL(
      `sms:${String(phone).replace(/\s+/g, "")}`
    );
  }

  function emailContact(ticket: TicketRecord) {
    const email = contactEmail(ticket);

    if (!email) {
      Alert.alert(
        "Email Unavailable",
        "No email address is available for this contact."
      );
      return;
    }

    Linking.openURL(
      `mailto:${email}?subject=${encodeURIComponent(
        `Angel Express Support: ${ticketTitle(ticket)}`
      )}`
    );
  }

  function openChat(ticket: TicketRecord) {
    if (!ticket.booking_id) {
      Alert.alert(
        "Trip Chat Unavailable",
        "This support request is not linked to a booking."
      );
      return;
    }

    router.push({
      pathname: "/owner-chat",
      params: {
        bookingId: String(ticket.booking_id),
        receiverRole:
          ticket.category === "driver"
            ? "driver"
            : "passenger",
      },
    });
  }

  const summary = useMemo(() => {
    const open = tickets.filter(
      (ticket) => !isResolved(ticket)
    );
    const resolved = tickets.filter(isResolved);
    const urgent = tickets.filter(
      (ticket) =>
        !isResolved(ticket) && isUrgent(ticket)
    );
    const overdue = tickets.filter(isOverdue);

    const passenger = tickets.filter(
      (ticket) => ticket.category === "passenger"
    );
    const driver = tickets.filter(
      (ticket) => ticket.category === "driver"
    );
    const bookingChange = tickets.filter(
      (ticket) =>
        ticket.category === "booking_change"
    );

    return {
      open,
      resolved,
      urgent,
      overdue,
      passenger,
      driver,
      bookingChange,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return tickets.filter((ticket) => {
      const matchesFilter = (() => {
        switch (filter) {
          case "open":
            return !isResolved(ticket);
          case "urgent":
            return (
              !isResolved(ticket) &&
              isUrgent(ticket)
            );
          case "overdue":
            return isOverdue(ticket);
          case "resolved":
            return isResolved(ticket);
          case "passenger":
            return (
              ticket.category === "passenger"
            );
          case "driver":
            return ticket.category === "driver";
          case "booking_change":
            return (
              ticket.category ===
              "booking_change"
            );
          case "all":
          default:
            return true;
        }
      })();

      if (!matchesFilter) return false;
      if (!query) return true;

      const haystack = [
        ticketTitle(ticket),
        ticketMessage(ticket),
        contactName(ticket),
        contactEmail(ticket),
        contactPhone(ticket),
        ticket.booking_id,
        ticket.priority,
        ticketStatus(ticket),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [tickets, filter, search]);

  function ticketVisual(ticket: TicketRecord) {
    if (isResolved(ticket)) {
      return {
        color: theme.colors.success,
        background:
          theme.colors.successSoft,
        icon: "checkmark-done-outline" as const,
      };
    }

    if (isUrgent(ticket)) {
      return {
        color: theme.colors.danger,
        background:
          theme.colors.dangerSoft,
        icon: "warning-outline" as const,
      };
    }

    if (isOverdue(ticket)) {
      return {
        color: theme.colors.warning,
        background:
          theme.colors.warningSoft,
        icon: "time-outline" as const,
      };
    }

    if (ticket.category === "driver") {
      return {
        color: theme.colors.info,
        background:
          theme.colors.infoSoft,
        icon: "car-outline" as const,
      };
    }

    if (
      ticket.category === "booking_change"
    ) {
      return {
        color: theme.colors.gold,
        background:
          theme.colors.goldTransparent,
        icon: "swap-horizontal-outline" as const,
      };
    }

    return {
      color: theme.colors.gold,
      background:
        theme.colors.goldTransparent,
      icon: "person-outline" as const,
    };
  }

  function ticketWidth() {
    if (isLarge) return "48.8%";
    return "100%";
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
          Loading Support Resolution Center...
        </Text>
      </View>
    );
  }

  const filters: {
    key: TicketFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "open",
      label: "Open",
      count: summary.open.length,
    },
    {
      key: "urgent",
      label: "Urgent",
      count: summary.urgent.length,
    },
    {
      key: "overdue",
      label: "Overdue",
      count: summary.overdue.length,
    },
    {
      key: "resolved",
      label: "Resolved",
      count: summary.resolved.length,
    },
    {
      key: "passenger",
      label: "Passengers",
      count: summary.passenger.length,
    },
    {
      key: "driver",
      label: "Drivers",
      count: summary.driver.length,
    },
    {
      key: "booking_change",
      label: "Booking Changes",
      count: summary.bookingChange.length,
    },
    {
      key: "all",
      label: "All",
      count: tickets.length,
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
              ? "rgba(3,8,17,0.95)"
              : "rgba(245,247,250,0.97)",
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
                await loadSupportCenter(false);
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
                  {
                    color:
                      theme.colors.gold,
                  },
                ]}
              >
                ANGEL EXPRESS SUPPORT OPERATIONS
              </Text>

              <Text
                style={[
                  styles.pageTitle,
                  {
                    color:
                      theme.colors.text,
                  },
                ]}
              >
                Support & Resolution Center
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
                Manage passenger concerns, driver issues,
                booking-change requests, urgent cases,
                overdue tickets, owner responses, and
                resolution history.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            {[
              [
                "Open Tickets",
                summary.open.length,
                "headset-outline",
                theme.colors.gold,
                theme.colors.goldTransparent,
              ],
              [
                "Urgent",
                summary.urgent.length,
                "warning-outline",
                theme.colors.danger,
                theme.colors.dangerSoft,
              ],
              [
                "Overdue",
                summary.overdue.length,
                "time-outline",
                theme.colors.warning,
                theme.colors.warningSoft,
              ],
              [
                "Resolved",
                summary.resolved.length,
                "checkmark-done-outline",
                theme.colors.success,
                theme.colors.successSoft,
              ],
              [
                "Passenger Support",
                summary.passenger.length,
                "people-outline",
                theme.colors.info,
                theme.colors.infoSoft,
              ],
              [
                "Driver Support",
                summary.driver.length,
                "car-outline",
                theme.colors.info,
                theme.colors.infoSoft,
              ],
              [
                "Booking Changes",
                summary.bookingChange.length,
                "swap-horizontal-outline",
                theme.colors.gold,
                theme.colors.goldTransparent,
              ],
              [
                "All Records",
                tickets.length,
                "file-tray-full-outline",
                theme.colors.textSecondary,
                theme.colors.surfaceSoft,
              ],
            ].map(
              ([
                label,
                value,
                icon,
                color,
                background,
              ]) => (
                <View
                  key={String(label)}
                  style={[
                    styles.metricCard,
                    {
                      width: isLarge
                        ? "23.5%"
                        : isTablet
                          ? "31.8%"
                          : "48%",
                      backgroundColor:
                        theme.colors.card,
                      borderColor:
                        theme.colors
                          .cardBorder,
                    },
                    theme.shadows.soft,
                  ]}
                >
                  <View
                    style={[
                      styles.metricIcon,
                      {
                        backgroundColor:
                          String(
                            background
                          ),
                      },
                    ]}
                  >
                    <Ionicons
                      name={icon as any}
                      size={21}
                      color={String(color)}
                    />
                  </View>

                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          theme.colors.text,
                      },
                    ]}
                  >
                    {value}
                  </Text>

                  <Text
                    style={[
                      styles.metricLabel,
                      {
                        color:
                          theme.colors
                            .textMuted,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              )
            )}
          </View>

          <View
            style={[
              styles.controlPanel,
              {
                backgroundColor:
                  theme.colors.card,
                borderColor:
                  theme.colors
                    .cardBorderStrong,
              },
              theme.shadows.soft,
            ]}
          >
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor:
                    theme.colors
                      .inputBackground,
                  borderColor:
                    theme.colors.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={
                  theme.colors.textMuted
                }
              />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search ticket, contact, trip, email, phone, or issue"
                placeholderTextColor={
                  theme.colors
                    .inputPlaceholder
                }
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.searchInput,
                  {
                    color:
                      theme.colors.text,
                  },
                ]}
              />

              {search ? (
                <TouchableOpacity
                  onPress={() =>
                    setSearch("")
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={
                      theme.colors
                        .textMuted
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
                styles.filterRow
              }
            >
              {filters.map((item) => {
                const selected =
                  filter === item.key;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor:
                          selected
                            ? theme.colors
                                .goldTransparent
                            : theme.colors
                                .surfaceSoft,
                        borderColor:
                          selected
                            ? theme.colors
                                .gold
                            : theme.colors
                                .cardBorder,
                      },
                    ]}
                    onPress={() =>
                      setFilter(item.key)
                    }
                  >
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color: selected
                            ? theme.colors
                                .gold
                            : theme.colors
                                .textMuted,
                        },
                      ]}
                    >
                      {item.label} (
                      {item.count})
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
                  {
                    color:
                      theme.colors.gold,
                  },
                ]}
              >
                SUPPORT QUEUE
              </Text>

              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      theme.colors.text,
                  },
                ]}
              >
                {filteredTickets.length}{" "}
                Matching Tickets
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.refreshButton,
                {
                  backgroundColor:
                    theme.colors.card,
                  borderColor:
                    theme.colors
                      .cardBorder,
                },
              ]}
              onPress={() =>
                loadSupportCenter(false)
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

          {filteredTickets.length === 0 ? (
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
                name="checkmark-circle-outline"
                size={40}
                color={
                  theme.colors.success
                }
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
                No matching support tickets
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
                New passenger, driver, and booking-change
                requests will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.ticketGrid}>
              {filteredTickets.map(
                (ticket) => {
                  const key = `${ticket.source_table}-${ticket.id}`;
                  const open =
                    expanded[key] === true;
                  const visual =
                    ticketVisual(ticket);
                  const resolved =
                    isResolved(ticket);
                  const updating =
                    String(updatingId) ===
                    String(ticket.id);

                  return (
                    <View
                      key={key}
                      style={[
                        styles.ticketCard,
                        {
                          width: ticketWidth(),
                          backgroundColor:
                            theme.colors.card,
                          borderColor:
                            visual.color,
                        },
                        theme.shadows.soft,
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={
                          styles.ticketHeader
                        }
                        onPress={() =>
                          toggleExpanded(
                            ticket
                          )
                        }
                      >
                        <View
                          style={[
                            styles.ticketIcon,
                            {
                              backgroundColor:
                                visual.background,
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              visual.icon
                            }
                            size={22}
                            color={
                              visual.color
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.ticketTitleArea
                          }
                        >
                          <Text
                            style={[
                              styles.ticketTitle,
                              {
                                color:
                                  theme.colors
                                    .text,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {ticketTitle(
                              ticket
                            )}
                          </Text>

                          <Text
                            style={[
                              styles.ticketMeta,
                              {
                                color:
                                  theme.colors
                                    .textMuted,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {contactName(
                              ticket
                            )}{" "}
                            •{" "}
                            {formatAge(
                              ticket.created_at
                            )}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                visual.background,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  visual.color,
                              },
                            ]}
                          >
                            {resolved
                              ? "Resolved"
                              : isUrgent(
                                    ticket
                                  )
                                ? "Urgent"
                                : isOverdue(
                                      ticket
                                    )
                                  ? "Overdue"
                                  : ticket.priority ||
                                    "Open"}
                          </Text>
                        </View>

                        <Ionicons
                          name={
                            open
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={20}
                          color={
                            theme.colors
                              .textMuted
                          }
                        />
                      </TouchableOpacity>

                      <View
                        style={[
                          styles.ticketSummary,
                          {
                            backgroundColor:
                              theme.colors
                                .surfaceSoft,
                            borderColor:
                              theme.colors
                                .cardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.ticketMessage,
                            {
                              color:
                                theme.colors
                                  .textSecondary,
                            },
                          ]}
                          numberOfLines={
                            open ? undefined : 3
                          }
                        >
                          {ticketMessage(
                            ticket
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.quickContactRow
                        }
                      >
                        <TouchableOpacity
                          style={[
                            styles.contactButton,
                            {
                              backgroundColor:
                                theme.colors
                                  .successSoft,
                              borderColor:
                                theme.colors
                                  .success,
                            },
                          ]}
                          onPress={() =>
                            callContact(
                              ticket
                            )
                          }
                        >
                          <Ionicons
                            name="call-outline"
                            size={17}
                            color={
                              theme.colors
                                .success
                            }
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.contactButton,
                            {
                              backgroundColor:
                                theme.colors
                                  .infoSoft,
                              borderColor:
                                theme.colors
                                  .info,
                            },
                          ]}
                          onPress={() =>
                            textContact(
                              ticket
                            )
                          }
                        >
                          <Ionicons
                            name="chatbubble-outline"
                            size={17}
                            color={
                              theme.colors.info
                            }
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.contactButton,
                            {
                              backgroundColor:
                                theme.colors
                                  .goldTransparent,
                              borderColor:
                                theme.colors.gold,
                            },
                          ]}
                          onPress={() =>
                            emailContact(
                              ticket
                            )
                          }
                        >
                          <Ionicons
                            name="mail-outline"
                            size={17}
                            color={
                              theme.colors.gold
                            }
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.contactButton,
                            {
                              backgroundColor:
                                theme.colors
                                  .surfaceSoft,
                              borderColor:
                                theme.colors
                                  .cardBorder,
                            },
                          ]}
                          onPress={() =>
                            openChat(ticket)
                          }
                        >
                          <Ionicons
                            name="chatbubbles-outline"
                            size={17}
                            color={
                              theme.colors
                                .textSecondary
                            }
                          />
                        </TouchableOpacity>
                      </View>

                      {open ? (
                        <View
                          style={[
                            styles.expandedArea,
                            {
                              borderTopColor:
                                theme.colors
                                  .divider,
                            },
                          ]}
                        >
                          <View
                            style={
                              styles.detailGrid
                            }
                          >
                            {[
                              [
                                "Source",
                                ticket.category ===
                                "booking_change"
                                  ? "Booking Change"
                                  : ticket.category ===
                                      "driver"
                                    ? "Driver Support"
                                    : "Passenger Support",
                              ],
                              [
                                "Trip",
                                ticket.booking_id
                                  ? `#${ticket.booking_id}`
                                  : "Not linked",
                              ],
                              [
                                "Priority",
                                ticket.priority ||
                                  "Normal",
                              ],
                              [
                                "Status",
                                ticketStatus(
                                  ticket
                                ) || "Open",
                              ],
                              [
                                "Email",
                                contactEmail(
                                  ticket
                                ) ||
                                  "Unavailable",
                              ],
                              [
                                "Phone",
                                contactPhone(
                                  ticket
                                ) ||
                                  "Unavailable",
                              ],
                            ].map(
                              ([
                                label,
                                value,
                              ]) => (
                                <View
                                  key={label}
                                  style={[
                                    styles.detailItem,
                                    {
                                      backgroundColor:
                                        theme
                                          .colors
                                          .surfaceSoft,
                                      borderColor:
                                        theme
                                          .colors
                                          .cardBorder,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.detailLabel,
                                      {
                                        color:
                                          theme
                                            .colors
                                            .textMuted,
                                      },
                                    ]}
                                  >
                                    {label}
                                  </Text>

                                  <Text
                                    style={[
                                      styles.detailValue,
                                      {
                                        color:
                                          theme
                                            .colors
                                            .text,
                                      },
                                    ]}
                                    numberOfLines={
                                      2
                                    }
                                  >
                                    {value}
                                  </Text>
                                </View>
                              )
                            )}
                          </View>

                          {ticket.category ===
                          "booking_change" ? (
                            <View
                              style={[
                                styles.changeBox,
                                {
                                  backgroundColor:
                                    theme.colors
                                      .goldTransparent,
                                  borderColor:
                                    theme.colors
                                      .gold,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.changeTitle,
                                  {
                                    color:
                                      theme.colors
                                        .gold,
                                  },
                                ]}
                              >
                                REQUESTED CHANGE
                              </Text>

                              <Text
                                style={[
                                  styles.changeText,
                                  {
                                    color:
                                      theme.colors
                                        .textSecondary,
                                  },
                                ]}
                              >
                                Pickup:{" "}
                                {ticket.requested_pickup ||
                                  "No change"}
                                {"\n"}
                                Drop-off:{" "}
                                {ticket.requested_dropoff ||
                                  "No change"}
                                {"\n"}
                                Date:{" "}
                                {ticket.requested_date ||
                                  "No change"}
                                {"\n"}
                                Time:{" "}
                                {ticket.requested_time ||
                                  "No change"}
                              </Text>
                            </View>
                          ) : null}

                          {existingResponse(
                            ticket
                          ) ? (
                            <View
                              style={[
                                styles.responseBox,
                                {
                                  backgroundColor:
                                    theme.colors
                                      .infoSoft,
                                  borderColor:
                                    theme.colors
                                      .info,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.responseLabel,
                                  {
                                    color:
                                      theme.colors
                                        .info,
                                  },
                                ]}
                              >
                                OWNER RESPONSE
                              </Text>

                              <Text
                                style={[
                                  styles.responseText,
                                  {
                                    color:
                                      theme.colors
                                        .textSecondary,
                                  },
                                ]}
                              >
                                {existingResponse(
                                  ticket
                                )}
                              </Text>
                            </View>
                          ) : null}

                          <View
                            style={
                              styles.actionRow
                            }
                          >
                            <TouchableOpacity
                              style={[
                                styles.responseButton,
                                {
                                  backgroundColor:
                                    theme.colors
                                      .gold,
                                },
                              ]}
                              onPress={() =>
                                openResponseModal(
                                  ticket
                                )
                              }
                            >
                              <Ionicons
                                name="create-outline"
                                size={18}
                                color={
                                  theme.colors
                                    .textInverse
                                }
                              />

                              <Text
                                style={[
                                  styles.responseButtonText,
                                  {
                                    color:
                                      theme.colors
                                        .textInverse,
                                  },
                                ]}
                              >
                                Respond
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.resolveButton,
                                {
                                  backgroundColor:
                                    resolved
                                      ? theme
                                          .colors
                                          .warningSoft
                                      : theme
                                          .colors
                                          .successSoft,
                                  borderColor:
                                    resolved
                                      ? theme
                                          .colors
                                          .warning
                                      : theme
                                          .colors
                                          .success,
                                },
                              ]}
                              disabled={
                                updating
                              }
                              onPress={() =>
                                resolved
                                  ? reopenTicket(
                                      ticket
                                    )
                                  : Alert.alert(
                                      "Resolve Ticket",
                                      "Mark this support ticket as resolved?",
                                      [
                                        {
                                          text: "Cancel",
                                          style:
                                            "cancel",
                                        },
                                        {
                                          text: "Resolve",
                                          onPress:
                                            () =>
                                              resolveTicket(
                                                ticket
                                              ),
                                        },
                                      ]
                                    )
                              }
                            >
                              {updating ? (
                                <ActivityIndicator
                                  size="small"
                                  color={
                                    resolved
                                      ? theme
                                          .colors
                                          .warning
                                      : theme
                                          .colors
                                          .success
                                  }
                                />
                              ) : (
                                <>
                                  <Ionicons
                                    name={
                                      resolved
                                        ? "refresh-outline"
                                        : "checkmark-done-outline"
                                    }
                                    size={18}
                                    color={
                                      resolved
                                        ? theme
                                            .colors
                                            .warning
                                        : theme
                                            .colors
                                            .success
                                    }
                                  />

                                  <Text
                                    style={[
                                      styles.resolveButtonText,
                                      {
                                        color:
                                          resolved
                                            ? theme
                                                .colors
                                                .warning
                                            : theme
                                                .colors
                                                .success,
                                      },
                                    ]}
                                  >
                                    {resolved
                                      ? "Reopen"
                                      : "Resolve"}
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                }
              )}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={modal.visible}
          transparent
          animationType="slide"
          onRequestClose={() =>
            setModal({
              visible: false,
              ticket: null,
              response: "",
              priority: "normal",
            })
          }
        >
          <KeyboardAvoidingView
            style={styles.modalKeyboardView}
            behavior={
              Platform.OS === "ios"
                ? "padding"
                : "height"
            }
          >
            <View style={styles.modalBackdrop}>
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor:
                      theme.colors
                        .surfaceElevated,
                    borderColor:
                      theme.colors
                        .cardBorderStrong,
                  },
                ]}
              >
                <View style={styles.modalHandle} />

                <View
                  style={styles.modalHeader}
                >
                  <View
                    style={
                      styles.modalTitleArea
                    }
                  >
                    <Text
                      style={[
                        styles.modalEyebrow,
                        {
                          color:
                            theme.colors
                              .gold,
                        },
                      ]}
                    >
                      OWNER SUPPORT RESPONSE
                    </Text>

                    <Text
                      style={[
                        styles.modalTitle,
                        {
                          color:
                            theme.colors
                              .text,
                        },
                      ]}
                    >
                      {modal.ticket
                        ? ticketTitle(
                            modal.ticket
                          )
                        : "Support Ticket"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.modalClose,
                      {
                        backgroundColor:
                          theme.colors
                            .surfaceSoft,
                        borderColor:
                          theme.colors
                            .cardBorder,
                      },
                    ]}
                    onPress={() =>
                      setModal({
                        visible: false,
                        ticket: null,
                        response: "",
                        priority:
                          "normal",
                      })
                    }
                  >
                    <Ionicons
                      name="close"
                      size={21}
                      color={
                        theme.colors
                          .textMuted
                      }
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={
                    false
                  }
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={
                    styles.modalContent
                  }
                >
                  <Text
                    style={[
                      styles.inputLabel,
                      {
                        color:
                          theme.colors
                            .textMuted,
                      },
                    ]}
                  >
                    PRIORITY
                  </Text>

                  <View
                    style={styles.priorityRow}
                  >
                    {[
                      "low",
                      "normal",
                      "high",
                      "urgent",
                    ].map((priority) => {
                      const selected =
                        modal.priority ===
                        priority;

                      return (
                        <TouchableOpacity
                          key={priority}
                          style={[
                            styles.priorityChip,
                            {
                              backgroundColor:
                                selected
                                  ? theme
                                      .colors
                                      .goldTransparent
                                  : theme
                                      .colors
                                      .surfaceSoft,
                              borderColor:
                                selected
                                  ? theme
                                      .colors
                                      .gold
                                  : theme
                                      .colors
                                      .cardBorder,
                            },
                          ]}
                          onPress={() =>
                            setModal(
                              (current) => ({
                                ...current,
                                priority,
                              })
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.priorityText,
                              {
                                color:
                                  selected
                                    ? theme
                                        .colors
                                        .gold
                                    : theme
                                        .colors
                                        .textMuted,
                              },
                            ]}
                          >
                            {priority}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text
                    style={[
                      styles.inputLabel,
                      {
                        color:
                          theme.colors
                            .textMuted,
                      },
                    ]}
                  >
                    OWNER RESPONSE
                  </Text>

                  <TextInput
                    value={modal.response}
                    onChangeText={(response) =>
                      setModal((current) => ({
                        ...current,
                        response,
                      }))
                    }
                    multiline
                    textAlignVertical="top"
                    placeholder="Write a response, resolution note, or follow-up instruction..."
                    placeholderTextColor={
                      theme.colors
                        .inputPlaceholder
                    }
                    style={[
                      styles.responseInput,
                      {
                        backgroundColor:
                          theme.colors
                            .inputBackground,
                        borderColor:
                          theme.colors
                            .inputBorder,
                        color:
                          theme.colors.text,
                      },
                    ]}
                  />

                  <TouchableOpacity
                    style={[
                      styles.saveResponseButton,
                      {
                        backgroundColor:
                          theme.colors.gold,
                      },
                    ]}
                    onPress={saveResponse}
                    disabled={
                      modal.ticket
                        ? String(
                            updatingId
                          ) ===
                          String(
                            modal.ticket.id
                          )
                        : false
                    }
                  >
                    <Ionicons
                      name="save-outline"
                      size={19}
                      color={
                        theme.colors
                          .textInverse
                      }
                    />

                    <Text
                      style={[
                        styles.saveResponseText,
                        {
                          color:
                            theme.colors
                              .textInverse,
                        },
                      ]}
                    >
                      Save Owner Response
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    fontSize: 11,
    fontWeight: "700",
  },

  controlPanel: {
    borderWidth: 1,
    borderRadius: 23,
    padding: 15,
    marginBottom: 22,
  },

  searchBox: {
    minHeight: 53,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    height: 51,
    marginHorizontal: 10,
    fontSize: 13,
    fontWeight: "600",
  },

  filterRow: {
    gap: 8,
    paddingTop: 13,
    paddingRight: 8,
  },

  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  filterText: {
    fontSize: 10,
    fontWeight: "800",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionEyebrow: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  sectionTitle: {
    marginTop: 5,
    fontSize: 21,
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
    fontSize: 10.5,
    fontWeight: "800",
  },

  ticketGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  ticketCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 15,
  },

  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  ticketIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  ticketTitleArea: {
    flex: 1,
    paddingRight: 7,
  },

  ticketTitle: {
    fontSize: 13.5,
    fontWeight: "900",
  },

  ticketMeta: {
    marginTop: 4,
    fontSize: 9.5,
    fontWeight: "600",
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 6,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "900",
    textTransform: "capitalize",
  },

  ticketSummary: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
  },

  ticketMessage: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
  },

  quickContactRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  contactButton: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 13,
  },

  expandedArea: {
    borderTopWidth: 1,
    marginTop: 15,
    paddingTop: 15,
  },

  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  detailItem: {
    width: "48.5%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    marginBottom: 9,
  },

  detailLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  detailValue: {
    marginTop: 5,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "700",
  },

  changeBox: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    marginTop: 4,
  },

  changeTitle: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  changeText: {
    marginTop: 7,
    fontSize: 10.5,
    lineHeight: 17,
    fontWeight: "600",
  },

  responseBox: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    marginTop: 11,
  },

  responseLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  responseText: {
    marginTop: 7,
    fontSize: 10.5,
    lineHeight: 17,
    fontWeight: "600",
  },

  actionRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 13,
  },

  responseButton: {
    flex: 1,
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },

  responseButtonText: {
    marginLeft: 7,
    fontSize: 10.5,
    fontWeight: "900",
  },

  resolveButton: {
    flex: 1,
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 15,
  },

  resolveButtonText: {
    marginLeft: 7,
    fontSize: 10.5,
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
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: "center",
  },

  modalKeyboardView: {
    flex: 1,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.68)",
  },

  modalCard: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.55)",
    alignSelf: "center",
    marginBottom: 11,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  modalTitleArea: {
    flex: 1,
    paddingRight: 10,
  },

  modalEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  modalTitle: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "900",
  },

  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  modalContent: {
    paddingBottom: 24,
  },

  inputLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 5,
  },

  priorityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  priorityChip: {
    flexGrow: 1,
    minWidth: 70,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  priorityText: {
    fontSize: 9.5,
    fontWeight: "900",
    textTransform: "capitalize",
  },

  responseInput: {
    minHeight: 165,
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    fontSize: 13,
    lineHeight: 19,
  },

  saveResponseButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    marginTop: 14,
  },

  saveResponseText: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: "900",
  },
});
