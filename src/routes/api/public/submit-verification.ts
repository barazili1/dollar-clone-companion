import { createFileRoute } from "@tanstack/react-router";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const Route = createFileRoute("/api/public/submit-verification")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();

        const str = (key: string, max: number) =>
          String(form.get(key) ?? "").slice(0, max);

        const userId = str("userId", 200);
        const telegramUsername = str("telegramUsername", 200);
        const selectedGame = str("selectedGame", 50);
        const timestamp = str("timestamp", 200);

        const pickFile = (key: string) => {
          const value = form.get(key);
          if (value && typeof value !== "string" && value.size <= MAX_FILE_SIZE) {
            return value;
          }
          return null;
        };

        const deposit = pickFile("depositImage");
        const idImg = pickFile("idImage");

        const botToken = process.env["TELEGRAM_BOT_TOKEN"];
        const chatId = process.env["TELEGRAM_CHAT_ID"];

        const gameDisplayName =
          selectedGame === "apple"
            ? "تفاحة الحظ (Apple of Fortune)"
            : selectedGame === "mines"
              ? "الألغام (Gems Mines)"
              : selectedGame || "VIP Script";

        const formattedTime =
          timestamp ||
          new Date().toLocaleString("ar-EG", {
            timeZone: "Africa/Cairo",
            dateStyle: "full",
            timeStyle: "medium",
          });

        const caption = `طلب تفعيل جديد 🔔
━━━━━━━━━━━━━━━━━
🆔 ID: ${userId || "غير محدد"}
👤 يوزر التلجرام: ${telegramUsername.startsWith("@") ? telegramUsername : `@${telegramUsername}`}
🎮 اللعبة: ${gameDisplayName}
⏰ الوقت: ${formattedTime}`;

        if (!botToken || !chatId) {
          console.warn("TELEGRAM_BOT_TOKEN / CHAT_ID not set. Logging locally:", {
            userId,
            telegramUsername,
            selectedGame,
            depositSize: deposit?.size,
            idImgSize: idImg?.size,
          });
          return Response.json({ success: true, telegramSent: false });
        }

        const api = (method: string) =>
          `https://api.telegram.org/bot${botToken}/${method}`;

        try {
          if (deposit && idImg) {
            const mediaForm = new FormData();
            mediaForm.append("chat_id", chatId);
            mediaForm.append(
              "media",
              JSON.stringify([
                { type: "photo", media: "attach://deposit_file", caption },
                { type: "photo", media: "attach://id_file" },
              ]),
            );
            mediaForm.append("deposit_file", deposit, deposit.name || "deposit-image.jpg");
            mediaForm.append("id_file", idImg, idImg.name || "id-image.jpg");

            const tgRes = await fetch(api("sendMediaGroup"), {
              method: "POST",
              body: mediaForm,
            });
            if (!tgRes.ok) {
              console.error("Telegram sendMediaGroup failed:", await tgRes.text());
            }
          } else if (deposit || idImg) {
            const fileToSend = deposit ?? idImg!;
            const photoForm = new FormData();
            photoForm.append("chat_id", chatId);
            photoForm.append("caption", caption);
            photoForm.append(
              "photo",
              fileToSend,
              fileToSend.name || "verification-image.jpg",
            );

            const tgRes = await fetch(api("sendPhoto"), {
              method: "POST",
              body: photoForm,
            });
            if (!tgRes.ok) {
              console.error("Telegram sendPhoto failed:", await tgRes.text());
            }
          } else {
            const tgRes = await fetch(api("sendMessage"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: caption }),
            });
            if (!tgRes.ok) {
              console.error("Telegram sendMessage failed:", await tgRes.text());
            }
          }

          return Response.json({ success: true, telegramSent: true });
        } catch (err) {
          console.error("Telegram verification send failed:", err);
          return Response.json({
            success: true,
            telegramSent: false,
            warning: "Logged locally, Telegram forwarding error",
          });
        }
      },
    },
  },
});
