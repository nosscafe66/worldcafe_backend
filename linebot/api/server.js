'use strict';

require('dotenv').config()

const axios = require('axios');
const express = require('express');
const line = require('@line/bot-sdk');
const PORT = process.env.PORT || 3000;

console.log(process.env)

console.log(process.env.LINE_CHANNEL_SECRET)
console.log(process.env.LINE_CHANNEL_ACCESSTOKEN)

const config = {
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelAccessToken: process.env.LINE_CHANNEL_ACCESSTOKEN
};

const app = express();

// 以下のコードは変更なし
app.get('/', (req, res) => res.send('Hello LINE BOT!(GET)'));

app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

const client = new line.Client(config);

async function handleEvent(event) {
    console.log(JSON.stringify(event, null, 2));

    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    // return client.replyMessage(event.replyToken, {
    //     type: 'text',
    //     text: event.message.text
    // });
}

if (process.env.NOW_REGION) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Server running at ${PORT}`);
    });
}
