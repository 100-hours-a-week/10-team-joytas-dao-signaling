const cors = require('cors');

module.exports = expressLoader = (app) => {
    app.use(cors());
};
