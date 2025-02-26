const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const fs = require("fs-extra");

const TOKEN = process.env.DISCORD_BOT_TOKEN;  // Используем переменную окружения для токена
const CHANNEL_ID = "1344356587682140170";  // Убедись, что это правильный ID канала
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

// Функция для обновления закрепленного сообщения
async function updatePinnedMessage(channel) {
  let messages = await channel.messages.fetch({ limit: 10 });
  let pinnedMessage = messages.get(loadMessageId()); // Получаем ID закрепленного сообщения

  let content = `**${lastData.username}** – 💰 ${lastData.profit} ₽`;

  if (pinnedMessage) {
    console.log("Обновление закрепленного сообщения...");
    await pinnedMessage.edit(content);
  } else {
    console.log("Создание нового закрепленного сообщения...");
    let newMessage = await channel.send(content);
    await newMessage.pin();
    saveMessageId(newMessage.id); // Сохраняем ID закрепленного сообщения
  }
}

// API для получения данных от расширения
app.post("/update", async (req, res) => {
  console.log("Получены данные от расширения:", req.body);
  lastData = req.body;
  try {
    let channel = await bot.channels.fetch(CHANNEL_ID);
    await updatePinnedMessage(channel);
    res.sendStatus(200);
  } catch (error) {
    console.error("Ошибка при обновлении сообщения:", error);
    res.sendStatus(500); // Отправляем ошибку, если что-то пошло не так
  }
});

// Запускаем бота
bot.once("ready", async () => {
  console.log(`✅ Бот запущен как ${bot.user.tag}`);
  try {
    let channel = await bot.channels.fetch(CHANNEL_ID);
    console.log("Канал найден:", channel.name);
    await updatePinnedMessage(channel);
  } catch (error) {
    console.log("Ошибка при получении канала:", error);
  }
});

// Вход в Discord с использованием токена
bot.login(TOKEN).catch((error) => {
  console.error("Ошибка при входе в Discord с токеном:", error);
});

app.listen(3000, () => console.log("🚀 API запущено на порту 3000"));
