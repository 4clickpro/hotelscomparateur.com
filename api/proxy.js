export default async function handler(req, res) {
  const { url, method, body } = req.body;
  const API_KEY = process.env.API_KEY || 'sand_a687b685-9662-4ba4-b948-6f21a3c6e38f';
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy failed', message: error.message });
  }
}