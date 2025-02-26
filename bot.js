const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const fs = require("fs-extra");

const TOKEN = process.env.DISCORD_BOT_TOKEN;  // Токен из переменной окружения
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;  // ID канала из переменной окружения
const MESSAGE_ID_FILE = "data.json"; // Файл для хранения ID закрепленного сообщения

const app = express();
app.use(express.json());

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // Если ты планируешь получать контент сообщений
  ]
});

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

// Функция для удаления предыдущего закрепленного сообщения и уведомлений
async function deletePreviousPinnedMessages(channel) {
  let messages = await channel.messages.fetch({ limit: 10 });
  let pinnedMessages = messages.filter(msg => msg.pinned);
  
  // Удаляем два закрепленных сообщения (если они есть)
  let deleteCount = 0;
  for (let msg of pinnedMessages.values()) {
    if (deleteCount < 2) {
      await msg.delete();
      deleteCount++;
    }
  }
}

// Функция для обновления закрепленного сообщения
async function updatePinnedMessage(channel) {
  await deletePreviousPinnedMessages(channel); // Удаляем два предыдущих закрепленных сообщения

  let content = `**${lastData.username}** – 💰 ${lastData.profit} ₽`;

  // Пытаемся найти сообщение, которое нужно обновить
  let messages = await channel.messages.fetch({ limit: 10 });
  let pinnedMessage = messages.get(loadMessageId()); // Получаем ID закрепленного сообщения

  if (pinnedMessage) {
    // Если такое сообщение найдено, обновляем его
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
  lastData = req.body;
  let channel = await bot.channels.fetch(CHANNEL_ID);
  await updatePinnedMessage(channel);
  res.sendStatus(200);
});

// Запускаем бота
bot.once("ready", async () => {
  console.log(`✅ Бот запущен как ${bot.user.tag}`);
  let channel = await bot.channels.fetch(CHANNEL_ID);
  await updatePinnedMessage(channel);
});

bot.login(TOKEN);
app.listen(3000, () => console.log("🚀 API запущено на порту 3000"));
