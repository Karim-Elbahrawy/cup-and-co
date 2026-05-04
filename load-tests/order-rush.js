/**
 * k6 load test — Lecture-break order rush
 *
 * Simulates 50 concurrent students all placing orders at the same time
 * (the "lecture break" scenario — the most demanding real-world peak).
 *
 * Run:
 *   k6 run load-tests/order-rush.js
 *   k6 run --env BASE_URL=https://api.yourdomain.com load-tests/order-rush.js
 *
 * Pass/fail thresholds:
 *   - 95th percentile response < 2 s
 *   - error rate < 1%
 *   - order creation success rate > 99%
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Configuration ───────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

// One demo phone per VU (0-padded to 10 digits after country code)
function phoneForVU(vu) {
  return `+2010${String(vu).padStart(8, '0')}`;
}

// ─── Custom metrics ──────────────────────────────────────────────────────────

const orderSuccessRate = new Rate('order_success_rate');
const orderDuration    = new Trend('order_duration_ms', true);
const catalogDuration  = new Trend('catalog_duration_ms', true);

// ─── Load profile ────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    lecture_break_rush: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // ramp up: students flood in after lecture
        { duration: '2m',  target: 50 },   // sustained peak (2-minute break)
        { duration: '30s', target: 0 },    // ramp down: orders placed, traffic subsides
      ],
    },
  },
  thresholds: {
    http_req_duration:  ['p(95)<2000'],   // 95th percentile < 2 s
    http_req_failed:    ['rate<0.01'],    // error rate < 1%
    order_success_rate: ['rate>0.99'],    // order placement success > 99%
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function post(path, payload, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return http.post(`${BASE_URL}${path}`, JSON.stringify(payload), { headers });
}

function get(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return http.get(`${BASE_URL}${path}`, { headers });
}

// ─── Virtual user scenario ────────────────────────────────────────────────────

export default function () {
  const vu    = __VU;
  const phone = phoneForVU(vu);
  let token   = null;

  // ── 1. Auth: send OTP ───────────────────────────────────────────────────
  group('auth', () => {
    const sendRes = post('/auth/otp/send', { phone });
    check(sendRes, {
      'otp send 200': (r) => r.status === 200,
    });

    if (sendRes.status !== 200) return;

    const body = sendRes.json();
    const code = body.devCode ?? '000000'; // dev API returns code inline

    // Verify OTP
    const verifyRes = post('/auth/otp/verify', { phone, code });
    const verified = check(verifyRes, {
      'otp verify 200': (r) => r.status === 200,
      'token present':  (r) => r.json('token') !== null,
    });

    if (verified) {
      token = verifyRes.json('token');
    }
  });

  if (!token) return; // auth failed — skip rest of flow

  sleep(0.5); // brief pause (user reading the home screen)

  // ── 2. Load catalog ─────────────────────────────────────────────────────
  let productId = null;
  let productPrice = 65;

  group('catalog', () => {
    const start = Date.now();
    const catalogRes = get('/catalog', token);
    catalogDuration.add(Date.now() - start);

    check(catalogRes, {
      'catalog 200': (r) => r.status === 200,
    });

    if (catalogRes.status === 200) {
      const products = catalogRes.json('products');
      if (products && products.length > 0) {
        // Pick a random in-stock product
        const available = products.filter((p) => p.is_available);
        const pick = available[Math.floor(Math.random() * available.length)];
        if (pick) {
          productId   = pick.id;
          productPrice = pick.base_price_egp;
        }
      }
    }
  });

  if (!productId) return;

  sleep(1); // user browsing

  // ── 3. Place order ──────────────────────────────────────────────────────
  group('place_order', () => {
    const start = Date.now();
    const orderRes = post(
      '/orders',
      {
        fulfillmentType: 'pickup',
        paymentMethod:   'cash',
        scheduledFor:    null,
        redeemPoints:    0,
        items: [{ productId, quantity: 1, options: {} }],
      },
      token,
    );
    orderDuration.add(Date.now() - start);

    const placed = check(orderRes, {
      'order 201': (r) => r.status === 201,
      'order has id': (r) => r.json('order.id') !== null,
    });
    orderSuccessRate.add(placed);

    // ── 4. Poll order status once ─────────────────────────────────────────
    if (placed) {
      const orderId = orderRes.json('order.id');
      sleep(2);

      const trackRes = get(`/orders/${orderId}`, token);
      check(trackRes, {
        'order track 200': (r) => r.status === 200,
        'status field':    (r) => r.json('order.status') !== null,
      });
    }
  });

  sleep(1);
}
