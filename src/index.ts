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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function handleOptions(request: Request) {
  let headers = request.headers;
  if (
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null
  ) {
    let respHeaders = {
      ...corsHeaders,
      'Access-Control-Allow-Headers': request.headers.get(
        'Access-Control-Request-Headers'
      )!,
    };

    return new Response(null, {
      headers: respHeaders,
    });
  } else {
    return new Response(null, {
      headers: {
        Allow: 'POST, OPTIONS',
      },
    });
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    if (request.method !== 'POST') {
      return new Response(null, {
        status: 405,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/') {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json') && !request.body) {
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    const body: RequestBody = await request.json();
    const validateResult = schema.safeParse(body);
    if (!validateResult.success) {
      return new Response(null, { status: 400, headers: corsHeaders });
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
      return new Response(null, { status: 500, headers: corsHeaders });
    }

    return new Response(null, { status: 200, headers: corsHeaders });
  },
};
