import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch("https://mercados.ambito.com/home/general", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.ambito.com/"
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `Ámbito API error: ${response.status}` });
    }
    
    const data = await response.json();
    
    // Set CORS headers just in case
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching from Ámbito:", error);
    return res.status(500).json({ error: "Failed to fetch data from Ámbito" });
  }
}
