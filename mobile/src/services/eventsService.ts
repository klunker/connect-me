import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
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

        // Get actual participants count
        try {
          const partsRef = collection(db, "events", docSnap.id, "participants");
          const partsSnap = await getDocs(partsRef);
          let count = 0;
          partsSnap.forEach((p) => {
            const pData = p.data();
            if (pData.status === "going" || pData.status === "confirmed") {
              count++;
            }
          });
          item.goingCount = count;
        } catch (e) {
          console.warn("Failed to fetch participant count for event:", docSnap.id, e);
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

export interface CreateEventInput {
  title: string;
  description?: string;
  location: string;
  dateTime: Date;
  requiredCount: number;
  isRecurring: boolean;
  recurrenceRule?: string;
}

/**
 * Creates a new event in Firestore conforming to security rules.
 * Also registers the creator as the first participant with status 'going'.
 */
export async function createEvent(
  input: CreateEventInput,
  user: { uid: string; displayName: string }
): Promise<string> {
  const eventsCollection = collection(db, "events");

  const newDocRef = doc(eventsCollection);

  const payload: any = {
    title: input.title.trim(),
    location: input.location.trim(),
    dateTime: Timestamp.fromDate(input.dateTime),
    creatorId: user.uid,
    creatorName: user.displayName || "Organizer",
    requiredCount: Math.max(1, Math.min(100, Math.floor(input.requiredCount))),
    isRecurring: input.isRecurring,
    status: "open",
    createdAt: serverTimestamp(),
  };

  if (input.description && input.description.trim()) {
    payload.description = input.description.trim();
  }

  if (input.isRecurring && input.recurrenceRule) {
    payload.recurrenceRule = input.recurrenceRule;
  }

  await setDoc(newDocRef, payload);

  // Add creator as first participant
  const creatorPartRef = doc(db, "events", newDocRef.id, "participants", user.uid);
  await setDoc(creatorPartRef, {
    userId: user.uid,
    displayName: user.displayName || "Organizer",
    status: "going",
    isGuest: false,
    respondedAt: serverTimestamp(),
  });

  return newDocRef.id;
}

/**
 * Updates an existing event.
 */
export async function updateEvent(
  eventId: string,
  input: Partial<CreateEventInput> & { status?: "open" | "confirmed" | "cancelled" | "past" }
) {
  const eventDocRef = doc(db, "events", eventId);
  const payload: any = {
    updatedAt: serverTimestamp(),
  };

  if (input.title) payload.title = input.title.trim();
  if (input.location) payload.location = input.location.trim();
  if (input.description !== undefined) payload.description = input.description.trim() || null;
  if (input.dateTime) payload.dateTime = Timestamp.fromDate(input.dateTime);
  if (input.requiredCount) payload.requiredCount = Math.max(1, Math.min(100, Math.floor(input.requiredCount)));
  if (input.isRecurring !== undefined) payload.isRecurring = input.isRecurring;
  if (input.recurrenceRule !== undefined) payload.recurrenceRule = input.recurrenceRule || null;
  if (input.status) payload.status = input.status;

  await updateDoc(eventDocRef, payload);
}

/**
 * Deletes an event.
 */
export async function deleteEvent(eventId: string) {
  const eventDocRef = doc(db, "events", eventId);
  await deleteDoc(eventDocRef);
}
