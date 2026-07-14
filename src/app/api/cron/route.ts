import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { scrapeFlipkartPrice } from '@/lib/scraper';

// Connect to standard Redis!
let redisClient: ReturnType<typeof createClient> | null = null;
const getRedis = async () => {
    if (!redisClient) {
        redisClient = createClient({ url: process.env.KV_URL });
        await redisClient.connect();
    }
    return redisClient;
};

export async function GET(request: Request) {
    try {
        const redis = await getRedis();
        
        // 1. Read the database from Redis (we must parse JSON manually with this package)
        const rawData = await redis.get('trackedProducts');
        let trackedProducts: any[] = rawData ? JSON.parse(rawData) : [];

        if (trackedProducts.length === 0) {
            return NextResponse.json({ message: "No products in database." });
        }

        let databaseNeedsSaving = false;

        // 2. Loop through every product
        for (let i = 0; i < trackedProducts.length; i++) {
            const product = trackedProducts[i];
            console.log(`Checking price for: ${product.url}`);

            // 3. Scrape the current price
            const currentPrice = await scrapeFlipkartPrice(product.url);

            if (currentPrice !== null) {
                databaseNeedsSaving = true;
                
                // ALWAYS save the current snapshot to the database
                product.currentPrice = currentPrice;
                product.lastCheckedDate = new Date().toISOString();

                // Check for new all-time low
                let isNewLow = false;
                if (!product.lowestPrice || currentPrice < product.lowestPrice) {
                    product.lowestPrice = currentPrice;
                    product.lowestPriceDate = new Date().toISOString().split('T')[0];
                    isNewLow = true;
                }

                // --- BUILD THE NOTIFICATION STRING ---
                const dateText = isNewLow 
                    ? "📢Today is the lowest price" 
                    : `${product.lowestPriceDate} was the lowest price`;
                
                const filterText = currentPrice <= product.targetPrice
                    ? "✅ Also it is smaller than the filter!"
                    : "❌ It is still not smaller than the filter.";

                const notificationMessage = `
📱 FLIPKART ALERT:
Current Price : ₹${product.currentPrice}
Lowest Price : ₹${product.lowestPrice}
${dateText}
${filterText}
                `.trim();

                console.log(notificationMessage);

                // --- SENDING TO TELEGRAM ---
                const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 
                const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

                const encodedMessage = encodeURIComponent(notificationMessage);
                const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodedMessage}`;

                try {
                    const response = await fetch(telegramUrl);
                    if (response.ok) {
                        console.log("✅ Telegram message sent successfully!");
                    } else {
                        const errorData = await response.text();
                        console.log("❌ Failed to send Telegram message. Server says:", errorData);
                    }
                } catch (error) {
                    console.log("❌ Error connecting to Telegram.");
                }
                
                console.log("-----------------------------------------");
            }
        }

        // 5. Save back to Redis (must turn back into JSON string)
        if (databaseNeedsSaving) {
            await redis.set('trackedProducts', JSON.stringify(trackedProducts));
        }

        return NextResponse.json({ message: "Cron job finished, messages sent, and Redis database updated!" });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Cron job failed." }, { status: 500 });
    }
}
