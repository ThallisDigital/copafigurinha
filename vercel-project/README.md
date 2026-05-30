# Sua Figurinha da Copa 🇧🇷

## Deploy no Vercel

### 1. Suba para o GitHub
```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/SEU_USUARIO/sua-figurinha.git
git push -u origin main
```

### 2. Importe no Vercel
- Acesse https://vercel.com
- Clique em "Add New Project"
- Conecte seu repositório GitHub
- Clique em Deploy

### 3. Configure as variáveis de ambiente
No Vercel: **Settings → Environment Variables**

| Nome | Valor |
|------|-------|
| `LOVABLE_API_KEY` | Sua chave do Lovable |
| `SUPABASE_URL` | `https://zmblknnfoqpvapdymjwn.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Sua chave anon do Supabase |
| `ADMIN_PASSWORD` | Senha para acessar /admin |

### 4. Redeploy
Após adicionar as variáveis, clique em **Redeploy**.

## Desenvolvimento local
```bash
npm install
cp .env.example .env.local
# preencha o .env.local com suas chaves
npm run dev
```
