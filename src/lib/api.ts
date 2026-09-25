import type { CalculationRequest } from './calculator-input';

type RequestOptions = {
  apiUrl?: string;
  allowHttp?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export function validateApiUrl(value: string | undefined, allowHttp: boolean): string {
  if (!value?.trim()) throw new Error('Set EXPO_PUBLIC_API_URL to the backend URL, then reload the app.');
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL must be a valid HTTP or HTTPS URL.');
  }
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
    throw new Error('The backend URL must use HTTPS outside development.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The backend URL must not contain credentials, a query, or a fragment.');
  }
  return url.toString().replace(/\/$/, '');
}

export async function calculateRemotely(
  input: CalculationRequest,
  options: RequestOptions = {},
): Promise<number> {
  const baseUrl = validateApiUrl(options.apiUrl ?? process.env.EXPO_PUBLIC_API_URL, options.allowHttp ?? false);
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 10000);

  try {
    let response: Response;
    let payload: unknown;
    try {
      response = await fetch(`${baseUrl}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const text = await response.text();
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error('INVALID_RESPONSE');
      }
    } catch (error) {
      if (options.signal?.aborted) throw new Error('Calculation cancelled.');
      if (timedOut) throw new Error('The backend took too long to respond. Please try again.');
      if (error instanceof Error && error.message === 'INVALID_RESPONSE') {
        throw new Error('The backend returned an invalid response. Please try again.');
      }
      throw new Error('Cannot reach the backend. Check your connection and make sure the API is running, then try again.');
    }
    const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    if (!response.ok) {
      const error = body.error as { message?: unknown } | undefined;
      throw new Error(typeof error?.message === 'string' ? error.message : `The backend returned HTTP ${response.status}.`);
    }
    if (typeof body.result !== 'number' || !Number.isFinite(body.result)) {
      throw new Error('The backend returned an invalid result. Please try again.');
    }
    return body.result;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
