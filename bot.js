const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-2.5-flash';

async function askGemini(question) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: question }],
                max_tokens: 8000
            })
        });

        const data = await response.json();

        // Проверить, есть ли ответ
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }

        // Если ответа нет — показать, что вернул OpenRouter
        console.error('OpenRouter ответил:', JSON.stringify(data));
        return 'Ошибка: нейросеть не ответила. ' + (data.error ? data.error.message : '');
    } catch (err) {
        console.error('Ошибка запроса:', err.message);
        return 'Ошибка соединения с нейросетью.';
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    bot.sendMessage(chatId, 'Думаю...');

    const answer = await askGemini(text);
    bot.sendMessage(chatId, answer);
});

console.log('🤖 Бот запущен');

// Фиктивный HTTP-сервер для Render
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('OK')).listen(PORT, () => {
    console.log(`HTTP заглушка на порту ${PORT}`);
});
