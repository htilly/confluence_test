#!/usr/bin/env node

/**
 * Confluence Publisher
 *
 * Converts markdown to Confluence HTML storage format and publishes via REST API.
 * Uses zero external dependencies for maximum compatibility and minimal overhead.
 *
 * Conversion approach:
 * - Simple regex-based line-by-line markdown parsing
 * - Outputs basic HTML compatible with Confluence Fabric editor
 * - No complex AST parsing or heavy libraries needed
 */

const fs = require('fs');
const https = require('https');

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

// Convert markdown to simple HTML for Confluence storage
function convertMarkdownToConfluence(markdown) {
  let html = '';
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeContent = '';
  let inList = false;
  let listItems = [];
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = line.substring(3) || 'none';
        codeContent = '';
      } else {
        inCodeBlock = false;
        html += `<pre><code>${escapeHtml(codeContent)}</code></pre>\n`;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    // Handle headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      html += `<h${level}>${processInline(text)}</h${level}>\n`;
      continue;
    }

    // Handle tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(cell => cell.trim());

      // Check if this is a separator line (e.g., |---|---|)
      if (cells.every(cell => /^[-:]+$/.test(cell))) {
        // This is the separator, skip it but mark that we're in a table
        inTable = true;
        continue;
      }

      if (!inTable) {
        // First line is headers
        tableHeaders = cells;
        inTable = true;
      } else {
        // Subsequent lines are rows
        tableRows.push(cells);
      }
      continue;
    } else if (inTable && line.trim() === '') {
      // End of table, render it
      html += '<table><thead><tr>';
      tableHeaders.forEach(header => {
        html += `<th>${processInline(header)}</th>`;
      });
      html += '</tr></thead><tbody>';
      tableRows.forEach(row => {
        html += '<tr>';
        row.forEach(cell => {
          html += `<td>${processInline(cell)}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>\n';
      inTable = false;
      tableHeaders = [];
      tableRows = [];
      continue;
    }

    // Handle lists
    if (line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/)) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      const content = line.replace(/^[-*\d.]\s+/, '');
      listItems.push(processInline(content));
      continue;
    } else if (inList && line.trim() === '') {
      html += '<ul>\n' + listItems.map(item => `<li>${item}</li>`).join('\n') + '\n</ul>\n';
      inList = false;
      listItems = [];
      continue;
    }

    // Handle horizontal rules
    if (line.match(/^[-*_]{3,}$/)) {
      html += '<hr />\n';
      continue;
    }

    // Handle blockquotes (including nested)
    if (line.startsWith('>')) {
      // Count nesting level by counting leading '>' characters
      let nestLevel = 0;
      let contentStart = 0;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '>') {
          nestLevel++;
          contentStart = i + 1;
        } else if (line[i] === ' ') {
          contentStart = i + 1;
          break;
        } else {
          break;
        }
      }

      const content = line.substring(contentStart).trim();

      // Open nested blockquotes
      let blockquoteHTML = '';
      for (let i = 0; i < nestLevel; i++) {
        blockquoteHTML += '<blockquote>';
      }
      blockquoteHTML += `<p>${processInline(content)}</p>`;
      // Close nested blockquotes
      for (let i = 0; i < nestLevel; i++) {
        blockquoteHTML += '</blockquote>';
      }
      html += blockquoteHTML + '\n';
      continue;
    }

    // Handle empty lines
    if (line.trim() === '') {
      html += '<p></p>\n';
      continue;
    }

    // Regular paragraphs
    html += `<p>${processInline(line)}</p>\n`;
  }

  // Close any open list
  if (inList) {
    html += '<ul>\n' + listItems.map(item => `<li>${item}</li>`).join('\n') + '\n</ul>\n';
  }

  // Close any open table
  if (inTable && tableHeaders.length > 0) {
    html += '<table><thead><tr>';
    tableHeaders.forEach(header => {
      html += `<th>${processInline(header)}</th>`;
    });
    html += '</tr></thead><tbody>';
    tableRows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td>${processInline(cell)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>\n';
  }

  return html;
}

function processInline(text) {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // Inline code
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return text;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
