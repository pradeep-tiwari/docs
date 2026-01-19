# AI Agents

Turn your database into an intelligent AI assistant in just a few lines of code. Agents combine AI reasoning with custom tools to answer questions, perform tasks, and maintain conversations.

## Quick Start

```php
// Create an agent
$agent = agent();

// Add tools (just functions!)
$agent->tool('search_products', function($query) {
    $embedding = ai()->embed($query);
    $products = db()->table('product_embeddings')->all();
    
    $items = array_map(fn($e) => [
        'id' => $e->product_id,
        'embedding' => json_decode($e->embedding, true),
        'content' => $e->content
    ], $products);
    
    return ai()->similar($embedding, $items, limit: 5);
}, 'Search product catalog semantically');

// Ask anything - agent decides which tools to use
$result = $agent->ask("Show me laptops good for programming");

echo $result->answer();  // Get the answer
print_r($result->toolsUsed());  // See which tools were used
print_r($result->toolResults());  // Access raw tool results
```

## Core Concepts

### What is an Agent?

An agent is an AI that can:
1. **Understand** your question
2. **Decide** which tools it needs
3. **Execute** those tools
4. **Synthesize** an answer

Think of it as giving your AI hands to interact with your database.

### Tools

Tools are simple functions that agents can call. They can:
- Search your database
- Perform calculations
- Fetch external data
- Execute business logic
- Anything you can code!

```php
$agent->tool('calculate_budget', function($query) {
    $userId = auth()->user()->id;
    
    return db()->query("
        SELECT category, SUM(amount) as total 
        FROM transactions 
        WHERE user_id = ? 
        GROUP BY category
    ", [$userId]);
}, 'Calculate spending by category');
```

## Building Agents

### Basic Agent

```php
$agent = agent();

$agent->tool('search', fn($q) => /* your logic */);
$agent->tool('calculate', fn($q) => /* your logic */);

$answer = $agent->ask("Your question here");
```

### Multi-Domain Agent

```php
$agent = agent();

// Product tools
$agent->tool('search_products', $productSearchFn);
$agent->tool('check_inventory', $inventoryFn);
$agent->tool('compare_products', $compareFn);

// Customer tools
$agent->tool('search_orders', $orderSearchFn);
$agent->tool('check_shipping', $shippingFn);

// Support tools
$agent->tool('search_tickets', $ticketSearchFn);
$agent->tool('search_docs', $docSearchFn);

// Agent automatically picks the right tools!
$answer = $agent->ask("Where is my order for the Dell laptop?");
```

### Tool Parameters

Tools can accept structured parameters instead of raw query strings:

```php
$agent->tool('search_products', function($params) {
    return db()->table('products')
        ->where('category', '=', $params['category'])
        ->where('price', '<=', $params['max_price'])
        ->all();
}, 'Search products by category and price', [
    'category' => ['string', 'Product category (e.g., laptops, phones)'],
    'max_price' => ['number', 'Maximum price in dollars']
]);

// AI extracts parameters from natural language
$result = $agent->ask("Find laptops under $1000");
// AI calls: search_products(['category' => 'laptops', 'max_price' => 1000])
```

**Benefits:**
- More precise tool execution
- Type safety
- Better validation
- Clearer intent

### Tool Descriptions

Provide clear descriptions to help the agent choose correctly:

```php
$agent->tool('search_transactions', function($query) {
    // Implementation
}, 'Search user financial transactions by date, category, or amount');

$agent->tool('calculate_budget', function($query) {
    // Implementation
}, 'Calculate spending totals grouped by category');
```

## Agent Configuration

### Temperature Control

Control response creativity (0.0 = deterministic, 1.0 = creative):

```php
$agent = agent()
    ->temperature(0.2)  // More focused, deterministic
    ->tool('search', $searchFn);

// Or for creative responses
$agent = agent()
    ->temperature(0.8)  // More creative, varied
    ->tool('generate_ideas', $ideasFn);
```

### System Prompt

Set agent personality and behavior:

```php
$agent = agent()
    ->system('You are a helpful product expert. Be concise and focus on technical specifications.')
    ->tool('search_products', $searchFn);

$result = $agent->ask("Tell me about this laptop");
// Agent responds in concise, technical style
```

### Method Chaining

All configuration methods support chaining:

```php
$result = agent()
    ->system('You are a financial advisor')
    ->temperature(0.3)
    ->tool('search_transactions', $searchFn)
    ->tool('calculate_budget', $budgetFn)
    ->ask('How much did I spend on groceries?');
```

## Working with Results

### AgentResult Object

The `ask()` method returns an `AgentResult` object with rich metadata:

```php
$result = $agent->ask("Find laptops under $1000");

// Get the answer
echo $result->answer();

// See which tools were used
print_r($result->toolsUsed());  // ['search_products', 'check_stock']

// Check if specific tool was used
if ($result->usedTool('search_products')) {
    echo "Searched products";
}

// Access individual tool results
$products = $result->toolResult('search_products');
print_r($products);

// Get all tool results
$allResults = $result->toolResults();

// See AI's reasoning
echo $result->reasoning();  // "Need to search products and check availability"

// Convert to array (useful for JSON responses)
return response()->json($result->toArray());

// Use as string (implicit __toString)
echo $result;  // Outputs the answer
```

### Controller Example

```php
public function ask()
{
    $result = agent()
        ->tool('search_products', $searchFn)
        ->ask(request()->input('question'));
    
    return response()->json([
        'answer' => $result->answer(),
        'tools_used' => $result->toolsUsed(),
        'products' => $result->toolResult('search_products'),
        'reasoning' => $result->reasoning()
    ]);
}
```

## Conversations

Agents can maintain multi-turn conversations with memory:

```php
$agent = agent();
$agent->tool('search_products', $searchFn);

// Start a conversation
$session = $agent->conversation('user_' . auth()->user()->id);

// First question
$answer1 = $session->ask("Show me laptops");
// Agent: "Here are some laptops..."

// Follow-up (remembers context!)
$answer2 = $session->ask("Which one is best for programming?");
// Agent: "From the laptops I showed you, the Dell with 32GB RAM..."

// Another follow-up
$answer3 = $session->ask("What's the price of that one?");
// Agent: "The Dell laptop is $771..."
```

### Conversation Options

```php
// Custom history length and TTL
$session = $agent->conversation(
    sessionId: 'user_123',
    maxHistoryLength: 20,  // Keep last 20 turns
    ttl: 7200              // Cache for 2 hours
);
```

### Managing Conversations

```php
// Get conversation history
$history = $session->getHistory();

// Clear history (keeps session alive)
$session->clear();

// Forget completely (deletes from cache)
$session->forget();
```

## Real-World Examples

### E-commerce Product Assistant

```php
public function productAssistant()
{
    $agent = agent();
    
    $agent->tool('search_products', function($query) {
        $embedding = ai()->embed($query);
        $embeddings = db()->table('product_embeddings')->all();
        
        $items = array_map(fn($e) => [
            'id' => $e->product_id,
            'embedding' => json_decode($e->embedding, true),
            'content' => $e->content
        ], $embeddings);
        
        return ai()->similar($embedding, $items, limit: 5);
    }, 'Search product catalog semantically');
    
    $agent->tool('check_stock', function($query) {
        return db()->table('products')
            ->where('in_stock', '=', 1)
            ->select('name', 'stock_quantity', 'price')
            ->all();
    }, 'Check product availability and stock levels');
    
    $agent->tool('compare_products', function($query) {
        // Extract product IDs from query and compare
        return db()->table('products')
            ->whereIn('id', $productIds)
            ->all();
    }, 'Compare multiple products side by side');
    
    $question = request()->input('question');
    $answer = $agent->ask($question);
    
    return response()->json(['answer' => $answer]);
}
```

### Financial Assistant

```php
public function financialAssistant()
{
    $agent = agent();
    $userId = auth()->user()->id;
    
    $agent->tool('search_transactions', function($query) use ($userId) {
        $embedding = ai()->embed($query);
        
        $embeddings = db()->table('financial_embeddings')
            ->where('user_id', '=', $userId)
            ->all();
        
        $items = array_map(fn($e) => [
            'id' => $e->reference,
            'embedding' => json_decode($e->embedding, true),
            'summary' => $e->summary
        ], $embeddings);
        
        return ai()->similar($embedding, $items, limit: 3);
    }, 'Search user financial transactions');
    
    $agent->tool('calculate_spending', function($query) use ($userId) {
        return db()->query("
            SELECT 
                category,
                SUM(amount) as total,
                COUNT(*) as count
            FROM transactions 
            WHERE user_id = ? AND type = 'expense'
            GROUP BY category
            ORDER BY total DESC
        ", [$userId]);
    }, 'Calculate spending by category');
    
    $agent->tool('check_budget', function($query) use ($userId) {
        return db()->table('budgets')
            ->where('user_id', '=', $userId)
            ->select('category', 'limit', 'spent', 'remaining')
            ->all();
    }, 'Check budget status and remaining amounts');
    
    $session = $agent->conversation("finance_{$userId}");
    $answer = $session->ask(request()->input('question'));
    
    return response()->json(['answer' => $answer]);
}
```

### Customer Support Assistant

```php
public function supportAssistant()
{
    $agent = agent();
    
    $agent->tool('search_docs', function($query) {
        $embedding = ai()->embed($query);
        $docs = db()->table('documentation')->all();
        
        $items = array_map(fn($d) => [
            'id' => $d->id,
            'embedding' => json_decode($d->embedding, true),
            'content' => $d->content,
            'title' => $d->title
        ], $docs);
        
        return ai()->similar($embedding, $items, limit: 3);
    }, 'Search help documentation');
    
    $agent->tool('search_tickets', function($query) {
        return db()->table('support_tickets')
            ->where('status', '=', 'resolved')
            ->where('title', 'LIKE', "%{$query}%")
            ->limit(5)
            ->all();
    }, 'Search resolved support tickets');
    
    $agent->tool('check_status', function($query) {
        // Extract ticket ID from query
        return db()->table('support_tickets')
            ->where('id', '=', $ticketId)
            ->first();
    }, 'Check support ticket status');
    
    $answer = $agent->ask(request()->input('question'));
    
    return response()->json(['answer' => $answer]);
}
```

## Best Practices

### 1. Clear Tool Descriptions

```php
// ❌ Bad
$agent->tool('search', fn($q) => /* ... */);

// ✅ Good
$agent->tool('search_products', fn($q) => /* ... */, 
    'Search product catalog by name, category, features, or specifications');
```

### 2. Return Structured Data

```php
// ✅ Tools should return data, not formatted text
$agent->tool('get_price', function($query) {
    return [
        'product' => 'Dell Laptop',
        'price' => 771.00,
        'currency' => 'USD',
        'in_stock' => true
    ];
});
```

### 3. Handle Errors Gracefully

```php
$agent->tool('external_api', function($query) {
    try {
        return $this->callExternalAPI($query);
    } catch (\Exception $e) {
        return [
            'error' => 'Service temporarily unavailable',
            'message' => $e->getMessage()
        ];
    }
});
```

### 4. Use Conversations for Multi-Turn Dialogues

```php
// ✅ For chat interfaces
$session = $agent->conversation("user_{$userId}");
$answer = $session->ask($question);

// ✅ For one-off questions
$answer = $agent->ask($question);
```

### 5. Scope Tools Appropriately

```php
// ✅ User-specific tools
$agent->tool('my_orders', function($query) use ($userId) {
    return db()->table('orders')
        ->where('user_id', '=', $userId)
        ->all();
});

// ✅ Global tools
$agent->tool('search_products', function($query) {
    return db()->table('products')->all();
});
```

## Performance Considerations

### Tool Execution

- Tools run sequentially
- Keep tool logic fast (<100ms)
- Use database indexes
- Cache expensive operations

### Conversation Memory

- History stored in cache
- Default TTL: 1 hour
- Adjust based on use case
- Clear old sessions periodically

### Token Usage

- Each agent call uses AI tokens
- Tool planning: ~100-200 tokens
- Answer generation: ~500-1000 tokens
- Conversations accumulate history

## Architecture

### How Agents Work

1. **Planning Phase**
   - Agent receives your question
   - AI analyzes available tools
   - Decides which tools to use

2. **Execution Phase**
   - Selected tools run sequentially
   - Results collected
   - Errors handled gracefully

3. **Synthesis Phase**
   - AI receives tool results
   - Generates coherent answer
   - Returns to user

### Database-First Philosophy

Lightpack agents are optimized for structured data:

- ✅ Your database is your knowledge base
- ✅ No document parsing needed
- ✅ Real-time data access
- ✅ Multi-tenant ready
- ✅ Relationship-aware

This is simpler and more powerful than document-based RAG for most SaaS applications.

## Advanced Usage

### Custom Context

```php
$answer = $agent->ask("Question", [
    'user_preferences' => $preferences,
    'session_data' => $sessionData,
    'custom_context' => $anything
]);
```

### Dynamic Tool Registration

```php
// Register tools based on user permissions
if (auth()->user()->isAdmin()) {
    $agent->tool('admin_reports', $adminReportsFn);
}

// Register tools based on features
if (config('features.analytics')) {
    $agent->tool('analytics', $analyticsFn);
}
```

### Tool Chaining

Tools can call other tools:

```php
$agent->tool('full_analysis', function($query) use ($agent) {
    $transactions = $agent->executeTool('search_transactions', $query);
    $budget = $agent->executeTool('check_budget', $query);
    
    return [
        'transactions' => $transactions,
        'budget' => $budget,
        'analysis' => $this->analyze($transactions, $budget)
    ];
});
```

## Troubleshooting

### Agent Not Using Tools

**Problem:** Agent answers without using tools

**Solution:** Improve tool descriptions and make them more specific

```php
// ❌ Vague
$agent->tool('search', fn($q) => /* ... */, 'Search stuff');

// ✅ Specific
$agent->tool('search_products', fn($q) => /* ... */, 
    'Search product catalog by name, brand, category, price range, or features. Returns up to 5 matching products with details.');
```

### Slow Responses

**Problem:** Agent takes too long to respond

**Solution:** 
- Optimize tool queries (add indexes)
- Reduce tool complexity
- Cache expensive operations
- Limit result sets

### Incorrect Tool Selection

**Problem:** Agent chooses wrong tools

**Solution:**
- Make tool names descriptive
- Provide detailed descriptions
- Reduce number of similar tools
- Add examples in descriptions

## API Reference

### Agent

```php
agent(): Agent
```

Creates a new agent instance.

---

```php
$agent->tool(string $name, callable $fn, ?string $description = null): self
```

Register a tool with the agent.

**Parameters:**
- `$name` - Unique tool identifier
- `$fn` - Callable that executes the tool
- `$description` - Optional description for AI

**Returns:** Agent instance (for chaining)

---

```php
$agent->ask(string $query, array $context = []): string
```

Ask the agent a question.

**Parameters:**
- `$query` - User's question
- `$context` - Optional additional context

**Returns:** AI-generated answer

---

```php
$agent->conversation(string $sessionId, int $maxHistoryLength = 10, int $ttl = 3600): Conversation
```

Start a conversation with memory.

**Parameters:**
- `$sessionId` - Unique session identifier
- `$maxHistoryLength` - Max turns to remember
- `$ttl` - Cache TTL in seconds

**Returns:** Conversation instance

---

```php
$agent->getTools(): array
```

Get list of registered tool names.

**Returns:** Array of tool names

### Conversation

```php
$conversation->ask(string $query): string
```

Ask a question in the conversation context.

**Parameters:**
- `$query` - User's question

**Returns:** AI-generated answer

---

```php
$conversation->getHistory(): array
```

Get conversation history.

**Returns:** Array of conversation turns

---

```php
$conversation->clear(): self
```

Clear conversation history.

**Returns:** Conversation instance

---

```php
$conversation->forget(): self
```

Delete conversation from cache.

**Returns:** Conversation instance

---
