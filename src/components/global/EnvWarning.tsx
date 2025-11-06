import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'

export function EnvWarning() {
  const isConfigured =
    import.meta.env.VITE_PUBLIC_SHOPIFY_STORE_DOMAIN &&
    import.meta.env.VITE_PUBLIC_SHOPIFY_STOREFRONT_TOKEN &&
    import.meta.env.VITE_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID &&
    import.meta.env.VITE_PUBLIC_REDIRECT_URI &&
    import.meta.env.VITE_PUBLIC_SHOPIFY_STORE_DOMAIN !== 'YOUR_API_KEY'

  if (isConfigured) {
    return null
  }

  return (
    <div className="container my-4">
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Configuration Missing</AlertTitle>
        <AlertDescription>
          <p>Your Shopify connection variables are not set.</p>
          <p className="font-mono mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
            Please create a <code>.env</code> file by copying{' '}
            <code>.env.example</code> and fill in the required values for your
            Shopify store. Then, restart the development server.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
