import { useState } from "react"
import { FileUpload } from "@/components/FileUpload"
import { IntraMartLogin } from "@/components/IntraMartLogin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppContext } from "@/contexts/AppContext"
import { useNavigate } from "@tanstack/react-router"
import { FileCode2, ArrowRight, Upload, LogIn } from "lucide-react"

type InputMode = 'upload' | 'login'

export function IndexRoute() {
  const { isDataLoaded, stats } = useAppContext()
  const navigate = useNavigate()
  const [inputMode, setInputMode] = useState<InputMode>('upload')

  const handleViewData = () => {
    navigate({ to: '/content' })
  }

  const handleLoginSuccess = () => {
    // TODO: After login, fetch data from IntraMart
    console.log('Login successful - ready to fetch data')
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 gap-6">
      {/* Show existing data card if data is loaded */}
      {isDataLoaded && (
        <Card className="w-full max-w-2xl border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileCode2 className="h-6 w-6" />
              Dữ liệu đã có sẵn
            </CardTitle>
            <CardDescription>
              Bạn đã có dữ liệu trong hệ thống. Bạn có thể xem ngay hoặc upload file mới để thay thế.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-background/50 rounded-lg p-4">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{stats.categoryCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Definitions</p>
                <p className="text-2xl font-bold">{stats.definitionCount}</p>
              </div>
            </div>
            <Button onClick={handleViewData} className="w-full" size="lg">
              <FileCode2 className="mr-2 h-5 w-5" />
              Xem dữ liệu
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-full max-w-2xl">
        <Button
          variant={inputMode === 'upload' ? 'default' : 'ghost'}
          className="flex-1 gap-2"
          onClick={() => setInputMode('upload')}
        >
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
        <Button
          variant={inputMode === 'login' ? 'default' : 'ghost'}
          className="flex-1 gap-2"
          onClick={() => setInputMode('login')}
        >
          <LogIn className="h-4 w-4" />
          Đăng nhập IntraMart
        </Button>
      </div>

      {/* Content based on mode */}
      {inputMode === 'upload' ? (
        <FileUpload />
      ) : (
        <IntraMartLogin onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  )
}
