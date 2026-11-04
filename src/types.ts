import type { CollectionEntry } from 'astro:content'

export type Posts = 'blog' | 'interview' | 'projects'

export type CollectionPosts = CollectionEntry<Posts>
