const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const GROQ_KEY = process.env.GROQ_KEY;

// Хранилище истории для каждого пользователя
const userHistory = {};

async function askGroq(chatId) {
    // Системная инструкция + последние 10 сообщений
    const messages = [
        { role: 'system', content: 'Ты — полезный ассистент. Отвечай на русском языке. Помни, о чём вы говорили ранее.' },
        ...userHistory[chatId]
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages
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

    // Создать историю для нового пользователя
    if (!userHistory[chatId]) {
        userHistory[chatId] = [];
    }

    // Добавить сообщение пользователя в историю
    userHistory[chatId].push({ role: 'user', content: text });

    // Оставить только последние 10 сообщений
    if (userHistory[chatId].length > 10) {
        userHistory[chatId] = userHistory[chatId].slice(-10);
    }

    // Получить ответ от Groq
    const answer = await askGroq(chatId);

    // Добавить ответ бота в историю
    userHistory[chatId].push({ role: 'assistant', content: answer });

    // Отправить ответ пользователю
    bot.sendMessage(chatId, answer);
});

console.log('🤖 Бот запущен');

// HTTP-заглушка для Render
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('OK')).listen(PORT, () => {
    console.log(`HTTP заглушка на порту ${PORT}`);
});
