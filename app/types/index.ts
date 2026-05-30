export interface Feed {
  id: number
  category_id: number
  name: string
  url: string
  description: string | null
  telex: boolean
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  feeds: Feed[]
}

export interface Article {
  title: string
  link: string
  contentSnippet: string
  content: string
  pubDate: string
  creator: string
}
