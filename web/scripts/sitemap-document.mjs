function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizeLastmod(value) {
  if (!value || Number.isNaN(Date.parse(value))) return null
  return new Date(value).toISOString().slice(0, 10)
}

function compareRoutePaths(left, right) {
  if (left.path === right.path) return 0
  return left.path < right.path ? -1 : 1
}

export function buildSitemapDocument(routes, siteUrl) {
  const sortedRoutes = [...routes].sort(compareRoutePaths)

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sortedRoutes.map(({ path, priority, changefreq, lastmod }) => {
    const normalizedLastmod = normalizeLastmod(lastmod)
    return `  <url>
    <loc>${escapeXml(new URL(path, siteUrl).toString())}</loc>${normalizedLastmod ? `
    <lastmod>${normalizedLastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  }).join('\n')}
</urlset>
`
}
