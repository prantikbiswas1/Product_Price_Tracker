import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// This creates an absolute path to a file called 'data.json' in your main folder
const DB_FILE = path.join(process.cwd(), 'data.json');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, price, pincode, secret } = body;

        // Security Check
        const realSecret = process.env.APP_SECRET_KEY; // Read from the vault!
        if (secret !== realSecret) {
            return NextResponse.json(
                { error: "Unauthorized! Wrong secret key." },
                { status: 401 }
            );
        }

        // 1. Read existing data (if the file exists)
        let trackedProducts = [];
        try {
            const fileContents = await fs.readFile(DB_FILE, 'utf8');
            trackedProducts = JSON.parse(fileContents);
        } catch (e) {
            // If the file doesn't exist yet, we just start with an empty array!
        }

        // 2. Create the new product object
        const newProduct = {
            id: Date.now().toString(), // Gives it a unique ID based on the current time
            url: url,
            targetPrice: Number(price), // Make sure the price is saved as a number, not text
            pincode: pincode,
            dateAdded: new Date().toISOString()
        };

        // Add it to our list
        trackedProducts.push(newProduct);

        // 3. Write the updated list back to the file (the "2" just makes the JSON nicely indented)
        await fs.writeFile(DB_FILE, JSON.stringify(trackedProducts, null, 2));

        console.log("Successfully saved to database!");

        return NextResponse.json(
            { message: "Product saved successfully!" },
            { status: 200 }
        );

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Something went wrong on the server." },
            { status: 500 }
        );
    }
}


// ---- NEW: GET ALL PRODUCTS ----
export async function GET(request: Request) {
    try {
        // Read the secret from the URL (e.g. ?secret=admin123)
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');

        if (secret !== process.env.APP_SECRET_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Read the database, if it fails, just return an empty array "[]"
        const fileContents = await fs.readFile(DB_FILE, 'utf8').catch(() => "[]");
        const products = JSON.parse(fileContents);
        
        return NextResponse.json(products, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
    }
}

// ---- NEW: DELETE A PRODUCT ----
export async function DELETE(request: Request) {
    try {
        // Read the ID and secret from the request body
        const { id, secret } = await request.json();

        if (secret !== process.env.APP_SECRET_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const fileContents = await fs.readFile(DB_FILE, 'utf8').catch(() => "[]");
        let products = JSON.parse(fileContents);
        
        // Filter the array to keep everything EXCEPT the product with the matching ID
        const originalLength = products.length;
        products = products.filter((p: any) => p.id !== id);

        if (products.length === originalLength) {
             return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Save the new array back to the file
        await fs.writeFile(DB_FILE, JSON.stringify(products, null, 2));
        
        return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
