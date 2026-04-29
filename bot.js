const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const GROQ_KEY = process.env.GROQ_KEY;

async function askGroq(messages) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
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

    // Если есть фото
    if (msg.photo) {
        // Взять самое большое разрешение
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileUrl = await bot.getFileLink(fileId);
        const caption = msg.caption || 'Что на этом изображении?';

        const answer = await askGroq([
            {
                role: 'user',
                content: [
                    { type: 'text', text: caption },
                    { type: 'image_url', image_url: { url: fileUrl } }
                ]
            }
        ]);

        bot.sendMessage(chatId, answer);
        return;
    }

    // Если текст
    if (msg.text) {
        const answer = await askGroq([
            { role: 'user', content: msg.text }
        ]);
        bot.sendMessage(chatId, answer);
    }
});

console.log('🤖 Бот запущен');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('OK')).listen(PORT, () => {
    console.log(`HTTP заглушка на порту ${PORT}`);
});
