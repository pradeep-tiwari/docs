import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Lightpack',
  description: 'Lightpack Documentation',
  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/install' },
      { text: 'Basics', link: '/routing' },
      { text: 'Databases', link: '/db-connection' },
      { text: 'Security', link: '/authentication' },
      { text: 'Utilities', link: '/password' }
    ],
    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Quick Install', link: '/install' }
          ]
        },
        {
          text: 'Basics',
          items: [
            { text: 'Routing', link: '/routing' },
            { text: 'Controllers', link: '/controllers' },
            { text: 'Views', link: '/views' },
            { text: 'Request', link: '/request' },
            { text: 'Response', link: '/response' },
            { text: 'Sessions', link: '/sessions' },
            { text: 'Cookies', link: '/cookies' },
            { text: 'Validation', link: '/validation' },
            { text: 'Filesystem', link: '/filesystem' },
            { text: 'Configuration', link: '/configuration' },
            { text: 'Environments', link: '/environments' },
            { text: 'Date & Time', link: '/moment' },
            { text: 'Utility Functions', link: '/utility-functions' }
          ]
        },
        {
          text: 'Databases',
          items: [
            { text: 'Connection', link: '/db-connection' },
            { text: 'Query Builder', link: '/db-query-builder' },
            { text: 'Migrations', link: '/migrations' },
            { text: 'Seeder', link: '/seeder' },
            { text: 'Factory', link: '/factory' },
            { text: 'Models', link: '/models' },
            { text: 'Relationships', link: '/relationships' },
            { text: 'Eager Loading', link: '/eager-loading' },
            { text: 'Repository', link: '/repository' }
          ]
        },
        {
          text: 'Security',
          items: [
            { text: 'Authentication', link: '/authentication' },
            { text: 'API Access Tokens', link: '/api-access-tokens' },
            { text: 'Configuration', link: '/auth-configuration' },
            { text: 'Extending Auth', link: '/custom-auth' },
            { text: 'Route Filters', link: '/auth-filters' },
            { text: 'RBAC', link: '/rbac' },
            { text: 'Captcha', link: '/captcha' },
            { text: 'Webhook', link: '/webhook' },
            { text: 'Social Auth', link: '/social-auth' },
            { text: 'MFA', link: '/mfa' }
          ]
        },
        {
          text: 'Utilities',
          items: [
            { text: 'Password', link: '/password' },
            { text: 'Crypto', link: '/encryption-decryption-utils' },
            { text: 'Faker', link: '/faker' },
            { text: 'Audit', link: '/audit' },
            { text: 'Logging', link: '/logging' },
            { text: 'Providers', link: '/providers' },
            { text: 'Containers', link: '/containers' },
            { text: 'CORS', link: '/cors' },
            { text: 'HTTP Client', link: '/http-client' },
            { text: 'Console', link: '/console' },
            { text: 'Testing', link: '/testing' },
            { text: 'Secrets', link: '/secrets' },
            { text: 'Settings', link: '/settings' },
            { text: 'Tags', link: '/tags' },
            { text: 'Taxonomies', link: '/taxonomies' },
            { text: 'Cable', link: '/cable' },
            { text: 'Uploads', link: '/uploads' },
            { text: 'SMS', link: '/sms' },
            { text: 'Storage', link: '/storage' },
            { text: 'AI', link: '/ai-service' }
          ]
        }
      ]
    }
  }
});
