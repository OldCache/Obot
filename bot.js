const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const fs = require("fs-extra");

const TOKEN = process.env.DISCORD_BOT_TOKEN; // Токен бота
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID; // ID Discord-канала
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*"; // CORS из переменных окружения

const app = express();
app.use(express.json()); // Чтобы сервер принимал JSON-формат

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Для чтения контента сообщений
  ],
});

const MESSAGE_ID_FILE = "data.json"; // Файл для хранения ID закрепленного сообщения
let lastData = { username: "Неизвестно", profit: "0" };

// Функция для загрузки ID закрепленного сообщения
function loadMessageId() {
  try {
    return fs.readJsonSync(MESSAGE_ID_FILE).messageId || null;
  } catch (error) {
    return null;
  }
}

// Функция для сохранения ID закрепленного сообщения
function saveMessageId(id) {
  fs.writeJsonSync(MESSAGE_ID_FILE, { messageId: id });
}

// Функция для удаления системных сообщений (например, сообщений о закреплении)
async function delete_system_messages(channel) {
  let messages = await channel.messages.fetch({ limit: 100 }); // Получаем последние 100 сообщений
  let systemMessages = messages.filter((msg) => msg.author.bot || msg.system);

  for (let msg of systemMessages.values()) {
    await msg.delete(); // Удаляем все системные сообщения и сообщения от бота
  }
}

// Функция для обновления закрепленного сообщения
async function updatePinnedMessage(channel) {
  await delete_system_messages(channel); // Удаляем системные сообщения

  let content = `**${lastData.username}** – 💰 ${lastData.profit} ₽`;

  // Пытаемся найти сообщение, которое нужно обновить
  let messages = await channel.messages.fetch({ limit: 10 });
  let pinnedMessage = messages.get(loadMessageId()); // Получаем ID закрепленного сообщения

  if (pinnedMessage) {
    // Если сообщение найдено, обновляем его
    await pinnedMessage.edit(content);
  } else {
    // Если сообщения нет, отправляем новое
    let newMessage = await channel.send(content);
    await newMessage.pin();
    saveMessageId(newMessage.id); // Сохраняем ID нового закрепленного сообщения
  }
}

// API для получения данных от расширения
app.post("/update", async (req, res) => {
  // Обновляем данные с полученной информации
  if (req.body.username && req.body.profit) {
    lastData = req.body; // Получаем данные от расширения
    let channel = await bot.channels.fetch(CHANNEL_ID);
    await updatePinnedMessage(channel);
    
    console.log(`Получены данные: ${JSON.stringify(lastData)}`);

    // ✅ CORS
    res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    res.sendStatus(200);
  } else {
    // Если данных нет, возвращаем ошибку
    res.status(400).send("Ошибка: недостаточно данных.");
  }
});

// Обрабатываем preflight-запросы
app.options("/update", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

// Запускаем бота
bot.once("ready", async () => {
  console.log(`✅ Бот запущен как ${bot.user.tag}`);
  let channel = await bot.channels.fetch(CHANNEL_ID);
  await updatePinnedMessage(channel);
});

bot.login(TOKEN);
app.listen(3000, () => console.log("🚀 API запущено на порту 3000"));
