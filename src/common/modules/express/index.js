const cors = require('cors');
const config = require('../../config');
const morgan = require('morgan');

module.exports = expressLoader = (app) => {
    app.use(morgan('dev'));
    app.use((req, res, next) => {
        cors({
            credentials: true,
            origin: (origin, callback) => {
                // TODO : SSL 연결 후 !origin 삭제
                if (config.corsWhiteList.indexOf(origin) !== -1 || !origin) {
                    return callback(null, true);
                }
                console.warn(`Blocked CORS request from: ${origin}`);
                callback(new Error('CORS ERROR'));
            },
        })(req, res, next);
    });

    app.use('/', (req, res) => {
        res.status(200).send('DAO SIGNALING SERVER');
    });
};
