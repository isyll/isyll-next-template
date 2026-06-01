import type { PostRow } from '@workspace/db'
import { getTranslations } from 'next-intl/server'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { DeletePostButton } from './delete-post-button'

export async function PostList({ posts }: { posts: PostRow[] }) {
  const t = await getTranslations('Posts')

  if (posts.length === 0) {
    return <p className='text-sm text-muted-foreground'>{t('empty')}</p>
  }

  return (
    <ul className='grid gap-3'>
      {posts.map((post) => (
        <li key={post.id}>
          <Card>
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>
                {post.published ? t('published') : t('draft')}
              </CardDescription>
              <CardAction>
                <DeletePostButton id={post.id} />
              </CardAction>
            </CardHeader>
            {post.content ? <CardContent>{post.content}</CardContent> : null}
          </Card>
        </li>
      ))}
    </ul>
  )
}
