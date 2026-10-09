const API_ORIGIN = new URL('https://guhangaakazi.vercel.app')

export const config = {
  matcher: ['/api/:path*', '/uploads/:path*'],
  runtime: 'nodejs',
}

export default async function middleware(request) {
  const target = new URL(request.url)
  target.protocol = API_ORIGIN.protocol
  target.host = API_ORIGIN.host

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('origin')
  headers.delete('accept-encoding')

  try {
    const options = {
      method: request.method,
      headers,
      redirect: 'manual',
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      options.body = request.body
      options.duplex = 'half'
    }
    const response = await fetch(new Request(target, options))
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('content-length')
    responseHeaders.delete('content-md5')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Backend proxy request failed:', error)
    return Response.json(
      { error: 'Could not connect to GuhangaAkazi. Please try again.' },
      { status: 502 },
    )
  }
}
