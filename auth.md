# Lightpack Auth System: Comprehensive Documentation

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
  - `viaToken()`: Authenticates via API bearer token.
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
   - User authenticates (usually via username/password) and requests an API token.
   - Server generates a secure token, stores a hash in the database, and returns the plaintext token to the client.
2. **Usage:**
   - Client includes the token in the `Authorization` header for every API request.
   - Server verifies the token, checks expiry and abilities, and authenticates the user.
3. **Revocation/Expiry:**
   - Tokens can be revoked by deleting them from the database or setting an expiry date.
   - Expired or revoked tokens are rejected.

---

### 4. BearerAuthenticator Deep Dive

**Location:** `Lightpack\Auth\Authenticators\BearerAuthenticator`

- Extracts the Bearer token from the request header.
- Hashes the token using SHA-256 for secure comparison.
- Looks up the token in the `access_tokens` table.
- Checks if the token is expired (`expires_at`).
- Updates the `last_used_at` timestamp for analytics and security.
- Loads the associated user (`AuthUser`), attaches the token as `currentAccessToken`.
- Returns the user object or `null` if authentication fails.

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
  - Encourage clients to rotate tokens periodically for security.

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
$user = auth()->viaToken();
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
A: Extend `AuthUser` and update your migrations accordingly.

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