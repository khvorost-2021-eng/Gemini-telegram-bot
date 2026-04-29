const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
require('dotenv').config();

const bot = new TelegramBot('8788143291:AAHyIapOfJG5ztDY4h76k_umo0TdO1qW_SU', {
    polling: {
        params: {
            allowed_updates: ['message']
        }
    }
});
const GROQ_KEY = process.env.GROQ_KEY;

async function askGroq(question) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'Ты — полезный ассистент. Всегда используй HTML-форматирование: <b>жирный</b> для важных слов, <code>код</code> для технических терминов, <i>курсив</i> для выделения. Отвечай на русском.'
                    },
                    {
                        role: 'user',
                        content: question
                    }
                ]
            })
        });

        const data = await response.json();

        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }

        console.error('Groq ответил:', JSON.stringify(data));
        return 'Ошибка: нейросеть не ответила.';
    } catch (err) {
        console.error('Ошибка запроса:', err.message);
        return 'Ошибка соединения с нейросетью.';
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    const answer = await askGroq(text);

    try {
        await bot.sendMessage(chatId, answer, { parse_mode: 'HTML' });
    } catch (err) {
        await bot.sendMessage(chatId, answer);
    }
});

console.log('🤖 Бот запущен');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('OK')).listen(PORT, () => {
    console.log(`HTTP заглушка на порту ${PORT}`);
});
