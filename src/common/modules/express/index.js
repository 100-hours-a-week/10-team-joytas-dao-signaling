const cors = require('cors');
const config = require('../../config');

module.exports = expressLoader = (app) => {
    app.use((req, res, next) => {
        cors({
            credentials: true,
            origin: (origin, callback) => {
                if (config.corsWhiteList.indexOf(origin) !== -1) {
                    return callback(null, true);
                }
                console.warn(`Blocked CORS request from: ${origin}`);
                callback(new Error('CORS ERROR'));
            },
        })(req, res, next);
    });
};
