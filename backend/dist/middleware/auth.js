import jwt from 'jsonwebtoken';
import { config } from '../config.js';
export function signAccessToken(user) {
    return jwt.sign(user, config.auth.jwtSecret, { expiresIn: config.auth.accessTokenTtl });
}
export function signRefreshToken(user) {
    return jwt.sign({ id: user.id, restaurantId: user.restaurantId }, config.auth.refreshSecret, {
        expiresIn: config.auth.refreshTokenTtl,
    });
}
export function requireAuth(request, response, next) {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
        response.status(401).json({ message: 'Authentication required' });
        return;
    }
    try {
        request.user = jwt.verify(token, config.auth.jwtSecret);
        next();
    }
    catch {
        response.status(401).json({ message: 'Session expired or invalid token' });
    }
}
export function requireRole(...roles) {
    return (request, response, next) => {
        if (!request.user || !roles.includes(request.user.role)) {
            response.status(403).json({ message: 'You do not have permission to access this resource' });
            return;
        }
        next();
    };
}
