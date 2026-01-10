# Lightpack Background Jobs: Complete Guide

Ideally, a time consuming job should be performed behind the scenes out of the main HTTP request context. For example, sending email to a user blocks the application until the processing finishes and this may provide a bad experience to your application users. 

What if you could perform time consuming tasks, such as sending emails, in the background without blocking the actual request? 

**Welcome to background job processing.**

While there are highly capable solutions available like **RabbitMQ**, **ZeroMQ**, **ActiveMQ**, **RocketMQ**, and many others, `Lightpack` provides background jobs processing capabilities that is super easy to use and understand. 

Although `Lightpack` will solve background jobs processing needs for most of the applications, it never aims to be a **full-fledged** message queue broker like those mentioned above.

> **Lightpack Jobs** provides robust, extensible, and developer-friendly background job processing for PHP apps. Supports MySQL/MariaDB, Redis, synchronous, and null engines out of the box.

## Supported Engines
- **database:** MySQL/MariaDB-backed persistent queue
- **redis:** High-performance, production-grade queue (sorted sets, atomic ops, delayed jobs)
- **sync:** Executes jobs immediately (for synchronous execution)
- **null:** Discards jobs (for tests/dev)

You can switch the queue engine by altering `JOB_ENGINE` key in **.env** file.

## Database Migration

If using the **database** engine, you need a `jobs` table. 

Create schema migration file:

```cli
php console create:migration --support=jobs
```

Run migration:

```cli
php console migrate:up
```

---

## Creating Jobs

Jobs are PHP classes extending `Lightpack\Jobs\Job` and implementing a `run()` method. 

To create a new job class, fire this command in your terminal from project root:

```terminal
php console create:job SendMail
```

This should have created a `SendMail.php` class file in `app/Jobs` folder. You can implement your job logic in the `run()` method.



```php
use Lightpack\Jobs\Job;

class SendMail extends Job {
    public function run() {
        // Access payload data
        $to = $this->payload['to'];
        $message = $this->payload['message'];
        
        // Your job logic - send email
    }
}
```

## Dispatching Jobs

Once you have implemented your job class, you can **dispatch** them by simply invoking its `dispatch()` method:

```php
(new SendMail)->dispatch();
```

You can optionally pass it an array as payload:

```php
$payload = [
    'to' => 'bob@example.com',
    'message' => 'Hello Bob'
];

(new SendMail)->dispatch($payload);
```

## Advanced Job Features
- **Queue:** Set `$queue` property (default: 'default')
- **Delay:** Set `$delay` property (strtotime string, e.g. '+30 seconds')
- **Attempts:** Set `$attempts` property (default: 1)
- **Retry After:** Set `$retryAfter` property (strtotime string, e.g. '+1 minute')

Example:
```php
class SendMail extends Job {
    protected $queue = 'emails';
    protected $delay = '+1 minute';
    protected $attempts = 3;
    protected $retryAfter = '+10 seconds';
}
```

### Queue

You can specify a queue for a job by setting the `$queue` property:

```php
class SendMail
{
    protected $queue = 'emails';
}
```

### Delay

You can delay job processing by a specified amount of time in two ways:

**Option 1: Property-based (class-level default)**
```php
class SendMail extends Job
{
    protected $delay = '+30 seconds';
}

(new SendMail)->dispatch($payload); // Will be delayed by 30 seconds
```

**Option 2: Method-based (runtime, per-instance)**
```php
// Delay a specific job instance
(new SendMail)->delay('+1 hour')->dispatch($payload);

// Dynamic delays for batch processing
for ($i = 0; $i < 100; $i++) {
    (new SendMail)
        ->delay('+' . ($i * 5) . ' seconds')
        ->dispatch($emails[$i]);
}
```

The `delay()` method accepts any `strtotime()` compatible string (e.g., `'+30 seconds'`, `'+1 hour'`, `'+2 days'`).

### Attempts

You can specify the number of attempts a job should be retried by setting the `$attempts` property:

```php
class SendMail
{
    protected $attempts = 3;
}
```

### Retry After

You can specify the time after which a failed job should be retried by setting the `$retryAfter` property:

```php
class SendMail
{
    protected $retryAfter = '+1 minute';
}
```

### Rate Limiting

Rate limiting controls how many jobs of a specific type can execute within a time window. This is useful for:
- **API rate limits:** Respect third-party API limits (e.g., 100 requests per hour)
- **Resource protection:** Prevent overwhelming external services
- **Cost control:** Limit expensive operations (SMS, email services with usage-based pricing)
- **Compliance:** Meet service-level agreements or terms of service

**How it works:**
When a job hits its rate limit, it's automatically released back to the queue and delayed until the rate limit window expires. The worker continues processing other jobs in the meantime.

#### Basic Rate Limiting

Implement the `rateLimit()` method in your job class:

```php
use Lightpack\Jobs\Job;

class SendEmailJob extends Job
{
    public function rateLimit(): ?array
    {
        return ['limit' => 10, 'seconds' => 1]; // 10 emails per second
    }
    
    public function run()
    {
        // Send email logic
    }
}
```

#### Supported Time Units

For better readability, you can use multiple time units:

```php
// Seconds (for high-frequency operations)
public function rateLimit(): ?array
{
    return ['limit' => 2, 'seconds' => 1]; // 2 per second
}

// Minutes (common for API calls)
public function rateLimit(): ?array
{
    return ['limit' => 6, 'minutes' => 5]; // 6 login attempts per 5 minutes
}

// Hours (for moderate limits)
public function rateLimit(): ?array
{
    return ['limit' => 100, 'hours' => 1]; // 100 API calls per hour
}

// Days (for daily quotas)
public function rateLimit(): ?array
{
    return ['limit' => 1, 'days' => 1]; // 1 newsletter per day
}
```

**Important:** You must specify a time unit. Omitting it will throw an `InvalidArgumentException`.

#### Per-User Rate Limiting

Use custom keys to rate limit per user, tenant, or any other dimension:

```php
class SendPaymentReminderJob extends Job
{
    public function rateLimit(): ?array
    {
        $userId = $this->payload['user_id'];
        
        return [
            'limit' => 3,
            'hours' => 1,
            'key' => 'payment-reminder:user:' . $userId
        ];
    }
    
    public function run()
    {
        // Send payment reminder to specific user
    }
}
```

This ensures each user can receive max 3 payment reminders per hour, independently.

#### Per-Tenant Rate Limiting

For multi-tenant applications:

```php
class GenerateReportJob extends Job
{
    public function rateLimit(): ?array
    {
        $tenantId = $this->payload['tenant_id'];
        
        return [
            'limit' => 50,
            'hours' => 1,
            'key' => 'reports:tenant:' . $tenantId
        ];
    }
}
```

#### Conditional Rate Limiting

Skip rate limiting based on conditions:

```php
class SendEmailJob extends Job
{
    public function rateLimit(): ?array
    {
        // No rate limit for admin users
        if ($this->payload['is_admin'] ?? false) {
            return null;
        }
        
        // otherwise limit to 10 atte per minute
        return ['limit' => 10, 'minutes' => 1];
    }
}
```

#### Few Example Scenarios

**Example 1: Ticketing API (10 tickets per hour)**
```php
class CreateTicketJob extends Job
{
    public function rateLimit(): ?array
    {
        return ['limit' => 10, 'hours' => 1];
    }
}
```

**Example 2: Sending SMS (1 per second to avoid spam)**
```php
class SendSmsJob extends Job
{
    public function rateLimit(): ?array
    {
        return ['limit' => 1, 'seconds' => 1];
    }
}
```

**Example 3: Payment Processing (100 per second)**
```php
class ProcessPaymentJob extends Job
{
    public function rateLimit(): ?array
    {
        return ['limit' => 100, 'seconds' => 1];
    }
}
```

**Example 4: Daily newsletter (1 per user per day)**
```php
class SendNewsletterJob extends Job
{
    public function rateLimit(): ?array
    {
        $userId = $this->payload['user_id'];
        
        return [
            'limit' => 1,
            'days' => 1,
            'key' => 'newsletter:user:' . $userId
        ];
    }
}
```

#### Cache Driver Requirements

Rate limiting depends on Lightpack's Cache system. You should configure your cache driver in `.env`. Learn more about cache drivers in the [Caching](caching.md) section.

#### How Rate Limiting Works Internally

1. Worker checks if job is rate limited before execution
2. If limit exceeded, job is released back to queue with delay equal to the rate limit window
3. Worker continues processing other jobs
4. After the window expires, the job becomes available again
5. No worker resources are wasted waiting

**Why this is better than sleep():**
- Worker doesn't block - continues processing other jobs
- Efficient resource usage
- Automatic retry scheduling
- Works across multiple worker processes

#### Important: Rate Limiting and Attempts Counter

**Rate-limited jobs DO increment the attempts counter.** This is an important design decision:

- **Rate limiting** = Waiting for API quota/slots → **increments attempts**
- **Job failure** = Exception thrown during execution → **increments attempts**

**Why both increment attempts:**
- Prevents infinite loops if jobs are perpetually rate-limited
- Natural protection against misconfigured rate limits
- Jobs eventually fail rather than cycling forever

**Example:**
```php
class SendEmailJob extends Job
{
    protected $attempts = 10; // Set higher for rate-limited jobs
    
    public function rateLimit(): ?array
    {
        return ['limit' => 2, 'seconds' => 1];
    }
    
    public function run()
    {
        // Send email
    }
}
```

**Scenario:**
- Dispatch 10 emails with `$attempts = 3`
- Jobs 1-2 execute immediately (attempts: 0)
- Jobs 3-10 are rate-limited and released (attempts: 1)
- After 1 second, jobs 3-4 execute (attempts: 1)
- Jobs 5-10 rate-limited again (attempts: 2)
- After 1 second, jobs 5-6 execute (attempts: 2)
- Jobs 7-10 rate-limited again (attempts: 3)
- **Jobs 7-10 fail permanently** (max attempts reached)

**Best Practices:**
- **Set higher `$attempts` for rate-limited jobs** (e.g., 10-20 instead of 3)
- Calculate: `$attempts = (expected_rate_limit_cycles + expected_failures + buffer)`
- Monitor rate-limited jobs to tune limits appropriately
- Consider if rate limiting is the right solution for your use case

**When Rate Limiting Isn't Ideal:**
- **Known batch processing:** Use manual scheduling with delays instead
- **Daily quotas:** Pre-check quota before dispatching
- **Unpredictable bursts:** Rate limiting works well here

**Alternative for Batch Jobs:**
```php
// Instead of rate limiting 100 emails
for ($i = 0; $i < 100; $i++) {
    (new SendEmailJob)
        ->delay('+' . ($i * 0.5) . ' seconds')
        ->dispatch($emails[$i]); // Stagger by 0.5s
}
```

## Processing Jobs

Once you have dispatched your job it's time to run them. Fire this command from the terminal in your project root:

```terminal
php console process:jobs
```

This will hang your terminal prompt and will wait for any jobs to process. If a job is processed successfully or failed, you should see a terminal message accordingly.

### Worker Options
- `--sleep=N` (default 5): Seconds to sleep between polling
- `--queue=emails,default`: Comma-separated queue names (note: singular)
- `--cooldown=N` (default 0): Total runtime in seconds before worker stops (0 = unlimited)

**Cooldown Explained:**
Cooldown is the **total runtime** (not idle time). After running for the specified seconds, the worker stops gracefully. This is useful for:
- Preventing memory leaks by restarting workers periodically
- Picking up new code after deployment (worker restarts with fresh code)
- Works with Supervisor's auto-restart feature

Example:
```cli
# Worker runs for 10 minutes of total runtime, then stops (Supervisor will restart it)
php console process:jobs --sleep=2 --queue=emails,default --cooldown=600
```

### Signal Handling
The worker supports UNIX signals for graceful shutdown and reload.

## Custom Hooks

To run custom logic after a job succeeds or fails (after all retries are exhausted), implement `onSuccess()` and/or `onFailure()` in your job class:

```php
class SendMail extends Job {
    public function run() {
        // ... job logic ...
    }

    public function onSuccess() {
        // Called after successful processing
    }

    public function onFailure() {
        // Called after all attempts fail
    }
}
```

The framework will call these methods automatically if they exist.

## Production

In **production** environment, you should run and monitor job processing by using a process monitoring solution like **supervisor**.

First, you will have to install `supervisor`:

```terminal
sudo apt-get install supervisor
```

Let us assume that your project root path is `/var/www/lightpack-app`.

Create a file named `lightpack-worker.conf` in `/etc/supervisor/conf.d` directory with following contents:

```text
[program:lightpack-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/lightpack-app/console process:jobs --cooldown=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/www/lightpack-app/worker.log
stopwaitsecs=60
```

**Configuration Notes:**
- `--cooldown=3600`: Workers stop after 1 hour of total runtime (not idle time), then Supervisor restarts them. This prevents memory leaks and picks up new code on restart.
- `autorestart=true`: Supervisor automatically restarts workers after they stop
- `stopwaitsecs=60`: Gives workers 60 seconds to finish current job before force-killing
- `numprocs=4`: Runs 4 worker processes in parallel

Finally, fire these commands to start supervisor:

```terminal
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start lightpack-worker:*
```

---