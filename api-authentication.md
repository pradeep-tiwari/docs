# API Authentication

API authentication in Lightpack is designed for stateless, secure, and scalable access to your application's resources.

**In a nutshell:**
- Clients authenticate by sending a bearer token in the `Authorization` header.
- The backend verifies the token, checks expiry and abilities, and grants or denies access—all without using sessions or cookies.
- Each token is tied to a specific user and can have custom abilities (scopes) and expiry.

**It is ideal for:**
- RESTful APIs
- Mobile apps
- Single-page applications (SPAs)

---

### Token Issuance: Creating and Returning Tokens

Tokens are created after a user is authenticated (e.g., via login form or API endpoint):

```php
// Authenticate the user with credentials
$user = auth()->attempt();
if ($user) {
    // Create a new token for API access
    $token = $user->createToken(
        'API Client',                  // Token name (for identification)
        ['read:posts', 'write:comments'], // Abilities (scopes)
        '+1 month'                     // Expiry (relative or absolute)
    );
    // Return the token to the client (show plain text ONCE)
    return response()->json([
        'access_token' => $token->plainTextToken,
        'token_type' => 'Bearer',
        'expires_at' => $token->expires_at,
    ]);
}
```
- **plainTextToken** is only shown once—store it securely on the client!
- The token is hashed and stored in the `access_tokens` table, never in plain text.
- You can issue multiple tokens per user (e.g., for different devices or apps).

#### Token Structure
- **Token value:** Long, random string (never predictable)
- **Abilities:** Array of strings (e.g., `['read:posts']`)
- **Expiry:** Date/time or relative string (e.g., `+1 week`)
- **Name:** For identifying the token (e.g., "iPhone", "Admin Panel")

---

### Token Usage: Authenticating API Requests

Clients must send the token in the HTTP `Authorization` header:

```
Authorization: Bearer <token>
```

**Backend verification:**
```php
$user = auth()->viaToken();
if (!$user) {
    return response()->json(['error' => 'Unauthorized'], 401);
}
// Optionally check abilities
if (!$user->tokenCan('read:posts')) {
    return response()->json(['error' => 'Forbidden'], 403);
}
// Proceed with the request
```
- `viaToken()` extracts and hashes the bearer token, looks it up in the `access_tokens` table, checks expiry, and returns the associated user.
- The authenticated user is available as the current `Identity` for the request lifecycle.

---

### Token Abilities (Scopes)

Abilities (or scopes) define what a token is allowed to do. This enables fine-grained access control.

- **Assigning Abilities:**
  ```php
  $token = $user->createToken('Mobile App', ['read:profile', 'edit:settings']);
  ```
- **Checking Abilities:**
  ```php
  if ($user->tokenCan('edit:settings')) {
      // Allow update
  }
  ```
- **Best Practices:**
  - Grant only the minimum required abilities to each token.
  - Use clear, action-oriented ability names (e.g., `read:posts`, `delete:user`).
  - Check abilities in every sensitive controller/action.

---

### Token Expiry, Revocation, and Lifecycle

- **Expiry:**
  - Set an expiry when issuing the token (e.g., `+30 days`).
  - Expired tokens are automatically denied by `viaToken()`.
- **Revocation:**
  - Revoke a specific token:
    ```php
    $user->deleteTokens($tokenId);
    ```
  - Revoke all tokens for a user:
    ```php
    $user->deleteTokens();
    ```
- **Rotation:**
  - For extra security, periodically revoke and re-issue tokens.
- **Multiple Tokens:**
  - Users can have multiple active tokens (e.g., one per device or app).

---

### Security Best Practices for API Tokens

- **Always use HTTPS** for all API endpoints.
- **Store tokens securely** on the client (never in localStorage on the web if possible—use secure HTTP-only cookies for SPAs, or encrypted storage for mobile).
- **Never log or display tokens** after initial issuance.
- **Grant least privilege:** Only assign needed abilities.
- **Rotate and expire tokens** regularly.
- **Invalidate remember tokens** on password change.
- **Never expose sensitive fields** (password, remember_token) in responses.
- **Review session and cookie settings** for secure defaults.
- **Log out users on critical changes** (password, email, etc.).
- **Monitor usage:** Track last-used timestamps for tokens (Lightpack updates this automatically).
- **CORS:** Configure cross-origin resource sharing carefully for APIs.

---

### Real-World Usage Patterns

- **Mobile Apps:**
  - Store tokens securely, refresh/rotate as needed.
- **Single Page Apps (SPA):**
  - Authenticate via API, store tokens in memory, renew on tab reload.
- **Third-Party Integrations:**
  - Issue tokens with limited scopes and expiry.
  - Allow users to revoke tokens from their account settings.
- **Microservices:**
  - Use tokens for service-to-service authentication with limited scopes.

---

### Advanced Scenarios

- **Multiple Tokens per User:**
  - Users can manage and revoke tokens for each device/app independently.
- **Custom Abilities:**
  - Define your own granular permissions (e.g., `export:data`, `impersonate:user`).
- **Custom Token Models:**
  - Extend `AccessToken` for extra metadata (e.g., device info, IP address).
- **Token Naming:**
  - Use descriptive names for traceability (e.g., "John’s iPhone").

---

### Troubleshooting & Common Pitfalls

- **Token not working:**
  - Ensure the token is sent in the `Authorization` header as `Bearer <token>`.
  - Check that the token is not expired or revoked.
  - Verify the user’s abilities match the required action.
- **Token leaked:**
  - Revoke the token immediately. Rotate all tokens if necessary.
- **Accidentally deleted all tokens:**
  - Users must re-authenticate to obtain new tokens.
- **Token not rotating:**
  - Ensure you are using the latest Lightpack Auth version and your user model supports token rotation.

---

