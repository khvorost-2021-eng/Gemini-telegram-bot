const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const fs = require('fs');

let history = [];
try {
    history = JSON.parse(fs.readFileSync('history.json', 'utf8'));
} catch (err) {
    history = [];
}

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-2.5-flash';

async function askGemini(question) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: question }]
        })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    bot.sendMessage(chatId, 'Думаю...');
    
    try {
        const answer = await askGemini(text);
        bot.sendMessage(chatId, answer);
    } catch (err) {
        bot.sendMessage(chatId, 'Ошибка: ' + err.message);
    }
    fs.writeFile('history.json', JSON.stringify(history), () => {});
});

console.log('🤖 Бот запущен');