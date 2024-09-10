const config = require('../config');
const dayjs = require('dayjs');

const startTime = dayjs().add(9, 'hour');

const mode = {
    dev: 'development',
    prod: 'production',
    local: 'local',
};

exports.START_MESSAGE = `
================================================================
DAO Signaling Server has been started at https://${config.serverPath}
Start Datetime : ${startTime.format('YYYY.MM.DD H:mm:ss')}
Mode : ${mode[config.envMode]}
================================================================
`;
