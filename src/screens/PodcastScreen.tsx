import AsyncStorage from '@react-native-community/async-storage'
import debounce from 'lodash/debounce'
import {
  checkIfContainsStringMatch,
  convertToNowPlayingItem,
  Episode,
  getAuthorityFeedUrlFromArray,
  getUsernameAndPasswordFromCredentials
} from 'podverse-shared'
import { Platform, StyleSheet, View as RNView } from 'react-native'
import Dialog from 'react-native-dialog'
import { NavigationStackOptions } from 'react-navigation-stack'
import React, { getGlobal } from 'reactn'
import {
  ActionSheet,
  Button,
  ClipTableCell,
  Divider,
  EpisodeTableCell,
  FlatList,
  NavShareIcon,
  // NavNotificationsIcon,
  NumberSelectorWithText,
  PodcastTableHeader,
  ScrollView,
  SearchBar,
  SwitchWithText,
  TableSectionSelectors,
  Text,
  View
} from '../components'
import { getDownloadedEpisodeLimit, setDownloadedEpisodeLimit } from '../lib/downloadedEpisodeLimiter'
import { removeDownloadedPodcast } from '../lib/downloadedPodcast'
import { downloadEpisode } from '../lib/downloader'
import { getSelectedFilterLabel, getSelectedSortLabel } from '../lib/filters'
import { translate } from '../lib/i18n'
import { alertIfNoNetworkConnection, hasValidNetworkConnection } from '../lib/network'
import { getStartPodcastFromTime } from '../lib/startPodcastFromTime'
import { safeKeyExtractor, safelyUnwrapNestedVariable } from '../lib/utility'
import { PV } from '../resources'
import { updateAutoQueueSettings } from '../state/actions/autoQueue'
import PVEventEmitter from '../services/eventEmitter'
import { getEpisodesAndLiveItems } from '../services/liveItem'
import { getMediaRefs } from '../services/mediaRef'
import {
  getPodcastCredentials,
  getAddByRSSPodcastLocally,
  removePodcastCredentials,
  savePodcastCredentials
} from '../services/parser'
import { getPodcast } from '../services/podcast'
import { getHistoryItemIndexInfoForEpisode } from '../services/userHistoryItem'
import * as DownloadState from '../state/actions/downloads'
import { clearEpisodesCountForPodcast } from '../state/actions/newEpisodesCount'
import { checkIfNotificationsEnabledForPodcastId } from '../state/actions/notifications'
import { toggleAddByRSSPodcastFeedUrl } from '../state/actions/parser'
import { toggleSubscribeToPodcast } from '../state/actions/podcast'
import { core } from '../styles'
import { HistoryIndexListenerScreen } from './HistoryIndexListenerScreen'

type Props = {
  navigation?: any
}

type State = {
  downloadedEpisodeLimit?: string | null
  endOfResultsReached: boolean
  flatListData: any[]
  flatListDataTotalCount: number | null
  hasInternetConnection: boolean
  isLoadingMore: boolean
  isRefreshing: boolean
  isSubscribing: boolean
  limitDownloadedEpisodes: boolean
  password: string
  podcast?: any
  podcastId?: string
  queryPage: number
  querySort: string | null
  searchBarText: string
  selectedFilterLabel?: string | null
  selectedSortLabel?: string | null
  selectedItem?: any
  showActionSheet: boolean
  showDeleteDownloadedEpisodesDialog?: boolean
  showNoInternetConnectionMessage?: boolean
  showSettings: boolean
  showUsernameAndPassword: boolean
  startPodcastFromTime?: number
  username: string
  viewType: string | null
}

type RenderItemArg = { item: any; index: number }

const testIDPrefix = 'podcast_screen'

const getScreenTitle = () => {
  const { appMode } = getGlobal()
  let screenTitle = translate('Podcast')

  if (appMode === PV.AppMode.videos) {
    screenTitle = translate('Channel')
  }

  return screenTitle
}

const getSearchPlaceholder = (viewType: string) => {
  const { appMode } = getGlobal()
  let searchPlaceholder = translate('Search episodes')

  if (viewType === PV.Filters._clipsKey) {
    searchPlaceholder = translate('Search clips')
  } else {
    if (appMode === PV.AppMode.videos) {
      searchPlaceholder = translate('Search videos')
    }
  }

  return searchPlaceholder
}

const getDefaultSelectedFilterLabel = () => {
  const { appMode } = getGlobal()
  let defaultSelectedFilterLabel = translate('Episodes')

  if (appMode === PV.AppMode.videos) {
    defaultSelectedFilterLabel = translate('Videos')
  }

  return defaultSelectedFilterLabel
}

export class PodcastScreen extends HistoryIndexListenerScreen<Props, State> {
  shouldLoad: boolean
  listRef = null

  constructor(props: Props) {
    super(props)

    this.shouldLoad = true

    const podcast = this.props.navigation.getParam('podcast')
    const podcastId = podcast?.id || podcast?.addByRSSPodcastFeedUrl || this.props.navigation.getParam('podcastId')
    const viewType = this.props.navigation.getParam('viewType') || PV.Filters._episodesKey
    const notificationsEnabled = checkIfNotificationsEnabledForPodcastId(podcastId)

    if (podcast?.id || podcast?.addByRSSPodcastFeedUrl) {
      this.props.navigation.setParams({
        podcastId,
        podcastTitle: podcast.title,
        addByRSSPodcastFeedUrl: podcast.addByRSSPodcastFeedUrl,
        notificationsEnabled
      })
    } else if (podcastId) {
      this.props.navigation.setParams({
        podcastId,
        notificationsEnabled
      })
    }

    this.state = {
      downloadedEpisodeLimit: null,
      endOfResultsReached: false,
      flatListData: [],
      flatListDataTotalCount: null,
      hasInternetConnection: false,
      isLoadingMore: true,
      isRefreshing: false,
      isSubscribing: false,
      limitDownloadedEpisodes: false,
      password: '',
      podcast,
      podcastId,
      queryPage: 1,
      querySort: PV.Filters._mostRecentKey,
      searchBarText: '',
      selectedFilterLabel: getDefaultSelectedFilterLabel(),
      selectedSortLabel: translate('recent'),
      showActionSheet: false,
      showSettings: false,
      showUsernameAndPassword: false,
      username: '',
      viewType
    }

    this._handleSearchBarTextQuery = debounce(this._handleSearchBarTextQuery, PV.SearchBar.textInputDebounceTime)
  }

  static navigationOptions = ({ navigation }) => {
    const podcastId = navigation.getParam('podcastId')
    const podcastTitle = navigation.getParam('podcastTitle')
    // const notificationsEnabled = navigation.getParam('notificationsEnabled')
    const addByRSSPodcastFeedUrl = navigation.getParam('addByRSSPodcastFeedUrl')

    return {
      title: getScreenTitle(),
      headerRight: () => (
        <RNView style={core.row}>
          {/* {
            !addByRSSPodcastFeedUrl && (
              <NavNotificationsIcon
                podcastId={podcastId}
                isEnabled={notificationsEnabled}
                onNotificationSelectionChanged={
                  () => navigation.setParams({ notificationsEnabled: !notificationsEnabled })
                }
              />
            )
          } */}
          {!addByRSSPodcastFeedUrl && (
            <NavShareIcon
              endingText={translate('shared using brandName')}
              podcastTitle={podcastTitle}
              urlId={podcastId}
              urlPath={PV.URLs.webPaths.podcast}
            />
          )}
          {/* <NavSearchIcon navigation={navigation} /> */}
        </RNView>
      )
    } as NavigationStackOptions
  }

  async componentDidMount() {
    super.componentDidMount()

    const { navigation } = this.props
    const { podcastId } = this.state
    let podcast = navigation.getParam('podcast')
    const forceRequest = navigation.getParam('forceRequest')
    const addByRSSPodcastFeedUrl = this.props.navigation.getParam('addByRSSPodcastFeedUrl')
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    PVEventEmitter.on(PV.Events.PODCAST_START_PODCAST_FROM_TIME_SET, this.refreshStartPodcastFromTime)

    await clearEpisodesCountForPodcast(podcastId || addByRSSPodcastFeedUrl)

    const hasInternetConnection = await hasValidNetworkConnection()

    // If passed the addByRSSPodcastFeedUrl in the navigation,
    // use the podcast from local storage.
    if (addByRSSPodcastFeedUrl) {
      podcast = await getAddByRSSPodcastLocally(addByRSSPodcastFeedUrl)
    } else if (!hasInternetConnection && podcastId) {
      podcast = await getPodcast(podcastId, forceRequest)
    }

    this.refreshStartPodcastFromTime()

    this.setState(
      {
        ...(!hasInternetConnection
          ? {
              viewType: PV.Filters._downloadedKey
            }
          : { viewType: this.state.viewType }),
        podcast,
        hasInternetConnection: !!hasInternetConnection
      },
      () => {
        this._initializePageData()
      }
    )
  }

  async _initializePageData() {
    const { navigation } = this.props
    const { podcast, viewType } = this.state
    const podcastId = navigation.getParam('podcastId') || this.state.podcastId
    const downloadedEpisodeLimit = await getDownloadedEpisodeLimit(podcastId)

    this.setState(
      {
        downloadedEpisodeLimit,
        endOfResultsReached: false,
        flatListData: [],
        flatListDataTotalCount: null,
        isLoadingMore: true,
        limitDownloadedEpisodes: downloadedEpisodeLimit && downloadedEpisodeLimit > 0,
        podcastId,
        queryPage: 1
      },
      () => {
        (async () => {
          let newState = {}
          let newPodcast: any

          try {
            if (podcast && podcast.addByRSSPodcastFeedUrl) {
              newPodcast = podcast
              newState.flatListData = podcast.episodes || []
              newState.flatListDataTotalCount = newState.flatListData.length
            } else {
              const forceRequest = navigation.getParam('forceRequest')
              newPodcast = await getPodcast(podcastId, forceRequest)
              if (viewType === PV.Filters._episodesKey) {
                newState = await this._queryData(PV.Filters._episodesKey)
              } else if (viewType === PV.Filters._clipsKey) {
                newState = await this._queryData(PV.Filters._clipsKey)
              }
            }

            newPodcast.description = newPodcast.description || translate('No summary available')

            this.setState(
              {
                ...newState,
                isLoadingMore: false,
                podcast: newPodcast
              },
              () => {
                this._updateCredentialsState()
                // Adding a no time setTimeout for the listref to have populated
                // in the next event loop otherwise, there will be no ref to call scroll to yet
                if (Platform.OS === 'ios') {
                  setTimeout(() => {
                    this.listRef?.scrollToOffset({
                      animated: false,
                      offset: PV.FlatList.ListHeaderHiddenSearchBar.contentOffset.y
                    })
                  })
                }
              }
            )
          } catch (error) {
            console.log('_initializePageData', error)
            this.setState(
              {
                ...newState,
                isLoadingMore: false,
                ...(newPodcast ? { podcast: newPodcast } : { podcast })
              },
              () => {
                this._updateCredentialsState()
              }
            )
          }
        })()
      }
    )
  }

  refreshStartPodcastFromTime = async () => {
    const { podcastId } = this.state
    const startPodcastFromTime = await getStartPodcastFromTime(podcastId)
    this.setState({ startPodcastFromTime })
  }

  handleSelectFilterItem = async (selectedKey: string) => {
    if (!selectedKey) return

    const selectedFilterLabel = await getSelectedFilterLabel(selectedKey)

    this.setState(
      {
        endOfResultsReached: false,
        flatListData: [],
        flatListDataTotalCount: null,
        isLoadingMore: true,
        queryPage: 1,
        searchBarText: '',
        selectedFilterLabel,
        viewType: selectedKey
      },
      () => {
        (async () => {
          const newState = await this._queryData(selectedKey)
          this.setState(newState)
        })()
      }
    )
  }

  handleSelectSortItem = async (selectedKey: string) => {
    if (!selectedKey) return

    const selectedSortLabel = await getSelectedSortLabel(selectedKey)

    this.setState(
      {
        endOfResultsReached: false,
        flatListData: [],
        flatListDataTotalCount: null,
        isLoadingMore: true,
        queryPage: 1,
        querySort: selectedKey,
        selectedSortLabel
      },
      () => {
        (async () => {
          const newState = await this._queryData(selectedKey)
          this.setState(newState)
        })()
      }
    )
  }

  _onEndReached = ({ distanceFromEnd }: { distanceFromEnd: number }) => {
    const { endOfResultsReached, podcast, queryPage = 1, viewType } = this.state

    if (
      !podcast.addByRSSPodcastFeedUrl &&
      viewType !== PV.Filters._downloadedKey &&
      !endOfResultsReached &&
      this.shouldLoad
    ) {
      if (distanceFromEnd > -1) {
        this.shouldLoad = false
        this.setState(
          {
            isLoadingMore: true
          },
          () => {
            (async () => {
              const newState = await this._queryData(viewType, {
                queryPage: queryPage + 1,
                searchTitle: this.state.searchBarText
              })
              this.setState(newState)
            })()
          }
        )
      }
    }
  }

  _onRefresh = () => {
    const { viewType } = this.state
    this.setState(
      {
        isRefreshing: true
      },
      () => {
        (async () => {
          const newState = await this._queryData(viewType, { queryPage: 1 })
          this.setState(newState)
        })()
      }
    )
  }

  _ListHeaderComponent = () => {
    const { searchBarText, viewType, flatListDataTotalCount } = this.state
    const placeholder = getSearchPlaceholder(viewType)
    const shouldShowSearchBar = !!(searchBarText || (flatListDataTotalCount && flatListDataTotalCount > 3))

    return (
      <View style={styles.ListHeaderComponent}>
        {shouldShowSearchBar && (
          <SearchBar
            handleClear={this._handleSearchBarClear}
            hideIcon
            icon='filter'
            noContainerPadding
            onChangeText={this._handleSearchBarTextChange}
            placeholder={placeholder}
            testID={`${testIDPrefix}_filter_bar`}
            value={searchBarText}
          />
        )}
      </View>
    )
  }

  _ItemSeparatorComponent = () => <Divider style={{ marginHorizontal: 10 }} />

  _handleCancelPress = () =>
    new Promise((resolve) => {
      this.setState({ showActionSheet: false }, resolve)
    })

  _handleMorePress = (selectedItem: any) => {
    this.setState({
      selectedItem,
      showActionSheet: true
    })
  }

  _handleDownloadPressed = (selectedItem: any) => {
    const { podcast } = this.state
    if (selectedItem) {
      downloadEpisode(selectedItem, podcast)
    }
  }

  _renderItem = ({ item, index }: RenderItemArg) => {
    const { navigation } = this.props
    const { podcast, viewType } = this.state

    if (viewType === PV.Filters._clipsKey) {
      return (
        item?.episode?.id && (
          <ClipTableCell
            handleMorePress={() => this._handleMorePress(convertToNowPlayingItem(item, null, podcast))}
            hideImage
            item={item}
            navigation={navigation}
            showEpisodeInfo
            showPodcastInfo={false}
            testID={`${testIDPrefix}_clip_item_${index}`}
          />
        )
      )
    } else {
      const episode = {
        ...item,
        podcast
      }

      let testId = ''
      if (viewType === PV.Filters._downloadedKey) {
        testId = `${testIDPrefix}_episode_downloaded_item_${index}`
      } else if (viewType === PV.Filters._episodesKey) {
        testId = `${testIDPrefix}_episode_item_${index}`
      } else if (viewType === PV.Filters._hideCompletedKey) {
        testId = `${testIDPrefix}_episode_hide_completed_item_${index}`
      } else if (viewType === PV.Filters._showCompletedKey) {
        testId = `${testIDPrefix}_episode_completed_item_${index}`
      }
      const { completed, mediaFileDuration, userPlaybackPosition } = getHistoryItemIndexInfoForEpisode(item?.id)

      const { hideCompleted } = this.global
      const shouldHideCompleted =
        (hideCompleted && viewType === PV.Filters._episodesKey && completed) ||
        (!hideCompleted && viewType === PV.Filters._hideCompletedKey && completed)

      return (
        <EpisodeTableCell
          handleDeletePress={() => this._handleDeleteEpisode(item)}
          handleDownloadPress={() => this._handleDownloadPressed(item)}
          handleMorePress={() =>
            this._handleMorePress(convertToNowPlayingItem(item, null, podcast, userPlaybackPosition))
          }
          handleNavigationPress={() => {
            const { hasInternetConnection } = this.state
            this.props.navigation.navigate(PV.RouteNames.EpisodeScreen, {
              episode,
              addByRSSPodcastFeedUrl: podcast.addByRSSPodcastFeedUrl,
              hasInternetConnection
            })
          }}
          hideImage
          item={episode}
          mediaFileDuration={mediaFileDuration}
          navigation={navigation}
          shouldHideCompleted={shouldHideCompleted}
          testID={testId}
          userPlaybackPosition={userPlaybackPosition}
        />
      )
    }
  }

  _handleDeleteEpisode = async (item: any) => {
    const selectedId = item?.episodeId || item?.id
    if (selectedId) {
      await DownloadState.removeDownloadedPodcastEpisode(selectedId)
    }
  }

  _handleToggleDeleteDownloadedEpisodesDialog = () => {
    this.setState({ showDeleteDownloadedEpisodesDialog: !this.state.showDeleteDownloadedEpisodesDialog })
  }

  _handleDeleteDownloadedEpisodes = () => {
    this.setState({ showDeleteDownloadedEpisodesDialog: false }, () => {
      (async () => {
        const { podcast, podcastId } = this.state
        const id = podcast?.id || podcastId
        try {
          await removeDownloadedPodcast(id)
        } catch (error) {
          //
        }
        DownloadState.updateDownloadedPodcasts()
      })()
    })
  }

  _handleSearchBarTextChange = (text: string) => {
    const { viewType } = this.state

    this.setState(
      {
        searchBarText: text
      },
      () => {
        this._handleSearchBarTextQuery(viewType, { searchTitle: text })
      }
    )
  }

  _handleSearchBarTextQuery = (viewType: string | null, queryOptions: any) => {
    this.setState(
      {
        flatListData: [],
        flatListDataTotalCount: null,
        isLoadingMore: true,
        queryPage: 1
      },
      () => {
        (async () => {
          const { podcast } = this.state
          const { addByRSSPodcastFeedUrl } = podcast
          if (addByRSSPodcastFeedUrl) {
            this._handleSearchAddByRSSEpisodes(queryOptions.searchTitle)
          } else {
            const state = await this._queryData(viewType, {
              searchTitle: queryOptions.searchTitle
            })
            this.setState(state)
          }
        })()
      }
    )
  }

  _handleSearchAddByRSSEpisodes = (searchTitle: string) => {
    const { podcast } = this.state
    const episodes = podcast?.episodes || []
    const filteredResult = []
    for (const episode of episodes) {
      if (episode.title && checkIfContainsStringMatch(searchTitle, episode.title)) {
        filteredResult.push(episode)
      }
    }

    this.setState({
      endOfResultsReached: true,
      flatListData: filteredResult,
      flatListDataTotalCount: filteredResult.length,
      isLoadingMore: false
    })
  }

  _handleSearchBarClear = () => {
    this.setState(
      {
        endOfResultsReached: false,
        flatListData: [],
        flatListDataTotalCount: null,
        isLoadingMore: true
      },
      () => {
        this._handleSearchBarTextChange('')
      }
    )
  }

  _toggleSubscribeToPodcast = async () => {
    const { podcast, podcastId } = this.state
    const { addByRSSPodcastFeedUrl } = podcast

    if (podcastId) {
      const wasAlerted = await alertIfNoNetworkConnection(translate('subscribe to podcast'))
      if (wasAlerted) return

      this.setState({ isSubscribing: true }, () => {
        (async () => {
          try {
            if (addByRSSPodcastFeedUrl) {
              await toggleAddByRSSPodcastFeedUrl(podcastId)
            } else {
              await toggleSubscribeToPodcast(podcastId)
            }
            this.setState({ isSubscribing: false })
          } catch (error) {
            this.setState({ isSubscribing: false })
          }

          const downloadedEpisodeLimit = await getDownloadedEpisodeLimit(podcastId)

          this.setState({
            downloadedEpisodeLimit,
            limitDownloadedEpisodes: downloadedEpisodeLimit && downloadedEpisodeLimit > 0
          })
        })()
      })
    }
  }

  _handleToggleAutoDownload = (autoDownloadOn: boolean) => {
    const { podcast, podcastId } = this.state
    const id = podcast?.id || podcastId
    const { addByRSSPodcastFeedUrl } = podcast

    if (addByRSSPodcastFeedUrl) {
      DownloadState.updateAutoDownloadSettingsAddByRSS(addByRSSPodcastFeedUrl, autoDownloadOn)
    } else if (id) {
      DownloadState.updateAutoDownloadSettings(id, autoDownloadOn)
    }
  }

  _handleToggleSettings = () => {
    this.setState({ showSettings: !this.state.showSettings })
  }

  _handleToggleAutoAddToQueue = (autoAddToQueueOn: boolean) => {
    const { podcast, podcastId } = this.state
    const id = podcast?.id || podcastId

    if (id) {
      updateAutoQueueSettings(id, !autoAddToQueueOn)
    }
  }

  _handleToggleLimitDownloads = async () => {
    const { podcastId } = this.state
    if (podcastId) {
      const shouldLimitDownloads = !this.state.limitDownloadedEpisodes
      const globalDownloadedEpisodeLimitCount = (await AsyncStorage.getItem(
        PV.Keys.DOWNLOADED_EPISODE_LIMIT_GLOBAL_COUNT
      )) as any
      setDownloadedEpisodeLimit(podcastId, shouldLimitDownloads ? globalDownloadedEpisodeLimitCount : null)
      this.setState({
        downloadedEpisodeLimit: shouldLimitDownloads ? globalDownloadedEpisodeLimitCount : null,
        limitDownloadedEpisodes: shouldLimitDownloads
      })
    }
  }

  _handleChangeDownloadLimitText = (value: string) => {
    const { podcast } = this.state
    this.setState({ downloadedEpisodeLimit: value })
    const int = parseInt(value, 10)
    if (int && podcast?.id) setDownloadedEpisodeLimit(podcast.id, int)
  }

  _handleNavigateToStartPodcastFromTimeScreen = () => {
    const { navigation } = this.props
    const { podcast, startPodcastFromTime } = this.state
    navigation.navigate(PV.RouteNames.StartPodcastFromTimeScreen, {
      podcast,
      startPodcastFromTime
    })
  }

  _handleToggleUsernameAndPassword = async () => {
    const { showUsernameAndPassword } = this.state
    const newState = !showUsernameAndPassword

    if (!newState) {
      await this._handleClearPodcastCredentials()

      this.setState({
        password: '',
        showUsernameAndPassword: newState,
        username: ''
      })
    } else {
      const { password = '', username = '' } = await this._getCredentials()
      this.setState({
        password,
        showUsernameAndPassword: newState,
        username
      })
    }
  }

  _updateCredentialsState = () => {
    (async () => {
      const { username, password } = await this._getCredentials()
      this.setState({
        username,
        password,
        showUsernameAndPassword: !!username && !!password
      })
    })()
  }

  _getFinalFeedUrl = () => {
    const { podcast } = this.state
    const feedUrlObjects = podcast.feedUrls
    return this.props.navigation.getParam('addByRSSPodcastFeedUrl') || getAuthorityFeedUrlFromArray(feedUrlObjects)
  }

  _getCredentials = async () => {
    const finalFeedUrl = this._getFinalFeedUrl()
    const credentials = await getPodcastCredentials(finalFeedUrl)
    return getUsernameAndPasswordFromCredentials(credentials)
  }

  _handleClearPodcastCredentials = async () => {
    const finalFeedUrl = this._getFinalFeedUrl()
    if (finalFeedUrl) {
      await removePodcastCredentials(finalFeedUrl)
    }
  }

  _handleSavePodcastCredentials = () => {
    const { password, showUsernameAndPassword, username } = this.state
    const finalFeedUrl = this._getFinalFeedUrl()

    if (finalFeedUrl) {
      this.setState({ isLoadingMore: true }, () => {
        (async () => {
          try {
            if (showUsernameAndPassword && username && password) {
              const credentials = `${username}:${password}`
              await savePodcastCredentials(finalFeedUrl, credentials)
            } else {
              await removePodcastCredentials(finalFeedUrl)
            }
            this.setState({
              isLoadingMore: false,
              showSettings: false
            })
          } catch (error) {
            console.log('_handleSavePodcastByRSSURL', error)
            this.setState({
              isLoadingMore: false,
              showSettings: false
            })
          }
        })()
      })
    }
  }

  _handleNavigateToPodcastInfoScreen = () => {
    const { navigation } = this.props
    const { podcast } = this.state
    navigation.navigate(PV.RouteNames.PodcastInfoScreen, { podcast })
  }

  render() {
    const { navigation } = this.props

    const {
      downloadedEpisodeLimit,
      isLoadingMore,
      isRefreshing,
      isSubscribing,
      limitDownloadedEpisodes,
      password,
      podcast,
      podcastId,
      querySort,
      searchBarText,
      selectedFilterLabel,
      selectedSortLabel,
      selectedItem,
      showActionSheet,
      showDeleteDownloadedEpisodesDialog,
      showNoInternetConnectionMessage,
      showSettings,
      showUsernameAndPassword,
      startPodcastFromTime,
      username,
      viewType
    } = this.state
    const { offlineModeEnabled } = this.global
    const subscribedPodcastIds = safelyUnwrapNestedVariable(() => this.global.session.userInfo.subscribedPodcastIds, [])
    const addByRSSPodcastFeedUrl = this.props.navigation.getParam('addByRSSPodcastFeedUrl')

    let isSubscribed = subscribedPodcastIds.some((x: string) => x === podcastId)
    if (!isSubscribed) {
      const subscribedPodcasts = safelyUnwrapNestedVariable(() => this.global.subscribedPodcasts, [])
      isSubscribed = subscribedPodcasts.some(
        (x: any) => x.addByRSSPodcastFeedUrl && x.addByRSSPodcastFeedUrl === podcastId
      )
    }

    let { flatListData, flatListDataTotalCount } = this.state
    const { autoDownloadSettings, autoQueueSettings } = this.global
    const autoDownloadOn =
      (podcast && podcast.id && autoDownloadSettings[podcast.id]) || (podcastId && autoDownloadSettings[podcastId])
    const autoQueueOn =
      (podcast && podcast.id && autoQueueSettings[podcast.id]) || (podcastId && autoQueueSettings[podcastId])

    if (viewType === PV.Filters._downloadedKey) {
      const { downloadedPodcasts } = this.global
      if (Array.isArray(downloadedPodcasts)) {
        const downloadedPodcast = downloadedPodcasts.find(
          (x: any) => (podcast && x.id && x.id === podcast.id) || (x.id && x.id === podcastId)
        )
        let episodes = downloadedPodcast?.episodes || []
        if (searchBarText) {
          episodes = episodes.filter(
            (episode: Episode) => episode?.title && checkIfContainsStringMatch(searchBarText, episode.title)
          )
        }

        flatListData = episodes
        flatListDataTotalCount = flatListData.length
      }
    }

    const noResultsMessage =
      (viewType === PV.Filters._downloadedKey && translate('No episodes found')) ||
      ((viewType === PV.Filters._episodesKey ||
        viewType === PV.Filters._hideCompletedKey ||
        viewType === PV.Filters._showCompletedKey) &&
        translate('No episodes found')) ||
      (viewType === PV.Filters._clipsKey && translate('No clips found'))

    return (
      <View style={styles.headerView} testID={`${testIDPrefix}_view`}>
        <PodcastTableHeader
          autoDownloadOn={autoDownloadOn}
          description={podcast && podcast.description}
          handleNavigateToPodcastInfoScreen={this._handleNavigateToPodcastInfoScreen}
          handleToggleAutoDownload={this._handleToggleAutoDownload}
          handleToggleSettings={this._handleToggleSettings}
          handleToggleSubscribe={this._toggleSubscribeToPodcast}
          isLoading={isLoadingMore && !podcast}
          isNotFound={!isLoadingMore && !podcast}
          isSubscribed={isSubscribed}
          isSubscribing={isSubscribing}
          podcastImageUrl={podcast && (podcast.shrunkImageUrl || podcast.imageUrl)}
          podcastTitle={podcast && podcast.title}
          showSettings={showSettings}
          testID={testIDPrefix}
        />
        {!showSettings ? (
          <TableSectionSelectors
            addByRSSPodcastFeedUrl={addByRSSPodcastFeedUrl}
            filterScreenTitle={getScreenTitle()}
            handleSelectFilterItem={this.handleSelectFilterItem}
            handleSelectSortItem={this.handleSelectSortItem}
            includePadding
            navigation={navigation}
            screenName='PodcastScreen'
            selectedFilterItemKey={viewType}
            selectedFilterLabel={selectedFilterLabel}
            selectedSortItemKey={querySort}
            selectedSortLabel={selectedSortLabel}
            testID={testIDPrefix}
          />
        ) : (
          <ScrollView style={styles.settingsView}>
            <Text accessibilityRole='header' style={styles.settingsTitle}>
              {translate('Settings')}
            </Text>
            {!podcast?.addByRSSPodcastFeedUrl && (
              <SwitchWithText
                accessibilityLabel={translate('Automatically add new episodes to queue')}
                onValueChange={() => this._handleToggleAutoAddToQueue(autoQueueOn)}
                testID={`${testIDPrefix}_auto_add_to_queue`}
                text={translate('Automatically add new episodes to queue')}
                value={autoQueueOn}
                wrapperStyle={styles.toggleAutoQueueSwitchWrapper}
              />
            )}
            <SwitchWithText
              accessibilityHint={
                limitDownloadedEpisodes
                  ? translate('ARIA HINT - disable the downloaded episode limit for this podcast')
                  : translate('ARIA HINT - limit the number of episodes from this podcast to save on your device')
              }
              accessibilityLabel={
                limitDownloadedEpisodes ? translate('Download limit on') : translate('Download limit off')
              }
              onValueChange={this._handleToggleLimitDownloads}
              testID={`${testIDPrefix}_toggle_download_limit`}
              text={translate('Download limit')}
              value={limitDownloadedEpisodes}
              wrapperStyle={styles.toggleLimitDownloadsSwitchWrapper}
            />
            {limitDownloadedEpisodes && (
              <View style={styles.itemWrapper}>
                <NumberSelectorWithText
                  accessibilityHint={`${translate(
                    'ARIA HINT - set the maximum number of downloaded episodes to save from this podcast on your device'
                  )},${translate(
                    // eslint-disable-next-line max-len
                    'Limit the number of downloaded episodes from this podcast on your device. Once the download limit is exceeded the oldest episode will be automatically deleted.'
                  )}`}
                  accessibilityLabel={`${translate('Download limit max')} ${
                    !!downloadedEpisodeLimit ? downloadedEpisodeLimit : ''
                  }`}
                  handleChangeText={this._handleChangeDownloadLimitText}
                  selectedNumber={downloadedEpisodeLimit}
                  subText={translate(
                    // eslint-disable-next-line max-len
                    'Limit the number of downloaded episodes from this podcast on your device. Once the download limit is exceeded the oldest episode will be automatically deleted.'
                  )}
                  testID={`${testIDPrefix}_downloaded_episode_limit_count`}
                  text={translate('Download limit max')}
                />
              </View>
            )}
            <View style={styles.itemWrapper}>
              <NumberSelectorWithText
                accessibilityHint={translate(
                  'ARIA HINT - set the time you want this episode to always start playing from'
                )}
                accessibilityLabel={translate('Preset podcast start time')}
                editable={false}
                isHHMMSS
                selectedNumber={startPodcastFromTime}
                subText={translate('Episodes from this podcast will start playback from this time')}
                testID={`${testIDPrefix}_start_podcast_from_time`}
                text={translate('Preset podcast start time')}
                textInputOnPress={this._handleNavigateToStartPodcastFromTimeScreen}
                textInputStyle={{ width: 76 }}
                wrapperOnPress={this._handleNavigateToStartPodcastFromTimeScreen}
              />
            </View>
            {(addByRSSPodcastFeedUrl || podcast?.credentialsRequired) && (
              <View style={styles.switchWrapper}>
                <SwitchWithText
                  accessibilityHint={translate('ARIA HINT - type a username and password for this feed')}
                  accessibilityLabel={translate('Include username and password')}
                  inputAutoCorrect={false}
                  inputEditable
                  inputEyebrowTitle={translate('Username')}
                  inputHandleTextChange={(text?: string) => this.setState({ username: text || '' })}
                  inputPlaceholder={translate('Username')}
                  inputShow={!!showUsernameAndPassword}
                  inputText={username}
                  input2AutoCorrect={false}
                  input2Editable
                  input2EyebrowTitle={translate('Password')}
                  input2HandleTextChange={(text?: string) => this.setState({ password: text || '' })}
                  input2Placeholder={translate('Password')}
                  input2Show={!!showUsernameAndPassword}
                  input2Text={password}
                  onValueChange={this._handleToggleUsernameAndPassword}
                  subText={!!showUsernameAndPassword ? translate('If this is a password protected feed') : ''}
                  subTextAccessible
                  text={translate('Include username and password')}
                  testID={`${testIDPrefix}_include_username_and_password`}
                  value={!!showUsernameAndPassword}
                />
                {!!showUsernameAndPassword && (
                  <Button
                    accessibilityLabel={translate('Save Password')}
                    isSuccess
                    onPress={this._handleSavePodcastCredentials}
                    wrapperStyles={styles.settingsSavePasswordButton}
                    testID={`${testIDPrefix}_save_password`}
                    text={translate('Save Password')}
                  />
                )}
              </View>
            )}
            <Divider style={styles.divider} />
            <Button
              accessibilityHint={translate('ARIA HINT - delete all the episodes you have downloaded for this podcast')}
              accessibilityLabel={translate('Delete Downloaded Episodes')}
              onPress={this._handleToggleDeleteDownloadedEpisodesDialog}
              wrapperStyles={styles.settingsDeletebutton}
              testID={`${testIDPrefix}_delete_downloaded_episodes`}
              text={translate('Delete Downloaded Episodes')}
            />
          </ScrollView>
        )}
        {!showSettings && (
          <View style={styles.view}>
            {flatListData && podcast && (
              <FlatList
                data={flatListData}
                dataTotalCount={flatListDataTotalCount}
                disableNoResultsMessage={isLoadingMore}
                disableLeftSwipe={viewType !== PV.Filters._downloadedKey}
                extraData={flatListData}
                isLoadingMore={isLoadingMore}
                isRefreshing={isRefreshing}
                ItemSeparatorComponent={this._ItemSeparatorComponent}
                keyExtractor={(item: any, index: number) => safeKeyExtractor(testIDPrefix, index, item?.id)}
                ListHeaderComponent={this._ListHeaderComponent}
                noResultsMessage={noResultsMessage}
                onEndReached={this._onEndReached}
                renderItem={this._renderItem}
                listRef={(ref) => (this.listRef = ref)}
                showNoInternetConnectionMessage={showNoInternetConnectionMessage}
              />
            )}
            <ActionSheet
              handleCancelPress={this._handleCancelPress}
              items={() =>
                PV.ActionSheet.media.moreButtons(
                  selectedItem,
                  navigation,
                  {
                    handleDismiss: this._handleCancelPress,
                    handleDownload: this._handleDownloadPressed,
                    includeGoToEpisodeInCurrentStack: true
                  },
                  viewType === PV.Filters._clipsKey ? 'clip' : 'episode'
                )
              }
              showModal={showActionSheet}
              testID={testIDPrefix}
            />
          </View>
        )}
        <Dialog.Container visible={showDeleteDownloadedEpisodesDialog}>
          <Dialog.Title>{translate('Delete Downloaded Episodes')}</Dialog.Title>
          <Dialog.Description>
            {translate('Are you sure you want to delete all of your downloaded episodes from this podcast')}
          </Dialog.Description>
          <Dialog.Button
            label={translate('No')}
            onPress={this._handleToggleDeleteDownloadedEpisodesDialog}
            testID={'dialog_delete_downloaded_episodes_no'.prependTestId()}
          />
          <Dialog.Button
            label={translate('Yes')}
            onPress={this._handleDeleteDownloadedEpisodes}
            testID={'dialog_delete_downloaded_episodes_yes'.prependTestId()}
          />
        </Dialog.Container>
      </View>
    )
  }

  _queryEpisodes = async (sort: string | null, page = 1) => {
    const { podcastId, searchBarText: searchTitle } = this.state
    const results = await getEpisodesAndLiveItems(
      {
        sort,
        page,
        podcastId,
        ...(searchTitle ? { searchTitle } : {})
      },
      podcastId
    )

    const { combinedEpisodes } = results
    return combinedEpisodes
  }

  _queryClips = async (sort: string | null, page = 1) => {
    const { podcastId, searchBarText: searchTitle } = this.state
    const results = await getMediaRefs({
      sort,
      page,
      podcastId,
      includeEpisode: true,
      ...(searchTitle ? { searchTitle } : {})
    })
    return results
  }

  _queryData = async (filterKey: string | null, queryOptions: { queryPage?: number; searchTitle?: string } = {}) => {
    const { flatListData, podcast, querySort, viewType } = this.state
    const newState = {
      isLoadingMore: false,
      isRefreshing: false,
      showNoInternetConnectionMessage: false
    } as State

    const hasInternetConnection = await hasValidNetworkConnection()

    if (!hasInternetConnection && filterKey !== PV.Filters._downloadedKey) {
      newState.showNoInternetConnectionMessage = true
      this.shouldLoad = true
      return newState
    }

    try {
      if (
        (filterKey === PV.Filters._episodesKey ||
          filterKey === PV.Filters._hideCompletedKey ||
          filterKey === PV.Filters._showCompletedKey) &&
        podcast &&
        podcast.addByRSSPodcastFeedUrl
      ) {
        newState.flatListData = podcast.episodes || []
        newState.flatListData = this.cleanFlatListData(newState.flatListData, filterKey)
        newState.flatListDataTotalCount = newState.flatListData.length
      } else if (
        filterKey === PV.Filters._episodesKey ||
        filterKey === PV.Filters._hideCompletedKey ||
        filterKey === PV.Filters._showCompletedKey
      ) {
        const results = await this._queryEpisodes(querySort, queryOptions.queryPage)
        newState.flatListData = [...flatListData, ...results[0]]
        newState.flatListData = this.cleanFlatListData(newState.flatListData, filterKey)
        newState.endOfResultsReached = newState.flatListData.length >= results[1]
        newState.flatListDataTotalCount = results[1]
      } else if (filterKey === PV.Filters._clipsKey) {
        const results = await this._queryClips(querySort, queryOptions.queryPage)
        newState.flatListData = [...flatListData, ...results[0]]
        newState.flatListData = this.cleanFlatListData(newState.flatListData, filterKey)
        newState.endOfResultsReached = newState.flatListData.length >= results[1]
        newState.flatListDataTotalCount = results[1]
      } else if (PV.FilterOptions.screenFilters.PodcastScreen.sort.some((option) => option === filterKey)) {
        let results = []

        if (
          viewType === PV.Filters._episodesKey ||
          viewType === PV.Filters._hideCompletedKey ||
          viewType === PV.Filters._showCompletedKey
        ) {
          results = await this._queryEpisodes(querySort)
        } else if (viewType === PV.Filters._clipsKey) {
          results = await this._queryClips(querySort)
        }

        newState.flatListData = [...flatListData, ...results[0]]
        newState.flatListData = this.cleanFlatListData(newState.flatListData, viewType)
        newState.endOfResultsReached = newState.flatListData.length >= results[1]
        newState.flatListDataTotalCount = results[1]
      }
      newState.queryPage = queryOptions.queryPage || 1

      newState.selectedFilterLabel = await getSelectedFilterLabel(viewType)
    } catch (error) {
      console.log('PodcastScreen queryData error:', error)
    }
    this.shouldLoad = true

    return newState
  }

  cleanFlatListData = (flatListData: any[], viewTypeKey: string | null) => {
    if (
      viewTypeKey === PV.Filters._episodesKey ||
      viewTypeKey === PV.Filters._hideCompletedKey ||
      viewTypeKey === PV.Filters._showCompletedKey
    ) {
      return flatListData?.filter((item: any) => !!item?.id) || []
    } else if (viewTypeKey === PV.Filters._clipsKey) {
      return flatListData?.filter((item: any) => !!item?.episode?.id) || []
    } else {
      return flatListData
    }
  }
}

const styles = StyleSheet.create({
  aboutView: {
    margin: 8
  },
  aboutViewText: {
    fontSize: PV.Fonts.sizes.lg
  },
  divider: {
    marginBottom: 24,
    marginTop: 12
  },
  itemWrapper: {
    marginTop: 32
  },
  settingsDeletebutton: {
    margin: 8,
    borderRadius: 8
  },
  settingsHelpText: {
    fontSize: PV.Fonts.sizes.md
  },
  settingsSavePasswordButton: {
    marginHorizontal: 8,
    marginTop: 24
  },
  settingsTitle: {
    fontSize: PV.Fonts.sizes.xxl,
    fontWeight: PV.Fonts.weights.bold,
    marginBottom: 16
  },
  settingsView: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 16
  },
  swipeRowBack: {
    marginBottom: 8,
    marginTop: 8
  },
  switchWrapper: {
    marginBottom: 12,
    marginTop: 28
  },
  toggleLimitDownloadsSwitchWrapper: {
    marginTop: 4
  },
  toggleAutoQueueSwitchWrapper: {
    marginBottom: 24,
    marginTop: 4
  },
  ListHeaderComponent: {
    paddingTop: 15
  },
  view: {
    flex: 1,
    borderTopColor: PV.Colors.grayLight,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  headerView: {
    flex: 1
  }
})
