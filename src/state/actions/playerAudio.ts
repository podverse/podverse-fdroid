import { checkIfVideoFileOrVideoLiveType, NowPlayingItem } from 'podverse-shared'
import { getGlobal, setGlobal } from 'reactn'
import {
  audioInitializePlayerQueue as audioInitializePlayerQueueService,
  audioPlayNextFromQueue as audioPlayNextFromQueueService
} from '../../services/playerAudio'
import { playerLoadNowPlayingItem } from './player'
import { getQueueItems } from './queue'

export const audioInitializePlayerQueue = async (item: NowPlayingItem) => {
  await audioInitializePlayerQueueService(item)

  if (item && !checkIfVideoFileOrVideoLiveType(item?.episodeMediaType)) {
    const shouldPlay = false
    const forceUpdateOrderDate = false
    const setCurrentItemNextInQueue = true
    await playerLoadNowPlayingItem(item, shouldPlay, forceUpdateOrderDate, setCurrentItemNextInQueue)
  }

  const globalState = getGlobal()
  setGlobal({
    screenPlayer: {
      ...globalState.screenPlayer,
      isLoading: false,
      liveStreamWasPaused: false
    }
  })
}

export const audioPlayNextFromQueue = async () => {
  await audioPlayNextFromQueueService()
  await getQueueItems()
}
