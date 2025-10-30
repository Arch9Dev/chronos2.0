import { writable, get } from 'svelte/store';

// Define a type for your notifications
export interface Notification {
  id: string;
  message: string;
  read: boolean;
}

// Initialize the store with an explicit type
export const notifications = writable<Notification[]>([]);

// Add a new notification
export function addNotification(message: string) {
  notifications.update((n) => [
    ...n,
    { id: crypto.randomUUID(), message, read: false }
  ]);
}

// Mark all notifications as read
export function markAllRead() {
  notifications.update((n) => n.map((notif) => ({ ...notif, read: true })));
}

// Get unread count as a derived helper function
export function getUnreadCount(): number {
  const n = get(notifications);
  return n.filter((x) => !x.read).length;
}
