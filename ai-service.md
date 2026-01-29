# Lightpack AI System

A unified, explicit, and extensible interface for text generation, summarization, structured AI tasks, and semantic search in your Lightpack apps. Supports multiple providers, robust schema validation, and a fluent builder for advanced use cases.

- **Purpose:** Seamlessly add AI/ML-powered text generation, embeddings, and semantic search to any Lightpack project.
- **Where to Use:** Blog/content generation, summarization, Q&A, code generation, structured data extraction, semantic search, RAG applications, content recommendations, and more.

**Lightpack AI** exposes four core methods:

```php
ai()->ask();      // Simple question-answer
ai()->task();     // Structured data extraction with tools
ai()->embed();    // Text to vector embeddings
ai()->similar();  // Semantic similarity search
```

## Supported Providers

| Driver      | Class                        | Text Generation | Embeddings |
|-------------|------------------------------|-----------------|------------|
| `openai`    | `Providers\OpenAI`           | ✅ GPT-3.5, GPT-4 | ✅ text-embedding-3-small |
| `gemini`    | `Providers\Gemini`           | ✅ Gemini models  | ✅ text-embedding-004 (FREE) |
| `mistral`   | `Providers\Mistral`          | ✅ Mistral models | ✅ mistral-embed |
| `anthropic` | `Providers\Anthropic`        | ✅ Claude models  | ❌ Not supported |
| `groq`      | `Providers\Groq`             | ✅ Llama, Mixtral | ❌ Not supported |

**Add your own:** Implement `ProviderInterface` and register in config.

## Configuration

Please run following command to create `config/ai.php` configuration file.

```cli
php console create:config --support=ai
```


## Usage

| Method | Use When | Returns |
|--------|----------|---------|
| `ask()` | Simple questions, plain text answers | String |
| `task()` | Structured data extraction, tool calling | Array with `success`, `data`, `errors`, `raw` |
| `embed()` | Convert text to vector embeddings | Array of floats (single) or array of arrays (batch) |
| `similar()` | Find semantically similar items | Array of matches with similarity scores |

**Quick Decision Guide:**
- Need a quick answer? → `ask()`
- Need JSON with specific fields? → `task()` with `expect()`
- Need to call external functions/APIs? → `task()` with `tool()`
- Need semantic search? → `embed()` + `similar()`

---

### ask()

**Use for:** Quick questions that need plain text answers.

For simple, one-off questions, use the `ask()` method:

```php
$answer = ai()->ask('What is the capital of France?');
echo $answer; // "Paris"
```

- Returns the raw answer as a plain string.

---

### task()

**Use for:** Extracting structured data with type validation and required field checks.

```php
$result = ai()->task()
    ->prompt('Who created Monalisa and at what age?')
    ->expect(['name' => 'string', 'age' => 'int'])
    ->required('name', 'age')
    ->run();

if ($result['success']) {
    echo $result['data']['name']; // "Leonardo da Vinci"
    echo $result['data']['age'];  // 51
} else {
    print_r($result['errors']);   // ["Missing required field: name"]
}
```

**Key methods:**
- `prompt(string)` - Set the question
- `expect(array)` - Define JSON schema with types
- `required(...fields)` - Mark fields as required
- `expectArray(key)` - Expect array of objects
- `message(role, content)` - Add message to conversation history
- `system(string)` - Set system prompt
- `model(string)` - Override model
- `temperature(float)` - Set randomness (0.0-2.0)
- `maxTokens(int)` - Limit response length
- `cache(bool)` - Enable caching
- `cacheTtl(int)` - Cache duration in seconds
- `tool(name, fn, description, params)` - Register a tool
- `metadata(array)` - Pass context data to tools
- `run()` - Execute and return `['success', 'data', 'errors', 'raw']`

---

#### Example Recipes

**1. Validate Array of Objects**

```php
$result = ai()->task()
    ->prompt('List 2 movies with title, rating, and summary.')
    ->expect(['title' => 'string', 'rating' => 'int', 'summary' => 'string'])
    ->required('title', 'rating', 'summary')
    ->expectArray('movie')
    ->run();

if (!$result['success']) {
    // $result['errors'] contains missing fields per item
}
```

**2. Use Conversation History**

```php
$result = ai()->task()
    ->message('system', 'You are a helpful assistant.')
    ->message('user', 'How do I reset my password?')
    ->run();
```

**3. Control Temperature and Tokens**

```php
$result = ai()->task()
    ->prompt('Generate 3 product names')
    ->temperature(0.9)  // More creative (0.0 = deterministic, 2.0 = very random)
    ->maxTokens(100)    // Limit response length
    ->run();
```

---

### tool()

**Use for:** Giving AI access to external functions, APIs, or data sources.

Tools allow AI to call PHP functions to fetch data, perform calculations, or interact with your application. The AI decides which tool to call based on the user's question.

**Basic Example:**

```php
$result = ai()->task()
    ->tool('search_products', function($params) {
        return db()->table('products')
            ->where('name', 'LIKE', "%{$params['query']}%")
            ->limit(5)
            ->all();
    }, 'Search products by name', ['query' => 'string'])
    ->prompt('Find laptops')
    ->run();

if ($result['success']) {
    echo $result['raw'];  // AI's natural language answer
    print_r($result['tools_used']);    // ['search_products']
    print_r($result['tool_results']);  // ['search_products' => [...]]
}
```

**Tool Definition:**

```php
->tool(
    string $name,           // Tool identifier
    mixed $fn,              // Closure, invokable object, or class string
    ?string $description,   // What the tool does (helps AI decide)
    array $params           // Parameter schema: ['param' => 'type']
)
```

**Supported parameter types:**
- `'string'` - Text
- `'int'` - Integer
- `'number'` - Float/decimal
- `'bool'` - Boolean
- `'array'` - Array

**Parameter schema formats:**

```php
// Simple: just type
['query' => 'string', 'limit' => 'int']

// With description (helps AI understand)
['query' => ['string', 'Search term'], 'limit' => ['int', 'Max results']]

// List format (defaults to string)
['query', 'category']  // Both become 'string' type
```

---

#### Tool Examples

**1. Multiple Tools**

```php
$result = ai()->task()
    ->tool('get_weather', function($params) {
        return http()->get("api.weather.com/{$params['city']}");
    }, 'Get current weather', ['city' => 'string'])
    
    ->tool('get_forecast', function($params) {
        return http()->get("api.weather.com/forecast/{$params['city']}");
    }, 'Get 7-day forecast', ['city' => 'string'])
    
    ->prompt('What is the weather in Paris?')
    ->run();

// AI should choose 'get_weather' (not 'get_forecast')
```

**2. Tool with Context (Metadata)**

Sometimes your tools need access to application context that shouldn't come from the AI (like the current user ID, tenant ID, or session data). Use `metadata()` to pass this context safely to your tools.

The AI **cannot see or modify** metadata - it's passed directly from your application to the tool function. This prevents the AI from impersonating users or accessing unauthorized data and keeps app context separate from AI reasoning.

```php
$result = ai()->task()
    ->metadata(['user_id' => auth()->user()->id])
    
    ->tool('get_orders', function($params, $context) {
        // Get user ID from metadata (not from AI!)
        $userId = $context->get('user_id');
        
        return db()->table('orders')
            ->where('user_id', '=', $userId)
            ->limit($params['limit'])
            ->all();
    }, 'Get user orders', ['limit' => 'int'])
    
    ->prompt('Show my last 5 orders')
    ->run();
```

**Context methods:**
- `$context->get('key', $default)` - Get metadata value
- `$context->has('key')` - Check if key exists

**3. Invokable Tool Classes**

For complex tools, use invokable classes instead of closures. This keeps your code organized and allows the tool to define its own description and parameters.

**How it works:**
- Implement `__invoke()` to handle the tool logic
- Add static `description()` method to describe what the tool does
- Add static `params()` method to define the parameter schema
- Pass the class name (or instance) to `->tool()`

The framework automatically extracts `description()` and `params()` from the class, so you don't need to repeat them when registering the tool.

```php
class SearchProducts
{
    public function __invoke(array $params, $context): array
    {
        return db()->table('products')
            ->where('category', '=', $params['category'])
            ->where('price', '<=', $params['max_price'])
            ->all();
    }
    
    public static function description(): string
    {
        return 'Search products by category and price';
    }
    
    public static function params(): array
    {
        return [
            'category' => ['string', 'Product category'],
            'max_price' => ['number', 'Maximum price']
        ];
    }
}

// Usage - description and params are auto-extracted
$result = ai()->task()
    ->tool('search', SearchProducts::class)
    ->prompt('Find laptops under $1000')
    ->run();
```

**4. Tool Result Format**

```php
$result = ai()->task()
    ->tool('calculate', fn($p) => $p['a'] + $p['b'])
    ->prompt('What is 5 + 3?')
    ->run();

[
    'success' => true,
    'data' => null,                    // Only set when using expect()
    'raw' => 'The answer is 8',        // AI's natural language response
    'errors' => [],
    'tools_used' => ['calculate'],     // Which tools were called
    'tool_results' => [
        'calculate' => 8               // Raw tool output
    ]
]
```

**Key Points:**
- AI calls **ONE tool per request** (single-shot, not multi-step)
- AI decides which tool to call (or none) based on the question
- Tools receive validated parameters (type-checked and coerced)
- Tool results are passed back to AI to generate natural language answer
- Use `metadata()` to pass app context (user ID, tenant ID, etc.) to tools
- Tools can be closures, invokable objects, or class strings

---

### embed()

**Use for:** Converting text into vector embeddings for semantic search, similarity matching, or RAG applications.

```php
// Single text
$embedding = ai()->embed('wireless headphones');
// Returns: [0.123, -0.456, 0.789, ...] (768-1536 floats)

// Batch processing (efficient - single API call)
$texts = [
    'Product A description',
    'Product B description',
    'Product C description'
];
$embeddings = ai()->embed($texts);

// Use batch results - CRITICAL: maintains same order as input!
foreach ($texts as $i => $text) {
    echo "Text: {$text}\n";
    echo "Embedding: " . json_encode($embeddings[$i]) . "\n";
}
```

**Method signature:**
```php
ai()->embed(
    string|array $input,  // Required: Single text or array of texts
    array $options = []   // Optional: Provider-specific options
): array
```

**Options parameter:**
```php
$options = [
    'model' => 'text-embedding-3-small',  // Override default model
    // Provider-specific options vary
];
```

**Returns:**
- **Single input:** `array` of floats (e.g., 768 or 1536 dimensions)
- **Batch input:** `array` of arrays (one embedding per input text, **same order as input**)

**Key points:**
- Returns array of floats (vector representation of text)
- Batch processing uses single API call (cost-efficient)
- Batch results maintain same order as input array
- Store embeddings in database for reuse
- Dimensions vary by provider (768 for Gemini, 1536 for OpenAI)
- Not all providers support embeddings (see provider table above)
- Options parameter allows model override and provider-specific settings

---

### similar()

**Use for:** Finding semantically similar items.

```php
$queryEmbedding = ai()->embed('laptop for programming');

$results = ai()->similar($queryEmbedding, $products);

foreach ($results as $result) {
    echo $result['id'];         // Product ID
    echo $result['similarity']; // 0.0-1.0 score
    echo $result['item'];       // Original item data
}
```

**Method signature:**
```php
ai()->similar(
    array $queryEmbedding,  // Required: Query vector
    mixed $target,          // Required: Array of items (in-memory) or collection name (vector DB)
    int $limit = 5,         // Optional: Max results (default: 5)
    float $threshold = 0.0  // Optional: Min similarity score (default: 0.0)
): array
```

**Returns:**
```php
[
    [
        'id' => mixed,           // Item identifier
        'similarity' => float,   // Score 0.0-1.0
        'item' => array          // Original item data
    ],
    // ... more results
]
```

**Key points:**
- Returns exact matches (100% recall, not approximate)
- Works in-memory by default (fast for < 5K items)
- Scores range from 0.0 (different) to 1.0 (identical)
- Results sorted by similarity (highest first)
- **Threshold defaults to 0.0** (returns all results) - set to 0.6-0.8 for quality filtering
- Extensible via `setVectorSearch()` for custom implementations

**Threshold recommendations:**
- `0.0` (default) - Return all results, let user decide
- `0.6-0.7` - Moderate similarity (related items)
- `0.8-0.9` - High similarity (very similar items)
- `0.95+` - Near-identical items

---

#### Example Recipes 1: Storing Embeddings

**1. Store Product Embeddings**

```php
// In your model
class Product extends Model
{
    protected $casts = [
        'embedding' => 'array'
    ];
}

// store the embeddings for the product
$product->embedding = ai()->embed($product->description);
$product->save();
```

**2. Semantic Product Search**

```php
// fetch products with their embeddings
$items = Product::query()
    ->select('id', 'embedding')
    ->whereNotNull('embedding')
    ->all()
    ->map(fn($p) => [
        'id' => $p->id,
        'embedding' => $p->embedding
    ]);

// semantic search for similar products
$query = 'best laptop for programming';
$queryEmbedding = ai()->embed($query);
$results = ai()->similar($queryEmbedding, $items, limit: 10);

// process results
foreach ($results as $result) {
    // Product ID: $result['id'];
}
```

---

#### Example Recipes 2: Filtering and RAG

**1. Filter by Similarity Threshold**

```php
// Only return matches with 70%+ similarity
$results = ai()->similar($queryEmbedding, $items, limit: 10, threshold: 0.7);
```

**2. RAG (Retrieval Augmented Generation)**

```php
// Find relevant docs
$userQuestion = 'How do I reset my password?';
$queryEmbedding = ai()->embed($userQuestion);
$relevant = ai()->similar($queryEmbedding, $docs, limit: 3);

// Build context
$context = implode("\n\n", array_column($relevant, 'item'));

// Ask AI with context
$answer = ai()->task()
    ->system("Answer based on this documentation:\n\n{$context}")
    ->prompt($userQuestion)
    ->run();
```

**3. Content Recommendations**

```php
$articles = Article::query()
    ->select('id', 'embedding')
    ->whereNotNull('embedding')
    ->all()
    ->map(fn($a) => [
        'id' => $a->id,
        'embedding' => $a->embedding
    ]);

// "Users who read this also read..."
$similar = ai()->similar($article->embedding, $articles, limit: 5);
```

---

### Embedding Provider Notes

**Important:** Embeddings are NOT cross-compatible. Always use the same provider for embedding and searching.

---

## Vector Search: Architecture & Extensibility

When you call `ai()->similar()`, Lightpack uses a `VectorSearchInterface` implementation to find matches. By default, this is `InMemoryVectorSearch`, but you can swap it for Qdrant, Meilisearch, or any custom implementation. Lightpack's vector search is designed with a simple principle: **start simple, scale when needed**. The default in-memory implementation is good for most of real-world applications, but you can seamlessly upgrade to vector databases when you outgrow it.

```php
// Default behavior - uses InMemoryVectorSearch automatically
$results = ai()->similar($queryEmbedding, $items);

// Custom implementation - swap to vector database
ai()->setVectorSearch(new QdrantVectorSearch());
$results = ai()->similar($queryEmbedding, 'products_collection');
```

---

### Default: InMemoryVectorSearch

**What it is:** A brute-force cosine similarity search that compares your query against every item in memory.

| Aspect | Details |
|--------|---------|
| **Algorithm** | Brute-force cosine similarity (O(n)) |
| **Accuracy** | 100% recall (exact, not approximate) |
| **Performance** | ~20-250ms for < 5K items |
| **Memory** | ~3 KB per item (embeddings only) |
| **Scale** | < 5K documents, < 50 concurrent searches/sec |

**Note:** Above is not a hard benchmark but a good approximation.

**Example:**
```php
// Load only embeddings (not full models!)
$items = Product::query()
    ->select('id', 'embedding')
    ->whereNotNull('embedding')
    ->all()
    ->map(fn($p) => [
        'id' => $p->id,
        'embedding' => $p->embedding
    ]);

// Search for similar items
$results = ai()->similar($queryEmbedding, $items, limit: 10);
```

---

### Extending with Vector Databases

**Extend with vector databases for larger scale:**

```php
use Lightpack\AI\VectorSearch\VectorSearchInterface;

class QdrantVectorSearch implements VectorSearchInterface
{
    public function __construct(private $client) {}

    public function search(array $queryEmbedding, mixed $target, int $limit = 5, array $options = []): array
    {
        // $target is collection name for vector DBs
        $response = $this->client->search($target, [
            'vector' => $queryEmbedding,
            'limit' => $limit,
            'score_threshold' => $options['threshold'] ?? 0.0
        ]);
        
        return $this->formatResults($response);
    }
    
    private function formatResults($response): array
    {
        // Must return same format as InMemoryVectorSearch
        return array_map(fn($hit) => [
            'id' => $hit['id'],
            'similarity' => $hit['score'],
            'item' => $hit['payload']
        ], $response['result']);
    }
}

// Use custom implementation
$vectorSearch = app(QdrantVectorSearch::class);
ai()->setVectorSearch($vectorSearch);

// Now similar() uses Qdrant
$results = ai()->similar($queryEmbedding, 'products_collection', limit: 10);
```

**Interface contract:**
```php
interface VectorSearchInterface
{
    /**
     * @param array $queryEmbedding The query vector
     * @param mixed $target For in-memory: array of items. For vector DBs: collection name
     * @param int $limit Max results to return
     * @param array $options Implementation-specific options (threshold, filters, etc.)
     * @return array Array of results with 'id', 'similarity', and 'item' keys
     */
    public function search(array $queryEmbedding, mixed $target, int $limit = 5, array $options = []): array;
}
```

**Return format (must match):**
```php
[
    [
        'id' => mixed,           // Required: Item identifier
        'similarity' => float,   // Required: Score 0.0-1.0
        'item' => array          // Required: Item data
    ],
    // ...
]
```

---

## Caching

Lightpack AI supports **provider-level caching** (delegated to AI provider) for response optimization.

**Enable caching:**

```php
ai()->task()
    ->prompt('Extract email from: john@example.com')
    ->cache(true)     // Enable provider-level caching
    ->cacheTtl(3600)  // Cache duration in seconds (default: 3600)
    ->run();
```

**How it works:**
- Cache parameters (`cache`, `cache_ttl`) are passed to the AI provider
- Provider handles caching based on request parameters (model, messages, temperature, etc.)
- Cache key is generated from: `model`, `messages`, `temperature`, `max_tokens`, `system`
- Cached responses are returned instantly without API calls

**When to cache:**
- ✅ Deterministic tasks (`temperature: 0`)
- ✅ Expensive structured data extraction
- ✅ Repeated identical queries
- ✅ Classification/categorization tasks

**When NOT to cache:**
- ❌ Creative writing (`temperature > 0.7`)
- ❌ Real-time data queries
- ❌ Personalized responses
- ❌ Tool-based tasks (tool results may change)

**Note:** Not all providers support caching. Check provider documentation for details.

## Error Handling

**Exception-based errors (thrown):**
- API connection failures
- Invalid API keys
- Network timeouts
- Provider-specific errors

**Validation errors (in result):**
- Missing required fields
- Schema type mismatches
- Tool parameter validation failures
- Tool execution errors

**Always check `success` flag:**

```php
$result = ai()->task()
    ->expect(['name' => 'string'])
    ->required('name')
    ->prompt('Extract name from: John Doe')
    ->run();

if ($result['success']) {
    echo $result['data']['name'];
} else {
    // Handle validation errors
    foreach ($result['errors'] as $error) {
        logger()->error('AI validation error: ' . $error);
    }
}
```

**Tool execution errors:**

```php
$result = ai()->task()
    ->tool('search', function($params) {
        throw new \Exception('Database connection failed');
    })
    ->prompt('Search products')
    ->run();

// $result['success'] = false
// $result['errors'] = ['Tool execution failed: Database connection failed']
```

## Security & Best Practices

**API Keys:**
- ✅ Store in environment variables or secure config
- ❌ Never commit to version control
- ✅ Use different keys for dev/staging/production

**Cost Control:**
- Set `maxTokens()` to limit response length
- Use `temperature(0.0)` for deterministic tasks (cheaper)
- Enable caching for repeated queries
- Monitor token usage via provider dashboards

**Production Readiness:**
- Always check `$result['success']` before using data
- Log AI errors and validation failures
- Set reasonable timeouts (default: 10s)
- Use `required()` fields for critical data extraction
- Validate tool results before using in application

**Tool Security:**
- Validate and sanitize tool parameters
- Use `metadata()` for user context (don't trust AI-generated user IDs)
- Limit tool access to necessary data only
- Never expose sensitive operations as tools
- Log all tool executions for audit trails

**Data Privacy:**
- Be aware: AI provider sees all prompts and responses
- Don't send PII unless necessary and compliant
- Consider data retention policies of AI providers
- Use anonymization where possible

---