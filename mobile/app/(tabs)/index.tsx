import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { useI18n } from "../../src/i18n";
import { subscribeEvents, EventItem } from "../../src/services/eventsService";

export default function MyEventsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t, language } = useI18n();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "organized" | "joined">("all");

  useEffect(() => {
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
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const filteredEvents = events.filter((item) => {
    if (filter === "organized") {
      return item.creatorId === user?.uid || item.delegatedTo === user?.uid;
    }
    if (filter === "joined") {
      // In Step 3, if not creator, considered joined/attending or listed
      return item.creatorId !== user?.uid;
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
          <ActivityIndicator size="large" color="#10b981" />
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
              tintColor="#10b981"
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
                activeOpacity={0.8}
                onPress={() => router.push(`/event/${item.id}`)}
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
                    <Text style={styles.locationIcon}>📍</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {item.location}
                    </Text>
                  </View>
                ) : null}

                {/* Quorum Progress Bar */}
                <View style={styles.quorumContainer}>
                  <View style={styles.quorumRow}>
                    <Text style={styles.quorumLabel}>
                      {t("needed")}: <Text style={styles.quorumNum}>{required} {t("people")}</Text>
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
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  filtersContainer: {
    flexDirection: "row",
    backgroundColor: "#151d2d",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 11,
  },
  filterBtnActive: {
    backgroundColor: "#25334c",
  },
  filterText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#151d2d",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  statusBadgeOpen: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  statusBadgeConfirmed: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  statusBadgeCancelled: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  statusTextOpen: {
    color: "#10b981",
  },
  statusTextConfirmed: {
    color: "#3b82f6",
  },
  statusTextCancelled: {
    color: "#ef4444",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeCreator: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  roleBadgeParticipant: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#cbd5e1",
  },
  dateText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 6,
  },
  locationIcon: {
    fontSize: 13,
  },
  locationText: {
    fontSize: 13,
    color: "#94a3b8",
    flex: 1,
  },
  quorumContainer: {
    backgroundColor: "#1c273c",
    borderRadius: 12,
    padding: 12,
  },
  quorumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  quorumLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
  quorumNum: {
    fontWeight: "700",
    color: "#ffffff",
  },
  spotsLeftText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10b981",
  },
  progressBar: {
    height: 7,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 10,
  },
});
