const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const fs = require("fs-extra");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const MESSAGE_ID_FILE = "data.json";

const app = express();
app.use(express.json());

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let lastData = { username: "Неизвестно", profit: "0" };

// Функция для загрузки ID последнего закрепленного сообщения
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

// Функция для удаления ВСЕХ закрепленных сообщений
async function deleteAllPinnedMessages(channel) {
  try {
    const pinnedMessages = await channel.messages.fetchPinned();
    for (const message of pinnedMessages.values()) {
      await message.unpin();
      await message.delete();
      console.log(`🗑️ Удалено закрепленное сообщение: ${message.id}`);
    }
  } catch (error) {
    console.error("Ошибка при удалении закрепленных сообщений:", error.message);
  }
}

// Функция для обновления закрепленного сообщения
async function updatePinnedMessage(channel) {
  await deleteAllPinnedMessages(channel); // Удаляем ВСЕ закрепленные сообщения

  const content = `**${lastData.username}** – 💰 ${lastData.profit} ₽`;
  const newMessage = await channel.send(content);
  await newMessage.pin();
  saveMessageId(newMessage.id);

  console.log("📌 Новое сообщение закреплено:", newMessage.id);
}

// API для получения данных от расширения
app.post("/update", async (req, res) => {
  console.log("📩 Получены данные:", req.body); // Логирование полученных данных
  
  lastData = req.body;

  try {
    let channel = await bot.channels.fetch(CHANNEL_ID);
    await updatePinnedMessage(channel);
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Ошибка при обновлении сообщения:", error);
    res.sendStatus(500);
  }
});


// Запуск бота
bot.once("ready", async () => {
  console.log(`✅ Бот запущен как ${bot.user.tag}`);
  const channel = await bot.channels.fetch(CHANNEL_ID);
  await updatePinnedMessage(channel);
});

bot.login(TOKEN);
app.listen(3000, () => console.log("🚀 API запущено на порту 3000"));
