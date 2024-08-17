const conf = require('../config');
const dayjs = require('dayjs');

const mode = {
    dev: 'development',
    prod: 'production',
};

exports.START_MESSAGE = `
================================================================
DAO Signaling Server has been started at https://${conf.domainName}:${conf.port}
Start Datetime : ${dayjs().format('YYYY.MM.DD H:mm:ss')}
Mode : ${mode[conf.envMode]}
================================================================
`;
