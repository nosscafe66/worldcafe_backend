'use strict';

require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const { Pool } = require('pg');
const PORT = process.env.PORT || 3000;

const config = {
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelAccessToken: process.env.LINE_CHANNEL_ACCESSTOKEN
};

const app = express();

// PostgreSQLデータベースへの接続設定
const pool = new Pool({
  connectionString: process.env.POSTGRES_HOST,
  ssl: {
    rejectUnauthorized: false
  }
});

// データベースからデータを取得する関数
async function fetchDataFromDatabase(user) {
  try {
    const { rows } = await pool.query('SELECT * FROM carts WHERE user_id = $1', [user]);
    return rows;
  } catch (err) {
    console.error('Error fetching data from database:', err);
    throw err;
  }
}

// 新しいエンドポイントを追加
app.get('/api/cart/:user', async (req, res) => {
  try {
    const user = req.params.user;
    const data = await fetchDataFromDatabase(user);
    res.json(data);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

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

    // LINE Botからの返信などの処理...
}

if (process.env.NOW_REGION) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Server running at ${PORT}`);
    });
}
