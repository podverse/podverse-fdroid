import 'react-native-gesture-handler'
import AsyncStorage from '@react-native-community/async-storage'
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo'
import React, { Component } from 'react'
import { Image, LogBox, Platform, StatusBar, View } from 'react-native'
import Config from 'react-native-config'
import 'react-native-gesture-handler'
import Orientation from 'react-native-orientation-locker'
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'
import { setGlobal, getGlobal } from 'reactn'
import { OverlayAlert, ImageFullView } from './src/components'
import { pvIsTablet } from './src/lib/deviceDetection'
import { refreshDownloads } from './src/lib/downloader'
import PVEventEmitter from './src/services/eventEmitter'
import { PV } from './src/resources'
import { determineFontScaleMode } from './src/resources/Fonts'
import { GlobalTheme } from './src/resources/Interfaces'
import Router from './src/Router'
import { downloadCategoriesList } from './src/services/category'
import { pauseDownloadingEpisodesAll } from './src/state/actions/downloads'
import initialState from './src/state/initialState'
import { darkTheme, lightTheme } from './src/styles'
import { hasValidDownloadingConnection } from './src/lib/network'
import { migrateCredentialsIfNeeded } from './src/lib/secutity'
import {
  handleCarPlayPodcastsUpdate,
  handleCarPlayQueueUpdate,
  registerCarModule,
  showRootView,
  unregisterCarModule
} from './src/lib/carplay/PVCarPlay'

LogBox.ignoreLogs(['EventEmitter.removeListener', "Require cycle"])

type Props = any

type State = {
  appReady: boolean
  minVersionMismatch: boolean
}

setGlobal(initialState)

let ignoreHandleNetworkChange = true

class App extends Component<Props, State> {
  unsubscribeNetListener: NetInfoSubscription | null

  constructor(props: Props) {
    super(props)

    if (!pvIsTablet()) {
      Orientation.lockToPortrait()
    }

    this.state = {
      appReady: false,
      minVersionMismatch: false
    }
    this.unsubscribeNetListener = null
    downloadCategoriesList()
  }

  async componentDidMount() {
    TrackPlayer.registerPlaybackService(() => require('./src/services/playerAudioEvents'))
    StatusBar.setBarStyle('light-content')
    Platform.OS === 'android' && StatusBar.setBackgroundColor(PV.Colors.ink, true)
    const darkModeEnabled = await AsyncStorage.getItem(PV.Keys.DARK_MODE_ENABLED)
    let globalTheme = darkTheme
    if (darkModeEnabled === null) {
      globalTheme = Config.DEFAULT_THEME_DARK ? darkTheme : lightTheme
    } else if (darkModeEnabled === 'FALSE') {
      globalTheme = lightTheme
    }

    await this.setupGlobalState(globalTheme)
    try {
      await migrateCredentialsIfNeeded()
    } catch (error) {
      console.log('migrateCredentialsIfNeeded error:', error)
    }
    this.unsubscribeNetListener = NetInfo.addEventListener(this.handleNetworkChange)

    
  
    // registerCarModule(this.onConnect, this.onDisconnect)
    
  }

  componentWillUnmount() {
    this.unsubscribeNetListener && this.unsubscribeNetListener()

    // unregisterCarModule(this.onConnect, this.onDisconnect);
  }

  onConnect = () => {
    // Do things now that carplay is connected
    const { subscribedPodcasts = [], session } = getGlobal()
    const { historyItems = [], queueItems = [] } = session.userInfo
    showRootView(subscribedPodcasts, historyItems, queueItems)
    PVEventEmitter.on(PV.Events.QUEUE_HAS_UPDATED, handleCarPlayQueueUpdate)
    PVEventEmitter.on(PV.Events.APP_FINISHED_INITALIZING, handleCarPlayPodcastsUpdate)
  }

  onDisconnect = () => {
    // Do things now that carplay is disconnected
    PVEventEmitter.removeListener(PV.Events.QUEUE_HAS_UPDATED, handleCarPlayQueueUpdate)
    PVEventEmitter.removeListener(PV.Events.APP_FINISHED_INITALIZING, handleCarPlayPodcastsUpdate)
  }

  handleNetworkChange = () => {
    (async () => {
      // isInternetReachable will be false

      // await this.checkAppVersion() not available on f-droid
      this.setState({ appReady: true })
      // Don't continue handleNetworkChange when internet is first reachable on initial app launch
      if (ignoreHandleNetworkChange) {
        ignoreHandleNetworkChange = false
        return
      }
      const skipCannotDownloadAlert = true
      if (await hasValidDownloadingConnection(skipCannotDownloadAlert)) {
        refreshDownloads()
      } else {
        pauseDownloadingEpisodesAll()
      }
    })()
  }

  setupGlobalState = async (theme: GlobalTheme) => {
    const fontScale = 1
    // const fontScale = await getFontScale()
    const appMode = await AsyncStorage.getItem(PV.Keys.APP_MODE)
    const fontScaleMode = determineFontScaleMode(fontScale)

    setGlobal(
      {
        globalTheme: theme,
        fontScaleMode,
        fontScale,
        appMode: appMode || PV.AppMode.podcasts
      }
    )
  }

  // checkAppVersion = async () => {
  //   const versionValid = await isOnMinimumAllowedVersion()
  //   this.setState({ minVersionMismatch: !versionValid })
  // }

  _renderIntersitial = () => {
    // if (this.state.minVersionMismatch) {
    //   return <UpdateRequiredOverlay />
    // }

    if (Platform.OS === 'ios') {
      return null
    }

    return (
      <View style={{ backgroundColor: PV.Colors.ink, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={PV.Images.BANNER} resizeMode='contain' />
      </View>
    )
  }

  render() {
    // Prevent white screen flash on navigation on Android
    const wrapperStyle =
      Platform.OS === 'android'
        ? {
            backgroundColor: PV.Colors.ink,
            borderColor: PV.Colors.ink,
            shadowOpacity: 1,
            opacity: 1
          }
        : {
          flex: 1
        }

    return this.state.appReady ? (
      <SafeAreaProvider initialMetrics={initialWindowMetrics} style={wrapperStyle}>
        <View style={{ flex: 1 }}>
          <Router />
          <OverlayAlert />
        </View>
        <ImageFullView />
      </SafeAreaProvider>
    ) : (
      this._renderIntersitial()
    )
  }
}

export default App
