# GitHub Markdown Complete Example

This document demonstrates all GitHub-flavored markdown syntax features for testing Confluence conversion.

## Heading Level 2

### Heading Level 3

#### Heading Level 4

##### Heading Level 5

###### Heading Level 6

---

## Text Formatting

This is **bold text** and this is __also bold__.

This is *italic text* and this is _also italic_.

This is ***bold and italic*** text.

This is ~~strikethrough~~ text.

This is `inline code` within a sentence.

---

## Lists

### Unordered List

- First item
- Second item
- Third item
  - Nested item 1
  - Nested item 2
    - Deep nested item
- Fourth item

### Ordered List

1. First step
2. Second step
3. Third step
   1. Sub-step A
   2. Sub-step B
      1. Deep sub-step
4. Fourth step

### Task Lists

- [x] Completed task
- [x] Another completed task
- [ ] Incomplete task
- [ ] Another incomplete task
  - [x] Nested completed task
  - [ ] Nested incomplete task

---

## Links and Images

### Links

[Visit GitHub](https://github.com)

[Link with title](https://www.google.com "Google Homepage")

<https://www.example.com>

### Images

![Alt text for image](https://via.placeholder.com/150 "Image Title")

---

## Code Blocks

### Inline Code

Use `console.log()` to print to the console.

### JavaScript Code Block

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}

const message = greet('World');
console.log(message);
```

### Python Code Block

```python
def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# Print first 10 Fibonacci numbers
for i in range(10):
    print(calculate_fibonacci(i))
```

### Bash/Shell Code Block

```bash
#!/bin/bash

# Deploy script
echo "Starting deployment..."
npm run build
npm test

if [ $? -eq 0 ]; then
    echo "Deployment successful!"
else
    echo "Deployment failed!"
    exit 1
fi
```

### JSON Code Block

```json
{
  "name": "example-project",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  },
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  }
}
```

### SQL Code Block

```sql
SELECT
    users.id,
    users.name,
    COUNT(orders.id) as order_count
FROM users
LEFT JOIN orders ON users.id = orders.user_id
WHERE users.active = true
GROUP BY users.id, users.name
HAVING COUNT(orders.id) > 5
ORDER BY order_count DESC;
```

### Code Block Without Syntax Highlighting

```
Plain text code block
No syntax highlighting applied
Just monospace font
```

---

## Tables

### Simple Table

| Name | Age | City |
|------|-----|------|
| Alice | 28 | New York |
| Bob | 34 | San Francisco |
| Charlie | 42 | Seattle |

### Table with Alignment

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Apple        | Banana         | Cherry        |
| Dog          | Elephant       | Fox           |
| 123          | 456            | 789           |

### Complex Table

| Feature | Status | Priority | Assignee | Notes |
|---------|--------|----------|----------|-------|
| User Authentication | ✅ Complete | High | @johndoe | OAuth2 implemented |
| Dashboard UI | 🔄 In Progress | Medium | @janedoe | 75% complete |
| API Documentation | ❌ Not Started | Low | Unassigned | Waiting on API finalization |
| Mobile App | 🔄 In Progress | High | @bobsmith | iOS done, Android in progress |

---

## Blockquotes

> This is a simple blockquote.
> It can span multiple lines.

> **Nested blockquotes:**
>
> This is the first level.
>
> > This is nested inside.
> >
> > > This is deeply nested.

> ### Blockquote with formatting
>
> You can use **bold**, *italic*, and `code` inside blockquotes.
>
> - Even lists
> - Work inside
> - Blockquotes

---

## Horizontal Rules

You can create horizontal rules with three or more hyphens, asterisks, or underscores:

---

***

___

---

## GitHub-Specific Features

### Alerts (Callouts)

> [!NOTE]
> This is a note alert. Useful for highlighting important information.

> [!TIP]
> This is a tip alert. Great for helpful suggestions and best practices.

> [!IMPORTANT]
> This is an important alert. Use for critical information users must know.

> [!WARNING]
> This is a warning alert. Use to warn users about potential issues.

> [!CAUTION]
> This is a caution alert. Use for dangerous actions that could cause problems.

### Emoji

GitHub supports emoji! Here are some examples:

:smile: :rocket: :thumbsup: :heart: :fire: :tada: :100: :eyes: :sparkles: :zap:

You can also use Unicode emoji directly: 😀 🚀 👍 ❤️ 🔥 🎉 💯 👀 ✨ ⚡

### Footnotes

Here's a sentence with a footnote[^1].

Here's another one with a longer footnote[^longnote].

[^1]: This is the first footnote.

[^longnote]: This is a longer footnote with multiple lines.

    You can include code blocks, lists, and other markdown in footnotes.

    ```python
    print("Even code!")
    ```

---

## Advanced Features

### Definition Lists (not standard but sometimes supported)

Term 1
: Definition for term 1

Term 2
: Definition for term 2a
: Definition for term 2b

### Keyboard Keys

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.

Use <kbd>Cmd</kbd> + <kbd>V</kbd> to paste on Mac.

### Subscript and Superscript (HTML fallback)

H<sub>2</sub>O is water.

E = mc<sup>2</sup> is Einstein's famous equation.

### Abbreviations (HTML fallback)

The <abbr title="HyperText Markup Language">HTML</abbr> specification is maintained by <abbr title="World Wide Web Consortium">W3C</abbr>.

---

## Complex Example: Project Status Report

### 📊 Q1 2024 Project Summary

#### Executive Summary

This quarter has seen **significant progress** across all key initiatives. Our team delivered 3 major features and resolved 127 bug reports.

#### Key Metrics

| Metric | Q4 2023 | Q1 2024 | Change |
|--------|---------|---------|--------|
| Active Users | 12,500 | 18,750 | +50% ⬆️ |
| Response Time | 245ms | 180ms | -27% ⬇️ |
| Uptime | 99.2% | 99.8% | +0.6% ⬆️ |
| Bug Reports | 89 | 34 | -62% ⬇️ |

#### Completed Features

1. **User Authentication System** ✅
   - OAuth2 integration
   - Multi-factor authentication
   - Session management

2. **Real-time Dashboard** ✅
   - WebSocket implementation
   - Auto-refresh capability
   - Custom widget system

3. **API Rate Limiting** ✅
   - Token bucket algorithm
   - Per-user quotas
   - Analytics integration

#### Code Examples

**New Authentication Middleware:**

```javascript
async function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

#### Known Issues

> [!WARNING]
> The mobile app occasionally crashes on Android 12 devices. Fix scheduled for v1.2.1.

> [!CAUTION]
> Database migration required for v2.0. Ensure backup before upgrading.

#### Next Quarter Goals

- [ ] Implement GraphQL API
- [ ] Launch mobile app beta
- [ ] Complete security audit
- [ ] Migrate to microservices architecture

---

## Conclusion

This document contains examples of all major GitHub-flavored markdown features. When published to Confluence, the conversion script will handle:

- ✅ Standard markdown (headers, lists, links, code)
- ✅ GitHub extensions (task lists, tables, alerts)
- ✅ Code syntax highlighting
- ⚠️ Some features may require manual adjustment in Confluence

For more information, see the [GitHub Markdown Guide](https://docs.github.com/en/get-started/writing-on-github).

---

**Last Updated:** March 2024
**Version:** 1.0
**Author:** GitHub Actions Automation
