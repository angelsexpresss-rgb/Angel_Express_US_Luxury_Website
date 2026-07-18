import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Animated,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Clapperboard,
  Film,
  Gamepad2,
  Headphones,
  Music,
  PlayCircle,
  Radio,
  Sparkles,
  Star,
  Tv,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const movieApps = [
  { title: "YouTube", subtitle: "Videos, shows, music videos", url: "https://www.youtube.com", icon: Tv },
  { title: "Netflix", subtitle: "Movies and series", url: "https://www.netflix.com", icon: Film },
  { title: "Hulu", subtitle: "Shows, movies, live TV", url: "https://www.hulu.com", icon: PlayCircle },
  { title: "HBO Max", subtitle: "Premium movies and originals", url: "https://www.max.com", icon: Star },
  { title: "Peacock", subtitle: "NBC shows, sports, movies", url: "https://www.peacocktv.com", icon: Tv },
  { title: "Prime Video", subtitle: "Amazon movies and shows", url: "https://www.primevideo.com", icon: Clapperboard },
  { title: "Disney+", subtitle: "Disney, Marvel, Pixar", url: "https://www.disneyplus.com", icon: Sparkles },
];

const musicApps = [
  { title: "Spotify", subtitle: "Playlists, podcasts, albums", url: "https://open.spotify.com", icon: Music },
  { title: "Apple Music", subtitle: "Songs, albums, radio", url: "https://music.apple.com", icon: Headphones },
  { title: "Amazon Music", subtitle: "Music and podcasts", url: "https://music.amazon.com", icon: Radio },
  { title: "YouTube Music", subtitle: "Music videos and playlists", url: "https://music.youtube.com", icon: PlayCircle },
];

export default function EntertainmentHubScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(24)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const bgScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

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
  }, []);

  async function openLink(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Unable to Open",
        "Please check your internet connection or install the selected app."
      );
    }
  }

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
        <Animated.View
          style={[
            styles.screen,
            {
              opacity: fade,
              transform: [{ translateY: rise }],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <ArrowLeft size={19} color={colors.gold} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
                <Text style={styles.themeText}>
                  {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hero}>
              <Animated.View style={[styles.heroIcon, { transform: [{ scale: pulse }] }]}>
                <Sparkles size={34} color={colors.navy} />
              </Animated.View>

              <Text style={styles.kicker}>ANGEL EXPRESS MOBILITY</Text>
              <Text style={styles.title}>Angel Entertainment Hub+</Text>
              <Text style={styles.subtitle}>
                Your premium ride companion for movies, music, games, playlists,
                relaxation, and travel vibes while Angel Express takes you there.
              </Text>

              <View style={styles.heroPills}>
                <View style={styles.pill}><Text style={styles.pillText}>Movies</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>Music</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>Games</Text></View>
              </View>
            </View>

            <View style={styles.moodCard}>
              <Text style={styles.moodTitle}>Choose Your Ride Mood</Text>
              <Text style={styles.moodText}>
                Long ride? Airport transfer? Student trip? Pick your entertainment and enjoy the journey.
              </Text>

              <View style={styles.moodGrid}>
                <MoodButton label="Chill" styles={styles} />
                <MoodButton label="Road Trip" styles={styles} />
                <MoodButton label="Focus" styles={styles} />
                <MoodButton label="Party" styles={styles} />
              </View>
            </View>

            <Section
              title="Movies & Streaming"
              subtitle="Open your favorite streaming platform."
              icon={<Clapperboard size={24} color={colors.gold} />}
              styles={styles}
            >
              {movieApps.map((item) => (
                <PlatformCard
                  key={item.title}
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  onPress={() => openLink(item.url)}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </Section>

            <Section
              title="Music & Audio"
              subtitle="Open playlists, podcasts, albums, radio, and music videos."
              icon={<Music size={24} color={colors.gold} />}
              styles={styles}
            >
              {musicApps.map((item) => (
                <PlatformCard
                  key={item.title}
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  onPress={() => openLink(item.url)}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </Section>

            <Section
              title="Angel Games"
              subtitle="Play quick in-app games during your ride."
              icon={<Gamepad2 size={24} color={colors.gold} />}
              styles={styles}
            >
              <TouchableOpacity
                style={styles.gameCard}
                onPress={() => router.push("/angel-game" as any)}
                activeOpacity={0.86}
              >
                <View style={styles.gameIcon}>
                  <Gamepad2 size={30} color={colors.navy} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.gameTitle}>Angel Road Tap</Text>
                  <Text style={styles.gameText}>
                    Tap the Angel target, beat the timer, and challenge your score.
                  </Text>
                </View>

                <Text style={styles.gameArrow}>›</Text>
              </TouchableOpacity>
            </Section>

            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Entertainment Note</Text>
              <Text style={styles.noticeText}>
                Streaming apps may require your own account or subscription. Angel Express only helps you open your preferred platform.
              </Text>
            </View>

            <Text style={styles.footer}>Angel Express • Comfort In Every Ride</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
  styles,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  styles: any;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.grid}>{children}</View>
    </View>
  );
}

function PlatformCard({
  title,
  subtitle,
  icon: Icon,
  onPress,
  styles,
  colors,
}: {
  title: string;
  subtitle: string;
  icon: any;
  onPress: () => void;
  styles: any;
  colors: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }

  function pressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.platformCard}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={0.9}
      >
        <View style={styles.platformIcon}>
          <Icon size={22} color={colors.gold} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.platformTitle}>{title}</Text>
          <Text style={styles.platformSubtitle}>{subtitle}</Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MoodButton({ label, styles }: { label: string; styles: any }) {
  return (
    <TouchableOpacity style={styles.moodButton} activeOpacity={0.85}>
      <Text style={styles.moodButtonText}>{label}</Text>
    </TouchableOpacity>
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
    screen: {
      flex: 1,
    },
    container: {
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
    backBtn: {
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
      fontWeight: "900",
      fontSize: 15,
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

    hero: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 30,
      padding: 24,
      marginBottom: 20,
      overflow: "hidden",
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 74,
      height: 74,
      borderRadius: 26,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 2.3,
      marginBottom: 10,
    },
    title: {
      color: c.text,
      fontSize: 38,
      fontWeight: "900",
      lineHeight: 43,
      marginBottom: 12,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 24,
      fontWeight: "700",
    },
    heroPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 18,
    },
    pill: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    pillText: {
      color: c.gold,
      fontWeight: "900",
      fontSize: 12,
    },

    moodCard: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 24,
      padding: 18,
      marginBottom: 20,
      ...v5Shadow(c),
    },
    moodTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 8,
    },
    moodText: {
      color: c.text2,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 22,
      marginBottom: 14,
    },
    moodGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    moodButton: {
      backgroundColor: c.gold,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    moodButtonText: {
      color: c.navy,
      fontWeight: "900",
      fontSize: 13,
    },

    section: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 24,
      padding: 18,
      marginBottom: 20,
      ...v5Shadow(c),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    sectionIcon: {
      width: 48,
      height: 48,
      borderRadius: 18,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: "900",
    },
    sectionSubtitle: {
      color: c.text2,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 3,
    },
    grid: {
      gap: 12,
    },

    platformCard: {
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 20,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    platformIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    platformTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
    },
    platformSubtitle: {
      color: c.text2,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 3,
    },
    arrow: {
      color: c.gold,
      fontSize: 30,
      fontWeight: "900",
    },

    gameCard: {
      backgroundColor: c.gold,
      borderRadius: 22,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      ...v5Shadow(c),
    },
    gameIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.85)",
      alignItems: "center",
      justifyContent: "center",
    },
    gameTitle: {
      color: c.navy,
      fontSize: 19,
      fontWeight: "900",
      marginBottom: 4,
    },
    gameText: {
      color: c.navy,
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 19,
      opacity: 0.82,
    },
    gameArrow: {
      color: c.navy,
      fontSize: 36,
      fontWeight: "900",
    },

    notice: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 22,
      padding: 18,
      marginBottom: 20,
      ...v5Shadow(c),
    },
    noticeTitle: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 8,
    },
    noticeText: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 21,
      fontWeight: "700",
    },
    footer: {
      color: c.text,
      textAlign: "center",
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.9,
    },
  });
}