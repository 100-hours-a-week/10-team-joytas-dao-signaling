const cors = require('cors');
const config = require('../../config');
const morgan = require('morgan');
const logger = require('../logger');

module.exports = expressLoader = (app) => {
    app.use(morgan('dev'));
    app.use((req, res, next) => {
        cors({
            credentials: true,
            origin: (origin, callback) => {
                if (config.corsWhiteList.indexOf(origin) !== -1 || !origin) {
                    return callback(null, true);
                }
                logger.error(`Blocked CORS request from: ${origin}`);
                callback(new Error('CORS ERROR'));
            },
        })(req, res, next);
    });

    app.use('/', (_, res) => {
        res.status(200).send('DAO SIGNALING SERVER');
    });
};
