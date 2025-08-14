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
            // Save the user input as-is in the database
            const storedUsername = username;

            // Generate a valid email for Supabase
            const emailForSupabase = username.includes('@') ? username : `${username}@yourapp.local`;

            // Sign up using anon key
            const { data, error } = await supabase.auth.signUp({
                email: emailForSupabase,
                password,
            });

            if (error) return res.status(400).json({ error: error.message });

            // Create user record in your users table
            const newUser: UserInterface = {
                id: data.user?.id || '',
                username: storedUsername, // save exactly what the user entered
                full_name,
                role: 'user',
                avatar: null,
            };

            await User.create(newUser);

            return res.json({
                message: 'Successfully Registered',
                user: newUser,
            });

        } catch (err: any) {
            return res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }

    static async login(request: Request, response: Response) {
        try {
            const { username, password } = request.body;

            if ((!username || username.trim() === '') && (!password || password.trim() === '')) {
                return response.status(400).json({ error: 'Username or Password is required' });
            }
            if (!username || username.trim() === '') {
                return response.status(400).json({ error: 'Username is required' });
            }
            if (!password || password.trim() === '') {
                return response.status(400).json({ error: 'Password is required' });
            }

            const email = `${username}@yourapp.local`;

            // 1. Authenticate user with Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error || !data.session) {
                return response.status(401).json({ error: 'Username or password is incorrect.' });
            }

            // 2. Get user info from your users table
            const user = await User.findByUsername(username);

            if (!user) {
                return response.status(404).json({ error: 'User not found in database' });
            }

            // 3. Update last_login_at timestamp (optional)
            await User.updateLastLogin(user.id);

            // 4. Return token + full user info (with correct role)
            return response.json({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                user, // <-- full user record with role, full_name, avatar etc.
            });
        } catch (err: any) {
            console.error('Unexpected error during login:', err);
            return response.status(500).json({ error: 'An unexpected error occurred during login.' });
        }
    }

    static async logout(request: Request, response: Response) {
        const authHeader = request.headers.authorization;

        // Check if Authorization header is present and formatted correctly
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return response.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];

        try {
            // Verify token with the JWT secret (make sure SUPABASE_JWT_SECRET is set in your env)
            const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!, { algorithms: ['HS256'] });

            if (typeof payload !== 'object' || payload === null) {
                return response.status(401).json({ error: 'Invalid token payload' });
            }

            // Extract user ID from token payload (the 'sub' claim)
            const userId = (payload as any).sub;
            if (!userId) {
                return response.status(401).json({ error: 'Invalid token: no user ID' });
            }

            // Update last_logout_at timestamp in the users table
            const now = new Date().toISOString();

            const { error } = await supabase
                .from('users')
                .update({ last_logout_at: now })
                .eq('id', userId);

            if (error) {
                console.error('Failed to update last_logout_at:', error);
                return response.status(500).json({ error: 'Failed to logout user' });
            }

            return response.json({ message: 'Logged out successfully' });

        } catch (err) {
            console.error('Error during logout:', err);
            return response.status(401).json({ error: 'Invalid or expired token' });
        }
    }
}
