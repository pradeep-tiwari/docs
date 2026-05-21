# Array Utility Documentation

Lightpack's Array utility provides a powerful set of methods for working with arrays, featuring dot notation access, wildcard matching, array transformations, hierarchical tree building, data grouping and sorting.

## Basic Usage

```php
use Lightpack\Utils\Arr;

$arr = new Arr();
```

Or simply call `arr()` utility function.

It exposes following methods to efficiently work with arrays:

- `get()` — read a value using dot notation (supports wildcards)
- `set()` — write a value using dot notation
- `has()` — check if a dot-notation key exists
- `delete()` — remove a key using dot notation
- `flatten()` — convert a nested array to a flat dot-notation array
- `tree()` — build a hierarchical tree from a flat parent-child array
- `transpose()` — convert column-based arrays to row-based arrays
- `groupBy()` — group an array of items by a key (supports dot notation)
- `sort()` — sort an array of items by a key (supports dot notation)

### Basic Operations

```php
$data = [
    'user' => [
        'profile' => [
            'name' => 'John Doe',
            'email' => 'john@example.com'
        ]
    ]
];

// Check if key exists
$exists = arr()->has('user.profile.name', $data);  // true

// Get value
$name = arr()->get('user.profile.name', $data);    // 'John Doe'
$age = arr()->get('user.age', $data, 25);          // 25 (default value)

// Set value
arr()->set('user.profile.age', 30, $data);

// Delete value
arr()->delete('user.profile.email', $data);
```

## Dot Notation

### Basic Dot Notation

```php
$data = [
    'users' => [
        'active' => [
            'john' => ['age' => 25],
            'jane' => ['age' => 30]
        ]
    ]
];

// Access nested data
$johnsAge = arr()->get('users.active.john.age', $data);    // 25

// Set nested data
arr()->set('users.active.bob.age', 35, $data);

// Check nested path
if (arr()->has('users.active.jane', $data)) {
    // Path exists
}

// Delete nested data
arr()->delete('users.active.john', $data);
```

### Wildcard Matching

```php
$data = [
    'users' => [
        'active' => [
            'john' => ['age' => 25],
            'jane' => ['age' => 30]
        ],
        'inactive' => [
            'bob' => ['age' => 35]
        ]
    ]
];

// Get all ages using wildcard
$ages = arr()->get('users.*.*.age', $data);
// [25, 30, 35]

// Get all active user ages
$activeAges = arr()->get('users.active.*.age', $data);
// [25, 30]
```

## Array Transformations

### Building Hierarchical Trees

```php
// Flat array of categories
$categories = [
    ['id' => 1, 'parent_id' => 0, 'name' => 'Electronics'],
    ['id' => 2, 'parent_id' => 1, 'name' => 'Phones'],
    ['id' => 3, 'parent_id' => 1, 'name' => 'Laptops'],
    ['id' => 4, 'parent_id' => 2, 'name' => 'iPhone'],
    ['id' => 5, 'parent_id' => 2, 'name' => 'Android'],
];

// Convert to hierarchical tree
$tree = arr()->tree($categories);

/* Result:
[
    [
        'id' => 1,
        'parent_id' => 0,
        'name' => 'Electronics',
        'children' => [
            [
                'id' => 2,
                'parent_id' => 1,
                'name' => 'Phones',
                'children' => [
                    ['id' => 4, 'parent_id' => 2, 'name' => 'iPhone'],
                    ['id' => 5, 'parent_id' => 2, 'name' => 'Android']
                ]
            ],
            ['id' => 3, 'parent_id' => 1, 'name' => 'Laptops']
        ]
    ]
]
*/
```

```php
// Custom key names
$tree = arr()->tree($items, 0, 'category_id', 'parent_category_id');
```

### Flattening Nested Arrays

Converts a nested array into a flat associative array using dot-notation keys. This is the complement to `get()` / `set()` — every key in the flattened result can be read back using `get()`.

```php
$config = [
    'db'   => ['host' => 'localhost', 'port' => 3306],
    'mail' => ['host' => 'smtp.example.com', 'port' => 587],
];

$flat = arr()->flatten($config);
// [
//     'db.host'   => 'localhost',
//     'db.port'   => 3306,
//     'mail.host' => 'smtp.example.com',
//     'mail.port' => 587,
// ]
```

Numeric-indexed arrays are flattened using their index as the key segment:

```php
$data = ['tags' => ['php', 'mysql', 'redis']];

arr()->flatten($data);
// ['tags.0' => 'php', 'tags.1' => 'mysql', 'tags.2' => 'redis']
```

Falsy scalar values (`null`, `false`, `0`, `''`) are preserved as leaf values. Empty arrays are also treated as leaf values and not recursed into.

### Array Transposition

```php
// Column-based data
$data = [
    'name' => ['John', 'Jane', 'Bob'],
    'age' => [25, 30, 35],
    'city' => ['New York', 'London', 'Paris']
];

// Convert to row-based data
$rows = arr()->transpose($data);

/* Result:
[
    ['name' => 'John', 'age' => 25, 'city' => 'New York'],
    ['name' => 'Jane', 'age' => 30, 'city' => 'London'],
    ['name' => 'Bob', 'age' => 35, 'city' => 'Paris']
]
*/

// Transpose specific keys only
$rows = arr()->transpose($data, ['name', 'age']);
```

### Grouping Arrays

Groups an array of associative arrays (or objects) by the value of a given key. Supports dot notation for grouping by nested keys.

```php
$orders = [
    ['id' => 1, 'status' => 'pending',  'amount' => 100],
    ['id' => 2, 'status' => 'shipped',  'amount' => 200],
    ['id' => 3, 'status' => 'pending',  'amount' => 150],
    ['id' => 4, 'status' => 'shipped',  'amount' => 80],
];

$grouped = arr()->groupBy('status', $orders);
// [
//     'pending' => [['id' => 1, ...], ['id' => 3, ...]],
//     'shipped' => [['id' => 2, ...], ['id' => 4, ...]],
// ]
```

Group by a nested key using dot notation:

```php
$users = [
    ['name' => 'Alice', 'address' => ['country' => 'UK']],
    ['name' => 'Bob',   'address' => ['country' => 'US']],
    ['name' => 'Carol', 'address' => ['country' => 'UK']],
];

$grouped = arr()->groupBy('address.country', $users);
// ['UK' => [...], 'US' => [...]]
```

Items whose key is missing or `null` are grouped under `null`.

### Sorting Arrays

Sorts an array of associative arrays (or objects) by a key. Supports dot notation for sorting by nested keys. Returns a new array without mutating the original.

```php
$products = [
    ['name' => 'Monitor', 'price' => 300],
    ['name' => 'Keyboard', 'price' => 80],
    ['name' => 'Mouse',   'price' => 40],
];

// Ascending (default)
$sorted = arr()->sort('price', $products);
// Mouse (40), Keyboard (80), Monitor (300)

// Descending
$sorted = arr()->sort('price', $products, 'desc');
// Monitor (300), Keyboard (80), Mouse (40)
```

Sort by a nested key using dot notation:

```php
$users = [
    ['name' => 'Charlie', 'address' => ['city' => 'Paris']],
    ['name' => 'Alice',   'address' => ['city' => 'London']],
    ['name' => 'Bob',     'address' => ['city' => 'Berlin']],
];

$sorted = arr()->sort('address.city', $users);
// Bob (Berlin), Alice (London), Charlie (Paris)

$sorted = arr()->sort('address.city', $users, 'desc');
// Charlie (Paris), Alice (London), Bob (Berlin)
```

Items where the sort key is missing are sorted to the front (treated as `null`).

---