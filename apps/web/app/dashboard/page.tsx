import { auth } from '@workspace/auth'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { CreatePostForm } from '@/features/posts/components/create-post-form'
import { PostList } from '@/features/posts/components/post-list'
import { listPostsByAuthor } from '@/features/posts/queries'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/login')
  }

  const [tDash, tPosts, posts] = await Promise.all([
    getTranslations('Dashboard'),
    getTranslations('Posts'),
    listPostsByAuthor(session.user.id),
  ])

  return (
    <main className='mx-auto w-full max-w-3xl space-y-8 px-4 py-8'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {tDash('title')}
        </h1>
        <p className='text-muted-foreground'>
          {tDash('welcome', { name: session.user.name })}
        </p>
      </div>

      <section className='space-y-4'>
        <h2 className='text-lg font-medium'>{tPosts('title')}</h2>
        <CreatePostForm />
        <PostList posts={posts} />
      </section>
    </main>
  )
}
