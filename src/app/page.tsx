import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/navigation'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Header */}
      <Header />

      <div className="container mx-auto px-4 py-8 sm:py-16">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Involved Talent
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Modern talent assessment and development platform built for the future of work
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
          <Card>
            <CardHeader>
              <CardTitle>360° Assessments</CardTitle>
              <CardDescription>
                Comprehensive multi-rater feedback for complete talent insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Get 360-degree feedback from peers, managers, and direct reports to understand strengths and development areas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leadership Development</CardTitle>
              <CardDescription>
                Identify and develop leadership potential across your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Assess leadership capabilities and create targeted development plans for emerging and current leaders.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Assessments</CardTitle>
              <CardDescription>
                Build tailored assessments for your specific organizational needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Create custom assessment tools that align with your company culture and strategic objectives.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link href="/auth/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
