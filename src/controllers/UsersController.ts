import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { supabase } from '../config/client';
import { User, UserInterface } from '../models/User';

export class UserController {
    static async register(req: Request, res: Response) {
        let { username, password, full_name } = req.body;

        if (!username?.trim() || !password?.trim() || !full_name?.trim()) {
            return res.status(400).json({ error: 'Username/email, password and full name are required' });
        }

        username = username.trim();
        password = password.trim();
        full_name = full_name.trim();

        try {
            const storedUsername = username;
            const emailForSupabase = username.includes('@') ? username : `${username}@yourapp.local`;

            // 1. Register user in Supabase
            const { data, error } = await supabase.auth.signUp({ email: emailForSupabase, password });
            if (error) return res.status(400).json({ error: error.message });

            // 2. Store user in your own DB
            const newUser: UserInterface = {
                id: data.user?.id || '',
                username: storedUsername,
                full_name,
                role: 'user',
                avatar: null,
            };
            await User.create(newUser);

            // 3. Immediately sign in to get session
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: emailForSupabase,
                password,
            });
            if (loginError || !loginData.session) {
                return res.status(500).json({ error: 'Failed to log in after registration' });
            }

            // 4. Update last_login_at and last_logout_at
            const now = new Date().toISOString();
            await supabase.from('users').update({ last_login_at: now, last_logout_at: now }).eq('id', newUser.id);

            // 5. Return user + tokens
            return res.json({
                message: 'Successfully Registered',
                access_token: loginData.session.access_token,
                refresh_token: loginData.session.refresh_token,
                user: newUser,
            });

        } catch (err: any) {
            return res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }


    static async login(req: Request, res: Response) {
        try {
            const { username, password } = req.body;
            if (!username?.trim() || !password?.trim()) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            const email = `${username}@yourapp.local`;

            // 1. Authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error || !data.session) return res.status(401).json({ error: 'Username or password is incorrect.' });

            // 2. Get user info from DB
            const user = await User.findByUsername(username);
            if (!user) return res.status(404).json({ error: 'User not found in database' });

            const now = new Date().toISOString();

            // 3. Invalidate all previous tokens by updating last_logout_at
            await supabase
                .from('users')
                .update({ last_logout_at: now, last_login_at: now })
                .eq('id', user.id);

            // 4. Return Supabase session + user info
            return res.json({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                user,
            });

        } catch (err: any) {
            console.error('Login error:', err);
            return res.status(500).json({ error: 'An unexpected error occurred during login.' });
        }
    }




    static async logout(req: Request, res: Response) {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.split(' ')[1];
        try {
            const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!, { algorithms: ['HS256'] });
            const userId = (payload as any).sub;
            if (!userId) return res.status(401).json({ error: 'Invalid token' });

            // Update last_logout_at to invalidate all previous tokens
            const now = new Date().toISOString();
            const { error } = await supabase.from('users').update({ last_logout_at: now }).eq('id', userId);

            if (error) return res.status(500).json({ error: 'Failed to logout user' });

            return res.json({ message: 'Logged out successfully' });
        } catch (err) {
            console.error('Logout error:', err);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    }
}
