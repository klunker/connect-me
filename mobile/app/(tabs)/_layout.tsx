import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useI18n } from "../../src/i18n";

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0b0f19",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.08)",
        },
        headerTintColor: "#f8fafc",
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 18,
        },
        tabBarStyle: {
          backgroundColor: "#0e1524",
          borderTopColor: "rgba(255, 255, 255, 0.08)",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#10b981",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("myEvents"),
          tabBarLabel: t("myEvents"),
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📅</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarLabel: t("profile"),
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
