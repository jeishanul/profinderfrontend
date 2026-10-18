export interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string | null
  content: string
  featured_image_path: string | null
  featured_image_url: string | null
  featured_image_alt: string | null
  author_name: string | null
  category: string | null
  tags: string[]
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  previous?: { title: string, slug: string } | null
  next?: { title: string, slug: string } | null
}
