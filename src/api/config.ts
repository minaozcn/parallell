import Constants from "expo-constants";

// Expo, uygulamayı hangi bilgisayardan yüklediğimizi biliyor (ör. "172.20.10.2:8081").
// Express sunucusu da aynı bilgisayarda çalıştığı için IP'yi buradan alıp portu 3000 yapıyoruz.
const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";

export const API_URL = `http://${host}:3000`;
