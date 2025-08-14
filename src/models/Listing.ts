export interface ListingInterface {
    id?: string;
    title: string;
    description?: string;
    location_address: string;
    price: number;
    property_type: string;
    status: string;
    images?: string[];
    date_created: string;
    date_updated: string;
}


import { supabase } from '../config/client';

export class Listing {
    static async create(listing: ListingInterface): Promise<void> {
        const { error } = await supabase.from('listings').insert(listing);
        if (error) throw new Error(error.message);
    }

    static async findById(id: string): Promise<ListingInterface | null> {
        const { data, error } = await supabase.from('listings').select('*').eq('id', id).single();
        if (error) {
            if (error.code === 'PGRST116') return null; // no rows found
            throw new Error(error.message);
        }
        return data as ListingInterface;
    }

    static async update(id: string, updates: Partial<ListingInterface>): Promise<void> {
        const { error } = await supabase.from('listings').update(updates).eq('id', id);
        if (error) throw new Error(error.message);
    }

    static async delete(id: string): Promise<void> {
        const { error } = await supabase.from('listings').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }
}
