import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Crown,
  Gamepad2,
  Heart,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

const { width } = Dimensions.get("window");

type GameMode = "classic" | "speed" | "shield" | "god";
type TargetKind = "angel" | "bonus" | "trap" | "shield";

type GameTarget = {
  top: number;
  left: number;
  size: number;
  kind: TargetKind;
};

export default function AngelGameScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [shieldActive, setShieldActive] = useState(false);
  const [lastEvent, setLastEvent] = useState("Choose a mode and start your ride.");

  const boardWidth = Math.min(width - 44, 390);
  const boardHeight = 440;

  const [target, setTarget] = useState<GameTarget>({
    top: 160,
    left: boardWidth / 2 - 38,
    size: 76,
    kind: "angel",
  });

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(28)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const bgScale = useRef(new Animated.Value(1)).current;
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

      if (gameMode === "speed" && timeLeft % 3 === 0) {
        randomTarget(true);
      }

      if (gameMode === "god" && timeLeft % 4 === 0) {
        setScore((prev) => prev + level);
        setLastEvent(`God Mode bonus +${level}`);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameActive, timeLeft, lives, gameMode, level]);

  useEffect(() => {
    const nextLevel = Math.max(1, Math.floor(score / 20) + 1);
    setLevel(nextLevel);
  }, [score]);

  function getModeTime(mode: GameMode) {
    if (mode === "speed") return 20;
    if (mode === "shield") return 35;
    if (mode === "god") return 60;
    return 30;
  }

  function getModeLives(mode: GameMode) {
    if (mode === "speed") return 2;
    if (mode === "shield") return 5;
    if (mode === "god") return 9;
    return 3;
  }

  function getTargetSize() {
    if (gameMode === "god") return Math.max(44, 76 - level * 3);
    if (gameMode === "speed") return Math.max(44, 64 - level * 2);
    if (combo >= 12) return 54;
    if (combo >= 6) return 64;
    return 76;
  }

  function getTargetKind(forceAngel = false): TargetKind {
    if (forceAngel) return "angel";

    const roll = Math.random();

    if (gameMode === "god") {
      if (roll < 0.1) return "trap";
      if (roll < 0.28) return "bonus";
      if (roll < 0.4) return "shield";
      return "angel";
    }

    if (level >= 4 && roll < 0.16) return "trap";
    if (roll < 0.28) return "bonus";
    if (roll < 0.36) return "shield";

    return "angel";
  }

  function randomTarget(forceSmall = false, forceAngel = false) {
    const size = forceSmall ? 50 : getTargetSize();
    const maxLeft = Math.max(20, boardWidth - size - 20);
    const maxTop = Math.max(20, boardHeight - size - 25);

    setTarget({
      size,
      left: Math.floor(Math.random() * maxLeft) + 10,
      top: Math.floor(Math.random() * maxTop) + 10,
      kind: getTargetKind(forceAngel),
    });
  }

  function startGame(mode = gameMode) {
    setGameMode(mode);
    setScore(0);
    setCombo(0);
    setLevel(1);
    setTimeLeft(getModeTime(mode));
    setLives(getModeLives(mode));
    setShieldActive(mode === "shield" || mode === "god");
    setGameOver(false);
    setGameActive(true);
    setLastEvent(
      mode === "god"
        ? "God Mode activated. Maximum power unlocked."
        : "Game started. Tap the gold Angel targets."
    );

    setTimeout(() => randomTarget(false, true), 100);
  }

  function finishGame() {
    setGameActive(false);
    setGameOver(true);

    const newBest = Math.max(score, bestScore);

    if (score > bestScore) {
      setBestScore(score);
    }

    setTimeout(() => {
      Alert.alert(
        score > bestScore ? "New Best Score!" : "Game Over",
        `Score: ${score}\nBest: ${newBest}\nLevel: ${level}`
      );
    }, 250);
  }

  function missTap() {
    if (!gameActive) return;

    setCombo(0);

    if (shieldActive) {
      setShieldActive(false);
      setLastEvent("Shield blocked the miss.");
      return;
    }

    setLives((prev) => Math.max(prev - 1, 0));
    setLastEvent("Missed tap. Combo reset.");
  }

  function tapTarget() {
    if (!gameActive) return;

    const nextCombo = combo + 1;
    const comboBonus = nextCombo >= 15 ? 4 : nextCombo >= 10 ? 3 : nextCombo >= 5 ? 2 : 1;
    const godBonus = gameMode === "god" ? 3 : 1;

    if (target.kind === "trap") {
      setCombo(0);

      if (shieldActive) {
        setShieldActive(false);
        setLastEvent("Shield absorbed a trap.");
      } else {
        setLives((prev) => Math.max(prev - 1, 0));
        setLastEvent("Trap hit. Lost one life.");
      }

      animateTargetHit();
      randomTarget();
      return;
    }

    if (target.kind === "shield") {
      setShieldActive(true);
      setCombo(nextCombo);
      setScore((prev) => prev + 2 * godBonus);
      setLastEvent("Shield power-up activated.");
      animateTargetHit();
      randomTarget();
      return;
    }

    if (target.kind === "bonus") {
      const points = (comboBonus + level + 3) * godBonus;
      setCombo(nextCombo);
      setScore((prev) => prev + points);
      setLastEvent(`Bonus target +${points}`);
      animateTargetHit();
      randomTarget();
      return;
    }

    const points = comboBonus * godBonus;
    setCombo(nextCombo);
    setScore((prev) => prev + points);
    setLastEvent(`Angel target +${points}`);
    animateTargetHit();
    randomTarget();
  }

  function animateTargetHit() {
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
  }

  function modeLabel() {
    if (gameMode === "god") return "God Mode";
    if (gameMode === "speed") return "Speed";
    if (gameMode === "shield") return "Shield";
    return "Classic";
  }

  const rotate = targetRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "12deg"],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.8],
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
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
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
                <Gamepad2 size={34} color={colors.navy} />
              </Animated.View>

              <Text style={styles.kicker}>ANGEL EXPRESS GAME</Text>
              <Text style={styles.title}>Angel Road Tap</Text>
              <Text style={styles.subtitle}>
                Tap Angel targets, dodge traps, collect shields, build combos, level up,
                and enter God Mode for maximum score power.
              </Text>
            </View>

            <View style={styles.modeSection}>
              <Text style={styles.modeTitle}>Choose Game Mode</Text>

              <View style={styles.modeGrid}>
                <ModeButton
                  active={gameMode === "classic"}
                  title="Classic"
                  subtitle="30s • 3 lives"
                  icon={<Sparkles size={20} color={gameMode === "classic" ? colors.navy : colors.gold} />}
                  onPress={() => startGame("classic")}
                  styles={styles}
                />

                <ModeButton
                  active={gameMode === "speed"}
                  title="Speed"
                  subtitle="20s • Fast"
                  icon={<Zap size={20} color={gameMode === "speed" ? colors.navy : colors.gold} />}
                  onPress={() => startGame("speed")}
                  styles={styles}
                />

                <ModeButton
                  active={gameMode === "shield"}
                  title="Shield"
                  subtitle="35s • Safe"
                  icon={<Shield size={20} color={gameMode === "shield" ? colors.navy : colors.gold} />}
                  onPress={() => startGame("shield")}
                  styles={styles}
                />

                <ModeButton
                  active={gameMode === "god"}
                  title="God"
                  subtitle="60s • x3"
                  icon={<Crown size={20} color={gameMode === "god" ? colors.navy : colors.gold} />}
                  onPress={() => startGame("god")}
                  styles={styles}
                />
              </View>
            </View>

            <View style={styles.scoreRow}>
              <ScoreCard label="Score" value={score.toString()} icon={<Trophy size={21} color={colors.gold} />} styles={styles} />
              <ScoreCard label="Best" value={bestScore.toString()} icon={<Sparkles size={21} color={colors.gold} />} styles={styles} />
            </View>

            <View style={styles.scoreRow}>
              <ScoreCard label="Time" value={`${timeLeft}s`} icon={<Zap size={21} color={colors.gold} />} styles={styles} />
              <ScoreCard label="Lives" value={"♥".repeat(lives) || "0"} icon={<Heart size={21} color={colors.gold} />} styles={styles} />
            </View>

            <View style={styles.statusPanel}>
              <View>
                <Text style={styles.statusLabel}>Mode</Text>
                <Text style={styles.statusValue}>{modeLabel()}</Text>
              </View>

              <View>
                <Text style={styles.statusLabel}>Level</Text>
                <Text style={styles.statusValue}>{level}</Text>
              </View>

              <View>
                <Text style={styles.statusLabel}>Shield</Text>
                <Text style={styles.statusValue}>{shieldActive ? "Active" : "Off"}</Text>
              </View>
            </View>

            <View style={styles.comboBar}>
              <Text style={styles.comboText}>
                Combo: <Text style={styles.comboGold}>{combo}x</Text>
              </Text>

              <Text style={styles.comboHint}>
                {combo >= 15
                  ? "God-tier combo +4"
                  : combo >= 10
                  ? "Legend bonus +3"
                  : combo >= 5
                  ? "Power bonus +2"
                  : "Build your streak"}
              </Text>

              <Text style={styles.eventText}>{lastEvent}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={1}
              style={[styles.gameBoard, { width: boardWidth, height: boardHeight }]}
              onPress={missTap}
            >
              {!gameActive ? (
                <View style={styles.startBox}>
                  <View style={styles.startIcon}>
                    {gameMode === "god" ? (
                      <Crown size={34} color={colors.navy} />
                    ) : (
                      <Gamepad2 size={34} color={colors.navy} />
                    )}
                  </View>

                  <Text style={styles.startTitle}>
                    {gameOver ? "Play Again?" : gameMode === "god" ? "Enter God Mode" : "Ready to Ride?"}
                  </Text>

                  <Text style={styles.startText}>
                    Gold targets score. Blue shields protect you. Purple bonus targets boost points.
                    Red traps cost lives.
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
                  <Animated.View
                    style={[
                      styles.targetGlow,
                      getTargetGlowStyle(target.kind, styles),
                      { opacity: glowOpacity },
                    ]}
                  />

                  <TouchableOpacity
                    style={[styles.targetButton, getTargetStyle(target.kind, styles)]}
                    onPress={(event) => {
                      event.stopPropagation();
                      tapTarget();
                    }}
                    activeOpacity={0.75}
                  >
                    {target.kind === "trap" ? (
                      <Text style={styles.targetText}>!</Text>
                    ) : target.kind === "shield" ? (
                      <Shield size={target.size * 0.46} color={colors.navy} />
                    ) : target.kind === "bonus" ? (
                      <Zap size={target.size * 0.46} color={colors.navy} />
                    ) : (
                      <>
                        <Text style={styles.targetWing}>翼</Text>
                        <Text style={styles.targetText}>A</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              )}
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.resetButton} onPress={() => startGame()} activeOpacity={0.85}>
                <RotateCcw size={18} color={colors.navy} />
                <Text style={styles.resetButtonText}>Restart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  Alert.alert(
                    "How to Play",
                    "Gold Angel targets score points.\n\nPurple bonus targets add extra points.\n\nBlue shield targets protect you from one miss or trap.\n\nRed traps remove one life unless your shield is active.\n\nGod Mode gives more time, more lives, and 3x scoring."
                  )
                }
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>How to Play</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rulesCard}>
              <Text style={styles.rulesTitle}>Professional Game Rules</Text>
              <Text style={styles.rulesText}>• Gold Angel target: score points.</Text>
              <Text style={styles.rulesText}>• Purple target: bonus score.</Text>
              <Text style={styles.rulesText}>• Blue shield: blocks one mistake.</Text>
              <Text style={styles.rulesText}>• Red trap: lose one life.</Text>
              <Text style={styles.rulesText}>• 5x combo gives +2 points per Angel hit.</Text>
              <Text style={styles.rulesText}>• 10x combo gives +3 points per Angel hit.</Text>
              <Text style={styles.rulesText}>• 15x combo gives +4 points per Angel hit.</Text>
              <Text style={styles.rulesText}>• God Mode gives 60 seconds, 9 lives, and 3x score power.</Text>
            </View>

            <Text style={styles.footer}>Angel Express • Enjoy The Ride</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

function ModeButton({
  active,
  title,
  subtitle,
  icon,
  onPress,
  styles,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
  styles: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.modeButton, active && styles.modeButtonActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon}
      <Text style={[styles.modeButtonTitle, active && styles.modeButtonTitleActive]}>
        {title}
      </Text>
      <Text style={[styles.modeButtonSub, active && styles.modeButtonSubActive]}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function ScoreCard({
  label,
  value,
  icon,
  styles,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  styles: any;
}) {
  return (
    <View style={styles.scoreCard}>
      {icon}
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

function getTargetStyle(kind: TargetKind, styles: any) {
  if (kind === "trap") return styles.trapTarget;
  if (kind === "bonus") return styles.bonusTarget;
  if (kind === "shield") return styles.shieldTarget;
  return styles.angelTarget;
}

function getTargetGlowStyle(kind: TargetKind, styles: any) {
  if (kind === "trap") return styles.trapGlow;
  if (kind === "bonus") return styles.bonusGlow;
  if (kind === "shield") return styles.shieldGlow;
  return styles.angelGlow;
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
      alignItems: "center",
    },

    topRow: {
      width: "100%",
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
      width: "100%",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 30,
      padding: 24,
      marginBottom: 20,
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

    modeSection: {
      width: "100%",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 24,
      padding: 16,
      marginBottom: 16,
      ...v5Shadow(c),
    },
    modeTitle: {
      color: c.text,
      fontSize: 19,
      fontWeight: "900",
      marginBottom: 12,
    },
    modeGrid: {
      flexDirection: "row",
      gap: 8,
    },
    modeButton: {
      flex: 1,
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 18,
      padding: 10,
      alignItems: "center",
      minHeight: 92,
      justifyContent: "center",
    },
    modeButtonActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    modeButtonTitle: {
      color: c.text,
      fontWeight: "900",
      marginTop: 6,
      fontSize: 12,
    },
    modeButtonTitleActive: {
      color: c.navy,
    },
    modeButtonSub: {
      color: c.text2,
      fontWeight: "700",
      fontSize: 9,
      marginTop: 3,
      textAlign: "center",
    },
    modeButtonSubActive: {
      color: c.navy,
    },

    scoreRow: {
      width: "100%",
      flexDirection: "row",
      gap: 14,
      marginBottom: 14,
    },
    scoreCard: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 22,
      padding: 16,
      alignItems: "center",
      ...v5Shadow(c),
    },
    scoreLabel: {
      color: c.text2,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 6,
    },
    scoreValue: {
      color: c.gold,
      fontSize: 25,
      fontWeight: "900",
      marginTop: 4,
    },

    statusPanel: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 22,
      padding: 15,
      marginBottom: 14,
      ...v5Shadow(c),
    },
    statusLabel: {
      color: c.text2,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    statusValue: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },

    comboBar: {
      width: "100%",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 22,
      padding: 14,
      marginBottom: 16,
    },
    comboText: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
    },
    comboGold: {
      color: c.gold,
    },
    comboHint: {
      color: c.text2,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 4,
    },
    eventText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      marginTop: 8,
    },

    gameBoard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 28,
      marginBottom: 18,
      overflow: "hidden",
      position: "relative",
      ...v5Shadow(c),
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
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    startTitle: {
      color: c.gold,
      fontSize: 28,
      fontWeight: "900",
      marginBottom: 10,
      textAlign: "center",
    },
    startText: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 24,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 20,
    },
    startButton: {
      backgroundColor: c.gold,
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 30,
    },
    startButtonText: {
      color: c.navy,
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
    },
    angelGlow: {
      backgroundColor: c.gold,
    },
    bonusGlow: {
      backgroundColor: "#A855F7",
    },
    trapGlow: {
      backgroundColor: c.danger,
    },
    shieldGlow: {
      backgroundColor: "#38BDF8",
    },

    targetButton: {
      flex: 1,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      shadowOpacity: 0.8,
      shadowRadius: 18,
      elevation: 8,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.85)",
    },
    angelTarget: {
      backgroundColor: c.gold,
      shadowColor: c.gold,
    },
    bonusTarget: {
      backgroundColor: "#A855F7",
      shadowColor: "#A855F7",
    },
    trapTarget: {
      backgroundColor: c.danger,
      shadowColor: c.danger,
    },
    shieldTarget: {
      backgroundColor: "#38BDF8",
      shadowColor: "#38BDF8",
    },
    targetWing: {
      position: "absolute",
      top: 6,
      color: c.navy,
      opacity: 0.18,
      fontSize: 26,
      fontWeight: "900",
    },
    targetText: {
      color: c.navy,
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
      backgroundColor: c.gold,
      borderRadius: 20,
      padding: 16,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      ...v5Shadow(c),
    },
    resetButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      color: c.gold,
      fontSize: 16,
      fontWeight: "900",
    },

    rulesCard: {
      width: "100%",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 22,
      padding: 18,
      marginBottom: 20,
      ...v5Shadow(c),
    },
    rulesTitle: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 10,
    },
    rulesText: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 22,
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