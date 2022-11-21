import { z } from 'zod';

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}

const TELEGRAM_API_URL = 'https://api.telegram.org';
const schema = z.object({
  from: z.string().email(),
  subject: z.string().min(2).max(200),
  message: z.string().min(2).max(4000),
});
type RequestBody = z.infer<typeof schema>;

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const contentType = request.headers.get('content-type') ?? '';
    if (url.pathname === '/' && request.method === 'POST') {
      if (!contentType.includes('application/json') && !request.body) {
        return new Response(null, { status: 400 });
      }
      const body: RequestBody = await request.json();
      const validateResult = schema.safeParse(body);
      if (!validateResult.success) {
        return new Response(null, { status: 400 });
      }

      const { from, subject, message } = validateResult.data;
      const query = new URLSearchParams({
        chat_id: env.TELEGRAM_CHANNEL_ID,
        text: `a new contact message from "${from}" with subject "${subject}" and message "${message}"`,
      });
      const reqUrl = `${TELEGRAM_API_URL}/bot${
        env.TELEGRAM_BOT_TOKEN
      }/sendMessage?${query.toString()}`;

      const res = await fetch(reqUrl, {
        method: 'GET',
      });
      const resData: { ok: boolean; result: any } = await res.json();

      if (!resData || !resData.ok) {
        return new Response(null, { status: 500 });
      }

      return new Response(null, { status: 200 });
    }
    return new Response(null, { status: 404 });
  },
};
