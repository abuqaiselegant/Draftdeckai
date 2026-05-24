import { NextRequest, NextResponse, type NextResponse as NextResponseType } from 'next/server';
import { addDeprecationHeaders, convertV1ResumeToV2, type V1ResumeInput } from '@/lib/api-versioning';
import { POST as v2POST } from '@/app/api/generate/resume/route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** v1 resume generation — validates required fields, converts legacy shape (personalInfo, jobTitle, skills CSV) to v2 prompt, then proxies to v2. */
export async function POST(request: NextRequest): Promise<NextResponseType> {
  const legacyBody = await request.json() as V1ResumeInput;

  if (!legacyBody?.personalInfo?.name?.trim()) {
    return NextResponse.json({ error: 'personalInfo.name is required' }, { status: 400 });
  }
  if (!legacyBody?.personalInfo?.email?.trim()) {
    return NextResponse.json({ error: 'personalInfo.email is required' }, { status: 400 });
  }
  if (!legacyBody?.jobTitle?.trim()) {
    return NextResponse.json({ error: 'jobTitle is required' }, { status: 400 });
  }

  const v2Body = convertV1ResumeToV2(legacyBody);

  // Rebuild the request with the converted body so v2POST receives its expected shape
  const v2Request = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(v2Body),
  });

  const response = await v2POST(v2Request) as NextResponseType;
  return addDeprecationHeaders(response);
}
