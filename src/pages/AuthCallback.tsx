import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getCustomer } from '@/lib/shopify'

const AuthCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (code && state) {
      // In a real app, you should validate the state parameter here
      const exchangeToken = async () => {
        try {
          const discoveryResponse = await fetch(
            `https://${
              import.meta.env.VITE_PUBLIC_SHOPIFY_STORE_DOMAIN
            }/.well-known/openid-configuration`
          )
          const authConfig = await discoveryResponse.json()

          const response = await fetch(authConfig.token_endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: import.meta.env
                .VITE_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID,
              redirect_uri: import.meta.env.VITE_PUBLIC_REDIRECT_URI,
              code,
            }),
          })

          const data = await response.json()

          if (data.access_token) {
            const customerData = await getCustomer(data.access_token)
            login(data.access_token, customerData.id)
            navigate('/account')
          } else {
            setError('Failed to get access token.')
          }
        } catch (err) {
          setError('An unexpected error occurred.')
        }
      }

      exchangeToken()
    }
  }, [searchParams, navigate, login])

  return (
    <div className="container mx-auto px-4 py-8 text-center">
      {error ? (
        <div>
          <h1 className="text-3xl font-bold text-red-500">Error</h1>
          <p className="mt-4">{error}</p>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-bold">Authenticating...</h1>
          <p className="mt-4">Please wait while we log you in.</p>
        </div>
      )}
    </div>
  )
}

export default AuthCallback
