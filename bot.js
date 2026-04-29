const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const fs = require('fs');

let history = [];
try {
    history = JSON.parse(fs.readFileSync('history.json', 'utf8'));
} catch (err) {
    history = [];
}
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('OK')).listen(PORT, () => {
    console.log(`HTTP заглушка на порту ${PORT}`);
});
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
    
    // Проверить, есть ли ответ
    if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
    }
    
    // Если ответа нет — вернуть ошибку
    console.error('Ответ OpenRouter:', JSON.stringify(data));
    return 'Не удалось получить ответ от нейросети. Попробуй позже.';
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // 1. Сначала всегда сохраняем сообщение пользователя в историю
    history.push({
        from: msg.from.first_name,
        text: text,
        time: new Date().toISOString()
    });

    // 2. Сохраняем файл (на случай, если ответ не придёт, сообщение уже записано)
    fs.writeFile('history.json', JSON.stringify(history), () => {});

    // 3. Отвечаем пользователю
    try {
        const answer = await askGemini(text);
        bot.sendMessage(chatId, answer);
    } catch (err) {
        console.error('Ошибка при запросе к Gemini:', err); // Логируем для себя
        bot.sendMessage(chatId, 'Ошибка: ' + err.message);
    }
});

console.log('🤖 Бот запущен');