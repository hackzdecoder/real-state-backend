import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/client';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;
if (!SUPABASE_JWT_SECRET) {
    throw new Error('Missing SUPABASE_JWT_SECRET environment variable');
}

export function middleware(allowedRoles: string[]) {
    return async (request: Request, response: Response, next: NextFunction) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return response.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const payload = jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });

            if (typeof payload !== 'object' || payload === null) {
                return response.status(401).json({ error: 'Invalid token payload' });
            }

            const userId = (payload as any).sub;
            if (!userId) {
                return response.status(401).json({ error: 'Invalid token: no user ID' });
            }

            // Fetch user from database to check login/logout and role
            const { data: user, error } = await supabase
                .from('users')
                .select('last_login_at, last_logout_at, role')
                .eq('id', userId)
                .single();

            if (error || !user) {
                return response.status(401).json({ error: 'User not found' });
            }

            // Validate token iat with last login/logout timestamps
            const tokenIatMs = (payload as any).iat * 1000;
            const lastLoginMs = new Date(user.last_login_at).getTime();
            const lastLogoutMs = user.last_logout_at ? new Date(user.last_logout_at).getTime() : 0;

            if (tokenIatMs < lastLoginMs || tokenIatMs < lastLogoutMs) {
                return response.status(401).json({ error: 'Token expired' });
            }

            // Check role from DB
            const userRoleFromDb = user.role;
            if (!userRoleFromDb || !allowedRoles.includes(userRoleFromDb)) {
                return response.status(403).json({ error: 'Forbidden' });
            }

            // Attach user info to request object for downstream handlers
            (request as any).user = payload;

            next();

        } catch (err) {
            console.error('JWT verification error:', err);
            return response.status(401).json({ error: 'Invalid token' });
        }
    };
}
