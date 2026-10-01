import type { Browser, BrowserContext, Page } from '@playwright/test';
export type SessionState = Awaited<ReturnType<BrowserContext['storageState']>>;
export interface VerificationOptions { timeout?: number; settleMs?: number; }
export interface VerificationResult {
  verified: boolean; finalUrl: string | null; statusCode: number | null; error: string | null;
}
export function matchesProtectedUrl(actualUrl: string, expectedUrl: string): boolean;
export function verifyProtectedPage(page: Page, targetUrl: string, options?: VerificationOptions): Promise<VerificationResult>;
export function verifyStoredSession(browser: Browser, storageState: string | SessionState, targetUrl: string, options?: VerificationOptions): Promise<VerificationResult>;
export function saveVerifiedSession(browser: Browser, storageState: SessionState, targetUrl: string, authFile: string, options?: VerificationOptions): Promise<VerificationResult>;

export function hasUsableSessionCookie(storageState: unknown, targetUrl: string, nowSeconds?: number): boolean;
