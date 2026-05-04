/**
 * Load test: simulate 50 concurrent orders (lecture-break rush).
 *
 * Usage:
 *   node load-test.js http://localhost:4000
 *
 * Uses dev-mode auth bypass headers (x-user-id, x-user-role).
 * Requires NODE_ENV=development (the default for local server).
 */

const API_URL = process.argv[2] || 'http://localhost:4000';
const CONCURRENT_USERS = 50;
const PRODUCT_ID = '22222222-0000-0000-0000-000000000001';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const { headers: customHeaders, ...rest } = options;
  const res = await fetch(url, {
    ...rest,
    headers: { 'content-type': 'application/json', ...customHeaders },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    const detail = typeof body === 'object' ? body.error || body.message || JSON.stringify(body) : String(text).slice(0, 200);
    throw new Error(`HTTP ${res.status}: ${detail} (${path})`);
  }
  return body;
}

async function placeOrder(userId) {
  return request('/orders', {
    method: 'POST',
    headers: {
      'x-user-id': userId,
      'x-user-role': 'student',
      'x-verification-status': 'approved',
    },
    body: JSON.stringify({
      fulfillmentType: 'pickup',
      paymentMethod: 'cash',
      redeemPoints: 0,
      items: [{ productId: PRODUCT_ID, quantity: 1, options: { size: 'Medium', sugar: 'Normal' } }],
    }),
  });
}

async function advanceOrder(orderId) {
  const statuses = ['accepted', 'preparing', 'ready', 'completed'];
  for (const status of statuses) {
    await request(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'x-user-id': 'admin', 'x-user-role': 'barista', 'x-verification-status': 'approved' },
      body: JSON.stringify({ status }),
    });
  }
}

async function runUser(i) {
  const userId = `load-test-user-${i}`;
  const start = Date.now();
  try {
    const orderStart = Date.now();
    const { order } = await placeOrder(userId);
    const orderMs = Date.now() - orderStart;

    const advanceStart = Date.now();
    await advanceOrder(order.id);
    const advanceMs = Date.now() - advanceStart;

    return { i, success: true, orderMs, advanceMs, totalMs: Date.now() - start };
  } catch (err) {
    return { i, success: false, error: err.message, totalMs: Date.now() - start };
  }
}

async function main() {
  console.log(`Load test: ${CONCURRENT_USERS} concurrent users → ${API_URL}`);
  console.time('Total');

  const results = await Promise.all(
    Array.from({ length: CONCURRENT_USERS }, (_, i) => runUser(i)),
  );

  console.timeEnd('Total');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n✅ Successful: ${successful.length}/${CONCURRENT_USERS}`);
  console.log(`❌ Failed: ${failed.length}/${CONCURRENT_USERS}`);

  if (successful.length > 0) {
    const orderTimes = successful.map((r) => r.orderMs);
    const advanceTimes = successful.map((r) => r.advanceMs);
    const totalTimes = successful.map((r) => r.totalMs);

    const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const max = (arr) => Math.max(...arr);
    const p95 = (arr) => arr.sort((a, b) => a - b)[Math.floor(arr.length * 0.95)];

    console.log(`\n⏱ Order create avg: ${avg(orderTimes)}ms | max: ${max(orderTimes)}ms | p95: ${p95(orderTimes)}ms`);
    console.log(`⏱ Status advance avg: ${avg(advanceTimes)}ms | max: ${max(advanceTimes)}ms | p95: ${p95(advanceTimes)}ms`);
    console.log(`⏱ Total flow avg: ${avg(totalTimes)}ms | max: ${max(totalTimes)}ms | p95: ${p95(totalTimes)}ms`);
  }

  if (failed.length > 0) {
    console.log('\nFirst 5 errors:');
    failed.slice(0, 5).forEach((r) => console.log(`  - User ${r.i}: ${r.error}`));
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main();