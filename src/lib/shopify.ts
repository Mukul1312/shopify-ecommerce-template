import { generateCodeVerifier, generateCodeChallenge } from './pkce';

const storefrontAccessToken = import.meta.env
  .VITE_PUBLIC_SHOPIFY_STOREFRONT_TOKEN
const storeDomain = import.meta.env.VITE_PUBLIC_SHOPIFY_STORE_DOMAIN

async function handleApiResponse(response: Response) {
  if (!response.ok) {
    const errorText = await response.text()
    console.error(
      `API Error: ${response.status} ${response.statusText}`,
      errorText
    )
    return {
      data: null,
      errors: [{ message: `API Error: ${response.statusText}` }],
    }
  }
  const body = await response.text()
  if (!body) {
    console.error('Received empty response from API.')
    return { data: null, errors: [{ message: 'Empty response from API.' }] }
  }
  try {
    return JSON.parse(body)
  } catch (e) {
    console.error('Failed to parse JSON response:', e)
    return {
      data: null,
      errors: [{ message: 'Invalid JSON response from API.' }],
    }
  }
}

async function storefront(query: string, variables = {}) {
  if (
    !storefrontAccessToken ||
    !storeDomain ||
    storeDomain === 'YOUR_API_KEY'
  ) {
    return {
      data: null,
      errors: [
        { message: 'Shopify environment variables are not configured.' },
      ],
    }
  }
  try {
    const response = await fetch(`https://${storeDomain}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    })
    return await handleApiResponse(response)
  } catch (error) {
    console.error('Error fetching from Shopify Storefront API:', error)
    return {
      data: null,
      errors: [{ message: 'Network error during storefront request.' }],
    }
  }
}

async function customerAccount(
  query: string,
  accessToken: string,
  variables = {}
) {
  if (!storeDomain || storeDomain === 'YOUR_API_KEY') {
    return {
      data: null,
      errors: [{ message: 'Shopify store domain is not configured.' }],
    }
  }
  try {
    const apiDiscoveryResponse = await fetch(
      `https://${storeDomain}/.well-known/customer-account-api`
    )
    const apiConfig = await handleApiResponse(apiDiscoveryResponse)
    if (apiConfig.errors) return apiConfig

    const graphqlEndpoint = apiConfig.graphql_api
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: accessToken,
      },
      body: JSON.stringify({ query, variables }),
    })
    return await handleApiResponse(response)
  } catch (error) {
    console.error('Error during customer account request:', error)
    return {
      data: null,
      errors: [{ message: 'Network error during customer account request.' }],
    }
  }
}

export async function getFeaturedProducts() {
  const { data, errors } = await storefront(`
    query getFeaturedProducts {
      collection(handle: "frontpage") {
        products(first: 8) {
          edges {
            node {
              id
              title
              handle
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  `)
  if (errors || !data?.collection?.products) {
    console.error('Could not fetch featured products:', errors)
    return []
  }
  return data.collection.products.edges.map((edge: any) => edge.node)
}

export async function getCustomer(accessToken: string) {
  const { data, errors } = await customerAccount(
    `
    query getCustomer {
      customer {
        id
        firstName
        lastName
        emailAddress {
          emailAddress
        }
      }
    }
  `,
    accessToken
  )

  if (errors || !data?.customer) {
    console.error('Could not fetch customer:', errors)
    return null
  }
  return data.customer
}

export async function getCustomerOrders(accessToken: string) {
  const { data, errors } = await customerAccount(
    `
    query getCustomerOrders {
      customer {
        orders(first: 20) {
          edges {
            node {
              id
              number
              processedAt
              financialStatus
              fulfillmentStatus
              totalPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `,
    accessToken
  )
  if (errors || !data?.customer?.orders) {
    console.error('Could not fetch customer orders:', errors)
    return []
  }
  return data.customer.orders.edges.map((edge: any) => edge.node)
}

export async function getCustomerAddresses(accessToken: string) {
  const { data, errors } = await customerAccount(
    `
    query getCustomerAddresses {
      customer {
        addresses(first: 10) {
          edges {
            node {
              id
              address1
              address2
              city
              province
              zip
              country
            }
          }
        }
      }
    }
  `,
    accessToken
  )

  if (errors || !data?.customer?.addresses) {
    console.error('Could not fetch customer addresses:', errors)
    return []
  }
  return data.customer.addresses.edges.map((edge: any) => edge.node)
}

export async function customerAddressCreate(accessToken: string, address: any) {
  const { data } = await storefront(
    `
    mutation customerAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
      customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
        customerUserErrors {
          code
          field
          message
        }
        customerAddress {
          id
        }
      }
    }
  `,
    { customerAccessToken: accessToken, address }
  )
  return (
    data?.customerAddressCreate || {
      customerUserErrors: [{ message: 'Failed to create address.' }],
    }
  )
}

export async function customerAddressUpdate(
  accessToken: string,
  id: string,
  address: any
) {
  const { data } = await customerAccount(
    `
    mutation customerAddressUpdate($addressId: ID!, $address: CustomerAddressInput!) {
      customerAddressUpdate(addressId: $addressId, address: $address) {
        userErrors {
          field
          message
        }
        customerAddress {
          id
        }
      }
    }
  `,
    accessToken,
    { addressId: id, address }
  )
  return (
    data?.customerAddressUpdate || {
      userErrors: [{ message: 'Failed to update address.' }],
    }
  )
}

export async function customerAddressDelete(accessToken: string, id: string) {
  const { data } = await storefront(
    `
    mutation customerAddressDelete($id: ID!, $customerAccessToken: String!) {
      customerAddressDelete(id: $id, customerAccessToken: $customerAccessToken) {
        customerUserErrors {
          code
          field
          message
        }
        deletedCustomerAddressId
      }
    }
  `,
    { id, customerAccessToken: accessToken }
  )
  return (
    data?.customerAddressDelete || {
      customerUserErrors: [{ message: 'Failed to delete address.' }],
    }
  )
}

export async function getAuthorizationUrl() {
  const clientId = import.meta.env
    .VITE_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID
  const redirectUri = import.meta.env.VITE_PUBLIC_REDIRECT_URI

  if (
    !storeDomain ||
    !clientId ||
    !redirectUri ||
    storeDomain === 'YOUR_API_KEY' ||
    redirectUri === 'YOUR_API_KEY'
  ) {
    console.error('Auth variables not configured')
    return '/'
  }

  try {
    const discoveryResponse = await fetch(
      `https://${storeDomain}/.well-known/openid-configuration`
    )
    const authConfig = await discoveryResponse.json()
    const authorizationEndpoint = authConfig.authorization_endpoint

    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem('code-verifier', verifier);

    const authorizationRequestUrl = new URL(authorizationEndpoint)
    authorizationRequestUrl.searchParams.append(
      'scope',
      'openid email https://api.shopify.com/auth/shop.customers.read https://api.shopify.com/auth/shop.customers.write'
    )
    authorizationRequestUrl.searchParams.append('client_id', clientId)
    authorizationRequestUrl.searchParams.append('response_type', 'code')
    authorizationRequestUrl.searchParams.append('redirect_uri', redirectUri)
    // TODO: Replace with a random, unguessable string for CSRF protection
    authorizationRequestUrl.searchParams.append('state', '12345')
    // TODO: Replace with a random, unguessable string for replay attack protection
    authorizationRequestUrl.searchParams.append('nonce', '67890')
    
    // PKCE parameters
    authorizationRequestUrl.searchParams.append('code_challenge', challenge);
    authorizationRequestUrl.searchParams.append('code_challenge_method', 'S256');

    return authorizationRequestUrl.toString()
  } catch (error) {
    console.error("Failed to get authorization URL", error);
    return '/';
  }
}

export async function customerRecover(email: string) {
  const { data } = await storefront(
    `
    mutation customerRecover($email: String!) {
      customerRecover(email: $email) {
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,
    { email }
  )
  return (
    data?.customerRecover || {
      customerUserErrors: [{ message: 'Failed to recover customer.' }],
    }
  )
}

export async function createCheckout(
  items: { id: string; quantity: number }[]
) {
  const { data } = await storefront(
    `
    mutation createCheckout($lineItems: [CartLineInput!]) {
      cartCreate(input: { lines: $lineItems }) {
        cart {
          checkoutUrl
        }
      }
    }
  `,
    {
      lineItems: items.map((item) => ({
        merchandiseId: item.id,
        quantity: item.quantity,
      })),
    }
  )
  return data?.cartCreate?.cart?.checkoutUrl || ''
}

export async function searchProducts(
  query: string,
  first?: number,
  after?: string,
  last?: number,
  before?: string
) {
  const { data, errors } = await storefront(
    `
    query searchProducts($query: String!, $first: Int, $after: String, $last: Int, $before: String) {
      products(first: $first, after: $after, last: $last, before: $before, query: $query) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            title
            handle
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  `,
    { query, first, after, last, before }
  )
  if (errors || !data?.products) {
    return { edges: [], pageInfo: {} }
  }
  return data.products
}

export async function getProductByHandle(handle: string) {
  const { data, errors } = await storefront(
    `
    query getProductByHandle($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        descriptionHtml
        options {
          name
          values
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              availableForSale
              price {
                amount
                currencyCode
              }
              image {
                url
                altText
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  `,
    { handle }
  )
  if (errors || !data?.product) {
    return null
  }
  return data.product
}

export async function getProductsByCollection(
  handle: string,
  sortKey?: string,
  reverse?: boolean,
  first?: number,
  after?: string,
  last?: number,
  before?: string
) {
  const { data, errors } = await storefront(
    `
    query getProductsByCollection($handle: String!, $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $first: Int, $after: String, $last: Int, $before: String) {
      collection(handle: $handle) {
        products(first: $first, after: $after, last: $last, before: $before, sortKey: $sortKey, reverse: $reverse) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
    { handle, sortKey, reverse, first, after, last, before }
  )
  if (errors || !data?.collection?.products) {
    return { edges: [], pageInfo: {} }
  }
  return data.collection.products
}

export async function getOrder(accessToken: string, id: string) {
  const { data, errors } = await customerAccount(
    `
    query getOrder($id: ID!) {
      order(id: $id) {
        id
        number
        processedAt
        financialStatus
        fulfillmentStatus
        totalPrice {
          amount
          currencyCode
        }
          lineItems(first: 10) {
            edges {
              node {
                quantity
                title
                variantTitle
                image {
                  url
                  altText
                }
              }
            }
          }
      }
    }
  `,
    accessToken,
    { id }
  )
  if (errors || !data?.order) {
    return null
  }
  return data.order
}
