import type { UserRole, VerificationStatus } from '@cup-and-co/types';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';

export interface StartSessionInput {
  userId: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
}

export interface GameSession {
  id: string;
  userId: string;
  startedAt: Date;
  weekKey: string;
  serverMaxScore: number;
  submitted: boolean;
}

export interface SubmitScoreInput {
  sessionId: string;
  userId: string;
  score: number;
  durationSeconds: number;
}

export interface SubmitScoreResult {
  accepted: true;
  pointsAwarded: number;
  weekKey: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  totalScore: number;
  weekKey: string;
}

/**
 * Africa/Cairo Sunday-aligned ISO week key (YYYY-MM-DD = Sunday).
 */
function getCairoWeekKey(date: Date): string {
  const cairo = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
  const day = cairo.getDay();
  cairo.setHours(0, 0, 0, 0);
  cairo.setDate(cairo.getDate() - day);
  const yyyy = cairo.getFullYear();
  const mm = String(cairo.getMonth() + 1).padStart(2, '0');
  const dd = String(cairo.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function createGameService(opts: { now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());
  const sessions = new Map<string, GameSession>();
  const weeklyScores = new Map<string, Map<string, number>>();
  const dailyCounts = new Map<string, Map<string, number>>(); // dayKey -> userId -> count

  function getDayKey(d: Date): string {
    const cairo = new Date(d.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    return `${cairo.getFullYear()}-${cairo.getMonth() + 1}-${cairo.getDate()}`;
  }

  return {
    /**
     * Start a game session. Students-only; requires approved verification.
     */
    startSession(input: StartSessionInput): GameSession {
      if (input.role !== 'student') {
        throw new Error('Games are available to verified students only.');
      }
      if (input.verificationStatus !== 'approved') {
        throw new Error('Student verification must be approved before playing.');
      }

      // Daily session cap
      const today = now();
      const dayKey = getDayKey(today);
      const dayMap = dailyCounts.get(dayKey) ?? new Map<string, number>();
      const used = dayMap.get(input.userId) ?? 0;
      if (used >= config.game.dailySessionsPerUser) {
        throw new Error(`Daily game session limit reached (${config.game.dailySessionsPerUser}).`);
      }
      dayMap.set(input.userId, used + 1);
      dailyCounts.set(dayKey, dayMap);

      const session: GameSession = {
        id: randomUUID(),
        userId: input.userId,
        startedAt: today,
        weekKey: getCairoWeekKey(today),
        serverMaxScore: config.game.maxScore,
        submitted: false,
      };
      sessions.set(session.id, session);
      return session;
    },

    /**
     * Submit a game score. Server validates against the per-session max + max
     * duration to prevent client-side cheating.
     */
    submitScore(input: SubmitScoreInput): SubmitScoreResult {
      const session = sessions.get(input.sessionId);
      if (!session || session.userId !== input.userId) {
        throw new Error('Game session not found for this user.');
      }
      if (session.submitted) {
        throw new Error('Game session has already submitted a score.');
      }

      const maxDuration = config.game.durationSeconds + 3;
      // Minimum duration: a real session can't be shorter than ~10 sec.
      // Anything below that is almost certainly a replay attack with a fake score.
      const minDuration = 10;
      // Server-side wall-clock check — prevents replaying old sessionIds long after
      // they were issued.
      const elapsedSinceStart = (now().getTime() - session.startedAt.getTime()) / 1000;
      if (
        input.score < 0 ||
        input.score > session.serverMaxScore ||
        input.durationSeconds < minDuration ||
        input.durationSeconds > maxDuration ||
        elapsedSinceStart > maxDuration + 60 // 60-sec submission grace
      ) {
        throw new Error('Submitted score failed validation.');
      }

      session.submitted = true;
      const weekScores = weeklyScores.get(session.weekKey) ?? new Map<string, number>();
      weekScores.set(input.userId, (weekScores.get(input.userId) ?? 0) + input.score);
      weeklyScores.set(session.weekKey, weekScores);

      return {
        accepted: true,
        pointsAwarded: input.score,
        weekKey: session.weekKey,
      };
    },

    getCurrentLeaderboard(): LeaderboardEntry[] {
      const weekKey = getCairoWeekKey(now());
      const week = weeklyScores.get(weekKey) ?? new Map<string, number>();
      return Array.from(week.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([userId, totalScore], idx) => ({
          rank: idx + 1,
          userId,
          totalScore,
          weekKey,
        }));
    },

    getMyRank(userId: string): { rank: number | null; totalScore: number | null; weekKey: string } {
      const board = this.getCurrentLeaderboard();
      const me = board.find((e) => e.userId === userId);
      const weekKey = getCairoWeekKey(now());
      return me
        ? { rank: me.rank, totalScore: me.totalScore, weekKey }
        : { rank: null, totalScore: null, weekKey };
    },

    getDailyStatus(userId: string): { sessionsUsed: number; sessionsLeft: number; dailyLimit: number } {
      const dayKey = getDayKey(now());
      const dayMap = dailyCounts.get(dayKey) ?? new Map<string, number>();
      const used = dayMap.get(userId) ?? 0;
      const limit = config.game.dailySessionsPerUser;
      return { sessionsUsed: used, sessionsLeft: Math.max(0, limit - used), dailyLimit: limit };
    },
  };
}
