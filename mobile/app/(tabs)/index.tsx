import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { useI18n } from "../../src/i18n";
import { subscribeEvents, EventItem } from "../../src/services/eventsService";
import { colors, gradients, radius, shadow, spacing } from "../../src/theme";

export default function MyEventsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t, language } = useI18n();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "organized" | "joined">("all");

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      const unsubscribe = subscribeEvents(
        user?.uid,
        (items) => {
          setEvents(items);
          setLoading(false);
          setRefreshing(false);
        },
        (err) => {
          console.error("Firestore events error:", err);
          setLoading(false);
          setRefreshing(false);
        }
      );

      return () => unsubscribe();
    }, [user?.uid])
  );

  const onRefresh = () => {
    setRefreshing(true);
  };

  const filteredEvents = events.filter((item) => {
    if (filter === "organized") {
      return item.creatorId === user?.uid || item.delegatedTo === user?.uid;
    }
    if (filter === "joined") {
      return item.isAttending === true;
    }
    return true;
  });

  const formatEventDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const localeMap = { pl: "pl-PL", en: "en-US", uk: "uk-UA", ru: "ru-RU" };
    return date.toLocaleDateString(localeMap[language] || "pl-PL", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      open: t("statusOpen"),
      confirmed: t("statusConfirmed"),
      cancelled: t("statusCancelled"),
      past: t("statusPast"),
    };
    return (
      <View
        style={[
          styles.statusBadge,
          status === "open" && styles.statusBadgeOpen,
          status === "confirmed" && styles.statusBadgeConfirmed,
          status === "cancelled" && styles.statusBadgeCancelled,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            status === "open" && styles.statusTextOpen,
            status === "confirmed" && styles.statusTextConfirmed,
            status === "cancelled" && styles.statusTextCancelled,
          ]}
        >
          {statusMap[status] || status}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.screen}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
      />

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === "all" && styles.filterBtnActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
            ]}
          >
            {t("all")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            filter === "organized" && styles.filterBtnActive,
          ]}
          onPress={() => setFilter("organized")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "organized" && styles.filterTextActive,
            ]}
          >
            {t("organized")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            filter === "joined" && styles.filterBtnActive,
          ]}
          onPress={() => setFilter("joined")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "joined" && styles.filterTextActive,
            ]}
          >
            {t("joined")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>{t("noEventsYet")}</Text>
          <Text style={styles.emptyDesc}>{t("noEventsDesc")}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const isCreator = item.creatorId === user?.uid;
            const required = item.requiredCount || 10;
            // Simulated or loaded count
            const going = item.goingCount || 0;
            const percent = Math.min(100, Math.round((going / required) * 100));

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/event/${item.id}`)}
              >
                <LinearGradient
                  colors={gradients.card}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.6, y: 1 }}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeGroup}>
                      {renderStatusBadge(item.status)}
                      <View
                        style={[
                          styles.roleBadge,
                          isCreator ? styles.roleBadgeCreator : styles.roleBadgeParticipant,
                        ]}
                      >
                        <Text style={styles.roleText}>
                          {isCreator ? t("creatorBadge") : t("participantBadge")}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.dateText}>
                      {formatEventDate(item.dateTime)}
                    </Text>
                  </View>

                  <Text style={styles.eventTitle}>{item.title}</Text>

                  {item.location ? (
                    <View style={styles.locationRow}>
                      <Feather name="map-pin" size={14} color={colors.textSubtle} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  ) : null}

                  {/* Quorum Progress Bar */}
                  <View style={styles.quorumContainer}>
                    <View style={styles.quorumRow}>
                      <Text style={styles.quorumLabel}>
                        {t("needed")}: <Text style={styles.quorumNum}>{going} / {required} {t("people")}</Text>
                      </Text>
                      <Text style={styles.spotsLeftText}>
                        {required - going > 0
                          ? `${t("spotsLeft")}: ${required - going}`
                          : `🎉 ${t("quorumReached")}`}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.max(8, percent)}%` },
                        ]}
                      />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Floating Action Button (Create Event) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push("/event/create")}
      >
        <LinearGradient
          colors={gradients.navy}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgTop,
  },
  filtersContainer: {
    flexDirection: "row",
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: 4,
    ...shadow.card,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.md,
  },
  filterBtnActive: {
    backgroundColor: colors.navy,
    ...shadow.button,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  filterTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  card: {
    borderRadius: radius.xl,
    ...shadow.card,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 20,
    borderRadius: radius.xl,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
  },
  statusBadgeOpen: {
    backgroundColor: colors.successSoft,
  },
  statusBadgeConfirmed: {
    backgroundColor: colors.primarySoft,
  },
  statusBadgeCancelled: {
    backgroundColor: colors.dangerSoft,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: colors.textSubtle,
  },
  statusTextOpen: {
    color: colors.success,
  },
  statusTextConfirmed: {
    color: colors.accentDeep,
  },
  statusTextCancelled: {
    color: colors.danger,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roleBadgeCreator: {
    backgroundColor: colors.warnSoft,
  },
  roleBadgeParticipant: {
    backgroundColor: colors.primarySoft,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSubtle,
    fontWeight: "700",
  },
  eventTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  quorumContainer: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.md,
    padding: 14,
  },
  quorumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  quorumLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  quorumNum: {
    fontWeight: "800",
    color: colors.text,
  },
  spotsLeftText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  progressBar: {
    height: 7,
    backgroundColor: colors.borderStrong,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  fab: {
    position: "absolute",
    right: 22,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.glow,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  fabIcon: {
    fontSize: 32,
    fontWeight: "300",
    color: colors.textInverse,
    marginTop: -3,
  },
});
