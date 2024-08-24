const { createClient } = require('redis');
const config = require('../../config');

const redisClient = createClient({
    socket: {
        host: config.redisHost,
        port: config.redisPort,
    },
    legacyMode: true,
});

redisClient.on('connect', () => {
    console.info('✅ Connected to Redis');
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
});

redisClient.connect().then();
const redisCli = redisClient.v4;

module.exports = redisCli;
