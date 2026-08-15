import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const telegramCheckSchema = z.object({
  username: z.string().min(1).max(64),
});

export const Route = createFileRoute("/api/public/check-telegram")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let username: string;
        try {
          const parsed = telegramCheckSchema.parse(await request.json());
          username = parsed.username.replace(/^@/, "").trim();
        } catch {
          return Response.json({ exists: false, error: "invalid" }, { status: 400 });
        }

        if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) {
          return Response.json({ exists: false, reason: "format" });
        }

        try {
          const tgRes = await fetch(`https://t.me/${username}`, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; TelegramCheck/1.0)" },
          });
          if (!tgRes.ok) return Response.json({ exists: false, reason: "not_found" });
          const html = await tgRes.text();
          const exists =
            html.includes("tgme_page_title") || html.includes("tgme_page_photo");
          return Response.json({ exists, reason: exists ? "ok" : "not_found" });
        } catch (err) {
          console.error("Telegram username check failed:", err);
          return Response.json({ exists: true, reason: "check_unavailable" });
        }
      },
    },
  },
});
