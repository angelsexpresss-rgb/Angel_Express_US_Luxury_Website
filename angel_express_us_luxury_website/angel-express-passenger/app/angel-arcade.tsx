import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { Accelerometer } from "expo-sensors";
import {
  ArrowLeft,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gamepad2,
  Home,
  MoveHorizontal,
  RotateCcw,
  Rocket,
  Shield,
  Sparkles,
  Target,
  Zap,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const { width } = Dimensions.get("window");
const BOARD_WIDTH = Math.min(width - 44, 390);
const BOARD_HEIGHT = 440;

/**
 * TILT CONTROLS
 * Requires: npx expo install expo-sensors
 * If left/right feels inverted on your device, flip TILT_SIGN to 1.
 */
const TILT_SIGN = -1;
const SHIP_TILT_SPEED = 16; // spaceship tilt sensitivity
const LANE_TILT_THRESHOLD = 0.16; // how far to tilt before the car changes lane
const LANE_TILT_COOLDOWN = 260; // ms between tilt lane-changes

type GameScreen = "hub" | "tap" | "space" | "drive";
type TapMode = "classic" | "speed" | "shield" | "god";
type TapTargetKind = "angel" | "bonus" | "trap" | "shield";

type FallingObject = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  kind: "asteroid" | "alien" | "crystal" | "fuel" | "bomb";
  health: number;
};

type Laser = {
  id: number;
  x: number;
  y: number;
};

type RoadObject = {
  id: number;
  lane: number;
  y: number;
  speed: number;
  kind: "car" | "truck" | "cone" | "coin" | "fuel" | "shield";
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function AngelArcadeScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [screen, setScreen] = useState<GameScreen>("hub");
  const [bestTap, setBestTap] = useState(0);
  const [bestSpace, setBestSpace] = useState(0);
  const [bestDrive, setBestDrive] = useState(0);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(24)).current;
  const bgScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();

    const bgLoop = Animated.loop(
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

    bgLoop.start();
    return () => bgLoop.stop();
  }, []);

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
            { opacity: fade, transform: [{ translateY: rise }] },
          ]}
        >
          {screen === "hub" ? (
            <ArcadeHub
              colors={colors}
              styles={styles}
              themeMode={themeMode}
              toggleTheme={toggleTheme}
              onBack={() => router.back()}
              onSelect={setScreen}
              bestTap={bestTap}
              bestSpace={bestSpace}
              bestDrive={bestDrive}
            />
          ) : screen === "tap" ? (
            <AngelRoadTap
              colors={colors}
              styles={styles}
              bestScore={bestTap}
              setBestScore={setBestTap}
              onExit={() => setScreen("hub")}
            />
          ) : screen === "space" ? (
            <GalaxyDefender
              colors={colors}
              styles={styles}
              bestScore={bestSpace}
              setBestScore={setBestSpace}
              onExit={() => setScreen("hub")}
            />
          ) : (
            <AngelHighwayRun
              colors={colors}
              styles={styles}
              bestScore={bestDrive}
              setBestScore={setBestDrive}
              onExit={() => setScreen("hub")}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

function ArcadeHub({
  colors,
  styles,
  themeMode,
  toggleTheme,
  onBack,
  onSelect,
  bestTap,
  bestSpace,
  bestDrive,
}: {
  colors: any;
  styles: any;
  themeMode: string;
  toggleTheme: () => void;
  onBack: () => void;
  onSelect: (screen: GameScreen) => void;
  bestTap: number;
  bestSpace: number;
  bestDrive: number;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
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
        <View style={styles.heroIcon}>
          <Gamepad2 size={35} color={colors.navy} />
        </View>
        <Text style={styles.kicker}>ANGEL EXPRESS ENTERTAINMENT</Text>
        <Text style={styles.title}>Angel Arcade</Text>
        <Text style={styles.subtitle}>
          Three polished games with tilt controls, auto-firing lasers, and God
          Mode: precision tapping, space combat, and highway driving.
        </Text>
      </View>

      <GameCard
        number="01"
        title="Angel Road Tap"
        description="Tap gold Angel targets, dodge traps, collect shields, and build powerful combos."
        badge="Reaction Game"
        best={bestTap}
        icon={<Target size={29} color={colors.navy} />}
        onPress={() => onSelect("tap")}
        styles={styles}
        colors={colors}
      />

      <GameCard
        number="02"
        title="Galaxy Defender"
        description="Tilt your phone to steer the Angel spacecraft. Lasers fire automatically — destroy threats and collect power cells."
        badge="Space Shooter"
        best={bestSpace}
        icon={<Rocket size={29} color={colors.navy} />}
        onPress={() => onSelect("space")}
        styles={styles}
        colors={colors}
      />

      <GameCard
        number="03"
        title="Angel Highway Run"
        description="Tilt to change lanes, avoid traffic, collect fares and fuel, and survive an increasingly fast highway."
        badge="Driving Arcade"
        best={bestDrive}
        icon={<CarFront size={29} color={colors.navy} />}
        onPress={() => onSelect("drive")}
        styles={styles}
        colors={colors}
      />

      <View style={styles.arcadeInfo}>
        <Text style={styles.arcadeInfoTitle}>One Arcade. Three Experiences.</Text>
        <Text style={styles.arcadeInfoText}>
          Each game has its own score, difficulty progression, tilt or button
          controls, God Mode, and best-score tracking for the current session.
        </Text>
      </View>

      <Text style={styles.footer}>Angel Express • Enjoy The Ride</Text>
    </ScrollView>
  );
}

function GameCard({
  number,
  title,
  description,
  badge,
  best,
  icon,
  onPress,
  styles,
  colors,
}: {
  number: string;
  title: string;
  description: string;
  badge: string;
  best: number;
  icon: React.ReactNode;
  onPress: () => void;
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.gameCard}>
      <View style={styles.gameCardTop}>
        <View style={styles.gameCardIcon}>{icon}</View>

        <View style={styles.gameCardCopy}>
          <Text style={styles.gameNumber}>GAME {number}</Text>
          <Text style={styles.gameCardTitle}>{title}</Text>
          <Text style={styles.gameCardText}>{description}</Text>
        </View>
      </View>

      <View style={styles.gameMetaRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
        <Text style={styles.bestText}>Best: {best}</Text>
      </View>

      <TouchableOpacity style={styles.playButton} onPress={onPress}>
        <Text style={styles.playButtonText}>Play Now</Text>
        <ChevronRight size={19} color={colors.navy} />
      </TouchableOpacity>
    </View>
  );
}

function GameHeader({
  title,
  subtitle,
  icon,
  onExit,
  styles,
  colors,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onExit: () => void;
  styles: any;
  colors: any;
}) {
  return (
    <>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onExit}>
          <Home size={18} color={colors.gold} />
          <Text style={styles.backText}>Arcade</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.compactHero}>
        <View style={styles.compactHeroIcon}>{icon}</View>
        <View style={styles.compactHeroCopy}>
          <Text style={styles.compactKicker}>ANGEL ARCADE</Text>
          <Text style={styles.compactTitle}>{title}</Text>
          <Text style={styles.compactSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </>
  );
}

function ControlToggles({
  tilt,
  setTilt,
  god,
  toggleGod,
  styles,
  colors,
}: {
  tilt: boolean;
  setTilt: (v: boolean) => void;
  god: boolean;
  toggleGod: () => void;
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.toggleRow}>
      <TouchableOpacity
        style={[styles.toggleBtn, tilt && styles.toggleBtnActive]}
        onPress={() => setTilt(!tilt)}
      >
        <MoveHorizontal size={16} color={tilt ? colors.navy : colors.gold} />
        <Text style={[styles.toggleText, tilt && styles.toggleTextActive]}>
          Tilt {tilt ? "On" : "Off"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toggleBtn, god && styles.godBtnActive]}
        onPress={toggleGod}
      >
        <Crown size={16} color={god ? "#1F1300" : colors.gold} />
        <Text style={[styles.toggleText, god && styles.godTextActive]}>
          {god ? "GOD MODE ON" : "God Mode"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* GAME 1 — ANGEL ROAD TAP                                                    */
/* -------------------------------------------------------------------------- */

function AngelRoadTap({
  colors,
  styles,
  bestScore,
  setBestScore,
  onExit,
}: {
  colors: any;
  styles: any;
  bestScore: number;
  setBestScore: (value: number) => void;
  onExit: () => void;
}) {
  const [mode, setMode] = useState<TapMode>("classic");
  const [active, setActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [shield, setShield] = useState(false);
  const [target, setTarget] = useState({
    x: BOARD_WIDTH / 2 - 35,
    y: 150,
    size: 70,
    kind: "angel" as TapTargetKind,
  });

  const scoreRef = useRef(0);

  function modeTime(m: TapMode) {
    return m === "speed" ? 20 : m === "shield" ? 35 : m === "god" ? 60 : 30;
  }

  function modeLives(m: TapMode) {
    return m === "speed" ? 2 : m === "shield" ? 5 : m === "god" ? 9 : 3;
  }

  function spawnTarget(forceAngel = false, m: TapMode = mode) {
    const roll = Math.random();
    const kind: TapTargetKind = forceAngel
      ? "angel"
      : roll < 0.12
      ? "trap"
      : roll < 0.26
      ? "bonus"
      : roll < 0.36
      ? "shield"
      : "angel";

    const size = m === "speed" ? 54 : m === "god" ? 58 : 68;

    setTarget({
      x: Math.floor(Math.random() * (BOARD_WIDTH - size - 20)) + 10,
      y: Math.floor(Math.random() * (BOARD_HEIGHT - size - 20)) + 10,
      size,
      kind,
    });
  }

  function start(selectedMode = mode) {
    setMode(selectedMode);
    setScore(0);
    scoreRef.current = 0;
    setCombo(0);
    setTime(modeTime(selectedMode));
    setLives(modeLives(selectedMode));
    setShield(selectedMode === "shield" || selectedMode === "god");
    setGameOver(false);
    setActive(true);
    setTimeout(() => spawnTarget(true, selectedMode), 50);
  }

  function finish() {
    setActive(false);
    setGameOver(true);
    if (scoreRef.current > bestScore) setBestScore(scoreRef.current);
    Vibration.vibrate([0, 80, 60, 80]);
  }

  useEffect(() => {
    if (!active) return;
    if (time <= 0 || lives <= 0) {
      finish();
      return;
    }
    const timer = setTimeout(() => setTime((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [active, time, lives]);

  useEffect(() => {
    if (!active) return;
    const lifetime =
      mode === "speed" ? 900 : mode === "god" ? 1100 : mode === "shield" ? 2100 : 1700;
    const timer = setTimeout(() => {
      setCombo(0);
      spawnTarget();
    }, lifetime);
    return () => clearTimeout(timer);
  }, [active, target]);

  function addScore(points: number) {
    scoreRef.current += points;
    setScore(scoreRef.current);
  }

  function tapTarget() {
    if (!active) return;

    if (target.kind === "trap") {
      setCombo(0);
      if (mode === "god") {
        // God mode: traps can't hurt you — they pay out instead.
        addScore(5);
      } else if (shield) {
        setShield(false);
      } else {
        setLives((v) => Math.max(0, v - 1));
      }
      Vibration.vibrate(40);
      spawnTarget();
      return;
    }

    if (target.kind === "shield") {
      setShield(true);
      addScore(2);
    } else {
      const nextCombo = combo + 1;
      const multiplier =
        mode === "god" ? 3 : nextCombo >= 10 ? 3 : nextCombo >= 5 ? 2 : 1;
      const base = target.kind === "bonus" ? 4 : 1;
      setCombo(nextCombo);
      addScore(base * multiplier);
    }

    Vibration.vibrate(8);
    spawnTarget();
  }

  function miss() {
    if (!active) return;
    setCombo(0);
    if (mode === "god") return; // God mode: empty taps are forgiven
    if (shield) setShield(false);
    else setLives((v) => Math.max(0, v - 1));
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <GameHeader
        title="Angel Road Tap"
        subtitle="Reaction, timing, combos, shields, and four difficulty modes."
        icon={<Target size={29} color={colors.navy} />}
        onExit={onExit}
        styles={styles}
        colors={colors}
      />

      <View style={styles.modeGrid}>
        {(["classic", "speed", "shield", "god"] as TapMode[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.modeButton, mode === item && styles.modeButtonActive]}
            onPress={() => start(item)}
          >
            {item === "god" ? (
              <Crown size={18} color={mode === item ? colors.navy : colors.gold} />
            ) : item === "shield" ? (
              <Shield size={18} color={mode === item ? colors.navy : colors.gold} />
            ) : item === "speed" ? (
              <Zap size={18} color={mode === item ? colors.navy : colors.gold} />
            ) : (
              <Sparkles size={18} color={mode === item ? colors.navy : colors.gold} />
            )}
            <Text style={[styles.modeButtonTitle, mode === item && styles.modeButtonTitleActive]}>
              {item[0].toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <GameStats
        items={[
          ["Score", score],
          ["Best", bestScore],
          ["Time", `${time}s`],
          ["Lives", mode === "god" ? "∞" : lives],
        ]}
        styles={styles}
      />

      <View style={styles.statusStrip}>
        <Text style={styles.statusText}>Combo: {combo}x</Text>
        <Text style={styles.statusText}>
          {mode === "god" ? "👑 GOD MODE" : `Shield: ${shield ? "Active" : "Off"}`}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={1}
        onPress={miss}
        style={[styles.gameBoard, { width: BOARD_WIDTH, height: BOARD_HEIGHT }]}
      >
        {!active ? (
          <StartOverlay
            title={gameOver ? "Play Again?" : "Ready to Tap?"}
            text="Gold scores. Purple gives bonus points. Blue activates a shield. Red costs a life. God mode: invincible, 3x scoring, 60 seconds."
            button={gameOver ? "Restart Game" : "Start Game"}
            icon={<Target size={35} color={colors.navy} />}
            onPress={() => start()}
            styles={styles}
          />
        ) : (
          <TouchableOpacity
            onPress={(event) => {
              event.stopPropagation();
              tapTarget();
            }}
            style={[
              styles.tapTarget,
              {
                left: target.x,
                top: target.y,
                width: target.size,
                height: target.size,
                backgroundColor:
                  target.kind === "trap"
                    ? "#EF4444"
                    : target.kind === "bonus"
                    ? "#A855F7"
                    : target.kind === "shield"
                    ? "#38BDF8"
                    : colors.gold,
              },
            ]}
          >
            {target.kind === "trap" ? (
              <Text style={styles.targetSymbol}>!</Text>
            ) : target.kind === "bonus" ? (
              <Zap size={target.size * 0.45} color={colors.navy} />
            ) : target.kind === "shield" ? (
              <Shield size={target.size * 0.45} color={colors.navy} />
            ) : (
              <Text style={styles.targetSymbol}>A</Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <GameActions
        onRestart={() => start()}
        onHelp={() =>
          Alert.alert(
            "Angel Road Tap",
            "Tap gold and purple targets. Blue targets activate a shield. Avoid red traps and empty taps. God mode makes you invincible with 3x scoring."
          )
        }
        styles={styles}
        colors={colors}
      />
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/* GAME 2 — GALAXY DEFENDER                                                   */
/* Tilt your phone to steer. Lasers auto-fire. God Mode = invincible +        */
/* rapid triple-shot.                                                         */
/* -------------------------------------------------------------------------- */

const SHIP_WIDTH = 52;
const SHIP_TOP = BOARD_HEIGHT - 72; // ship occupies bottom 12..72

function GalaxyDefender({
  colors,
  styles,
  bestScore,
  setBestScore,
  onExit,
}: {
  colors: any;
  styles: any;
  bestScore: number;
  setBestScore: (value: number) => void;
  onExit: () => void;
}) {
  const [active, setActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [tilt, setTilt] = useState(true);
  const [god, setGod] = useState(false);
  const [shipX, setShipX] = useState(BOARD_WIDTH / 2 - 26);
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(5);
  const [level, setLevel] = useState(1);
  const [shield, setShield] = useState(false);

  // Refs are the source of truth inside the game loop (no stale closures).
  const shipXRef = useRef(BOARD_WIDTH / 2 - 26);
  const objectsRef = useRef<FallingObject[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const scoreRef = useRef(0);
  const healthRef = useRef(5);
  const shieldRef = useRef(false);
  const godRef = useRef(false);
  const tiltXRef = useRef(0);
  const idRef = useRef(0);
  const lastShotRef = useRef(0);
  const lastSpawnRef = useRef(0);

  function start() {
    shipXRef.current = BOARD_WIDTH / 2 - 26;
    objectsRef.current = [];
    lasersRef.current = [];
    scoreRef.current = 0;
    healthRef.current = 5;
    shieldRef.current = false;
    lastShotRef.current = 0;
    lastSpawnRef.current = 0;
    setShipX(shipXRef.current);
    setObjects([]);
    setLasers([]);
    setScore(0);
    setHealth(5);
    setLevel(1);
    setShield(false);
    setGameOver(false);
    setActive(true);
  }

  function finish() {
    setActive(false);
    setGameOver(true);
    if (scoreRef.current > bestScore) setBestScore(scoreRef.current);
    Vibration.vibrate([0, 80, 50, 100]);
  }

  function toggleGod() {
    godRef.current = !godRef.current;
    setGod(godRef.current);
    if (godRef.current) {
      healthRef.current = 5;
      setHealth(5);
      Vibration.vibrate([0, 30, 30, 30, 30, 60]);
    }
  }

  // Tilt: phone movement steers the spaceship.
  useEffect(() => {
    if (!active || !tilt) {
      tiltXRef.current = 0;
      return;
    }
    Accelerometer.setUpdateInterval(40);
    const sub = Accelerometer.addListener(({ x }) => {
      tiltXRef.current = x;
    });
    return () => sub.remove();
  }, [active, tilt]);

  // Single game loop — movement, auto-fire, spawning, physics, collisions.
  useEffect(() => {
    if (!active) return;

    const loop = setInterval(() => {
      const now = Date.now();
      const lvl = Math.max(1, Math.floor(scoreRef.current / 150) + 1);

      // 1) Tilt steering (dead zone so the ship doesn't drift when flat)
      const tiltDelta = tiltXRef.current * TILT_SIGN * SHIP_TILT_SPEED;
      if (Math.abs(tiltDelta) > 0.6) {
        shipXRef.current = clamp(
          shipXRef.current + tiltDelta,
          5,
          BOARD_WIDTH - SHIP_WIDTH - 5
        );
      }

      // 2) Auto-fire lasers (God Mode: rapid triple-shot)
      const fireRate = godRef.current ? 150 : 380;
      if (now - lastShotRef.current >= fireRate) {
        lastShotRef.current = now;
        const cx = shipXRef.current + SHIP_WIDTH / 2 - 2;
        const shots = godRef.current ? [-15, 0, 15] : [0];
        for (const offset of shots) {
          lasersRef.current.push({
            id: ++idRef.current,
            x: clamp(cx + offset, 4, BOARD_WIDTH - 8),
            y: BOARD_HEIGHT - 82,
          });
        }
      }

      // 3) Spawn falling objects
      const spawnEvery = Math.max(300, 850 - lvl * 55);
      if (now - lastSpawnRef.current >= spawnEvery) {
        lastSpawnRef.current = now;
        const roll = Math.random();
        const kind: FallingObject["kind"] =
          roll < 0.5
            ? "asteroid"
            : roll < 0.7
            ? "alien"
            : roll < 0.8
            ? "crystal"
            : roll < 0.9
            ? "fuel"
            : "bomb";
        const size = kind === "asteroid" ? 34 : kind === "alien" ? 38 : 30;
        objectsRef.current = [
          ...objectsRef.current.slice(-18),
          {
            id: ++idRef.current,
            x: Math.random() * (BOARD_WIDTH - size - 10) + 5,
            y: -size,
            size,
            speed: 3 + lvl * 0.55 + Math.random() * 1.8,
            kind,
            health: kind === "asteroid" ? 2 : 1,
          },
        ];
      }

      // 4) Move lasers
      lasersRef.current = lasersRef.current
        .map((laser) => ({ ...laser, y: laser.y - 14 }))
        .filter((laser) => laser.y > -24);

      // 5) Move objects + ship collisions + escapes
      let damage = 0;
      const survivors: FallingObject[] = [];

      for (const object of objectsRef.current) {
        const moved = { ...object, y: object.y + object.speed };

        const hitsShip =
          moved.y + moved.size >= SHIP_TOP &&
          moved.y <= BOARD_HEIGHT - 10 &&
          moved.x + moved.size >= shipXRef.current &&
          moved.x <= shipXRef.current + SHIP_WIDTH;

        if (hitsShip) {
          if (moved.kind === "crystal") {
            scoreRef.current += 50;
          } else if (moved.kind === "fuel") {
            healthRef.current = Math.min(5, healthRef.current + 1);
          } else if (godRef.current) {
            scoreRef.current += 5; // God Mode: threats vaporize on contact
          } else if (shieldRef.current) {
            shieldRef.current = false;
          } else {
            damage += moved.kind === "bomb" ? 2 : 1;
          }
          continue;
        }

        if (moved.y > BOARD_HEIGHT + 20) {
          if (
            !godRef.current &&
            (moved.kind === "asteroid" || moved.kind === "alien")
          ) {
            damage += 1;
          }
          continue;
        }

        survivors.push(moved);
      }

      // 6) Laser vs object collisions
      let remainingObjects = survivors;
      const remainingLasers: Laser[] = [];

      for (const laser of lasersRef.current) {
        const hitIndex = remainingObjects.findIndex(
          (object) =>
            laser.x >= object.x - 3 &&
            laser.x <= object.x + object.size + 3 &&
            laser.y <= object.y + object.size &&
            laser.y + 18 >= object.y
        );

        if (hitIndex < 0) {
          remainingLasers.push(laser);
          continue;
        }

        const hit = remainingObjects[hitIndex];

        if (hit.kind === "crystal") {
          scoreRef.current += 50;
        } else if (hit.kind === "fuel") {
          healthRef.current = Math.min(5, healthRef.current + 1);
        } else if (hit.kind === "bomb") {
          scoreRef.current += 5;
        } else if (hit.health > 1 && !godRef.current) {
          // Asteroid takes 2 hits (God Mode lasers one-shot everything)
          remainingObjects = [...remainingObjects];
          remainingObjects[hitIndex] = { ...hit, health: hit.health - 1 };
          scoreRef.current += 5;
          continue; // laser consumed
        } else {
          scoreRef.current += hit.kind === "alien" ? 25 : 10;
        }

        remainingObjects = remainingObjects.filter((_, i) => i !== hitIndex);
      }

      objectsRef.current = remainingObjects;
      lasersRef.current = remainingLasers;

      if (damage > 0) {
        healthRef.current = Math.max(0, healthRef.current - damage);
        Vibration.vibrate(30);
      }

      // 7) Commit to state for rendering
      setShipX(shipXRef.current);
      setObjects(objectsRef.current);
      setLasers([...lasersRef.current]);
      setScore(scoreRef.current);
      setHealth(healthRef.current);
      setLevel(lvl);
      setShield(shieldRef.current);

      if (healthRef.current <= 0) finish();
    }, 33);

    return () => clearInterval(loop);
  }, [active]);

  function move(direction: -1 | 1) {
    if (!active) return;
    shipXRef.current = clamp(
      shipXRef.current + direction * 34,
      5,
      BOARD_WIDTH - SHIP_WIDTH - 5
    );
    setShipX(shipXRef.current);
  }

  function fire() {
    if (!active) return;
    // Manual burst on top of auto-fire
    const cx = shipXRef.current + SHIP_WIDTH / 2 - 2;
    for (const offset of [-15, 0, 15]) {
      lasersRef.current.push({
        id: ++idRef.current,
        x: clamp(cx + offset, 4, BOARD_WIDTH - 8),
        y: BOARD_HEIGHT - 82,
      });
    }
    setLasers([...lasersRef.current]);
    Vibration.vibrate(6);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <GameHeader
        title="Galaxy Defender"
        subtitle="Tilt your phone to steer. Lasers fire automatically — destroy every threat."
        icon={<Rocket size={29} color={colors.navy} />}
        onExit={onExit}
        styles={styles}
        colors={colors}
      />

      <ControlToggles
        tilt={tilt}
        setTilt={setTilt}
        god={god}
        toggleGod={toggleGod}
        styles={styles}
        colors={colors}
      />

      <GameStats
        items={[
          ["Score", score],
          ["Best", bestScore],
          ["Level", level],
          ["Health", god ? "∞" : health],
        ]}
        styles={styles}
      />

      <View style={styles.statusStrip}>
        <Text style={styles.statusText}>
          Weapon: {god ? "Triple Laser" : "Auto Laser"}
        </Text>
        <Text style={styles.statusText}>
          {god ? "👑 GOD MODE" : `Shield: ${shield ? "Active" : "Off"}`}
        </Text>
      </View>

      <View style={[styles.spaceBoard, { width: BOARD_WIDTH, height: BOARD_HEIGHT }]}>
        <View style={styles.starLayer}>
          {Array.from({ length: 28 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.star,
                {
                  left: (i * 47) % BOARD_WIDTH,
                  top: (i * 83) % BOARD_HEIGHT,
                  opacity: 0.3 + ((i % 5) * 0.12),
                },
              ]}
            />
          ))}
        </View>

        {!active ? (
          <StartOverlay
            title={gameOver ? "Mission Failed" : "Defend The Galaxy"}
            text="Tilt your phone left and right to steer. Lasers fire automatically. Collect crystals and fuel. God Mode: invincible with rapid triple-shot."
            button={gameOver ? "Retry Mission" : "Launch Ship"}
            icon={<Rocket size={35} color={colors.navy} />}
            onPress={start}
            styles={styles}
          />
        ) : (
          <>
            {objects.map((object) => (
              <View
                key={object.id}
                style={[
                  styles.spaceObject,
                  {
                    left: object.x,
                    top: object.y,
                    width: object.size,
                    height: object.size,
                  },
                ]}
              >
                <Text style={{ fontSize: object.size * 0.72 }}>
                  {object.kind === "asteroid"
                    ? "☄️"
                    : object.kind === "alien"
                    ? "👾"
                    : object.kind === "crystal"
                    ? "💎"
                    : object.kind === "fuel"
                    ? "🔋"
                    : "💣"}
                </Text>
              </View>
            ))}

            {lasers.map((laser) => (
              <View
                key={laser.id}
                style={[
                  styles.laser,
                  god && styles.laserGod,
                  { left: laser.x, top: laser.y },
                ]}
              />
            ))}

            <View style={[styles.ship, { left: shipX }]}>
              {(shield || god) && <View style={styles.shieldRing} />}
              <Text style={styles.shipEmoji}>🚀</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.controlRow}>
        <TouchableOpacity style={styles.controlButton} onPress={() => move(-1)}>
          <ChevronLeft size={28} color={colors.navy} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.fireButton} onPress={fire}>
          <Zap size={22} color={colors.navy} />
          <Text style={styles.fireText}>BURST</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={() => move(1)}>
          <ChevronRight size={28} color={colors.navy} />
        </TouchableOpacity>
      </View>

      <GameActions
        onRestart={start}
        onHelp={() =>
          Alert.alert(
            "Galaxy Defender",
            "Tilt your phone to steer the ship (or use the arrow buttons). Lasers fire automatically; tap BURST for extra shots. Crystals award bonus points, fuel restores health. God Mode makes you invincible with rapid triple-shot lasers."
          )
        }
        styles={styles}
        colors={colors}
      />
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/* GAME 3 — ANGEL HIGHWAY RUN                                                 */
/* Tilt your phone to change lanes. God Mode = invincible + infinite fuel.    */
/* -------------------------------------------------------------------------- */

function AngelHighwayRun({
  colors,
  styles,
  bestScore,
  setBestScore,
  onExit,
}: {
  colors: any;
  styles: any;
  bestScore: number;
  setBestScore: (value: number) => void;
  onExit: () => void;
}) {
  const [active, setActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [tilt, setTilt] = useState(true);
  const [god, setGod] = useState(false);
  const [lane, setLane] = useState(1);
  const [objects, setObjects] = useState<RoadObject[]>([]);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [lives, setLives] = useState(3);
  const [shield, setShield] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(1);

  const laneRef = useRef(1);
  const objectsRef = useRef<RoadObject[]>([]);
  const scoreRef = useRef(0);
  const distanceRef = useRef(0);
  const fuelRef = useRef(100);
  const livesRef = useRef(3);
  const shieldRef = useRef(false);
  const godRef = useRef(false);
  const tiltXRef = useRef(0);
  const lastLaneChangeRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const idRef = useRef(0);

  const laneWidth = BOARD_WIDTH / 3;

  function start() {
    laneRef.current = 1;
    objectsRef.current = [];
    scoreRef.current = 0;
    distanceRef.current = 0;
    fuelRef.current = 100;
    livesRef.current = 3;
    shieldRef.current = false;
    lastLaneChangeRef.current = 0;
    lastSpawnRef.current = 0;
    setLane(1);
    setObjects([]);
    setScore(0);
    setDistance(0);
    setFuel(100);
    setLives(3);
    setShield(false);
    setSpeedLevel(1);
    setGameOver(false);
    setActive(true);
  }

  function finish() {
    setActive(false);
    setGameOver(true);
    if (scoreRef.current > bestScore) setBestScore(scoreRef.current);
    Vibration.vibrate([0, 80, 60, 100]);
  }

  function toggleGod() {
    godRef.current = !godRef.current;
    setGod(godRef.current);
    if (godRef.current) {
      fuelRef.current = 100;
      livesRef.current = Math.max(livesRef.current, 3);
      setFuel(100);
      setLives(livesRef.current);
      Vibration.vibrate([0, 30, 30, 30, 30, 60]);
    }
  }

  // Tilt: phone movement steers the car between lanes.
  useEffect(() => {
    if (!active || !tilt) {
      tiltXRef.current = 0;
      return;
    }
    Accelerometer.setUpdateInterval(40);
    const sub = Accelerometer.addListener(({ x }) => {
      tiltXRef.current = x;
    });
    return () => sub.remove();
  }, [active, tilt]);

  function shiftLane(direction: -1 | 1) {
    const next = clamp(laneRef.current + direction, 0, 2);
    if (next !== laneRef.current) {
      laneRef.current = next;
      setLane(next);
      Vibration.vibrate(6);
    }
  }

  // Single game loop — tilt steering, spawning, physics, collisions.
  useEffect(() => {
    if (!active) return;

    const loop = setInterval(() => {
      const now = Date.now();
      const lvl = Math.max(1, Math.floor(distanceRef.current / 500) + 1);

      // 1) Tilt lane changes (threshold + cooldown so it feels deliberate)
      const tiltValue = tiltXRef.current * TILT_SIGN;
      if (
        Math.abs(tiltValue) > LANE_TILT_THRESHOLD &&
        now - lastLaneChangeRef.current > LANE_TILT_COOLDOWN
      ) {
        lastLaneChangeRef.current = now;
        shiftLane(tiltValue > 0 ? 1 : -1);
      }

      // 2) Distance + fuel (God Mode never runs dry)
      distanceRef.current += lvl * 2;
      if (!godRef.current) {
        fuelRef.current = Math.max(
          0,
          fuelRef.current - 0.28 - lvl * 0.015
        );
      }

      // 3) Spawn road objects
      const spawnEvery = Math.max(350, 920 - lvl * 65);
      if (now - lastSpawnRef.current >= spawnEvery) {
        lastSpawnRef.current = now;
        const roll = Math.random();
        const kind: RoadObject["kind"] =
          roll < 0.35
            ? "car"
            : roll < 0.53
            ? "truck"
            : roll < 0.67
            ? "cone"
            : roll < 0.82
            ? "coin"
            : roll < 0.93
            ? "fuel"
            : "shield";

        objectsRef.current = [
          ...objectsRef.current.slice(-16),
          {
            id: ++idRef.current,
            lane: Math.floor(Math.random() * 3),
            y: -70,
            speed: 4 + lvl * 0.7 + Math.random() * 1.5,
            kind,
          },
        ];
      }

      // 4) Move objects + collisions
      const survivors: RoadObject[] = [];

      for (const object of objectsRef.current) {
        const moved = { ...object, y: object.y + object.speed };
        const collision =
          moved.lane === laneRef.current &&
          moved.y > BOARD_HEIGHT - 125 &&
          moved.y < BOARD_HEIGHT - 38;

        if (collision) {
          if (moved.kind === "coin") {
            scoreRef.current += 25;
          } else if (moved.kind === "fuel") {
            fuelRef.current = Math.min(100, fuelRef.current + 32);
          } else if (moved.kind === "shield") {
            shieldRef.current = true;
          } else if (godRef.current) {
            scoreRef.current += 10; // God Mode: smash through traffic for points
          } else if (shieldRef.current) {
            shieldRef.current = false;
          } else {
            livesRef.current = Math.max(0, livesRef.current - 1);
            Vibration.vibrate(45);
          }
          continue;
        }

        if (moved.y > BOARD_HEIGHT + 70) {
          if (
            moved.kind === "car" ||
            moved.kind === "truck" ||
            moved.kind === "cone"
          ) {
            scoreRef.current += 5; // near-miss bonus
          }
          continue;
        }

        survivors.push(moved);
      }

      objectsRef.current = survivors;

      // 5) Commit to state for rendering
      setObjects(objectsRef.current);
      setScore(scoreRef.current);
      setDistance(distanceRef.current);
      setFuel(fuelRef.current);
      setLives(livesRef.current);
      setShield(shieldRef.current);
      setSpeedLevel(lvl);

      if (livesRef.current <= 0 || fuelRef.current <= 0) finish();
    }, 40);

    return () => clearInterval(loop);
  }, [active]);

  function move(direction: -1 | 1) {
    if (!active) return;
    shiftLane(direction);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <GameHeader
        title="Angel Highway Run"
        subtitle="Tilt your phone to change lanes. Manage fuel, dodge traffic, go the distance."
        icon={<CarFront size={29} color={colors.navy} />}
        onExit={onExit}
        styles={styles}
        colors={colors}
      />

      <ControlToggles
        tilt={tilt}
        setTilt={setTilt}
        god={god}
        toggleGod={toggleGod}
        styles={styles}
        colors={colors}
      />

      <GameStats
        items={[
          ["Score", score],
          ["Best", bestScore],
          ["Distance", `${distance}m`],
          ["Lives", god ? "∞" : lives],
        ]}
        styles={styles}
      />

      <View style={styles.fuelCard}>
        <View style={styles.fuelTop}>
          <Text style={styles.statusText}>Fuel</Text>
          <Text style={styles.statusText}>
            {god ? "∞" : `${Math.round(fuel)}%`}
          </Text>
        </View>
        <View style={styles.fuelTrack}>
          <View style={[styles.fuelFill, { width: `${god ? 100 : fuel}%` }]} />
        </View>
        <Text style={styles.speedText}>
          Speed Level {speedLevel} •{" "}
          {god ? "👑 GOD MODE" : `Shield ${shield ? "Active" : "Off"}`}
        </Text>
      </View>

      <View style={[styles.roadBoard, { width: BOARD_WIDTH, height: BOARD_HEIGHT }]}>
        <View style={[styles.roadLine, { left: laneWidth - 2 }]} />
        <View style={[styles.roadLine, { left: laneWidth * 2 - 2 }]} />

        {!active ? (
          <StartOverlay
            title={gameOver ? "Drive Again?" : "Ready For The Highway?"}
            text="Tilt your phone left and right to change lanes. Collect coins, fuel cells, and shields. God Mode: smash through traffic with infinite fuel."
            button={gameOver ? "Restart Drive" : "Start Driving"}
            icon={<CarFront size={35} color={colors.navy} />}
            onPress={start}
            styles={styles}
          />
        ) : (
          <>
            {objects.map((object) => (
              <View
                key={object.id}
                style={[
                  styles.roadObject,
                  {
                    left: object.lane * laneWidth + laneWidth / 2 - 24,
                    top: object.y,
                  },
                ]}
              >
                <Text style={styles.roadEmoji}>
                  {object.kind === "car"
                    ? "🚙"
                    : object.kind === "truck"
                    ? "🚚"
                    : object.kind === "cone"
                    ? "🚧"
                    : object.kind === "coin"
                    ? "🪙"
                    : object.kind === "fuel"
                    ? "⛽"
                    : "🛡️"}
                </Text>
              </View>
            ))}

            <View
              style={[
                styles.playerCar,
                { left: lane * laneWidth + laneWidth / 2 - 30 },
              ]}
            >
              {(shield || god) && <View style={styles.shieldRing} />}
              <Text style={styles.playerCarEmoji}>🚘</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.driveControls}>
        <TouchableOpacity style={styles.driveButton} onPress={() => move(-1)}>
          <ChevronLeft size={30} color={colors.navy} />
          <Text style={styles.driveButtonText}>LEFT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.driveButton} onPress={() => move(1)}>
          <Text style={styles.driveButtonText}>RIGHT</Text>
          <ChevronRight size={30} color={colors.navy} />
        </TouchableOpacity>
      </View>

      <GameActions
        onRestart={start}
        onHelp={() =>
          Alert.alert(
            "Angel Highway Run",
            "Tilt your phone (or use the lane buttons) to avoid cars, trucks, and road barriers. Collect coins for points, fuel to continue, and shields for protection. God Mode: invincible with infinite fuel."
          )
        }
        styles={styles}
        colors={colors}
      />
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/* SHARED COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

function GameStats({
  items,
  styles,
}: {
  items: Array<[string, string | number]>;
  styles: any;
}) {
  return (
    <View style={styles.statsGrid}>
      {items.map(([label, value]) => (
        <View key={label} style={styles.statCard}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function StartOverlay({
  title,
  text,
  button,
  icon,
  onPress,
  styles,
}: {
  title: string;
  text: string;
  button: string;
  icon: React.ReactNode;
  onPress: () => void;
  styles: any;
}) {
  return (
    <View style={styles.startBox}>
      <View style={styles.startIcon}>{icon}</View>
      <Text style={styles.startTitle}>{title}</Text>
      <Text style={styles.startText}>{text}</Text>
      <TouchableOpacity style={styles.startButton} onPress={onPress}>
        <Text style={styles.startButtonText}>{button}</Text>
      </TouchableOpacity>
    </View>
  );
}

function GameActions({
  onRestart,
  onHelp,
  styles,
  colors,
}: {
  onRestart: () => void;
  onHelp: () => void;
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.resetButton} onPress={onRestart}>
        <RotateCcw size={18} color={colors.navy} />
        <Text style={styles.resetButtonText}>Restart</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onHelp}>
        <Text style={styles.secondaryButtonText}>How to Play</Text>
      </TouchableOpacity>
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
      letterSpacing: 2,
      marginBottom: 10,
    },
    title: {
      color: c.text,
      fontSize: 38,
      fontWeight: "900",
      marginBottom: 12,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "700",
    },

    gameCard: {
      width: "100%",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 24,
      padding: 18,
      marginBottom: 16,
      ...v5Shadow(c),
    },
    gameCardTop: {
      flexDirection: "row",
      gap: 14,
      marginBottom: 14,
    },
    gameCardIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    gameCardCopy: {
      flex: 1,
    },
    gameNumber: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    gameCardTitle: {
      color: c.text,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 6,
    },
    gameCardText: {
      color: c.text2,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "700",
    },
    gameMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    badge: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    badgeText: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    bestText: {
      color: c.text2,
      fontSize: 12,
      fontWeight: "900",
    },
    playButton: {
      minHeight: 50,
      backgroundColor: c.gold,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    playButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    arcadeInfo: {
      width: "100%",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 22,
      padding: 18,
      marginTop: 4,
      marginBottom: 18,
    },
    arcadeInfoTitle: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 6,
    },
    arcadeInfoText: {
      color: c.text2,
      fontSize: 13.5,
      lineHeight: 21,
      fontWeight: "700",
    },

    compactHero: {
      width: "100%",
      flexDirection: "row",
      gap: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 24,
      padding: 18,
      marginBottom: 16,
      ...v5Shadow(c),
    },
    compactHeroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    compactHeroCopy: {
      flex: 1,
    },
    compactKicker: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    compactTitle: {
      color: c.text,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 4,
    },
    compactSubtitle: {
      color: c.text2,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },

    toggleRow: {
      width: "100%",
      flexDirection: "row",
      gap: 8,
      marginBottom: 14,
    },
    toggleBtn: {
      flex: 1,
      minHeight: 46,
      flexDirection: "row",
      gap: 7,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    toggleBtnActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    godBtnActive: {
      backgroundColor: "#FACC15",
      borderColor: "#FACC15",
    },
    toggleText: {
      color: c.text,
      fontSize: 12,
      fontWeight: "900",
    },
    toggleTextActive: {
      color: c.navy,
    },
    godTextActive: {
      color: "#1F1300",
    },

    modeGrid: {
      width: "100%",
      flexDirection: "row",
      gap: 8,
      marginBottom: 14,
    },
    modeButton: {
      flex: 1,
      minHeight: 72,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      padding: 8,
    },
    modeButtonActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    modeButtonTitle: {
      color: c.text,
      fontSize: 11,
      fontWeight: "900",
      marginTop: 5,
    },
    modeButtonTitleActive: {
      color: c.navy,
    },

    statsGrid: {
      width: "100%",
      flexDirection: "row",
      gap: 8,
      marginBottom: 14,
    },
    statCard: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 18,
      paddingVertical: 13,
      paddingHorizontal: 8,
      alignItems: "center",
      ...v5Shadow(c),
    },
    statLabel: {
      color: c.text2,
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 5,
    },
    statValue: {
      color: c.gold,
      fontSize: 19,
      fontWeight: "900",
    },

    statusStrip: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      padding: 13,
      marginBottom: 14,
    },
    statusText: {
      color: c.text,
      fontSize: 12,
      fontWeight: "900",
    },

    gameBoard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 26,
      overflow: "hidden",
      position: "relative",
      marginBottom: 16,
      ...v5Shadow(c),
    },
    startBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      zIndex: 20,
    },
    startIcon: {
      width: 70,
      height: 70,
      borderRadius: 24,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 15,
    },
    startTitle: {
      color: c.gold,
      fontSize: 27,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 9,
    },
    startText: {
      color: c.text2,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 18,
    },
    startButton: {
      backgroundColor: c.gold,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 26,
    },
    startButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
    },

    tapTarget: {
      position: "absolute",
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.82)",
    },
    targetSymbol: {
      color: c.navy,
      fontSize: 34,
      fontWeight: "900",
    },

    spaceBoard: {
      backgroundColor: "#050816",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 26,
      overflow: "hidden",
      position: "relative",
      marginBottom: 16,
      ...v5Shadow(c),
    },
    starLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    star: {
      position: "absolute",
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: "#FFFFFF",
    },
    spaceObject: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    laser: {
      position: "absolute",
      width: 5,
      height: 18,
      borderRadius: 4,
      backgroundColor: "#FACC15",
      shadowColor: "#FACC15",
      shadowOpacity: 1,
      shadowRadius: 7,
    },
    laserGod: {
      backgroundColor: "#F97316",
      shadowColor: "#F97316",
      width: 6,
      height: 22,
    },
    ship: {
      position: "absolute",
      bottom: 12,
      width: 52,
      height: 60,
      alignItems: "center",
      justifyContent: "center",
    },
    shipEmoji: {
      fontSize: 43,
      transform: [{ rotate: "-45deg" }],
    },
    shieldRing: {
      position: "absolute",
      width: 66,
      height: 66,
      borderRadius: 33,
      borderWidth: 2,
      borderColor: "#38BDF8",
      backgroundColor: "rgba(56,189,248,0.12)",
    },
    controlRow: {
      width: "100%",
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },
    controlButton: {
      flex: 1,
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    fireButton: {
      flex: 1.35,
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: c.gold,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    fireText: {
      color: c.navy,
      fontWeight: "900",
      fontSize: 15,
    },

    fuelCard: {
      width: "100%",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 18,
      padding: 13,
      marginBottom: 14,
    },
    fuelTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    fuelTrack: {
      height: 10,
      backgroundColor: c.soft,
      borderRadius: 999,
      overflow: "hidden",
    },
    fuelFill: {
      height: "100%",
      backgroundColor: c.gold,
      borderRadius: 999,
    },
    speedText: {
      color: c.text2,
      fontSize: 11.5,
      fontWeight: "800",
      marginTop: 8,
    },

    roadBoard: {
      backgroundColor: "#2B2F36",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 26,
      overflow: "hidden",
      position: "relative",
      marginBottom: 16,
      ...v5Shadow(c),
    },
    roadLine: {
      position: "absolute",
      top: 0,
      width: 4,
      height: "100%",
      backgroundColor: "rgba(255,255,255,0.36)",
    },
    roadObject: {
      position: "absolute",
      width: 48,
      height: 58,
      alignItems: "center",
      justifyContent: "center",
    },
    roadEmoji: {
      fontSize: 38,
    },
    playerCar: {
      position: "absolute",
      bottom: 18,
      width: 60,
      height: 74,
      alignItems: "center",
      justifyContent: "center",
    },
    playerCarEmoji: {
      fontSize: 47,
    },
    driveControls: {
      width: "100%",
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    driveButton: {
      flex: 1,
      minHeight: 58,
      borderRadius: 18,
      backgroundColor: c.gold,
      flexDirection: "row",
      gap: 7,
      alignItems: "center",
      justifyContent: "center",
    },
    driveButtonText: {
      color: c.navy,
      fontSize: 14,
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
      borderRadius: 18,
      padding: 15,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      ...v5Shadow(c),
    },
    resetButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      padding: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },

    footer: {
      color: c.text2,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "700",
      marginTop: 4,
    },
  });
}
