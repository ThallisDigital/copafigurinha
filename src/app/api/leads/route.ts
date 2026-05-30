import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    const supabase = getSupabase();

    if (action === 'save') {
      const { name, birth, email, whatsapp, height, weight, club } = data;
      if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
      const { data: row, error } = await supabase
        .from('leads')
        .insert({ name: name.trim(), birth, email, whatsapp, height, weight, club })
        .select('id')
        .single();
      if (error) throw error;
      return NextResponse.json({ id: row.id });
    }

    if (action === 'update-sticker') {
      const { id, sticker_url } = data;
      const { error } = await supabase.from('leads').update({ sticker_url }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'list') {
      const { password } = data;
      const expected = process.env.ADMIN_PASSWORD;
      if (!expected || password !== expected) {
        return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
      }
      const { data: rows, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return NextResponse.json({ leads: rows });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (e: any) {
    console.error('leads API error:', e);
    return NextResponse.json({ error: e?.message ?? 'Erro interno' }, { status: 500 });
  }
}
