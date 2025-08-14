import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/client';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;
if (!SUPABASE_JWT_SECRET) throw new Error('Missing SUPABASE_JWT_SECRET');

export function middleware(allowedRoles: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.split(' ')[1];

        try {
            const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!, { algorithms: ['HS256'] });
            const userId = (payload as any).sub;
            if (!userId) return res.status(401).json({ error: 'Invalid token' });

            // Fetch user from DB
            const { data: user, error } = await supabase
                .from('users')
                .select('last_logout_at, role')
                .eq('id', userId)
                .single();

            if (error || !user) return res.status(401).json({ error: 'User not found' });

            // Token issued at vs last_logout_at
            const tokenIatMs = (payload as any).iat * 1000;
            const lastLogoutMs = user.last_logout_at ? new Date(user.last_logout_at).getTime() : 0;

            // Allow small buffer to prevent immediate expiry
            const TOKEN_BUFFER_MS = 5000;
            if (tokenIatMs + TOKEN_BUFFER_MS < lastLogoutMs) return res.status(401).json({ error: 'Token expired' });

            // Role check
            if (!user.role || !allowedRoles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });

            (req as any).user = payload;
            next();
        } catch (err) {
            console.error('JWT error:', err);
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
}

