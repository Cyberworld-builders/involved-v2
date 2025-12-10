import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ComingSoonProps {
  title: string
  description?: string
  icon?: string
}

export default function ComingSoon({ title, description, icon = '🚧' }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="text-6xl mb-4">{icon}</div>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="text-lg mt-2">
            {description || 'This feature is coming soon. We\'re working hard to bring it to you!'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Stay tuned for updates. In the meantime, explore other features of the platform.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

