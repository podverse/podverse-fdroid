import debounce from 'lodash/debounce'
import { createEmailLinkUrl, isOdd } from 'podverse-shared'
import { Alert, Linking, StyleSheet } from 'react-native'
import Config from 'react-native-config'
import React from 'reactn'
import {
  ActionSheet,
  ActivityIndicator,
  ButtonGroup,
  Divider,
  FlatList,
  NavDismissIcon,
  PodcastTableCell,
  SearchBar,
  View
} from '../components'
import { translate } from '../lib/i18n'
import { navigateToPodcastScreenWithPodcast } from '../lib/navigate'
import { alertIfNoNetworkConnection } from '../lib/network'
import { safeKeyExtractor, safelyUnwrapNestedVariable } from '../lib/utility'
import { PV } from '../resources'
import { getPodcasts } from '../services/podcast'
import { toggleSubscribeToPodcast } from '../state/actions/podcast'

type Props = {
  navigation?: any
}

type State = {
  endOfResultsReached?: boolean
  flatListData: any[]
  flatListDataTotalCount: number | null
  isLoading?: boolean
  isLoadingMore?: boolean
  queryPage: number
  searchBarText: string
  searchType: number
  selectedPodcast?: any
  showActionSheet: boolean
}

const testIDPrefix = 'search_screen'

export class SearchScreen extends React.Component<Props, State> {
  shouldLoad: boolean
  searchBarInput: any

  constructor(props: Props) {
    super(props)

    this.shouldLoad = true

    this.state = {
      endOfResultsReached: false,
      flatListData: [],
      flatListDataTotalCount: null,
      isLoading: false,
      isLoadingMore: false,
      queryPage: 1,
      searchBarText: '',
      searchType: 0,
      showActionSheet: false
    }

    this._handleSearchBarTextQuery = debounce(this._handleSearchBarTextQuery, PV.SearchBar.textInputDebounceTime)
  }

  static navigationOptions = ({ navigation }) => ({
    title: translate('Find'),
    headerLeft: () => <NavDismissIcon handlePress={navigation.dismiss} testID={testIDPrefix} />,
    headerRight: () => null
  })

  componentDidMount() {
    this.searchBarInput.focus()
  }

  _handleSearchBarClear = () => {
    this.setState({
      flatListData: [],
      flatListDataTotalCount: null,
      searchBarText: ''
    })
  }

  _handleSearchBarTextChange = (text: string) => {
    const shouldSearch = !!text && text.length > 1
    this.setState(
      {
        searchBarText: text,
        isLoading: shouldSearch
      },
      () => {
        this._handleSearchBarTextQuery()
      }
    )
  }

  _handleSearchBarTextQuery = (nextPage?: boolean) => {
    const shouldSearch = !!this.state.searchBarText && this.state.searchBarText.length > 1

    this.setState(
      {
        flatListData: [],
        flatListDataTotalCount: null,
        queryPage: 1,
        isLoading: shouldSearch
      },
      () => {
        (async () => {
          if (shouldSearch) {
            const state = await this._queryData(nextPage)
            this.setState(state)
          }
        })()
      }
    )
  }

  _ItemSeparatorComponent = () => <Divider optional />

  _onEndReached = ({ distanceFromEnd }) => {
    const { endOfResultsReached } = this.state
    if (!endOfResultsReached && this.shouldLoad) {
      if (distanceFromEnd > -1) {
        this.shouldLoad = false

        this.setState(
          {
            isLoadingMore: true
          },
          () => {
            (async () => {
              const newState = await this._queryData(true)
              this.setState(newState)
            })()
          }
        )
      }
    }
  }

  _handleSearchTypePress = (index) => this.setState({ searchType: index })

  _handleCancelPress = () => this.setState({ showActionSheet: false })

  _handleMorePress = (podcast: any) => {
    /* Have to blur to make sure screen reader focuses on the ActionSheet */
    this.searchBarInput.blur()

    this.setState({
      selectedPodcast: podcast,
      showActionSheet: true
    })
  }

  _handleNavigationPress = (podcast: any, viewType?: string) => {
    this.setState({ showActionSheet: false })
    navigateToPodcastScreenWithPodcast(this.props.navigation, podcast, viewType)
  }

  _handleAddPodcastByRSSURLNavigation = () => {
    this.props.navigation.navigate(PV.RouteNames.AddPodcastByRSSScreen)
  }

  _renderPodcastItem = ({ item, index }) => (
    <PodcastTableCell
      addByRSSPodcastFeedUrl={item?.addByRSSPodcastFeedUrl}
      hasZebraStripe={isOdd(index)}
      id={item.id}
      lastEpisodePubDate={item.lastEpisodePubDate}
      onPress={() => this._handleMorePress(item)}
      podcastImageUrl={item.shrunkImageUrl || item.imageUrl}
      {...(item.title ? { podcastTitle: item.title } : {})}
      testID={`${testIDPrefix}_podcast_item_${index}`}
    />
  )

  _moreButtons = (): any[] => {
    const { selectedPodcast } = this.state
    const subscribedPodcastIds = safelyUnwrapNestedVariable(() => this.global.session.userInfo.subscribedPodcastIds, [])
    const isSubscribed = selectedPodcast && subscribedPodcastIds.some((id: any) => id === selectedPodcast.id)

    return [
      {
        accessibilityLabel: isSubscribed ? translate('Unsubscribe') : translate('Subscribe'),
        key: 'toggleSubscribe',
        text: isSubscribed ? translate('Unsubscribe') : translate('Subscribe'),
        onPress: () => selectedPodcast && this._toggleSubscribeToPodcast(selectedPodcast.id)
      },
      {
        accessibilityLabel: translate('Go to Podcast'),
        key: 'goToPodcast',
        text: translate('Go to Podcast'),
        onPress: () => this._handleNavigationPress(selectedPodcast)
      }
    ]
  }

  _toggleSubscribeToPodcast = async (id: string) => {
    const { selectedPodcast } = this.state
    const wasAlerted = await alertIfNoNetworkConnection(translate('subscribe to this podcast'))
    if (wasAlerted) return

    try {
      toggleSubscribeToPodcast(id)
    } catch (error) {
      Alert.alert(PV.Alerts.SOMETHING_WENT_WRONG.title, PV.Alerts.SOMETHING_WENT_WRONG.message, PV.Alerts.BUTTONS.OK)
    }
    this._handleNavigationPress(selectedPodcast)
    this.setState({ showActionSheet: false })
  }

  _navToRequestPodcastEmail = () => {
    Linking.openURL(createEmailLinkUrl(PV.Emails.PODCAST_REQUEST))
  }

  render() {
    const {
      flatListData,
      flatListDataTotalCount,
      isLoading,
      isLoadingMore,
      searchBarText,
      searchType,
      showActionSheet
    } = this.state

    return (
      <View style={styles.view} testID={`${testIDPrefix}_view`}>
        <ButtonGroup
          buttons={buttons}
          onPress={this._handleSearchTypePress}
          selectedIndex={searchType}
          testID={`${testIDPrefix}_search_type`}
        />
        <SearchBar
          containerStyle={styles.searchBarContainer}
          handleClear={this._handleSearchBarClear}
          inputRef={(ref: any) => (this.searchBarInput = ref)}
          onChangeText={this._handleSearchBarTextChange}
          placeholder={
            searchType === _podcastByTitle ? translate('search by podcast title') : translate('search by podcast host')
          }
          testID={testIDPrefix}
          value={searchBarText}
        />
        {!isLoading && flatListData && (
          <FlatList
            data={flatListData}
            dataTotalCount={flatListDataTotalCount}
            extraData={flatListData}
            handleNoResultsBottomAction={!!Config.CURATOR_EMAIL ? this._navToRequestPodcastEmail : null}
            handleNoResultsMiddleAction={this._handleAddPodcastByRSSURLNavigation}
            isLoadingMore={isLoadingMore}
            ItemSeparatorComponent={this._ItemSeparatorComponent}
            keyExtractor={(item: any, index: number) => safeKeyExtractor(testIDPrefix, index, item?.id)}
            noResultsBottomActionText={!!Config.CURATOR_EMAIL ? translate('Request Podcast') : ''}
            noResultsBottomActionTextAccessibilityHint={translate('ARIA HINT - send us an email to request a podcast')}
            noResultsMessage={searchBarText.length > 1 && translate('No podcasts found')}
            noResultsMiddleActionText={translate('Add Custom RSS Feed')}
            noResultsMiddleActionTextAccessibilityHint={translate('ARIA HINT - add a podcast by its RSS feed')}
            noResultsTopActionText={!Config.DISABLE_QR_SCANNER ? translate('Scan RSS Feed QR Code') : ''}
            onEndReached={this._onEndReached}
            renderItem={this._renderPodcastItem}
            testID={testIDPrefix}
          />
        )}
        {isLoading && <ActivityIndicator fillSpace testID={testIDPrefix} />}
        <ActionSheet
          handleCancelPress={this._handleCancelPress}
          items={this._moreButtons()}
          showModal={showActionSheet}
          testID={testIDPrefix}
        />
      </View>
    )
  }

  _queryData = async (nextPage?: boolean) => {
    const { flatListData, queryPage, searchBarText, searchType } = this.state
    const page = nextPage ? queryPage + 1 : 1

    const newState = {
      isLoading: false,
      isLoadingMore: false
    }

    const wasAlerted = await alertIfNoNetworkConnection(translate('Search podcasts'))
    if (wasAlerted) {
      this.shouldLoad = true
      return newState
    }

    try {
      const results = await getPodcasts({
        page,
        ...(searchType === _podcastByTitle ? { searchTitle: searchBarText } : {}),
        ...(searchType === _podcastByHost ? { searchAuthor: searchBarText } : {})
      })

      const newFlatListData = [...flatListData, ...results[0]]

      this.shouldLoad = true
      return {
        ...newState,
        endOfResultsReached: newFlatListData.length >= results[1],
        flatListData: newFlatListData,
        flatListDataTotalCount: results[1],
        queryPage: page
      }
    } catch (error) {
      this.shouldLoad = true
      return newState
    }
  }
}

const _podcastByTitle = 0
const _podcastByHost = 1

const buttons = [translate('Podcast'), translate('Host')]

const styles = StyleSheet.create({
  searchBarContainer: {
    marginBottom: 6,
    marginTop: 12
  },
  view: {
    flex: 1,
    justifyContent: 'flex-start'
  }
})
