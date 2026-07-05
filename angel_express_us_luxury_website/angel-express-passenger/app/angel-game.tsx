import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Gamepad2,
  Heart,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react-native";

const GOLD = "#D4AF37";
const DARK = "#050b16";
const CARD = "rgba(13,20,34,0.94)";
const { width } = Dimensions.get("window");

type GameMode = "classic" | "speed" | "shield";

export default function AngelGameScreen() {
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);

  const boardWidth = Math.min(width - 44, 390);
  const boardHeight = 430;

  const [target, setTarget] = useState({
    top: 160,
    left: boardWidth / 2 - 38,
    size: 76,
  });

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(28)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const targetScale = useRef(new Animated.Value(1)).current;
  const targetRotate = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

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
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!gameActive) return;

    if (timeLeft <= 0 || lives <= 0) {
      finishGame();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);

      if (gameMode === "speed" && timeLeft % 4 === 0) {
        randomTarget(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameActive, timeLeft, lives, gameMode]);

  function getModeTime(mode: GameMode) {
    if (mode === "speed") return 20;
    if (mode === "shield") return 35;
    return 30;
  }

  function getModeLives(mode: GameMode) {
    if (mode === "shield") return 5;
    if (mode === "speed") return 2;
    return 3;
  }

  function getTargetSize() {
    if (gameMode === "speed") return 58;
    if (combo >= 10) return 58;
    if (combo >= 5) return 66;
    return 76;
  }

  function randomTarget(forceSmall = false) {
    const size = forceSmall ? 56 : getTargetSize();
    const maxLeft = Math.max(20, boardWidth - size - 20);
    const maxTop = boardHeight - size - 25;

    setTarget({
      size,
      left: Math.floor(Math.random() * maxLeft) + 10,
      top: Math.floor(Math.random() * maxTop) + 10,
    });
  }

  function startGame(mode = gameMode) {
    setGameMode(mode);
    setScore(0);
    setCombo(0);
    setTimeLeft(getModeTime(mode));
    setLives(getModeLives(mode));
    setGameOver(false);
    setGameActive(true);

    setTimeout(() => randomTarget(), 100);
  }

  function finishGame() {
    setGameActive(false);
    setGameOver(true);

    if (score > bestScore) {
      setBestScore(score);
    }

    setTimeout(() => {
      Alert.alert(
        score > bestScore ? "New Best Score!" : "Game Over",
        `Score: ${score}\nBest: ${Math.max(score, bestScore)}`
      );
    }, 250);
  }

  function missTap() {
    if (!gameActive) return;

    setCombo(0);
    setLives((prev) => Math.max(prev - 1, 0));
  }

  function tapTarget() {
    if (!gameActive) return;

    const nextCombo = combo + 1;
    const bonus = nextCombo >= 10 ? 3 : nextCombo >= 5 ? 2 : 1;

    setCombo(nextCombo);
    setScore((prev) => prev + bonus);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(targetScale, {
          toValue: 1.35,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(targetRotate, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(targetScale, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(targetRotate, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    randomTarget();
  }

  const rotate = targetRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "12deg"],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.75],
  });

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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <ArrowLeft size={20} color={GOLD} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <Animated.View style={[styles.heroIcon, { transform: [{ scale: pulse }] }]}>
              <Gamepad2 size={34} color={DARK} />
            </Animated.View>

            <Text style={styles.kicker}>ANGEL EXPRESS GAME</Text>
            <Text style={styles.title}>Angel Road Tap</Text>
            <Text style={styles.subtitle}>
              Tap the golden Angel target, build combos, protect your lives, and beat your best score.
            </Text>
          </View>

          <View style={styles.modeSection}>
            <Text style={styles.modeTitle}>Choose Game Mode</Text>

            <View style={styles.modeGrid}>
              <ModeButton
                active={gameMode === "classic"}
                title="Classic"
                subtitle="30s • 3 lives"
                icon={<Sparkles size={20} color={gameMode === "classic" ? DARK : GOLD} />}
                onPress={() => startGame("classic")}
              />

              <ModeButton
                active={gameMode === "speed"}
                title="Speed"
                subtitle="20s • Fast"
                icon={<Zap size={20} color={gameMode === "speed" ? DARK : GOLD} />}
                onPress={() => startGame("speed")}
              />

              <ModeButton
                active={gameMode === "shield"}
                title="Shield"
                subtitle="35s • 5 lives"
                icon={<Shield size={20} color={gameMode === "shield" ? DARK : GOLD} />}
                onPress={() => startGame("shield")}
              />
            </View>
          </View>

          <View style={styles.scoreRow}>
            <ScoreCard label="Score" value={score.toString()} icon={<Trophy size={21} color={GOLD} />} />
            <ScoreCard label="Best" value={bestScore.toString()} icon={<Sparkles size={21} color={GOLD} />} />
          </View>

          <View style={styles.scoreRow}>
            <ScoreCard label="Time" value={`${timeLeft}s`} icon={<Zap size={21} color={GOLD} />} />
            <ScoreCard label="Lives" value={"♥".repeat(lives) || "0"} icon={<Heart size={21} color={GOLD} />} />
          </View>

          <View style={styles.comboBar}>
            <Text style={styles.comboText}>
              Combo: <Text style={styles.comboGold}>{combo}x</Text>
            </Text>

            <Text style={styles.comboHint}>
              {combo >= 10 ? "Legend bonus +3" : combo >= 5 ? "Power bonus +2" : "Build your streak"}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={1}
            style={[styles.gameBoard, { width: boardWidth, height: boardHeight }]}
            onPress={missTap}
          >
            {!gameActive ? (
              <View style={styles.startBox}>
                <View style={styles.startIcon}>
                  <Gamepad2 size={34} color={DARK} />
                </View>

                <Text style={styles.startTitle}>
                  {gameOver ? "Play Again?" : "Ready to Ride?"}
                </Text>

                <Text style={styles.startText}>
                  Tap the Angel target. Avoid missing. Combos increase your points.
                </Text>

                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => startGame()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.startButtonText}>
                    {gameOver ? "Restart Game" : "Start Game"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Animated.View
                style={[
                  styles.target,
                  {
                    top: target.top,
                    left: target.left,
                    width: target.size,
                    height: target.size,
                    transform: [{ scale: targetScale }, { rotate }],
                  },
                ]}
              >
                <Animated.View style={[styles.targetGlow, { opacity: glowOpacity }]} />

                <TouchableOpacity
                  style={styles.targetButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    tapTarget();
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.targetWing}>翼</Text>
                  <Text style={styles.targetText}>A</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.resetButton} onPress={() => startGame()} activeOpacity={0.85}>
              <RotateCcw size={18} color={DARK} />
              <Text style={styles.resetButtonText}>Restart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                Alert.alert(
                  "How to Play",
                  "Tap the gold Angel target before time runs out. Missing the board removes a life. Combos give bonus points."
                )
              }
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>How to Play</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>Game Rules</Text>
            <Text style={styles.rulesText}>• Hit targets to score points.</Text>
            <Text style={styles.rulesText}>• Missing removes one life.</Text>
            <Text style={styles.rulesText}>• 5x combo gives +2 points per hit.</Text>
            <Text style={styles.rulesText}>• 10x combo gives +3 points per hit.</Text>
          </View>

          <Text style={styles.footer}>Angel Express • Enjoy The Ride</Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function ModeButton({
  active,
  title,
  subtitle,
  icon,
  onPress,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modeButton, active && styles.modeButtonActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon}
      <Text style={[styles.modeButtonTitle, active && styles.modeButtonTitleActive]}>{title}</Text>
      <Text style={[styles.modeButtonSub, active && styles.modeButtonSubActive]}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function ScoreCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.scoreCard}>
      {icon}
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
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
    alignItems: "center",
  },

  backBtn: {
    width: "100%",
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
    width: "100%",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    borderRadius: 34,
    padding: 24,
    marginBottom: 20,
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

  modeSection: {
    width: "100%",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 28,
    padding: 16,
    marginBottom: 16,
  },

  modeTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 12,
  },

  modeGrid: {
    flexDirection: "row",
    gap: 10,
  },

  modeButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.065)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
  },

  modeButtonActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },

  modeButtonTitle: {
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 6,
    fontSize: 13,
  },

  modeButtonTitleActive: {
    color: DARK,
  },

  modeButtonSub: {
    color: "#AAB4C2",
    fontWeight: "700",
    fontSize: 10,
    marginTop: 3,
  },

  modeButtonSubActive: {
    color: DARK,
  },

  scoreRow: {
    width: "100%",
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },

  scoreCard: {
    flex: 1,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
  },

  scoreLabel: {
    color: "#DDE3EA",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },

  scoreValue: {
    color: GOLD,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 4,
  },

  comboBar: {
    width: "100%",
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 22,
    padding: 14,
    marginBottom: 16,
  },

  comboText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },

  comboGold: {
    color: GOLD,
  },

  comboHint: {
    color: "#AAB4C2",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  gameBoard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    borderRadius: 30,
    marginBottom: 18,
    overflow: "hidden",
    position: "relative",
  },

  startBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  startIcon: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  startTitle: {
    color: GOLD,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },

  startText: {
    color: "#DDE3EA",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },

  startButton: {
    backgroundColor: GOLD,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 30,
  },

  startButtonText: {
    color: DARK,
    fontSize: 16,
    fontWeight: "900",
  },

  target: {
    position: "absolute",
  },

  targetGlow: {
    position: "absolute",
    inset: -12,
    borderRadius: 999,
    backgroundColor: GOLD,
  },

  targetButton: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GOLD,
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },

  targetWing: {
    position: "absolute",
    top: 6,
    color: DARK,
    opacity: 0.18,
    fontSize: 26,
    fontWeight: "900",
  },

  targetText: {
    color: DARK,
    fontSize: 38,
    fontWeight: "900",
  },

  actionRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },

  resetButton: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  resetButtonText: {
    color: DARK,
    fontSize: 16,
    fontWeight: "900",
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 22,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "900",
  },

  rulesCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.16)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
  },

  rulesTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },

  rulesText: {
    color: "#DDE3EA",
    fontSize: 13,
    lineHeight: 22,
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