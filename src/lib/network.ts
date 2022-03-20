import AsyncStorage from '@react-native-community/async-storage'
import NetInfo, { NetInfoCellularGeneration, NetInfoState, NetInfoStateType } from '@react-native-community/netinfo'
import { Alert } from 'react-native'
import { PV } from '../resources'

const supportedGenerations = [
  NetInfoCellularGeneration['3g'],
  NetInfoCellularGeneration['4g'],
  NetInfoCellularGeneration['5g']
]

export const alertIfNoNetworkConnection = async (str?: string) => {
  const isConnected = await hasValidNetworkConnection()

  if (!isConnected) {
    Alert.alert(PV.Alerts.NETWORK_ERROR.title, PV.Alerts.NETWORK_ERROR.message(str), PV.Alerts.BUTTONS.OK)
    return true
  }

  return false
}

export const hasValidNetworkConnection = async (): Promise<boolean> => {
  const offlineModeEnabled = await AsyncStorage.getItem(PV.Keys.OFFLINE_MODE_ENABLED)

  if (offlineModeEnabled) {
    return false
  }

  const state = await NetInfo.fetch()
  if (state.isInternetReachable === null) {
    return new Promise((resolve) => {
      setTimeout(() => {
        NetInfo.fetch().then((currState) => {
          if (currState.isInternetReachable === null) {
            resolve(false)
          } else {
            const networkValid = currState.type === NetInfoStateType.wifi || cellNetworkSupported(currState)
            resolve(networkValid && currState.isInternetReachable === true)
          }
        })
      }, 200)
    })
  } else {
    const networkValid = state.type === NetInfoStateType.wifi || cellNetworkSupported(state)
    return networkValid && state.isInternetReachable === true
  }
}

export const hasValidDownloadingConnection = async () => {
  const downloadingWifiOnly = await AsyncStorage.getItem(PV.Keys.DOWNLOADING_WIFI_ONLY)

  const state = await NetInfo.fetch()
  if (downloadingWifiOnly && state.type !== NetInfoStateType.wifi) {
    return false
  }

  return hasValidNetworkConnection()
}

export const cellNetworkSupported = (state: NetInfoState) => {
  if (
    state.type === NetInfoStateType.cellular &&
    state.details.cellularGeneration &&
    supportedGenerations.includes(state.details.cellularGeneration)
  ) {
    return true
  }

  return false
}
