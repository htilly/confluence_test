# Confluence Publisher

Automatically publish GitHub-flavored markdown documents to Confluence using GitHub Actions.

## Features

- 🚀 Manual GitHub Actions workflow trigger
- 📝 Convert GitHub markdown to Confluence HTML storage format
- ✏️ Update existing pages or create new pages
- 🔒 Secure authentication with API tokens
- ✨ Support for common markdown features:
  - Headers (H1-H6)
  - Text formatting (bold, italic, strikethrough)
  - Lists (ordered and unordered)
  - Links, code blocks, blockquotes
  - Inline code and code fences
  - Horizontal rules

## Setup

### 1. Generate Confluence API Token

1. Log in to your Confluence account
2. Go to **Account Settings** → **Security** → **API tokens**
   - For Cloud: `https://id.atlassian.com/manage-profile/security/api-tokens`
3. Click **Create API token**
4. Give it a descriptive name (e.g., "GitHub Actions Publisher")
5. Copy the token (you won't be able to see it again!)

### 2. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `CONFLUENCE_EMAIL` | Your Confluence account email | `user@company.com` |
| `CONFLUENCE_API_TOKEN` | The API token you generated | `ATATT3xFfGF0...` |

### 3. Find Your Confluence Information

You'll need these values when triggering the workflow:

#### Confluence Base URL
- **Cloud**: `https://yourcompany.atlassian.net/wiki`
- **Server/Data Center**: `https://confluence.yourcompany.com`

#### Space Key
1. Navigate to your Confluence space
2. Look at the URL: `https://yourcompany.atlassian.net/wiki/spaces/TEAM/...`
3. The space key is the part after `/spaces/` (e.g., `TEAM`)

#### Page ID (for updating existing pages)
1. Navigate to the page you want to update
2. Click **⋯** (More actions) → **Page Information**
3. Look at the URL: `https://yourcompany.atlassian.net/wiki/pages/viewinfo.action?pageId=123456789`
4. The page ID is the number after `pageId=` (e.g., `123456789`)

Alternatively, view any page and look for `pageId` in the URL.

#### Parent Page ID (for creating new pages)
Same as Page ID above, but for the parent page under which you want to create the new page.

## Usage

### Triggering the Workflow

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Select **Publish to Confluence** from the workflow list
4. Click **Run workflow**
5. Fill in the required information:

#### Update Existing Page Mode

```
Confluence base URL: https://yourcompany.atlassian.net/wiki
Space key: TEAM
Page ID: 123456789
Parent page ID: (leave empty)
Page title: (optional - keep existing title)
Markdown file: example.md
```

#### Create New Page Mode

```
Confluence base URL: https://yourcompany.atlassian.net/wiki
Space key: TEAM
Page ID: (leave empty)
Parent page ID: 987654321
Page title: My New Documentation Page
Markdown file: example.md
```

### Command Line (Manual Testing)

You can also test the script locally:

```bash
# Install dependencies
npm install

# Set environment variables
export CONFLUENCE_URL="https://yourcompany.atlassian.net/wiki"
export CONFLUENCE_EMAIL="your-email@company.com"
export CONFLUENCE_API_TOKEN="your-api-token"
export SPACE_KEY="TEAM"
export PAGE_ID="123456789"  # or use PARENT_PAGE_ID and PAGE_TITLE
export MARKDOWN_FILE="example.md"

# Run the publisher
node scripts/publish-to-confluence.js
```

## File Structure

```
.
├── .github/
│   └── workflows/
│       └── publish-to-confluence.yml  # GitHub Actions workflow
├── scripts/
│   └── publish-to-confluence.js       # Conversion and publishing script
├── example.md                          # Example markdown file
├── package.json                        # Node.js dependencies
└── README.md                           # This file
```

## Example Markdown

The [example.md](example.md) file demonstrates supported markdown features. Note that the converter uses a simplified HTML conversion for maximum compatibility with Confluence's Fabric editor:

**Fully Supported:**
- All heading levels (H1-H6)
- Text formatting (bold, italic, strikethrough)
- Inline code and code blocks
- Lists (ordered and unordered)
- Links
- Blockquotes
- Horizontal rules
- Paragraphs

**Limited Support:**
- Tables (basic HTML tables)
- Images (must be publicly accessible URLs)
- Task lists (converted to plain text with checkmarks)

**Not Supported:**
- GitHub alerts/callouts (rendered as blockquotes)
- Emoji shortcodes (Unicode emoji work)
- Footnotes
- Advanced formatting and GitHub-specific features

## Markdown to Confluence Conversion

The script converts markdown to Confluence HTML storage format compatible with the Fabric editor:

| GitHub Markdown | Confluence HTML |
|-----------------|-----------------|
| Headers (`#` to `######`) | `<h1>` to `<h6>` |
| **Bold** or __Bold__ | `<strong>` |
| *Italic* or _Italic_ | `<em>` |
| ~~Strikethrough~~ | `<s>` |
| `inline code` | `<code>` |
| Code blocks (```) | `<pre><code>` (HTML-escaped) |
| Links `[text](url)` | `<a href="url">text</a>` |
| Lists (- or 1.) | `<ul><li>` or `<ol><li>` |
| Blockquotes (>) | `<blockquote><p>` |
| Horizontal rules (---) | `<hr />` |

### Known Limitations

- **No dependencies**: Uses simple regex-based conversion for maximum compatibility
- **Tables**: Basic HTML tables only (no alignment or advanced features)
- **Images**: Must be publicly accessible URLs; uploaded to Confluence manually
- **GitHub-specific features**: Alerts, task lists, mentions, footnotes not converted
- **Code syntax highlighting**: Basic `<pre><code>` blocks (no language-specific highlighting)
- **Nested lists**: Limited support for complex nesting
- **Mixed formatting**: Complex inline formatting may not work perfectly

## Troubleshooting

### Authentication Failed

**Error**: `HTTP 401: Unauthorized`

**Solution**:
- Verify `CONFLUENCE_EMAIL` and `CONFLUENCE_API_TOKEN` secrets are set correctly
- Ensure the API token is still valid (they don't expire but can be revoked)
- Check that the email matches the account that created the API token

### Page Not Found

**Error**: `HTTP 404: Page not found`

**Solution**:
- Verify the page ID exists and is correct
- Ensure you have access to view/edit the page
- Check that the space key is correct

### Permission Denied

**Error**: `HTTP 403: Forbidden`

**Solution**:
- Ensure you have edit permissions for the page/space
- Check space permissions in Confluence settings
- Verify the API token has the correct scopes

### Invalid Confluence URL

**Error**: Connection errors or invalid URL

**Solution**:
- For Confluence Cloud, include `/wiki` in the URL
- Verify the domain is correct (e.g., `yourcompany.atlassian.net`)
- Ensure HTTPS is used (not HTTP)

## Advanced Configuration

### Publishing Multiple Files

To publish different markdown files, create multiple workflow runs with different `markdown_file` inputs, or modify the workflow to accept multiple files.

### Automatic Publishing on Push

To automatically publish when markdown files change, modify the workflow trigger:

```yaml
on:
  workflow_dispatch:
    # ... existing inputs
  push:
    branches:
      - main
    paths:
      - '**.md'
```

### Custom Markdown Conversion

Edit [scripts/publish-to-confluence.js](scripts/publish-to-confluence.js) to customize the conversion logic. The script uses simple regex-based conversion with no external dependencies for maximum compatibility with Confluence's Fabric editor.

**Key functions:**
- `convertMarkdownToConfluence()`: Main conversion function (line-by-line processing)
- `processInline()`: Handles inline formatting (bold, italic, links, code)
- `escapeHtml()`: Escapes HTML in code blocks

## Contributing

Feel free to open issues or submit pull requests for improvements!

## License

MIT

## Resources

- [Confluence REST API Documentation](https://developer.atlassian.com/cloud/confluence/rest/v1/intro/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
- [Marked.js Documentation](https://marked.js.org/)
