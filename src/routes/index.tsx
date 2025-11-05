import { FileUpload } from "@/components/FileUpload"

export function IndexRoute() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <FileUpload />
    </div>
  )
}
