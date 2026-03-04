#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const { marked } = require('marked');

// Environment variables from GitHub Actions
const CONFLUENCE_URL = process.env.CONFLUENCE_URL;
const CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL;
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const SPACE_KEY = process.env.SPACE_KEY;
const PAGE_ID = process.env.PAGE_ID;
const PARENT_PAGE_ID = process.env.PARENT_PAGE_ID;
const PAGE_TITLE = process.env.PAGE_TITLE;
const MARKDOWN_FILE = process.env.MARKDOWN_FILE || 'example.md';

// Validate required environment variables
function validateConfig() {
  const required = ['CONFLUENCE_URL', 'CONFLUENCE_EMAIL', 'CONFLUENCE_API_TOKEN', 'SPACE_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (!PAGE_ID && (!PARENT_PAGE_ID || !PAGE_TITLE)) {
    console.error('❌ Must provide either PAGE_ID (update mode) or PARENT_PAGE_ID + PAGE_TITLE (create mode)');
    process.exit(1);
  }

  if (PAGE_ID && (PARENT_PAGE_ID || PAGE_TITLE)) {
    console.warn('⚠️  Both PAGE_ID and PARENT_PAGE_ID/PAGE_TITLE provided. Will update existing page (PAGE_ID takes precedence).');
  }
}

// Custom renderer for Confluence storage format
class ConfluenceRenderer extends marked.Renderer {
  heading(text, level) {
    return `<h${level}>${text}</h${level}>`;
  }

  paragraph(text) {
    return `<p>${text}</p>`;
  }

  strong(text) {
    return `<strong>${text}</strong>`;
  }

  em(text) {
    return `<em>${text}</em>`;
  }

  del(text) {
    return `<s>${text}</s>`;
  }

  codespan(code) {
    return `<code>${this.escapeHtml(code)}</code>`;
  }

  code(code, language) {
    language = language || 'none';
    return `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">${language}</ac:parameter><ac:plain-text-body><![CDATA[${code}]]></ac:plain-text-body></ac:structured-macro>`;
  }

  blockquote(quote) {
    // Handle GitHub alerts
    const alertMatch = quote.match(/<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]([\s\S]*?)<\/p>/);
    if (alertMatch) {
      const [, type, content] = alertMatch;
      const macroType = {
        'NOTE': 'info',
        'TIP': 'tip',
        'IMPORTANT': 'note',
        'WARNING': 'warning',
        'CAUTION': 'warning'
      }[type] || 'info';

      return `<ac:structured-macro ac:name="${macroType}"><ac:rich-text-body>${content.trim()}</ac:rich-text-body></ac:structured-macro>`;
    }
    return `<blockquote>${quote}</blockquote>`;
  }

  list(body, ordered, start) {
    const type = ordered ? 'ol' : 'ul';
    return `<${type}>${body}</${type}>`;
  }

  listitem(text, task, checked) {
    if (task) {
      const checkbox = checked
        ? '<ac:task><ac:task-status>complete</ac:task-status><ac:task-body>'
        : '<ac:task><ac:task-status>incomplete</ac:task-status><ac:task-body>';
      return `<li>${checkbox}${text}</ac:task-body></ac:task></li>`;
    }
    return `<li>${text}</li>`;
  }

  link(href, title, text) {
    const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : '';
    return `<a href="${this.escapeHtml(href)}"${titleAttr}>${text}</a>`;
  }

  image(href, title, text) {
    return `<ac:image><ri:url ri:value="${this.escapeHtml(href)}" /></ac:image>`;
  }

  hr() {
    return '<hr />';
  }

  table(header, body) {
    return `<table><thead>${header}</thead><tbody>${body}</tbody></table>`;
  }

  tablerow(content) {
    return `<tr>${content}</tr>`;
  }

  tablecell(content, flags) {
    const tag = flags.header ? 'th' : 'td';
    return `<${tag}>${content}</${tag}>`;
  }

  br() {
    return '<br />';
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Convert markdown to Confluence storage format
function convertMarkdownToConfluence(markdown) {
  marked.setOptions({
    renderer: new ConfluenceRenderer(),
    gfm: true,
    breaks: false,
    pedantic: false,
    headerIds: false,
    mangle: false
  });

  let html = marked.parse(markdown);

  // Post-processing for emoji support
  html = html.replace(/:([a-z_]+):/g, (match, emoji) => {
    const emojiMap = {
      'smile': '😀', 'rocket': '🚀', 'thumbsup': '👍', 'heart': '❤️',
      'fire': '🔥', 'tada': '🎉', '100': '💯', 'eyes': '👀',
      'sparkles': '✨', 'zap': '⚡'
    };
    return emojiMap[emoji] || match;
  });

  // Handle footnotes (simplified - Confluence doesn't have native support)
  html = html.replace(/\[\^(\w+)\]/g, '<sup>[$1]</sup>');

  return html;
}

// Make HTTPS request to Confluence API
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Get existing page to retrieve current version
async function getPage(pageId) {
  const url = new URL(`${CONFLUENCE_URL}/rest/api/content/${pageId}`);
  const auth = Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString('base64');

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  };

  console.log(`📖 Fetching existing page ${pageId}...`);
  return makeRequest(options);
}

// Update existing Confluence page
async function updatePage(pageId, title, content) {
  const existingPage = await getPage(pageId);
  const url = new URL(`${CONFLUENCE_URL}/rest/api/content/${pageId}`);
  const auth = Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString('base64');

  const data = {
    version: {
      number: existingPage.version.number + 1
    },
    title: title || existingPage.title,
    type: 'page',
    body: {
      storage: {
        value: content,
        representation: 'storage'
      }
    }
  };

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'PUT',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(data))
    }
  };

  console.log(`📝 Updating page ${pageId}...`);
  return makeRequest(options, data);
}

// Create new Confluence page
async function createPage(spaceKey, parentId, title, content) {
  const url = new URL(`${CONFLUENCE_URL}/rest/api/content`);
  const auth = Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString('base64');

  const data = {
    type: 'page',
    title: title,
    space: {
      key: spaceKey
    },
    body: {
      storage: {
        value: content,
        representation: 'storage'
      }
    }
  };

  if (parentId) {
    data.ancestors = [{ id: parentId }];
  }

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(data))
    }
  };

  console.log(`📄 Creating new page "${title}"...`);
  return makeRequest(options, data);
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Confluence Publisher...\n');

    // Validate configuration
    validateConfig();

    // Read markdown file
    if (!fs.existsSync(MARKDOWN_FILE)) {
      console.error(`❌ Markdown file not found: ${MARKDOWN_FILE}`);
      process.exit(1);
    }

    console.log(`📄 Reading markdown file: ${MARKDOWN_FILE}`);
    const markdown = fs.readFileSync(MARKDOWN_FILE, 'utf8');

    // Convert to Confluence format
    console.log('🔄 Converting markdown to Confluence format...');
    const confluenceContent = convertMarkdownToConfluence(markdown);

    // Publish to Confluence
    let result;
    if (PAGE_ID) {
      // Update mode
      result = await updatePage(PAGE_ID, PAGE_TITLE, confluenceContent);
      console.log(`✅ Successfully updated page!`);
      console.log(`🔗 View at: ${CONFLUENCE_URL}/pages/viewpage.action?pageId=${PAGE_ID}`);
    } else {
      // Create mode
      result = await createPage(SPACE_KEY, PARENT_PAGE_ID, PAGE_TITLE, confluenceContent);
      console.log(`✅ Successfully created page!`);
      console.log(`🔗 View at: ${CONFLUENCE_URL}/pages/viewpage.action?pageId=${result.id}`);
    }

    console.log('\n✨ Publishing complete!');
  } catch (error) {
    console.error('\n❌ Publishing failed:', error.message);
    process.exit(1);
  }
}

main();
