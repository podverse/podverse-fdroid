import { convertNowPlayingItemToEpisode, convertToNowPlayingItem } from 'podverse-shared'
import { StyleSheet } from 'react-native'
import React, { setGlobal } from 'reactn'
import { downloadEpisode } from '../lib/downloader'
import { getSelectedFromLabel, getSelectedSortLabel } from '../lib/filters'
import { translate } from '../lib/i18n'
import { hasValidNetworkConnection } from '../lib/network'
import { PV } from '../resources'
import PVEventEmitter from '../services/eventEmitter'
import { getMediaRefs } from '../services/mediaRef'
import { loadItemAndPlayTrack } from '../state/actions/player'
import { ActionSheet, ActivityIndicator, ClipTableCell, Divider, FlatList, TableSectionSelectors, View } from './'

type Props = {
  navigation?: any
  width: number
}

const getTestID = () => 'media_player_carousel_clips'

export class MediaPlayerCarouselClips extends React.PureComponent<Props> {
  shouldLoad: boolean

  constructor(props) {
    super(props)

    this.shouldLoad = true

    this.state = {}
  }

  componentDidMount() {
    this._selectQueryFrom(PV.Filters._fromThisEpisodeKey)
    PVEventEmitter.on(PV.Events.PLAYER_TRACK_CHANGED, this._selectEpisodeQuery)
  }

  componentWillUnmount() {
    PVEventEmitter.removeListener(PV.Events.PLAYER_TRACK_CHANGED, this._selectEpisodeQuery)
  }

  _selectEpisodeQuery = () => {
    this._selectQueryFrom(PV.Filters._fromThisEpisodeKey)
  }

  _selectQueryFrom = (selectedKey: string) => {
    if (!selectedKey) return

    const { querySort } = this.global.screenPlayer
    let sort = PV.Filters._topPastWeek
    if (selectedKey === PV.Filters._fromThisPodcastKey && querySort === PV.Filters._chronologicalKey) {
      sort = PV.Filters._chronologicalKey
    }

    const selectedFromLabel = getSelectedFromLabel(selectedKey)
    const selectedSortLabel = getSelectedSortLabel(querySort)

    setGlobal(
      {
        screenPlayer: {
          ...this.global.screenPlayer,
          endOfResultsReached: false,
          flatListData: [],
          flatListDataTotalCount: null,
          isQuerying: true,
          queryFrom: selectedKey,
          queryPage: 1,
          querySort: sort,
          selectedFromLabel,
          selectedSortLabel
        }
      },
      async () => {
        const newState = await this._queryData()
        setGlobal({
          screenPlayer: {
            ...this.global.screenPlayer,
            ...newState
          }
        })
      }
    )
  }

  _selectQuerySort = (selectedKey: string) => {
    if (!selectedKey) return

    const selectedSortLabel = getSelectedSortLabel(selectedKey)

    setGlobal(
      {
        screenPlayer: {
          ...this.global.screenPlayer,
          endOfResultsReached: false,
          flatListData: [],
          flatListDataTotalCount: null,
          isQuerying: true,
          queryPage: 1,
          querySort: selectedKey,
          selectedSortLabel
        }
      },
      async () => {
        const newState = await this._queryData()
        setGlobal({
          screenPlayer: {
            ...this.global.screenPlayer,
            ...newState
          }
        })
      }
    )
  }

  _onEndReached = ({ distanceFromEnd }) => {
    const { screenPlayer } = this.global
    const { endOfResultsReached, queryPage = 1 } = screenPlayer
    if (!endOfResultsReached && this.shouldLoad) {
      if (distanceFromEnd > -1) {
        this.shouldLoad = false

        setGlobal(
          {
            screenPlayer: {
              ...this.global.screenPlayer,
              isLoadingMore: true,
              queryPage: queryPage + 1
            }
          },
          async () => {
            const newState = await this._queryData()
            setGlobal({
              screenPlayer: {
                ...this.global.screenPlayer,
                ...newState
              }
            })
          }
        )
      }
    }
  }

  _handleNavigationPress = (selectedItem: any) => {
    const shouldPlay = true
    loadItemAndPlayTrack(selectedItem, shouldPlay)
  }

  _handleMorePress = (selectedItem: any) => {
    setGlobal({
      screenPlayer: {
        ...this.global.screenPlayer,
        selectedItem,
        showMoreActionSheet: true
      }
    })
  }

  _handleMoreCancelPress = () => new Promise((resolve) => {
    setGlobal(
      {
        screenPlayer: {
          ...this.global.screenPlayer,
          showMoreActionSheet: false
        }
      },
      resolve
    )
  })

  _handleDownloadPressed = () => {
    const { selectedItem } = this.global.screenPlayer
    if (selectedItem) {
      const episode = convertNowPlayingItemToEpisode(selectedItem)
      downloadEpisode(episode, episode.podcast)
    }
  }

  _renderItem = ({ item, index }) => {
    const { player, screenPlayer } = this.global
    const { episode } = player
    const podcast = episode?.podcast || {}
    const { queryFrom } = screenPlayer
    const testID = getTestID()

    if (queryFrom === PV.Filters._fromThisEpisodeKey) {
      item = {
        ...item,
        episode
      }
    }

    return item && item.episode && item.episode.id ? (
      <ClipTableCell
        item={item}
        handleMorePress={() => this._handleMorePress(convertToNowPlayingItem(item, null, podcast))}
        hideImage
        showEpisodeInfo={queryFrom !== PV.Filters._fromThisEpisodeKey}
        showPodcastInfo={false}
        testID={`${testID}_item_${index}`}
        transparent
      />
    ) : (
      <></>
    )
  }

  _ItemSeparatorComponent = () => <Divider />

  render() {
    const { navigation, width } = this.props
    const { offlineModeEnabled, screenPlayer } = this.global
    const {
      flatListData,
      flatListDataTotalCount,
      isLoading,
      isLoadingMore,
      isQuerying,
      queryFrom,
      querySort,
      selectedFromLabel = translate('Episode Clips'),
      selectedItem,
      selectedSortLabel = translate('top - week'),
      showMoreActionSheet,
      showNoInternetConnectionMessage
    } = screenPlayer

    const noResultsMessage = translate('No clips found')
    const testID = getTestID()

    return (
      <View style={[styles.wrapper, { width }]} transparent>
        <TableSectionSelectors
          filterScreenTitle={translate('Clips')}
          handleSelectFromItem={this._selectQueryFrom}
          handleSelectSortItem={this._selectQuerySort}
          includePadding
          navigation={navigation}
          screenName='PlayerScreen'
          selectedFilterLabel={selectedFromLabel}
          selectedFromItemKey={queryFrom}
          selectedSortItemKey={querySort}
          selectedSortLabel={selectedSortLabel}
          testID={testID}
          transparentDropdownButton
        />
        {isLoading || (isQuerying && <ActivityIndicator fillSpace />)}
        {!isLoading && !isQuerying && flatListData && (
          <FlatList
            data={flatListData}
            dataTotalCount={flatListDataTotalCount}
            disableLeftSwipe
            extraData={flatListData}
            isLoadingMore={isLoadingMore}
            ItemSeparatorComponent={this._ItemSeparatorComponent}
            keyExtractor={(item: any) => item.id}
            noResultsMessage={noResultsMessage}
            onEndReached={this._onEndReached}
            renderItem={this._renderItem}
            showNoInternetConnectionMessage={offlineModeEnabled || showNoInternetConnectionMessage}
            transparent
          />
        )}
        <ActionSheet
          handleCancelPress={this._handleMoreCancelPress}
          items={() =>
            PV.ActionSheet.media.moreButtons(selectedItem, navigation, {
              handleDismiss: this._handleMoreCancelPress,
              handleDownload: this._handleDownloadPressed
            })
          }
          showModal={showMoreActionSheet}
          testID={`${testID}_more`}
        />
      </View>
    )
  }

  _validSort = () => {
    const { screenPlayer } = this.global
    const { queryFrom, querySort } = screenPlayer

    return !querySort || (queryFrom === PV.Filters._fromThisPodcastKey && querySort === PV.Filters._chronologicalKey)
      ? PV.Filters._topPastWeek
      : querySort
  }

  _queryClips = async () => {
    const { player, screenPlayer } = this.global
    const { nowPlayingItem } = player
    const { queryFrom, queryPage } = screenPlayer

    const sort = this._validSort()

    if (nowPlayingItem && !nowPlayingItem.addByRSSPodcastFeedUrl) {
      const results = await getMediaRefs({
        sort,
        page: queryPage,
        ...(queryFrom === PV.Filters._fromThisEpisodeKey && nowPlayingItem
          ? { episodeId: nowPlayingItem.episodeId }
          : {}),
        ...(queryFrom === PV.Filters._fromThisPodcastKey && nowPlayingItem
          ? { podcastId: nowPlayingItem.podcastId }
          : {}),
        includeEpisode: queryFrom === PV.Filters._fromThisPodcastKey,
        allowUntitled: true
      })

      return results
    } else {
      return [[], 0]
    }
  }

  _queryData = async () => {
    const { screenPlayer } = this.global
    const { flatListData } = screenPlayer
    const newState = {
      isLoading: false,
      isLoadingMore: false,
      isQuerying: false,
      showNoInternetConnectionMessage: false
    } as any

    const hasInternetConnection = await hasValidNetworkConnection()

    if (!hasInternetConnection) {
      newState.showNoInternetConnectionMessage = true
      this.shouldLoad = true
      return newState
    }

    try {
      const results = await this._queryClips()
      newState.flatListData = [...flatListData, ...results[0]]
      newState.endOfResultsReached = newState.flatListData.length >= results[1]
      newState.flatListDataTotalCount = results[1]
      newState.querySort = this._validSort()
      this.shouldLoad = true
      return newState
    } catch (error) {
      this.shouldLoad = true
      return newState
    }
  }
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1
  }
})
