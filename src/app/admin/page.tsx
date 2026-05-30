'use client';
import { useState } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [leads, setLeads] = useState<any[]|null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'list', password }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setLeads(d.leads);
    } catch(e:any) { setErr(e?.message??'Erro'); }
    finally { setLoading(false); }
  }

  function exportCsv() {
    if (!leads) return;
    const headers = ['created_at','name','birth','email','whatsapp','height','weight','club','sticker_url'];
    const esc = (v: any) => `"${String(v??'').replace(/"/g,'""')}"`;
    const rows = leads.map(l=>headers.map(h=>esc(l[h])).join(','));
    const csv = [headers.join(','),...rows].join('\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`leads-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!leads) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-sm space-y-3">
        <h1 className="text-xl font-bold">Acesso restrito</h1>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha"
          className="w-full border rounded px-3 py-2" autoFocus
          onKeyDown={e=>e.key==='Enter'&&password&&load()}/>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button onClick={load} disabled={loading||!password}
          className="w-full bg-black text-white rounded py-2 font-semibold disabled:opacity-50">
          {loading?'Entrando...':'Entrar'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Leads ({leads.length})</h1>
          <button onClick={exportCsv} className="bg-green-600 text-white px-4 py-2 rounded font-semibold">
            Exportar CSV
          </button>
        </div>
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase">
              <tr>{['Data','Nome','Nasc.','E-mail','WhatsApp','Altura','Peso','Clube','Figurinha'].map(h=>(
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y">
              {leads.map(l=>(
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2 font-semibold">{l.name}</td>
                  <td className="px-4 py-2">{l.birth}</td>
                  <td className="px-4 py-2">{l.email}</td>
                  <td className="px-4 py-2">{l.whatsapp}</td>
                  <td className="px-4 py-2">{l.height}</td>
                  <td className="px-4 py-2">{l.weight}</td>
                  <td className="px-4 py-2">{l.club}</td>
                  <td className="px-4 py-2">{l.sticker_url?<a href={l.sticker_url} target="_blank" className="text-blue-600 underline">Ver</a>:'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
