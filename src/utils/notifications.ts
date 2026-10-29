import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

// Bildirimler telefonda zamanlanır (yerel bildirim): kapsülün açılış saati zaten belli, sunucuya gerek yok.

export type NotificationPrefs = {
  reveal: boolean; // kapsül açılınca haber ver
  reminder: boolean; // katılmadıysan son 1 saat kala hatırlat
  asked: boolean; // kullanıcıya bir kez soruldu mu?
};

const KEY = "parallell-notification-prefs";
const DEFAULTS: NotificationPrefs = { reveal: false, reminder: false, asked: false };

export async function getPrefs(): Promise<NotificationPrefs> {
  const raw = await SecureStore.getItemAsync(KEY);
  return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
}

export async function savePrefs(prefs: NotificationPrefs) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(prefs));
}

// İzin varsa true; yoksa bir kez ister.
export async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// Güncel kapsüle göre zamanlanmış bildirimleri baştan kurar.
export async function syncCapsuleNotifications(capsule: { prompt: string; opensAt: string; joined: boolean }) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const prefs = await getPrefs();
  if (!prefs.reveal && !prefs.reminder) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  const opensAt = new Date(capsule.opensAt).getTime();
  const reminderAt = opensAt - 60 * 60_000;
  const now = Date.now();

  if (prefs.reveal && opensAt > now) {
    await Notifications.scheduleNotificationAsync({
      content: { title: "Kapsül açıldı ✦", body: `"${capsule.prompt}": dünyanın dört bir yanından anlar seni bekliyor.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(opensAt) },
    });
  }
  if (prefs.reminder && !capsule.joined && reminderAt > now) {
    await Notifications.scheduleNotificationAsync({
      content: { title: "Kapsülün açılmasına 1 saat var", body: `Bugünün anı: "${capsule.prompt}"` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminderAt) },
    });
  }
}
