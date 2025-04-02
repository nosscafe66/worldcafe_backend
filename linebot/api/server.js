'use strict';

// 必要なパッケージをインポート
require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

// サーバーポートの設定
const PORT = process.env.PORT || 3000;

// LINE設定
const config = {
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelAccessToken: process.env.LINE_CHANNEL_ACCESSTOKEN
};

// Expressアプリケーションの初期化
const app = express();

// LINE Clientの初期化
const client = new line.Client(config);

// Webhookエンドポイント
app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

// イベントハンドラ関数
async function handleEvent(event) {
    console.log('Event Type:', event.type);
    console.log('Source Type:', event.source.type);
    
    // メッセージイベントの場合
    if (event.type === 'message') {
        console.log('Message Type:', event.message.type);
        
        // グループからのメッセージの場合
        if (event.source.type === 'group') {
            const groupId = event.source.groupId;
            console.log('Group ID:', groupId);
            
            // グループIDをユーザーに返信（オプション）
            if (event.message.type === 'text' && event.message.text === 'グループID') {
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: `このグループのIDは: ${groupId} です`
                });
            }
        } else if (event.source.type === 'room') {
            // トークルームの場合
            const roomId = event.source.roomId;
            console.log('Room ID:', roomId);
            
            if (event.message.type === 'text' && event.message.text === 'ルームID') {
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: `このトークルームのIDは: ${roomId} です`
                });
            }
        } else {
            // 個人チャットの場合
            console.log('This is a direct message, not a group or room message');
        }
    }
    
    // イベントの全内容をログ出力（開発用）
    console.log('Full event object:');
    console.log(JSON.stringify(event, null, 2));
    
    // デフォルトの応答として、何もしない
    return Promise.resolve(null);
}

// サーバーの起動
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});