import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../src/store/authStore";
import { useI18n } from "../../src/i18n";
import { Language } from "../../src/i18n/translations";
import { colors, gradients, radius, shadow, spacing } from "../../src/theme";

export default function LoginScreen() {
  const { signIn, signUp, isLoading, error, clearError } = useAuthStore();
  const { t, language, setLanguage } = useI18n();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSubmit = async () => {
    clearError();
    if (!email || !password || (isRegister && !displayName)) {
      Alert.alert(t("authError"), t("fillAllFields"));
      return;
    }

    try {
      if (isRegister) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch (e: any) {
      // Error handled in store and displayed below
    }
  };

  const languages: { code: Language; label: string }[] = [
    { code: "pl", label: "PL" },
    { code: "en", label: "EN" },
    { code: "uk", label: "UA" },
    { code: "ru", label: "RU" },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={gradients.screen}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Language selector in top corner */}
        <View style={styles.langRow}>
          <View style={styles.langSelector}>
            {languages.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={[
                  styles.langBtn,
                  language === item.code && styles.langBtnActive,
                ]}
                onPress={() => setLanguage(item.code)}
              >
                <Text
                  style={[
                    styles.langText,
                    language === item.code && styles.langTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Brand header */}
        <View style={styles.brandContainer}>
          <LinearGradient
            colors={gradients.navy}
            style={styles.logoBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoText}>C</Text>
          </LinearGradient>
          <Text style={styles.appName}>ConnectMe</Text>
          <Text style={styles.title}>{t("loginTitle")}</Text>
          <Text style={styles.subtitle}>{t("loginSubtitle")}</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <LinearGradient
            colors={gradients.card}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 1 }}
          >
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {isRegister && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("namePlaceholder")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("namePlaceholder")}
                  placeholderTextColor="#64748b"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("emailPlaceholder")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("emailPlaceholder")}
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("passwordPlaceholder")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("passwordPlaceholder")}
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <LinearGradient
                  colors={gradients.navy}
                  style={styles.submitBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.submitBtnText}>
                    {isRegister ? t("signUp") : t("signIn")}
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchModeBtn}
              onPress={() => {
                clearError();
                setIsRegister(!isRegister);
              }}
            >
              <Text style={styles.switchModeText}>
                {isRegister ? t("haveAccount") : t("dontHaveAccount")}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgTop,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    paddingTop: 50,
  },
  langRow: {
    alignItems: "flex-end",
    marginBottom: spacing.lg,
  },
  langSelector: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 4,
    ...shadow.card,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  langBtnActive: {
    backgroundColor: colors.navy,
  },
  langText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  langTextActive: {
    color: colors.textInverse,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    ...shadow.button,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textInverse,
    letterSpacing: -0.5,
  },
  appName: {
    fontSize: 27,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 280,
    lineHeight: 19,
  },
  card: {
    borderRadius: radius.xl,
    ...shadow.card,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 24,
    borderRadius: radius.xl,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: colors.textSubtle,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  submitBtn: {
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: 8,
    overflow: "hidden",
    ...shadow.button,
  },
  submitBtnGradient: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
    width: "100%",
  },
  submitBtnText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  switchModeBtn: {
    marginTop: 18,
    alignItems: "center",
  },
  switchModeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
