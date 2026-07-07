// Catalogue d'outils sélectionnables pour la section "Outils" du portfolio.
// Les logos sont servis par cdn.simpleicons.org (SVG couleur officielle).

export interface Tool {
  slug: string
  name: string
  category: ToolCategory
}

export type ToolCategory =
  | 'design'
  | 'dev'
  | 'nocode'
  | 'marketing'
  | 'gestion'

export const TOOL_CATEGORIES: { value: ToolCategory; label: string }[] = [
  { value: 'design', label: 'Design' },
  { value: 'dev', label: 'Développement' },
  { value: 'nocode', label: 'No-code / CMS' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'gestion', label: 'Gestion & bureau' },
]

export const TOOLS_CATALOG: Tool[] = [
  // Design
  { slug: 'figma', name: 'Figma', category: 'design' },
  { slug: 'sketch', name: 'Sketch', category: 'design' },
  { slug: 'canva', name: 'Canva', category: 'design' },
  { slug: 'framer', name: 'Framer', category: 'design' },
  { slug: 'blender', name: 'Blender', category: 'design' },
  { slug: 'affinitydesigner', name: 'Affinity Designer', category: 'design' },

  // Développement
  { slug: 'html5', name: 'HTML5', category: 'dev' },
  { slug: 'css3', name: 'CSS3', category: 'dev' },
  { slug: 'javascript', name: 'JavaScript', category: 'dev' },
  { slug: 'typescript', name: 'TypeScript', category: 'dev' },
  { slug: 'react', name: 'React', category: 'dev' },
  { slug: 'nextdotjs', name: 'Next.js', category: 'dev' },
  { slug: 'vuedotjs', name: 'Vue.js', category: 'dev' },
  { slug: 'nodedotjs', name: 'Node.js', category: 'dev' },
  { slug: 'php', name: 'PHP', category: 'dev' },
  { slug: 'laravel', name: 'Laravel', category: 'dev' },
  { slug: 'python', name: 'Python', category: 'dev' },
  { slug: 'tailwindcss', name: 'Tailwind CSS', category: 'dev' },
  { slug: 'bootstrap', name: 'Bootstrap', category: 'dev' },
  { slug: 'git', name: 'Git', category: 'dev' },
  { slug: 'github', name: 'GitHub', category: 'dev' },
  { slug: 'flutter', name: 'Flutter', category: 'dev' },
  { slug: 'supabase', name: 'Supabase', category: 'dev' },
  { slug: 'firebase', name: 'Firebase', category: 'dev' },

  // No-code / CMS
  { slug: 'wordpress', name: 'WordPress', category: 'nocode' },
  { slug: 'shopify', name: 'Shopify', category: 'nocode' },
  { slug: 'webflow', name: 'Webflow', category: 'nocode' },
  { slug: 'wix', name: 'Wix', category: 'nocode' },
  { slug: 'woocommerce', name: 'WooCommerce', category: 'nocode' },
  { slug: 'airtable', name: 'Airtable', category: 'nocode' },
  { slug: 'zapier', name: 'Zapier', category: 'nocode' },

  // Marketing
  { slug: 'googleanalytics', name: 'Google Analytics', category: 'marketing' },
  { slug: 'googleads', name: 'Google Ads', category: 'marketing' },
  { slug: 'meta', name: 'Meta Ads', category: 'marketing' },
  { slug: 'mailchimp', name: 'Mailchimp', category: 'marketing' },
  { slug: 'buffer', name: 'Buffer', category: 'marketing' },
  { slug: 'semrush', name: 'Semrush', category: 'marketing' },

  // Gestion & bureau
  { slug: 'notion', name: 'Notion', category: 'gestion' },
  { slug: 'trello', name: 'Trello', category: 'gestion' },
  { slug: 'asana', name: 'Asana', category: 'gestion' },
  { slug: 'slack', name: 'Slack', category: 'gestion' },
  { slug: 'googledrive', name: 'Google Drive', category: 'gestion' },
  { slug: 'whatsapp', name: 'WhatsApp Business', category: 'gestion' },
]

export const toolLogoUrl = (slug: string) => `https://cdn.simpleicons.org/${slug}`

export const findTool = (slug: string) =>
  TOOLS_CATALOG.find((t) => t.slug === slug)
