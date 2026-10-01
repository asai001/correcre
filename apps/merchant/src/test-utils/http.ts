// Route Handler のテストで使う Request / params の組み立て。

type JsonRequestInit = {
  method?: string;
  // JSON として送るボディ。rawBody と同時には指定しない。
  body?: unknown;
  // 壊れた JSON などをそのまま送りたい場合に使う。
  rawBody?: string;
  headers?: Record<string, string>;
};

export function jsonRequest(url: string, init: JsonRequestInit = {}): Request {
  const hasBody = init.body !== undefined || init.rawBody !== undefined;

  return new Request(url, {
    method: init.method ?? (hasBody ? "POST" : "GET"),
    headers: {
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
    body: init.rawBody ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
}

// Next.js 15 の動的セグメントは `params` が Promise で渡される。
export function routeContext<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

export async function readJson<T = unknown>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
