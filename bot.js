const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const fs = require("fs-extra");
const cors = require("cors"); // ✅ Импортируем CORS

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const MESSAGE_ID_FILE = "data.json";

const app = express();
app.use(cors()); // ✅ Разрешаем CORS для всех доменов
app.use(express.json());

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let lastData = { username: "Неизвестно", profit: "0" };

function loadMessageId() {
  try {
    return fs.readJsonSync(MESSAGE_ID_FILE).messageId || null;
  } catch (error) {
    return null;
  }
}

function saveMessageId(id) {
  fs.writeJsonSync(MESSAGE_ID_FILE, { messageId: id });
}

async function delete_system_messages(channel) {
  let messages = await channel.messages.fetch({ limit: 100 });
  let systemMessages = messages.filter(msg => msg.author.bot || msg.system);
  for (let msg of systemMessages.values()) {
    await msg.delete();
  }
}

async function updatePinnedMessage(channel) {
  await delete_system_messages(channel);
  let content = `**${lastData.username}** – 💰 ${lastData.profit} ₽`;
  let messages = await channel.messages.fetch({ limit: 10 });
  let pinnedMessage = messages.get(loadMessageId());

  if (pinnedMessage) {
    await pinnedMessage.edit(content);
  } else {
    let newMessage = await channel.send(content);
    await newMessage.pin();
    saveMessageId(newMessage.id);
  }
}

// ✅ API для обновления данных
app.post("/update", async (req, res) => {
  lastData = req.body;
  let channel = await bot.channels.fetch(CHANNEL_ID);
  await updatePinnedMessage(channel);
  res.sendStatus(200);
});

bot.once("ready", async () => {
  console.log(`✅ Бот запущен как ${bot.user.tag}`);
  let channel = await bot.channels.fetch(CHANNEL_ID);
  await updatePinnedMessage(channel);
});

bot.login(TOKEN);
app.listen(3000, () => console.log("🚀 API запущено на порту 3000"));
