import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Loader2,
    Database,
    Folder,
    FileCode2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    RefreshCw,
    CheckCircle2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react'
import { toast } from 'sonner'
import { userDefinitionService } from '@/lib/services/user-definition.service'
import type { Category, UserDefinition } from '@/lib/services/user-definition.service'

interface UserDefinitionSelectorProps {
    onSelect?: (definition: UserDefinition) => void;
    onMultiSelect?: (definitions: UserDefinition[]) => void;
}

export function UserDefinitionSelector({ onSelect, onMultiSelect }: UserDefinitionSelectorProps) {
    // Categories state
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
    const [loadingCategories, setLoadingCategories] = useState(true)

    // Definitions state
    const [definitions, setDefinitions] = useState<UserDefinition[]>([])
    const [loadingDefinitions, setLoadingDefinitions] = useState(false)
    const [totalCount, setTotalCount] = useState(0)

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(50)

    // Sorting state
    const [sortColumn, setSortColumn] = useState<string>('DEFINITION_ID')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    // Selection state
    const [selectedDefinitions, setSelectedDefinitions] = useState<Set<string>>(new Set())

    const totalPages = Math.ceil(totalCount / pageSize)

    // Fetch categories on mount
    useEffect(() => {
        fetchCategories()
    }, [])

    // Fetch definitions when category, page, or sort changes
    useEffect(() => {
        if (selectedCategoryId) {
            fetchDefinitions()
        }
    }, [selectedCategoryId, currentPage, pageSize, sortColumn, sortOrder])

    const fetchCategories = async () => {
        setLoadingCategories(true)
        try {
            const data = await userDefinitionService.getCategories()
            setCategories(data)
            toast.success(`Đã tải ${data.length} categories`)
        } catch (error) {
            toast.error('Không thể tải danh sách categories', {
                description: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setLoadingCategories(false)
        }
    }

    const fetchDefinitions = async () => {
        if (!selectedCategoryId) return

        setLoadingDefinitions(true)
        try {
            // Get count first
            const count = await userDefinitionService.getDefinitionsCount(selectedCategoryId)
            setTotalCount(count)

            // Then get definitions
            const data = await userDefinitionService.getUserDefinitions({
                categoryId: selectedCategoryId,
                count: pageSize,
                index: currentPage,
                sortColumn,
                sortOrder
            })
            setDefinitions(data)
        } catch (error) {
            toast.error('Không thể tải danh sách user definitions', {
                description: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setLoadingDefinitions(false)
        }
    }

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategoryId(categoryId)
        setCurrentPage(1) // Reset to first page
        setSelectedDefinitions(new Set()) // Clear selection
    }

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortOrder('asc')
        }
        setCurrentPage(1)
    }

    const handleRowClick = (definition: UserDefinition) => {
        onSelect?.(definition)
    }

    const handleCheckboxChange = (definitionId: string, checked: boolean) => {
        setSelectedDefinitions(prev => {
            const newSet = new Set(prev)
            if (checked) {
                newSet.add(definitionId)
            } else {
                newSet.delete(definitionId)
            }
            return newSet
        })
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedDefinitions(new Set(definitions.map(d => d.definitionId)))
        } else {
            setSelectedDefinitions(new Set())
        }
    }

    const handleConfirmSelection = () => {
        const selected = definitions.filter(d => selectedDefinitions.has(d.definitionId))
        onMultiSelect?.(selected)
        toast.success(`Đã chọn ${selected.length} definitions`)
    }

    const getSortIcon = (column: string) => {
        if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
        return sortOrder === 'asc'
            ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
            : <ArrowDown className="h-3 w-3 ml-1 text-primary" />
    }

    const selectedCategory = categories.find(c => c.categoryId === selectedCategoryId)

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {/* Header Card with Category Selection */}
            <Card className="border-2 border-primary/10 bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-6 w-6 text-primary" />
                        User Definition Selector
                    </CardTitle>
                    <CardDescription>
                        Chọn category để xem danh sách user definitions
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                                <Folder className="h-4 w-4" />
                                Category
                            </label>
                            <Select
                                value={selectedCategoryId}
                                onValueChange={handleCategoryChange}
                                disabled={loadingCategories}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Chọn category..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(category => (
                                        <SelectItem key={category.categoryId} value={category.categoryId}>
                                            <span className="flex items-center gap-2">
                                                <Folder className="h-4 w-4 text-muted-foreground" />
                                                {category.categoryName}
                                                <Badge variant="secondary" className="ml-2">
                                                    {category.categoryId}
                                                </Badge>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchCategories}
                            disabled={loadingCategories}
                            className="mt-6"
                        >
                            {loadingCategories ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {/* Category Info */}
                    {selectedCategory && (
                        <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-medium">{selectedCategory.categoryName}</p>
                                <p className="text-sm text-muted-foreground">
                                    ID: {selectedCategory.categoryId} • Total: <strong>{totalCount.toLocaleString()}</strong> definitions
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Definitions Table */}
            {selectedCategoryId && (
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileCode2 className="h-5 w-5" />
                                User Definitions
                                {totalCount > 0 && (
                                    <Badge variant="secondary">{totalCount.toLocaleString()}</Badge>
                                )}
                            </CardTitle>

                            {selectedDefinitions.size > 0 && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="default">{selectedDefinitions.size} selected</Badge>
                                    <Button size="sm" onClick={handleConfirmSelection}>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Xác nhận
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative">
                            {loadingDefinitions && (
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}

                            <ScrollArea className="h-[500px]">
                                <table className="w-full">
                                    <thead className="bg-muted/50 sticky top-0 z-10">
                                        <tr className="border-b">
                                            <th className="p-3 w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={definitions.length > 0 && selectedDefinitions.size === definitions.length}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    className="rounded border-gray-300 dark:border-gray-700"
                                                />
                                            </th>
                                            <th
                                                className="p-3 text-left font-medium cursor-pointer hover:bg-muted/80 transition-colors"
                                                onClick={() => handleSort('DEFINITION_ID')}
                                            >
                                                <span className="flex items-center">
                                                    Definition ID
                                                    {getSortIcon('DEFINITION_ID')}
                                                </span>
                                            </th>
                                            <th
                                                className="p-3 text-left font-medium cursor-pointer hover:bg-muted/80 transition-colors"
                                                onClick={() => handleSort('DEFINITION_NAME')}
                                            >
                                                <span className="flex items-center">
                                                    Name
                                                    {getSortIcon('DEFINITION_NAME')}
                                                </span>
                                            </th>
                                            <th className="p-3 text-left font-medium">Type</th>
                                            <th className="p-3 text-left font-medium">Version</th>
                                            <th
                                                className="p-3 text-left font-medium cursor-pointer hover:bg-muted/80 transition-colors"
                                                onClick={() => handleSort('CREATE_DATE')}
                                            >
                                                <span className="flex items-center">
                                                    Created
                                                    {getSortIcon('CREATE_DATE')}
                                                </span>
                                            </th>
                                            <th className="p-3 text-left font-medium">Created By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {definitions.map((def, idx) => (
                                            <tr
                                                key={def.definitionId}
                                                className={`
                          border-b hover:bg-muted/30 cursor-pointer transition-colors
                          ${selectedDefinitions.has(def.definitionId) ? 'bg-primary/5' : ''}
                          ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                        `}
                                                onClick={() => handleRowClick(def)}
                                            >
                                                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDefinitions.has(def.definitionId)}
                                                        onChange={(e) => handleCheckboxChange(def.definitionId, e.target.checked)}
                                                        className="rounded border-gray-300 dark:border-gray-700"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                                        {def.definitionId}
                                                    </code>
                                                </td>
                                                <td className="p-3">
                                                    <span className="font-medium">{def.definitionName}</span>
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant={def.definitionType === 'sql' ? 'default' : 'secondary'}>
                                                        {def.definitionType}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="text-muted-foreground">v{def.version}</span>
                                                </td>
                                                <td className="p-3 text-sm text-muted-foreground">
                                                    {userDefinitionService.formatDate(def.createDate)}
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant="outline">{def.createUserCd}</Badge>
                                                </td>
                                            </tr>
                                        ))}

                                        {definitions.length === 0 && !loadingDefinitions && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                                    <FileCode2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                                    <p>Không có user definitions nào trong category này</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </div>

                        {/* Pagination */}
                        {totalCount > 0 && (
                            <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Hiển thị</span>
                                    <Select
                                        value={String(pageSize)}
                                        onValueChange={(val) => {
                                            setPageSize(Number(val))
                                            setCurrentPage(1)
                                        }}
                                    >
                                        <SelectTrigger className="w-20 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[20, 50, 100, 200].map(size => (
                                                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span>/ {totalCount.toLocaleString()} mục</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1 || loadingDefinitions}
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1 || loadingDefinitions}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    <div className="flex items-center gap-1 mx-2">
                                        <span className="text-sm font-medium px-3 py-1 bg-primary text-primary-foreground rounded">
                                            {currentPage}
                                        </span>
                                        <span className="text-sm text-muted-foreground">/ {totalPages}</span>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || loadingDefinitions}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages || loadingDefinitions}
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {!selectedCategoryId && !loadingCategories && (
                <Card className="border-dashed bg-muted/20">
                    <CardContent className="py-16 text-center">
                        <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                        <h3 className="text-lg font-medium mb-2">Chọn Category</h3>
                        <p className="text-muted-foreground">
                            Vui lòng chọn một category từ dropdown ở trên để xem danh sách user definitions
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
