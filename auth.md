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