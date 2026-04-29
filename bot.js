const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const GROQ_KEY = process.env.GROQ_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

const userHistory = {};
const MAX_HISTORY = 20;

async function askGroqWithHistory(chatId, imageUrl, userMessage) {
    if (!userHistory[chatId]) {
        userHistory[chatId] = [];
    }

    if (imageUrl) {
        userHistory[chatId].push({ role: 'user', content: '[Отправлено изображение]' });
    } else {
        userHistory[chatId].push({ role: 'user', content: userMessage });
    }

    if (userHistory[chatId].length > MAX_HISTORY) {
        userHistory[chatId] = userHistory[chatId].slice(-MAX_HISTORY);
    }

    const messages = [
        { role: 'system', content: 'Ты — полезный ассистент в Telegram. Отвечай на русском языке, кратко и по делу. Помни контекст диалога.' },
        ...userHistory[chatId]
    ];

    try {
        let response;
        if (imageUrl) {
            response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash-lite:free',
                    max_tokens: 400,
                    messages: [
                        { role: 'system', content: 'Описывай изображения на русском кратко.' },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: userMessage || 'Опиши, что на этом изображении.' },
                                { type: 'image_url', image_url: { url: imageUrl } }
                            ]
                        }
                    ]
                })
            });
        } else {
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        }

        const data = await response.json();

        if (data.error) {
            console.error('Ошибка API:', data.error);
            return 'Ошибка: ' + data.error.message;
        }

        const answer = data.choices[0].message.content;
        userHistory[chatId].push({ role: 'assistant', content: answer });
        return answer;

    } catch (err) {
        console.error('Ошибка запроса:', err.message);
        return 'Ошибка соединения с нейросетью.';
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (msg.photo) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileUrl = await bot.getFileLink(fileId);
        const answer = await askGroqWithHistory(chatId, fileUrl, msg.caption);
        bot.sendMessage(chatId, answer);
        return;
    }

    if (msg.text) {
        const answer = await askGroqWithHistory(chatId, null, msg.text);
        bot.sendMessage(chatId, answer);
    }
});

console.log('🤖 Бот запущен');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('OK')).listen(PORT, () => {
    console.log(`HTTP заглушка на порту ${PORT}`);
});
