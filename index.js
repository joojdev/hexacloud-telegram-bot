require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { createSession, getSessionsByChatId, deleteSession } = require('./database');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {
  polling: true,
  request: {
    agentOptions: {
      keepAlive: true,
      family: 4
    }
  }
});

function pad(number) {
  return String(number).length > 1 ? number : '0' + number;
}

function getTimeDiff(lastTimestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - lastTimestamp;

  const seconds = diff % 60;
  const minutes = Math.floor(diff / 60) % 60;
  const hours = Math.floor(diff / 3600) % 24;
  const days = Math.floor(diff / 86400) % 30;
  const months = Math.floor(diff / (86400 * 30));

  if (months > 0) return `${months}m atrás`;
  if (days > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (minutes > 0) return `${minutes}min atrás`;
  return `${seconds}s atrás`;
}

function getCommandsText() {
  return `\
Comandos:

/commands - Retorna os comandos.
/session [sessão] - Retorna últimos dados da sessão especificada.
/sessions - Retorna últimos dados das sessões na lista de análise.
/listsessions - Lista sessões da lista de análise.
/addsession [sessão] - Adiciona sessão para lista de análise.
/removesession [sessão] - Remove sessão da lista de análise.`
}

async function fetchSessionAndSend(chatId, session) {
  try {
    const response = await axios.get(`https://hexacloud.com.br/json_api/getData.php?session=${session}`);

    if (!response.data.success) {
      bot.sendMessage(chatId, 'É provável que essa sessão não exista.');
    } else {
      const topics = response.data.result;

      if (!Object.keys(topics).length) return bot.sendMessage(chatId, 'Sessão vázia.');

      const text = `Sessão ${session}\n\n` + Object.keys(topics).map((topic) => {
        const { last_value, last_timestamp } = topics[topic];
        const currentDate = new Date(last_timestamp * 1000);

        const hours = pad(currentDate.getHours());
        const minutes = pad(currentDate.getMinutes());
        const seconds = pad(currentDate.getSeconds());

        const day = pad(currentDate.getDate());
        const month = pad(currentDate.getMonth() + 1);
        const year = currentDate.getFullYear();

        const timeDiff = getTimeDiff(last_timestamp);

        return [
          `${topic}: ${last_value}`,
          `${day}/${month}/${year} | ${hours}:${minutes}:${seconds}`,
          `⏳ ${timeDiff}`
        ].map((_) => `    ${_}`).join`\n`;
      }).join`\n\n`;

      bot.sendMessage(chatId, text);
    }
  } catch (error) {
    bot.sendMessage(chatId, 'Ocorreu um erro ao buscar os dados.');
    console.error(error);
  }
}

bot.on('message', async (message) => {
  const chatId = message.chat.id;
  if (!message.text.startsWith('/')) return bot.sendMessage(chatId, 'Meus comandos: /commands');

  const splitMessage = message.text.slice(1).split(/ +/);
  const commandName = splitMessage[0].toLowerCase();
  const commandArguments = splitMessage.slice(1);

  if (commandName == 'start') {
    bot.sendMessage(chatId, getCommandsText());
  } else if (commandName == 'session') {
    if (commandArguments.length != 1) return bot.sendMessage(chatId, 'Uso: /session [sessão]');
    
    const session = commandArguments[0];

    await fetchSessionAndSend(chatId, session);
  } else if (commandName == 'comandos') {
    bot.sendMessage(chatId, getCommandsText());
  } else if (commandName == 'addsession') {
    if (commandArguments.length != 1) return bot.sendMessage(chatId, 'Uso: /addsession [sessão]');

    const session = commandArguments[0];

    try {
      result = createSession(chatId, session);
      bot.sendMessage(chatId, 'Sessão adicionada com sucesso!');
    } catch(error) {
      bot.sendMessage(chatId, 'Essa sessão já foi adicionada!');
    }
  } else if (commandName == 'sessions') {
    const sessions = getSessionsByChatId(chatId).map((session) => session.name);

    if (!sessions.length) return bot.sendMessage(chatId, 'Você não tem nenhuma sessão adicionada!\n\nAdicione utilizando /addsession [sessão]');

    for (const session of sessions) {
      await fetchSessionAndSend(chatId, session);
    }
  } else if (commandName == 'removesession') {
    if (commandArguments.length != 1) return bot.sendMessage(chatId, 'Uso: /removesession [sessão]');

    const session = commandArguments[0];

    const sessions = getSessionsByChatId(chatId).map((session) => session.name);

    if (!sessions.includes(session)) return bot.sendMessage(chatId, 'Essa sessão ainda não foi adicionada!');

    deleteSession(chatId, session);

    bot.sendMessage(chatId, 'Sessão removida com sucesso!');
  } else if (commandName == 'listsessions') {
    const sessions = getSessionsByChatId(chatId).map((session) => session.name);

    if (!sessions.length) return bot.sendMessage(chatId, 'Você não tem sessões adicionadas!');

    let response = 'Sessões:\n\n';

    response += sessions.join`\n`;

    bot.sendMessage(chatId, response);
  } else {
    bot.sendMessage(chatId, 'Meus comandos: /commands');
  }
});

console.log('Bot is running...');

const { createServer, startServer } = require('./server');

const httpServer = createServer();
startServer(httpServer);