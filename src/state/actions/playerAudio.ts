import { NowPlayingItem } from 'podverse-shared'
import { getGlobal, setGlobal } from 'reactn'
import {
  audioInitializePlayerQueue as audioInitializePlayerQueueService,
  audioLoadNowPlayingItem,
  audioPlayNextFromQueue as audioPlayNextFromQueueService
} from '../../services/playerAudio'
import { showMiniPlayer } from './player'
import { checkIfVideoFileType } from './playerVideo'
import { getQueueItems } from './queue'

export const audioInitializePlayerQueue = async (item: NowPlayingItem) => {
  await audioInitializePlayerQueueService(item)

  if (item && !checkIfVideoFileType(item)) {
    const shouldPlay = false
    const forceUpdateOrderDate = false
    await audioLoadNowPlayingItem(item, shouldPlay, forceUpdateOrderDate)
    showMiniPlayer()
  }

  const globalState = getGlobal()
  setGlobal({
    screenPlayer: {
      ...globalState.screenPlayer,
      isLoading: false
    }
  })
}

export const audioPlayNextFromQueue = async () => {
  await audioPlayNextFromQueueService()
  await getQueueItems()
}
