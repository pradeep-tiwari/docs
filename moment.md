# Moment Utility

Lightpack's `Moment` is a simple, expressive, and timezone-aware date/time utility for PHP. It handles datetime operations with proper timezone support and covers the most common date/time operations with a clean, chainable API.

---

## Key Features
- **Timezone support:** Default is UTC, but you can set any valid timezone.
- **Flexible formatting:** Chain `format()` to set output format for all methods.
- **Chainable configuration:** All config methods return `$this` for fluent API.
- **Safe error handling:** Throws `InvalidArgumentException` for invalid timezones or date strings.
- **Comprehensive:** Covers today, tomorrow, yesterday, next/last weekday, month ends, travel, diff, human-friendly differences, and more.
- **DateTime support:** All methods accept `DateTime` objects or strings.

---

## Instantiation & Timezone

```php
use Lightpack\Utils\Moment;

$moment = new Moment(); // Defaults to UTC
$moment = new Moment('Asia/Kolkata'); // Custom timezone

// Change timezone on the fly (chainable)
$moment->setTimezone('Europe/Berlin');

// Get current timezone
$tz = $moment->getTimezone(); // e.g. 'Europe/Berlin'
```

---

## Formatting

- Default output: `Y-m-d H:i:s`
- Use `format()` to change output format (chainable)

```php
$moment->format('d-M, Y H:ia')->now();
$moment->format('Y/m/d')->today();
```

---

## Core Methods

### now
Returns current date/time (in set timezone).

**Parameters:**
- `?format` (string, optional): Output format. Defaults to the format set by `format()` or `Y-m-d H:i:s`.

**Examples:**
```php
$moment->now();
$moment->now('d-M, Y');
```

### today, tomorrow, yesterday
Returns the respective date string in the current timezone.

**Parameters:**
- `?format` (string, optional): Output format.

**Examples:**
```php
$moment->today();
$moment->tomorrow('d-M, Y');
$moment->yesterday();
```

### next, last
Returns the date string for the next or last occurrence of a weekday.

**Parameters:**
- `dayName` (string): Full or short weekday name (e.g., 'monday', 'mon').
- `?format` (string, optional): Output format.

**Examples:**
```php
$moment->next('monday');
$moment->last('fri', 'Y-m-d');
```

### thisMonthEnd, nextMonthEnd, lastMonthEnd
Returns the last day of the current, next, or last month.

**Parameters:**
- `?format` (string, optional): Output format.

**Examples:**
```php
$moment->thisMonthEnd();
$moment->nextMonthEnd('Y-m-d');
$moment->lastMonthEnd();
```

### travel
Returns a date/time string after applying a modifier to the current date/time.

**Parameters:**
- `modifier` (string): Any string accepted by `DateTime::modify()` (e.g., '+5 days', '-2 hours', 'noon', 'last day of next month').
- `?format` (string, optional): Output format.

**Examples:**
```php
$moment->travel('+5 days');
$moment->travel('last day of this month', 'd-M, Y');
```

### diff
Returns a `DateInterval` object for the absolute difference between two datetimes.

**Parameters:**
- `datetime1` (`DateTime|string`)
- `datetime2` (`DateTime|string`)

**Examples:**
```php
$diff = $moment->diff('2021-07-23 14:25:45', '2019-03-14 08:23:12');
$diff = $moment->diff(new DateTime('2021-07-23'), new DateTime('2019-03-14'));
$diff->y; // years
$diff->m; // months
$diff->d; // days
```

### daysBetween
Returns the number of days between two dates (absolute).

**Parameters:**
- `datetime1` (`DateTime|string`)
- `datetime2` (`DateTime|string`)

**Examples:**
```php
$days = $moment->daysBetween('2021-07-23', '2021-05-18');
$days = $moment->daysBetween(new DateTime('2021-07-23'), new DateTime('2021-05-18'));
```

### fromNow
Returns a human-friendly difference string (e.g., 'just now', '5 minutes ago', '2 weeks ago').

**Parameters:**
- `datetime` (`DateTime|string`, optional): Date/time to compare to now. Defaults to `'now'`.

**Examples:**
```php
$moment->fromNow('2021-07-20 11:30:45');
$moment->fromNow(new DateTime('-2 hours'));
// Output: '2 hours ago', etc.
```

### humanDiff
Returns a human-friendly difference string between two datetimes. Supports both past and future.

**Parameters:**
- `from` (`DateTime|string`): Starting datetime.
- `to` (`DateTime|string`, optional): Ending datetime. Defaults to `'now'`.

**Examples:**
```php
$moment->humanDiff('-2 hours');           // '2 hours ago'
$moment->humanDiff('+1 day');             // 'tomorrow'
$moment->humanDiff('2020-01-01', '2023-01-01'); // '3 years ago'
```

### isToday, isPast, isFuture
Boolean checks for date position.

**Parameters:**
- `datetime` (`DateTime|string`, optional): Defaults to `'now'`.

**Examples:**
```php
$moment->isToday();              // true
$moment->isToday('yesterday');   // false
$moment->isPast('2020-01-01');   // true
$moment->isFuture('2030-01-01'); // true
```

### startOfDay, endOfDay
Returns the start or end of the day for a given datetime.

**Parameters:**
- `datetime` (`DateTime|string`, optional): Defaults to `'now'`.
- `?format` (string, optional): Output format.

**Examples:**
```php
$moment->startOfDay('2021-07-23 14:30:00'); // '2021-07-23 00:00:00'
$moment->endOfDay('2021-07-23 14:30:00');   // '2021-07-23 23:59:59'
```

### age
Calculates age in years from a birthdate to now.

**Parameters:**
- `birthdate` (`DateTime|string`)

**Examples:**
```php
$moment->age('1999-05-22'); // e.g. 25
```

### create
Returns a `DateTime` object in the current timezone. Throws on invalid input.

**Parameters:**
- `datetime` (string, optional): Date/time string. Defaults to `'now'`.

**Examples:**
```php
$dt = $moment->create();
$dt = $moment->create('2021-07-23');

// Use all native DateTime methods:
$moment->create()->modify('+2 hours')->format('Y-m-d H:i:s');
```

---

## Practical Examples

### Chainable Formatting & Timezone

```php
$moment->format('Y-m-d')->setTimezone('Asia/Kolkata')->now();
```

### Get the next Friday in custom format

```php
$moment->next('friday', 'd/m/Y');
```

### Get human-friendly difference

```php
$moment->fromNow('2023-06-15 10:00:00'); // e.g. 'a year ago'
$moment->humanDiff('+3 days');           // 'in 3 days'
```

### Calculate days between two dates

```php
$days = $moment->daysBetween('2024-01-01', '2024-01-31'); // 30
```

### Error Handling

```php
try {
    $moment->setTimezone('Invalid/Zone');
} catch (\InvalidArgumentException $e) {
    // Handle invalid timezone
}

try {
    $moment->create('invalid-date');
} catch (\InvalidArgumentException $e) {
    // Handle invalid date string
}
```

---