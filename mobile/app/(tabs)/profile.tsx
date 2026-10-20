import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from "react-native";
import { useAuthStore } from "../../src/store/authStore";
import { useI18n } from "../../src/i18n";
import { Language } from "../../src/i18n/translations";

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuthStore();
  const { t, language, setLanguage } = useI18n();

  const handleSignOut = () => {
    Alert.alert(t("signOut"), "", [
      { text: "Cancel", style: "cancel" },
      { text: t("signOut"), style: "destructive", onPress: () => signOut() },
    ]);
  };

  const languages: { code: Language; label: string; full: string }[] = [
    { code: "pl", label: "PL", full: "Polski" },
    { code: "en", label: "EN", full: "English" },
    { code: "uk", label: "UA", full: "Українська" },
    { code: "ru", label: "RU", full: "Русский" },
  ];

  const score = Math.round((profile?.reliabilityScore ?? 1.0) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {(profile?.displayName || user?.email || "U").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>
          {profile?.displayName || "ConnectMe User"}
        </Text>
        <Text style={styles.userEmail}>{user?.email || ""}</Text>
      </View>

      {/* Reliability Score Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{t("reliabilityScore")}</Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{score}%</Text>
          </View>
        </View>
        <Text style={styles.scoreDesc}>{t("reliabilityDesc")}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${score}%` }]} />
        </View>
      </View>

      {/* Language Selection Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("language")}</Text>
        <View style={styles.langGrid}>
          {languages.map((item) => (
            <TouchableOpacity
              key={item.code}
              style={[
                styles.langOption,
                language === item.code && styles.langOptionActive,
              ]}
              onPress={() => setLanguage(item.code)}
            >
              <Text
                style={[
                  styles.langOptionText,
                  language === item.code && styles.langOptionTextActive,
                ]}
              >
                {item.full}
              </Text>
              {language === item.code && (
                <Text style={styles.checkIcon}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t("signOut")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  userCard: {
    backgroundColor: "#151d2d",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0b0f19",
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
  },
  userEmail: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#151d2d",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 10,
  },
  scoreBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  scoreText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "800",
  },
  scoreDesc: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 10,
  },
  langGrid: {
    gap: 8,
  },
  langOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0e1524",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  langOptionActive: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  langOptionText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  langOptionTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  checkIcon: {
    color: "#10b981",
    fontWeight: "900",
  },
  signOutBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  signOutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "700",
  },
});
