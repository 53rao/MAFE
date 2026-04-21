import { NextRequest, NextResponse } from "next/server";

const API = process.env.MAFE_API_URL ?? "http://localhost:8000";

async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const url = `${API}/${path.join("/")}`;

  const res = await fetch(url, {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" ? req.body : undefined,
    // @ts-expect-error :Ingore
    duplex: "half",
  });

  const headers = new Headers();
  headers.set("Content-Type", res.headers.get("Content-Type") ?? "application/json");
  if (res.headers.has("Content-Disposition")) {
    headers.set("Content-Disposition", res.headers.get("Content-Disposition")!);
  }

  return new NextResponse(res.body, {
    status: res.status,
    headers,
  });
}

export { handler as GET, handler as POST, handler as DELETE };