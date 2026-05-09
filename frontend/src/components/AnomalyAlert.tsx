interface AnomalyAlertProps {
  message: string
  onDismiss: () => void
}

export default function AnomalyAlert({ message, onDismiss }: AnomalyAlertProps) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 flex items-start justify-between">
      <div>
        <p className="font-bold text-red-700">⚠️ 異常警示</p>
        <p className="text-red-600 text-sm mt-1">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 ml-4">✕</button>
    </div>
  )
}
