import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { useI18n } from "../../src/i18n";
import { Language } from "../../src/i18n/translations";
import { colors, gradients, radius, shadow, spacing } from "../../src/theme";

export default function ProfileScreen() {
  const { user, profile, updateProfile, signOut } = useAuthStore();
  const { t, language, setLanguage } = useI18n();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");

  // Sync the form with the stored profile, but never while the user is typing
  React.useEffect(() => {
    if (profile && !isEditing) {
      setDisplayName(profile.displayName || "");
      setPhone(profile.phone || "");
    }
  }, [profile, isEditing]);

  const handleSave = async () => {
    const name = displayName.trim();
    const phoneValue = phone.trim();

    // Mirrors firestore.rules validation for users/{uid}
    if (name.length < 1 || name.length > 60) {
      Alert.alert(t("authError"), t("nameLengthError"));
      return;
    }
    if (phoneValue.length > 0 && (phoneValue.length < 5 || phoneValue.length > 25)) {
      Alert.alert(t("authError"), t("phoneLengthError"));
      return;
    }

    setSaving(true);
    try {
      await updateProfile(name, phoneValue);
      setIsEditing(false);
      Alert.alert(t("success"), t("profileUpdatedSuccess"));
    } catch (e: any) {
      Alert.alert(t("authError"), e?.message || t("profileUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t("signOut"), "", [
      { text: t("cancel"), style: "cancel" },
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
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.screen}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card with Inline Edit */}
        <View style={styles.card}>
          <LinearGradient
            colors={gradients.card}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 1 }}
          >
          <View style={styles.userHeader}>
            <LinearGradient
              colors={gradients.avatar}
              style={styles.avatarCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarInitial}>
                {(profile?.displayName || user?.email || "U").charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {profile?.displayName || "ConnectMe User"}
              </Text>
              <Text style={styles.userEmail}>{user?.email || ""}</Text>
              {profile?.phone ? (
                <Text style={styles.userPhone}>{profile.phone}</Text>
              ) : null}
            </View>
          </View>

          {!isEditing ? (
            <TouchableOpacity
              style={styles.editBtnOutline}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editBtnOutlineText}>{t("editProfile")}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editForm}>
              <Text style={styles.fieldLabel}>{t("namePlaceholder")}</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t("namePlaceholder")}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.fieldLabel}>{t("phone")}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t("phonePlaceholder")}
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />

              <View style={styles.editActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setIsEditing(false);
                    setDisplayName(profile?.displayName || "");
                    setPhone(profile?.phone || "");
                  }}
                >
                  <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <LinearGradient
                      colors={gradients.navy}
                      style={styles.saveBtnGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.saveBtnText}>{t("saveChanges")}</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Reliability Score Card */}
      <View style={styles.card}>
        <LinearGradient
          colors={gradients.card}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
        >
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
        </LinearGradient>
      </View>

      {/* Language Selection Card */}
      <View style={styles.card}>
        <LinearGradient
          colors={gradients.card}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
        >
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
                  <Feather name="check" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t("signOut")}</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgTop,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    borderRadius: radius.xl,
    ...shadow.card,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 22,
    borderRadius: radius.xl,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatarCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    ...shadow.glow,
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.textInverse,
    letterSpacing: -0.5,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
  },
  userPhone: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 3,
  },
  editBtnOutline: {
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.primarySoft,
  },
  editBtnOutlineText: {
    color: colors.accentDeep,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  editForm: {
    marginTop: 10,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: colors.textSubtle,
    marginBottom: -4,
  },
  input: {
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  editActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.cardSoft,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  saveBtn: {
    flex: 1,
    borderRadius: radius.md,
    alignItems: "center",
    overflow: "hidden",
    ...shadow.button,
  },
  saveBtnGradient: {
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: "center",
    width: "100%",
  },
  saveBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    color: colors.textMuted,
    marginBottom: 10,
  },
  scoreBadge: {
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  scoreText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "800",
  },
  scoreDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: 14,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.borderStrong,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  langGrid: {
    gap: 8,
  },
  langOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.cardSoft,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  langOptionText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  langOptionTextActive: {
    color: colors.text,
    fontWeight: "800",
  },
  signOutBtn: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  signOutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
