const dotenv = require('dotenv');
const path = require('path');
const ErrorMessage = require('../constants/error-message');

const envPath = path.join(__dirname, '../../../.env');

const env = dotenv.config({ path: envPath });
if (env.error) {
    console.warn(ErrorMessage.ENV_FILE_NOT_FOUND);
}

const config = {
    // SERVER
    port: process.env.PORT || 8083,
    serverPath: process.env.SERVER_PATH,
    corsWhiteList: process.env.CORS_WHITELIST,

    // RTC
    maximumConnection: process.env.MAXIMUM_CONNECTION,

    // REDIS
    redisPort: process.env.REDIS_PORT,
};

switch (process.env.NODE_ENV) {
    case 'production':
        config.envMode = 'prod';
        config.springServerUrl = process.env.SPRING_SERVER_URL_PROD;
        config.redisHost = process.env.REDIS_HOST_PROD;
        break;

    case 'development':
        config.envMode = 'dev';
        config.springServerUrl = process.env.SPRING_SERVER_URL_DEV;
        config.redisHost = process.env.REDIS_HOST_DEV;
        break;
    case 'local':
        config.envMode = 'local';
        config.springServerUrl = process.env.SPRING_SERVER_URL_LOCAL;
        config.redisHost = process.env.REDIS_HOST_LOCAL;
        break;
    default:
        console.warn(ErrorMessage.NODE_ENV_WRONG);
        config.envMode = 'dev';
        config.springServerUrl = process.env.SPRING_SERVER_URL_DEV;
        config.redisHost = process.env.REDIS_HOST_DEV;
        break;
}

module.exports = config;
