import { NextRequest, type NextResponse } from 'next/server';
import { addDeprecationHeaders, convertV1DocumentToV2, type V1DocumentInput } from '@/lib/api-versioning';
import { POST as v2POST, GET as v2GET } from '@/app/api/documents/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const response = await v2GET(request) as NextResponse;
  return addDeprecationHeaders(response);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const legacyBody = await request.json() as V1DocumentInput;
  const v2Body = convertV1DocumentToV2(legacyBody);

  // Rebuild the request with the converted body so v2POST receives its expected shape
  const v2Request = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(v2Body),
  });

  const response = await v2POST(v2Request) as NextResponse;
  return addDeprecationHeaders(response);
}
