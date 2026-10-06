import { track } from '@/lib/analytics';

export async function POST(req: Request) {
  try {
    const body = JSON.parse(await req.text());
    await track(body, req.headers.get('user-agent'));
  } catch { /* analytics never breaks the page */ }
  return new Response(null, { status: 204 });
}
