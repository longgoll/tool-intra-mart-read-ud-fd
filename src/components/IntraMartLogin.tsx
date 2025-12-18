import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, LogIn, CheckCircle2, Server, User, Lock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { intraMartAuthService } from '@/lib/services/intramart-auth.service'
import type { LoginResult } from '@/lib/services/intramart-auth.service'

interface IntraMartLoginProps {
    onLoginSuccess?: (result: LoginResult) => void;
}

export function IntraMartLogin({ onLoginSuccess }: IntraMartLoginProps) {
    const [serverUrl, setServerUrl] = useState('http://158.101.91.74')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loginStep, setLoginStep] = useState<'idle' | 'getting-tokens' | 'logging-in'>('idle')

    const handleLogin = async () => {
        // Validation
        if (!serverUrl.trim()) {
            setError('Vui lòng nhập URL server')
            return
        }
        if (!username.trim()) {
            setError('Vui lòng nhập username')
            return
        }
        if (!password.trim()) {
            setError('Vui lòng nhập password')
            return
        }

        setError(null)
        setIsLoading(true)
        setLoginStep('getting-tokens')

        const toastId = toast.loading('Đang kết nối tới IntraMart...', {
            description: 'Đang lấy token xác thực...'
        })

        try {
            // Step 1: Get tokens
            const tokens = await intraMartAuthService.getLoginTokens(serverUrl)

            toast.loading('Đang đăng nhập...', {
                id: toastId,
                description: `Token: ${tokens.im_login_info.substring(0, 15)}...`
            })

            setLoginStep('logging-in')

            // Step 2: Login
            const result = await intraMartAuthService.login(
                { username, password, serverUrl },
                tokens
            )

            if (result.success) {
                setIsLoggedIn(true)
                setLoginStep('idle')

                toast.success('Đăng nhập thành công!', {
                    id: toastId,
                    description: `Session: ${result.cookies?.jsessionId || 'Active'}`,
                    duration: 3000
                })

                onLoginSuccess?.(result)
            } else {
                setError(result.error || 'Đăng nhập thất bại')
                setLoginStep('idle')

                toast.error('Đăng nhập thất bại', {
                    id: toastId,
                    description: result.error,
                    duration: 5000
                })
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra'
            setError(errorMessage)
            setLoginStep('idle')

            toast.error('Lỗi kết nối', {
                id: toastId,
                description: errorMessage,
                duration: 5000
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = () => {
        intraMartAuthService.logout()
        setIsLoggedIn(false)
        setPassword('')
        toast.info('Đã đăng xuất')
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleLogin()
        }
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-6 w-6" />
                    Đăng nhập IntraMart
                    {isLoggedIn && (
                        <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
                    )}
                </CardTitle>
                <CardDescription>
                    Đăng nhập vào hệ thống IntraMart để tải dữ liệu trực tiếp
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Server URL */}
                <div className="space-y-2">
                    <Label htmlFor="server-url" className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Server URL
                    </Label>
                    <Input
                        id="server-url"
                        type="url"
                        placeholder="http://158.101.91.74"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading || isLoggedIn}
                    />
                </div>

                {/* Username */}
                <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Username
                    </Label>
                    <Input
                        id="username"
                        type="text"
                        placeholder="Nhập tên đăng nhập"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading || isLoggedIn}
                    />
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Password
                    </Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading || isLoggedIn}
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Login Progress */}
                {loginStep !== 'idle' && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                            {loginStep === 'getting-tokens' && 'Đang lấy token xác thực...'}
                            {loginStep === 'logging-in' && 'Đang xác thực...'}
                        </span>
                    </div>
                )}

                {/* Success State */}
                {isLoggedIn && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">Đã đăng nhập thành công!</span>
                        </div>
                        <p className="text-sm text-green-600/80 dark:text-green-400/80">
                            Bạn có thể tiếp tục tải dữ liệu từ IntraMart.
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {!isLoggedIn ? (
                        <Button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang đăng nhập...
                                </>
                            ) : (
                                <>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    Đăng nhập
                                </>
                            )}
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="flex-1"
                            >
                                Đăng xuất
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
