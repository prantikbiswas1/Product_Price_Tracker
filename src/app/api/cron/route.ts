import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { scrapeFlipkartPrice } from '@/lib/scraper';

const DB_FILE = path.join(process.cwd(), 'data.json');

export async function GET(request: Request) {
    try {
        // 1. Read the database
        let trackedProducts = [];
        try {
            const fileContents = await fs.readFile(DB_FILE, 'utf8');
            trackedProducts = JSON.parse(fileContents);
        } catch (e) {
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
                // Paste your specific Token and Chat ID here!
                const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
                const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

                const encodedMessage = encodeURIComponent(notificationMessage);
                // Telegram's official API URL
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

        // 5. If we updated any prices, save the whole array back to the file
        if (databaseNeedsSaving) {
            await fs.writeFile(DB_FILE, JSON.stringify(trackedProducts, null, 2));
        }

        return NextResponse.json({ message: "Cron job finished, messages sent, and database updated!" });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Cron job failed." }, { status: 500 });
    }
}
