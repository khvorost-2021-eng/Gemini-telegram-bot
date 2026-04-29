const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const GROQ_KEY = process.env.GROQ_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

async function askGroq(question) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: question }]
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

async function askGeminiVision(fileUrl, caption) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite:free',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: caption || 'Что на этом изображении?' },
                        { type: 'image_url', image_url: { url: fileUrl } }
                    ]
                }
            ]
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Если фото
    if (msg.photo) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileUrl = await bot.getFileLink(fileId);
        const answer = await askGeminiVision(fileUrl, msg.caption);
        bot.sendMessage(chatId, answer);
        return;
    }

    // Если текст
    if (msg.text) {
        const answer = await askGroq(msg.text);
        bot.sendMessage(chatId, answer);
    }
});

console.log('🤖 Бот запущен');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('OK')).listen(PORT, () => {
    console.log(`HTTP заглушка на порту ${PORT}`);
});