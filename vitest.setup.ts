import '@testing-library/jest-dom/vitest';

// Provide a fixed test secret for iron-session (>= 32 chars)
process.env.SESSION_SECRET = 'a'.repeat(64);
process.env.BACKEND_API_URL = 'http://localhost:8080';
process.env.SESSION_COOKIE_NAME = 'cid_session';
