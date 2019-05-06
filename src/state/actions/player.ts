import linkifyHtml from 'linkifyjs/html'
import { setGlobal } from 'reactn'
import { NowPlayingItem } from '../../lib/NowPlayingItem'
import { getEpisode } from '../../services/episode'
import { getMediaRef } from '../../services/mediaRef'
import { PVTrackPlayer, setNowPlayingItem as setNowPlayingItemService, setPlaybackSpeed as setPlaybackSpeedService,
  } from '../../services/player'

export const setNowPlayingItem = async (item: NowPlayingItem, isLoggedIn: boolean, globalState: any) => {
  try {
    setGlobal({
      player: {
        episode: null,
        mediaRef: null,
        nowPlayingItem: item,
        playbackState: PVTrackPlayer.STATE_BUFFERING,
        showMiniPlayer: true
      }
    })
    const result = await setNowPlayingItemService(item, isLoggedIn)
    setGlobal({
      player: {
        ...globalState.player,
        nowPlayingItem: item,
        playbackState: PVTrackPlayer.getState(),
        showMiniPlayer: true
      }
    })

    return result
  } catch (error) {
    setGlobal({
      player: {
        ...globalState.player,
        nowPlayingItem: null,
        playbackState: PVTrackPlayer.getState(),
        showMiniPlayer: false
      }
    })

    return {}
  }
}

export const getPlayingEpisode = async (id: string, globalState: any) => {
  const episode = await getEpisode(id)
  episode.description = episode.description || 'No summary available.'
  episode.description = linkifyHtml(episode.description)

  setGlobal({
    player: {
      ...globalState.player,
      episode
    }
  })
}

export const getPlayingEpisodeAndMediaRef = async (episodeId: string, mediaRefId: string, globalState: any) => {
  const episode = await getEpisode(episodeId)
  episode.description = episode.description || 'No summary available.'
  episode.description = linkifyHtml(episode.description)
  const mediaRef = await getMediaRef(mediaRefId)

  setGlobal({
    player: {
      ...globalState.player,
      episode,
      mediaRef
    }
  })
}

export const setPlaybackSpeed = async (rate: number, globalState: any) => {
  await setPlaybackSpeedService(rate)

  setGlobal({
    player: {
      ...globalState.player,
      playbackRate: rate
    }
  })
}

export const setPlaybackState = async (playbackState: string, globalState: any) => {
  setGlobal({
    player: {
      ...globalState.player,
      playbackState
    }
  })
}
