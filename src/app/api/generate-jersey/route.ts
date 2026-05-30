import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { photoDataUrl, name } = await req.json();

    if (!photoDataUrl || !photoDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Foto inválida' }, { status: 400 });
    }
    if (photoDataUrl.length > 8_000_000) {
      return NextResponse.json({ error: 'Foto muito grande' }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ imageDataUrl: photoDataUrl, usedFallback: true });
    }

    const prompt = `EDIT THIS PHOTO: Replace ONLY the person's clothing with the official Brazil National Team soccer jersey.

MANDATORY CHANGES TO CLOTHING:
- Remove whatever shirt/top the person is wearing
- Replace it with the official Brazil CBF yellow jersey (canary yellow color)
- The jersey must have: green collar trim, CBF badge on left chest, Nike swoosh on right chest
- Keep the same body pose and position

ABSOLUTELY DO NOT CHANGE:
- The person's face - keep 100% identical
- Hair color, style, length - exactly the same
- Skin tone - no changes
- Facial expression - keep the same
- Background can be cleaned to solid light blue or gradient blue

OUTPUT: A clean portrait photo showing the SAME EXACT PERSON now wearing the Brazil yellow jersey, suitable for a Panini FIFA World Cup sticker. Photorealistic quality, not cartoon.`;

    // Convert dataUrl to base64 only
    const base64 = photoDataUrl.split(',')[1];
    const mimeMatch = photoDataUrl.match(/data:(image\/\w+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: (() => {
        const form = new FormData();
        // Convert base64 to Blob
        const byteChars = atob(base64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArr], { type: mimeType });
        form.append('image', blob, 'photo.png');
        form.append('prompt', prompt);
        form.append('model', 'gpt-image-1');
        form.append('size', '1024x1024');
        form.append('quality', 'high');
        form.append('response_format', 'b64_json');
        form.append('n', '1');
        return form;
      })(),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`OpenAI falhou (${res.status}): ${txt.slice(0, 300)}`);
      return NextResponse.json({ imageDataUrl: photoDataUrl, usedFallback: true });
    }

    const json: any = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      console.error('OpenAI: sem imagem na resposta', JSON.stringify(json).slice(0, 200));
      return NextResponse.json({ imageDataUrl: photoDataUrl, usedFallback: true });
    }

    return NextResponse.json({ imageDataUrl: `data:image/png;base64,${b64}`, usedFallback: false });

  } catch (e: any) {
    console.error('Erro generateJersey:', e);
    return NextResponse.json({ error: e?.message ?? 'Erro interno' }, { status: 500 });
  }
}
