import { Request, Response } from 'express';
import { supabase } from '../config/client';
import multer from 'multer';
import { ListingInterface } from '../models/Listing';

// Multer setup for memory storage (upload file buffer to Supabase)
const upload = multer({ storage: multer.memoryStorage() });

class ListingController {
    // GET /api/listings
    static async getAll(req: Request, res: Response) {
        const { data, error } = await supabase
            .from('listings')
            .select('*')
            .order('date_updated', { ascending: false }); // latest updated first

        if (error) return res.status(500).json({ message: error.message });
        return res.json({ listings: data });
    }

    // POST /api/listings/create
    static create = [
        upload.single('images'),
        async (req: Request, res: Response) => {
            try {
                const { title, description, location_address, price, property_type, status } = req.body;
                if (!title || !location_address || !price || !property_type || !status) {
                    return res.status(400).json({ message: 'Missing required fields' });
                }

                let imageUrls: string[] = [];

                if (req.file) {
                    const bucket = process.env.SUPABASE_BUCKET || 'images';
                    const fileName = `${Date.now()}_${req.file.originalname}`;

                    const { error: uploadError } = await supabase.storage
                        .from(bucket)
                        .upload(fileName, req.file.buffer, {
                            contentType: req.file.mimetype,
                        });

                    if (uploadError) {
                        return res.status(500).json({ message: uploadError.message });
                    }

                    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
                    imageUrls = [data.publicUrl];
                }

                const listing: ListingInterface = {
                    title,
                    description,
                    location_address: location_address,
                    price: Number(price),
                    property_type,
                    status,
                    images: imageUrls,
                    date_created: new Date().toISOString(),  // changed here
                    date_updated: new Date().toISOString(),  // and here
                };

                const { error } = await supabase.from('listings').insert(listing);
                if (error) {
                    return res.status(500).json({ message: error.message });
                }

                res.status(201).json({ message: 'Listing created' });
            } catch (e) {
                res.status(500).json({ message: (e as Error).message });
            }
        },
    ];

    // PUT /api/listings/:id
    static update = [
        upload.single('images'),
        async (req: Request, res: Response) => {
            try {
                const id = req.params.id;
                if (!id) return res.status(400).json({ message: 'Listing ID required' });

                const { title, description, location_address, price, property_type, status } = req.body;

                let updates: Partial<ListingInterface> = {
                    title,
                    description,
                    location_address: location_address,
                    price: price ? Number(price) : undefined,
                    property_type,
                    status,
                    date_updated: new Date().toISOString(), // changed here
                };

                if (req.file) {
                    const bucket = process.env.SUPABASE_BUCKET || 'images';
                    const fileName = `${Date.now()}_${req.file.originalname}`;

                    const { error: uploadError } = await supabase.storage
                        .from(bucket)
                        .upload(fileName, req.file.buffer, {
                            contentType: req.file.mimetype,
                        });

                    if (uploadError) {
                        return res.status(500).json({ message: uploadError.message });
                    }

                    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
                    updates.images = [data.publicUrl];
                }

                // Remove undefined fields to avoid overwriting with undefined
                Object.keys(updates).forEach(
                    (key) =>
                        updates[key as keyof ListingInterface] === undefined &&
                        delete updates[key as keyof ListingInterface]
                );

                const { error } = await supabase.from('listings').update(updates).eq('id', id);
                if (error) return res.status(500).json({ message: error.message });

                res.json({ message: 'Listing updated' });
            } catch (e) {
                res.status(500).json({ message: (e as Error).message });
            }
        },
    ];

    // DELETE /api/listings/:id
    static async delete(req: Request, res: Response) {
        try {
            const id = req.params.id;
            if (!id) return res.status(400).json({ message: 'Listing ID required' });

            const { error } = await supabase.from('listings').delete().eq('id', id);
            if (error) return res.status(500).json({ message: error.message });

            res.json({ message: 'Listing deleted' });
        } catch (e) {
            res.status(500).json({ message: (e as Error).message });
        }
    }
}

export default ListingController;
