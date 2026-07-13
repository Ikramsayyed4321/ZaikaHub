function write(level, message, metadata = {}) {
    const entry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...metadata,
    };
    const line = JSON.stringify(entry);
    if (level === 'error')
        console.error(line);
    else if (level === 'warn')
        console.warn(line);
    else
        console.log(line);
}
export const logger = {
    info: (message, metadata) => write('info', message, metadata),
    warn: (message, metadata) => write('warn', message, metadata),
    error: (message, metadata) => write('error', message, metadata),
};
