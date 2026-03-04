#!/usr/bin/env node

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

// Convert markdown to Confluence wiki markup
function convertMarkdownToConfluence(markdown) {
  // For now, just pass through the markdown as-is
  // Confluence wiki markup is similar to markdown
  // We'll do basic conversions for common incompatibilities

  let wiki = markdown;

  // Convert GitHub alerts to Confluence info/warning panels
  wiki = wiki.replace(/>\s*\[!NOTE\]\s*\n>\s*(.*?)(?=\n\n|\n>)/gs, (match, content) => {
    return `{info}\n${content.replace(/^>\s*/gm, '')}\n{info}`;
  });

  wiki = wiki.replace(/>\s*\[!TIP\]\s*\n>\s*(.*?)(?=\n\n|\n>)/gs, (match, content) => {
    return `{tip}\n${content.replace(/^>\s*/gm, '')}\n{tip}`;
  });

  wiki = wiki.replace(/>\s*\[!IMPORTANT\]\s*\n>\s*(.*?)(?=\n\n|\n>)/gs, (match, content) => {
    return `{note}\n${content.replace(/^>\s*/gm, '')}\n{note}`;
  });

  wiki = wiki.replace(/>\s*\[!WARNING\]\s*\n>\s*(.*?)(?=\n\n|\n>)/gs, (match, content) => {
    return `{warning}\n${content.replace(/^>\s*/gm, '')}\n{warning}`;
  });

  wiki = wiki.replace(/>\s*\[!CAUTION\]\s*\n>\s*(.*?)(?=\n\n|\n>)/gs, (match, content) => {
    return `{warning}\n${content.replace(/^>\s*/gm, '')}\n{warning}`;
  });

  // Convert code blocks to Confluence code macro
  wiki = wiki.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'none';
    return `{code:language=${language}}\n${code}{code}`;
  });

  // Task lists: Convert [ ] and [x] to Confluence format
  // Confluence doesn't have great support for task lists, but we can use checkmarks
  wiki = wiki.replace(/- \[ \]/g, '- ☐');
  wiki = wiki.replace(/- \[x\]/gi, '- ☑');

  return wiki;
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
      wiki: {
        value: content,
        representation: 'wiki'
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
      wiki: {
        value: content,
        representation: 'wiki'
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
