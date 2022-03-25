import { convertNowPlayingItemToMediaRef } from 'podverse-shared'
import { StyleSheet, View as RNView } from 'react-native'
import { Config } from 'react-native-config'
import Share from 'react-native-share'
import { NavigationStackOptions } from 'react-navigation-stack'
import React, { getGlobal, setGlobal } from 'reactn'
import { clearTempMediaRef } from '../state/actions/mediaRef'
import {
  ActionSheet,
  MediaPlayerCarousel,
  NavAddToPlaylistIcon,
  NavDismissIcon,
  NavFundingIcon,
  NavMakeClipIcon,
  NavQueueIcon,
  NavShareIcon,
  PlayerControls,
  View
} from '../components'
import { translate } from '../lib/i18n'
import { hasValidNetworkConnection } from '../lib/network'
import {
  overrideImageUrlWithChapterImageUrl,
  prefixClipLabel,
  replaceLinebreaksWithBrTags,
  safelyUnwrapNestedVariable
} from '../lib/utility'
import { PV } from '../resources'
import { getEpisode } from '../services/episode'
import PVEventEmitter from '../services/eventEmitter'
import { playerGetPosition, playerUpdateUserPlaybackPosition } from '../services/player'
import { loadChaptersForEpisode } from '../state/actions/playerChapters'
import { checkIfVideoFileType } from '../state/actions/playerVideo'
import { getHistoryItems } from '../state/actions/userHistoryItem'
import { core } from '../styles'

type Props = {
  navigation?: any
}

const testIDPrefix = 'player_screen'

let eventListenerPlayerNewEpisodeLoaded: any
export class PlayerScreen extends React.Component<Props> {
  constructor(props: Props) {
    super(props)

    this.state = {}
  }

  static navigationOptions = ({ navigation }) => {
    const _getEpisodeId = navigation.getParam('_getEpisodeId')
    const _getMediaRefId = navigation.getParam('_getMediaRefId')
    const _showShareActionSheet = navigation.getParam('_showShareActionSheet')
    const _getInitialProgressValue = navigation.getParam('_getInitialProgressValue')
    const addByRSSPodcastFeedUrl = navigation.getParam('addByRSSPodcastFeedUrl')

    const { globalTheme, player, podcastValueFinal } = getGlobal()

    // nowPlayingItem will be undefined when loading from a deep link
    let { nowPlayingItem } = player
    nowPlayingItem = nowPlayingItem || {}

    const { episodeFunding, episodeValue, podcastFunding, podcastValue } = nowPlayingItem

    const showFundingIcon =
      podcastFunding?.length > 0 ||
      episodeFunding?.length > 0 ||
      (Config.ENABLE_VALUE_TAG_TRANSACTIONS && podcastValueFinal?.length > 0) ||
      episodeValue?.length > 0 ||
      podcastValue?.length > 0

    return {
      title: '',
      headerStyle: {
        backgroundColor: globalTheme.view.backgroundColor
      },
      headerLeft: () => (
        <NavDismissIcon globalTheme={globalTheme} handlePress={navigation.dismiss} testID={testIDPrefix} />
      ),
      headerRight: () => (
        <RNView style={core.row}>
          {/* Always show NavFundingIcon in dev, otherwise funding tag will be unavailable to Appium tests. */}
          {(!!Config.IS_DEV || !!showFundingIcon) && (
            <NavFundingIcon globalTheme={globalTheme} navigation={navigation} />
          )}
          {!addByRSSPodcastFeedUrl && (
            <RNView style={core.row}>
              <NavMakeClipIcon
                getInitialProgressValue={_getInitialProgressValue}
                globalTheme={globalTheme}
                navigation={navigation}
              />
              <NavAddToPlaylistIcon
                getEpisodeId={_getEpisodeId}
                getMediaRefId={_getMediaRefId}
                globalTheme={globalTheme}
                navigation={navigation}
              />
              <NavShareIcon globalTheme={globalTheme} handlePress={_showShareActionSheet} />
            </RNView>
          )}
          {!checkIfVideoFileType(nowPlayingItem) && (
            <NavQueueIcon globalTheme={globalTheme} isTransparent navigation={navigation} showBackButton />
          )}
        </RNView>
      )
    } as NavigationStackOptions
  }

  async componentDidMount() {
    PVEventEmitter.on(PV.Events.PLAYER_VALUE_ENABLED_ITEM_LOADED, this._handleRefreshNavigationHeader)

    this.props.navigation.setParams({
      _getEpisodeId: this._getEpisodeId,
      _getInitialProgressValue: this._getInitialProgressValue,
      _getMediaRefId: this._getMediaRefId,
      _showShareActionSheet: this._showShareActionSheet
    })

    if (!eventListenerPlayerNewEpisodeLoaded) {
      eventListenerPlayerNewEpisodeLoaded = PVEventEmitter.on(
        PV.Events.PLAYER_NEW_EPISODE_LOADED,
        this._handleNewEpisodeLoaded
      )
    }

    await this._handleUpdateFullEpisode()
  }

  async componentWillUnmount() {
    PVEventEmitter.removeListener(PV.Events.PLAYER_VALUE_ENABLED_ITEM_LOADED, this._handleRefreshNavigationHeader)

    try {
      clearTempMediaRef()
      const skipSetNowPlaying = false
      const shouldAwait = true

      await playerUpdateUserPlaybackPosition(skipSetNowPlaying, shouldAwait)
      await getHistoryItems(1, [])
    } catch (e) {
      console.log('PlayerScreen componentWillUnmount error', e)
    }
  }

  _handleRefreshNavigationHeader = () => {
    console.log('_handleRefreshNavigationHeader')
    this.props.navigation.setParams()
  }

  _handleNewEpisodeLoaded = () => {
    setTimeout(() => {
      this._handleUpdateFullEpisode()
    }, 5000)
  }

  _handleUpdateFullEpisode = async () => {
    const hasInternetConnection = await hasValidNetworkConnection()
    const episode = safelyUnwrapNestedVariable(() => this.global.player.episode, {})
    const podcast = safelyUnwrapNestedVariable(() => this.global.player.episode.podcast, {})

    if (hasInternetConnection && episode?.id && !podcast?.addByRSSPodcastFeedUrl) {
      try {
        const fullEpisode = await getEpisode(episode.id)
        if (fullEpisode && fullEpisode.description) {
          setGlobal({
            player: {
              ...this.global.player,
              episode: fullEpisode
            }
          })
        }
      } catch (error) {
        // do nothing
      }
    }

    loadChaptersForEpisode(episode)
  }

  _getEpisodeId = () => {
    const { nowPlayingItem } = this.global.player
    return nowPlayingItem && nowPlayingItem.episodeId
  }

  _getMediaRefId = () => {
    const { nowPlayingItem } = this.global.player
    return nowPlayingItem && nowPlayingItem.clipId
  }

  _getInitialProgressValue = async () => {
    const initialProgressValue = await playerGetPosition()
    if (initialProgressValue || initialProgressValue === 0) {
      return Math.floor(initialProgressValue)
    } else {
      return 0
    }
  }

  _showShareActionSheet = () => {
    setGlobal({
      screenPlayer: {
        ...this.global.screenPlayer,
        showShareActionSheet: true
      }
    })
  }

  _dismissShareActionSheet = () => {
    setGlobal({
      screenPlayer: {
        ...this.global.screenPlayer,
        showShareActionSheet: false
      }
    })
  }

  _handleShare = async (
    podcastId?: string,
    episodeId?: string,
    mediaRefId?: string,
    mediaRefIsOfficialChapter?: boolean
  ) => {
    let { nowPlayingItem } = this.global.player
    nowPlayingItem = nowPlayingItem || {}
    let url = ''
    let title = ''

    if (podcastId) {
      url = this.global.urlsWeb.podcast + podcastId
      title = `${nowPlayingItem?.podcastTitle}${translate('shared using brandName')}`
    } else if (episodeId) {
      url = this.global.urlsWeb.episode + episodeId
      title = `${nowPlayingItem?.podcastTitle} – ${nowPlayingItem?.episodeTitle} ${translate('shared using brandName')}`
    } else if (mediaRefIsOfficialChapter) {
      url = this.global.urlsWeb.clip + mediaRefId
      title = `${nowPlayingItem.clipTitle ? nowPlayingItem?.clipTitle + ' – ' : translate('Untitled Chapter – ')}`
      title += `${nowPlayingItem?.podcastTitle} – ${nowPlayingItem?.episodeTitle} ${translate(
        'chapter shared using brandName'
      )}`
    } else {
      url = this.global.urlsWeb.clip + mediaRefId
      title = nowPlayingItem.clipTitle ? nowPlayingItem.clipTitle : prefixClipLabel(nowPlayingItem?.episodeTitle)
      title += ` – ${nowPlayingItem?.podcastTitle} – ${nowPlayingItem?.episodeTitle} ${translate(
        'clip shared using brandName'
      )}`
    }

    try {
      await Share.open({
        title,
        subject: title,
        url
      })
    } catch (error) {
      console.log(error)
    }
    this._dismissShareActionSheet()
  }

  render() {
    const { navigation } = this.props
    const { currentChapter, player, screenPlayer } = this.global
    const { episode, nowPlayingItem } = player
    const { showShareActionSheet } = screenPlayer
    let { mediaRef } = player

    if (nowPlayingItem && nowPlayingItem.clipId) {
      mediaRef = convertNowPlayingItemToMediaRef(nowPlayingItem)
    }

    const podcastId = nowPlayingItem ? nowPlayingItem.podcastId : null
    const episodeId = episode?.id || null
    const mediaRefId = mediaRef?.id || null
    const mediaRefIsOfficialChapter = !!mediaRef?.isOfficialChapter

    if (episode?.description) {
      episode.description = replaceLinebreaksWithBrTags(episode.description)
    }

    const hasChapters = episode && episode.chaptersUrl

    const imageUrl = overrideImageUrlWithChapterImageUrl(nowPlayingItem, currentChapter)

    return (
      <React.Fragment>
        <View style={styles.view}>
          <View style={styles.view} transparent testID='player_screen_view'>
            <MediaPlayerCarousel hasChapters={hasChapters} navigation={navigation} />
            <PlayerControls navigation={navigation} />
            <ActionSheet
              handleCancelPress={this._dismissShareActionSheet}
              items={shareActionSheetButtons(
                podcastId,
                episodeId,
                mediaRefId,
                mediaRefIsOfficialChapter,
                this._handleShare
              )}
              message={translate('What link do you want to share?')}
              showModal={showShareActionSheet}
              testID={`${testIDPrefix}_share`}
              title={translate('Share')}
            />
          </View>
        </View>
      </React.Fragment>
    )
  }
}

const shareActionSheetButtons = (
  podcastId: string,
  episodeId: string,
  mediaRefId: string,
  mediaRefIsOfficialChapter: boolean,
  handleShare: any
) => {
  const items = [
    {
      accessibilityHint: translate('ARIA HINT - share this podcast'),
      key: 'podcast',
      text: translate('Podcast'),
      onPress: () => handleShare(podcastId, null, null)
    },
    {
      accessibilityHint: translate('ARIA HINT - share this episode'),
      key: 'episode',
      text: translate('Episode'),
      onPress: () => handleShare(null, episodeId, null)
    }
  ]

  if (mediaRefId) {
    if (mediaRefIsOfficialChapter) {
      items.push({
        accessibilityHint: translate('ARIA HINT - share this chapter'),
        key: 'chapter',
        text: translate('Chapter'),
        onPress: () => handleShare(null, null, mediaRefId, mediaRefIsOfficialChapter)
      })
    } else {
      items.push({
        accessibilityHint: translate('ARIA HINT - share this clip'),
        key: 'clip',
        text: translate('Clip'),
        onPress: () => handleShare(null, null, mediaRefId)
      })
    }
  }

  return items
}

const styles = StyleSheet.create({
  imageBackground: {
    flex: 1
  },
  swipeRowBack: {
    marginBottom: 8,
    marginTop: 8
  },
  view: {
    flex: 1,
    height: 30
  },
  viewBackdrop: {
    flex: 1
  }
})
