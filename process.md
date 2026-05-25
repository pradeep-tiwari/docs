# Process

Lightpack's `Process` utility provides two distinct modes for running system processes.

| Mode | Method | I/O | Use when |
|------|--------|-----|----------|
| **Captured** | `execute()` | Buffered into strings | Scripts, build tools, any command whose output you need to read |
| **Inherited** | `spawn()` | Streams to the terminal directly | Dev servers, workers, any process that must display live output |

---

## execute() — Captured I/O

Use `execute()` when you need to read stdout/stderr after the process finishes.

### Simple command

```php
use Lightpack\Utils\Process;

$process = new Process;
$process->execute('ls -la');

echo $process->getOutput();   // stdout
echo $process->getError();    // stderr
echo $process->getExitCode(); // integer exit code
```

### Array syntax (recommended)

Always prefer the array form for commands with arguments — it bypasses the shell and avoids injection risks.

```php
$process = new Process;
$process->execute(['git', 'clone', 'https://github.com/user/repo.git']);

if ($process->failed()) {
    throw new RuntimeException('Clone failed: ' . $process->getError());
}
```

### Working directory

```php
$process = new Process;

$process->setDirectory('/path/to/project')
    ->execute(['git', 'status']);

echo $process->getDirectory(); // returns the directory that was set
```

### Timeout

The default timeout is 60 seconds. A `RuntimeException` is thrown if the process exceeds it.

```php
$process = new Process;

try {
    $process->setTimeout(10)->execute('slow-command');
} catch (RuntimeException $e) {
    echo 'Timed out: ' . $e->getMessage();
}
```

### Streaming output line by line

When you pass a callback, each line is delivered as it arrives instead of being buffered. This is memory-efficient for commands that produce large or continuous output.

```php
$process = new Process;

$process->execute('tail -f /var/log/app.log', function(string $line, string $type) {
    if ($type === 'stdout') {
        echo $line;
    } else {
        error_log('[stderr] ' . $line);
    }
});
```

The callback receives two arguments:
- `$line` — the raw output line (including the trailing newline)
- `$type` — `'stdout'` or `'stderr'`

---

## spawn() — Inherited I/O

Use `spawn()` for processes that must stream output directly to the terminal. The child process **inherits** the parent's STDIN, STDOUT, and STDERR — output is never buffered.

`spawn()` returns a `ChildProcess` handle immediately, without waiting for the process to finish. You manage the lifecycle through that handle.

```php
use Lightpack\Utils\Process;

$process = new Process;
$child = $process->spawn([PHP_BINARY, '-S', '127.0.0.1:8000', '-t', 'public']);

// The server is now running. Block here until it exits.
$exitCode = $child->wait();
```

### Passing environment variables

Pass `null` (the default) to inherit the current environment. Pass an explicit array to override or extend it.

```php
$env = array_merge(getenv(), ['APP_ENV' => 'production']);

$child = $process->spawn(['php', 'artisan', 'serve'], $env);
$child->wait();
```

### Working directory

`setDirectory()` applies to both `execute()` and `spawn()`.

```php
$child = (new Process)
    ->setDirectory('/var/www/myapp')
    ->spawn(['composer', 'install']);

$child->wait();
```

---

## ChildProcess — lifecycle API

Every `spawn()` call returns a `ChildProcess` instance. It is the only object you need to monitor and control the spawned process.

### isRunning()

Returns `true` while the process is alive.

```php
$child = $process->spawn(['sleep', '10']);

if ($child->isRunning()) {
    echo 'Still going...';
}
```

### pid()

Returns the OS-level process ID as an integer.

```php
$child = $process->spawn(['sleep', '10']);
echo $child->pid(); // e.g. 12345
```

### wait()

Blocks until the process exits and returns the integer exit code. Always call `wait()` when you want to be sure the process has finished and the exit code is captured.

```php
$child = $process->spawn(['/bin/sh', '-c', 'exit 42']);
$code = $child->wait(); // 42
```

### exitCode()

Returns the captured exit code, or `null` if the process is still running. The value is only reliable after `wait()` (or after `terminate()`/`kill()` followed by `wait()`).

```php
$child = $process->spawn(['true']);
$child->wait();

echo $child->exitCode(); // 0
```

### terminate()

Sends SIGTERM (15) by default — asks the process to shut down gracefully. You can pass a different signal number if needed.

```php
$child = $process->spawn(['sleep', '30']);
$child->terminate();    // SIGTERM
$child->wait();
```

### kill()

Sends SIGKILL (9) — forcible, unblockable termination.

```php
$child = $process->spawn(['sleep', '30']);
$child->kill();
$child->wait();
```

---

## Automatic cleanup

`ChildProcess` registers cleanup at three levels so the child is never left as an orphan:

1. **`pcntl_signal` (SIGINT / SIGTERM)** — handles Ctrl+C and kill signals gracefully on Unix/macOS.
2. **`register_shutdown_function`** — universal fallback that fires when PHP exits for any reason, including crashes and fatal errors.
3. **`__destruct`** — safety net when the `ChildProcess` object is garbage-collected without an explicit `wait()`.

You do not need to register anything manually — it is handled inside `spawn()`.

---

## Practical examples

### Watch loop — restart on file change

This is the pattern used by Lightpack's `app:serve` and `jobs:run` commands. The process is re-spawned every time a watched file changes.

```php
$process = new Process;
$envFile = '/path/to/.env';
$lastMtime = filemtime($envFile);

while (true) {
    $child = $process->spawn($command, $this->buildEnv($envFile));
    $restarting = false;

    while ($child->isRunning()) {
        clearstatcache(true, $envFile);

        if (filemtime($envFile) !== $lastMtime) {
            $lastMtime = filemtime($envFile);
            $restarting = true;
            $child->terminate();
            $child->wait();
            echo '.env changed — restarting...' . PHP_EOL;
            sleep(1);
            break;
        }

        usleep(500000);
    }

    if (! $restarting) {
        break; // process exited naturally
    }
}
```

### Running multiple independent processes

Each `spawn()` returns its own `ChildProcess`. They are completely independent — different PIDs, independent lifecycles.

```php
$process = new Process;

$worker1 = $process->spawn(['php', 'console', 'jobs:run', '--queue=email']);
$worker2 = $process->spawn(['php', 'console', 'jobs:run', '--queue=sms']);

// Stop one without affecting the other
$worker1->terminate();
$worker1->wait();

// worker2 is still running
echo $worker2->isRunning() ? 'worker2 running' : 'worker2 stopped';

$worker2->terminate();
$worker2->wait();
```

### Retry with exponential backoff

```php
function runWithRetry(array $command, int $maxAttempts = 3): int
{
    $process = new Process;

    for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
        $process->execute($command);

        if (! $process->failed()) {
            return $process->getExitCode();
        }

        if ($attempt < $maxAttempts) {
            sleep(2 ** $attempt);
        }
    }

    throw new RuntimeException('Command failed after ' . $maxAttempts . ' attempts: ' . $process->getError());
}
```

### Deployment pipeline

```php
$process = new Process;
$process->setDirectory('/var/www/myapp');

$process->execute(['git', 'pull', 'origin', 'main']);

if ($process->failed()) {
    throw new RuntimeException('Pull failed: ' . $process->getError());
}

$process->execute(['composer', 'install', '--no-dev', '--optimize-autoloader']);

if ($process->failed()) {
    throw new RuntimeException('Composer failed: ' . $process->getError());
}
```
