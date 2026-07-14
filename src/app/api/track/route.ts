import { NextResponse } from 'next/server';
import { createClient } from 'redis';

// Connect to standard Redis!
let redisClient: ReturnType<typeof createClient> | null = null;
const getRedis = async () => {
    if (!redisClient) {
        redisClient = createClient({ url: process.env.KV_URL });
        await redisClient.connect();
    }
    return redisClient;
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, price, pincode, secret } = body;

        const realSecret = process.env.APP_SECRET_KEY;
        if (secret !== realSecret) {
            return NextResponse.json({ error: "Unauthorized! Wrong secret key." }, { status: 401 });
        }

        const redis = await getRedis();
        const rawData = await redis.get('trackedProducts');
        let trackedProducts: any[] = rawData ? JSON.parse(rawData) : [];

        const newProduct = {
            id: Date.now().toString(),
            url: url,
            targetPrice: Number(price),
            pincode: pincode,
            dateAdded: new Date().toISOString()
        };

        trackedProducts.push(newProduct);
        await redis.set('trackedProducts', JSON.stringify(trackedProducts));

        return NextResponse.json({ message: "Product saved successfully!" }, { status: 200 });
    } catch (error) {
        console.error("Redis POST Error:", error);
        return NextResponse.json({ error: "Something went wrong on the server." }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');

        if (secret !== process.env.APP_SECRET_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const redis = await getRedis();
        const rawData = await redis.get('trackedProducts');
        const products: any[] = rawData ? JSON.parse(rawData) : [];
        return NextResponse.json(products, { status: 200 });
    } catch (error) {
        console.error("Redis GET Error:", error);
        return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id, secret } = await request.json();

        if (secret !== process.env.APP_SECRET_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const redis = await getRedis();
        const rawData = await redis.get('trackedProducts');
        let products: any[] = rawData ? JSON.parse(rawData) : [];
        
        const originalLength = products.length;
        products = products.filter((p: any) => p.id !== id);

        if (products.length === originalLength) {
             return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        await redis.set('trackedProducts', JSON.stringify(products));
        return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Redis DELETE Error:", error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
