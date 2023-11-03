// For mappings of key integer definitions, visit
// https://github.com/satoshisstream/satoshis.stream/blob/main/TLV_registry.md#field-7629169

// 7629169: SatoshiStreamStatsPodcast // the "podcast" subject according to SatoshiStream spec
// 7629175: SatoshiStreamStatsPodcastIndexId // the Podcast Index feedId for the podcast

import { SatoshiStreamStats } from 'podverse-shared'
import Config from 'react-native-config'
import { v4vGetSenderInfo } from '../services/v4v/v4v'
import { translate } from './i18n'
const uuidv4 = require('uuid/v4')

// For more info about blip-0010 TLV records visit:
// https://github.com/Podcastindex-org/podcast-namespace/blob/main/value/blip-0010.md?plain=1

export const createSatoshiStreamStats = async (
  podcastTitle: string,
  episodeTitle: string,
  podcastIndexPodcastId: string,
  currentPlaybackPosition: string,
  action: string,
  speed: string,
  pubkey: string,
  totalBatchedAmount: number,
  name: string,
  customKey: string,
  customValue: string,
  episode_guid: string,
  recipientAmount: number,
  remote_feed_guid?: string,
  remote_item_guid?: string,
  guid?: string, // podcast guid
) => {
  /* TLV records have a limit */
  const podcast = (podcastTitle || translate('Untitled Podcast')).substring(0, 60)
  const episode = (episodeTitle || translate('Untitled Episode')).substring(0, 60)
  const podcastIndexId = (podcastIndexPodcastId && parseInt(podcastIndexPodcastId, 10)) || null
  const ts = parseInt(currentPlaybackPosition, 10)

  // Use await and grab from AsyncStorage because there seems to be a race-condition where
  // the senderName gets passed as "Anonymous" if we grab senderName from globalState,
  // even though the global.session.v4v.senderInfo.name field should have been set.
  const senderInfo = await v4vGetSenderInfo()
  const { name: senderName } = senderInfo

  return {
    '7629169': {
      podcast,
      feedID: podcastIndexId,
      episode,
      episode_guid,
      ts,
      action,
      speed,
      pubkey,
      value_msat_total: totalBatchedAmount * 1000,
      uuid: uuidv4(),
      app_name: Config.USER_AGENT_PREFIX,
      app_version: Config.FDROID_VERSION,
      name,
      sender_name: senderName,
      ...(remote_feed_guid ? { remote_feed_guid } : {}),
      ...(remote_item_guid ? { remote_item_guid } : {}),
      ...(guid ? { guid } : {})
      // 7629169 "message" added elsewhere in app-logic
    },
    '7629175': podcastIndexId,
    ...(customKey ? { [customKey]: customValue } : {})
  } as SatoshiStreamStats
}
