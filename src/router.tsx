import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { IndexRoute } from './routes/index'
import { ContentRoute } from './routes/content'
import { UserDefinitionsRoute } from './routes/user-definitions'
import { Toaster } from '@/components/ui/sonner'
import { AppProvider } from '@/contexts/AppContext'
import { ThemeProvider } from 'next-themes'

// Root route với layout chung
const rootRoute = createRootRoute({
  component: () => (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppProvider>
        <Outlet />
        <Toaster position="top-right" />
      </AppProvider>
    </ThemeProvider>
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

// User definitions route (trang chọn user definition sau khi login)
const userDefinitionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/user-definitions',
  component: UserDefinitionsRoute,
})

// Tạo route tree
const routeTree = rootRoute.addChildren([indexRoute, contentRoute, userDefinitionsRoute])

// Tạo router instance
export const router = createRouter({ routeTree })

// Type declaration cho TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
