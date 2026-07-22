import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  CarFront,
  ChevronRight,
  Clapperboard,
  Film,
  Gamepad2,
  Headphones,
  Heart,
  Music,
  PlayCircle,
  Radio,
  Rocket,
  Sparkles,
  Star,
  Tv,
  Zap,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

type Mood = "Chill" | "Road Trip" | "Focus" | "Party";

const movieApps = [
  {
    title: "YouTube",
    subtitle: "Videos, shows, creators, and music",
    url: "https://www.youtube.com",
    icon: Tv,
  },
  {
    title: "Netflix",
    subtitle: "Movies, documentaries, and series",
    url: "https://www.netflix.com",
    icon: Film,
  },
  {
    title: "Hulu",
    subtitle: "Shows, movies, and live television",
    url: "https://www.hulu.com",
    icon: PlayCircle,
  },
  {
    title: "Max",
    subtitle: "Premium movies and original series",
    url: "https://www.max.com",
    icon: Star,
  },
  {
    title: "Peacock",
    subtitle: "NBC shows, sports, and movies",
    url: "https://www.peacocktv.com",
    icon: Tv,
  },
  {
    title: "Prime Video",
    subtitle: "Amazon movies, shows, and rentals",
    url: "https://www.primevideo.com",
    icon: Clapperboard,
  },
  {
    title: "Disney+",
    subtitle: "Disney, Marvel, Pixar, and more",
    url: "https://www.disneyplus.com",
    icon: Sparkles,
  },
];

const musicApps = [
  {
    title: "Spotify",
    subtitle: "Playlists, podcasts, and albums",
    url: "https://open.spotify.com",
    icon: Music,
  },
  {
    title: "Apple Music",
    subtitle: "Songs, albums, stations, and radio",
    url: "https://music.apple.com",
    icon: Headphones,
  },
  {
    title: "Amazon Music",
    subtitle: "Music, podcasts, and curated stations",
    url: "https://music.amazon.com",
    icon: Radio,
  },
  {
    title: "YouTube Music",
    subtitle: "Music videos, mixes, and playlists",
    url: "https://music.youtube.com",
    icon: PlayCircle,
  },
];

const moodMessages: Record<Mood, string> = {
  Chill: "Soft playlists, relaxing videos, and calm ride vibes.",
  "Road Trip": "Upbeat playlists, travel videos, and quick arcade games.",
  Focus: "Podcasts, study music, and low-distraction entertainment.",
  Party: "High-energy music, videos, and competitive games.",
};

export default function EntertainmentHubScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeMood, setActiveMood] = useState<Mood>("Chill");

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(24)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const bgScale = useRef(new Animated.Value(1)).current;
  const featuredGlow = useRef(new Animated.Value(0)).current;

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

    const pulseLoop = Animated.loop(
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
    );

    const backgroundLoop = Animated.loop(
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

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(featuredGlow, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: false,
        }),
        Animated.timing(featuredGlow, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: false,
        }),
      ])
    );

    pulseLoop.start();
    backgroundLoop.start();
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      backgroundLoop.stop();
      glowLoop.stop();
    };
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

  const featuredBorder = featuredGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "rgba(212,175,55,0.30)",
      "rgba(212,175,55,0.95)",
    ],
  });

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

              <TouchableOpacity
                style={styles.themePill}
                onPress={toggleTheme}
                activeOpacity={0.85}
              >
                <Text style={styles.themeText}>
                  {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hero}>
              <Animated.View
                style={[styles.heroIcon, { transform: [{ scale: pulse }] }]}
              >
                <Sparkles size={34} color={colors.navy} />
              </Animated.View>

              <Text style={styles.kicker}>ANGEL EXPRESS MOBILITY</Text>
              <Text style={styles.title}>Angel Entertainment Hub+</Text>
              <Text style={styles.subtitle}>
                Movies, music, games, playlists, podcasts, and ride-friendly
                entertainment in one premium passenger experience.
              </Text>

              <View style={styles.heroPills}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Movies</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Music</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>3 Games</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Ride Moods</Text>
                </View>
              </View>
            </View>

            <Animated.View
              style={[
                styles.featuredCard,
                { borderColor: featuredBorder },
              ]}
            >
              <View style={styles.featuredTop}>
                <View style={styles.featuredIcon}>
                  <Gamepad2 size={30} color={colors.navy} />
                </View>

                <View style={styles.featuredCopy}>
                  <Text style={styles.featuredKicker}>FEATURED EXPERIENCE</Text>
                  <Text style={styles.featuredTitle}>Angel Arcade</Text>
                  <Text style={styles.featuredText}>
                    Three games in one: Angel Road Tap, Galaxy Defender,
                    and Angel Highway Run.
                  </Text>
                </View>
              </View>

              <View style={styles.gamePreviewRow}>
                <GamePreview
                  label="Road Tap"
                  icon={<Zap size={18} color={colors.gold} />}
                  styles={styles}
                />
                <GamePreview
                  label="Galaxy"
                  icon={<Rocket size={18} color={colors.gold} />}
                  styles={styles}
                />
                <GamePreview
                  label="Highway"
                  icon={<CarFront size={18} color={colors.gold} />}
                  styles={styles}
                />
              </View>

              <TouchableOpacity
                style={styles.featuredButton}
                onPress={() => router.push("/angel-arcade" as any)}
                activeOpacity={0.86}
              >
                <Gamepad2 size={20} color={colors.navy} />
                <Text style={styles.featuredButtonText}>Open Angel Arcade</Text>
                <ChevronRight size={20} color={colors.navy} />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.moodCard}>
              <View style={styles.sectionMiniHeader}>
                <View>
                  <Text style={styles.moodEyebrow}>PERSONALIZE YOUR RIDE</Text>
                  <Text style={styles.moodTitle}>Choose Your Ride Mood</Text>
                </View>

                <Heart size={23} color={colors.gold} />
              </View>

              <Text style={styles.moodText}>
                {moodMessages[activeMood]}
              </Text>

              <View style={styles.moodGrid}>
                {(["Chill", "Road Trip", "Focus", "Party"] as Mood[]).map(
                  (mood) => (
                    <MoodButton
                      key={mood}
                      label={mood}
                      active={activeMood === mood}
                      onPress={() => setActiveMood(mood)}
                      styles={styles}
                    />
                  )
                )}
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

            <View style={styles.quickTips}>
              <Text style={styles.quickTipsTitle}>Ride Entertainment Tips</Text>
              <Text style={styles.quickTipsText}>
                • Use headphones when other passengers are present.
              </Text>
              <Text style={styles.quickTipsText}>
                • Download shows and playlists before long trips.
              </Text>
              <Text style={styles.quickTipsText}>
                • Keep volume low enough to hear your driver when needed.
              </Text>
            </View>

            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Entertainment Note</Text>
              <Text style={styles.noticeText}>
                Streaming services may require your own account, subscription,
                and mobile data. Angel Express provides convenient access but
                does not manage third-party content or subscriptions.
              </Text>
            </View>

            <Text style={styles.footer}>
              Angel Express • Comfort In Every Ride
            </Text>
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

        <View style={styles.sectionHeaderCopy}>
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

        <View style={styles.platformCopy}>
          <Text style={styles.platformTitle}>{title}</Text>
          <Text style={styles.platformSubtitle}>{subtitle}</Text>
        </View>

        <ChevronRight size={22} color={colors.gold} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function MoodButton({
  label,
  active,
  onPress,
  styles,
}: {
  label: Mood;
  active: boolean;
  onPress: () => void;
  styles: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.moodButton,
        active && styles.moodButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.moodButtonText,
          active && styles.moodButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function GamePreview({
  label,
  icon,
  styles,
}: {
  label: string;
  icon: React.ReactNode;
  styles: any;
}) {
  return (
    <View style={styles.gamePreview}>
      <View style={styles.gamePreviewIcon}>{icon}</View>
      <Text style={styles.gamePreviewText}>{label}</Text>
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

    featuredCard: {
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderRadius: 26,
      padding: 18,
      marginBottom: 20,
      ...v5Shadow(c),
    },
    featuredTop: {
      flexDirection: "row",
      gap: 14,
      marginBottom: 16,
    },
    featuredIcon: {
      width: 60,
      height: 60,
      borderRadius: 21,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    featuredCopy: {
      flex: 1,
    },
    featuredKicker: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    featuredTitle: {
      color: c.text,
      fontSize: 23,
      fontWeight: "900",
      marginBottom: 5,
    },
    featuredText: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },
    gamePreviewRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 15,
    },
    gamePreview: {
      flex: 1,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      minHeight: 70,
      alignItems: "center",
      justifyContent: "center",
      padding: 8,
    },
    gamePreviewIcon: {
      marginBottom: 5,
    },
    gamePreviewText: {
      color: c.text,
      fontSize: 11,
      fontWeight: "900",
      textAlign: "center",
    },
    featuredButton: {
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: c.gold,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    featuredButtonText: {
      color: c.navy,
      fontSize: 14.5,
      fontWeight: "900",
      textTransform: "uppercase",
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
    sectionMiniHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 8,
    },
    moodEyebrow: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
      marginBottom: 4,
    },
    moodTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: "900",
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
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    moodButtonActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    moodButtonText: {
      color: c.text,
      fontWeight: "900",
      fontSize: 13,
    },
    moodButtonTextActive: {
      color: c.navy,
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
    sectionHeaderCopy: {
      flex: 1,
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
      lineHeight: 18,
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
    platformCopy: {
      flex: 1,
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
      lineHeight: 17,
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
    gameCardCopy: {
      flex: 1,
    },
    gameTitle: {
      color: c.navy,
      fontSize: 19,
      fontWeight: "900",
      marginBottom: 4,
    },
    gameText: {
      color: c.navy,
      fontSize: 12.5,
      fontWeight: "800",
      lineHeight: 18,
      opacity: 0.82,
    },
    gameStatusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 9,
    },
    gameStatusPill: {
      backgroundColor: "rgba(255,255,255,0.35)",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    gameStatusText: {
      color: c.navy,
      fontSize: 9.5,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    quickTips: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 22,
      padding: 18,
      marginBottom: 20,
    },
    quickTipsTitle: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 9,
    },
    quickTipsText: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 21,
      fontWeight: "700",
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
