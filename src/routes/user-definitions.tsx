import { UserDefinitionSelector } from '@/components/UserDefinitionSelector'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LogOut } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { intraMartAuthService } from '@/lib/services/intramart-auth.service'
import { toast } from 'sonner'
import type { UserDefinition } from '@/lib/services/user-definition.service'

export function UserDefinitionsRoute() {
    const navigate = useNavigate()

    const handleBack = () => {
        navigate({ to: '/' })
    }

    const handleLogout = () => {
        intraMartAuthService.logout()
        toast.info('Đã đăng xuất')
        navigate({ to: '/' })
    }

    const handleSelectDefinition = (definition: UserDefinition) => {
        console.log('Selected definition:', definition)
        toast.success(`Đã chọn: ${definition.definitionId}`, {
            description: definition.definitionName
        })
        // TODO: Navigate to definition detail or do something with selected definition
    }

    const handleMultiSelect = (definitions: UserDefinition[]) => {
        console.log('Selected definitions:', definitions)
        toast.success(`Đã chọn ${definitions.length} definitions`, {
            description: definitions.map(d => d.definitionId).join(', ')
        })
        // TODO: Do something with selected definitions
    }

    return (
        <div className="min-h-svh bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 max-w-7xl items-center justify-between mx-auto px-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBack}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại
                    </Button>

                    <h1 className="text-lg font-semibold">IntraMart - User Definitions</h1>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="container max-w-7xl mx-auto p-4 py-6">
                <UserDefinitionSelector
                    onSelect={handleSelectDefinition}
                    onMultiSelect={handleMultiSelect}
                />
            </main>
        </div>
    )
}
