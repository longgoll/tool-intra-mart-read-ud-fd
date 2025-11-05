import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { IndexRoute } from './routes/index'
import { ContentRoute } from './routes/content'
import { Toaster } from '@/components/ui/sonner'
import { AppProvider } from '@/contexts/AppContext'

// Root route với layout chung
const rootRoute = createRootRoute({
  component: () => (
    <AppProvider>
      <Outlet />
      <Toaster position="top-right" />
    </AppProvider>
  ),
})

// Index route (trang upload)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRoute,
})

// Content route (trang nội dung)
const contentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/content',
  component: ContentRoute,
})

// Tạo route tree
const routeTree = rootRoute.addChildren([indexRoute, contentRoute])

// Tạo router instance
export const router = createRouter({ routeTree })

// Type declaration cho TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
