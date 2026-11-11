/** @type {import('next-sitemap').IConfig} */
/* eslint-disable node/prefer-global/process */
export default {
  siteUrl: process.env.SITE_URL || 'https://example.com',
  sourceDir: '.next',
  outDir: 'out',
  trailingSlash: false,
  exclude: ['/'],
  generateRobotsTxt: true,
}
