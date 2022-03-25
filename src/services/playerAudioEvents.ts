import AsyncStorage from '@react-native-community/async-storage'
import { Platform } from 'react-native'
import { getGlobal } from 'reactn'
import { PV } from '../resources'
import { removeDownloadedPodcastEpisode } from '../state/actions/downloads'
import {
  playerPlayNextChapterOrQueueItem,
  playerPlayPreviousChapterOrReturnToBeginningOfTrack
} from '../state/actions/player'
import { updateHistoryItemsIndex } from '../state/actions/userHistoryItem'
import PVEventEmitter from './eventEmitter'
import {
  getClipHasEnded,
  getPlaybackSpeed,
  playerHandleResumeAfterClipHasEnded,
  playerSetRateWithLatestPlaybackSpeed
} from './player'
import {
  PVAudioPlayer,
  audioJumpBackward,
  audioJumpForward,
  audioGetTrackPosition,
  audioHandlePauseWithUpdate,
  audioHandlePlayWithUpdate,
  audioHandleSeekToWithUpdate,
  audioHandleStop,
  audioGetState,
  audioHandlePause,
  audioCheckIfIsPlaying,
  audioGetLoadedTrackIdByIndex
} from './playerAudio'
import { syncNowPlayingItemWithTrack } from './playerBackgroundTimer'
import { addOrUpdateHistoryItem, getHistoryItemEpisodeFromIndexLocally } from './userHistoryItem'
import { getNowPlayingItemFromLocalStorage, getNowPlayingItemLocally } from './userNowPlayingItem'

export const audioResetHistoryItem = async (x: any) => {
  const { position, track } = x
  const loadedTrackId = await audioGetLoadedTrackIdByIndex(track)
  const metaEpisode = await getHistoryItemEpisodeFromIndexLocally(loadedTrackId)
  if (metaEpisode) {
    const { mediaFileDuration } = metaEpisode
    if (mediaFileDuration > 59 && mediaFileDuration - 59 < position) {
      const setPlayerClipIsLoadedIfClip = false
      const currentNowPlayingItem = await getNowPlayingItemFromLocalStorage(loadedTrackId, setPlayerClipIsLoadedIfClip)
      if (currentNowPlayingItem) {
        const autoDeleteEpisodeOnEnd = await AsyncStorage.getItem(PV.Keys.AUTO_DELETE_EPISODE_ON_END)
        if (autoDeleteEpisodeOnEnd && currentNowPlayingItem?.episodeId) {
          removeDownloadedPodcastEpisode(currentNowPlayingItem.episodeId)
        }

        const forceUpdateOrderDate = false
        const skipSetNowPlaying = false
        const completed = true
        await addOrUpdateHistoryItem(currentNowPlayingItem, 0, null, forceUpdateOrderDate, skipSetNowPlaying, completed)
        await updateHistoryItemsIndex()
      }
    }
  }
}

export const audioHandleQueueEnded = (x: any) => {
  setTimeout(() => {
    (async () => {
      /*
        The app is calling PVAudioPlayer.reset() on iOS only in playerLoadNowPlayingItem
        because .reset() is the only way to clear out the current item from the queue,
        but .reset() results in the playback-queue-ended event in firing.
        We don't want the playback-queue-ended event handling logic below to happen
        during playerLoadNowPlayingItem, so to work around this, I am setting temporary
        AsyncStorage state so we can know when a queue has actually ended or
        when the event is the result of .reset() called within playerLoadNowPlayingItem.
      */
      const preventHandleQueueEnded = await AsyncStorage.getItem(PV.Keys.PLAYER_PREVENT_HANDLE_QUEUE_ENDED)
      if (!preventHandleQueueEnded) {
        await audioResetHistoryItem(x)
      }
    })()
  }, 0)
}

export const audioHandleTrackEnded = (x: any) => {
  setTimeout(() => {
    (async () => {
      await audioResetHistoryItem(x)
    })()
  }, 0)
}

// eslint-disable-next-line @typescript-eslint/require-await
module.exports = async () => {
  PVAudioPlayer.addEventListener('playback-error', (x) => console.log('playback error', x))

  PVAudioPlayer.addEventListener('playback-track-changed', (x: any) => {
    (async () => {
      console.log('playback-track-changed', x)

      const shouldSkip = await AsyncStorage.getItem(PV.Events.PLAYER_VIDEO_IS_LOADING)
      if (!shouldSkip) {
        syncNowPlayingItemWithTrack()
        audioHandleTrackEnded(x)
      }
    })()
  })

  // NOTE: PVAudioPlayer.reset will call the playback-queue-ended event on Android!!!
  PVAudioPlayer.addEventListener('playback-queue-ended', (x) => {
    (async () => {
      console.log('playback-queue-ended', x)

      const shouldSkip = await AsyncStorage.getItem(PV.Events.PLAYER_VIDEO_IS_LOADING)
      if (!shouldSkip) {
        audioHandleQueueEnded(x)
      }
    })()
  })

  PVAudioPlayer.addEventListener('playback-state', (x) => {
    (async () => {
      console.log('playback-state', x)

      PVEventEmitter.emit(PV.Events.PLAYER_STATE_CHANGED)

      const [clipHasEnded, nowPlayingItem] = await Promise.all([
        getClipHasEnded(),
        getNowPlayingItemLocally()
      ])

      if (nowPlayingItem) {
        const { clipEndTime } = nowPlayingItem
        const [currentPosition, currentState] = await Promise.all([
          audioGetTrackPosition(),
          audioGetState()
        ])

        const isPlaying = audioCheckIfIsPlaying(currentState)

        const shouldHandleAfterClip = clipHasEnded && clipEndTime && currentPosition >= clipEndTime && isPlaying
        if (shouldHandleAfterClip) {
          await playerHandleResumeAfterClipHasEnded()
        } else {
          if (Platform.OS === 'ios') {
            if (audioCheckIfIsPlaying(x.state)) {
              await playerSetRateWithLatestPlaybackSpeed()
            }
          } else if (Platform.OS === 'android') {
            /*
              state key for android
              NOTE: ready and pause use the same number, so there is no true ready state for Android :[
              none      0
              stopped   1
              paused    2
              playing   3
              ready     2
              buffering 6
              ???       8
            */
            const playing = 3
            if (x.state === playing) {
              const rate = await getPlaybackSpeed()
              PVAudioPlayer.setRate(rate)
            }
          }
        }
      }
    })()
  })

  PVAudioPlayer.addEventListener('playback-error', (x: any) => {
    console.log('playback-error', x)
    // TODO: post error to our logs!
    PVEventEmitter.emit(PV.Events.PLAYER_PLAYBACK_ERROR)
  })

  PVAudioPlayer.addEventListener('remote-jump-backward', () => {
    const { jumpBackwardsTime } = getGlobal()
    audioJumpBackward(jumpBackwardsTime)
  })

  PVAudioPlayer.addEventListener('remote-jump-forward', () => {
    const { jumpForwardsTime } = getGlobal()
    audioJumpForward(jumpForwardsTime)
  })

  PVAudioPlayer.addEventListener('remote-pause', () => {
    audioHandlePauseWithUpdate()
  })

  PVAudioPlayer.addEventListener('remote-play', () => {
    audioHandlePlayWithUpdate()
  })

  PVAudioPlayer.addEventListener('remote-seek', (data) => {
    if (data.position || data.position >= 0) {
      audioHandleSeekToWithUpdate(data.position)
    }
  })

  PVAudioPlayer.addEventListener('remote-stop', () => {
    audioHandlePause()
    PVEventEmitter.emit(PV.Events.PLAYER_REMOTE_STOP)
  })

  PVAudioPlayer.addEventListener('remote-previous', () => {
    playerPlayPreviousChapterOrReturnToBeginningOfTrack()
  })

  PVAudioPlayer.addEventListener('remote-next', () => {
    playerPlayNextChapterOrQueueItem()
  })

  /*
    iOS triggers remote-duck with permanent: true when the player app returns to foreground,
    but only in case where the track was paused before app going to background,
    so we need to check if the track is playing before making it stop or pause
    as a result of remote-duck.
    Thanks to nesinervink and bakkerjoeri for help resolving this issue:
    https://github.com/react-native-kit/react-native-track-player/issues/687#issuecomment-660149163

    See #1263 for wasPausedByDuck explanation:
    https://github.com/DoubleSymmetry/react-native-track-player/issues/1263

    alwaysPauseOnInterruption issues on Android:
    https://github.com/DoubleSymmetry/react-native-track-player/issues/1009
  */
  let wasPausedByDuck = false
  PVAudioPlayer.addEventListener('remote-duck', (x: any) => {
    (async () => {
      console.log('remote-duck', x)
      const { paused, permanent } = x
      const currentState = await audioGetState()
      const isPlaying = audioCheckIfIsPlaying(currentState)
      if (permanent && isPlaying) {
        audioHandleStop()
      } else if (isPlaying && paused) {
        wasPausedByDuck = true
        audioHandlePauseWithUpdate()
      } else if (!permanent && wasPausedByDuck) {
        wasPausedByDuck = false
        audioHandlePlayWithUpdate()
      }
    })()
  })
}
