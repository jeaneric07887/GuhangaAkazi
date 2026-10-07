const fs = require('node:fs')
const path = require('node:path')

const outputDirectory = path.resolve(__dirname, '../dist')
const sitemapPath = path.join(outputDirectory, 'sitemap.xml')
const robotsPath = path.join(outputDirectory, 'robots.txt')
const publicPaths = [
  '/',
  '/ideas',
  '/skills',
  '/opportunities',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
]

function getSiteUrl() {
  const value = process.env.VITE_SITE_URL?.trim()
  if (!value) return null

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('VITE_SITE_URL must be a valid HTTPS site origin, such as https://www.example.com.')
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_SITE_URL must be an HTTPS origin without a path, query, or fragment.')
  }
  return url.origin
}

function xmlEscape(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

const siteUrl = getSiteUrl()
const robotsRules = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  'Disallow: /account',
  'Disallow: /messages',
]

if (siteUrl) {
  const urls = publicPaths.map((route) => `  <url><loc>${xmlEscape(new URL(route, siteUrl).href)}</loc></url>`)
  fs.writeFileSync(sitemapPath, [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n'))
  robotsRules.push(`Sitemap: ${siteUrl}/sitemap.xml`)
  console.log(`Generated sitemap.xml for ${siteUrl}.`)
} else {
  fs.rmSync(sitemapPath, { force: true })
  console.warn('VITE_SITE_URL is not set; sitemap.xml was not generated. Set it to your production HTTPS origin before deployment.')
}

fs.writeFileSync(robotsPath, `${robotsRules.join('\n')}\n`)
