const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function readResponse(response) {
  if (response.status === 204) return null
  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('The server returned an invalid response.')
  }
  if (!response.ok) throw new Error(data?.error || `Something went wrong (${response.status}).`)
  return data
}

export async function apiRequest(path, options = {}, accountType = 'admin') {
  const tokenKey = accountType === 'user' ? 'userToken' : 'adminToken'
  const token = sessionStorage.getItem(tokenKey)
  const headers = new Headers(options.headers || {})
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error('Could not connect to GuhangaAkazi. Please check that the API is running.')
  }

  return readResponse(response)
}

export async function uploadMedia(file) {
  const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : ''
  if (!mediaType) throw new Error('Choose a supported photo or video file.')
  const maxSize = mediaType === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
  if (file.size > maxSize) throw new Error(`Choose a ${mediaType} that is ${mediaType === 'image' ? '10 MB' : '50 MB'} or smaller.`)
  const token = sessionStorage.getItem('adminToken')
  const headers = new Headers({ 'Content-Type': file.type })
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${API_BASE_URL}/admin/uploads`, { method: 'POST', headers, body: file })
  } catch {
    throw new Error('Could not connect to GuhangaAkazi. Please check that the API is running.')
  }
  const data = await readResponse(response)
  if (typeof data?.url !== 'string') throw new Error('The server did not return the uploaded media URL.')
  return { ...data, url: new URL(data.url, new URL(API_BASE_URL, window.location.origin).origin).href }
}

export const api = {
  list: (type, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/${type}${query ? `?${query}` : ''}`)
  },
  get: (type, id) => apiRequest(`/${type}/${id}`),
  search: (query) => apiRequest(`/search?q=${encodeURIComponent(query)}`),
  comments: (type, id) => apiRequest(`/comments?content_type=${type}&content_id=${id}`),
  submitComment: (body) => apiRequest('/comments', { method: 'POST', body: JSON.stringify(body) }),
  contact: (body) => apiRequest('/contact', { method: 'POST', body: JSON.stringify(body) }, 'user'),
  login: (body) => apiRequest('/admin/login', { method: 'POST', body: JSON.stringify(body) }),
  registerUser: (body) => apiRequest('/account/register', { method: 'POST', body: JSON.stringify(body) }, 'user'),
  loginUser: (body) => apiRequest('/account/login', { method: 'POST', body: JSON.stringify(body) }, 'user'),
  currentUser: () => apiRequest('/account/me', {}, 'user'),
  userMessages: () => apiRequest('/messages', {}, 'user'),
  replyToMessage: (conversationId, body) => apiRequest(`/messages/${conversationId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  }, 'user'),
  adminList: (type) => apiRequest(`/admin/${type}`),
  create: (type, body) => apiRequest(`/admin/${type}`, { method: 'POST', body: JSON.stringify(body) }),
  update: (type, id, body) => apiRequest(`/admin/${type}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (type, id) => apiRequest(`/admin/${type}/${id}`, { method: 'DELETE' }),
  adminComments: () => apiRequest('/admin/comments'),
  moderateComment: (id, approved) => apiRequest(`/admin/comments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ approved }),
  }),
  removeComment: (id) => apiRequest(`/admin/comments/${id}`, { method: 'DELETE' }),
  adminContacts: () => apiRequest('/admin/contacts'),
  adminConversations: () => apiRequest('/admin/conversations'),
  updateConversation: (id, body) => apiRequest(`/admin/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  replyToConversation: (id, body) => apiRequest(`/admin/conversations/${id}/replies`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  }),
  adminMedia: () => apiRequest('/admin/media'),
  media: (page) => apiRequest(`/media?${new URLSearchParams({ page })}`),
  createMedia: (body) => apiRequest('/admin/media', { method: 'POST', body: JSON.stringify(body) }),
  removeMedia: (id) => apiRequest(`/admin/media/${id}`, { method: 'DELETE' }),
  updateComment: (id, body) => apiRequest(`/admin/comments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  updateContact: (id, body) => apiRequest(`/admin/contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  removeContact: (id) => apiRequest(`/admin/contacts/${id}`, { method: 'DELETE' }),
  removeConversation: (id) => apiRequest(`/admin/conversations/${id}`, { method: 'DELETE' }),
  updateConversationMessage: (id, body) => apiRequest(`/admin/conversation-messages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  }),
  removeConversationMessage: (id) => apiRequest(`/admin/conversation-messages/${id}`, { method: 'DELETE' }),
  updateMedia: (id, body) => apiRequest(`/admin/media/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
}
