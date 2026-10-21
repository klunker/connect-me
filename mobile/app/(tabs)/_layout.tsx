import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useI18n } from "../../src/i18n";
import { colors, radius, shadow } from "../../src/theme";

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
          borderBottomWidth: 0,
          ...shadow.soft,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 18,
          letterSpacing: -0.3,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          height: 80,
          paddingBottom: 12,
          paddingTop: 10,
          ...shadow.card,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          borderRadius: radius.md,
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("myEvents"),
          tabBarLabel: t("myEvents"),
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="calendar"
              size={21}
              color={color as string}
              strokeWidth={focused ? 2.4 : 1.9}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarLabel: t("profile"),
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="user"
              size={21}
              color={color as string}
              strokeWidth={focused ? 2.4 : 1.9}
            />
          ),
        }}
      />
    </Tabs>
  );
}
