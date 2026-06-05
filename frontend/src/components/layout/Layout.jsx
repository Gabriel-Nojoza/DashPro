import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children, title }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header title={title} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
