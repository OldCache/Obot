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

// Функция для удаления последнего закрепленного сообщения
async function deleteLastPinnedMessage(channel) {
  const lastMessageId = loadMessageId();
  if (lastMessageId) {
    try {
      const message = await channel.messages.fetch(lastMessageId);
      if (message) {
        await message.unpin();
        await message.delete();
        console.log("🗑️ Удалено предыдущее закрепленное сообщение.");
      }
    } catch (error) {
      console.error("Ошибка при удалении сообщения:", error.message);
    }
  }
}

// Функция для обновления закрепленного сообщения
async function updatePinnedMessage(channel) {
  await deleteLastPinnedMessage(channel); // Удаляем предыдущее сообщение

  const content = `**${lastData.username}** – 💰 ${lastData.profit} ₽`;
  const newMessage = await channel.send(content);
  await newMessage.pin();
  saveMessageId(newMessage.id);

  console.log("📌 Новое сообщение закреплено:", newMessage.id);
}

// API для получения данных от расширения
app.post("/update", async (req, res) => {
  lastData = req.body;
  const channel = await bot.channels.fetch(CHANNEL_ID);
  await updatePinnedMessage(channel);
  res.sendStatus(200);
});

// Запуск бота
bot.once("ready", async () => {
  console.log(`✅ Бот запущен как ${bot.user.tag}`);
  const channel = await bot.channels.fetch(CHANNEL_ID);
  await updatePinnedMessage(channel);
});

bot.login(TOKEN);
app.listen(3000, () => console.log("🚀 API запущено на порту 3000"));
