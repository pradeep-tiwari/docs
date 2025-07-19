# Lightpack Auth: The Complete Guide

Welcome to the definitive guide for Lightpack Auth! This documentation is designed to be your single source of truth for every aspect of authentication in Lightpack. Whether you’re building a simple website, a complex API, or a hybrid app, you’ll find detailed explanations, code samples, rationale, and best practices for every feature and extension point.

---

## 1. Introduction & Philosophy

Lightpack Auth is designed to provide robust, secure, and developer-friendly authentication for PHP applications. Its philosophy centers on:

- **Explicitness:** Every authentication action is clear and intentional—no magic, no hidden state.
- **Extensibility:** Swap or extend authenticators, identifiers, and user models to fit your needs.
- **Security:** Secure by default, with best practices enforced for sessions, tokens, and user data.
- **Simplicity:** Easy to use for common cases, but powerful enough for advanced scenarios.
- **Separation of Concerns:** Each class (authenticator, identifier, identity, etc.) has a single, well-defined responsibility.

Whether you’re building a classic web app, a modern API, or both, Lightpack Auth gives you the tools to implement authentication correctly and confidently.

---

## 2. Key Concepts & Terminology

Here’s a glossary of core terms as used in Lightpack Auth:

| Term             | Meaning in Lightpack Auth                                                                 |
|------------------|------------------------------------------------------------------------------------------|
| **Driver**       | A configuration for a specific authentication method (e.g., form, cookie, bearer token)   |
| **Authenticator**| Class responsible for verifying user credentials/tokens (e.g., FormAuthenticator)         |
| **Identifier**   | Class that fetches user data from storage (e.g., DefaultIdentifier)                      |
| **Identity**     | The authenticated user object (implements `Identity` interface, e.g., AuthUser)          |
| **Session**      | PHP session used to persist user state between requests                                  |
| **Remember Me**  | Persistent login using secure cookies and tokens                                         |
| **Access Token** | Model representing API tokens for stateless auth                                         |
| **Abilities**    | Permissions/scopes attached to an API token                                              |
| **AuthManager**  | Core logic holder: manages authenticators, session, state, and redirects                 |
| **Auth**         | Facade/wrapper exposing user-facing methods (login, logout, user, etc.)                  |
| **auth()**       | Global helper function to access the Auth service                                        |
| **Service Provider** | Registers Auth system in the app container                                           |

**Note:** Lightpack does not use the terms “guard” or “provider” in the same way as some other frameworks. Always refer to the above mapping.

---

## 3. Feature Checklist (What’s Supported)

Lightpack Auth supports the following features out of the box:

- [x] Session-based authentication (form login)
- [x] Persistent login (“remember me” cookies)
- [x] API authentication with Bearer tokens (stateless)
- [x] Multiple drivers (switchable at runtime)
- [x] Custom authenticators (extendable)
- [x] Custom identifiers (for custom user sources)
- [x] User model extensibility
- [x] Token abilities/scopes
- [x] Token expiry and revocation
- [x] Secure password hashing (bcrypt/Argon2)
- [x] Secure token hashing (SHA-256)
- [x] Flash messaging for auth errors
- [x] Redirects after login/logout
- [x] Intended URL redirection
- [x] Helper utilities (`auth()`, etc.)
- [x] Service provider integration
- [x] API for login, logout, recall, viaToken, user, id, isLoggedIn, isGuest, etc.
- [x] Session and cookie lifecycle management
- [x] Ability to implement social login and SSO via custom authenticators

**Not Supported (by default):**
- OAuth2/JWT out of the box (but can be added via custom authenticators)
- Passwordless/email link login (requires custom implementation)
- Multi-factor authentication (can be implemented on top)

---

## 4. Architecture Overview

Lightpack Auth is architected for clarity and extensibility. Here’s how the main components fit together:

```
+-------------------+
|  Service Provider |
+-------------------+
          |
          v
+-------------------+
|      Auth         |  <--- Facade: exposes all user-facing methods
+-------------------+
          |
          v
+-------------------+
|   AuthManager     |  <--- Core logic: manages authenticators, session, state
+-------------------+
          |
          v
+-------------------+
| Authenticators[]  |  <--- Form, Cookie, Bearer, etc. (pluggable)
+-------------------+
          |
          v
+-------------------+
|   Identifier      |  <--- Fetches user from storage
+-------------------+
          |
          v
+-------------------+
|   Identity        |  <--- The user (implements Identity interface)
+-------------------+
```

#### [Diagram: High-Level Auth Flow]

```
User Request
    |
    v
[Controller] --calls--> [auth() helper]
    |
    v
[Auth] --delegates--> [AuthManager]
    |
    v
[Authenticator (form/cookie/bearer)]
    |
    v
[Identifier] --fetches--> [User Model]
    |
    v
[Identity] (if successful)
```

### Component Roles
- **Service Provider:** Registers the Auth system and binds it to the container.
- **Auth:** The main API for authentication actions (login, logout, user, etc.).
- **AuthManager:** Handles the orchestration—selecting authenticators, managing session/cookies, handling redirects, and tracking state.
- **Authenticators:** Each authenticator implements a specific authentication method (form, cookie, bearer token). You can add your own.
- **Identifier:** Abstracts how users are fetched from your data store (DB, LDAP, API, etc.).
- **Identity:** The user model, must implement the `Identity` interface (e.g., `AuthUser`).

### Authentication Flow Example (Session Login)

```
[User] --submits--> [Login Form]
    |
    v
[Controller] --calls--> [auth()->login()]
    |
    v
[FormAuthenticator] --verifies--> [Identifier] --fetches--> [User Model]
    |
    v
[Session] <-- stores --> [Identity]
    |
    v
[Redirect to dashboard/intended]
```

### Authentication Flow Example (API Token)

```
[API Client] --sends--> Authorization: Bearer <token>
    |
    v
[Controller/API Endpoint] --calls--> [auth()->viaToken()]
    |
    v
[BearerAuthenticator] --verifies--> [AccessToken] --fetches--> [User Model]
    |
    v
[Identity] (attached to request)
    |
    v
[API Logic]
```

---

## 5. Sequence Diagrams: Authentication Flows

Below are step-by-step sequence diagrams for the most important authentication flows in Lightpack. These visualizations clarify how each component interacts in practice.

### 1. Session Login Flow
Shows the process from login form submission to session storage and redirect.

```plaintext
User           Controller       Auth        AuthManager     FormAuthenticator   Identifier     Session
 |                |               |              |                 |               |             |
 |--Login Form--->|               |              |                 |               |             |
 |                |--login()----->|              |                 |               |             |
 |                |               |--verify()--->|                 |               |             |
 |                |               |              |--verify()------>|               |             |
 |                |               |              |                 |--verify()---->|             |
 |                |               |              |                 |               |--findByCredentials()-->
 |                |               |              |                 |               |<--User------|
 |                |               |              |                 |<--User--------|             |
 |                |               |              |<--User----------|               |             |
 |                |<--User--------|              |                 |               |             |
 |                |--set session->|              |                 |               |             |
 |<--Redirect-----|               |              |                 |               |             |
```

---

### 2. Bearer Token API Auth
Illustrates stateless API authentication using bearer tokens.

```plaintext
API Client     Controller       Auth        AuthManager   BearerAuthenticator   AccessToken   User Model
   |               |               |              |               |                  |             |
   |--API Req----->|               |              |               |                  |             |
   |               |--user()------>|              |               |                  |             |
   |               |               |--verify()--->|               |                  |             |
   |               |               |              |--verify()---->|                  |             |
   |               |               |              |               |--extract token-->|             |
   |               |               |              |               |--hash/lookup---->|             |
   |               |               |              |               |<--token record---|             |
   |               |               |              |               |--check expiry--->|             |
   |               |               |              |               |--get user------->|             |
   |               |               |              |               |<--User-----------|             |
   |               |               |              |<--User--------|                  |             |
   |               |<--User--------|              |               |                  |             |
   |<--Response----|               |              |               |                  |             |
```

---

### 3. Multi-Factor Authentication (MFA) Login
Shows a two-step login process (password + OTP).

```plaintext
User           Controller       Auth        AuthManager     FormAuthenticator   OtpAuthenticator   Identifier
 |                |               |              |                 |                 |                |
 |--Login Form--->|               |              |                 |                 |                |
 |                |--login()----->|              |                 |                 |                |
 |                |               |--verify()--->|                 |                 |                |
 |                |               |              |--verify()------>|                 |                |
 |                |               |              |                 |--verify()------>|                |
 |                |               |              |                 |                 |--send OTP----->|
 |                |               |              |                 |                 |<--OTP sent-----|
 |                |<--Prompt OTP--|              |                 |                 |                |
 |--OTP Form----->|               |              |                 |                 |                |
 |                |--login()----->|              |                 |                 |                |
 |                |               |--verify()--->|                 |                 |                |
 |                |               |              |--verify()------>|                 |                |
 |                |               |              |                 |--verify()------>|                |
 |                |               |              |                 |                 |--verify OTP--->|
 |                |               |              |                 |                 |<--User---------|
 |                |               |              |                 |<--User----------|                |
 |                |               |              |<--User----------|                 |                |
 |                |<--User--------|              |                 |                 |                |
 |<--Redirect-----|               |              |                 |                 |                |
```

---

### 4. Logout Flow
How Lightpack processes a logout request and clears session/cookies.

```plaintext
User           Controller       Auth        AuthManager     Session
 |                |               |              |             |
 |--Logout------->|               |              |             |
 |                |--logout()---->|              |             |
 |                |               |--forget()--->|             |
 |                |               |              |--clear----->|
 |                |               |              |<--done------|
 |                |<--Redirect----|              |             |
 |<--Redirect-----|               |              |             |
```

---

### 5. Remember-Me Flow
Covers persistent login with cookies and token rotation.

```plaintext
User           Controller       Auth        AuthManager    CookieAuthenticator   Identifier   Session
 |                |               |              |                 |               |           |
 |--Login Form--->|               |              |                 |               |           |
 |                |--login()----->|              |                 |               |           |
 |                |               |--verify()--->|                 |               |           |
 |                |               |              |--verify()------>|               |           |
 |                |               |              |                 |--verify()---->|           |
 |                |               |              |                 |               |--findByCredentials()-->
 |                |               |              |                 |               |<--User----|
 |                |               |              |                 |<--User--------|           |
 |                |               |              |<--User----------|               |           |
 |                |<--User--------|              |                 |               |           |
 |                |--set session->|              |                 |               |           |
 |                |--set cookie-->|              |                 |               |           |
 |<--Redirect-----|               |              |                 |               |           |
 |                |               |              |                 |               |           |
 |--Visit Site--->|               |              |                 |               |           |
 |                |--recall()---->|              |                 |               |           |
 |                |               |--verify()--->|                 |               |           |
 |                |               |              |--verify()------>|               |           |
 |                |               |              |                 |--verify()---->|           |
 |                |               |              |                 |               |--findByRememberToken()-->
 |                |               |              |                 |               |<--User----|
 |                |               |              |                 |<--User--------|           |
 |                |               |              |<--User----------|               |           |
 |                |<--User--------|              |                 |               |           |
 |                |--set session->|              |                 |               |           |
 |                |--rotate cookie|              |                 |               |           |
 |<--Redirect-----|               |              |                 |               |           |
```

---

### 6. Token Revocation Flow
Shows how tokens are revoked and access is denied on subsequent requests.

```plaintext
User/API Client   Controller       Auth       AuthManager   BearerAuthenticator   AccessToken
     |                |               |             |               |                |
     |--Revoke Req--->|               |             |               |                |
     |                |--deleteTokens>|             |               |                |
     |                |               |--delete--->|               |                |
     |                |               |             |--delete----->|                |
     |                |               |             |               |--delete------->|
     |                |               |             |               |<--done---------|
     |                |<--OK----------|             |               |                |
     |                |               |             |               |                |
     |--API Req------>|               |             |               |                |
     |                |--user()------>|             |               |                |
     |                |               |--verify()-->|               |                |
     |                |               |             |--verify()---->|                |
     |                |               |             |               |--lookup------->|
     |                |               |             |               |<--not found----|
     |                |               |<--null------|               |                |
     |                |<--null--------|             |               |                |
     |<--401/denied---|               |             |               |                |
```

---

## 6. Introduction

Authentication is the process of verifying the identity of users accessing your application. Lightpack provides a clean, flexible, and extensible authentication system that supports:

- Session-based (cookie) authentication for web apps
- "Remember Me" persistent login
- API authentication using Bearer tokens (for SPAs, mobile, and third-party clients)

You can use one or more strategies in a single application, and even switch between them as needed.

---

## 7. How Auth Works in Lightpack

- **Guards:** Lightpack uses the concept of "guards" (drivers) to handle different authentication strategies. Each guard manages how users are authenticated and how their session or token is managed.
- **User Providers:** Responsible for fetching user data from the database or another source.
- **Identity:** The authenticated user object, implementing the `Identity` interface.
- **Authenticators:** Classes that encapsulate the logic for each guard (form, cookie, bearer token, etc).

---

## 8. Quick Start

### 1. Install & Configure Auth

Ensure your `auth` configuration is set up (usually in `config/auth.php`). Example:

```php
return [
    'drivers' => [
        'default' => [
            'driver' => 'form',
            'model' => App\Models\User::class,
            'fields' => [
                'email' => 'email',
                'password' => 'password',
                'remember_token' => 'remember_token',
            ],
            'login' => [
                'redirect' => '/dashboard',
            ],
            'logout' => [
                'redirect' => '/login',
            ],
        ],
        // Add more drivers as needed
    ],
];
```

### 2. Register the Auth Provider

Make sure `AuthProvider` is registered in your application’s providers list.

### 3. Use the `auth()` Helper

```php
// Check if user is logged in
if (auth()->isLoggedIn()) {
    $user = auth()->user();
    echo "Welcome, {$user->name}";
}
```

---

## 9. Session Authentication (Expanded)

Session authentication is the backbone of most web applications. In Lightpack, it is engineered for clarity, security, and flexibility.

### How Session Authentication Works

1. **Login Form Submission:**  
   The user submits credentials (e.g., email and password) through your login form.

2. **Verification:**  
   `auth()->login()` triggers the `FormAuthenticator`, which:
   - Uses the configured `Identifier` to fetch the user by credentials.
   - Verifies the password using secure hashing (bcrypt/Argon2).
   - If valid, returns the user as the current `Identity`.

3. **Session State:**  
   - User ID and login state are stored in the session (`_auth_id`, `_logged_in`).
   - Session persists until logout, session expiry, or browser close.

4. **Redirection:**  
   - On success, user is redirected to the intended URL or your configured default.
   - On failure, an error message is flashed and user is redirected back to login.

### Example: Login Controller

```php
public function login()
{
    if (auth()->login()) {
        // Success: user is authenticated, redirect handled automatically
    } else {
        // Failure: error flashed, redirect handled automatically
    }
}
```

### Example: Checking and Using the Authenticated User

```php
if (auth()->isLoggedIn()) {
    $user = auth()->user();
    // Access user fields: $user->email, $user->name, etc.
} else {
    // Not logged in, redirect to login page
}
```

### Logging Out

```php
auth()->logout();
// Session and cookies (including remember-me) are cleared
// User is redirected to your configured logout URL
```

### Session Lifecycle Details

- **Session Variables:**  
  - `_auth_id`: Stores the user’s primary key.
  - `_logged_in`: Boolean flag for login state.
  - `_intended_url`: (optional) Stores the URL the user tried to access before authentication.

- **Session Expiry:**  
  - Controlled by your PHP/session config.
  - Logging out or session expiry removes all auth state.

- **Session Security:**  
  - Always use HTTPS for all authenticated routes.
  - Set session cookies to `HttpOnly` and `Secure`.
  - Regenerate session ID on login to prevent fixation.

### Error Handling & Flash Messaging

- On failed login, a flash message is set in the session.
- Display it in your view/template:
  ```php
  <?php if (session()->has('error')): ?>
      <div class="alert alert-danger">
          <?= session()->get('error') ?>
      </div>
  <?php endif; ?>
  ```

### Redirects & Intended URLs

- Lightpack automatically redirects users to the URL they originally requested after successful login.
- Configure default redirects in `config/auth.php` under `login.redirect` and `logout.redirect`.

### Advanced & Edge Cases

- **Multiple Drivers:**  
  Use `auth('driverName')` to authenticate admins, users, etc., with different session namespaces.
- **Custom Credentials:**  
  Configure alternative fields (e.g., username) in your driver’s `fields` map.
- **Session Hijacking:**  
  Always regenerate session IDs on login/logout.

### Troubleshooting

- **Login always fails:**  
  - Check password hashing and credential mapping.
  - Ensure your user model implements the required interface.

- **Session not persisting:**  
  - Verify PHP session settings and cookie parameters.

---

## 10. Persistent Login (Remember Me) (Expanded)

Lightpack’s “remember me” feature lets users stay logged in across browser sessions, using secure cookies and tokens.

### How Persistent Login Works

1. **User selects “Remember Me”** on the login form.
2. **On login:**
   - A secure, random token is generated.
   - Token is stored (hashed) in the user’s `remember_token` field.
   - Token and user ID are set in a secure, HttpOnly cookie.
3. **On subsequent visits:**
   - If session is missing but cookie is present, `CookieAuthenticator` verifies the token.
   - If valid, user is logged in automatically and token is rotated (for security).

### Enabling Remember Me

- **Login Form:**  
  ```html
  <input type="checkbox" name="remember" value="1"> Remember Me
  ```
- **User Model:**  
  Must have a `remember_token` field (string, nullable).

### Example: Login with Remember Me

```php
if (auth()->login()) {
    // If "remember" checkbox was checked, persistent login is enabled
}
```

### Cookie and Token Lifecycle

- **On login:**  
  - Token is stored as a cookie and in the database (hashed).
- **On logout:**  
  - Cookie and token are deleted.
- **On auto-login:**  
  - Token is rotated (new token issued, old one invalidated).

### Security Considerations

- **Token Generation:**  
  - Tokens are cryptographically random and long.
  - Only the hash is stored in the database.
- **Cookie Security:**  
  - Cookies are set as `HttpOnly` and `Secure`.
  - Never store sensitive data in cookies.
- **Token Rotation:**  
  - Prevents replay attacks if a token is intercepted.

### Edge Cases & Best Practices

- **Password Change:**  
  - Invalidate the remember token when a user changes their password.
- **Multiple Devices:**  
  - Each login can have a unique token; manage accordingly if supporting multi-device logout.
- **Manual Token Revocation:**  
  - Set `remember_token` to null to force re-authentication.

### Troubleshooting

- **Persistent login not working:**  
  - Ensure cookies are enabled and not blocked.
  - Verify `remember_token` is present and writable.
- **Token leaked:**  
  - Revoke the token immediately. Rotate all tokens if necessary.

---

## 11. API Authentication (Bearer Tokens) (Exhaustive)

API authentication in Lightpack is designed for stateless, secure, and flexible access to your application’s endpoints. It is ideal for SPAs, mobile apps, microservices, and third-party integrations.

### How API Authentication Works
- Clients authenticate by sending a unique, cryptographically secure bearer token in the `Authorization` header.
- The backend verifies the token, checks expiry and abilities, and grants or denies access—all without using sessions or cookies.
- Each token is tied to a specific user and can have custom abilities (scopes) and expiry.

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

## 12. Multi-Driver & Advanced Usage

Lightpack Auth supports multiple authentication drivers (“multi-driver”) out of the box. This allows you to:
- Separate authentication for different user types (e.g., users vs. admins)
- Use different strategies for web and API (e.g., session for web, bearer for API)
- Implement custom flows (e.g., SSO, guest accounts, etc.)

### Configuring Multiple Drivers

In `config/auth.php`, define each driver with a unique key:

```php
return [
    'drivers' => [
        'default' => [
            'driver' => 'form',
            'model' => App\Models\User::class,
            // ...
        ],
        'admin' => [
            'driver' => 'form',
            'model' => App\Models\Admin::class,
            'fields' => [
                'email' => 'email',
                'password' => 'password',
                'remember_token' => 'remember_token',
            ],
            'login' => [
                'redirect' => '/admin/dashboard',
            ],
            'logout' => [
                'redirect' => '/admin/login',
            ],
        ],
        'api' => [
            'driver' => 'bearer',
            'model' => App\Models\User::class,
            // ...
        ],
    ],
];
```

### Switching Drivers at Runtime

Use the `auth('driverName')` helper to access a specific driver:

```php
// Default user
$userAuth = auth();

// Admin
$adminAuth = auth('admin');

// API
$apiAuth = auth('api');
```

### Why Use Multiple Drivers?
- **Role separation:** Isolate admin authentication from users.
- **Strategy separation:** Use sessions for web, tokens for API.
- **Custom flows:** Build guest, SSO, or external provider drivers.

### Session Separation
- Each driver maintains its own session/cookie namespace.
- Logging in as an admin does not affect user login, and vice versa.

### Advanced Patterns
- **Hybrid Apps:** Web (session) and API (token) auth coexist.
- **Multiple User Models:** Use different models for different drivers.
- **Custom Authenticator:** Plug in new strategies (e.g., LDAP, OTP).

### Edge Cases & Troubleshooting
- **Conflicting sessions:** Ensure each driver uses unique session keys.
- **Driver not found:** Check spelling and config keys.
- **Custom driver logic:** Extend and register new authenticators as needed.

---

## 13. Real-World Recipes

### 1. SPA Authentication

- **Step 1:** Implement API authentication using Bearer tokens.
- **Step 2:** Store tokens securely in memory or secure cookies.
- **Step 3:** Rotate tokens on tab reload or periodically.
- **Step 4:** Use `auth()->viaToken()` to authenticate API requests.

### 2. Mobile Login

- **Step 1:** Issue a long-lived token for each device.
- **Step 2:** Store tokens securely using Keychain or Keystore.
- **Step 3:** Use `auth()->viaToken()` to authenticate API requests.
- **Step 4:** Rotate tokens periodically for security.

### 3. Admin/User Separation

- **Step 1:** Define separate drivers for admins and users.
- **Step 2:** Use `auth('admin')` and `auth('user')` to switch drivers.
- **Step 3:** Implement custom logic for admin authentication.
- **Step 4:** Use separate session namespaces for admins and users.

### 4. Token Rotation

- **Step 1:** Periodically revoke and re-issue tokens.
- **Step 2:** Update token expiry and abilities as needed.
- **Step 3:** Use `auth()->viaToken()` to authenticate API requests.
- **Step 4:** Monitor token usage and adjust rotation frequency.

### 5. Multi-Factor Authentication (MFA)

- **Step 1:** Implement a custom authenticator for MFA.
- **Step 2:** Use `auth()->viaToken()` to authenticate API requests.
- **Step 3:** Store MFA state in session and require second step before login completes.
- **Step 4:** Monitor MFA usage and adjust settings as needed.

---

## 14. User Model & Identity

Lightpack expects your user model to:
- Extend `Lightpack\Auth\Models\AuthUser`
- Implement the `Lightpack\Auth\Identity` interface

### Example User Model
```php
namespace App\Models;

use Lightpack\Auth\Models\AuthUser;

class User extends AuthUser
{
    // Add custom fields and methods as needed
}
```

### Required Fields
- `id` (primary key, integer or string)
- `email` (or your chosen credential field)
- `password` (hashed, never plain text)
- `remember_token` (nullable string, for persistent login)

### Required Methods (from Identity interface)
- `getId()`
- `getRememberToken()`
- `setRememberToken($token)`
- `createToken($name, $abilities = [], $expiry = null)`
- `deleteTokens($tokenId = null)`
- `tokenCan($ability)`

### Extending the User Model
- Add any fields (e.g., `name`, `role`, `status`) or relationships you need.
- You may override or extend methods (e.g., for custom token logic).
- For admin or other user types, create separate models extending `AuthUser`.

### Security & Best Practices
- Always hash passwords (bcrypt/Argon2 recommended).
- Never expose sensitive fields (e.g., password, remember_token) in API responses.
- Use model accessors/mutators to control field visibility.
- Invalidate remember tokens on password change.

### Real-World Advice
- Use a migration to ensure all required fields exist.
- Add indexes to credential fields for performance.
- Use descriptive model names for clarity (e.g., `Admin`, `Customer`).

---

## 15. Configuration Reference

All authentication settings are managed in `config/auth.php`. Here’s a full breakdown:

### Top-Level Structure
```php
return [
    'drivers' => [
        // ... one array per driver
    ],
];
```

### Driver Structure
Each driver is an array with these options:
- `driver`: (string) The authenticator to use (`form`, `cookie`, `bearer`, or custom)
- `model`: (string) Fully qualified user model class
- `fields`: (array) Maps credential fields (`email`, `password`, `remember_token`, etc.)
- `login`: (array) Redirects/settings after login (`redirect`)
- `logout`: (array) Redirects/settings after logout (`redirect`)
- Other custom options for custom authenticators

### Example
```php
'drivers' => [
    'default' => [
        'driver' => 'form',
        'model' => App\Models\User::class,
        'fields' => [
            'email' => 'email',
            'password' => 'password',
            'remember_token' => 'remember_token',
        ],
        'login' => [
            'redirect' => '/dashboard',
        ],
        'logout' => [
            'redirect' => '/login',
        ],
    ],
    // ...
],
```

### Field Mapping
- Use the `fields` array to map your model’s fields to what Lightpack expects.
- For custom credential fields (e.g., `username`), update both model and config.

### Redirect Settings
- `login.redirect`: Where to send the user after login
- `logout.redirect`: Where to send the user after logout
- Can be any valid route or URL

### Tips for Maintainability
- Keep driver keys descriptive (e.g., `admin`, `api`)
- Document custom drivers and fields in comments
- Use environment variables for sensitive settings if needed
- Review and update config when adding new user types or auth flows

---

## 16. Custom Authenticators & Identifiers

Lightpack Auth is highly extensible. You can add new authentication strategies (authenticators) and user sources (identifiers) to fit any requirement.

### Creating a Custom Authenticator

To implement a new login strategy (e.g., LDAP, OTP, SSO):

1. **Extend `AbstractAuthenticator`:**
   ```php
   use Lightpack\Auth\AbstractAuthenticator;
   use Lightpack\Auth\Identity;

   class OtpAuthenticator extends AbstractAuthenticator
   {
       public function verify(): ?Identity
       {
           // Custom OTP verification logic
           // Return an Identity object on success, or null on failure
       }
   }
   ```
2. **Register the Authenticator:**
   In `config/auth.php`:
   ```php
   'drivers' => [
       'otp' => [
           'driver' => 'otp',
           'model' => App\Models\User::class,
           // ...
       ],
   ],
   ```
3. **Update the AuthManager (if needed):**
   If your authenticator needs extra setup, register it with the manager.

### Creating a Custom Identifier

To fetch users from alternative sources (e.g., LDAP, REST API):

1. **Implement the `Identifier` interface:**
   ```php
   use Lightpack\Auth\Identifier;
   use Lightpack\Auth\Identity;

   class LdapIdentifier implements Identifier
   {
       public function findById($id): ?Identity { /* ... */ }
       public function findByRememberToken($id, string $token): ?Identity { /* ... */ }
       public function findByCredentials(array $credentials): ?Identity { /* ... */ }
       public function updateLogin($id, array $fields) { /* ... */ }
   }
   ```
2. **Register your identifier in the driver config.**

### Best Practices
- Keep authenticators focused on a single strategy.
- Use dependency injection for services (e.g., LDAP client).
- Thoroughly test custom authenticators/identifiers.
- Document custom config options for maintainability.

---

## 17. Utilities & Service Integration

### Using the `auth()` Helper
- Call `auth()` anywhere (controllers, middleware, views) to access the default Auth instance.
- Pass a driver name to switch: `auth('driverName')`, `auth('api')`, etc.

### Service Provider Integration
- The `AuthProvider` registers the Auth service in the container.
- You can resolve Auth via dependency injection:
  ```php
  use Lightpack\Auth\Auth;
  class MyController {
      public function __construct(Auth $auth) { /* ... */ }
  }
  ```

### Accessing Auth in Controllers/Middleware
- Use DI, the global helper, or resolve from the container:
  ```php
  $auth = app()->get('auth');
  ```
- All methods (`login`, `logout`, `user`, etc.) are available.

### Middleware Example
- Protect a route:
  ```php
  if (!auth()->isLoggedIn()) {
      redirect('/login');
  }
  ```

---

## 18. Security Best Practices & Pitfalls

- **Always use HTTPS** for all authentication and API endpoints.
- **Hash passwords and tokens** (never store or log plain text).
- **Set cookies as HttpOnly and Secure** to prevent XSS and MITM.
- **Implement rate limiting** on login and token endpoints.
- **Grant least privilege**: only assign necessary abilities to tokens.
- **Rotate and revoke tokens** regularly.
- **Invalidate remember tokens** on password change.
- **Never expose sensitive fields** (password, remember_token) in responses.
- **Review session and cookie settings** for secure defaults.
- **Log out users on critical changes** (password, email, etc.).
- **Monitor token usage** for anomalies (Lightpack tracks last-used timestamps).

---

## 19. Advanced Scenarios & Recipes

### Multi-Factor Authentication (MFA)
- Combine a custom authenticator (e.g., OTP) with the default flow.
- Store MFA state in session and require second step before login completes.

### Social Login (OAuth)
- Implement a custom authenticator for the OAuth provider.
- On callback, fetch user info, create or update a local user, and log in.

### Single Sign-On (SSO)
- Use a custom authenticator and identifier to integrate with your SSO provider.
- Map remote user data to your local user model.

### Guest Users
- Provide a “guest” driver that issues temporary tokens or sessions for anonymous users.

### API-Only Applications
- Use only the `bearer` driver, disable session/cookie logic.
- Enforce token expiry and ability checks on every endpoint.

---

## 20. API Reference (Every Method)

### Auth (`Lightpack\Auth\Auth`)
- `login()`: Attempts to log in using the configured driver.
- `logout()`: Logs out the current user, clears session/cookies.
- `recall()`: Attempts to restore user from session or remember-me cookie.
- `viaToken()`: Authenticates using a bearer token from the request.
- `user()`: Returns the current authenticated user (`Identity`), or null.
- `id()`: Returns the current user's ID, or null.
- `isLoggedIn()`: Returns true if a user is authenticated.
- `isGuest()`: Returns true if no user is authenticated.
- `attempt()`: Attempts to authenticate using request credentials, returns user or null.
- `setDriver($driver)`: Switches the active driver.
- `setConfig($config)`: Updates the configuration at runtime.

### AuthManager (`Lightpack\Auth\AuthManager`)
- `verify($driver)`: Verifies authentication for a driver, returns user or null.
- `setIdentity($identity)`: Sets the current user.
- `getIdentity()`: Gets the current user.
- `persist()`: Persists user state to session/cookies.
- `forget()`: Clears user state from session/cookies.
- `redirectLoginUrl()`: Redirects to login URL.
- `redirectLogin()`: Redirects to intended or default URL after login.
- `redirectLogout()`: Redirects after logout.
- `updateLogin()`: Updates login info (timestamps, etc.).
- `flashError()`: Sets error message in session.

### Identity (`Lightpack\Auth\Identity` interface)
- `getId()`: Returns user’s unique ID.
- `getRememberToken()`: Gets the remember token.
- `setRememberToken($token)`: Sets the remember token.
- `createToken($name, $abilities = [], $expiry = null)`: Issues an API token.
- `deleteTokens($tokenId = null)`: Revokes tokens.
- `tokenCan($ability)`: Checks if the current token has an ability.

### AuthUser (`Lightpack\Auth\Models\AuthUser`)
- Implements all methods from Identity.
- Manages hidden fields, token creation/deletion, and ability checks.

### AccessToken (`Lightpack\Auth\Models\AccessToken`)
- `isExpired()`: Checks if the token is expired.
- `can($ability)`: Checks if the token grants a specific ability.
- `user()`: Returns the associated user.

---

## 21. Troubleshooting & FAQ

**Q: Why can’t my user log in?**
- Check credentials, password hashing, and user model fields.

**Q: Why is my API token not working?**
- Ensure the token is sent in the `Authorization` header and is not expired or revoked.

**Q: How do I add custom fields to the user model?**
- Extend the `AuthUser` model and update your migrations accordingly.

**Q: How do I support multiple user types?**
- Define multiple drivers and use `auth('driver')` as needed.

**Q: How do I implement social login?**
- Create a custom authenticator for the OAuth provider.

---

**For more details, always refer to the actual source code and configuration in your application. Lightpack Auth is designed for clarity, extensibility, and security.**

---

## Table of Contents

1. **Overview**
2. **Architecture**
   - Auth Core
   - AuthManager
   - Authenticators
   - Identifiers
   - Identity Models
   - Access Tokens
3. **Service Provider & Utilities**
   - AuthProvider
   - `auth()` Helper
4. **Authentication Flow**
   - Login
   - Logout
   - "Remember Me" & Cookies
   - Token-based Authentication (API)
   - User Recall
5. **Extending & Customizing**
   - Custom Authenticators
   - Custom Identifiers
   - Multi-Driver Support
6. **Security Considerations**
7. **Usage Examples**
8. **Best Practices**
9. **FAQ & Troubleshooting**
10. **Appendix: API Reference**

---

## 1. Overview

The Lightpack Auth system provides a robust, extensible, and modern authentication framework for PHP applications. It supports multiple authentication strategies ("drivers") including session-based login, persistent "remember me" cookies, and API bearer tokens. The design emphasizes clarity, explicitness, and security, following Lightpack's philosophy of simple, practical solutions.

---

## 2. Architecture

### 2.1. Auth Core (`Auth` class)

- **Namespace:** `Lightpack\Auth`
- **Purpose:** Main entry point for authentication operations. Wraps the `AuthManager` and exposes a simple API for common tasks.
- **Key Methods:**
  - `login()`: Handles user login via form credentials.
  - `logout()`: Logs out the user, destroys session, removes cookies.
  - `viaToken()`: Authenticates via API Bearer token.
  - `recall()`: Attempts to auto-login via session or "remember me" cookie.
  - `id()`: Returns the current user's ID.
  - `user()`: Returns the current user as an `Identity` object.
  - `isLoggedIn()`: Checks if user is authenticated.
  - `isGuest()`: Checks if user is not authenticated.
  - `attempt()`: Attempts authentication with current request data (usually form input).
  - `setDriver($driver)`: Switches the active authentication driver.
  - `setConfig($config)`: Updates the configuration.

**Design Notes:**
- The `Auth` object is typically resolved from the container via the `auth()` helper or dependency injection.
- Delegates all logic to `AuthManager`.

---

### 2.2. AuthManager

- **Namespace:** `Lightpack\Auth`
- **Purpose:** Implements the core authentication logic, manages authenticators, user state, and redirects.
- **Responsibilities:**
  - Manages available authenticators (`bearer`, `cookie`, `form`).
  - Maintains the current user identity (`Identity`).
  - Handles login, logout, session, and "remember me" cookie logic.
  - Provides redirect helpers for login/logout flows.
  - Normalizes configuration for drivers and fields.
  - Supports custom drivers and configuration via DI.

**Key Properties:**
- `$driver`: Current active driver.
- `$config`: Raw configuration array.
- `$normalizedConfig`: Flattened config for easy access.
- `static $identity`: Singleton for the current authenticated user.

**Key Methods:**
- `verify($driver)`: Runs the specified authenticator.
- `getAuthUser()`: Returns the current user (`Identity`), loading from session or cookie as needed.
- `getAuthId()`: Returns the user's unique ID.
- `setIdentity($identity)`: Sets the current user.
- `clearIdentity()`: Clears user state.
- `updateLogin()`, `updateLastLogin()`: Updates login timestamps.
- `persist()`: Persists login state to session/cookie.
- `checkRememberMe()`: Attempts auto-login via "remember me" cookie.
- `forgetRememberMeCookie()`: Removes the cookie.
- `redirectLogin()`, `redirectLogout()`, `redirectLoginUrl()`: Handles post-auth redirects.
- `flashError()`: Sets error messages for failed login attempts.

**Design Notes:**
- All authenticators are registered in the `$authenticators` array.
- Uses `Identifier` to fetch user records; see below.

---

### 2.3. Authenticators

Authenticators are responsible for verifying user credentials using different strategies.

#### AbstractAuthenticator

- **Namespace:** `Lightpack\Auth`
- **Purpose:** Base class for all authenticators.
- **Key Methods:**
  - `verify()`: Abstract method, must return an `Identity` or `null`.
  - `setIdentifier()`, `getIdentifier()`: Set or get the associated `Identifier`.
  - `setConfig()`, `getConfig()`: Set or get configuration.

#### Built-in Authenticators

- **BearerAuthenticator**
  - **Purpose:** Authenticates via API Bearer token (for APIs).
  - **How it works:** Extracts bearer token from request, hashes it, finds matching `AccessToken`, checks expiry, and returns the associated user.
  - **Security:** Uses SHA-256 hashing for tokens, checks expiry, updates last used timestamp.

- **CookieAuthenticator**
  - **Purpose:** Authenticates via persistent "remember me" cookie.
  - **How it works:** Reads cookie, splits into user ID and token, verifies with `Identifier`.
  - **Security:** Cookie must match token stored in DB.

- **FormAuthenticator**
  - **Purpose:** Authenticates via form credentials (typically email/password).
  - **How it works:** Reads credentials from request, verifies via `Identifier`.

**Extending:**  
You may implement your own authenticator by extending `AbstractAuthenticator` and registering it in configuration.

---

### 2.4. Identifiers

Identifiers abstract the logic for retrieving user records from storage.

- **Interface:** `Lightpack\Auth\Identifier`
  - `findById($id): ?Identity`
  - `findByRememberToken($id, string $token): ?Identity`
  - `findByCredentials(array $credentials): ?Identity`
  - `updateLogin($id, array $fields)`

- **DefaultIdentifier**
  - **Purpose:** Default implementation using the `AuthUser` model.
  - **How it works:** Uses model methods to fetch users by ID, credentials, or remember token. Verifies passwords using the `password()` utility.
  - **Extending:** You can implement your own identifier for custom user stores.

---

### 2.5. Identity

Represents an authenticated user.

- **Interface:** `Lightpack\Auth\Identity`
  - `getId()`: Returns unique user ID.
  - `getRememberToken()`, `setRememberToken($token)`: For "remember me" support.
  - `accessTokens()`: Returns user's access tokens.
  - `createToken($name, $abilities, $expiresAt)`: Creates a new access token.
  - `deleteTokens($tokenId)`: Deletes access tokens.

- **AuthUser** (Default Model)
  - **Purpose:** Implements `Identity`, represents users table.
  - **Fields:** `id`, `email`, `password`, `remember_token`, etc.
  - **Methods:** Implements all interface methods, manages access tokens, supports abilities (scopes).

---

### 2.6. Access Tokens

- **Model:** `Lightpack\Auth\Models\AccessToken`
  - **Represents:** API tokens for users.
  - **Fields:** `user_id`, `token` (SHA-256), `abilities` (JSON), `expires_at`, `last_used_at`.
  - **Methods:**
    - `user()`: Belongs to `AuthUser`.
    - `isExpired()`: Checks expiry.
    - `can($ability)`: Checks if token grants a specific ability.

---

## 3. Service Provider & Utilities

### 3.1. AuthProvider

- **File:** `src/Framework/Providers/AuthProvider.php`
- **Purpose:** Registers the Auth service in the DI container.
- **How it works:**
  - Registers `auth` as a singleton, configured from `auth.drivers` config.
  - Aliases `Lightpack\Auth\Auth` to `auth` for type-hinting.

### 3.2. `auth()` Helper

- **File:** `src/Framework/utilities.php`
- **Purpose:** Global helper to access the Auth object.
- **Usage:**
  - `auth()`: Returns the default Auth instance.
  - `auth('driver')`: Switches to a specific driver.

---

## 4. Authentication Flow

---

## API Authentication (Bearer Token)

### 1. Introduction & Use Cases

API authentication in Lightpack is designed for stateless, secure, and scalable access to your application's resources. It is ideal for:
- RESTful APIs
- Mobile apps
- Single-page applications (SPAs)
- Third-party integrations
- Microservices

Lightpack uses Bearer tokens (RFC 6750) for API authentication, ensuring each request can be independently verified without relying on sessions or cookies.

---

### 2. Core Concepts

- **Bearer Token:** A cryptographically strong, opaque string provided to a client after successful authentication. Sent in the `Authorization: Bearer <token>` HTTP header.
- **AccessToken Model:** Represents API tokens in the database, tracks abilities (scopes), expiry, and usage.
- **BearerAuthenticator:** Authenticator that validates incoming tokens and resolves the associated user.
- **Abilities/Scopes:** Fine-grained permissions attached to each token (e.g., `read:posts`, `write:comments`).
- **Statelessness:** Each API request is self-contained; no session is required.

---

### 3. Token Lifecycle

1. **Issuance:**
   - User authenticates (usually via username/password) and requests## 8. API Authentication (Bearer Tokens)

Bearer token authentication is designed for stateless API clients (SPAs, mobile, microservices).

#### [Diagram: Bearer Token Flow]

```
[User Login/API Call]
    |
    v
[auth()->user()->createToken()] --issues--> [Bearer Token]
    |
    v
[Client] --sends--> Authorization: Bearer <token>
    |
    v
[API Endpoint] --calls--> [auth('api')->user()]
    |
    v
[BearerAuthenticator] --verifies--> [AccessToken] --fetches--> [User]
    |
    v
[Identity] attached to request
```

**Flow:**
1. User logs in (via password, OAuth, etc.) and receives a bearer token.
2. The client sends the token in the `Authorization` header with each request.
3. The server verifies the token, checks expiry/abilities, and attaches the user to the request context.

**Example:**

```php
// Issue a token
$token = auth()->user()->createToken('mobile-app', ['read', 'write']);

// On API request
$user = auth('api')->user();
if ($user && $user->tokenCan('read')) {
    // Allow access
}
```

### Security Best Practices
- Always use HTTPS.
- Store tokens securely on the client (never in localStorage for browser apps).
- Rotate/revoke tokens regularly.
- Assign only necessary abilities.

### Troubleshooting
- Ensure the Authorization header is set: `Bearer <token>`
- Check token expiry and revocation status.

---
 Hashes the token using SHA-256 for secure comparison.
- Looks up the token in the `access_tokens` table.
- Checks if the token is expired (`expires_at`).
- Updates the `last_used_at` timestamp for analytics and security.
- Loads the associated user (`AuthUser`), attaches the token as `currentAccessToken`.
- Returns the user object or `null` if authentication fails.
{{ ... }}

**Sample Flow:**
```php
$user = auth()->viaToken();
if ($user && $user->tokenCan('read:posts')) {
    // Access granted
}
```

---

### 5. AccessToken Model & Abilities

**Location:** `Lightpack\Auth\Models\AccessToken`

- **Fields:**
  - `user_id`: Foreign key to the user
  - `token`: SHA-256 hash of the plaintext token
  - `abilities`: JSON array (e.g., `["*"]`, `["read:posts"]`)
  - `expires_at`: Optional expiry timestamp
  - `last_used_at`: Timestamp of last usage
- **Methods:**
  - `isExpired()`: Checks if the token is expired
  - `can($ability)`: Checks if the token grants a specific ability
  - `user()`: Returns the associated user

**Abilities/Scopes:**
- Use `*` for full access, or specify granular abilities (recommended for security).
- Example: `['read:posts', 'write:comments']`

---

### 6. Issuing Tokens (How to Create)

Tokens are typically issued after a user logs in via a form or API endpoint.

**Example Controller Method:**
```php
public function issueToken()
{
    $user = auth()->attempt(); // Authenticates via form credentials
    if (!$user) {
        return response()->json(['error' => 'Invalid credentials'], 401);
    }

    // Create a token with specific abilities and optional expiry
    $token = $user->createToken('My API Token', ['read:posts', 'write:comments'], '+1 month');

    // Return the plaintext token (show only once!)
    return response()->json([
        'access_token' => $token->plainTextToken,
        'token_type' => 'Bearer',
        'expires_at' => $token->expires_at,
        'abilities' => json_decode($token->abilities),
    ]);
}
```

**Important:**
- The plaintext token is only shown once. Store it securely on the client.
- Only the hash is stored in the database.

---

### 7. Using Tokens (How to Authenticate)

Clients must include the token in the `Authorization` header:

```
Authorization: Bearer <your_token_here>
```

**Example API Request (cURL):**
```
curl -H "Authorization: Bearer eyJ0eXAiOiJK..." https://api.example.com/posts
```

**In Controller:**
```php
$user = auth()->viaToken();
if (!$user) {
    return response()->json(['error' => 'Unauthorized'], 401);
}

if (!$user->tokenCan('read:posts')) {
    return response()->json(['error' => 'Forbidden'], 403);
}
// Proceed with request
```

---

### 8. Token Revocation & Expiry

- **Revocation:**
  - Call `$user->deleteTokens($tokenId)` to delete a specific token.
  - Call `$user->deleteTokens()` to revoke all tokens for a user.
- **Expiry:**
  - Set `expires_at` when creating the token.
  - `BearerAuthenticator` rejects expired tokens automatically.
- **Rotation:**
  - For extra security, periodically revoke and re-issue tokens.
- **Multiple Tokens:**
  - Users can have multiple active tokens (e.g., one per device or app).

---

### 9. Security Considerations

- **HTTPS Only:** Never transmit tokens over HTTP. Always use HTTPS.
- **Token Storage:**
  - Mobile: Use secure storage (Keychain, Keystore).
  - Web: Use memory or secure cookies (never localStorage for sensitive tokens).
- **Least Privilege:**
  - Grant only necessary abilities to each token.
  - Avoid using `*` except for trusted internal clients.
- **Short Expiry:**
  - Use short-lived tokens for sensitive operations.
- **No Token Logging:**
  - Never log plaintext tokens.
- **Rate Limiting:**
  - Protect token issuance and sensitive endpoints.
- **Token Hashing:**
  - Only store SHA-256 hashes in the database.
- **CORS:**
  - Configure CORS policies to restrict API access as needed.

---

### 10. Extending API Auth

- **Custom Abilities:**
  - Define your own abilities/scopes and check with `$user->tokenCan('my:ability')`.
- **Custom Token Models:**
  - Extend `AccessToken` for extra metadata (e.g., device info, IP address).
- **Multiple User Types:**
  - Use multiple drivers and models for different API user classes.
- **Custom Authenticators:**
  - Implement and register new authenticators for alternative API auth schemes (JWT, OAuth, etc).

---

### 11. Real-World Patterns

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

### 12. Troubleshooting & Best Practices

- **401 Unauthorized:** Token missing, invalid, or expired.
- **403 Forbidden:** Token does not have required ability.
- **Token Leakage:** Rotate keys and revoke tokens immediately if exposed.
- **Token Not Working:** Check hash, expiry, and abilities in the database.
- **Multiple Devices:** Issue separate tokens per device for better control.
- **Analytics:** Use `last_used_at` for monitoring and anomaly detection.

---

### 13. Example: Full API Token Flow

**Issuing a Token:**
```php
// User logs in and requests a token
$user = auth()->attempt();
if ($user) {
    $token = $user->createToken('Mobile App', ['read:profile'], '+7 days');
    return response()->json(['access_token' => $token->plainTextToken]);
}
```

**Authenticating an API Request:**
```php
// In your API controller
$user = auth('api')->user();
if (!$user) {
    return response()->json(['error' => 'Unauthorized'], 401);
}
if (!$user->tokenCan('read:profile')) {
    return response()->json(['error' => 'Forbidden'], 403);
}
// Serve the protected resource
```

**Revoking a Token:**
```php
// User wants to logout from device
$user->deleteTokens($tokenId); // Or delete all tokens
```

---

**Summary:**

Lightpack's API authentication system is robust, secure, and highly extensible. By leveraging Bearer tokens, abilities/scopes, and a clean authenticator architecture, you can build modern APIs for any client—mobile, web, or third-party—while maintaining strict security and flexibility. Always follow best practices for token management, storage, and revocation to keep your APIs safe and developer-friendly.

---


### 4.1. Login

- User submits credentials via form.
- `Auth::login()` calls `FormAuthenticator`, which uses `Identifier` to fetch user.
- Password is verified, user is set as the current identity.
- Session is updated (`_logged_in`, `_auth_id`), "remember me" cookie is set if requested.
- Redirects to intended URL or default login redirect.

### 4.2. Logout

- `Auth::logout()` clears identity, removes session and cookies.
- Redirects to logout redirect URL.

### 4.3. "Remember Me" & Cookies

- When "remember me" is enabled, a persistent cookie is set with user ID and token.
- On subsequent visits, the cookie is used to re-authenticate via `CookieAuthenticator`.
- Tokens are stored in the DB and rotated for security.

### 4.4. Token-based Authentication (API)

- API clients send a Bearer token in the Authorization header.
- `BearerAuthenticator` verifies the token, checks expiry, and returns the user.
- Supports abilities (scopes) for fine-grained API access.

### 4.5. User Recall

- `Auth::recall()` attempts to restore user from session or "remember me" cookie.

---

## 5. Extending & Customizing

### 5.1. Custom Authenticators

- Implement your own authenticator by extending `AbstractAuthenticator`.
- Register in the config as a new driver.

### 5.2. Custom Identifiers

- Implement the `Identifier` interface for custom user stores (LDAP, external APIs, etc).

### 5.3. Multi-Driver Support

- You can configure multiple drivers (e.g., for admin vs. user).
- Use `auth('driver')` to switch.

---

## 6. Security Considerations

- **Password Storage:** Always use strong hashing (bcrypt, Argon2).
- **Token Security:** Bearer tokens are hashed (SHA-256) and checked for expiry.
- **Session Management:** Sessions are destroyed on logout.
- **Cookie Security:** "Remember me" cookies use tokens stored in DB, not passwords.
- **CSRF Protection:** Ensure forms are protected.
- **Rate Limiting:** Recommended for login endpoints.
- **HTTPS:** Always use HTTPS for authentication flows.

---

## 7. Usage Examples

### Basic Login

```php
// In a controller
if (auth()->login()) {
    // Redirected automatically on success
} else {
    // Error handled and redirected to login
}
```

### Check If User Is Logged In

```php
if (auth()->isLoggedIn()) {
    $user = auth()->user();
    echo "Welcome, " . $user->name;
}
```

### API Authentication

```php
$user = auth()->viaToken();
if ($user && $user->tokenCan('read:posts')) {
    // Serve API response
}
```

### Logout

```php
auth()->logout();
```

### Switch Driver

```php
auth('admin')->login();
```

---

## 8. Best Practices

- Always validate and sanitize user input.
- Use HTTPS for all authentication endpoints.
- Rotate and expire tokens regularly.
- Limit login attempts to prevent brute force attacks.
- Use strong, unique passwords for users.
- Store only hashed tokens and passwords in the database.
- Regularly audit your authentication flows for security.

---

## 9. FAQ & Troubleshooting

**Q: How do I implement social login?**  
A: Implement a custom authenticator and identifier for the OAuth provider.

**Q: How do I support multiple user types?**  
A: Define multiple drivers in your config and use `auth('driver')`.

**Q: Why is my "remember me" not working?**  
A: Ensure cookies are being set and the `remember_token` field is updated in the DB.

**Q: How do I add custom fields to the user model?**  
A: Extend the `AuthUser` model and update your migrations accordingly.

---

## 10. Appendix: API Reference

### Auth (`Lightpack\Auth\Auth`)
- `login()`
- `logout()`
- `viaToken()`
- `recall()`
- `id()`
- `user()`
- `isLoggedIn()`
- `isGuest()`
- `attempt()`
- `setDriver(string $driver)`
- `setConfig(array $config)`

### AuthManager (`Lightpack\Auth\AuthManager`)
- `verify($driver)`
- `getAuthUser()`
- `getAuthId()`
- `setIdentity(Identity $identity)`
- `clearIdentity()`
- `updateLogin()`
- `updateLastLogin()`
- `persist()`
- `checkRememberMe()`
- `forgetRememberMeCookie()`
- `redirectLogin()`
- `redirectLogout()`
- `redirectLoginUrl()`
- `flashError()`

### Identity (`Lightpack\Auth\Identity`)
- `getId()`
- `getRememberToken()`
- `setRememberToken(string $token)`
- `accessTokens()`
- `createToken(string $name, array $abilities, ?string $expiresAt)`
- `deleteTokens(?string $tokenId)`

### Identifier (`Lightpack\Auth\Identifier`)
- `findById($id)`
- `findByRememberToken($id, string $token)`
- `findByCredentials(array $credentials)`
- `updateLogin($id, array $fields)`

### AccessToken (`Lightpack\Auth\Models\AccessToken`)
- `user()`
- `isExpired()`
- `can(string $ability)`

---

## Conclusion

The Lightpack Auth system is a modern, extensible, and secure authentication framework designed for clarity and flexibility. By following the patterns and best practices outlined here, developers can confidently implement authentication in their Lightpack applications, whether for web, API, or custom use cases.

---

**For further details, always refer to the actual source code and configuration in your application, as Lightpack is designed for explicitness and transparency.**