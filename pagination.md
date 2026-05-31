# Pagination in Lightpack

Lightpack provides a simple and consistent pagination system that works with both the raw query builder and the Lucid ORM. The base `Pagination` class handles the core logic, while `Lucid\Pagination` extends it with ORM-specific features.

## Creating Paginated Results

### Query Builder

```php
$products = db()->table('products')->paginate(10);
```

By default, the current page is read from the `page` query parameter. You can override it:

```php
$products = db()->table('products')->paginate(10, 3); // force page 3
```

### Lucid ORM

```php
$products = Product::query()->paginate(10);
```

## Iterating Results

Both pagination classes implement `IteratorAggregate`, so you can loop over them directly:

```php
foreach ($products as $product) {
    echo $product->name;
}
```

Or access items by index:

```php
$first = $products[0];
```

Or get the underlying items explicitly:

```php
$items = $products->items(); // array or Collection
```

## Pagination Metadata

### total()
Returns the total number of records across all pages.

```php
$products->total(); // 100
```

### count()
Returns the number of items on the current page.

```php
$products->count(); // 10
```

### currentPage()
Returns the current page number.

```php
$products->currentPage(); // 3
```

### lastPage()
Returns the total number of pages.

```php
$products->lastPage(); // 10
```

### limit()
Returns the number of items per page.

```php
$products->limit(); // 10
```

### offset()
Returns the SQL offset for the current page.

```php
$products->offset(); // 20 (for page 3 with limit 10)
```

## Checking Page State

### isEmpty()
Returns `true` if there are no items on the current page.

```php
if ($products->isEmpty()) {
    echo 'No products found.';
}
```

### isNotEmpty()
Returns `true` if there is at least one item on the current page.

```php
if ($products->isNotEmpty()) {
    foreach ($products as $product) {
        echo $product->name;
    }
}
```

### hasNextPage()

```php
if ($products->hasNextPage()) {
    // ...
}
```

### hasPreviousPage()

```php
if ($products->hasPreviousPage()) {
    // ...
}
```

### hasLinks()
Returns `true` if there is more than one page in total.

```php
if ($products->hasLinks()) {
    echo $products->links();
}
```

## Links & URLs

### links()
Returns a basic HTML string with prev/next links and page info.

```php
echo $products->links();
// Page 3 of 10 <a href="/products?page=2">Prev</a>  <a href="/products?page=4">Next</a>
```

### nextPageUrl()
Returns the URL for the next page, or `null` if on the last page.

```php
$products->nextPageUrl(); // /products?page=4
```

### prevPageUrl()
Returns the URL for the previous page, or `null` if on the first page.

```php
$products->prevPageUrl(); // /products?page=2
```

### url($page)
Returns the URL for a specific page number.

```php
$products->url(5); // /products?page=5
```

### withPath($path)
Override the base URL path used in generated links.

```php
$products->withPath('/api/products');
$products->url(2); // /api/products?page=2
```

### only($params)
Preserve only specific query parameters when building pagination URLs.

```php
// URL: /products?category=electronics&sort=price&page=2
$products->only(['category']);
$products->url(3); // /products?category=electronics&page=3
```

### getPages()
Returns an array of page numbers to display in a pagination bar (useful for building custom link templates).

```php
$products->getPages(); // [1, 2, 3, 4, 5] (when on page 3 with 10 total pages)
```

## Lucid ORM Specific Features

When using the [Lucid ORM](/docs/v0.x/orm-introduction), the returned `Pagination` instance includes additional ORM-specific methods.

### load(...$relations)
Lazy-load relationships for the current page's models.

```php
$products = Product::query()->paginate(10);
$products->load('category', 'tags');
```

### loadCount(...$relations)
Lazy-load relationship counts for the current page's models.

```php
$products->loadCount('reviews');
```

### toArray()
Convert the paginated result to an array. Model collections are automatically converted.

```php
$array = $products->toArray();
```

### toJson()
Convert the paginated result to JSON.

```php
$json = $products->toJson();
```

### transform($options)
Transform the paginated collection for API output using model transformers.

```php
$result = $products->transform([
    'includes' => ['category', 'tags'],
    'fields' => [
        'self' => ['name', 'price'],
        'category' => ['name'],
    ],
]);
```

Returns:

```php
[
    'data' => [ /* transformed items */ ],
    'meta' => [
        'current_page' => 1,
        'per_page' => 10,
        'total' => 100,
        'total_pages' => 10,
    ],
    'links' => [
        'first' => '/products?page=1',
        'last' => '/products?page=10',
        'prev' => null,
        'next' => '/products?page=2',
    ],
]
```

## Rendering in Views

For simple cases, use the built-in `links()` method:

```php
<?= $products->links() ?>
```

For custom HTML, build your own using the available methods:

```php
<?php if ($products->hasLinks()): ?>
<nav>
    <?php if ($products->hasPreviousPage()): ?>
        <a href="<?= $products->prevPageUrl() ?>">Previous</a>
    <?php endif; ?>

    <?php foreach ($products->getPages() as $page): ?>
        <?php if ($page == $products->currentPage()): ?>
            <strong><?= $page ?></strong>
        <?php else: ?>
            <a href="<?= $products->url($page) ?>"><?= $page ?></a>
        <?php endif; ?>
    <?php endforeach; ?>

    <?php if ($products->hasNextPage()): ?>
        <a href="<?= $products->nextPageUrl() ?>">Next</a>
    <?php endif; ?>
</nav>
<?php endif; ?>
```
