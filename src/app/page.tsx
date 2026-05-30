'use client';

import { useEffect, useRef, useState } from 'react';

const PHRASES = ['Estrela da Copa', 'Craque da Copa', 'Pequeno Craque', 'Jogador Numero 1', 'Princesa do Brasil', 'Fenômeno da Copa'];
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const BRAZIL_CLUBS = [
  'Flamengo','Palmeiras','Corinthians','São Paulo','Santos','Vasco da Gama','Fluminense','Botafogo',
  'Grêmio','Internacional','Cruzeiro','Atlético Mineiro','Athletico Paranaense','Coritiba','Bahia',
  'Vitória','Sport','Náutico','Ceará','Fortaleza','Goiás','Atlético Goianiense','Cuiabá','Bragantino',
  'Juventude','Chapecoense','Ponte Preta','Guarani','América Mineiro','Avaí','Figueirense','Paraná',
];

const fH = "font-family:'Bebas Neue','Anton',Impact,sans-serif;letter-spacing:0.04em";
const fB = "font-family:'Barlow Condensed',sans-serif";

type Step = 'hero'|'q1'|'uploading'|'loading-info'|'q2'|'q3'|'review'|'generating'|'result';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

export default function Home() {
  const [step, setStep] = useState<Step>('hero');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string|null>(null);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [club, setClub] = useState('');
  const [loadPct, setLoadPct] = useState(0);
  const [infoPct, setInfoPct] = useState(0);
  const [genPct, setGenPct] = useState(0);
  const [stickerUrl, setStickerUrl] = useState<string|null>(null);
  const [genError, setGenError] = useState<string|null>(null);
  const [photoAlert, setPhotoAlert] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'uploading') return;
    setLoadPct(0);
    const t = setInterval(() => setLoadPct(p => { if (p>=100){clearInterval(t);setTimeout(()=>setStep('loading-info'),300);return 100;} return p+4; }), 80);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (step !== 'loading-info') return;
    setInfoPct(0);
    const t = setInterval(() => setInfoPct(p => { if (p>=100){clearInterval(t);setTimeout(()=>setStep('q2'),200);return 100;} return p+3.4; }), 100);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (step !== 'generating') return;
    setGenPct(0);
    setGenError(null);
    let cancelled = false;
    const t = setInterval(() => setGenPct(p => p>=95?95:p+1), 250);
    (async () => {
      try {
        if (!photo) throw new Error('Sem foto');
        const mm = String(MONTHS.indexOf(month)+1).padStart(2,'0');
        const birth = `${day.padStart(2,'0')}-${mm}-${year}`;
        const heightStr = `${(Number(height)/100).toFixed(2).replace('.',',')} m`;
        const weightStr = `${weight} kg`;

        // Save lead
        let leadId: string|null = null;
        try {
          const r = await fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'save', name:name.trim(), birth, email, whatsapp, height:heightStr, weight:weightStr, club }) });
          const d = await r.json();
          leadId = d.id ?? null;
        } catch(_){}

        // Generate jersey
        const res = await fetch('/api/generate-jersey', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ photoDataUrl: photo, name: name.trim() }) });
        if (!res.ok) throw new Error('Erro ao gerar imagem');
        const { imageDataUrl } = await res.json();
        if (cancelled) return;

        await buildSticker(imageDataUrl);

        if (leadId) {
          try { await fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'update-sticker', id:leadId, sticker_url: imageDataUrl }) }); } catch(_){}
        }
        setGenPct(100);
        setStep('result');
      } catch(e:any) {
        if(cancelled) return;
        setGenError(e?.message ?? 'Erro ao gerar figurinha');
      }
    })();
    return () => { cancelled=true; clearInterval(t); };
  }, [step]);

  async function buildSticker(aiImageUrl: string) {
    const loadImg = (src: string) => new Promise<HTMLImageElement>((res,rej) => {
      const i = new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=src;
    });
    const person = await loadImg(aiImageUrl);

    const W = 700, H = 940;
    const canvas = document.createElement('canvas');
    canvas.width=W; canvas.height=H;
    const ctx = canvas.getContext('2d')!;

    // COLORS
    const SKY   = '#29ABE2';
    const DBLUE = '#0a2a6c';
    const MBLUE = '#1565C0';
    const GREEN  = '#006847';
    const YELLOW = '#FFD700';
    const WHITE  = '#FFFFFF';

    // 1) BACKGROUND
    ctx.fillStyle = SKY;
    ctx.fillRect(0,0,W,H);

    // 2) BIG "2026" behind photo — dark navy like reference
    ctx.save();
    ctx.globalAlpha = 0.90;
    ctx.fillStyle = DBLUE;
    ctx.font = `900 ${Math.round(H*0.53)}px 'Bebas Neue','Anton',Impact,sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('20', -W*0.04, H*0.01);
    ctx.fillText('26', W*0.05, H*0.28);
    ctx.globalAlpha = 1;
    ctx.restore();

    // 3) RIGHT SIDEBAR
    const sideX = W*0.795;
    const sideCX = sideX + W*0.103;

    // FIFA badge — dark navy rounded rect with person icon + FIFA text
    const badgeW = W*0.175, badgeH = H*0.165;
    const badgeX = sideX + (W*0.205 - badgeW)/2;
    const badgeY = H*0.03;
    ctx.save();
    ctx.fillStyle = DBLUE;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();
    // Person silhouette (head + shoulders)
    const iCX = badgeX + badgeW/2;
    const iCY = badgeY + badgeH*0.30;
    const iR  = badgeW*0.22;
    ctx.fillStyle = WHITE;
    ctx.beginPath(); ctx.arc(iCX, iCY, iR, 0, Math.PI*2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(iCX, iCY + iR*1.6, iR*1.1, iR*0.9, 0, Math.PI, Math.PI*2);
    ctx.fill();
    // FIFA text
    ctx.font = `900 ${Math.round(badgeW*0.38)}px 'Bebas Neue','Anton',Impact,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FIFA', iCX, badgeY + badgeH*0.82);
    ctx.restore();

    // Brazil flag circle (teardrop shape = circle with arc on top like reference)
    const flagCX = sideCX;
    const flagCY = H*0.615;
    const flagR  = W*0.075;
    // White border
    ctx.save();
    ctx.beginPath(); ctx.arc(flagCX, flagCY, flagR+5, 0, Math.PI*2);
    ctx.fillStyle = WHITE; ctx.fill();
    // Green circle
    ctx.beginPath(); ctx.arc(flagCX, flagCY, flagR, 0, Math.PI*2);
    ctx.fillStyle = GREEN; ctx.fill();
    // Yellow diamond
    ctx.beginPath();
    ctx.moveTo(flagCX, flagCY-flagR*0.75);
    ctx.lineTo(flagCX+flagR*0.9, flagCY);
    ctx.lineTo(flagCX, flagCY+flagR*0.75);
    ctx.lineTo(flagCX-flagR*0.9, flagCY);
    ctx.closePath();
    ctx.fillStyle = YELLOW; ctx.fill();
    // Blue circle
    ctx.beginPath(); ctx.arc(flagCX, flagCY, flagR*0.48, 0, Math.PI*2);
    ctx.fillStyle = DBLUE; ctx.fill();
    // White band
    ctx.save();
    ctx.beginPath(); ctx.arc(flagCX, flagCY, flagR*0.48, 0, Math.PI*2); ctx.clip();
    ctx.fillStyle = WHITE;
    ctx.fillRect(flagCX-flagR*0.55, flagCY-flagR*0.08, flagR*1.1, flagR*0.16);
    ctx.restore();
    ctx.restore();

    // BRA letters stacked
    const braSize = Math.round(W*0.092);
    const braX = sideCX;
    const braY = H*0.685;
    ctx.save();
    ctx.font = `900 ${braSize}px 'Bebas Neue','Anton',Impact,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ['B','R','A'].forEach((letter, i) => {
      ctx.strokeStyle = DBLUE; ctx.lineWidth = 6;
      ctx.strokeText(letter, braX, braY + i*braSize*0.95);
      ctx.fillStyle = WHITE;
      ctx.fillText(letter, braX, braY + i*braSize*0.95);
    });
    ctx.restore();

    // 4) PHOTO — strip white bg
    const tmp = document.createElement('canvas');
    tmp.width=person.width; tmp.height=person.height;
    const tctx = tmp.getContext('2d')!;
    tctx.drawImage(person,0,0);
    const imgData = tctx.getImageData(0,0,tmp.width,tmp.height);
    const px = imgData.data;
    for (let i=0;i<px.length;i+=4){
      const r=px[i],g=px[i+1],b=px[i+2];
      if (r>245&&g>245&&b>245) px[i+3]=0;
      else if (r>228&&g>228&&b>228) px[i+3]=Math.round(((255-r)/27)*255);
    }
    tctx.putImageData(imgData,0,0);

    // Photo fills left ~79% width, full height minus bottom bar
    const photoW = W*0.79, photoH = H*0.805;
    const scale = Math.max(photoW/tmp.width, photoH/tmp.height);
    const dw=tmp.width*scale, dh=tmp.height*scale;
    const dx=(photoW-dw)/2, dy=photoH-dh;
    ctx.save();
    ctx.beginPath(); ctx.rect(0,0,photoW,photoH); ctx.clip();
    ctx.drawImage(tmp,dx,dy,dw,dh);
    ctx.restore();

    // 5) NAME PLATE — dark navy rounded rect
    const plateY = H*0.793;
    const plateH = H*0.128;
    const plateNameH = plateH*0.55;
    const plateStatsH = plateH*0.42;

    // Name bar
    ctx.save();
    ctx.fillStyle = MBLUE;
    roundRect(ctx, W*0.025, plateY, W*0.955, plateNameH, 14);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const nameSize = Math.round(plateNameH*0.52);
    ctx.font=`900 ${nameSize}px 'Bebas Neue','Anton',Impact,sans-serif`;
    ctx.fillText(name.trim().toUpperCase(), W*0.50, plateY+plateNameH*0.52);
    ctx.restore();

    // Stats bar
    const statsY = plateY + plateNameH + H*0.005;
    ctx.save();
    ctx.fillStyle = DBLUE;
    roundRect(ctx, W*0.025, statsY, W*0.955, plateStatsH, 10);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const infoSize = Math.round(plateStatsH*0.46);
    ctx.font=`700 ${infoSize}px 'Barlow Condensed','Arial Narrow',sans-serif`;
    const mm = String(MONTHS.indexOf(month)+1).padStart(2,'0');
    const birth=`${day.padStart(2,'0')}-${mm}-${year}`;
    const hStr=`${(Number(height)/100).toFixed(2).replace('.',',')} m`;
    const wStr=`${weight} kg`;
    ctx.fillText(`${birth}  |  ${hStr}  |  ${wStr}`, W*0.50, statsY+plateStatsH*0.52);
    ctx.restore();

    // 6) BOTTOM BAR
    const barY = H*0.922;
    const barH = H*0.065;
    ctx.save();
    ctx.fillStyle = DBLUE;
    ctx.fillRect(0, barY, W, barH);

    // Phrase
    const phrase = PHRASES[Math.floor(Math.random()*PHRASES.length)];
    const phraseSize = Math.round(barH*0.46);
    ctx.font=`800 ${phraseSize}px 'Bebas Neue','Anton',Impact,sans-serif`;
    ctx.fillStyle=WHITE; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(phrase.toUpperCase(), W*0.04, barY+barH*0.5);

    // Panini badge
    const panW=W*0.22, panH=barH*0.78;
    const panX=W*0.965-panW, panY=barY+(barH-panH)/2;
    ctx.fillStyle=YELLOW;
    roundRect(ctx,panX,panY,panW,panH,6); ctx.fill();
    // Red circle (mascot placeholder)
    ctx.fillStyle='#CC0000';
    ctx.beginPath(); ctx.arc(panX+panH*0.48,panY+panH*0.5,panH*0.38,0,Math.PI*2); ctx.fill();
    // PANINI text
    ctx.fillStyle='#CC0000';
    ctx.font=`900 ${Math.round(panH*0.5)}px 'Bebas Neue','Anton',Impact,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('PANINI', panX+panH*0.48+panW*0.22, panY+panH*0.52);
    ctx.restore();

    // 7) OUTER BORDER
    ctx.save();
    ctx.strokeStyle=WHITE; ctx.lineWidth=7;
    roundRect(ctx,4,4,W-8,H-8,20); ctx.stroke();
    ctx.restore();

    // 8) WATERMARKS
    ctx.save();
    ctx.translate(W/2,H/2); ctx.rotate(-Math.PI/7);
    const wmS=Math.round(W*0.028);
    ctx.font=`bold ${wmS}px sans-serif`;
    ctx.fillStyle='rgba(255,255,255,0.32)';
    ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=1;
    ctx.textAlign='center';
    for(let y=-H;y<H;y+=wmS*3.2) for(let x=-W;x<W;x+=wmS*14){
      ctx.strokeText('Estúdio IA - Celília Freitas',x,y);
      ctx.fillText('Estúdio IA - Celília Freitas',x,y);
    }
    ctx.restore();

    setStickerUrl(canvas.toDataURL('image/png'));
  }

  function handleFile(f: File) {
    const reader = new FileReader();
    reader.onload = () => { setPhoto(reader.result as string); setStep('uploading'); };
    reader.readAsDataURL(f);
  }

  // ── UI HELPERS ────────────────────────────────────────────────────
  const fontH: React.CSSProperties = { fontFamily:"'Bebas Neue','Anton',Impact,sans-serif", letterSpacing:'0.04em' };
  const fontB: React.CSSProperties = { fontFamily:"'Barlow Condensed',sans-serif" };

  function BlueBtn({ children, onClick, disabled }: any) {
    return (
      <button onClick={onClick} disabled={disabled} style={fontH}
        className="w-full bg-[#0a2a6c] text-white text-lg tracking-wider py-4 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed">
        {children}
      </button>
    );
  }
  function OutlineBtn({ children, onClick }: any) {
    return (
      <button onClick={onClick} style={fontH}
        className="flex-1 border-2 border-[#0a2a6c] text-[#0a2a6c] text-lg tracking-wider py-4 rounded-xl hover:bg-[#0a2a6c]/5 transition">
        {children}
      </button>
    );
  }
  function Card({ children }: any) {
    return <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-auto" style={fontB}>{children}</div>;
  }
  function Progress({ s, t }: { s: number; t: number }) {
    return (
      <div className="w-full max-w-md mx-auto mb-6">
        <div className="flex justify-between text-sm font-bold text-[#0a2a6c] mb-2" style={fontB}>
          <span>PASSO {s} DE {t}</span><span>{Math.round(s/t*100)}%</span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
          <div className="h-full bg-[#0a2a6c] transition-all duration-500" style={{width:`${s/t*100}%`}}/>
        </div>
      </div>
    );
  }
  function Dots({ active, total }: { active: number; total: number }) {
    return (
      <div className="flex gap-2 justify-center mt-6">
        {Array.from({length:total}).map((_,i)=>(
          <div key={i} className={`w-2.5 h-2.5 rounded-full ${i<=active?'bg-[#0a2a6c]':'bg-white/70'}`}/>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFD60A] flex items-center justify-center px-4 py-10" style={fontB}>
      <div className="w-full">

        {/* ── HERO ── */}
        {step==='hero' && (
          <div className="max-w-2xl mx-auto text-center px-4">
            <h1 className="text-[2.5rem] leading-[0.95] sm:text-7xl uppercase text-[#0a2a6c] text-balance" style={fontH}>
              Seu filho na{' '}
              <span className="normal-case text-[#006847] inline-block" style={{...fontH,fontStyle:'italic'}}>
                figurinha
              </span>{' '}
              oficial da Copa
            </h1>
            <p className="mt-3 text-base sm:text-lg text-[#0a2a6c]/80 font-semibold">
              Realismo Panini · pronto em segundos
            </p>
            <div className="my-10 relative h-80 flex items-center justify-center">
              <img src="/sample-isabela.png" alt="" className="absolute h-64 sm:h-72 sway-left drop-shadow-2xl rounded-lg" style={{transform:'translateX(-8rem) rotate(-4deg)'}}/>
              <img src="/sample-lucas.png" alt="" className="absolute h-72 sm:h-80 z-10 sway-center drop-shadow-2xl rounded-lg"/>
              <img src="/sample-pedro.png" alt="" className="absolute h-64 sm:h-72 sway-right drop-shadow-2xl rounded-lg" style={{transform:'translateX(8rem) rotate(4deg)'}}/>
            </div>
            <p className="text-[#0a2a6c] font-semibold max-w-md mx-auto mb-6">
              Responda perguntas rápidas, e em menos de 5 minutos tenha a figurinha do seu pequeno craque da copa ❤️
            </p>
            <button onClick={()=>setStep('q1')} style={fontH}
              className="bg-[#0a2a6c] text-white uppercase tracking-widest py-5 px-16 rounded-xl text-xl hover:scale-105 transition shadow-xl">
              Iniciar
            </button>
            <div className="flex gap-2 justify-center mt-6">
              {['BR','AR','FR','DE','ES'].map(c=>(
                <span key={c} className="bg-white text-[#0a2a6c] text-xs font-bold rounded-full w-9 h-9 flex items-center justify-center">{c}</span>
              ))}
            </div>
            <p className="text-[#0a2a6c] font-bold mt-4 text-sm">+2.500 figurinhas já criadas!</p>
          </div>
        )}

        {/* ── Q1 ── */}
        {step==='q1' && (
          <>
            <Progress s={1} t={4}/>
            <Card>
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">✍️</div>
                <h2 className="text-3xl text-[#0a2a6c]" style={fontH}>QUAL O NOME DO CRAQUE?</h2>
                <p className="text-sm text-gray-600 mt-1">O nome que vai aparecer na figurinha</p>
              </div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome e sobrenome"
                className="w-full border border-gray-300 rounded-xl px-4 py-4 mb-5 focus:outline-none focus:border-[#0a2a6c]"/>
              <div className="text-xs font-bold text-[#0a2a6c] uppercase mb-2">Foto do craque</div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['🖼️','📷'].map((icon,i)=>(
                  <button key={i} onClick={()=>{if(!name.trim()){setPhotoAlert(true);return;}fileRef.current?.click();}}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-[#0a2a6c] transition">
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-xs font-bold">{i===0?'Enviar foto DO ROSTO':'Câmera'}</div>
                  </button>
                ))}
              </div>
              {photoAlert && (
                <div className="flex items-start justify-between gap-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-900 rounded p-3 mb-4 text-sm">
                  <span className="font-bold">Escreva o nome primeiro</span>
                  <button onClick={()=>setPhotoAlert(false)} className="font-bold hover:opacity-70">✕</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
            </Card>
            <Dots active={0} total={4}/>
          </>
        )}

        {/* ── UPLOADING ── */}
        {step==='uploading' && (
          <Card>
            <h2 className="text-2xl text-[#0a2a6c] text-center mb-4" style={fontH}>CARREGANDO FOTO</h2>
            {photo && <img src={photo} alt="" className="w-32 h-32 object-cover rounded-lg mx-auto mb-3"/>}
            <p className="text-center text-sm text-gray-700 italic mb-4">Esse tem cara de jogador caro hein</p>
            <div className="flex justify-between text-xs font-bold text-[#0a2a6c] mb-1"><span>Carregando...</span><span>{loadPct}%</span></div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#0a2a6c] transition-all" style={{width:`${loadPct}%`}}/></div>
          </Card>
        )}

        {/* ── LOADING INFO ── */}
        {step==='loading-info' && (
          <Card>
            <h2 className="text-2xl text-[#0a2a6c] text-center mb-4" style={fontH}>CARREGANDO INFORMAÇÕES</h2>
            {photo && <img src={photo} alt="" className="w-32 h-32 object-cover rounded-lg mx-auto mb-3"/>}
            <p className="text-center text-sm text-gray-700 mb-4">Preparando a ficha técnica do craque...</p>
            <div className="flex justify-between text-xs font-bold text-[#0a2a6c] mb-1"><span>Processando...</span><span>{Math.min(100,Math.round(infoPct))}%</span></div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#0a2a6c] transition-all" style={{width:`${Math.min(100,infoPct)}%`}}/></div>
          </Card>
        )}

        {/* ── Q2 ── */}
        {step==='q2' && (
          <>
            <Progress s={2} t={4}/>
            <Card>
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🎂</div>
                <h2 className="text-3xl text-[#0a2a6c]" style={fontH}>DATA DE NASCIMENTO</h2>
                <p className="text-sm text-gray-600 mt-1">Pra calcular a idade na figurinha</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div>
                  <label className="text-xs font-bold text-[#0a2a6c] uppercase">Dia</label>
                  <select value={day} onChange={e=>setDay(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1">
                    <option value="">--</option>
                    {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0a2a6c] uppercase">Mês</label>
                  <select value={month} onChange={e=>setMonth(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1">
                    <option value="">--</option>
                    {MONTHS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0a2a6c] uppercase">Ano</label>
                  <select value={year} onChange={e=>setYear(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1">
                    <option value="">--</option>
                    {Array.from({length:71},(_,i)=>2020-i).map(y=><option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mb-4 text-sm text-yellow-900">
                📩 Preencha <b>e-mail</b> e <b>WhatsApp</b> para receber sua figurinha em <b>4K</b>.
              </div>
              <label className="text-xs font-bold text-[#0a2a6c] uppercase">Seu melhor e-mail</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="email@exemplo.com"
                className="w-full border-2 border-[#0a2a6c] rounded-lg px-4 py-3 mt-1 mb-4 focus:outline-none focus:ring-2 focus:ring-[#0a2a6c]"/>
              <label className="text-xs font-bold text-[#0a2a6c] uppercase">WhatsApp (com DDD)</label>
              <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value.replace(/\D/g,''))} type="tel" placeholder="(11) 91234-5678" maxLength={11}
                className="w-full border-2 border-[#0a2a6c] rounded-lg px-4 py-3 mt-1 mb-5 focus:outline-none focus:ring-2 focus:ring-[#0a2a6c]"/>
              <div className="flex gap-3">
                <OutlineBtn onClick={()=>setStep('q1')}>Voltar</OutlineBtn>
                <div className="flex-1">
                  <BlueBtn disabled={!day||!month||!year||!email.includes('@')||whatsapp.length<10} onClick={()=>setStep('q3')}>Próximo →</BlueBtn>
                </div>
              </div>
            </Card>
            <Dots active={1} total={4}/>
          </>
        )}

        {/* ── Q3 ── */}
        {step==='q3' && (
          <>
            <Progress s={3} t={4}/>
            <Card>
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">⚽</div>
                <h2 className="text-3xl text-[#0a2a6c]" style={fontH}>DADOS DO CRAQUE</h2>
                <p className="text-sm text-gray-600 mt-1">Pra completar a ficha técnica</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-bold text-[#0a2a6c] uppercase">Altura (cm)</label>
                  <input value={height} onChange={e=>setHeight(e.target.value.replace(/\D/g,''))} maxLength={3}
                    className="w-full border-2 border-[#0a2a6c] rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0a2a6c]"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0a2a6c] uppercase">Peso (kg)</label>
                  <input value={weight} onChange={e=>setWeight(e.target.value.replace(/\D/g,''))} maxLength={3}
                    className="w-full border-2 border-[#0a2a6c] rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0a2a6c]"/>
                </div>
              </div>
              <label className="text-xs font-bold text-[#0a2a6c] uppercase">Clube do coração</label>
              <input list="clubes-br" value={club} onChange={e=>setClub(e.target.value)} placeholder="Comece a digitar ou escolha"
                className="w-full border-2 border-[#0a2a6c] rounded-lg px-4 py-3 mt-1 mb-5 focus:outline-none focus:ring-2 focus:ring-[#0a2a6c]"/>
              <datalist id="clubes-br">{BRAZIL_CLUBS.map(c=><option key={c} value={c}/>)}</datalist>
              <div className="flex gap-3">
                <OutlineBtn onClick={()=>setStep('q2')}>Voltar</OutlineBtn>
                <div className="flex-1"><BlueBtn disabled={!club.trim()||!height||!weight} onClick={()=>setStep('review')}>Próximo →</BlueBtn></div>
              </div>
            </Card>
            <Dots active={2} total={4}/>
          </>
        )}

        {/* ── REVIEW ── */}
        {step==='review' && (
          <>
            <Progress s={4} t={4}/>
            <Card>
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">⚠️</div>
                <h2 className="text-3xl text-[#0a2a6c]" style={fontH}>CONFIRA SEUS DADOS</h2>
                <p className="text-sm text-gray-600 mt-2">A figurinha será gerada em breve. Revise os dados abaixo com atenção.</p>
                <p className="text-sm font-bold text-[#0a2a6c] mt-1">Não fazemos alterações após a aprovação e pagamento.</p>
              </div>
              {photo && (
                <div className="flex items-center gap-3 mb-4">
                  <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-[#0a2a6c]"/>
                  <p className="text-xs font-bold uppercase text-[#0a2a6c]">Verifique se o rosto está próximo</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
                {[['Nome',name],['Nascimento',`${day} ${month} ${year}`],['E-mail',email],['WhatsApp',whatsapp],['Peso',`${weight} kg`],['Altura',`${height} cm`],['Clube',club]].map(([l,v])=>(
                  <div key={l} className="flex justify-between border-b border-gray-200 pb-1 last:border-0">
                    <span className="font-bold uppercase text-[#0a2a6c] text-xs">{l}</span>
                    <span className="text-gray-800 truncate ml-2">{v}</span>
                  </div>
                ))}
              </div>
              <BlueBtn onClick={()=>setStep('generating')}>Entendi, gerar figurinha 🌍</BlueBtn>
              <button onClick={()=>setStep('q1')} className="w-full mt-3 border-2 border-gray-200 rounded-xl py-3 font-bold uppercase text-gray-700">
                Corrigir dados
              </button>
            </Card>
            <Dots active={3} total={4}/>
          </>
        )}

        {/* ── GENERATING ── */}
        {step==='generating' && (
          <Card>
            <h2 className="text-3xl text-[#0a2a6c] text-center" style={fontH}>GERANDO SUA FIGURINHA</h2>
            <p className="text-center text-sm font-bold text-[#0a2a6c] mb-4">Não saia dessa tela, leva até 2 minutos.</p>
            {photo && <img src={photo} alt="" className="w-full max-w-xs mx-auto rounded-lg mb-4"/>}
            <p className="text-center font-bold text-[#0a2a6c] mb-4 px-2">
              Compre hoje e receba junto um álbum de figurinhas em alta qualidade e pronto para imprimir.
            </p>
            <div className="flex justify-between text-xs font-bold text-[#0a2a6c] mb-1"><span>Processando...</span><span>{Math.round(genPct)}%</span></div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#0a2a6c] transition-all" style={{width:`${Math.round(genPct)}%`}}/></div>
            {genError && (
              <div className="mt-4 text-center">
                <p className="text-sm text-red-600 font-bold mb-3">{genError}</p>
                <BlueBtn onClick={()=>{setStep('review');setTimeout(()=>setStep('generating'),50);}}>Tentar novamente</BlueBtn>
              </div>
            )}
          </Card>
        )}

        {/* ── RESULT ── */}
        {step==='result' && stickerUrl && (
          <div className="max-w-md mx-auto text-center">
            <img src={stickerUrl} alt="Sua figurinha" className="w-72 mx-auto rounded-xl shadow-2xl mb-6"/>
            <h2 className="text-6xl text-[#0a2a6c]" style={fontH}>GOOLL!</h2>
            <p className="font-bold text-[#0a2a6c] mt-2">Sua figurinha está pronta!</p>
            <p className="text-sm text-gray-700 mt-2 px-4">
              Receba o arquivo digital em 4K para impressão e participe do sorteio. Leia o regulamento em seu e-mail.
            </p>
            <p className="text-4xl text-green-600 my-5" style={fontH}>R$12,90</p>
            <BlueBtn onClick={()=>alert('Redirecionando para pagamento...')}>Receber minha figurinha</BlueBtn>
            <p className="text-sm font-bold text-green-700 mt-3">✅ Figurinha enviada na mesma hora</p>
            <p className="text-xs text-gray-700 mt-1">É só voltar aqui em Minha Área após o pagamento.</p>
            <p className="text-xs text-gray-700 mt-6">+2.500 figurinhas já criadas!</p>
          </div>
        )}

      </div>
    </div>
  );
}
