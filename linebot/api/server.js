'use strict';

require('dotenv').config();

const axios = require('axios');
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
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// データベースにデータを保存する関数
async function saveDataToDatabase(data) {
  try {
    const query = 'INSERT INTO your_table_name (column1, column2) VALUES ($1, $2)';
    const values = [data.value1, data.value2];

    await pool.query(query, values);
  } catch (err) {
    console.error('Error saving data to database:', err);
  }
}

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

    // ここでデータベースにデータを保存
    await saveDataToDatabase({ value1: 'Some data', value2: 'More data' });

    // LINE Botからの返信などの処理...
}

if (process.env.NOW_REGION) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Server running at ${PORT}`);
    });
}
