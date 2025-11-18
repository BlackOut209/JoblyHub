// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// 🔹 Разрешаем CORS для Vite
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

// 🔹 Обязательно парсим JSON-тело
app.use(express.json());

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Проверка конфигурации
if (!BOT_TOKEN || !CHAT_ID) {
  console.warn(
    "[WARN] TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы в .env(.local). " +
    "Сервер поднимется, но отправка в Telegram будет падать."
  );
}

// Проверка "живости"
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Приём формы
app.post("/api/telegram", async (req, res) => {
  try {
    console.log("Получено тело запроса:", req.body); // 👈 для отладки

    const { name, tg, email, job, city, message } = req.body || {};

    if (!name || !tg) {
      return res.status(400).json({ ok: false, error: "name и tg обязательны" });
    }
    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ ok: false, error: "Сервер не сконфигурирован (нет токена/чат-айди)" });
    }

    const text =
      `<b>Новая заявка с Jobly</b>\n` +
      `👤 Имя: ${escapeHtml(name)}\n` +
      `✈️ Telegram: ${escapeHtml(tg)}\n` +
      (email ? `📧 Email: ${escapeHtml(email)}\n` : "") +
      (job ? `💼 Вакансия: ${escapeHtml(job)}\n` : "") +
      (city ? `📍 Город: ${escapeHtml(city)}\n` : "") +
      (message ? `📝 Сообщение:\n${escapeHtml(message)}\n` : "");

    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    const data = await resp.json();
    if (!data.ok) {
      return res.status(502).json({ ok: false, error: data.description || "Telegram error" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[/api/telegram] error:", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] listening on http://127.0.0.1:${PORT}`);
});

