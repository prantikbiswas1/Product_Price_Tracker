import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, price, pincode, secret } = body;

        const realSecret = process.env.APP_SECRET_KEY;
        if (secret !== realSecret) {
            return NextResponse.json({ error: "Unauthorized! Wrong secret key." }, { status: 401 });
        }

        let trackedProducts: any[] = (await kv.get('trackedProducts')) || [];

        const newProduct = {
            id: Date.now().toString(),
            url: url,
            targetPrice: Number(price),
            pincode: pincode,
            dateAdded: new Date().toISOString()
        };

        trackedProducts.push(newProduct);
        await kv.set('trackedProducts', trackedProducts);

        return NextResponse.json({ message: "Product saved successfully!" }, { status: 200 });
    } catch (error) {
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

        const products: any[] = (await kv.get('trackedProducts')) || [];
        return NextResponse.json(products, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id, secret } = await request.json();

        if (secret !== process.env.APP_SECRET_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let products: any[] = (await kv.get('trackedProducts')) || [];
        const originalLength = products.length;
        products = products.filter((p: any) => p.id !== id);

        if (products.length === originalLength) {
             return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        await kv.set('trackedProducts', products);
        return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
