import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { categoryConfigs } from '@/lib/categoryConfig'
import CategoryPageClient from './CategoryPageClient'

interface Props {
  params: { category: string }
}

export async function generateStaticParams() {
  return Object.keys(categoryConfigs).map((slug) => ({ category: slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const config = categoryConfigs[params.category]
  if (!config) return {}
  return {
    title: config.seoTitle,
    description: config.seoDescription,
    openGraph: {
      title: config.seoTitle,
      description: config.seoDescription,
      url: `https://www.precisionprojectflow.com/marketplace/${config.slug}`,
      siteName: 'Precision Project Flow',
      type: 'website',
    },
    alternates: {
      canonical: `https://www.precisionprojectflow.com/marketplace/${config.slug}`,
    },
  }
}

export default function CategoryPage({ params }: Props) {
  const config = categoryConfigs[params.category]
  if (!config) notFound()
  return <CategoryPageClient config={config} />
}
