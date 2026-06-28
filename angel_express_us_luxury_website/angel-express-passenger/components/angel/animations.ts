import { Animated, Easing } from "react-native";

export function fadeUp(value: Animated.Value, delay = 0) {
  return Animated.timing(value, {
    toValue: 1,
    duration: 450,
    delay,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
}

export function fadeDown(value: Animated.Value, delay = 0) {
  return Animated.timing(value, {
    toValue: 1,
    duration: 420,
    delay,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
}

export function scaleIn(value: Animated.Value, delay = 0) {
  return Animated.spring(value, {
    toValue: 1,
    delay,
    friction: 7,
    tension: 55,
    useNativeDriver: true,
  });
}

export function pressIn(value: Animated.Value) {
  return Animated.spring(value, {
    toValue: 0.97,
    friction: 5,
    tension: 80,
    useNativeDriver: true,
  });
}

export function pressOut(value: Animated.Value) {
  return Animated.spring(value, {
    toValue: 1,
    friction: 5,
    tension: 80,
    useNativeDriver: true,
  });
}

export function shimmerLoop(value: Animated.Value) {
  value.setValue(0);

  return Animated.loop(
    Animated.timing(value, {
      toValue: 1,
      duration: 2600,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  );
}

export function slowBackgroundZoom(value: Animated.Value) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 1.03,
        duration: 26000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 1,
        duration: 26000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  );
}