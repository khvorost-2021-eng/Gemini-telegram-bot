const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';

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
                messages: [
                    {
                        role: 'system',
                        content: 'Ты — полезный ассистент. Всегда используй HTML-форматирование: <b>жирный</b> для важных слов, <code>код</code> для технических терминов, <i>курсив</i> для выделения. Отвечай на русском.'
                    },
                    {
                        role: 'user',
                        content: question
                    }
                ],
                max_tokens: 8000
            })
        });

        const data = await response.json();

        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }

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

    const answer = await askGemini(text);

    try {
        await bot.sendMessage(chatId, answer, { parse_mode: 'HTML' });
    } catch (err) {
        await bot.sendMessage(chatId, answer);
    }
});

console.log('🤖 Бот запущен');

// Фиктивный HTTP-сервер для Render
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('OK')).listen(PORT, () => {
    console.log(`HTTP заглушка на порту ${PORT}`);
});
