import { useContext } from 'react'
import { ToastContext, Toast, ToastVariant } from '@/components/ui/toast-provider'

export type { Toast, ToastVariant }

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    // Return a dummy implementation to avoid crashes if used outside provider
    // Although in this app we will wrap the root layout
    return {
      toast: (props: Partial<Toast>) => console.log('Toast (No Provider):', props),
      dismiss: () => { },
      toasts: [] as Toast[]
    }
  }

  return context
}
