import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Share,
  Platform
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../src/config/firebase";
import { useAuthStore } from "../../src/store/authStore";
import { useI18n } from "../../src/i18n";
import {
  createEvent,
  updateEvent,
  CreateEventInput
} from "../../src/services/eventsService";
import { getGuestEventUrl } from "../../src/config/constants";

export default function CreateOrEditEventScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { t, language } = useI18n();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const isEditMode = !!editId;

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateStr, setDateStr] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [timeStr, setTimeStr] = useState("18:00");
  const [requiredCount, setRequiredCount] = useState(10);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState("thursday");

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  // If in edit mode, prefill event details
  useEffect(() => {
    if (!editId) return;

    async function loadEvent() {
      try {
        const snap = await getDoc(doc(db, "events", editId!));
        if (snap.exists()) {
          const data = snap.data();
          setTitle(data.title || "");
          setDescription(data.description || "");
          setLocation(data.location || "");
          setRequiredCount(data.requiredCount || 10);
          setIsRecurring(!!data.isRecurring);

          if (data.recurrenceRule) {
            const parts = data.recurrenceRule.split(":");
            if (parts[1]) setRecurrenceDay(parts[1]);
          }

          if (data.dateTime) {
            const d = data.dateTime.toDate ? data.dateTime.toDate() : new Date(data.dateTime);
            setDateStr(d.toISOString().split("T")[0]);
            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");
            setTimeStr(`${hh}:${mm}`);
          }
        }
      } catch (err) {
        console.error("Error loading event for edit:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    loadEvent();
  }, [editId]);

  const daysList: { id: string; label: string }[] = [
    { id: "monday", label: t("mon") },
    { id: "tuesday", label: t("tue") },
    { id: "wednesday", label: t("wed") },
    { id: "thursday", label: t("thu") },
    { id: "friday", label: t("fri") },
    { id: "saturday", label: t("sat") },
    { id: "sunday", label: t("sun") },
  ];

  const handleShare = async (createdEventId: string) => {
    const url = getGuestEventUrl(createdEventId);
    try {
      await Share.share({
        message: `${t("shareMessage")} ${title.trim()} (${dateStr} ${timeStr})\n📍 ${location.trim()}\n👉 ${url}`,
        url: url, // iOS supports url field
      });
    } catch (e) {
      console.warn("Share error:", e);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !location.trim() || !dateStr.trim() || !timeStr.trim()) {
      Alert.alert(t("authError"), t("fillAllFields"));
      return;
    }

    if (!user) {
      Alert.alert(t("authError"), "User session not found.");
      return;
    }

    // Parse DateTime
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);
    const targetDate = new Date(year, month - 1, day, hours, minutes);

    if (isNaN(targetDate.getTime())) {
      Alert.alert(t("authError"), "Invalid date/time format. Use YYYY-MM-DD and HH:MM.");
      return;
    }

    setLoading(true);

    try {
      const inputData: CreateEventInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim(),
        dateTime: targetDate,
        requiredCount: requiredCount,
        isRecurring: isRecurring,
        recurrenceRule: isRecurring ? `weekly:${recurrenceDay}` : undefined,
      };

      if (isEditMode && editId) {
        await updateEvent(editId, inputData);
        Alert.alert(t("eventUpdatedSuccess"), "", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        const newId = await createEvent(inputData, {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName || user.email?.split("@")[0] || "Organizer",
        });

        Alert.alert(
          t("eventCreatedSuccess"),
          `${title}\n${dateStr} ${timeStr}`,
          [
            {
              text: t("shareLink"),
              onPress: async () => {
                await handleShare(newId);
                router.replace(`/event/${newId}`);
              },
            },
            {
              text: "OK",
              onPress: () => router.replace(`/event/${newId}`),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error("Save event error:", err);
      Alert.alert(t("authError"), err.message || "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenHeader}>
        {isEditMode ? t("editEvent") : t("createEvent")}
      </Text>

      {/* Main Details Card */}
      <View style={styles.card}>
        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("eventTitle")} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t("titlePlaceholder")}
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("locationLabel")} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t("locationPlaceholder")}
            placeholderTextColor="#64748b"
            value={location}
            onChangeText={setLocation}
            maxLength={200}
          />
        </View>

        {/* Date and Time row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>{t("dateLabel")} *</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-10-25"
              placeholderTextColor="#64748b"
              value={dateStr}
              onChangeText={setDateStr}
            />
          </View>
          <View style={[styles.inputGroup, { width: 110 }]}>
            <Text style={styles.label}>{t("timeLabel")} *</Text>
            <TextInput
              style={styles.input}
              placeholder="18:00"
              placeholderTextColor="#64748b"
              value={timeStr}
              onChangeText={setTimeStr}
            />
          </View>
        </View>

        {/* Required Count Stepper */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("requiredCountLabel")}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setRequiredCount((prev) => Math.max(2, prev - 1))}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.countDisplay}>
              <Text style={styles.countText}>{requiredCount}</Text>
              <Text style={styles.countUnit}>{t("people")}</Text>
            </View>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setRequiredCount((prev) => Math.min(50, prev + 1))}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("descriptionLabel")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t("descPlaceholder")}
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={1000}
          />
        </View>
      </View>

      {/* Recurrence Settings Card */}
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>{t("recurringSwitch")}</Text>
            <Text style={styles.switchSub}>{t("recurrenceRuleLabel")}</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: "#1c273c", true: "#10b981" }}
            thumbColor="#ffffff"
          />
        </View>

        {isRecurring && (
          <View style={styles.daysContainer}>
            {daysList.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayChip,
                  recurrenceDay === day.id && styles.dayChipActive,
                ]}
                onPress={() => setRecurrenceDay(day.id)}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    recurrenceDay === day.id && styles.dayChipTextActive,
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0b0f19" />
        ) : (
          <Text style={styles.submitBtnText}>
            {isEditMode ? t("saveChanges") : t("createEvent")}
          </Text>
        )}
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
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: "#0b0f19",
    alignItems: "center",
    justifyContent: "center",
  },
  screenHeader: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#151d2d",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  inputGroup: {
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    gap: 12,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0e1524",
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#1c273c",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
  },
  countDisplay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
  },
  countText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#10b981",
  },
  countUnit: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  switchSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  dayChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#0e1524",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  dayChipActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "#10b981",
  },
  dayChipText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  dayChipTextActive: {
    color: "#10b981",
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: "#10b981",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnText: {
    color: "#0b0f19",
    fontSize: 16,
    fontWeight: "800",
  },
});
