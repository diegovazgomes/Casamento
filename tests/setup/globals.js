import { vi } from 'vitest';

if (typeof window !== 'undefined') {
  window.__INVITATION_DISABLE_BOOTSTRAP__ = true;
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}