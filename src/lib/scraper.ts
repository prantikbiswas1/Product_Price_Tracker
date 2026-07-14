import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeFlipkartPrice(url: string) {
    try {
        // We route the request through a free proxy (allorigins) to hide Vercel's datacenter IP!
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        
        const { data } = await axios.get(proxyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        // 2. Load the HTML into Cheerio
        const $ = cheerio.load(data);

        // 3. Find the price element. 
        // Flipkart usually uses the class "Nx9bqj CxhGGd" for the main product price.
        // Note: If Flipkart changes their design, we will have to update this class name!
        const priceString = $('.v1zwn21l.v1zwn20._1psv1zeb9._1psv1ze0').first().text();

        if (!priceString) {
            throw new Error("Could not find the price on the page.");
        }

        // 4. Clean up the text. It looks like "₹50,000". We need to remove the ₹ and commas to make it a raw number (50000).
        const cleanPrice = priceString.replace('₹', '').replace(/,/g, '').trim();
        const priceNumber = Number(cleanPrice);

        console.log(`Scraped Price: ₹${priceNumber} from ${url}`);

        return priceNumber;

    } catch (error: any) {
        console.error("Scraping failed for URL:", url);
        console.error("Exact Reason:", error.message);
        return null; // Return null if it fails so we don't accidentally trigger a notification
    }
}
