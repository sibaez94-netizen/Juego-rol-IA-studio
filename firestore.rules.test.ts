/**
 * Phase 0 Payload-First Security Test Suite for Crónicas del Abismo
 * Verifies the "Dirty Dozen" adversarial payloads against firestore.rules.
 */
export interface AdversarialTestCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated campaign create',
    operation: 'create',
    path: '/campaigns/camp_01',
    auth: null,
    payload: { id: 'camp_01', ownerId: 'user_a', title: 'Test' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email campaign create',
    operation: 'create',
    path: '/campaigns/camp_01',
    auth: { uid: 'user_a', email_verified: false },
    payload: { id: 'camp_01', ownerId: 'user_a', title: 'Test' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity spoofing on ownerId',
    operation: 'create',
    path: '/campaigns/camp_02',
    auth: { uid: 'attacker', email_verified: true },
    payload: { id: 'camp_02', ownerId: 'victim', title: 'Spoofed' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow ghost field injection',
    operation: 'create',
    path: '/campaigns/camp_03',
    auth: { uid: 'user_a', email_verified: true },
    payload: { id: 'camp_03', ownerId: 'user_a', title: 'Legit', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Path ID poisoning with invalid chars',
    operation: 'create',
    path: '/campaigns/camp$bad',
    auth: { uid: 'user_a', email_verified: true },
    payload: { id: 'camp$bad', ownerId: 'user_a', title: 'Bad ID' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Oversized narration payload (>4000 chars)',
    operation: 'create',
    path: '/campaigns/camp_04',
    auth: { uid: 'user_a', email_verified: true },
    payload: { id: 'camp_04', ownerId: 'user_a', currentNarration: 'x'.repeat(4005) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Forged createdAt timestamp',
    operation: 'create',
    path: '/campaigns/camp_05',
    auth: { uid: 'user_a', email_verified: true },
    payload: { id: 'camp_05', ownerId: 'user_a', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Cross-tenant subcollection hero write',
    operation: 'create',
    path: '/campaigns/camp_owner_a/heroes/hero_01',
    auth: { uid: 'user_b', email_verified: true },
    payload: { id: 'hero_01', campaignId: 'camp_owner_a', ownerId: 'user_b', name: 'Intruder' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable ownerId mutation on update',
    operation: 'update',
    path: '/campaigns/camp_01',
    auth: { uid: 'user_a', email_verified: true },
    payload: { ownerId: 'user_b' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal state update after completed',
    operation: 'update',
    path: '/campaigns/camp_completed',
    auth: { uid: 'user_a', email_verified: true },
    payload: { turnNumber: 99 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unfiltered list scraping without ownerId filter',
    operation: 'list',
    path: '/campaigns',
    auth: { uid: 'user_b', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Inventory array exhaustion (>20 items)',
    operation: 'update',
    path: '/campaigns/camp_01/heroes/hero_01',
    auth: { uid: 'user_a', email_verified: true },
    payload: { inventory: Array.from({ length: 25 }, (_, i) => `Item ${i}`) },
    expected: 'PERMISSION_DENIED',
  },
];
