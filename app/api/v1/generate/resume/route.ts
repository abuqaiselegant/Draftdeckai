import { NextRequest, type NextResponse } from 'next/server';
import { addDeprecationHeaders, convertV1ResumeToV2, type V1ResumeInput } from '@/lib/api-versioning';
import { POST as v2POST } from '@/app/api/generate/resume/route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const legacyBody = await request.json() as V1ResumeInput;
  const v2Body = convertV1ResumeToV2(legacyBody);

  // Rebuild the request with the converted body so v2POST receives its expected shape
  const v2Request = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(v2Body),
  });

  const response = await v2POST(v2Request) as NextResponse;
  return addDeprecationHeaders(response);
}
