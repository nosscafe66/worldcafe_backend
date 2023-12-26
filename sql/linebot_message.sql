CREATE TABLE linebot_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    group_id VARCHAR(255),
    timestamp BIGINT NOT NULL,
    reply_token VARCHAR(255) NOT NULL,
    webhook_event_id VARCHAR(255) NOT NULL,
    mode VARCHAR(50) NOT NULL,
    is_redelivery BOOLEAN NOT NULL,
    category VARCHAR(255)
);
