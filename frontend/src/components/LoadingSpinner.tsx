export default function LoadingSpinner({ text = '載入中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-green-600 py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-600 border-t-transparent" />
      <span>{text}</span>
    </div>
  )
}
