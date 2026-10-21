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
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
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
import { colors, gradients, radius, shadow, spacing } from "../../src/theme";

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
        <ActivityIndicator size="large" color={colors.primary} />
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
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.screen}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
      />
      <ScrollView contentContainerStyle={styles.content}>
      {/* Event Header Card */}
      <View style={styles.card}>
        <LinearGradient
          colors={gradients.card}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
        >
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.title}</Text>
            {isCreator && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push(`/event/create?editId=${id}`)}
              >
                <View style={styles.editBtnInner}>
                  <Feather name="edit-2" size={13} color={colors.textMuted} />
                  <Text style={styles.editBtnText}>{t("editEvent")}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaIconBox}>
              <Feather name="calendar" size={15} color={colors.accentDeep} />
            </View>
            <View>
              <Text style={styles.metaLabel}>{t("when")}</Text>
              <Text style={styles.metaValue}>{dateStr}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaIconBox}>
              <Feather name="map-pin" size={15} color={colors.accentDeep} />
            </View>
            <View>
              <Text style={styles.metaLabel}>{t("where")}</Text>
              <Text style={styles.metaValue}>{event.location}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaIconBox}>
              <Feather name="user" size={15} color={colors.accentDeep} />
            </View>
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
            <View style={styles.shareBtnInner}>
              <Feather name="link-2" size={15} color={colors.accentDeep} />
              <Text style={styles.shareBtnText}>{t("shareLink")}</Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* RSVP Action for current user */}
      <View style={styles.card}>
        <LinearGradient
          colors={gradients.card}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
        >
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
                  <View style={styles.rsvpSmallBtnInner}>
                    <Feather name="check" size={14} color={colors.textMuted} />
                    <Text style={styles.rsvpSmallBtnText}>Będę</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.rsvpSmallBtn,
                    myParticipant.status === "not_going" && styles.rsvpSmallBtnDanger,
                  ]}
                  disabled={savingRsvp}
                  onPress={() => handleRsvp("not_going")}
                >
                  <View style={styles.rsvpSmallBtnInner}>
                    <Feather name="x" size={14} color={colors.textMuted} />
                    <Text style={styles.rsvpSmallBtnText}>Nie dam rady</Text>
                  </View>
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
              <LinearGradient
                colors={gradients.navy}
                style={styles.rsvpActionGoingGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.rsvpActionInner}>
                  <Feather name="check" size={16} color={colors.textInverse} />
                  <Text style={styles.rsvpActionText}>Będę</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rsvpActionBtn, styles.rsvpActionNotGoing]}
              disabled={savingRsvp}
              onPress={() => handleRsvp("not_going")}
            >
              <View style={styles.rsvpActionInner}>
                <Feather name="x" size={16} color={colors.danger} />
                <Text style={[styles.rsvpActionText, styles.rsvpActionTextDanger]}>Nie dam rady</Text>
              </View>
            </TouchableOpacity>
          </View>
          )}
        </LinearGradient>
      </View>

      {/* Participants Card */}
      <View style={styles.card}>
        <LinearGradient
          colors={gradients.card}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
        >
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
        </LinearGradient>
      </View>
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
    paddingBottom: spacing.xl * 1.5,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bgTop,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 23,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  editBtn: {
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  editBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  editBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  metaIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  metaLabel: {
    fontSize: 10,
    color: colors.textSubtle,
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "700",
    marginTop: 3,
  },
  quorumBox: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 14,
    marginBottom: 16,
  },
  quorumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  quorumTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  quorumHighlight: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
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
  shareBtn: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  shareBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  shareBtnText: {
    color: colors.accentDeep,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    color: colors.textMuted,
    marginBottom: 14,
  },
  myRsvpBox: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  myRsvpText: {
    color: colors.accentDeep,
    fontSize: 14,
    fontWeight: "800",
  },
  rsvpBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  rsvpSmallBtn: {
    flex: 1,
    backgroundColor: colors.cardSoft,
    paddingVertical: 11,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  rsvpSmallBtnActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rsvpSmallBtnDanger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  rsvpSmallBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  rsvpSmallBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rsvpActionBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: "center",
    overflow: "hidden",
  },
  rsvpActionGoing: {
    ...shadow.button,
  },
  rsvpActionGoingGradient: {
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: "center",
    width: "100%",
  },
  rsvpActionNotGoing: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  rsvpActionText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  rsvpActionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  rsvpActionTextDanger: {
    color: colors.danger,
  },
  partItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardSoft,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  partLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  partAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  partAvatarText: {
    color: colors.accentDeep,
    fontWeight: "800",
    fontSize: 14,
  },
  partName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  partType: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusPillGoing: {
    backgroundColor: colors.primarySoft,
  },
  statusPillNotGoing: {
    backgroundColor: colors.dangerSoft,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusPillTextGoing: {
    color: colors.accentDeep,
  },
  statusPillTextNotGoing: {
    color: colors.danger,
  },
  noPartsText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "600",
  },
});
