import winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
  level: isProd ? 'http' : 'debug',
  format: isProd
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
  transports: [new winston.transports.Console()],
});

// Morgan stream — pipes HTTP access logs into winston at http level
export const morganStream = {
  write: (message) => logger.http(message.trim()),
};
