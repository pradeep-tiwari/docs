# API Auth

Authenticating APIs can be confusing as because there are a number of approaches for it each
with its own pros and cons. **Lightpack** supports authenticating APIs using tokens in a very friendly manner.

## Session Cookie

In this approach, the client passes `username` and `password` once to a dedicated **login** endpoint. On successful identification, the client recieves a `time-limited` token.

On subsequent API calls, client passes the received token for identification until the token expires.

**When to use this authentication approach?**

<p class="tip">Use session cookie based authentication when the client app is hosted along with API on the same site.</p> 

For example, **browser-based** client apps served from the same origin the API is hosted on. These client apps are also called **first-party** clients.

<p class="tip">First-party clients run on the same origin as the API.</p>

To understand more about same origin, please refer to the awesome docs maintained by Mozilla for [Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)

**How is the token stored on client?**

After successful login, client receives the token which it stores in an **HTTP cookie** on the browser side. As because browsers automatically send the cookies on subsequent requests to the API server, a **session** is maintained between the client and server.

**How is the token stored on server?**

API server stores the token on a shared database for persistence. For example, it can be MySQL, Redis, MongoDB or any such database for persistence.