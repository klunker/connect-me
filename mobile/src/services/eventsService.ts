import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface EventItem {
  id: string;
  title: string;
  description?: string;
  location: string;
  dateTime: any;
  creatorId: string;
  creatorName: string;
  requiredCount: number;
  isRecurring: boolean;
  recurrenceRule?: string;
  parentEventId?: string | null;
  status: "open" | "confirmed" | "cancelled" | "past";
  delegatedTo?: string | null;
  createdAt: any;
  // Computed fields
  goingCount?: number;
  myRole?: "creator" | "participant" | "delegated";
  myStatus?: "going" | "not_going" | "confirmed" | "attended" | "no_show";
}

export interface ParticipantItem {
  id: string;
  userId: string;
  displayName: string;
  status: "going" | "not_going" | "confirmed" | "attended" | "no_show";
  isGuest: boolean;
  respondedAt: any;
}

/**
 * Subscribes to events collection.
 * Since events have public read in firestore.rules, all active events can be fetched in real-time.
 */
export function subscribeEvents(
  userId: string | undefined,
  onUpdate: (events: EventItem[]) => void,
  onError: (err: any) => void
) {
  const eventsRef = collection(db, "events");

  return onSnapshot(
    eventsRef,
    async (snapshot) => {
      const items: EventItem[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const item: EventItem = {
          id: docSnap.id,
          title: data.title || "",
          description: data.description,
          location: data.location || "",
          dateTime: data.dateTime,
          creatorId: data.creatorId || "",
          creatorName: data.creatorName || "",
          requiredCount: Number(data.requiredCount) || 10,
          isRecurring: !!data.isRecurring,
          recurrenceRule: data.recurrenceRule,
          parentEventId: data.parentEventId,
          status: data.status || "open",
          delegatedTo: data.delegatedTo,
          createdAt: data.createdAt,
          goingCount: 0,
        };

        if (userId) {
          if (item.creatorId === userId) {
            item.myRole = "creator";
          } else if (item.delegatedTo === userId) {
            item.myRole = "delegated";
          }
        }

        items.push(item);
      }

      // Sort by date (upcoming first)
      items.sort((a, b) => {
        const timeA = a.dateTime?.toMillis ? a.dateTime.toMillis() : new Date(a.dateTime).getTime() || 0;
        const timeB = b.dateTime?.toMillis ? b.dateTime.toMillis() : new Date(b.dateTime).getTime() || 0;
        return timeA - timeB;
      });

      onUpdate(items);
    },
    onError
  );
}

/**
 * Subscribes to participants of a specific event.
 */
export function subscribeEventParticipants(
  eventId: string,
  onUpdate: (participants: ParticipantItem[]) => void
) {
  const participantsRef = collection(db, "events", eventId, "participants");
  return onSnapshot(participantsRef, (snapshot) => {
    const list: ParticipantItem[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as any) });
    });
    onUpdate(list);
  });
}
