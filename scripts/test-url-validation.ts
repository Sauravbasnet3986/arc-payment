import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { normalizeSwarmUrl } from '@/lib/url';
import { POST as runPost } from '@/app/api/v1/swarm/run/route';
import { POST as streamPost } from '@/app/api/v1/swarm/run/stream/route';

function buildRequest(url: string, body: unknown, ip: string): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

async function run(): Promise<void> {
  // URL normalization unit checks
  assert.equal(normalizeSwarmUrl('example.com/path?q=1'), 'https://example.com/path?q=1');
  assert.equal(normalizeSwarmUrl('http://example.com/docs#section-1'), 'http://example.com/docs');
  assert.equal(normalizeSwarmUrl('ftp://example.com/file.txt'), null);
  assert.equal(normalizeSwarmUrl('not a valid url'), null);

  // /run rejects unsupported schemes
  {
    const request = buildRequest(
      'http://localhost/api/v1/swarm/run',
      { url: 'ftp://example.com', agents: [], budgetCap: 0.1 },
      '203.0.113.101'
    );
    const response = await runPost(request);
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.error, 'Invalid or unsupported URL. Use http(s) format.');
  }

  // /run normalizes bare domains
  {
    const request = buildRequest(
      'http://localhost/api/v1/swarm/run',
      { url: 'example.com', agents: [], budgetCap: 0.1 },
      '203.0.113.102'
    );
    const response = await runPost(request);
    const payload = await response.json();

    assert.equal(response.status, 202);
    assert.equal(payload.success, true);
    assert.equal(payload.job.url, 'https://example.com/');
  }

  // /run/stream rejects invalid URLs
  {
    const request = buildRequest(
      'http://localhost/api/v1/swarm/run/stream',
      { url: 'not a url', agents: [], budgetCap: 0.1 },
      '203.0.113.103'
    );
    const response = await streamPost(request);
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.error, 'Invalid or unsupported URL. Use http(s) format.');
  }

  console.log('All URL validation checks passed.');
}

run().catch((error) => {
  console.error('URL validation checks failed.');
  console.error(error);
  process.exitCode = 1;
});

