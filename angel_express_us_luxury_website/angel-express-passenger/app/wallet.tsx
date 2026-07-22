import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  FileDown,
  FileText,
  GraduationCap,
  History,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  WalletCards,
} from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

type WalletRecord = {
  id?: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  referral_balance: number;
  promotional_balance: number;
  refund_balance: number;
  purchased_balance: number;
  auto_apply_wallet: boolean;
  currency: string;
};

type WalletTransaction = {
  id: string;
  amount: number;
  direction: "credit" | "debit";
  transaction_type: string;
  credit_source?: string | null;
  description?: string | null;
  invoice_no?: string | null;
  status?: string | null;
  created_at: string;
};

type BookingRow = {
  id: string;
  invoice_no?: string | null;
  pickup_address?: string | null;
  pickup?: string | null;
  dropoff_address?: string | null;
  dropoff?: string | null;
  ride_date?: string | null;
  ride_time?: string | null;
  status?: string | null;
  total_fare?: number | null;
  fare?: number | null;
  final_fare?: number | null;
  amount?: number | null;
  payment_status?: string | null;
  trip_purpose?: string | null;
  business_purpose?: string | null;
  school_name?: string | null;
  student_verified?: boolean | null;
  created_at?: string | null;
};

const DEFAULT_WALLET = (userId: string): WalletRecord => ({
  user_id: userId,
  available_balance: 0,
  pending_balance: 0,
  referral_balance: 0,
  promotional_balance: 0,
  refund_balance: 0,
  purchased_balance: 0,
  auto_apply_wallet: true,
  currency: "USD",
});

function money(value: any) {
  const number = Number(value || 0);
  return `$${Number.isFinite(number) ? number.toFixed(2) : "0.00"}`;
}

function numberValue(...values: any[]) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function normalizeStatus(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function displayDate(value?: string | null) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayDateTime(value?: string | null) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function AngelWalletScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [wallet, setWallet] = useState<WalletRecord | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [latestReceiptRide, setLatestReceiptRide] =
    useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingAutoApply, setSavingAutoApply] = useState(false);
  const [exporting, setExporting] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadWallet();
    }, [])
  );

  useEffect(() => {
    const animation = Animated.loop(
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
    );

    animation.start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    return () => animation.stop();
  }, []);

  async function loadWallet(isRefresh = false) {
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
        router.replace("/login" as any);
        return;
      }

      let { data: walletData, error: walletError } = await supabase
        .from("passenger_wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      if (!walletData) {
        const newWallet = DEFAULT_WALLET(user.id);

        const { data: createdWallet, error: createError } = await supabase
          .from("passenger_wallets")
          .insert(newWallet)
          .select("*")
          .single();

        if (createError) throw createError;
        walletData = createdWallet;
      }

      setWallet(walletData as WalletRecord);

      const { data: transactionData, error: transactionError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (transactionError) throw transactionError;

      setTransactions((transactionData || []) as WalletTransaction[]);

      const userEmail = String(user.email || "")
        .trim()
        .toLowerCase();

      const bookingFilter = userEmail
        ? `user_id.eq.${user.id},email.ilike.${userEmail}`
        : `user_id.eq.${user.id}`;

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .or(bookingFilter)
        .order("created_at", { ascending: false })
        .limit(50);

      if (bookingError) throw bookingError;

      const safeBookings = (bookingData || []) as BookingRow[];
      setBookings(safeBookings);

      const receiptRide =
        safeBookings.find((ride) =>
          ["completed", "paid"].includes(normalizeStatus(ride.status))
        ) || safeBookings[0] || null;

      setLatestReceiptRide(receiptRide);
    } catch (error: any) {
      Alert.alert(
        "Wallet Error",
        error?.message || "Unable to load your Angel Wallet."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function toggleAutoApply(value: boolean) {
    if (!wallet) return;

    try {
      setSavingAutoApply(true);

      const { error } = await supabase
        .from("passenger_wallets")
        .update({
          auto_apply_wallet: value,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", wallet.user_id);

      if (error) throw error;

      setWallet((current) =>
        current
          ? {
              ...current,
              auto_apply_wallet: value,
            }
          : current
      );
    } catch (error: any) {
      Alert.alert(
        "Wallet Setting Error",
        error?.message || "Could not update wallet preferences."
      );
    } finally {
      setSavingAutoApply(false);
    }
  }

  async function downloadRideReceipt(ride: BookingRow) {
    try {
      setExporting(true);

      const pickup = ride.pickup_address || ride.pickup || "Not provided";
      const dropoff = ride.dropoff_address || ride.dropoff || "Not provided";
      const fare = numberValue(
        ride.final_fare,
        ride.total_fare,
        ride.fare,
        ride.amount
      );
      const invoice = ride.invoice_no || `AE-${String(ride.id).slice(0, 8)}`;
      const tripPurpose =
        ride.business_purpose ||
        ride.trip_purpose ||
        (ride.student_verified ? "Student / School Travel" : "Personal Travel");

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body {
                font-family: Arial, sans-serif;
                background: #F5F7FA;
                color: #0B1320;
                padding: 32px;
              }
              .receipt {
                background: #FFFFFF;
                border: 1px solid #D4AF37;
                border-radius: 18px;
                padding: 28px;
              }
              .brand {
                color: #D4AF37;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 2px;
              }
              h1 {
                margin: 8px 0 4px;
                font-size: 30px;
              }
              .muted {
                color: #667085;
              }
              .amount {
                background: #0B1320;
                color: #FFFFFF;
                border-radius: 14px;
                padding: 20px;
                margin: 22px 0;
              }
              .amount strong {
                color: #D4AF37;
                font-size: 30px;
              }
              .row {
                display: flex;
                justify-content: space-between;
                gap: 20px;
                border-top: 1px solid #E4E7EC;
                padding: 12px 0;
              }
              .label {
                color: #667085;
                font-weight: 700;
              }
              .value {
                font-weight: 700;
                text-align: right;
              }
              .route {
                background: #F8F4E5;
                border-radius: 14px;
                padding: 16px;
                margin: 18px 0;
              }
              .footer {
                margin-top: 24px;
                font-size: 12px;
                color: #667085;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="brand">ANGEL EXPRESS MOBILITY</div>
              <h1>Ride Receipt</h1>
              <div class="muted">Official passenger travel receipt</div>

              <div class="amount">
                <div>Total Fare</div>
                <strong>${escapeHtml(money(fare))}</strong>
              </div>

              <div class="route">
                <div class="label">Pickup</div>
                <div class="value">${escapeHtml(pickup)}</div>
                <br />
                <div class="label">Drop-off</div>
                <div class="value">${escapeHtml(dropoff)}</div>
              </div>

              <div class="row">
                <div class="label">Invoice</div>
                <div class="value">${escapeHtml(invoice)}</div>
              </div>

              <div class="row">
                <div class="label">Ride Date</div>
                <div class="value">${escapeHtml(
                  ride.ride_date || displayDate(ride.created_at)
                )}</div>
              </div>

              <div class="row">
                <div class="label">Ride Time</div>
                <div class="value">${escapeHtml(ride.ride_time || "N/A")}</div>
              </div>

              <div class="row">
                <div class="label">Payment Status</div>
                <div class="value">${escapeHtml(
                  ride.payment_status || "Recorded"
                )}</div>
              </div>

              <div class="row">
                <div class="label">Travel Purpose</div>
                <div class="value">${escapeHtml(tripPurpose)}</div>
              </div>

              ${
                ride.school_name
                  ? `
                    <div class="row">
                      <div class="label">School / Institution</div>
                      <div class="value">${escapeHtml(ride.school_name)}</div>
                    </div>
                  `
                  : ""
              }

              <div class="footer">
                Angel Express Mobility • angelexpressus.com • support@angelexpressus.com
              </div>
            </div>
          </body>
        </html>
      `;

      const file = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const safeInvoice = invoice.replace(/[^a-zA-Z0-9-_]/g, "_");
      const destination = `${FileSystem.documentDirectory}${safeInvoice}-ride-receipt.pdf`;

      await FileSystem.copyAsync({
        from: file.uri,
        to: destination,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(destination, {
          mimeType: "application/pdf",
          dialogTitle: "Share or Save Ride Receipt",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Receipt Created", `Saved to ${destination}`);
      }
    } catch (error: any) {
      Alert.alert(
        "Receipt Error",
        error?.message || "Could not create the ride receipt."
      );
    } finally {
      setExporting(false);
    }
  }

  async function exportExpenseReport() {
    try {
      if (bookings.length === 0) {
        Alert.alert(
          "No Trips",
          "You do not have any rides available for an expense report."
        );
        return;
      }

      setExporting(true);

      const rows = bookings.map((ride) => {
        const fare = numberValue(
          ride.final_fare,
          ride.total_fare,
          ride.fare,
          ride.amount
        );

        const purpose =
          ride.business_purpose ||
          ride.trip_purpose ||
          (ride.student_verified ? "Student / School Travel" : "Personal Travel");

        return [
          ride.invoice_no || ride.id,
          ride.ride_date || displayDate(ride.created_at),
          ride.ride_time || "",
          ride.pickup_address || ride.pickup || "",
          ride.dropoff_address || ride.dropoff || "",
          fare.toFixed(2),
          ride.payment_status || "",
          purpose,
          ride.school_name || "",
        ];
      });

      const csv = [
        [
          "Invoice",
          "Ride Date",
          "Ride Time",
          "Pickup",
          "Drop-off",
          "Fare",
          "Payment Status",
          "Travel Purpose",
          "School / Institution",
        ],
        ...rows,
      ]
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

      const filename = `angel-express-expense-report-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      const destination = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(destination, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(destination, {
          mimeType: "text/csv",
          dialogTitle: "Share Expense Report",
        });
      } else {
        Alert.alert("Expense Report Created", `Saved to ${destination}`);
      }
    } catch (error: any) {
      Alert.alert(
        "Expense Report Error",
        error?.message || "Could not export your expense report."
      );
    } finally {
      setExporting(false);
    }
  }

  async function shareWalletSummary() {
    if (!wallet) return;

    await Share.share({
      message:
        `Angel Wallet Summary\n` +
        `Available Balance: ${money(wallet.available_balance)}\n` +
        `Referral Credits: ${money(wallet.referral_balance)}\n` +
        `Promotional Credits: ${money(wallet.promotional_balance)}\n` +
        `Refund Credits: ${money(wallet.refund_balance)}\n` +
        `Pending Balance: ${money(wallet.pending_balance)}`,
    });
  }

  const creditsEarned = transactions
    .filter((item) => item.direction === "credit")
    .reduce((sum, item) => sum + numberValue(item.amount), 0);

  const creditsUsed = transactions
    .filter((item) => item.direction === "debit")
    .reduce((sum, item) => sum + numberValue(item.amount), 0);

  const upcomingRide = bookings.find(
    (ride) =>
      !["completed", "cancelled", "canceled"].includes(
        normalizeStatus(ride.status)
      )
  );

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading Angel Wallet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}
      >
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadWallet(true)}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => loadWallet(true)}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.gold} />
                ) : (
                  <RefreshCw size={18} color={colors.gold} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.themePill}
                onPress={toggleTheme}
              >
                <Text style={styles.themeText}>
                  {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>PASSENGER FINANCIAL CENTER</Text>
            <Text style={styles.title}>Angel Wallet</Text>
            <Text style={styles.subtitle}>
              Manage ride credits, refunds, referral rewards, payments,
              receipts, and travel expense reports.
            </Text>

            <View style={styles.walletHero}>
              <View style={styles.walletHeroTop}>
                <View style={styles.walletIcon}>
                  <WalletCards size={30} color={colors.navy} />
                </View>

                <View style={styles.currencyPill}>
                  <Text style={styles.currencyPillText}>
                    {wallet?.currency || "USD"}
                  </Text>
                </View>
              </View>

              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>
                {money(wallet?.available_balance)}
              </Text>

              <View style={styles.walletHeroBottom}>
                <View>
                  <Text style={styles.smallHeroLabel}>Pending</Text>
                  <Text style={styles.smallHeroValue}>
                    {money(wallet?.pending_balance)}
                  </Text>
                </View>

                <View>
                  <Text style={styles.smallHeroLabel}>Credits Earned</Text>
                  <Text style={styles.smallHeroValue}>
                    {money(creditsEarned)}
                  </Text>
                </View>
              </View>

              <View style={styles.autoApplyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoApplyTitle}>
                    Use Wallet for Next Ride
                  </Text>
                  <Text style={styles.autoApplyText}>
                    Automatically apply available credits first.
                  </Text>
                </View>

                {savingAutoApply ? (
                  <ActivityIndicator color={colors.navy} />
                ) : (
                  <Switch
                    value={Boolean(wallet?.auto_apply_wallet)}
                    onValueChange={toggleAutoApply}
                    trackColor={{
                      false: "rgba(11,19,32,0.25)",
                      true: colors.navy,
                    }}
                    thumbColor="#FFFFFF"
                  />
                )}
              </View>
            </View>

            <View style={styles.quickGrid}>
              <QuickStat
                icon={<Sparkles size={20} color={colors.gold} />}
                label="Referral"
                value={money(wallet?.referral_balance)}
                styles={styles}
              />
              <QuickStat
                icon={<Tag size={20} color={colors.gold} />}
                label="Promotional"
                value={money(wallet?.promotional_balance)}
                styles={styles}
              />
              <QuickStat
                icon={<ArrowDownLeft size={20} color={colors.gold} />}
                label="Refunds"
                value={money(wallet?.refund_balance)}
                styles={styles}
              />
              <QuickStat
                icon={<Banknote size={20} color={colors.gold} />}
                label="Purchased"
                value={money(wallet?.purchased_balance)}
                styles={styles}
              />
            </View>

            <View style={styles.summaryCard}>
              <SummaryLine
                label="Total Credits Earned"
                value={money(creditsEarned)}
                styles={styles}
              />
              <SummaryLine
                label="Total Credits Used"
                value={money(creditsUsed)}
                styles={styles}
              />
              <SummaryLine
                label="Pending Credits"
                value={money(wallet?.pending_balance)}
                styles={styles}
              />
              <SummaryLine
                label="Current Available Balance"
                value={money(wallet?.available_balance)}
                styles={styles}
                strong
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <CircleDollarSign size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Upcoming Ride Payment</Text>
              </View>

              {upcomingRide ? (
                <>
                  <View style={styles.routeBox}>
                    <Text style={styles.routeLabel}>PICKUP</Text>
                    <Text style={styles.routeText}>
                      {upcomingRide.pickup_address ||
                        upcomingRide.pickup ||
                        "Not provided"}
                    </Text>

                    <View style={styles.routeDivider} />

                    <Text style={styles.routeLabel}>DROP-OFF</Text>
                    <Text style={styles.routeText}>
                      {upcomingRide.dropoff_address ||
                        upcomingRide.dropoff ||
                        "Not provided"}
                    </Text>
                  </View>

                  <View style={styles.paymentBreakdown}>
                    <SummaryLine
                      label="Ride Fare"
                      value={money(
                        numberValue(
                          upcomingRide.final_fare,
                          upcomingRide.total_fare,
                          upcomingRide.fare,
                          upcomingRide.amount
                        )
                      )}
                      styles={styles}
                    />
                    <SummaryLine
                      label="Wallet Available"
                      value={money(wallet?.available_balance)}
                      styles={styles}
                    />
                    <SummaryLine
                      label="Payment Status"
                      value={upcomingRide.payment_status || "Pending"}
                      styles={styles}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.goldButton}
                    onPress={() => router.push("/pay-ride" as any)}
                    activeOpacity={0.86}
                  >
                    <BadgeDollarSign size={18} color={colors.navy} />
                    <Text style={styles.goldButtonText}>Open Ride Payment</Text>
                    <ChevronRight size={18} color={colors.navy} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No Upcoming Payment</Text>
                  <Text style={styles.emptyText}>
                    Your next unpaid or upcoming ride will appear here.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ReceiptText size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Ride Receipts</Text>
              </View>

              <Text style={styles.cardText}>
                Download official Angel Express receipts for reimbursement,
                business travel, tuition records, or school-trip documentation.
              </Text>

              {latestReceiptRide ? (
                <View style={styles.receiptPreview}>
                  <View style={styles.receiptTop}>
                    <View style={styles.receiptIcon}>
                      <FileText size={22} color={colors.gold} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.receiptInvoice}>
                        {latestReceiptRide.invoice_no ||
                          `AE-${String(latestReceiptRide.id).slice(0, 8)}`}
                      </Text>
                      <Text style={styles.receiptDate}>
                        {latestReceiptRide.ride_date ||
                          displayDate(latestReceiptRide.created_at)}
                      </Text>
                    </View>

                    <Text style={styles.receiptAmount}>
                      {money(
                        numberValue(
                          latestReceiptRide.final_fare,
                          latestReceiptRide.total_fare,
                          latestReceiptRide.fare,
                          latestReceiptRide.amount
                        )
                      )}
                    </Text>
                  </View>

                  <Text style={styles.receiptRoute}>
                    {latestReceiptRide.pickup_address ||
                      latestReceiptRide.pickup ||
                      "Pickup unavailable"}
                  </Text>
                  <Text style={styles.receiptArrow}>↓</Text>
                  <Text style={styles.receiptRoute}>
                    {latestReceiptRide.dropoff_address ||
                      latestReceiptRide.dropoff ||
                      "Drop-off unavailable"}
                  </Text>

                  <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={() => downloadRideReceipt(latestReceiptRide)}
                    disabled={exporting}
                  >
                    <Download size={18} color={colors.gold} />
                    <Text style={styles.outlineButtonText}>
                      Download Latest Receipt
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No completed ride receipt is available yet.
                </Text>
              )}

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push("/my-trips" as any)}
              >
                <View style={styles.actionIcon}>
                  <History size={19} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>View All Ride Receipts</Text>
                  <Text style={styles.actionSubtitle}>
                    Open your trip history and select any completed ride.
                  </Text>
                </View>
                <ChevronRight size={19} color={colors.gold} />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <BriefcaseBusiness size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Expense Reports</Text>
              </View>

              <Text style={styles.cardText}>
                Export a CSV travel report with invoice numbers, ride dates,
                routes, fares, payment status, and travel-purpose labels.
              </Text>

              <View style={styles.expenseFeature}>
                <GraduationCap size={20} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseFeatureTitle}>
                    Student & Tuition Documentation
                  </Text>
                  <Text style={styles.expenseFeatureText}>
                    Includes school or institution names when saved on the ride.
                  </Text>
                </View>
              </View>

              <View style={styles.expenseFeature}>
                <BriefcaseBusiness size={20} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseFeatureTitle}>
                    Business-Purpose Labels
                  </Text>
                  <Text style={styles.expenseFeatureText}>
                    Uses saved business or trip-purpose information.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.goldButton}
                onPress={exportExpenseReport}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator color={colors.navy} />
                ) : (
                  <>
                    <FileDown size={18} color={colors.navy} />
                    <Text style={styles.goldButtonText}>
                      Export Expense Report
                    </Text>
                    <ChevronRight size={18} color={colors.navy} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <History size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Wallet Activity</Text>
              </View>

              {transactions.length === 0 ? (
                <Text style={styles.emptyText}>
                  No wallet transactions have been recorded yet.
                </Text>
              ) : (
                transactions.slice(0, 12).map((item) => {
                  const isCredit = item.direction === "credit";

                  return (
                    <View key={item.id} style={styles.transactionRow}>
                      <View
                        style={[
                          styles.transactionIcon,
                          isCredit
                            ? styles.transactionIconCredit
                            : styles.transactionIconDebit,
                        ]}
                      >
                        {isCredit ? (
                          <ArrowDownLeft size={18} color={colors.navy} />
                        ) : (
                          <ArrowUpRight size={18} color={colors.gold} />
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.transactionTitle}>
                          {item.description ||
                            item.transaction_type
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (letter) =>
                                letter.toUpperCase()
                              )}
                        </Text>
                        <Text style={styles.transactionMeta}>
                          {displayDateTime(item.created_at)}
                          {item.invoice_no ? ` • ${item.invoice_no}` : ""}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={[
                            styles.transactionAmount,
                            isCredit
                              ? styles.transactionAmountCredit
                              : styles.transactionAmountDebit,
                          ]}
                        >
                          {isCredit ? "+" : "-"}
                          {money(item.amount)}
                        </Text>
                        <Text style={styles.transactionStatus}>
                          {item.status || "Completed"}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={shareWalletSummary}
              >
                <FileText size={18} color={colors.gold} />
                <Text style={styles.outlineButtonText}>
                  Share Wallet Summary
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.securityCard}>
              <ShieldCheck size={24} color={colors.navy} />
              <View style={{ flex: 1 }}>
                <Text style={styles.securityTitle}>Protected Wallet</Text>
                <Text style={styles.securityText}>
                  Wallet balances should only be changed by trusted Supabase
                  functions, owner actions, or payment workers—not directly by
                  the passenger app.
                </Text>
              </View>
            </View>

            <Text style={styles.footer}>
              Angel Express • Secure Credits, Receipts & Travel Records
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function QuickStat({
  icon,
  label,
  value,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.quickStat}>
      <View style={styles.quickStatIcon}>{icon}</View>
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

function SummaryLine({
  label,
  value,
  styles,
  strong = false,
}: {
  label: string;
  value: string;
  styles: any;
  strong?: boolean;
}) {
  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, strong && styles.summaryLabelStrong]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]}>
        {value}
      </Text>
    </View>
  );
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
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.bg,
    },
    loadingText: {
      color: c.text,
      marginTop: 14,
      fontSize: 15,
      fontWeight: "800",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    topActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
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
    refreshButton: {
      width: 42,
      height: 42,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
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
      fontSize: 38,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },
    walletHero: {
      backgroundColor: c.gold,
      borderRadius: 28,
      padding: 22,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    walletHeroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    walletIcon: {
      width: 60,
      height: 60,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.32)",
      alignItems: "center",
      justifyContent: "center",
    },
    currencyPill: {
      backgroundColor: "rgba(255,255,255,0.30)",
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 8,
    },
    currencyPillText: {
      color: c.navy,
      fontSize: 12,
      fontWeight: "900",
    },
    balanceLabel: {
      color: c.navy,
      fontSize: 14,
      fontWeight: "900",
      opacity: 0.76,
    },
    balanceValue: {
      color: c.navy,
      fontSize: 48,
      fontWeight: "900",
      letterSpacing: -1,
      marginTop: 4,
      marginBottom: 18,
    },
    walletHeroBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 18,
    },
    smallHeroLabel: {
      color: c.navy,
      fontSize: 11,
      fontWeight: "900",
      opacity: 0.66,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    smallHeroValue: {
      color: c.navy,
      fontSize: 17,
      fontWeight: "900",
    },
    autoApplyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 17,
      backgroundColor: "rgba(255,255,255,0.26)",
      padding: 14,
    },
    autoApplyTitle: {
      color: c.navy,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 3,
    },
    autoApplyText: {
      color: c.navy,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
      opacity: 0.76,
    },
    quickGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    quickStat: {
      width: "48%",
      minHeight: 126,
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 17,
      marginBottom: 14,
      ...v5Shadow(c),
    },
    quickStatIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    quickStatValue: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 6,
    },
    quickStatLabel: {
      color: c.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
    },
    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    summaryLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
    },
    summaryLabel: {
      color: c.text2,
      fontSize: 13.5,
      fontWeight: "700",
      flex: 1,
    },
    summaryValue: {
      color: c.text,
      fontSize: 14,
      fontWeight: "900",
    },
    summaryLabelStrong: {
      color: c.gold,
      fontWeight: "900",
    },
    summaryValueStrong: {
      color: c.gold,
      fontSize: 17,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      padding: 19,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.borderSoft,
      ...v5Shadow(c),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
    },
    cardTitle: {
      color: c.gold,
      fontSize: 21,
      fontWeight: "900",
      flex: 1,
    },
    cardText: {
      color: c.text2,
      fontSize: 13.5,
      lineHeight: 21,
      fontWeight: "700",
      marginBottom: 14,
    },
    routeBox: {
      backgroundColor: c.soft,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 14,
    },
    routeLabel: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    routeText: {
      color: c.text,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
    },
    routeDivider: {
      height: 1,
      backgroundColor: c.borderSoft,
      marginVertical: 12,
    },
    paymentBreakdown: {
      marginBottom: 14,
    },
    goldButton: {
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: c.gold,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
      ...v5Shadow(c),
    },
    goldButtonText: {
      color: c.navy,
      fontSize: 14.5,
      fontWeight: "900",
      flex: 1,
      textAlign: "center",
      textTransform: "uppercase",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 10,
    },
    emptyTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 6,
    },
    emptyText: {
      color: c.text2,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "700",
      textAlign: "center",
    },
    receiptPreview: {
      backgroundColor: c.card2,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 15,
      marginBottom: 14,
    },
    receiptTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
    },
    receiptIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    receiptInvoice: {
      color: c.text,
      fontSize: 14.5,
      fontWeight: "900",
      marginBottom: 3,
    },
    receiptDate: {
      color: c.text2,
      fontSize: 12,
      fontWeight: "700",
    },
    receiptAmount: {
      color: c.gold,
      fontSize: 17,
      fontWeight: "900",
    },
    receiptRoute: {
      color: c.text,
      fontSize: 13.5,
      lineHeight: 19,
      fontWeight: "800",
    },
    receiptArrow: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginVertical: 4,
    },
    outlineButton: {
      minHeight: 52,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 14,
      marginTop: 14,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
      textAlign: "center",
    },
    actionRow: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
      paddingTop: 14,
      marginTop: 14,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    actionTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 3,
    },
    actionSubtitle: {
      color: c.text2,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
    },
    expenseFeature: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 15,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      padding: 13,
      marginBottom: 10,
    },
    expenseFeatureTitle: {
      color: c.text,
      fontSize: 13.5,
      fontWeight: "900",
      marginBottom: 3,
    },
    expenseFeatureText: {
      color: c.text2,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
    },
    transactionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
      paddingVertical: 13,
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    transactionIconCredit: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    transactionIconDebit: {
      backgroundColor: c.soft,
      borderColor: c.border,
    },
    transactionTitle: {
      color: c.text,
      fontSize: 13.5,
      fontWeight: "900",
      marginBottom: 3,
    },
    transactionMeta: {
      color: c.text2,
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: "700",
    },
    transactionAmount: {
      fontSize: 14,
      fontWeight: "900",
    },
    transactionAmountCredit: {
      color: c.gold,
    },
    transactionAmountDebit: {
      color: c.text,
    },
    transactionStatus: {
      color: c.text2,
      fontSize: 10,
      fontWeight: "800",
      marginTop: 3,
      textTransform: "capitalize",
    },
    securityCard: {
      backgroundColor: c.gold,
      borderRadius: 22,
      padding: 17,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    securityTitle: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      marginBottom: 4,
    },
    securityText: {
      color: c.navy,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "800",
      opacity: 0.82,
    },
    footer: {
      color: c.text,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
      textAlign: "center",
      opacity: 0.9,
      marginTop: 8,
    },
  });
}
