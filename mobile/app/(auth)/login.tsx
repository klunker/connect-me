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
import { useAuthStore } from "../../src/store/authStore";
import { useI18n } from "../../src/i18n";
import { Language } from "../../src/i18n/translations";

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
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>C</Text>
          </View>
          <Text style={styles.appName}>ConnectMe</Text>
          <Text style={styles.title}>{t("loginTitle")}</Text>
          <Text style={styles.subtitle}>{t("loginSubtitle")}</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
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
              <ActivityIndicator color="#0b0f19" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isRegister ? t("signUp") : t("signIn")}
              </Text>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingTop: 50,
  },
  langRow: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  langSelector: {
    flexDirection: "row",
    backgroundColor: "#151d2d",
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  langBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  langBtnActive: {
    backgroundColor: "#25334c",
  },
  langText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
  },
  langTextActive: {
    color: "#f8fafc",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ffffff",
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#cbd5e1",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  card: {
    backgroundColor: "#151d2d",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#0e1524",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#0b0f19",
    fontSize: 16,
    fontWeight: "700",
  },
  switchModeBtn: {
    marginTop: 18,
    alignItems: "center",
  },
  switchModeText: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
  },
});
