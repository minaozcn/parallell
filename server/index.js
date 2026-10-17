import express from "express";

const app = express();
const PORT = 3000;

// Şimdilik sabit veri. Bir sonraki adımda MySQL'den gelecek.
const currentCapsule = {
  id: 1,
  prompt: "Show us your sky.",
  participantCount: 0,
  opensAt: "20:00",
  imageUrl: "https://picsum.photos/600/400",
};

app.get("/api/capsules/current", (req, res) => {
  res.json(currentCapsule);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
