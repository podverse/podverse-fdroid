/* eslint-disable max-len */
import AsyncStorage from '@react-native-community/async-storage'
import { StyleSheet } from 'react-native'
import Config from 'react-native-config'
import React from 'reactn'
import { ScrollView, SwitchWithText, View } from '../components'
import { translate } from '../lib/i18n'
import { PV } from '../resources'
import { setCensorNSFWText, setHideCompleted } from '../state/actions/settings'
import { core, darkTheme, lightTheme } from '../styles'

type Props = {
  navigation: any
}

const testIDPrefix = 'settings_screen_other'

export class SettingsScreenOther extends React.Component<Props> {
  constructor(props: Props) {
    super(props)
  }

  static navigationOptions = () => ({
    title: translate('Other')
  })

  _handleToggleNSFWText = async () => {
    const censorNSFWText = await AsyncStorage.getItem(PV.Keys.CENSOR_NSFW_TEXT)
    setCensorNSFWText(!censorNSFWText)
  }

  _handleToggleHideCompletedByDefault = async () => {
    const hideCompleted = await AsyncStorage.getItem(PV.Keys.HIDE_COMPLETED)
    setHideCompleted(!hideCompleted)
  }

  _toggleTheme = async () => {
    const darkModeEnabled = await AsyncStorage.getItem(PV.Keys.DARK_MODE_ENABLED)
    const newDarkModeSetting = darkModeEnabled === 'TRUE'
    this.setGlobal({ globalTheme: !newDarkModeSetting ? darkTheme : lightTheme }, async () => {
      !newDarkModeSetting
        ? await AsyncStorage.setItem(PV.Keys.DARK_MODE_ENABLED, 'TRUE')
        : await AsyncStorage.setItem(PV.Keys.DARK_MODE_ENABLED, 'FALSE')
    })
  }

  render() {
    const { censorNSFWText, globalTheme, hideCompleted } = this.global

    return (
      <ScrollView
        contentContainerStyle={styles.scrollViewContentContainer}
        style={styles.wrapper}
        testID={`${testIDPrefix}_view`}>
        {!Config.DISABLE_THEME_SWITCH && (
          <View style={core.itemWrapper}>
            <SwitchWithText
              accessible={false}
              accessibilityHint={translate('ARIA HINT - change the colors of the user interface')}
              accessibilityLabel={`${globalTheme === darkTheme ? translate('Dark Mode') : translate('Light Mode')}`}
              onValueChange={this._toggleTheme}
              testID={`${testIDPrefix}_dark_mode`}
              text={`${globalTheme === darkTheme ? translate('Dark Mode') : translate('Light Mode')}`}
              value={globalTheme === darkTheme}
            />
          </View>
        )}
        <View style={core.itemWrapper}>
          <SwitchWithText
            accessibilityLabel={translate('Censor NSFW text')}
            onValueChange={this._handleToggleNSFWText}
            testID={`${testIDPrefix}_censor_nsfw_text`}
            text={translate('Censor NSFW text')}
            value={!!censorNSFWText}
          />
        </View>
        <View style={core.itemWrapper}>
          <SwitchWithText
            accessibilityLabel={translate('Hide completed episodes by default')}
            onValueChange={this._handleToggleHideCompletedByDefault}
            testID={`${testIDPrefix}_hide_completed`}
            text={translate('Hide completed episodes by default')}
            value={!!hideCompleted}
          />
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
