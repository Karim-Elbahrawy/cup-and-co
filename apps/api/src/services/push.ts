/**
 * Push notification fan-out helper.
 *
 * Phase 2: stub — logs in dev so we can verify the wiring, but does not call
 * APNs or Web Push yet (those keys are in `.env.example` ready for Phase 3).
 *
 * Phase 3 will swap the body of `dispatch` for real APNs (jose JWT signing
 * + HTTP/2 delivery) and Web Push (web-push library + VAPID).
 */

export interface NotificationPayload {
  title: string;
  body: string;
  /** Order id, prize id, etc. — clients use this to deep-link. */
  data?: Record<string, string>;
}

interface DeviceLike {
  platform: 'ios' | 'web';
  token: string;
}

export interface PushService {
  notify(devices: DeviceLike[], payload: NotificationPayload): Promise<{ sent: number }>;
  sentLog(): Array<{ at: string; deviceCount: number; payload: NotificationPayload }>;
}

export function createPushService(opts: { now?: () => Date } = {}): PushService {
  const now = opts.now ?? (() => new Date());
  const log: Array<{ at: string; deviceCount: number; payload: NotificationPayload }> = [];

  return {
    async notify(devices, payload) {
      log.push({ at: now().toISOString(), deviceCount: devices.length, payload });
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(
          `[push] -> ${devices.length} devices: "${payload.title}" — "${payload.body}"`,
          payload.data ?? '',
        );
      }
      return { sent: devices.length };
    },
    sentLog() {
      return log.slice();
    },
  };
}

/**
 * Localised copy for order status notifications.
 * Phase 6 will move this to the i18n package.
 */
export function statusNotificationCopy(args: {
  status: 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  pickupCode: string | null;
  fulfillmentType: 'pickup' | 'delivery';
  language: 'en' | 'ar';
}): NotificationPayload {
  const { status, pickupCode, fulfillmentType, language } = args;
  const en = {
    accepted: { title: 'Order accepted', body: 'Your order is on its way to the bar.' },
    preparing: { title: 'Brewing now', body: 'Your order is being prepared.' },
    ready:
      fulfillmentType === 'pickup'
        ? { title: 'Ready to pick up', body: pickupCode ? `Pickup code: ${pickupCode}` : 'Pop by the counter.' }
        : { title: 'Ready', body: 'Heading out to you now.' },
    out_for_delivery: { title: 'On the way', body: "We're bringing it over now." },
    completed: { title: 'Enjoy!', body: 'Thanks for ordering with Cup & Co.' },
    cancelled: { title: 'Order cancelled', body: 'See your order history for details.' },
  } as const;
  const ar = {
    accepted: { title: 'تم قبول الطلب', body: 'طلبك في طريقه للبار.' },
    preparing: { title: 'جاري التحضير', body: 'بنحضر لك طلبك.' },
    ready:
      fulfillmentType === 'pickup'
        ? { title: 'جاهز للاستلام', body: pickupCode ? `كود الاستلام: ${pickupCode}` : 'تعالى عند الكاشير.' }
        : { title: 'جاهز', body: 'بنوصلك لحالاً.' },
    out_for_delivery: { title: 'في الطريق', body: 'بنوصلك دلوقتي.' },
    completed: { title: 'بالعافية!', body: 'شكراً لطلبك من كب آند كو.' },
    cancelled: { title: 'تم إلغاء الطلب', body: 'راجع سجل طلباتك للتفاصيل.' },
  } as const;
  return language === 'ar' ? ar[status] : en[status];
}
