import AsyncStorage from '@react-native-community/async-storage'
import { downloadEpisode } from '../lib/downloader'
import { hasValidNetworkConnection } from '../lib/network'
import { PV } from '../resources'
import { getEpisodes, getEpisodesSincePubDate } from './episode'
import { parseAllAddByRSSPodcasts } from './parser'

export const getAutoDownloadsLastRefreshDate = async () => {
  const dateStr = await AsyncStorage.getItem(PV.Keys.AUTODOWNLOADS_LAST_REFRESHED)
  const dateISOString = !!dateStr ? new Date(dateStr).toISOString() : new Date().toISOString()
  return dateISOString
}

export const handleAutoDownloadEpisodesAddByRSSPodcasts = async () => {
  const isConnected = await hasValidNetworkConnection()
  if (isConnected) {
    await parseAllAddByRSSPodcasts()
  }
}

export const handleAutoDownloadEpisodes = async (dateISOString: string) => {
  await handleAutoDownloadEpisodesAddByRSSPodcasts()

  const autoDownloadSettingsString = await AsyncStorage.getItem(PV.Keys.AUTO_DOWNLOAD_SETTINGS)
  const autoDownloadSettings = autoDownloadSettingsString ? JSON.parse(autoDownloadSettingsString) : {}
  const autoDownloadPodcastIds =
    Object.keys(autoDownloadSettings).filter((key: string) => autoDownloadSettings[key] === true)

  const autoDownloadEpisodes = await getEpisodesSincePubDate(dateISOString, autoDownloadPodcastIds)

  // Wait for app to initialize. Without this setTimeout, then when getSubscribedPodcasts is called in
  // PodcastsScreen _initializeScreenData, then downloadEpisode will not successfully update global state
  setTimeout(() => {
    (async () => {
      for (const episode of autoDownloadEpisodes) {
        const podcast = {
          id: episode?.podcast?.id,
          imageUrl: episode?.podcast?.shrunkImageUrl || episode?.podcast?.imageUrl,
          title: episode?.podcast?.title
        }
        const restart = false
        const waitToAddTask = true
        await downloadEpisode(episode, podcast, restart, waitToAddTask)
      }
    })()
  }, 3000)
}

export const getAutoDownloadSettings = async () => {
  try {
    const itemsString = await AsyncStorage.getItem(PV.Keys.AUTO_DOWNLOAD_SETTINGS)
    return itemsString ? JSON.parse(itemsString) : {}
  } catch (error) {
    console.log('getAutoDownloadSettings error', error)
    return {}
  }
}

export const updateAutoDownloadSettings = async (podcastId: string) => {
  const settings = await getAutoDownloadSettings()
  const currentSetting = settings[podcastId]
  settings[podcastId] = !currentSetting
  await AsyncStorage.setItem(PV.Keys.AUTO_DOWNLOAD_SETTINGS, JSON.stringify(settings))
  return settings
}

export const removeAutoDownloadSetting = async (podcastId: string) => {
  const settings = await getAutoDownloadSettings()
  delete settings[podcastId]
  await AsyncStorage.setItem(PV.Keys.AUTO_DOWNLOAD_SETTINGS, JSON.stringify(settings))
  return settings
}
