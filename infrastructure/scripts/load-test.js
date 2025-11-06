/**
 * k6 Load Test Script for NextGen AI Platform
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 * Run: k6 run infrastructure/scripts/load-test.js
 *
 * Performance Targets:
 * - Concurrent Users: 1,000+
 * - API Response Time: <500ms (p95)
 * - Code Generation Time: <3s
 * - Preview Loading: <1s
 * - Availability: 99.9% SLA
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const codeGenerationTime = new Trend('code_generation_time');
const previewLoadTime = new Trend('preview_load_time');
const successfulRequests = new Counter('successful_requests');

// Test configuration
export const options = {
  stages: [
    // Ramp-up: 0 to 100 users over 2 minutes
    { duration: '2m', target: 100 },

    // Steady state: 100 users for 5 minutes
    { duration: '5m', target: 100 },

    // Ramp-up: 100 to 500 users over 3 minutes
    { duration: '3m', target: 500 },

    // Steady state: 500 users for 5 minutes
    { duration: '5m', target: 500 },

    // Peak load: 500 to 1000 users over 2 minutes
    { duration: '2m', target: 1000 },

    // Peak steady state: 1000 users for 5 minutes
    { duration: '5m', target: 1000 },

    // Ramp-down: 1000 to 0 users over 3 minutes
    { duration: '3m', target: 0 },
  ],

  thresholds: {
    // 95% of requests should complete within 500ms
    'http_req_duration': ['p(95)<500'],

    // Error rate should be less than 1%
    'errors': ['rate<0.01'],

    // API response time p95 should be less than 500ms
    'api_response_time': ['p(95)<500'],

    // Code generation time p95 should be less than 3s
    'code_generation_time': ['p(95)<3000'],

    // Preview load time p95 should be less than 1s
    'preview_load_time': ['p(95)<1000'],

    // 99.9% availability (less than 0.1% failures)
    'http_req_failed': ['rate<0.001'],
  ],
};

// Base URL (change for your environment)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:3002';

// Test data
const testUser = {
  email: `loadtest-${Date.now()}@example.com`,
  password: 'Test123!@#',
};

const testProject = {
  name: `Test Project ${Date.now()}`,
  description: 'Load test project',
};

const codeGenerationPrompts = [
  'Create a React component for user authentication',
  'Build a TypeScript function to validate email addresses',
  'Generate a Node.js API endpoint for user registration',
  'Create a Tailwind CSS card component',
  'Build a Next.js page with server-side rendering',
];

export function setup() {
  // Register a test user
  const registerRes = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(testUser), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(registerRes, {
    'user registered successfully': (r) => r.status === 200 || r.status === 201,
  });

  // Login and get token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(testUser), {
    headers: { 'Content-Type': 'application/json' },
  });

  const token = loginRes.json('token') || '';

  return { token };
}

export default function (data) {
  const { token } = data;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Test 1: Homepage load
  group('Homepage Load', () => {
    const startTime = Date.now();
    const res = http.get(BASE_URL);
    const duration = Date.now() - startTime;

    check(res, {
      'homepage status is 200': (r) => r.status === 200,
      'homepage loads in <1s': () => duration < 1000,
    }) || errorRate.add(1);

    successfulRequests.add(1);
  });

  sleep(1);

  // Test 2: API Health Check
  group('API Health Check', () => {
    const startTime = Date.now();
    const res = http.get(`${API_URL}/health`);
    const duration = Date.now() - startTime;

    apiResponseTime.add(duration);

    check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check responds in <100ms': () => duration < 100,
    }) || errorRate.add(1);
  });

  sleep(1);

  // Test 3: Create Project
  group('Create Project', () => {
    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/projects`,
      JSON.stringify(testProject),
      { headers }
    );
    const duration = Date.now() - startTime;

    apiResponseTime.add(duration);

    const success = check(res, {
      'project created successfully': (r) => r.status === 200 || r.status === 201,
      'project creation in <500ms': () => duration < 500,
    });

    if (!success) errorRate.add(1);

    // Store project ID for later use
    const projectId = res.json('id') || res.json('data.id');
    return { projectId };
  });

  sleep(1);

  // Test 4: List Projects
  group('List Projects', () => {
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/api/projects`, { headers });
    const duration = Date.now() - startTime;

    apiResponseTime.add(duration);

    check(res, {
      'projects listed successfully': (r) => r.status === 200,
      'list projects in <300ms': () => duration < 300,
    }) || errorRate.add(1);
  });

  sleep(1);

  // Test 5: AI Code Generation
  group('AI Code Generation', () => {
    const prompt = codeGenerationPrompts[Math.floor(Math.random() * codeGenerationPrompts.length)];

    const startTime = Date.now();
    const res = http.post(
      `${API_URL}/generate`,
      JSON.stringify({
        prompt,
        language: 'typescript',
        provider: 'claude',
      }),
      {
        headers,
        timeout: '10s',  // Allow up to 10s for code generation
      }
    );
    const duration = Date.now() - startTime;

    codeGenerationTime.add(duration);

    check(res, {
      'code generated successfully': (r) => r.status === 200,
      'code generation in <3s': () => duration < 3000,
      'response contains code': (r) => {
        try {
          const body = r.json();
          return body.code && body.code.length > 0;
        } catch (e) {
          return false;
        }
      },
    }) || errorRate.add(1);
  });

  sleep(2);

  // Test 6: RAG Search
  group('RAG Search', () => {
    const startTime = Date.now();
    const res = http.post(
      `${API_URL}/rag/search`,
      JSON.stringify({
        query: 'How to create a React component?',
        limit: 5,
      }),
      { headers }
    );
    const duration = Date.now() - startTime;

    apiResponseTime.add(duration);

    check(res, {
      'RAG search successful': (r) => r.status === 200,
      'RAG search in <500ms': () => duration < 500,
    }) || errorRate.add(1);
  });

  sleep(1);

  // Test 7: Security Check
  group('Security Check', () => {
    const codeToCheck = `
      const userData = req.query.user;
      const query = "SELECT * FROM users WHERE id = " + userData;
    `;

    const startTime = Date.now();
    const res = http.post(
      `${API_URL}/security/check`,
      JSON.stringify({
        code: codeToCheck,
        language: 'javascript',
      }),
      { headers }
    );
    const duration = Date.now() - startTime;

    apiResponseTime.add(duration);

    check(res, {
      'security check successful': (r) => r.status === 200,
      'security check in <1s': () => duration < 1000,
    }) || errorRate.add(1);
  });

  sleep(1);

  // Test 8: Preview Load
  group('Preview Load', () => {
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/preview/test`, { headers });
    const duration = Date.now() - startTime;

    previewLoadTime.add(duration);

    check(res, {
      'preview loads successfully': (r) => r.status === 200,
      'preview loads in <1s': () => duration < 1000,
    }) || errorRate.add(1);
  });

  sleep(2);

  // Test 9: Get Analytics
  group('Get Analytics', () => {
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/api/analytics?period=24h`, { headers });
    const duration = Date.now() - startTime;

    apiResponseTime.add(duration);

    check(res, {
      'analytics retrieved successfully': (r) => r.status === 200,
      'analytics in <500ms': () => duration < 500,
    }) || errorRate.add(1);
  });

  sleep(1);

  // Test 10: Korean Templates
  group('Korean Templates', () => {
    const startTime = Date.now();
    const res = http.get(`${API_URL}/templates`, { headers });
    const duration = Date.now() - startTime;

    apiResponseTime.add(duration);

    check(res, {
      'templates retrieved successfully': (r) => r.status === 200,
      'templates in <300ms': () => duration < 300,
    }) || errorRate.add(1);
  });
}

export function teardown(data) {
  // Cleanup: Delete test user (optional)
  console.log('Load test completed!');
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
    'load-test-results.html': htmlReport(data),
  };
}

// Helper functions
function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `
${indent}Test Summary:
${indent}=============
${indent}Total Requests: ${data.metrics.http_reqs.values.count}
${indent}Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
${indent}
${indent}Response Time:
${indent}  - Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  - p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  - p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}
${indent}Throughput: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
${indent}
${indent}Custom Metrics:
${indent}  - API Response Time (p95): ${data.metrics.api_response_time?.values['p(95)']?.toFixed(2) || 'N/A'}ms
${indent}  - Code Generation Time (p95): ${data.metrics.code_generation_time?.values['p(95)']?.toFixed(2) || 'N/A'}ms
${indent}  - Preview Load Time (p95): ${data.metrics.preview_load_time?.values['p(95)']?.toFixed(2) || 'N/A'}ms
${indent}  - Error Rate: ${(data.metrics.errors?.values.rate || 0) * 100}%
`;

  return summary;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Results - NextGen AI Platform</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .pass { color: green; font-weight: bold; }
    .fail { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Load Test Results - NextGen AI Platform</h1>
  <h2>Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
    <tr>
      <td>Total Requests</td>
      <td>${data.metrics.http_reqs.values.count}</td>
      <td class="pass">✓</td>
    </tr>
    <tr>
      <td>Failed Requests</td>
      <td>${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</td>
      <td class="${data.metrics.http_req_failed.values.rate < 0.001 ? 'pass' : 'fail'}">
        ${data.metrics.http_req_failed.values.rate < 0.001 ? '✓' : '✗'}
      </td>
    </tr>
    <tr>
      <td>Response Time (p95)</td>
      <td>${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td>
      <td class="${data.metrics.http_req_duration.values['p(95)'] < 500 ? 'pass' : 'fail'}">
        ${data.metrics.http_req_duration.values['p(95)'] < 500 ? '✓' : '✗'}
      </td>
    </tr>
    <tr>
      <td>Throughput</td>
      <td>${data.metrics.http_reqs.values.rate.toFixed(2)} req/s</td>
      <td class="pass">✓</td>
    </tr>
  </table>

  <h2>Performance Targets</h2>
  <table>
    <tr><th>Target</th><th>Expected</th><th>Actual</th><th>Status</th></tr>
    <tr>
      <td>API Response Time (p95)</td>
      <td>&lt; 500ms</td>
      <td>${data.metrics.api_response_time?.values['p(95)']?.toFixed(2) || 'N/A'}ms</td>
      <td class="${(data.metrics.api_response_time?.values['p(95)'] || 0) < 500 ? 'pass' : 'fail'}">
        ${(data.metrics.api_response_time?.values['p(95)'] || 0) < 500 ? '✓' : '✗'}
      </td>
    </tr>
    <tr>
      <td>Code Generation Time (p95)</td>
      <td>&lt; 3s</td>
      <td>${data.metrics.code_generation_time?.values['p(95)']?.toFixed(2) || 'N/A'}ms</td>
      <td class="${(data.metrics.code_generation_time?.values['p(95)'] || 0) < 3000 ? 'pass' : 'fail'}">
        ${(data.metrics.code_generation_time?.values['p(95)'] || 0) < 3000 ? '✓' : '✗'}
      </td>
    </tr>
    <tr>
      <td>Preview Load Time (p95)</td>
      <td>&lt; 1s</td>
      <td>${data.metrics.preview_load_time?.values['p(95)']?.toFixed(2) || 'N/A'}ms</td>
      <td class="${(data.metrics.preview_load_time?.values['p(95)'] || 0) < 1000 ? 'pass' : 'fail'}">
        ${(data.metrics.preview_load_time?.values['p(95)'] || 0) < 1000 ? '✓' : '✗'}
      </td>
    </tr>
    <tr>
      <td>Availability</td>
      <td>&gt; 99.9%</td>
      <td>${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(3)}%</td>
      <td class="${data.metrics.http_req_failed.values.rate < 0.001 ? 'pass' : 'fail'}">
        ${data.metrics.http_req_failed.values.rate < 0.001 ? '✓' : '✗'}
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
