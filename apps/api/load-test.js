/**
 * Load test: simulate 50 concurrent orders (lecture-break rush).
 *
 * Usage:
 *   node load-test.js http://localhost:4000
 *
 * The script creates 50 users, each placing an order for the same product,
 * then polls for the order status until it's "completed". Metrics are
 * printed at the end.
 */

const API_URL = process.argv[2] || 'http://localhost:4000';
const CONCURRENT_USERS = 50;
const PRODUCT_ID = '22222222-0000-0000-0000-000000000001';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'content-type': 'application/json', ...options.headers },
    ...options,
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.error || text}`);
  return body;
}

async function authenticate(i) {
  const phone = `+20999999${String(i).padStart(3, '0')}`;
  await request('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
  const { token } = await request('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code: '000000' }),
  });
  return token;
}

async function placeOrder(token) {
  return request('/orders', {
    method: 'POST',
    headers: { 'x-user-id': 'load-test', 'x-user-role': 'student', 'x-verification-status': 'approved', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      fulfillmentType: 'pickup',
      paymentMethod: 'cash',
      redeemPoints: 0,
      items: [{ productId: PRODUCT_ID, quantity: 1, options: { size: 'Medium', sugar: 'Normal' } }],
    }),
  });
}

async function advanceOrder(orderId) {
  for (const status of ['accepted', 'preparing', 'ready', 'completed']) {
    await request(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'x-user-id': 'admin', 'x-user-role': 'barista', 'x-verification-status': 'approved' },
      body: JSON.stringify({ status }),
    });
  }
}

async function runUser(i) {
  const start = Date.now();
  try {
    const token = await authenticate(i);
    const authMs = Date.now() - start;

    const orderStart = Date.now();
    const { order } = await placeOrder(token);
    const orderMs = Date.now() - orderStart;

    const advanceStart = Date.now();
    await advanceOrder(order.id);
    const advanceMs = Date.now() - advanceStart;

    return { i, success: true, authMs, orderMs, advanceMs, totalMs: Date.now() - start };
  } catch (err) {
    return { i, success: false, error: err.message, totalMs: Date.now() - start };
  }
}

async function main() {
  console.log(`Load test: ${CONCURRENT_USERS} concurrent users → ${API_URL}`);
  console.time('Total');

  const results = await Promise.all(
    Array.from({ length: CONCURRENT_USERS }, (_, i) => runUser(i))
  );

  console.timeEnd('Total');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n✅ Successful: ${successful.length}/${CONCURRENT_USERS}`);
  console.log(`❌ Failed: ${failed.length}/${CONCURRENT_USERS}`);

  if (successful.length > 0) {
    const authTimes = successful.map((r) => r.authMs);
    const orderTimes = successful.map((r) => r.orderMs);
    const totalTimes = successful.map((r) => r.totalMs);

    const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const max = (arr) => Math.max(...arr);

    console.log(`\n⏱ Auth avg: ${avg(authTimes)}ms | max: ${max(authTimes)}ms`);
    console.log(`⏱ Order create avg: ${avg(orderTimes)}ms | max: ${max(orderTimes)}ms`);
    console.log(`⏱ Total flow avg: ${avg(totalTimes)}ms | max: ${max(totalTimes)}ms`);
  }

  if (failed.length > 0) {
    console.log('\nFirst 3 errors:');
    failed.slice(0, 3).forEach((r) => console.log(`  - User ${r.i}: ${r.error}`));
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main();
