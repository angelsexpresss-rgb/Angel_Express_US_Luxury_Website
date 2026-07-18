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
  Vibration,
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

import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const { width } = Dimensions.get("window");

type GameMode = "classic" | "speed" | "shield" | "god";
type TargetKind = "angel" | "bonus" | "trap" | "shield";

type GameTarget = {
  top: number;
  left: number;
  size: number;
  kind: TargetKind;
};

type Popup = {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  anim: Animated.Value;
};

type Burst = {
  id: number;
  x: number;
  y: number;
  color: string;
  progress: Animated.Value;
};

const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

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

  const [popups, setPopups] = useState<Popup[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const idRef = useRef(0);

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
  const targetSpawn = useRef(new Animated.Value(1)).current;
  const wander = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const shake = useRef(new Animated.Value(0)).current;
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

  // Game clock
  useEffect(() => {
    if (!gameActive) return;

    if (timeLeft <= 0 || lives <= 0) {
      finishGame();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);

      if (timeLeft <= 4) {
        Vibration.vibrate(20);
      }

      if (gameMode === "speed" && timeLeft % 3 === 0) {
        randomTarget(true);
      }

      if (gameMode === "god" && timeLeft % 4 === 0) {
        setScore((prev) => prev + level);
        setLastEvent(`God Mode bonus +${level}`);
        spawnPopup(boardWidth / 2 - 24, 40, `+${level}`, "#FFD700");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameActive, timeLeft, lives, gameMode, level]);

  // Level up
  useEffect(() => {
    const nextLevel = Math.max(1, Math.floor(score / 20) + 1);
    setLevel(nextLevel);
  }, [score]);

  // Target lifetime — escapes if not tapped in time
  useEffect(() => {
    if (!gameActive) return;

    const life = getTargetLife();
    const escapeTimer = setTimeout(() => {
      if (target.kind === "angel" || target.kind === "bonus") {
        setCombo(0);
        setLastEvent("Target escaped. Combo reset.");
        Vibration.vibrate(30);
        spawnPopup(target.left + target.size / 2 - 30, target.top, "Escaped", "#94A3B8");
      }
      randomTarget();
    }, life);

    return () => clearTimeout(escapeTimer);
  }, [target, gameActive]);

  // Target spawn pop + drifting movement
  useEffect(() => {
    if (!gameActive) return;

    targetSpawn.setValue(0);
    Animated.spring(targetSpawn, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();

    wander.setValue({ x: 0, y: 0 });
    const amp = Math.min(6 + level * 3, 30);
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(wander, {
          toValue: { x: rand(-amp, amp), y: rand(-amp, amp) },
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wander, {
          toValue: { x: rand(-amp, amp), y: rand(-amp, amp) },
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wander, {
          toValue: { x: 0, y: 0 },
          duration: 460,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    drift.start();

    return () => drift.stop();
  }, [target, gameActive]);

  function rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  function getTargetLife() {
    if (gameMode === "speed") return Math.max(800, 1600 - level * 90);
    if (gameMode === "god") return Math.max(850, 1900 - level * 100);
    if (gameMode === "shield") return Math.max(1200, 2800 - level * 120);
    return Math.max(1000, 2400 - level * 130);
  }

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

  function spawnPopup(x: number, y: number, text: string, color: string) {
    const id = ++idRef.current;
    const anim = new Animated.Value(0);
    setPopups((prev) => [...prev.slice(-6), { id, x, y, text, color, anim }]);

    Animated.timing(anim, {
      toValue: 1,
      duration: 750,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    });
  }

  function spawnBurst(x: number, y: number, color: string) {
    const id = ++idRef.current;
    const progress = new Animated.Value(0);
    setBursts((prev) => [...prev.slice(-3), { id, x, y, color, progress }]);

    Animated.timing(progress, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    });
  }

  function shakeBoard() {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -5, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
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
    setPopups([]);
    setBursts([]);
    Vibration.vibrate(15);
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
    Vibration.vibrate([0, 80, 60, 80]);

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
    shakeBoard();
    Vibration.vibrate(30);

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

    const cx = target.left + target.size / 2 - 26;
    const cy = target.top - 6;
    const nextCombo = combo + 1;
    const comboBonus = nextCombo >= 15 ? 4 : nextCombo >= 10 ? 3 : nextCombo >= 5 ? 2 : 1;
    const godBonus = gameMode === "god" ? 3 : 1;

    if (target.kind === "trap") {
      setCombo(0);
      shakeBoard();
      Vibration.vibrate([0, 60, 40, 60]);
      spawnBurst(target.left + target.size / 2, target.top + target.size / 2, colors.danger || "#EF4444");

      if (shieldActive) {
        setShieldActive(false);
        setLastEvent("Shield absorbed a trap.");
        spawnPopup(cx, cy, "Blocked", "#38BDF8");
      } else {
        setLives((prev) => Math.max(prev - 1, 0));
        setLastEvent("Trap hit. Lost one life.");
        spawnPopup(cx, cy, "-1 ♥", "#EF4444");
      }

      animateTargetHit();
      randomTarget();
      return;
    }

    Vibration.vibrate(8);

    if (target.kind === "shield") {
      setShieldActive(true);
      setCombo(nextCombo);
      setScore((prev) => prev + 2 * godBonus);
      setLastEvent("Shield power-up activated.");
      spawnPopup(cx, cy, `+${2 * godBonus}`, "#38BDF8");
      spawnBurst(target.left + target.size / 2, target.top + target.size / 2, "#38BDF8");
      animateTargetHit();
      handleComboMilestone(nextCombo, cx, cy);
      randomTarget();
      return;
    }

    if (target.kind === "bonus") {
      const points = (comboBonus + level + 3) * godBonus;
      setCombo(nextCombo);
      setScore((prev) => prev + points);
      setLastEvent(`Bonus target +${points}`);
      spawnPopup(cx, cy, `+${points}`, "#A855F7");
      spawnBurst(target.left + target.size / 2, target.top + target.size / 2, "#A855F7");
      animateTargetHit();
      handleComboMilestone(nextCombo, cx, cy);
      randomTarget();
      return;
    }

    const points = comboBonus * godBonus;
    setCombo(nextCombo);
    setScore((prev) => prev + points);
    setLastEvent(`Angel target +${points}`);
    spawnPopup(cx, cy, `+${points}`, "#FFD700");
    spawnBurst(target.left + target.size / 2, target.top + target.size / 2, "#FFD700");
    animateTargetHit();
    handleComboMilestone(nextCombo, cx, cy);
    randomTarget();
  }

  function handleComboMilestone(nextCombo: number, x: number, y: number) {
    if (nextCombo > 0 && nextCombo % 10 === 0) {
      setTimeLeft((prev) => prev + 2);
      spawnPopup(x, y - 26, "+2s", "#4ADE80");
      Vibration.vibrate([0, 30, 30, 30]);
    } else if (nextCombo === 15) {
      spawnPopup(x, y - 26, `${nextCombo}x!`, "#FFD700");
    } else if (nextCombo === 5) {
      spawnPopup(x, y - 26, `${nextCombo}x!`, "#FFD700");
    }
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

            <Animated.View style={{ transform: [{ translateX: shake }] }}>
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
                  <>
                    <Animated.View
                      style={[
                        styles.target,
                        {
                          top: target.top,
                          left: target.left,
                          width: target.size,
                          height: target.size,
                          transform: [
                            { translateX: wander.x },
                            { translateY: wander.y },
                            { scale: Animated.multiply(targetScale, targetSpawn) },
                            { rotate },
                          ],
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

                    {bursts.map((b) =>
                      BURST_ANGLES.map((angle, i) => {
                        const rad = (angle * Math.PI) / 180;
                        const dist = 46;
                        return (
                          <Animated.View
                            key={`${b.id}-${i}`}
                            pointerEvents="none"
                            style={[
                              styles.particle,
                              {
                                left: b.x - 5,
                                top: b.y - 5,
                                backgroundColor: b.color,
                                opacity: b.progress.interpolate({
                                  inputRange: [0, 0.7, 1],
                                  outputRange: [1, 0.8, 0],
                                }),
                                transform: [
                                  {
                                    translateX: b.progress.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0, Math.cos(rad) * dist],
                                    }),
                                  },
                                  {
                                    translateY: b.progress.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0, Math.sin(rad) * dist],
                                    }),
                                  },
                                  {
                                    scale: b.progress.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [1, 0.2],
                                    }),
                                  },
                                ],
                              },
                            ]}
                          />
                        );
                      })
                    )}

                    {popups.map((p) => (
                      <Animated.View
                        key={p.id}
                        pointerEvents="none"
                        style={[
                          styles.popup,
                          {
                            left: p.x,
                            top: p.y,
                            opacity: p.anim.interpolate({
                              inputRange: [0, 0.15, 1],
                              outputRange: [0, 1, 0],
                            }),
                            transform: [
                              {
                                translateY: p.anim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, -48],
                                }),
                              },
                              {
                                scale: p.anim.interpolate({
                                  inputRange: [0, 0.2, 1],
                                  outputRange: [0.6, 1.15, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Text style={[styles.popupText, { color: p.color }]}>{p.text}</Text>
                      </Animated.View>
                    ))}
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

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

    popup: {
      position: "absolute",
      zIndex: 50,
    },
    popupText: {
      fontSize: 22,
      fontWeight: "900",
      textShadowColor: "rgba(0,0,0,0.55)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },
    particle: {
      position: "absolute",
      width: 10,
      height: 10,
      borderRadius: 5,
      zIndex: 40,
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