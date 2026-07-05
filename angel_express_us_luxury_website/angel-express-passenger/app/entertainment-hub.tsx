import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
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

const GOLD = "#D4AF37";
const DARK = "#050b16";
const CARD = "rgba(13,20,34,0.94)";

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
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(24)).current;
  const pulse = useRef(new Animated.Value(1)).current;

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
    <View style={styles.bg}>
      <View style={styles.goldGlowTop} />
      <View style={styles.goldGlowBottom} />

      <Animated.View
        style={[
          styles.screen,
          {
            opacity: fade,
            transform: [{ translateY: rise }],
          },
        ]}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <ArrowLeft size={20} color={GOLD} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <Animated.View style={[styles.heroIcon, { transform: [{ scale: pulse }] }]}>
              <Sparkles size={34} color={DARK} />
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
              <MoodButton label="Chill" />
              <MoodButton label="Road Trip" />
              <MoodButton label="Focus" />
              <MoodButton label="Party" />
            </View>
          </View>

          <Section
            title="Movies & Streaming"
            subtitle="Open your favorite streaming platform."
            icon={<Clapperboard size={24} color={GOLD} />}
          >
            {movieApps.map((item) => (
              <PlatformCard
                key={item.title}
                title={item.title}
                subtitle={item.subtitle}
                icon={item.icon}
                onPress={() => openLink(item.url)}
              />
            ))}
          </Section>

          <Section
            title="Music & Audio"
            subtitle="Open playlists, podcasts, albums, radio, and music videos."
            icon={<Music size={24} color={GOLD} />}
          >
            {musicApps.map((item) => (
              <PlatformCard
                key={item.title}
                title={item.title}
                subtitle={item.subtitle}
                icon={item.icon}
                onPress={() => openLink(item.url)}
              />
            ))}
          </Section>

          <Section
            title="Angel Games"
            subtitle="Play quick in-app games during your ride."
            icon={<Gamepad2 size={24} color={GOLD} />}
          >
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => router.push("/angel-game" as any)}
              activeOpacity={0.86}
            >
              <View style={styles.gameIcon}>
                <Gamepad2 size={30} color={DARK} />
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
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
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
}: {
  title: string;
  subtitle: string;
  icon: any;
  onPress: () => void;
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
          <Icon size={22} color={GOLD} />
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

function MoodButton({ label }: { label: string }) {
  return (
    <TouchableOpacity style={styles.moodButton} activeOpacity={0.85}>
      <Text style={styles.moodButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: DARK,
  },

  screen: {
    flex: 1,
  },

  goldGlowTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(212,175,55,0.16)",
  },

  goldGlowBottom: {
    position: "absolute",
    bottom: -120,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(212,175,55,0.10)",
  },

  container: {
    padding: 22,
    paddingTop: 60,
    paddingBottom: 42,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 22,
  },

  backText: {
    color: GOLD,
    fontWeight: "900",
    fontSize: 16,
  },

  hero: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    borderRadius: 34,
    padding: 24,
    marginBottom: 20,
    overflow: "hidden",
  },

  heroIcon: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  kicker: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2.5,
    marginBottom: 10,
  },

  title: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 43,
    marginBottom: 12,
  },

  subtitle: {
    color: "#DDE3EA",
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
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.10)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },

  pillText: {
    color: GOLD,
    fontWeight: "900",
    fontSize: 12,
  },

  moodCard: {
    backgroundColor: "rgba(212,175,55,0.11)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    borderRadius: 28,
    padding: 18,
    marginBottom: 20,
  },

  moodTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },

  moodText: {
    color: "#DDE3EA",
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
    backgroundColor: GOLD,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  moodButtonText: {
    color: DARK,
    fontWeight: "900",
    fontSize: 13,
  },

  section: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 30,
    padding: 18,
    marginBottom: 20,
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
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: "#AAB4C2",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },

  grid: {
    gap: 12,
  },

  platformCard: {
    backgroundColor: "rgba(255,255,255,0.065)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  platformIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(5,11,22,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },

  platformTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },

  platformSubtitle: {
    color: "#AAB4C2",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  arrow: {
    color: GOLD,
    fontSize: 30,
    fontWeight: "900",
  },

  gameCard: {
    backgroundColor: GOLD,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  gameIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  gameTitle: {
    color: DARK,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 4,
  },

  gameText: {
    color: DARK,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },

  gameArrow: {
    color: DARK,
    fontSize: 36,
    fontWeight: "900",
  },

  notice: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.16)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
  },

  noticeTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },

  noticeText: {
    color: "#DDE3EA",
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "700",
  },

  footer: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
});