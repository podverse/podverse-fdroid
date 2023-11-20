/* eslint-disable max-len */
import AsyncStorage from '@react-native-community/async-storage'
import { StyleSheet } from 'react-native'
import React from 'reactn'
import Config from 'react-native-config'
import { Divider, ScrollView, SwitchWithText, View } from '../components'
import { translate } from '../lib/i18n'
import { PV } from '../resources'
import { setErrorReportingEnabled } from '../state/actions/settings'
import { core } from '../styles'

type Props = {
  navigation: any
}

const testIDPrefix = 'settings_screen_tracking'

export class SettingsScreenTracking extends React.Component<Props> {
  constructor(props: Props) {
    super(props)
  }

  static navigationOptions = () => ({
    title: translate('Tracking')
  })

  _handleToggleErrorReporting = async () => {
    const errorReportingEnabled = await AsyncStorage.getItem(PV.Keys.ERROR_REPORTING_ENABLED)
    setErrorReportingEnabled(!errorReportingEnabled)
  }

  _handleToggleListenTracking = () => {
    const { navigation } = this.props
    navigation.navigate(PV.RouteNames.TrackingConsentScreen)
  }

  render() {
    const { errorReportingEnabled, listenTrackingEnabled } = this.global

    return (
      <ScrollView
        contentContainerStyle={styles.scrollViewContentContainer}
        style={styles.wrapper}
        testID={`${testIDPrefix}_view`}>
        {!Config.DISABLE_CRASH_LOGS && (
          <View>
            <View style={core.itemWrapper}>
              <SwitchWithText
                accessibilityHint={translate('Error Reporting subtext')}
                accessibilityLabel={translate('Error Reporting')}
                onValueChange={this._handleToggleErrorReporting}
                subText={translate('Error Reporting subtext')}
                testID={`${testIDPrefix}_error_reporting`}
                text={translate('Error Reporting')}
                value={!!errorReportingEnabled}
              />
            </View>
            <Divider style={core.itemWrapper} />
          </View>
        )}
        <View>
          <View style={core.itemWrapper}>
            <SwitchWithText
              accessibilityHint={translate('Listen Tracking subtext')}
              accessibilityLabel={translate('Listen Tracking')}
              onValueChange={this._handleToggleListenTracking}
              subText={translate('Listen Tracking subtext')}
              testID={`${testIDPrefix}_listen_tracking`}
              text={translate('Listen Tracking')}
              value={!!listenTrackingEnabled}
            />
          </View>
          <Divider style={core.itemWrapper} />
        </View>
      </ScrollView>
    )
  }
}

const styles = StyleSheet.create({
  scrollViewContentContainer: {
    paddingBottom: 48
  },
  wrapper: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 12
  }
})
