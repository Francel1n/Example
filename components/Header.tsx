import Button from './Button'

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2">
        <span className="text-2xl">⚡</span>
        <span className="text-xl font-bold text-primary">AI PR</span>
      </div>

      <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
        <a href="#" className="hover:text-gray-900 transition-colors">Docs</a>
        <a href="#" className="hover:text-gray-900 transition-colors">Pricing</a>
        <a href="#" className="hover:text-gray-900 transition-colors">Blog</a>
      </nav>

      <div className="flex items-center gap-3">
        <Button variant="secondary">Sign in</Button>
        <Button variant="primary">Get Started</Button>
      </div>
    </header>
  )
}
