import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { useOwnerTheme } from "../lib/ownerTheme";

export default function OwnerIndexScreen() {
  const { theme } = useOwnerTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkOwnerSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn(
            "Unable to check owner session:",
            error.message
          );
        }

        if (isMounted) {
          setIsAuthenticated(Boolean(session?.user));
        }
      } catch (error) {
        console.warn(
          "Unexpected owner session error:",
          error
        );

        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkOwnerSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }

        setIsAuthenticated(Boolean(session?.user));
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.logoBadge,
            {
              backgroundColor:
                theme.colors.goldTransparent,
              borderColor:
                theme.colors.cardBorderStrong,
            },
          ]}
        >
          <Text
            style={[
              styles.logoLetter,
              {
                color: theme.colors.gold,
              },
            ]}
          >
            A
          </Text>
        </View>

        <Text
          style={[
            styles.brandName,
            {
              color: theme.colors.text,
            },
          ]}
        >
          ANGEL EXPRESS
        </Text>

        <Text
          style={[
            styles.commandText,
            {
              color: theme.colors.gold,
            },
          ]}
        >
          OPERATIONS COMMAND CENTER
        </Text>

        <ActivityIndicator
          size="large"
          color={theme.colors.gold}
          style={styles.loader}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color: theme.colors.textMuted,
            },
          ]}
        >
          Securing owner access...
        </Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return (
      <Redirect href="/owner-dashboard" />
    );
  }

  return <Redirect href="/owner-login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  logoLetter: {
    fontSize: 42,
    fontWeight: "900",
  },

  brandName: {
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },

  commandText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
    textAlign: "center",
  },

  loader: {
    marginTop: 34,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});