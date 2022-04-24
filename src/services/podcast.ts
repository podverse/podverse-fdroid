import AsyncStorage from '@react-native-community/async-storage'
import { getGlobal } from 'reactn'
import { setDownloadedEpisodeLimit } from '../lib/downloadedEpisodeLimiter'
import { getDownloadedPodcast, removeDownloadedPodcast } from '../lib/downloadedPodcast'
import { hasValidNetworkConnection } from '../lib/network'
import { getAuthorityFeedUrlFromArray } from '../lib/utility'
import { PV } from '../resources'
import { checkIfLoggedIn, getBearerToken } from './auth'
import { handleAutoDownloadEpisodesAddByRSSPodcasts, removeAutoDownloadSetting } from './autoDownloads'
import { getAddByRSSPodcastsLocally, removeAddByRSSPodcast } from './parser'
import { request } from './request'

export const getPodcast = async (id: string) => {
  const isConnected = await hasValidNetworkConnection()
  if (isConnected) {
    const response = await request({
      endpoint: `/podcast/${id}`
    })
    return response && response.data
  } else {
    const downloadedPodcast = await getDownloadedPodcast(id)
    return downloadedPodcast
  }
}

export const getPodcastFeedUrlAuthority = async (id: string) => {
  const podcastFull = await getPodcast(id)
  return getAuthorityFeedUrlFromArray(podcastFull.feedUrls)
}

export const getPodcasts = async (query: any = {}) => {
  const searchAuthor = query.searchAuthor ? encodeURIComponent(query.searchAuthor) : ''
  const searchTitle = query.searchTitle ? encodeURIComponent(query.searchTitle) : ''

  const filteredQuery = {
    ...(query.maxResults ? { maxResults: true } : {}),
    ...(query.page ? { page: query.page } : { page: 1 }),
    ...(query.sort ? { sort: query.sort } : {}),
    ...(searchAuthor ? { searchAuthor } : {}),
    ...(searchTitle ? { searchTitle } : {}),
    ...(query.hasVideo ? { hasVideo: query.hasVideo } : {})
  } as any

  if (query.categories) {
    filteredQuery.categories = query.categories
  } else if (query.podcastIds) {
    filteredQuery.podcastId = query.podcastIds ? query.podcastIds.join(',') : ['no-results']
  }

  const response = await request({
    endpoint: '/podcast',
    query: filteredQuery
  })

  return response && response.data
}

export const setSubscribedPodcasts = async (subscribedPodcasts: any[]) => {
  if (Array.isArray(subscribedPodcasts)) {
    await AsyncStorage.setItem(PV.Keys.SUBSCRIBED_PODCASTS, JSON.stringify(subscribedPodcasts))
  }
}

export const findPodcastsByFeedUrls = async (feedUrls: string[]) => {
  const response = await request({
    endpoint: '/podcast/find-by-feed-urls',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: { feedUrls }
  })

  return response && response.data
}

export const getSubscribedPodcasts = async (subscribedPodcastIds: string[]) => {
  const addByRSSPodcasts = await getAddByRSSPodcastsLocally()

  const { appMode } = getGlobal()
  const videoOnlyMode = appMode === PV.AppMode.videos

  const query = {
    podcastIds: subscribedPodcastIds,
    sort: PV.Filters._alphabeticalKey,
    maxResults: true,
    ...(videoOnlyMode ? { hasVideo: true } : {})
  }
  const isConnected = await hasValidNetworkConnection()

  if (subscribedPodcastIds.length < 1 && addByRSSPodcasts.length < 1) return [[], 0]

  if (subscribedPodcastIds.length < 1 && addByRSSPodcasts.length > 0) {
    await handleAutoDownloadEpisodesAddByRSSPodcasts()
    await setSubscribedPodcasts([])
    const combinedPodcasts = await combineWithAddByRSSPodcasts()
    return [combinedPodcasts, combinedPodcasts.length]
  }

  if (isConnected) {
    try {
      const data = await getPodcasts(query)
      let subscribedPodcasts = data[0] || []
      await setSubscribedPodcasts(subscribedPodcasts)
      if (!preventParseCustomRSSFeeds) {
        subscribedPodcasts = await combineWithAddByRSSPodcasts()
      }
      return [subscribedPodcasts, subscribedPodcasts.length]
    } catch (error) {
      console.log(error)
      const combinedPodcasts = await combineWithAddByRSSPodcasts()
      return [combinedPodcasts, combinedPodcasts.length]
    }
  } else {
    const combinedPodcasts = await combineWithAddByRSSPodcasts()
    return [combinedPodcasts, combinedPodcasts.length]
  }
}

export const combineWithAddByRSSPodcasts = async () => {
  const { appMode } = getGlobal()
  const videoOnlyMode = appMode === PV.AppMode.videos

  const [subscribedPodcastsResults, addByRSSPodcastsResults] = await Promise.all([
    getSubscribedPodcastsLocally(),
    getAddByRSSPodcastsLocally()
  ])

  const subscribedPodcasts =
    subscribedPodcastsResults[0] && Array.isArray(subscribedPodcastsResults[0]) ? subscribedPodcastsResults[0] : []
  let addByRSSPodcasts = Array.isArray(addByRSSPodcastsResults) ? addByRSSPodcastsResults : []
  
  if (videoOnlyMode) {
    addByRSSPodcasts = addByRSSPodcasts.filter((podcast: any) => podcast.hasVideo)
  }

  const combinedPodcasts = [...subscribedPodcasts, ...addByRSSPodcasts]

  return sortPodcastArrayAlphabetically(combinedPodcasts)
}

export const getSubscribedPodcastsLocally = async () => {
  const subscribedPodcastsJSON = await AsyncStorage.getItem(PV.Keys.SUBSCRIBED_PODCASTS)
  if (subscribedPodcastsJSON) {
    const subscribedPodcasts = JSON.parse(subscribedPodcastsJSON)
    if (Array.isArray(subscribedPodcasts)) {
      return [subscribedPodcasts, subscribedPodcasts.length]
    }
    return [[], 0]
  } else {
    return [[], 0]
  }
}

export const searchPodcasts = async (title?: string, author?: string) => {
  const response = await request({
    endpoint: '/podcast',
    query: {
      sort: PV.Filters._alphabeticalKey,
      ...(title ? { title } : {}),
      ...(author ? { author } : {}),
      page: 1
    }
  })

  return response && response.data
}

export const subscribeToPodcastIfNotAlready = async (alreadySubscribedPodcasts: any, podcastId: string) => {
  if (
    Array.isArray(alreadySubscribedPodcasts) &&
    !alreadySubscribedPodcasts.some((alreadySubscribedPodcast) => alreadySubscribedPodcast.id === podcastId)
  ) {
    const skipRequestReview = true
    await toggleSubscribeToPodcast(podcastId, skipRequestReview)
  }
}

export const toggleSubscribeToPodcast = async (id: string, skipRequestReview = false) => {
  const [isLoggedIn, itemsString, addByRSSPodcastsString, globalDownloadedEpisodeLimitDefault] = await Promise.all([
    checkIfLoggedIn(),
    AsyncStorage.getItem(PV.Keys.SUBSCRIBED_PODCAST_IDS),
    AsyncStorage.getItem(PV.Keys.ADD_BY_RSS_PODCASTS),
    AsyncStorage.getItem(PV.Keys.DOWNLOADED_EPISODE_LIMIT_GLOBAL_DEFAULT)
  ])
  let isUnsubscribing = false
  let isUnsubscribingAddByRSS = false

  if (itemsString) {
    const podcastIds = JSON.parse(itemsString)
    isUnsubscribing = Array.isArray(podcastIds) && podcastIds.some((x: string) => id === x)
  }

  if (!isUnsubscribing && addByRSSPodcastsString) {
    const addByRSSPodcasts = JSON.parse(addByRSSPodcastsString)
    isUnsubscribingAddByRSS =
      Array.isArray(addByRSSPodcasts) && addByRSSPodcasts.some((podcast: any) => podcast.addByRSSPodcastFeedUrl === id)
  }

  if (globalDownloadedEpisodeLimitDefault) {
    let globalDownloadedEpisodeLimitCount = (await AsyncStorage.getItem(
      PV.Keys.DOWNLOADED_EPISODE_LIMIT_GLOBAL_COUNT
    )) as any
    if (globalDownloadedEpisodeLimitCount) {
      globalDownloadedEpisodeLimitCount = parseInt(globalDownloadedEpisodeLimitCount, 10)
      await setDownloadedEpisodeLimit(id, globalDownloadedEpisodeLimitCount)
    }
  }

  let items
  if (isUnsubscribingAddByRSS) {
    await removeAddByRSSPodcast(id)
    await removeDownloadedPodcast(id)
    await setDownloadedEpisodeLimit(id)
  } else if (isLoggedIn) {
    items = await toggleSubscribeToPodcastOnServer(id)
  } else {
    items = await toggleSubscribeToPodcastLocally(id)
  }

  if (isUnsubscribing) {
    await removeDownloadedPodcast(id)
    await setDownloadedEpisodeLimit(id)
  }

  return items
}

const toggleSubscribeToPodcastLocally = async (id: string) => {
  let items = []

  const itemsString = await AsyncStorage.getItem(PV.Keys.SUBSCRIBED_PODCAST_IDS)
  if (itemsString) {
    items = JSON.parse(itemsString)
  }

  const index = items.indexOf(id)
  if (index > -1) {
    items.splice(index, 1)
    await removeAutoDownloadSetting(id)
  } else {
    items.push(id)
  }

  if (Array.isArray(items)) {
    await AsyncStorage.setItem(PV.Keys.SUBSCRIBED_PODCAST_IDS, JSON.stringify(items))
  }

  return items
}

const toggleSubscribeToPodcastOnServer = async (id: string) => {
  await toggleSubscribeToPodcastLocally(id)

  const bearerToken = await getBearerToken()
  const response = await request({
    endpoint: `/podcast/toggle-subscribe/${id}`,
    headers: { Authorization: bearerToken }
  })

  let podcastIds = []
  const itemsString = await AsyncStorage.getItem(PV.Keys.SUBSCRIBED_PODCAST_IDS)
  if (itemsString) {
    podcastIds = JSON.parse(itemsString)
    podcastIds = addOrRemovePodcastIdFromArray(podcastIds, id)
  }
  if (Array.isArray(podcastIds)) {
    await AsyncStorage.setItem(PV.Keys.SUBSCRIBED_PODCAST_IDS, JSON.stringify(podcastIds))
  }

  return response && response.data
}

export const sortPodcastArrayAlphabetically = (podcasts: any[]) => {
  podcasts.sort((a, b) => {
    let titleA = (a && (a.sortableTitle || a.title)) || ''
    let titleB = (b && (b.sortableTitle || b.title)) || ''
    titleA = titleA
      .toLowerCase()
      .trim()
      .replace(/#/g, '')
    titleB = titleB
      .toLowerCase()
      .trim()
      .replace(/#/g, '')
    return titleA < titleB ? -1 : titleA > titleB ? 1 : 0
  })

  return podcasts
}

export const insertOrRemovePodcastFromAlphabetizedArray = (podcasts: any[], podcast: any) => {
  if (!Array.isArray(podcasts)) return []
  if (podcasts.some((x) => x.id === podcast.id)) {
    return podcasts.filter((x) => x.id !== podcast.id)
  } else {
    podcasts.push(podcast)
    sortPodcastArrayAlphabetically(podcasts)
    return podcasts
  }
}

const addOrRemovePodcastIdFromArray = (podcastIds: any[], podcastId: string) => {
  if (!Array.isArray(podcastIds)) return []
  if (podcastIds.some((x) => x === podcastId)) {
    return podcastIds.filter((x) => x !== podcastId)
  } else {
    podcastIds.push(podcastId)
    return podcastIds
  }
}
