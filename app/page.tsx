import Header from '@/components/Header'
import Button from '@/components/Button'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero section */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Build faster with <span className="text-primary">AI</span>
        </h2>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
          Select any element on your site, describe the change you want, and get a GitHub PR
          automatically — powered by Claude.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="primary">Get Started</Button>
          <Button variant="secondary">Learn More</Button>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <div className="text-3xl mb-3">🖱️</div>
            <h3 className="font-semibold text-gray-900 mb-2">Click to select</h3>
            <p className="text-sm text-gray-500">
              Click any element on your page. The extension reads its source location automatically.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <div className="text-3xl mb-3">✍️</div>
            <h3 className="font-semibold text-gray-900 mb-2">Describe the change</h3>
            <p className="text-sm text-gray-500">
              Write what you want in plain English. No code knowledge required.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="font-semibold text-gray-900 mb-2">Get a PR</h3>
            <p className="text-sm text-gray-500">
              Claude explores your codebase and opens a real GitHub Pull Request.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
