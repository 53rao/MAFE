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

  return new NextResponse(await res.text(), {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export { handler as GET, handler as POST };