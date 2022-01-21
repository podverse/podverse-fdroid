import AsyncStorage from '@react-native-community/async-storage'
import { convertNowPlayingItemClipToNowPlayingItemEpisode, NowPlayingItem } from 'podverse-shared'
import { Platform } from 'react-native'
import { PV } from '../resources'
import {
  checkIfVideoFileType,
  videoCheckIfStateIsBuffering,
  videoCheckIfStateIsPlaying,
  videoGetCurrentLoadedTrackId,
  videoGetRate,
  videoGetState,
  videoGetTrackDuration,
  videoGetTrackPosition,
  videoHandlePause,
  videoHandlePauseWithUpdate,
  videoHandlePlayWithUpdate,
  videoHandleSeekTo,
  videoIsLoaded,
  videoLoadNowPlayingItem,
  videoSetRate,
  videoTogglePlay
} from '../state/actions/playerVideo'
import PVEventEmitter from './eventEmitter'
import {
  audioIsLoaded,
  audioCheckIfIsPlaying,
  audioSetRate,
  audioHandlePlayWithUpdate,
  audioHandleSeekTo,
  audioHandlePause,
  audioAddNowPlayingItemNextInQueue,
  audioLoadNowPlayingItem,
  audioGetTrackDuration,
  audioGetTrackPosition,
  audioGetCurrentLoadedTrackId,
  audioCheckIfStateIsBuffering,
  audioGetState,
  audioGetRate,
  audioHandlePauseWithUpdate,
  audioPlayNextFromQueue,
  audioHandleSeekToWithUpdate,
  audioSyncPlayerWithQueue,
  audioUpdateTrackPlayerCapabilities,
  audioUpdateCurrentTrack,
  audioTogglePlay
} from './playerAudio'
import { addOrUpdateHistoryItem, saveOrResetCurrentlyPlayingItemInHistory } from './userHistoryItem'
import { getNowPlayingItem, getNowPlayingItemFromLocalStorage, getNowPlayingItemLocally } from './userNowPlayingItem'

export const getClipHasEnded = async () => {
  const clipHasEnded = await AsyncStorage.getItem(PV.Keys.CLIP_HAS_ENDED)
  return clipHasEnded === 'true'
}

export const playerCheckActiveType = async () => {
  const isAudio = await audioIsLoaded()
  let playerType = isAudio ? PV.Player.playerTypes.isAudio : null
  if (playerType !== PV.Player.playerTypes.isAudio) {
    playerType = videoIsLoaded() ? PV.Player.playerTypes.isVideo : null
  }
  return playerType
}

export const playerHandleResumeAfterClipHasEnded = async () => {
  await AsyncStorage.removeItem(PV.Keys.PLAYER_CLIP_IS_LOADED)
  const nowPlayingItem = await getNowPlayingItemLocally()
  const nowPlayingItemEpisode = convertNowPlayingItemClipToNowPlayingItemEpisode(nowPlayingItem)
  const playbackPosition = await playerGetPosition()
  const mediaFileDuration = await playerGetDuration()
  await addOrUpdateHistoryItem(nowPlayingItemEpisode, playbackPosition, mediaFileDuration)
  PVEventEmitter.emit(PV.Events.PLAYER_RESUME_AFTER_CLIP_HAS_ENDED)
}

export const playerJumpBackward = async (seconds: string) => {
  const position = await playerGetPosition()
  const newPosition = position - parseInt(seconds, 10)
  await playerHandleSeekTo(newPosition)
  return newPosition
}

export const playerJumpForward = async (seconds: string) => {
  const position = await playerGetPosition()
  const newPosition = position + parseInt(seconds, 10)
  await playerHandleSeekTo(newPosition)
  return newPosition
}

let playerPreviewEndTimeInterval: any = null
export const playerPreviewEndTime = async (endTime: number) => {
  if (playerPreviewEndTimeInterval) {
    clearInterval(playerPreviewEndTimeInterval)
  }

  const previewEndTime = endTime - 3
  await playerHandleSeekTo(previewEndTime)
  playerHandlePlayWithUpdate()

  playerPreviewEndTimeInterval = setInterval(() => {
    (async () => {
      const currentPosition = await playerGetPosition()
      if (currentPosition >= endTime) {
        clearInterval(playerPreviewEndTimeInterval)
        playerHandlePause()
      }
    })()
  }, 500)
}

export const playerSetRateWithLatestPlaybackSpeed = async () => {
  const rate = await getPlaybackSpeed()

  /*
    Call playerSetRate multiple times for iOS as a workaround for a bug.
    https://github.com/DoubleSymmetry/react-native-track-player/issues/766
  */
  const playerType = await playerCheckActiveType()
  if (Platform.OS === 'ios' && playerType === PV.Player.playerTypes.isAudio) {
    playerSetRate(rate)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(() => playerSetRate(rate), 200)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(() => playerSetRate(rate), 500)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(() => playerSetRate(rate), 800)
  } else {
    playerSetRate(rate)
  }
}

export const playerPreviewStartTime = async (startTime: number, endTime?: number | null) => {
  if (playerPreviewEndTimeInterval) {
    clearInterval(playerPreviewEndTimeInterval)
  }

  await playerHandleSeekTo(startTime)
  playerHandlePlayWithUpdate()

  if (endTime) {
    playerPreviewEndTimeInterval = setInterval(() => {
      (async () => {
        const currentPosition = await playerGetPosition()
        if (currentPosition >= endTime) {
          clearInterval(playerPreviewEndTimeInterval)
          playerHandlePause()
        }
      })()
    }, 500)
  }
}

export const setClipHasEnded = async (clipHasEnded: boolean) => {
  await AsyncStorage.setItem(PV.Keys.CLIP_HAS_ENDED, JSON.stringify(clipHasEnded))
}

export const playerGetCurrentLoadedTrackId = async () => {
  const playerType = await playerCheckActiveType()
  let currentTrackId = ''
  if (playerType === PV.Player.playerTypes.isAudio) {
    currentTrackId = await audioGetCurrentLoadedTrackId()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    currentTrackId = videoGetCurrentLoadedTrackId()
  }
  return currentTrackId
}

export const playerGetPosition = async () => {
  let position = 0
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    position = await audioGetTrackPosition()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    position = await videoGetTrackPosition()
  }
  return position
}

export const playerGetDuration = async () => {
  let duration = 0
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    duration = await audioGetTrackDuration()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    duration = await videoGetTrackDuration()
  }
  return duration
}

/*
  Always use await with playerUpdateUserPlaybackPosition to make sure that
  playerGetPosition and playerGetDuration are accurate for the currently playing item.
  addOrUpdateHistoryItem can be called without await.
*/
export const playerUpdateUserPlaybackPosition = async (skipSetNowPlaying?: boolean, shouldAwait?: boolean) => {
  try {
    const currentTrackId = await playerGetCurrentLoadedTrackId()

    const setPlayerClipIsLoadedIfClip = false
    const currentNowPlayingItem = await getNowPlayingItemFromLocalStorage(currentTrackId, setPlayerClipIsLoadedIfClip)

    if (currentNowPlayingItem) {
      await saveOrResetCurrentlyPlayingItemInHistory(!!shouldAwait, currentNowPlayingItem, !!skipSetNowPlaying)
    }
  } catch (error) {
    console.log('playerUpdateUserPlaybackPosition error', error)
  }
}

export const playerLoadNowPlayingItem = async (
  item: NowPlayingItem,
  shouldPlay: boolean,
  forceUpdateOrderDate: boolean,
  itemToSetNextInQueue: NowPlayingItem | null,
  previousNowPlayingItem: NowPlayingItem | null
) => {
  try {
    if (!item) {
      return
    }

    if (!checkIfVideoFileType(item)) {
      audioAddNowPlayingItemNextInQueue(item, itemToSetNextInQueue)
    }

    const skipSetNowPlaying = true
    await playerUpdateUserPlaybackPosition(skipSetNowPlaying)

    if (checkIfVideoFileType(item)) {
      await videoLoadNowPlayingItem(item, shouldPlay, forceUpdateOrderDate, previousNowPlayingItem)
    } else {
      await audioLoadNowPlayingItem(item, shouldPlay, forceUpdateOrderDate)
    }
  } catch (error) {
    console.log('playerLoadNowPlayingItem service error', error)
  }
}

// Sometimes the duration is not immediately available for certain episodes.
// For those cases, use a setInterval before adjusting playback position.
export const playerSetPositionWhenDurationIsAvailable = async (
  position: number,
  trackId?: string,
  resolveImmediately?: boolean,
  shouldPlay?: boolean
) => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      (async () => {
        const duration = await playerGetDuration()
        const currentTrackId = await playerGetCurrentLoadedTrackId()

        setTimeout(() => {
          if (interval) clearInterval(interval)
        }, 20000)

        if (duration && duration > 0 && (!trackId || (currentTrackId && trackId === currentTrackId)) && position >= 0) {
          clearInterval(interval)

          await playerHandleSeekTo(position)
          // Sometimes seekTo does not work right away for all episodes...
          // to work around this bug, we set another interval to confirm the track
          // position has been advanced into the clip time.
          const confirmClipLoadedInterval = setInterval(() => {
            (async () => {
              const currentPosition = await playerGetPosition()
              if (currentPosition >= position - 1) {
                clearInterval(confirmClipLoadedInterval)
              } else {
                await playerHandleSeekTo(position)
              }
            })()
          }, 500)

          const shouldPlayWhenClipIsLoaded = await AsyncStorage.getItem(PV.Keys.PLAYER_SHOULD_PLAY_WHEN_CLIP_IS_LOADED)

          if (shouldPlay) {
            playerHandlePlayWithUpdate()
          } else if (shouldPlayWhenClipIsLoaded === 'true') {
            AsyncStorage.removeItem(PV.Keys.PLAYER_SHOULD_PLAY_WHEN_CLIP_IS_LOADED)
            playerHandlePlayWithUpdate()
          }

          resolve(null)
        }
        if (resolveImmediately) resolve(null)
      })()
    }, 500)
  })
}

export const playerRestartNowPlayingItemClip = async () => {
  const nowPlayingItem = await getNowPlayingItem()
  if (nowPlayingItem && nowPlayingItem.clipStartTime) {
    playerHandleSeekTo(nowPlayingItem.clipStartTime)
    playerHandlePlayWithUpdate()
  }
}

export const playerHandlePlayWithUpdate = async () => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    audioHandlePlayWithUpdate()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    videoHandlePlayWithUpdate()
  }
}

export const playerHandlePause = async () => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    audioHandlePause()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    videoHandlePause()
  }
}

export const playerHandlePauseWithUpdate = async () => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    audioHandlePauseWithUpdate()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    videoHandlePauseWithUpdate()
  }
}

export const playerHandleSeekTo = async (position: number) => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    audioHandleSeekTo(position)
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    videoHandleSeekTo(position)
  }
}

export const playerHandleSeekToWithUpdate = async (position: number) => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    audioHandleSeekToWithUpdate(position)
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    videoHandleSeekTo(position)
  }
}

export const getPlaybackSpeed = async () => {
  try {
    const rate = await AsyncStorage.getItem(PV.Keys.PLAYER_PLAYBACK_SPEED)
    if (rate) {
      return parseFloat(rate)
    } else {
      return 1.0
    }
  } catch (error) {
    return 1.0
  }
}

export const playerSetPlaybackSpeed = async (rate: number) => {
  await AsyncStorage.setItem(PV.Keys.PLAYER_PLAYBACK_SPEED, JSON.stringify(rate))
  const playerState = await playerGetState()
  const isPlaying = playerCheckIfStateIsPlaying(playerState)
  if (isPlaying) await playerSetRate(rate)
}

export const playerSetRate = async (rate = 1) => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    audioSetRate(rate)
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    // videoPlayer cannot play faster than 2x without playback failing
    if (rate > 2) rate = 2
    videoSetRate(rate)
  }
}

export const playerCheckIfStateIsPlaying = (playbackState: any) => {
  let isPlaying = false
  isPlaying = audioCheckIfIsPlaying(playbackState)
  if (!isPlaying) {
    isPlaying = videoCheckIfStateIsPlaying(playbackState)
  }
  return isPlaying
}

export const playerCheckIfStateIsBuffering = (playbackState: any) => {
  let isBuffering = false
  isBuffering = audioCheckIfStateIsBuffering(playbackState)
  if (!isBuffering) {
    isBuffering = videoCheckIfStateIsBuffering(playbackState)
  }
  return isBuffering
}

export const playerGetState = async () => {
  let playerState = null
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    playerState = await audioGetState()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    playerState = videoGetState()
  }
  return playerState
}

export const playerGetRate = async () => {
  let playerRate = 0
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    playerRate = await audioGetRate()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    playerRate = videoGetRate()
  }
  return playerRate
}

export const playerPlayNextFromQueue = async () => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    await audioPlayNextFromQueue()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    // NO CORRESPONDING VIDEO FUNCTION NEEDED
  }
}

// export const playerCheckIdlePlayerState = async () => {
//   const playerType = await playerCheckActiveType()
//   let isIdle = false
//   if (playerType === PV.Player.playerTypes.isAudio) {
//     isIdle = await audioCheckIdlePlayerState()
//   } else if (playerType === PV.Player.playerTypes.isVideo) {
//     // isIdel = awvideoCheckIdlePlayerState()
//   }
//   return isIdle
// }

export const playerSyncPlayerWithQueue = async () => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    await audioSyncPlayerWithQueue()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    // NO CORRESPONDING VIDEO FUNCTION NEEDED
    // QUEUE CURRENTLY DISABLED FOR VIDEO
  }
}

export const playerUpdateTrackPlayerCapabilities = async () => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    audioUpdateTrackPlayerCapabilities()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    // NO CORRESPONDING VIDEO FUNCTION NEEDED
  }
}

export const playerUpdateCurrentTrack = async (trackTitle?: string, artworkUrl?: string) => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    audioUpdateCurrentTrack(trackTitle, artworkUrl)
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    // NO CORRESPONDING VIDEO FUNCTION NEEDED
    // USER HAS TO DISMISS THE PLAYER TO START PLAYING A NEW VIDEO
  }
}

export const setPlayerJumpBackwards = (val?: string) => {
  const newValue = (val && parseInt(val, 10) > 0) || val === '' ? val : PV.Player.jumpBackSeconds.toString()
  if (newValue !== '') {
    AsyncStorage.setItem(PV.Keys.PLAYER_JUMP_BACKWARDS, newValue.toString())
  }
  return newValue
}

export const setPlayerJumpForwards = (val?: string) => {
  const newValue = (val && parseInt(val, 10) > 0) || val === '' ? val : PV.Player.jumpSeconds.toString()
  if (newValue !== '') {
    AsyncStorage.setItem(PV.Keys.PLAYER_JUMP_FORWARDS, newValue.toString())
  }
  return newValue
}

export const playerTogglePlay = async () => {
  const playerType = await playerCheckActiveType()
  if (playerType === PV.Player.playerTypes.isAudio) {
    audioTogglePlay()
  } else if (playerType === PV.Player.playerTypes.isVideo) {
    videoTogglePlay()
  }
}
