import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Alert
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../src/config/firebase";
import { useAuthStore } from "../../src/store/authStore";
import { useI18n } from "../../src/i18n";
import {
  subscribeEventParticipants,
  ParticipantItem
} from "../../src/services/eventsService";
import { getGuestEventUrl } from "../../src/config/constants";

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuthStore();
  const { t, language } = useI18n();

  const [event, setEvent] = useState<any>(null);
  const [creatorDisplayName, setCreatorDisplayName] = useState<string>("");
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRsvp, setSavingRsvp] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Listen to event doc
    const eventRef = doc(db, "events", id);
    const unsubEvent = onSnapshot(eventRef, async (snap) => {
      if (snap.exists()) {
        const evData = { id: snap.id, ...snap.data() } as any;
        setEvent(evData);

        if (evData.creatorId) {
          try {
            const userSnap = await getDoc(doc(db, "users", evData.creatorId));
            if (userSnap.exists()) {
              setCreatorDisplayName(userSnap.data().displayName || "");
            }
          } catch (e) {
            setCreatorDisplayName(evData.creatorName || "");
          }
        }
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

  const handleShare = async () => {
    if (!id || !event) return;
    const url = getGuestEventUrl(id);
    try {
      await Share.share({
        message: `${t("shareMessage")} ${event.title}\n📍 ${event.location}\n👉 ${url}`,
        url: url,
      });
    } catch (e) {
      console.warn("Share error:", e);
    }
  };

  const handleRsvp = async (status: "going" | "not_going") => {
    if (!user || !id) return;
    setSavingRsvp(true);
    try {
      const partDocRef = doc(db, "events", id, "participants", user.uid);
      await setDoc(
        partDocRef,
        {
          userId: user.uid,
          displayName: profile?.displayName || user.displayName || user.email?.split("@")[0] || "Member",
          status: status,
          isGuest: false,
          respondedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err: any) {
      console.error("Failed to update RSVP:", err);
      Alert.alert(t("authError"), err.message || "Failed to update RSVP");
    } finally {
      setSavingRsvp(false);
    }
  };

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

  const isCreator = user?.uid === event.creatorId || user?.uid === event.delegatedTo;
  const myParticipant = participants.find((p) => p.userId === user?.uid);

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
        <View style={styles.titleRow}>
          <Text style={styles.title}>{event.title}</Text>
          {isCreator && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push(`/event/create?editId=${id}`)}
            >
              <Text style={styles.editBtnText}>✏️ {t("editEvent")}</Text>
            </TouchableOpacity>
          )}
        </View>

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
            <Text style={styles.metaValue}>{creatorDisplayName || event.creatorName || ""}</Text>
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

        {/* Share Guest Link Button */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>🔗 {t("shareLink")}</Text>
        </TouchableOpacity>
      </View>

      {/* RSVP Action for current user */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Twoja obecność</Text>
        {myParticipant ? (
          <View style={styles.myRsvpBox}>
            <Text style={styles.myRsvpText}>
              {myParticipant.status === "going" || myParticipant.status === "confirmed"
                ? "✓ Twój status: Będę obecny"
                : "✗ Twój status: Nie dam rady"}
            </Text>
            <View style={styles.rsvpBtnRow}>
              <TouchableOpacity
                style={[
                  styles.rsvpSmallBtn,
                  myParticipant.status === "going" && styles.rsvpSmallBtnActive,
                ]}
                disabled={savingRsvp}
                onPress={() => handleRsvp("going")}
              >
                <Text style={styles.rsvpSmallBtnText}>👍 Będę</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.rsvpSmallBtn,
                  myParticipant.status === "not_going" && styles.rsvpSmallBtnDanger,
                ]}
                disabled={savingRsvp}
                onPress={() => handleRsvp("not_going")}
              >
                <Text style={styles.rsvpSmallBtnText}>👎 Nie dam rady</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.rsvpBtnRow}>
            <TouchableOpacity
              style={[styles.rsvpActionBtn, styles.rsvpActionGoing]}
              disabled={savingRsvp}
              onPress={() => handleRsvp("going")}
            >
              <Text style={styles.rsvpActionText}>👍 Będę</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rsvpActionBtn, styles.rsvpActionNotGoing]}
              disabled={savingRsvp}
              onPress={() => handleRsvp("not_going")}
            >
              <Text style={styles.rsvpActionText}>👎 Nie dam rady</Text>
            </TouchableOpacity>
          </View>
        )}
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
                      {p.isGuest ? "Gość / Guest" : "Klubowicz / Member"}
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
                    {isGoing ? "✓ Będzie" : "✗ Nie będzie"}
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
    paddingBottom: 36,
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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  editBtn: {
    backgroundColor: "#1c273c",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  editBtnText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
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
    marginBottom: 14,
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
  shareBtn: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  shareBtnText: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
  },
  myRsvpBox: {
    backgroundColor: "#0e1524",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  myRsvpText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "700",
  },
  rsvpBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  rsvpSmallBtn: {
    flex: 1,
    backgroundColor: "#1c273c",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  rsvpSmallBtnActive: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  rsvpSmallBtnDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  rsvpSmallBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  rsvpActionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  rsvpActionGoing: {
    backgroundColor: "#10b981",
  },
  rsvpActionNotGoing: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  rsvpActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
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
