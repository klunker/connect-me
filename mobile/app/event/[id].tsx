import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../src/config/firebase";
import { useI18n } from "../../src/i18n";
import {
  subscribeEventParticipants,
  ParticipantItem
} from "../../src/services/eventsService";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useI18n();

  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Listen to event doc
    const eventRef = doc(db, "events", id);
    const unsubEvent = onSnapshot(eventRef, (snap) => {
      if (snap.exists()) {
        setEvent({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });

    // Listen to participants subcollection
    const unsubParts = subscribeEventParticipants(id, (list) => {
      setParticipants(list);
    });

    return () => {
      unsubEvent();
      unsubParts();
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t("noEventsYet")}</Text>
      </View>
    );
  }

  const date = event.dateTime?.toDate
    ? event.dateTime.toDate()
    : new Date(event.dateTime);
  const localeMap = { pl: "pl-PL", en: "en-US", uk: "uk-UA", ru: "ru-RU" };
  const dateStr = date.toLocaleString(localeMap[language] || "pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const goingList = participants.filter(
    (p) => p.status === "going" || p.status === "confirmed"
  );
  const required = event.requiredCount || 10;
  const percent = Math.min(100, Math.round((goingList.length / required) * 100));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Event Header Card */}
      <View style={styles.card}>
        <Text style={styles.title}>{event.title}</Text>
        {event.description ? (
          <Text style={styles.description}>{event.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>📅</Text>
          <View>
            <Text style={styles.metaLabel}>{t("when")}</Text>
            <Text style={styles.metaValue}>{dateStr}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>📍</Text>
          <View>
            <Text style={styles.metaLabel}>{t("where")}</Text>
            <Text style={styles.metaValue}>{event.location}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>👤</Text>
          <View>
            <Text style={styles.metaLabel}>{t("organized")}</Text>
            <Text style={styles.metaValue}>{event.creatorName}</Text>
          </View>
        </View>

        {/* Quorum status */}
        <View style={styles.quorumBox}>
          <View style={styles.quorumHeader}>
            <Text style={styles.quorumTitle}>
              {t("needed")}: {goingList.length} / {required} {t("people")}
            </Text>
            <Text style={styles.quorumHighlight}>
              {required - goingList.length > 0
                ? `${t("spotsLeft")}: ${required - goingList.length}`
                : `🎉 ${t("quorumReached")}`}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(5, percent)}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Participants Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {t("participants")} ({participants.length})
        </Text>

        {participants.length === 0 ? (
          <Text style={styles.noPartsText}>{t("noEventsDesc")}</Text>
        ) : (
          participants.map((p) => {
            const isGoing = p.status === "going" || p.status === "confirmed";
            return (
              <View key={p.id} style={styles.partItem}>
                <View style={styles.partLeft}>
                  <View style={styles.partAvatar}>
                    <Text style={styles.partAvatarText}>
                      {(p.displayName || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.partName}>{p.displayName}</Text>
                    <Text style={styles.partType}>
                      {p.isGuest ? "Гость / Gość" : "Пользователь / User"}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    isGoing ? styles.statusPillGoing : styles.statusPillNotGoing,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isGoing ? styles.statusPillTextGoing : styles.statusPillTextNotGoing,
                    ]}
                  >
                    {isGoing ? "✓ Идет" : "✗ Не идет"}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
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
  center: {
    flex: 1,
    backgroundColor: "#0b0f19",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#151d2d",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 20,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  metaIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  metaValue: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
    marginTop: 2,
  },
  quorumBox: {
    backgroundColor: "#1c273c",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  quorumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  quorumTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  quorumHighlight: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10b981",
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 14,
  },
  partItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0e1524",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  partLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  partAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#25334c",
    alignItems: "center",
    justifyContent: "center",
  },
  partAvatarText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  partName: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  partType: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillGoing: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  statusPillNotGoing: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusPillTextGoing: {
    color: "#10b981",
  },
  statusPillTextNotGoing: {
    color: "#ef4444",
  },
  noPartsText: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
});
