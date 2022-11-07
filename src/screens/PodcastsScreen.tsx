import AsyncStorage from '@react-native-community/async-storage'
import debounce from 'lodash/debounce'
import { convertToNowPlayingItem, createEmailLinkUrl } from 'podverse-shared'
import { Alert, AppState, Linking, Platform, StyleSheet, View as RNView } from 'react-native'
import Config from 'react-native-config'
import Dialog from 'react-native-dialog'
import { NavigationStackOptions } from 'react-navigation-stack'
import React, { getGlobal } from 'reactn'
import {
  Divider,
  FlatList,
  NavPodcastsViewIcon,
  PlayerEvents,
  PodcastTableCell,
  SearchBar,
  SwipeRowBack,
  TableSectionSelectors,
  View
} from '../components'
import { getDownloadedPodcasts } from '../lib/downloadedPodcast'
import { getDefaultSortForFilter, getSelectedFilterLabel, getSelectedSortLabel } from '../lib/filters'
import { translate } from '../lib/i18n'
import { alertIfNoNetworkConnection, hasValidNetworkConnection } from '../lib/network'
import { resetAllAppKeychain } from '../lib/secutity'
import { getAppUserAgent, safeKeyExtractor, setCategoryQueryProperty } from '../lib/utility'
import { PV } from '../resources'
import { v4vAlbyCheckConnectDeepLink } from '../services/v4v/providers/alby'
import { getAutoDownloadsLastRefreshDate, handleAutoDownloadEpisodes } from '../services/autoDownloads'
import { handleAutoQueueEpisodes } from '../services/autoQueue'
import { assignCategoryQueryToState, assignCategoryToStateForSortSelect, getCategoryLabel } from '../services/category'
import { getCustomLaunchScreenKey } from '../services/customLaunchScreen'
import { getEpisode } from '../services/episode'
import PVEventEmitter from '../services/eventEmitter'
import { getMediaRef } from '../services/mediaRef'
import { getAddByRSSPodcastsLocally, parseAllAddByRSSPodcasts } from '../services/parser'
import { playerUpdateUserPlaybackPosition } from '../services/player'
import { audioUpdateTrackPlayerCapabilities } from '../services/playerAudio'
import { getPodcast, getPodcasts } from '../services/podcast'
import { getSavedQueryPodcastsScreenSort, setSavedQueryPodcastsScreenSort } from '../services/savedQueryFilters'
import { getNowPlayingItem, getNowPlayingItemLocally } from '../services/userNowPlayingItem'
import { askToSyncWithNowPlayingItem, getAuthenticatedUserInfoLocally, getAuthUserInfo } from '../state/actions/auth'
import { initAutoQueue } from '../state/actions/autoQueue'
import { downloadedEpisodeDeleteMarked, initDownloads, removeDownloadedPodcast,
  updateDownloadedPodcasts } from '../state/actions/downloads'
import { v4vAlbyHandleConnect } from '../state/actions/v4v/providers/alby'
import { handleUpdateNewEpisodesCount, syncNewEpisodesCountWithHistory } from '../state/actions/newEpisodesCount'
import {
  initializePlayerSettings,
  initializePlayer,
  initPlayerState,
  playerLoadNowPlayingItem,
  playerUpdatePlaybackState,
  playerUpdatePlayerState,
  showMiniPlayer,
  handleNavigateToPlayerScreen
} from '../state/actions/player'
import {
  combineWithAddByRSSPodcasts,
  findCombineWithAddByRSSPodcasts,
  getSubscribedPodcasts,
  removeAddByRSSPodcast,
  toggleSubscribeToPodcast
} from '../state/actions/podcast'
import { updateScreenReaderEnabledState } from '../state/actions/screenReader'
import { initializeSettings } from '../state/actions/settings'
import {
  v4vInitializeConnectedProviders,
  v4vInitializeSenderInfo,
  v4vInitializeSettings,
  v4vInitializeShowLightningIcon
} from '../state/actions/v4v/v4v'
import { core } from '../styles'

type Props = {
  navigation?: any
}

type State = {
  endOfResultsReached: boolean
  flatListData: any[]
  flatListDataTotalCount: number | null
  isInitialLoadFinished: boolean
  isLoadingMore: boolean
  isRefreshing: boolean
  isUnsubscribing: boolean
  queryFrom: string | null
  queryPage: number
  querySort: string | null
  searchBarText: string
  selectedCategory: string | null
  selectedCategorySub: string | null
  selectedFilterLabel?: string | null
  selectedSortLabel?: string | null
  showDataSettingsConfirmDialog: boolean
  showNoInternetConnectionMessage?: boolean
  tempQueryEnabled: boolean
  tempQueryFrom: string | null
  tempQuerySort: string | null
}

const testIDPrefix = 'podcasts_screen'

let isInitialLoad = true

const getScreenTitle = () => {
  const { appMode } = getGlobal()
  let screenTitle = translate('Podcasts')
  if (appMode === PV.AppMode.videos) {
    screenTitle = translate('Channels')
  }
  return screenTitle
}

const getSearchPlaceholder = () => {
  const { appMode } = getGlobal()
  let searchPlaceholder = translate('Search podcasts')
  if (appMode === PV.AppMode.videos) {
    searchPlaceholder = translate('Search channels')
  }
  return searchPlaceholder
}

export class PodcastsScreen extends React.Component<Props, State> {
  shouldLoad: boolean
  _unsubscribe: any | null

  constructor(props: Props) {
    super(props)

    this.shouldLoad = true

    this.state = {
      endOfResultsReached: false,
      flatListData: [],
      flatListDataTotalCount: null,
      isInitialLoadFinished: false,
      isLoadingMore: true,
      isRefreshing: false,
      isUnsubscribing: false,
      queryFrom: null,
      queryPage: 1,
      querySort: null,
      searchBarText: '',
      selectedCategory: null,
      selectedCategorySub: null,
      selectedFilterLabel: translate('Subscribed'),
      showDataSettingsConfirmDialog: false,
      selectedSortLabel: translate('A-Z'),
      tempQueryEnabled: false,
      tempQueryFrom: null,
      tempQuerySort: null
    }

    this._handleSearchBarTextQuery = debounce(this._handleSearchBarTextQuery, PV.SearchBar.textInputDebounceTime)
  }

  static navigationOptions = ({ navigation }) => {
    const _screenTitle = navigation.getParam('_screenTitle')
    return {
      title: _screenTitle,
      headerRight: () => (
        <RNView style={core.row}>
          <NavPodcastsViewIcon />
        </RNView>
      )
    } as NavigationStackOptions
  }

  async componentDidMount() {
    this.props.navigation.setParams({
      _screenTitle: getScreenTitle()
    })

    Linking.getInitialURL().then((initialUrl) => {
      // settimeout here gives a chance to the rest of
      // the app to have finished loading and navigate correctly
      setTimeout(() => {
        if (initialUrl) {
          this._handleOpenURLEvent({ url: initialUrl })
        }
      }, 300)
    })
    Linking.addEventListener('url', this._handleOpenURLEvent)
    AppState.addEventListener('change', this._handleAppStateChange)
    PVEventEmitter.on(PV.Events.ADD_BY_RSS_AUTH_SCREEN_SHOW, this._handleNavigateToAddPodcastByRSSAuthScreen)
    PVEventEmitter.on(PV.Events.NAV_TO_MEMBERSHIP_SCREEN, this._handleNavigateToMembershipScreen)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    PVEventEmitter.on(PV.Events.APP_MODE_CHANGED, this._handleAppModeChanged)
    PVEventEmitter.on(PV.Events.SERVER_MAINTENANCE_MODE, this._handleMaintenanceMode)

    updateScreenReaderEnabledState()

    try {
      const appHasLaunched = await AsyncStorage.getItem(PV.Keys.APP_HAS_LAUNCHED)
      if (!appHasLaunched) {
        await Promise.all([
          AsyncStorage.setItem(PV.Keys.APP_HAS_LAUNCHED, 'true'),
          AsyncStorage.setItem(PV.Keys.AUTO_DELETE_EPISODE_ON_END, 'TRUE'),
          AsyncStorage.setItem(PV.Keys.DOWNLOADED_EPISODE_LIMIT_GLOBAL_COUNT, '5'),
          AsyncStorage.setItem(PV.Keys.PLAYER_MAXIMUM_SPEED, '2.5'),
          AsyncStorage.setItem(PV.Keys.APP_MODE, PV.AppMode.podcasts),
          AsyncStorage.setItem(PV.Keys.PODCASTS_GRID_VIEW_ENABLED, 'TRUE'),
          AsyncStorage.setItem(PV.Keys.REMOTE_SKIP_BUTTONS_TIME_JUMP, 'TRUE'),
          AsyncStorage.setItem(PV.Keys.AUTO_DOWNLOAD_BY_DEFAULT, 'TRUE'),
          resetAllAppKeychain()
        ])

        if (!Config.DISABLE_CRASH_LOGS) {
          await AsyncStorage.setItem(PV.Keys.ERROR_REPORTING_ENABLED, 'TRUE')
        }

        this.setState({
          isLoadingMore: false,
          // Keep this! It normally loads in the _handleTrackingTermsAcknowledged
          // in podverse-rn, but we need to load it here for podverse-fdroid.
          showDataSettingsConfirmDialog: true
        })
      } else {
        this._initializeScreenData()
      }
    } catch (error) {
      isInitialLoad = false
      this.setState({
        isLoadingMore: false
      })
      console.log(error)

      Alert.alert(PV.Alerts.SOMETHING_WENT_WRONG.title, PV.Alerts.SOMETHING_WENT_WRONG.message, PV.Alerts.BUTTONS.OK)
    }

    // this._unsubscribe = navigation.addListener('willFocus', () => {
    //   this._setDownloadedDataIfOffline()
    // })
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange)
    Linking.removeEventListener('url', this._handleOpenURLEvent)
    PVEventEmitter.removeListener(
      PV.Events.ADD_BY_RSS_AUTH_SCREEN_SHOW,
      this._handleNavigateToAddPodcastByRSSAuthScreen
    )
    PVEventEmitter.removeListener(PV.Events.NAV_TO_MEMBERSHIP_SCREEN, this._handleNavigateToMembershipScreen)
    PVEventEmitter.removeListener(PV.Events.APP_MODE_CHANGED, this._handleAppModeChanged)
    PVEventEmitter.removeListener(PV.Events.SERVER_MAINTENANCE_MODE, this._handleMaintenanceMode)
    // this._unsubscribe?.()
  }

  _handleMaintenanceMode = () => {
    const { queryFrom } = this.state

    this.setGlobal(
      {
        isInMaintenanceMode: true
      },
      async () => {
        if (queryFrom !== PV.Filters._downloadedKey) {
          const forceOffline = true
          // Prevent flash of grid view in case the event for _handleMaintenanceMode
          // is called before the app finishes with initializeSettings.
          const podcastsGridViewEnabled = await AsyncStorage.getItem(PV.Keys.PODCASTS_GRID_VIEW_ENABLED)
          this.setGlobal(
            {
              podcastsGridViewEnabled: !!podcastsGridViewEnabled
            },
            () => {
              this._setDownloadedDataIfOffline(forceOffline)
              Alert.alert(PV.Alerts.MAINTENANCE_MODE.title, PV.Alerts.MAINTENANCE_MODE.message, PV.Alerts.BUTTONS.OK)
            }
          )
        }
      }
    )
  }

  _handleAppModeChanged = () => {
    const { queryFrom } = this.state

    if (queryFrom === PV.Filters._episodesKey) {
      this.handleSelectFilterItem(PV.Filters._allPodcastsKey)
    } else {
      this._onRefresh()
    }

    this.props.navigation.setParams({
      _screenTitle: getScreenTitle()
    })
  }

  _setDownloadedDataIfOffline = async (forceOffline?: boolean) => {
    const isConnected = await hasValidNetworkConnection()
    if (!isConnected || forceOffline) {
      const preventIsLoading = false
      const preventAutoDownloading = true
      this.handleSelectFilterItem(PV.Filters._downloadedKey, preventIsLoading, preventAutoDownloading)
    }
  }

  _handleAppStateChange = (nextAppState: any) => {
    (async () => {
      await playerUpdateUserPlaybackPosition()

      if (nextAppState === 'active' && !isInitialLoad) {
        const { nowPlayingItem: lastItem } = this.global.player
        const currentItem = await getNowPlayingItemLocally()

        if (!lastItem || (lastItem && currentItem && currentItem.episodeId !== lastItem.episodeId)) {
          playerUpdatePlayerState(currentItem)
          showMiniPlayer()
        }

        updateDownloadedPodcasts()
        await playerUpdatePlaybackState()
      }

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // NOTE: On iOS PVAudioPlayer.updateOptions must be called every time the app
        // goes into the background to prevent the remote controls from disappearing
        // on the lock screen.
        // Source: https://github.com/react-native-kit/react-native-track-player/issues/921#issuecomment-686806847
        if (Platform.OS === 'ios') {
          audioUpdateTrackPlayerCapabilities()
        }
      }

      updateScreenReaderEnabledState()
    })()
  }

  // This event is apparently not needed in development on iOS simulator,
  // but required to work in production (??? unconfirmed).
  _handleOpenURLEvent = (event: any) => {
    if (event) this._handleOpenURL(event.url)
  }

  _handleNavigateToAddPodcastByRSSAuthScreen = (params: any) => {
    const { feedUrl } = params
    this.props.navigation.navigate(PV.RouteNames.AddPodcastByRSSAuthScreen, { feedUrl })
  }

  _handleNavigateToMembershipScreen = () => {
    this.props.navigation.navigate(PV.RouteNames.MembershipScreen)
  }

  // Go back to the root screen to make sure componentDidMount is called.
  // On some Android devices, the .goBack method appears to not work reliably
  // unless there is some delay between screen changes. Wrapping each .goBack method
  // in a delay to make this happen.
  _goBackWithDelay = async () => {
    const { navigation } = this.props
    return new Promise((resolve) => {
      (async () => {
        if (Platform.OS === 'android') {
          setTimeout(() => {
            (async () => {
              await navigation.goBack(null)
              setTimeout(() => {
                (async () => {
                  await navigation.goBack(null)
                  resolve(null)
                })()
              }, 400)
            })()
          }, 400)
        } else if (Platform.OS === 'ios') {
          await navigation.goBack(null)
          await navigation.goBack(null)
          resolve(null)
        }
      })()
    })
  }

  _handleDeepLinkClip = async (mediaRefId: string) => {
    if (mediaRefId) {
      const { navigation } = this.props

      try {
        const currentItem = await getNowPlayingItem()
        if (!currentItem || (mediaRefId && mediaRefId !== currentItem.mediaRefId)) {
          const mediaRef = await getMediaRef(mediaRefId)
          if (mediaRef) {
            const newItem = convertToNowPlayingItem(mediaRef, null, null)
            const shouldPlay = true
            const forceUpdateOrderDate = false
            const setCurrentItemNextInQueue = true
            await playerLoadNowPlayingItem(newItem, shouldPlay, forceUpdateOrderDate, setCurrentItemNextInQueue)
          }
        }

        handleNavigateToPlayerScreen(navigation)
      } catch (error) {
        console.log(error)
      }
    }
  }

  _handleOpenURL = async (url: string) => {
    const { navigation } = this.props
    const { navigate } = navigation

    try {
      if (url) {
        if (url.endsWith('xml') || url.endsWith('opml')) {
            await getAuthUserInfo(() => {
              navigate(PV.RouteNames.MoreScreen, { opmlUri: url })
            })
        } else {
          const route = url.replace(/.*?:\/\//g, '')
          const splitPath = route.split('/')
          const domain = splitPath[0] ? splitPath[0] : ''
          const path = splitPath[1] ? splitPath[1] : ''
          const id = splitPath[2] ? splitPath[2] : ''
          const urlParamsString = splitPath[splitPath.length - 1].split('?')[1]
          const urlParams: any = {}
          if (urlParamsString) {
            const urlParamsArr = urlParamsString.split('&')
            if (urlParamsArr.length) {
              urlParamsArr.forEach((param) => {
                const [key, value] = param.split('=')
                urlParams[key] = value
              })
            }
          }

          await this._goBackWithDelay()
          if (path === PV.DeepLinks.Clip.pathPrefix) {
            await this._handleDeepLinkClip(id)
          } else if (path === PV.DeepLinks.Episode.pathPrefix) {
            const episode = await getEpisode(id)
            if (episode) {
              const podcast = await getPodcast(episode.podcast?.id)
              navigate(PV.RouteNames.PodcastScreen, {
                podcast,
                navToEpisodeWithId: id
              })
              navigate(PV.RouteNames.EpisodeScreen, {
                episode
              })
            }
          } else if (path === PV.DeepLinks.Playlist.pathPrefix) {
            await navigate(PV.RouteNames.MyLibraryScreen)
            await navigate(PV.RouteNames.PlaylistsScreen, {
              navToPlaylistWithId: id
            })
          } else if (path === PV.DeepLinks.Podcast.pathPrefix) {
            await navigate(PV.RouteNames.PodcastScreen, {
              podcastId: id
            })
          } else if (path === PV.DeepLinks.Profile.pathPrefix) {
            await navigate(PV.RouteNames.MyLibraryScreen)
            await navigate(PV.RouteNames.ProfilesScreen, {
              navToProfileWithId: id
            })
          } else if (path.startsWith(PV.DeepLinks.Account.resetPassword)) {
            navigate(PV.RouteNames.ResetPasswordScreen, {
              resetToken: urlParams.token
            })
          } else if (path === PV.DeepLinks.About.path) {
            await navigate(PV.RouteNames.MoreScreen)
            await navigate(PV.RouteNames.AboutScreen)
          } else if (path === PV.DeepLinks.Contact.path) {
            await navigate(PV.RouteNames.MoreScreen)
            await navigate(PV.RouteNames.ContactScreen)
          } else if (path === PV.DeepLinks.Membership.path) {
            await navigate(PV.RouteNames.MoreScreen)
            await navigate(PV.RouteNames.MembershipScreen)
          } else if (path === PV.DeepLinks.Contribute.path) {
            await navigate(PV.RouteNames.MoreScreen)
            await navigate(PV.RouteNames.ContributeScreen)
          } else if (path === PV.DeepLinks.Terms.path) {
            await navigate(PV.RouteNames.MoreScreen)
            await navigate(PV.RouteNames.TermsOfServiceScreen)
          } else if (path === PV.DeepLinks.XMPP.path) {
            await navigate(PV.RouteNames.MoreScreen)
            await navigate(PV.RouteNames.ContactXMPPChatScreen)
          }

          // V4V PROVIDERS:
          else if (v4vAlbyCheckConnectDeepLink(domain) && urlParams?.code) {
            await v4vAlbyHandleConnect(navigation, urlParams.code)
          }

          // ELSE:
          else {
            await navigate(PV.RouteNames.PodcastsScreen)
          }
        }
      }
    } catch (error) {
      //
    }
  }

  _initializeScreenData = async () => {
    const { navigation } = this.props
    const { navigate } = navigation
    const { searchBarText } = this.state

    await initPlayerState(this.global)
    await initializeSettings()
    await v4vInitializeShowLightningIcon()
    await v4vInitializeSettings()
    await v4vInitializeConnectedProviders()
    await v4vInitializeSenderInfo()

    // Load the AsyncStorage authenticatedUser and subscribed podcasts immediately,
    // before getting the latest from server and parsing the addByPodcastFeedUrls in getAuthUserInfo.
    await getAuthenticatedUserInfoLocally()
    const savedQuerySort = await getSavedQueryPodcastsScreenSort()
    await combineWithAddByRSSPodcasts(searchBarText, savedQuerySort)

    /* Navigate to custom screen on app launch */
    const customLaunchScreen = await getCustomLaunchScreenKey()
    if (customLaunchScreen && PV.CustomLaunchScreen.nonDefaultValidScreenKeys.includes(customLaunchScreen)) {
      navigate(customLaunchScreen)
    }

    this._handleInitialDefaultQuery()

    const userAgent = getAppUserAgent()
    this.setGlobal({ userAgent })

    this.setState({ isLoadingMore: false }, () => {
      (async () => {
        let isLoggedIn = false
        try {
          isLoggedIn = await getAuthUserInfo()
          if (isLoggedIn) await askToSyncWithNowPlayingItem(this._initializeScreenDataPart2)
        } catch (error) {
          console.log('initializeScreenData getAuthUserInfo', error)
          // If getAuthUserInfo fails, continue with the networkless version of the app
        }
        if (!isLoggedIn) this._initializeScreenDataPart2()
      })()
    })
  }

  _initializeScreenDataPart2 = async () => {
    await Promise.all([
      this._handleInitialDefaultQuery,
      initDownloads(),
      initAutoQueue(),
      initializePlayer(),
      initializePlayerSettings()
    ])

    this._setDownloadedDataIfOffline()
    downloadedEpisodeDeleteMarked()
  }

  _handleInitialDefaultQuery = async () => {
    const { isInMaintenanceMode } = this.global
    if (!isInMaintenanceMode) {
      const isConnected = await hasValidNetworkConnection()
      const preventIsLoading = true
      const preventAutoDownloading = false
      if (isConnected) {
        const savedQuerySort = await getSavedQueryPodcastsScreenSort()
        this.setState({ querySort: savedQuerySort }, () => {
          this.handleSelectFilterItem(PV.Filters._subscribedKey, preventIsLoading, preventAutoDownloading)
        })
      } else {
        this._setDownloadedDataIfOffline()
      }
    }
  }

  // NOTE: there is a race-condition possibility if you reparse RSS feeds whenever
  // the Subscribed filter is selected from the FilterScreen. This is happening
  // because the subscribed handler first gets subscriptions from server,
  // then parses the custom RSS feeds, then combines the parsed results
  // with the subscribedPodcasts on globalState. To prevent this,
  // use handleSelectFilterItemWithoutParse on the FilterScreen.
  handleSelectFilterItemWithoutParse = async (selectedKey: string) => {
    const preventIsLoading = false
    const preventAutoDownloading = true
    const keepSearchTitle = false
    const preventParseCustomRSSFeeds = true
    await this.handleSelectFilterItem(
      selectedKey,
      preventIsLoading,
      preventAutoDownloading,
      keepSearchTitle,
      preventParseCustomRSSFeeds
    )
  }

  handleSelectFilterItem = async (
    selectedKey: string,
    preventIsLoading?: boolean,
    preventAutoDownloading?: boolean,
    keepSearchTitle?: boolean,
    preventParseCustomRSSFeeds?: boolean
  ) => {
    if (!selectedKey) {
      return
    }

    const { querySort } = this.state
    const sort = getDefaultSortForFilter({
      screenName: PV.RouteNames.PodcastsScreen,
      selectedFilterItemKey: selectedKey,
      selectedSortItemKey: querySort
    })

    const selectedFilterLabel = await getSelectedFilterLabel(selectedKey)
    const selectedSortLabel = getSelectedSortLabel(sort)

    isInitialLoad = false

    this.setState(
      {
        endOfResultsReached: false,
        flatListData: [],
        flatListDataTotalCount: null,
        isLoadingMore: !preventIsLoading,
        queryFrom: selectedKey,
        queryPage: 1,
        querySort: sort,
        searchBarText: keepSearchTitle ? this.state.searchBarText : '',
        selectedCategory: null,
        selectedCategorySub: null,
        selectedFilterLabel,
        selectedSortLabel
      },
      () => {
        (async () => {
          const nextState = null
          const options = {}
          const newState = await this._queryData(
            selectedKey,
            this.state,
            nextState,
            options,
            preventAutoDownloading,
            preventParseCustomRSSFeeds
          )
          this.setState({
            ...newState,
            isInitialLoadFinished: true
          })
        })()
      }
    )
  }

  handleSelectSortItem = async (selectedKey: string) => {
    if (!selectedKey) {
      return
    }

    const { queryFrom } = this.state

    if (queryFrom === PV.Filters._subscribedKey) {
      await setSavedQueryPodcastsScreenSort(selectedKey)
    }

    const selectedSortLabel = getSelectedSortLabel(selectedKey)

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
          const newState = await this._queryData(selectedKey, this.state)
          this.setState(newState)
        })()
      }
    )
  }

  _selectCategory = async (selectedKey: string, isCategorySub?: boolean) => {
    if (!selectedKey) {
      return
    }

    const { querySort } = this.state
    const sort = getDefaultSortForFilter({
      screenName: PV.RouteNames.PodcastsScreen,
      selectedFilterItemKey: selectedKey,
      selectedSortItemKey: querySort
    })

    const selectedFilterLabel = await getCategoryLabel(selectedKey)
    const selectedSortLabel = getSelectedSortLabel(sort)

    this.setState(
      {
        endOfResultsReached: false,
        isLoadingMore: true,
        ...((isCategorySub ? { selectedCategorySub: selectedKey } : { selectedCategory: selectedKey }) as any),
        flatListData: [],
        flatListDataTotalCount: null,
        queryFrom: PV.Filters._categoryKey,
        queryPage: 1,
        querySort: sort,
        selectedFilterLabel,
        selectedSortLabel
      },
      () => {
        (async () => {
          const newState = await this._queryData(selectedKey, this.state, {}, { isCategorySub })
          this.setState(newState)
        })()
      }
    )
  }

  _onEndReached = (evt: any) => {
    const { distanceFromEnd } = evt
    const { endOfResultsReached, queryFrom, queryPage = 1 } = this.state

    if (
      queryFrom !== PV.Filters._subscribedKey &&
      queryFrom !== PV.Filters._customFeedsKey &&
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
              const nextPage = queryPage + 1
              const newState = await this._queryData(queryFrom, this.state, {
                queryPage: nextPage
              })
              this.setState(newState)
            })()
          }
        )
      }
    }
  }

  _onRefresh = () => {
    const { queryFrom } = this.state

    this.setState(
      {
        isRefreshing: true
      },
      () => {
        (async () => {
          if (queryFrom === PV.Filters._customFeedsKey) {
            await parseAllAddByRSSPodcasts()
          }

          const newState = await this._queryData(queryFrom, this.state, {
            queryPage: 1
          })
          this.setState(newState)
        })()
      }
    )
  }

  _ListHeaderComponent = () => {
    const { searchBarText } = this.state

    return (
      <View style={core.ListHeaderComponent} testID={`${testIDPrefix}_filter_wrapper`}>
        <SearchBar
          handleClear={this._handleSearchBarClear}
          hideIcon
          icon='filter'
          noContainerPadding
          onChangeText={this._handleSearchBarTextChange}
          placeholder={getSearchPlaceholder()}
          testID={`${testIDPrefix}_filter_bar`}
          value={searchBarText}
        />
      </View>
    )
  }

  _ItemSeparatorComponent = () => <Divider style={{ marginHorizontal: 10 }} />

  _renderPodcastItem = ({ item, index }) => (
    <PodcastTableCell
      addByRSSPodcastFeedUrl={item?.addByRSSPodcastFeedUrl}
      id={item?.id}
      lastEpisodePubDate={item.lastEpisodePubDate}
      latestLiveItemStatus={item.latestLiveItemStatus}
      onPress={() => this._onPodcastItemSelected(item)}
      podcastImageUrl={item.shrunkImageUrl || item.imageUrl}
      {...(item.title ? { podcastTitle: item.title } : {})}
      showAutoDownload
      showDownloadCount
      testID={`${testIDPrefix}_podcast_item_${index}`}
      valueTags={item.value}
    />
  )

  _onPodcastItemSelected = (item) => {
    this.props.navigation.navigate(PV.RouteNames.PodcastScreen, {
      podcast: item,
      addByRSSPodcastFeedUrl: item.addByRSSPodcastFeedUrl
    })
  }

  _renderHiddenItem = ({ item, index }, rowMap) => {
    const { queryFrom } = this.state
    const buttonText = queryFrom === PV.Filters._downloadedKey ? translate('Delete') : translate('Unsubscribe')

    return (
      <SwipeRowBack
        isLoading={this.state.isUnsubscribing}
        onPress={() => this._handleHiddenItemPress(item.id, item.addByRSSPodcastFeedUrl, rowMap)}
        testID={`${testIDPrefix}_podcast_item_${index}`}
        text={buttonText}
      />
    )
  }

  _handleHiddenItemPress = async (selectedId, addByRSSPodcastFeedUrl) => {
    const { queryFrom } = this.state

    let wasAlerted = false
    if (queryFrom === PV.Filters._subscribedKey || queryFrom === PV.Filters._customFeedsKey) {
      wasAlerted = await alertIfNoNetworkConnection(translate('unsubscribe from podcast'))
    }

    if (wasAlerted) return
    this.setState({ isUnsubscribing: true }, () => {
      (async () => {
        try {
          if (queryFrom === PV.Filters._subscribedKey || queryFrom === PV.Filters._customFeedsKey) {
            addByRSSPodcastFeedUrl
              ? await removeAddByRSSPodcast(addByRSSPodcastFeedUrl)
              : await toggleSubscribeToPodcast(selectedId)
            await removeDownloadedPodcast(selectedId || addByRSSPodcastFeedUrl)
          } else if (queryFrom === PV.Filters._downloadedKey) {
            await removeDownloadedPodcast(selectedId || addByRSSPodcastFeedUrl)
          }

          // TODO: the safeKeyExtractor is breaking the logic below
          // by appending an index to the rowMap key
          // const row = rowMap[selectedId] || rowMap[addByRSSPodcastFeedUrl]
          // row.closeRow()
        } catch (error) {
          console.log('_handleHiddenItemPress', error)
        }
        this.setState({ isUnsubscribing: false })
      })()
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

  _handleSearchBarTextChange = (text: string) => {
    this.setState(
      {
        searchBarText: text
      },
      () => {
        this._handleSearchBarTextQuery()
      }
    )
  }

  _handleSearchBarTextQuery = () => {
    const { queryFrom, querySort, searchBarText, tempQueryEnabled } = this.state
    if (!searchBarText) {
      this._handleRestoreSavedQuery()
    } else {
      const tempQueryObj: any = !tempQueryEnabled
        ? {
            tempQueryEnabled: true,
            tempQueryFrom: queryFrom,
            tempQuerySort: querySort
          }
        : {}
      this.setState(tempQueryObj, () => {
        const queryFrom = PV.Filters._allPodcastsKey
        const preventIsLoading = false
        const preventAutoDownloading = true
        const keepSearchTitle = true
        this.handleSelectFilterItem(queryFrom, preventIsLoading, preventAutoDownloading, keepSearchTitle)
      })
    }
  }

  _handleRestoreSavedQuery = () => {
    const { tempQueryFrom, tempQuerySort } = this.state
    this.setState(
      {
        queryFrom: tempQueryFrom,
        querySort: tempQuerySort,
        tempQueryEnabled: false
      },
      () => {
        const restoredQueryFrom = tempQueryFrom || PV.Filters._subscribedKey
        const preventIsLoading = false
        const preventAutoDownloading = true
        const keepSearchTitle = false
        this.handleSelectFilterItem(restoredQueryFrom, preventIsLoading, preventAutoDownloading, keepSearchTitle)
      }
    )
  }

  _handleSearchNavigation = () => {
    this.props.navigation.navigate(PV.RouteNames.SearchScreen)
  }

  _handleNoResultsTopAction = () => {
    this._handleSearchNavigation()
  }

  _handleDataSettingsWifiOnly = () => {
    AsyncStorage.setItem(PV.Keys.DOWNLOADING_WIFI_ONLY, 'TRUE')
    this.setState({ showDataSettingsConfirmDialog: false })
    this._initializeScreenData()
  }

  _handleDataSettingsAllowData = () => {
    this.setState({ showDataSettingsConfirmDialog: false })
    this._initializeScreenData()
  }

  _navToRequestPodcastEmail = () => {
    Linking.openURL(createEmailLinkUrl(PV.Emails.PODCAST_REQUEST))
  }

  _getFlatListData = () => {
    const { isLoadingMore, queryFrom } = this.state
    const { subscribedPodcasts = [], subscribedPodcastsTotalCount = 0 } = this.global
    let flatListData = []
    let flatListDataTotalCount = null
    if (isLoadingMore && queryFrom === PV.Filters._subscribedKey) {
      // do nothing
    } else if (queryFrom === PV.Filters._subscribedKey) {
      flatListData = subscribedPodcasts
      flatListDataTotalCount = subscribedPodcastsTotalCount
    } else {
      flatListData = this.state.flatListData
      flatListDataTotalCount = this.state.flatListDataTotalCount
    }

    return {
      flatListData,
      flatListDataTotalCount
    }
  }

  render() {
    const { navigation } = this.props
    const {
      isInitialLoadFinished,
      isLoadingMore,
      isRefreshing,
      queryFrom,
      querySort,
      searchBarText,
      selectedCategory,
      selectedCategorySub,
      selectedFilterLabel,
      selectedSortLabel,
      showDataSettingsConfirmDialog,
      showNoInternetConnectionMessage
    } = this.state
    const { session, podcastsGridViewEnabled } = this.global
    const { subscribedPodcastIds } = session?.userInfo

    const noSubscribedPodcasts =
      queryFrom === PV.Filters._subscribedKey && (!subscribedPodcastIds || subscribedPodcastIds.length === 0)

    const isCategoryScreen = queryFrom === PV.Filters._categoryKey

    const { flatListData, flatListDataTotalCount } = this._getFlatListData()

    return (
      <View style={styles.view} testID={`${testIDPrefix}_view`}>
        <RNView style={{ flex: 1 }}>
          <PlayerEvents />
          <TableSectionSelectors
            filterScreenTitle={getScreenTitle()}
            handleSelectCategoryItem={(x: any) => this._selectCategory(x)}
            handleSelectCategorySubItem={(x: any) => this._selectCategory(x, true)}
            handleSelectFilterItem={this.handleSelectFilterItemWithoutParse}
            handleSelectSortItem={this.handleSelectSortItem}
            includePadding
            navigation={navigation}
            screenName='PodcastsScreen'
            selectedCategoryItemKey={selectedCategory}
            selectedCategorySubItemKey={selectedCategorySub}
            selectedFilterItemKey={queryFrom}
            selectedFilterLabel={selectedFilterLabel}
            selectedSortItemKey={querySort}
            selectedSortLabel={selectedSortLabel}
            testID={testIDPrefix}
          />
          <FlatList
            data={flatListData}
            dataTotalCount={flatListDataTotalCount}
            disableLeftSwipe={
              queryFrom !== PV.Filters._subscribedKey &&
              queryFrom !== PV.Filters._downloadedKey &&
              queryFrom !== PV.Filters._customFeedsKey
            }
            disableNoResultsMessage={!isInitialLoadFinished}
            extraData={flatListData}
            handleNoResultsTopAction={!!Config.CURATOR_EMAIL ? this._navToRequestPodcastEmail : null}
            keyExtractor={(item: any, index: number) => safeKeyExtractor(testIDPrefix, index, item?.id)}
            isLoadingMore={isLoadingMore}
            isRefreshing={isRefreshing}
            ItemSeparatorComponent={this._ItemSeparatorComponent}
            {...(isCategoryScreen ? {} : { ListHeaderComponent: this._ListHeaderComponent })}
            noResultsMessage={
              // eslint-disable-next-line max-len
              noSubscribedPodcasts
                ? translate('You are not subscribed to any podcasts yet')
                : translate('No podcasts found')
            }
            noResultsTopActionText={!!Config.CURATOR_EMAIL && searchBarText ? translate('Request Podcast') : ''}
            noResultsTopActionTextAccessibilityHint={translate('ARIA HINT - send us an email to request a podcast')}
            onEndReached={this._onEndReached}
            onRefresh={this._onRefresh}
            renderHiddenItem={this._renderHiddenItem}
            renderItem={this._renderPodcastItem}
            showNoInternetConnectionMessage={showNoInternetConnectionMessage}
            testID={testIDPrefix}
            gridView={podcastsGridViewEnabled}
            onGridItemSelected={this._onPodcastItemSelected}
          />
        </RNView>
        <Dialog.Container accessible visible={showDataSettingsConfirmDialog}>
          <Dialog.Title>{translate('Data Settings')}</Dialog.Title>
          <Dialog.Description>
            {translate('Do you want to allow downloading episodes with your data plan')}
          </Dialog.Description>
          <Dialog.Button
            label={translate('No Wifi Only')}
            onPress={this._handleDataSettingsWifiOnly}
            testID={'alert_no_wifi_only'.prependTestId()}
          />
          <Dialog.Button
            label={translate('Yes Allow Data')}
            onPress={this._handleDataSettingsAllowData}
            testID={'alert_yes_allow_data'.prependTestId()}
          />
        </Dialog.Container>
      </View>
    )
  }

  _querySubscribedPodcasts = async (preventAutoDownloading?: boolean, preventParseCustomRSSFeeds?: boolean) => {
    const { querySort, searchBarText } = this.state
    await getSubscribedPodcasts(querySort)

    await handleUpdateNewEpisodesCount()

    if (!preventParseCustomRSSFeeds) {
      if (!searchBarText && preventAutoDownloading) await parseAllAddByRSSPodcasts()

      await combineWithAddByRSSPodcasts(searchBarText, querySort)
    }

    if (!preventAutoDownloading) {
      try {
        const dateISOString = await getAutoDownloadsLastRefreshDate()
        await handleAutoDownloadEpisodes(dateISOString)
        await handleAutoQueueEpisodes(dateISOString)
      } catch (error) {
        console.log('_querySubscribedPodcasts auto download error:', error)
      }
      await AsyncStorage.setItem(PV.Keys.AUTODOWNLOADS_LAST_REFRESHED, new Date().toISOString())
    }

    // let syncing with server history data run in the background
    syncNewEpisodesCountWithHistory()
  }

  _queryCustomFeeds = async () => {
    const customFeeds = await getAddByRSSPodcastsLocally()
    return customFeeds
  }

  _queryAllPodcasts = async (sort: string | null, page = 1) => {
    const { searchBarText: searchTitle } = this.state
    const { appMode } = this.global
    const hasVideo = appMode === PV.AppMode.videos

    let localPodcasts = [] as any
    if (searchTitle && page === 1) {
      localPodcasts = await findCombineWithAddByRSSPodcasts(searchTitle)
      this.setState({
        queryFrom: PV.Filters._allPodcastsKey,
        flatListData: localPodcasts,
        flatListDataTotalCount: localPodcasts.length,
        // Need to set endOfResultsReached to true to prevent onEndReached from
        // being called immediately after localPodcasts loads in the flatListData.
        // It will be reset to false after _queryData finishes if the end is not reached yet.
        endOfResultsReached: true
      })
    }

    const results = await getPodcasts({
      sort,
      page,
      ...(searchTitle ? { searchTitle } : {}),
      ...(hasVideo ? { hasVideo: true } : {})
    })

    if (searchTitle) {
      const filteredResults = results[0].filter((serverPodcast: any) => {
        return !localPodcasts.some((localPodcast: any) => {
          return localPodcast?.title === serverPodcast?.title
        })
      })

      results[0] = [...localPodcasts, ...filteredResults]
    }

    return results
  }

  _queryPodcastsByCategory = async (categoryId?: string | null, sort?: string | null, page = 1) => {
    const { appMode } = this.global
    const hasVideo = appMode === PV.AppMode.videos
    const results = await getPodcasts({
      categories: categoryId,
      sort,
      page,
      ...(hasVideo ? { hasVideo: true } : {})
    })
    return results
  }

  _queryData = async (
    filterKey: any,
    prevState: State,
    nextState?: any,
    queryOptions: { isCategorySub?: boolean } = {},
    preventAutoDownloading?: boolean,
    preventParseCustomRSSFeeds?: boolean
  ) => {
    let newState = {
      isLoadingMore: false,
      isRefreshing: false,
      showNoInternetConnectionMessage: false,
      ...nextState
    } as State

    let shouldCleanFlatListData = true

    try {
      const {
        searchBarText: searchTitle,
        flatListData = [],
        queryFrom,
        querySort,
        selectedCategory,
        selectedCategorySub
      } = prevState

      const { appMode, isInMaintenanceMode } = this.global
      const hasVideo = appMode === PV.AppMode.videos

      const hasInternetConnection = await hasValidNetworkConnection()
      const isSubscribedSelected = filterKey === PV.Filters._subscribedKey || queryFrom === PV.Filters._subscribedKey
      const isCustomFeedsSelected = filterKey === PV.Filters._customFeedsKey || queryFrom === PV.Filters._customFeedsKey
      const isDownloadedSelected =
        filterKey === PV.Filters._downloadedKey || queryFrom === PV.Filters._downloadedKey || isInMaintenanceMode
      const isAllPodcastsSelected = filterKey === PV.Filters._allPodcastsKey || queryFrom === PV.Filters._allPodcastsKey

      if (isDownloadedSelected) {
        const podcasts = await getDownloadedPodcasts(searchTitle, hasVideo)
        newState.flatListData = [...podcasts]
        newState.queryFrom = PV.Filters._downloadedKey
        newState.selectedFilterLabel = await getSelectedFilterLabel(PV.Filters._downloadedKey)
        newState.endOfResultsReached = true
        newState.flatListDataTotalCount = podcasts.length
      } else if (isSubscribedSelected) {
        if (!preventParseCustomRSSFeeds) {
          await getAuthUserInfo() // get the latest subscribedPodcastIds first
          shouldCleanFlatListData = false
        }
        await this._querySubscribedPodcasts(preventAutoDownloading, preventParseCustomRSSFeeds)
      } else if (isCustomFeedsSelected) {
        const podcasts = await this._queryCustomFeeds()
        newState.flatListData = [...podcasts]
        newState.endOfResultsReached = true
        newState.flatListDataTotalCount = podcasts.length
      } else if (isAllPodcastsSelected) {
        newState.showNoInternetConnectionMessage = !hasInternetConnection
        const results = await this._queryAllPodcasts(querySort, newState.queryPage)
        newState.flatListData = newState.queryPage > 1 ? [...flatListData, ...results[0]] : [...results[0]]
        newState.endOfResultsReached = results[0].length < 20
        newState.flatListDataTotalCount = results[1]
      } else if (
        PV.FilterOptions.screenFilters.PodcastsScreen.sort.some((option) => option === filterKey) ||
        PV.FilterOptions.screenFilters.PodcastsScreen.subscribedSort.some((option) => option === filterKey)
      ) {
        newState.showNoInternetConnectionMessage = !hasInternetConnection
        const results = await getPodcasts({
          ...setCategoryQueryProperty(queryFrom, selectedCategory, selectedCategorySub),
          sort: filterKey,
          ...(searchTitle ? { searchTitle } : {}),
          ...(hasVideo ? { hasVideo: true } : {})
        })
        newState.flatListData = results[0]
        newState.endOfResultsReached = results[0].length < 20
        newState.flatListDataTotalCount = results[1]
        newState = assignCategoryToStateForSortSelect(newState, selectedCategory, selectedCategorySub)
      } else {
        newState.showNoInternetConnectionMessage = !hasInternetConnection

        const assignedCategoryData = assignCategoryQueryToState(
          filterKey,
          newState,
          queryOptions,
          selectedCategory,
          selectedCategorySub
        )

        const categories = assignedCategoryData.categories
        newState = assignedCategoryData.newState

        const results = await this._queryPodcastsByCategory(categories, querySort, newState.queryPage)
        newState.flatListData = [...flatListData, ...results[0]]
        newState.endOfResultsReached = results[0].length < 20
        newState.flatListDataTotalCount = results[1]
      }
    } catch (error) {
      console.log('PodcastsScreen _queryData error', error)
    }

    if (shouldCleanFlatListData) {
      newState.flatListData = this.cleanFlatListData(newState.flatListData)
    }

    this.shouldLoad = true

    return newState
  }

  cleanFlatListData = (flatListData: any[]) => {
    return flatListData?.filter((item) => !!item?.id) || []
  }
}

const styles = StyleSheet.create({
  view: {
    flex: 1
  }
})
