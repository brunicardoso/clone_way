# Security Audit Report

## Executive Summary - Done with Gemini CLI
The application `clone-your-way-app` was audited for security vulnerabilities. The overall security posture is good for a client-heavy application, but a few areas for improvement were identified, primarily regarding API robustness and potential Denial of Service (DoS) vectors in file parsers.

## Findings

### 1. API Route Hardening (Low Risk)
- **Issue:** The `blast` API route (`src/app/api/blast/route.ts`) accepts `program` and `database` parameters from the request body without validation against an allowlist. While `URLSearchParams` prevents injection into the query string syntax, submitting unexpected values to the NCBI API could lead to undefined behavior or errors.
- **Recommendation:** Implement an allowlist for `program` (e.g., `['blastn', 'blastp', 'blastx', 'tblastn', 'tblastx']`) and `database`.

### 2. Missing Rate Limiting (Medium Risk)
- **Issue:** The API routes (`/api/addgene`, `/api/blast`) proxy requests to external services (Addgene, NCBI) without any rate limiting.
- **Impact:** An attacker could use your backend to flood these third-party services, potentially causing your server's IP to be banned or incurring costs if paid APIs were used.
- **Recommendation:** Implement a rate-limiting middleware (e.g., using `upstash/ratelimit` or a simple in-memory counter if running in a long-lived process, though serverless makes in-memory hard).

### 3. Parser Robustness (Low/Medium Risk)
- **Issue:** The `parseABIF` function in `src/services/bio/abif.ts` reads binary data using offsets derived from the file itself.
- **Impact:** A malformed or malicious file could specify offsets outside the buffer bounds, causing the parser to throw a `RangeError`. If uncaught, this could crash the client application or the API route handling the file.
- **Recommendation:** Wrap parser calls in `try-catch` blocks and provide user-friendly error messages. Ensure all `DataView` access is bounds-checked or safely wrapped.

### 4. Client-Side XSS (Safe)
- **Observation:** No use of `dangerouslySetInnerHTML` was found. React's default escaping protects against XSS in rendered text.

## Proposed Actions
1.  **Harden `src/app/api/blast/route.ts`** by validating `program` and `database` parameters.
2.  **Add Unit Tests** for the biological parsers to ensure they handle edge cases and malformed inputs gracefully.
3.  **Suggest** adding a test runner (Jest or Vitest) to the project.
