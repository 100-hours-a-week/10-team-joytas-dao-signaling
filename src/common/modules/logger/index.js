const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');
const process = require('process');
const config = require('../../config');

const { combine, label, printf } = winston.format;

const logDir = '/app/logs/signaling';

const timezoned = () => {
    const now = new Date();
    now.setHours(now.getHours() + 9);
    return now.toISOString().replace('T', ' ').substring(0, 19);
};

const logFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = winston.createLogger({
    format: combine(winston.format.timestamp({ format: timezoned }), label({ label: 'DAO-SIGN' }), logFormat),
    transports: [
        new winstonDaily({
            level: 'info',
            datePattern: 'YYYY-MM-DD',
            dirname: logDir + '/info',
            filename: 'info-' + `%DATE%.log`,
            maxFiles: 7,
            zippedArchive: true,
        }),
        // error 레벨 로그를 저장할 파일 설정 (info에 자동 포함되지만 일부러 따로 빼서 설정)
        new winstonDaily({
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: logDir + '/error',
            filename: 'error-' + `%DATE%.log`,
            maxFiles: 7,
            zippedArchive: true,
        }),
    ],
    // uncaughtException 발생시 파일 설정
    exceptionHandlers: [
        new winstonDaily({
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: logDir + '/error',
            filename: 'exception-' + `%DATE%.log`,
            maxFiles: 7,
            zippedArchive: true,
        }),
    ],
});

// prod 제외 터미널 로그 노출
if (config.envMode !== 'prod') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                // `${info.level}: ${info.message} JSON.stringify({ ...rest })` 포맷으로 출력
                winston.format.simple()
            ),
        })
    );
}

module.exports = logger;
