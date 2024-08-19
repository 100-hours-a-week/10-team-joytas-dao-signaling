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
    domainName: process.env.DOMAIN_NAME,
    corsWhiteList: process.env.CORS_WHITELIST,

    // RTC
    maximumConnection: process.env.MAXIMUM_CONNECTION,
};

switch (process.env.NODE_ENV) {
    case 'production':
        config.envMode = 'prod';
        break;

    case 'development':
        config.envMode = 'dev';
        break;

    default:
        console.warn(ErrorMessage.NODE_ENV_WRONG);
        break;
}

module.exports = config;
