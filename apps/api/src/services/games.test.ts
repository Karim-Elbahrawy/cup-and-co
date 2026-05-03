import { beforeEach, describe, expect, it } from 'vitest';
import { createGameService } from './games.js';

describe('games', () => {
  let svc: ReturnType<typeof createGameService>;

  beforeEach(() => {
    svc = createGameService();
  });

  it('only verified students can start a session', () => {
    expect(() =>
      svc.startSession({ userId: 'u1', role: 'faculty', verificationStatus: 'approved' }),
    ).toThrow(/students only/);
    expect(() =>
      svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'pending' }),
    ).toThrow(/verification/);
  });

  it('verified student can start a session', () => {
    const s = svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'approved' });
    expect(s.userId).toBe('u1');
    expect(s.serverMaxScore).toBeGreaterThan(0);
  });

  it('rejects scores above server_max_score', () => {
    const s = svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'approved' });
    expect(() =>
      svc.submitScore({
        sessionId: s.id,
        userId: 'u1',
        score: s.serverMaxScore + 1,
        durationSeconds: 60,
      }),
    ).toThrow(/validation/);
  });

  it('rejects scores from a different user', () => {
    const s = svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'approved' });
    expect(() =>
      svc.submitScore({ sessionId: s.id, userId: 'u2', score: 10, durationSeconds: 60 }),
    ).toThrow(/not found/);
  });

  it('rejects double-submit', () => {
    const s = svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'approved' });
    svc.submitScore({ sessionId: s.id, userId: 'u1', score: 50, durationSeconds: 60 });
    expect(() =>
      svc.submitScore({ sessionId: s.id, userId: 'u1', score: 50, durationSeconds: 60 }),
    ).toThrow(/already/);
  });

  it('rejects impossible duration', () => {
    const s = svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'approved' });
    expect(() =>
      svc.submitScore({ sessionId: s.id, userId: 'u1', score: 50, durationSeconds: 600 }),
    ).toThrow(/validation/);
  });

  it('caps daily sessions per user (default 3)', () => {
    svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'approved' });
    svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'approved' });
    svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'approved' });
    expect(() =>
      svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'approved' }),
    ).toThrow(/limit/);
  });

  it('builds a leaderboard ordered by total score desc', () => {
    const s1 = svc.startSession({ userId: 'u1', role: 'student', verificationStatus: 'approved' });
    const s2 = svc.startSession({ userId: 'u2', role: 'student', verificationStatus: 'approved' });
    svc.submitScore({ sessionId: s1.id, userId: 'u1', score: 50, durationSeconds: 60 });
    svc.submitScore({ sessionId: s2.id, userId: 'u2', score: 100, durationSeconds: 60 });
    const board = svc.getCurrentLeaderboard();
    expect(board[0].userId).toBe('u2');
    expect(board[0].rank).toBe(1);
    expect(board[1].userId).toBe('u1');
  });
});
