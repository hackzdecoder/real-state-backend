export interface UserInterface {
  id: string;
  username: string;
  full_name: string;
  role: string;
  avatar: string | null;
  last_login_at?: string;
}

import { supabase } from '../config/client';

export class User {
  static async findByUsername(username: string): Promise<UserInterface | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // no rows found
      throw new Error(error.message);
    }
    return data as UserInterface;
  }

  static async create(user: UserInterface): Promise<void> {
    const { error } = await supabase.from('users').insert(user);
    if (error) throw new Error(error.message);
  }

  static async updateLastLogin(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw new Error(error.message);
  }
}
