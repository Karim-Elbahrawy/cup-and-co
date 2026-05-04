'use client';

import type { AdminTimelineStep } from '@/lib/api';
import { formatTime } from '@/lib/format';

/**
 * Horizontal stepper visualizing the order's status timeline.
 * - Done step:   filled terracotta, white check
 * - Active step: cream-tinted, terracotta ring (subtle pulse)
 * - Future step: cream-stroke-only
 *
 * Connector lines between steps colour-shift based on the steps they connect.
 */
export function OrderTimeline({ steps }: { steps: AdminTimelineStep[] }) {
  if (!steps?.length) return null;

  return (
    <ol
      className="relative flex w-full items-start justify-between gap-1"
      aria-label="Order status timeline"
    >
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const next = steps[idx + 1];

        return (
          <li
            key={`${step.status}-${idx}`}
            className="relative flex flex-1 flex-col items-center text-center"
            aria-current={step.active ? 'step' : undefined}
          >
            <StepDot done={step.done} active={step.active} />
            {!isLast && (
              <Connector
                done={step.done && (next?.done ?? next?.active ?? false)}
              />
            )}
            <p
              className={`mt-2 text-[11px] font-semibold uppercase tracking-wider ${
                step.active
                  ? 'text-cup-orange-700'
                  : step.done
                    ? 'text-cup-brown-700'
                    : 'text-cup-muted'
              }`}
            >
              {step.label}
            </p>
            {step.at && (
              <p className="mt-0.5 text-[10px] text-cup-muted">
                {formatTime(step.at)}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <span
        className="z-10 flex h-9 w-9 items-center justify-center rounded-full bg-cup-orange-600 text-white shadow-subtle"
        aria-label="Step completed"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }
  if (active) {
    return (
      <span className="relative z-10 flex h-9 w-9 items-center justify-center" aria-label="Current step">
        <span className="absolute inset-0 animate-ping rounded-full bg-cup-teal-700/30" />
        <span className="absolute inset-0 rounded-full border-2 border-cup-orange-600 bg-cup-cream-100" />
        <span className="relative h-2 w-2 rounded-full bg-cup-orange-600" />
      </span>
    );
  }
  return (
    <span
      className="z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-cup-stroke bg-white"
      aria-label="Future step"
    />
  );
}

function Connector({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute left-1/2 top-4 -z-0 h-0.5 w-full ${
        done ? 'bg-cup-orange-600' : 'bg-cup-stroke'
      }`}
    />
  );
}
