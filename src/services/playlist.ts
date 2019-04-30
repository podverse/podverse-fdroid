import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store'
import { PV } from '../resources'
import { request } from './request'

export const addOrRemovePlaylistItem = async (playlistId: string, episodeId?: string, mediaRefId?: string) => {
  const bearerToken = await RNSecureKeyStore.get(PV.Keys.BEARER_TOKEN)
  const data = {
    playlistId,
    ...(!mediaRefId ? { episodeId } : { mediaRefId })
  }

  const response = await request({
    endpoint: '/playlist/add-or-remove',
    method: 'PATCH',
    headers: {
      'Authorization': bearerToken,
      'Content-Type': 'application/json'
    },
    body: data,
    opts: { credentials: 'include' }
  })

  return response.json()
}

export const createPlaylist = async (data: any) => {
  const bearerToken = await RNSecureKeyStore.get(PV.Keys.BEARER_TOKEN)
  const response = await request({
    endpoint: '/playlist',
    method: 'POST',
    headers: {
      'Authorization': bearerToken,
      'Content-Type': 'application/json'
    },
    body: data,
    opts: { credentials: 'include' }
  })

  return response.json()
}

export const deletePlaylistOnServer = async (data: any) => {
  const bearerToken = await RNSecureKeyStore.get(PV.Keys.BEARER_TOKEN)
  const response = await request({
    endpoint: '/mediaRef',
    method: 'DELETE',
    headers: { Authorization: bearerToken },
    body: data,
    opts: { credentials: 'include' }
  })

  return response.json()
}

export const getPlaylists = async (query: any = {}) => {
  const filteredQuery = {
    ...(query.playlistId ? { playlistId: query.playlistId } : {})
  }

  const response = await request({
    endpoint: '/playlist',
    query: filteredQuery
  })

  return response.json()
}

export const getPlaylist = async (id: string) => {
  const response = await request({
    endpoint: `/playlist/${id}`
  })

  return response.json()
}

export const toggleSubscribeToPlaylist = async (playlistId: string, isLoggedIn: boolean) => {
  return isLoggedIn ? toggleSubscribeToPlaylistOnServer(playlistId) : toggleSubscribeToPlaylistLocally(playlistId)
}

const toggleSubscribeToPlaylistLocally = async (id: string) => {
  const itemsString = await RNSecureKeyStore.get(PV.Keys.SUBSCRIBED_PLAYLIST_IDS)
  const items = JSON.parse(itemsString)

  const index = items.indexOf(id)
  if (index > -1) {
    items.splice(index, 1)
  } else {
    items.push(id)
  }

  RNSecureKeyStore.set(
    PV.Keys.SUBSCRIBED_PLAYLIST_IDS,
    JSON.stringify(items),
    { accessible: ACCESSIBLE.ALWAYS_THIS_DEVICE_ONLY }
  )
  return items
}

const toggleSubscribeToPlaylistOnServer = async (id: string) => {
  const bearerToken = await RNSecureKeyStore.get(PV.Keys.BEARER_TOKEN)
  const response = await request({
    endpoint: `/playlist/toggle-subscribe/${id}`,
    headers: { Authorization: bearerToken }
  })

  return response.json()
}

export const updatePlaylist = async (data: any) => {
  const bearerToken = await RNSecureKeyStore.get(PV.Keys.BEARER_TOKEN)
  const response = await request({
    endpoint: '/playlist',
    method: 'PATCH',
    headers: {
      'Authorization': bearerToken,
      'Content-Type': 'application/json'
    },
    body: data,
    opts: { credentials: 'include' }
  })

  return response.json()
}
