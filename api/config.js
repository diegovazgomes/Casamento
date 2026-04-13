// api/config.js
// Endpoint serverless que retorna configurações públicas para o frontend.
// Lê variáveis de ambiente do Vercel e as expõe como JSON.
export default function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.json({
        supabaseUrl:     process.env.SUPABASE_URL     || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    });
}
