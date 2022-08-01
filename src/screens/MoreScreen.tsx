import AsyncStorage from '@react-native-community/async-storage'
import { parseOpmlFile } from 'podverse-shared'
import { SectionList, Alert } from 'react-native'
import Config from 'react-native-config'
import React from 'reactn'
import { parseString } from 'react-native-xml2js'
import DocumentPicker from 'react-native-document-picker'
import RNFS from 'react-native-fs'
import { Divider, TableSectionSelectors, Text, View, ActivityIndicator, TableCell } from '../components'
import { translate } from '../lib/i18n'
import { getMembershipStatus } from '../lib/membership'
import { exportSubscribedPodcastsAsOPML } from '../lib/opmlExport'
import { PV } from '../resources'
import { logoutUser } from '../state/actions/auth'
import { core, getMembershipTextStyle, table } from '../styles'
import { addAddByRSSPodcasts } from '../state/actions/parser'

type Props = {
  navigation?: any
}

type State = {
  options: any[]
  isLoading: boolean
}

const testIDPrefix = 'more_screen'

export class MoreScreen extends React.Component<Props, State> {
  state = {
    options: [],
    isLoading: false
  }

  static navigationOptions = () => ({
    title: translate('More')
  })

  _moreFeaturesOptions = (isLoggedIn: boolean) => {
    const moreFeaturesList = Config.NAV_STACK_MORE_FEATURES.split(',')
    const loggedInFeatures = [_logoutKey]

    return allMoreFeatures
      .filter((item: any) => moreFeaturesList.find((screenKey: any) => item.key === screenKey))
      .filter((item = { key: '', title: '' }) => {
        if (isLoggedIn) {
          return item.key !== _loginKey
        } else {
          return !loggedInFeatures.some((screenKey: any) => item.key === screenKey)
        }
      })
  }

  _moreOtherOptions = (membershipStatus?: string) => {
    const allMoreOtherOptions = [
      {
        title: membershipStatus,
        key: _membershipKey,
        routeName: PV.RouteNames.MembershipScreen
      },
      {
        title: translate('Contact'),
        key: _contactKey,
        routeName: PV.RouteNames.ContactScreen
      },
      {
        title: translate('Support'),
        key: _supportKey,
        routeName: PV.RouteNames.SupportScreen
      },
      {
        title: translate('About'),
        key: _aboutKey,
        routeName: PV.RouteNames.AboutScreen
      },
      {
        title: translate('Terms of Service'),
        key: _termsOfServiceKey,
        routeName: PV.RouteNames.TermsOfServiceScreen
      },
      {
        title: translate('Privacy Policy'),
        key: _privacyPolicyKey,
        routeName: PV.RouteNames.PrivacyPolicyScreen
      }
    ]

    const moreOtherList = Config.NAV_STACK_MORE_OTHER.split(',')

    const options = allMoreOtherOptions.filter((item: any) =>
      moreOtherList.find((screenKey: string) => item.key === screenKey)
    )

    return options
  }

  _handleValueTagSetupPressed = async () => {
    const consentGivenString = await AsyncStorage.getItem(PV.Keys.USER_CONSENT_VALUE_TAG_TERMS)
    if (consentGivenString && JSON.parse(consentGivenString) === true) {
      this.props.navigation.navigate(PV.RouteNames.ValueTagSetupScreen)
    } else {
      this.props.navigation.navigate(PV.RouteNames.ValueTagPreviewScreen)
    }
  }

  _importOpml = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles]
      })

      if (!res) {
        throw new Error('Something went wrong with the import process.')
      } else {
        const contents = await RNFS.readFile(res.uri, 'utf8')

        this.setState({ isLoading: true }, () => {
          parseString(contents, async (err: any, result: any) => {
            try {
              if (err) {
                throw err
              } else if (!result?.opml?.body[0]?.outline) {
                throw new Error('OPML file is not in the correct format')
              }

              const rssArr = parseOpmlFile(result, true)
              await addAddByRSSPodcasts(rssArr)

              this.setState({ isLoading: false }, () => {
                this.props.navigation.navigate(PV.RouteNames.PodcastsScreen)
              })
            } catch (error) {
              console.log('Error parsing podcast: ', error)
              this.setState({ isLoading: false })
            }
          })
        })
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker, exit any dialogs or menus and move on
      } else {
        console.log('Error parsing podcast: ', err)
        Alert.alert('Error', 'There was an issue with the opml file import.', err.message)
      }
    }
  }

  _onPress = (item: any) => {
    const { navigation } = this.props
    if (item.key === _logoutKey) {
      logoutUser()
    } else if (item.key === _bitcoinWalletKey) {
      this._handleValueTagSetupPressed()
    } else if (item.key === _importOpml) {
      this._importOpml()
    } else if (item.key === _exportOpml) {
      exportSubscribedPodcastsAsOPML()
    } else {
      navigation.navigate(item.routeName)
    }
  }

  render() {
    const { globalTheme, session } = this.global
    const { isLoggedIn = false, userInfo } = session

    const featureOptions = this._moreFeaturesOptions(isLoggedIn)

    const membershipStatus = getMembershipStatus(userInfo) || ''
    const membershipTextStyle = getMembershipTextStyle(globalTheme, membershipStatus)
    const otherOptions = this._moreOtherOptions(membershipStatus)

    const membershipAccessibilityLabel = `${translate('Membership')}${isLoggedIn ? ' - ' : ''} ${
      membershipStatus ? membershipStatus : ''
    }`

    return (
      <View style={core.backgroundView} testID={`${testIDPrefix}_view`}>
        <SectionList
          ItemSeparatorComponent={() => <Divider />}
          renderItem={({ item }) => {
            const { appMode } = this.global
            let appModeSelectedText = translate('Podcasts')
            if (appMode === PV.AppMode.videos) {
              appModeSelectedText = translate('Videos')
            }
            const modeLabel = `${translate('Mode')}: ${appModeSelectedText}`

            const accessibilityLabel =
              item.key === _membershipKey
                ? membershipAccessibilityLabel
                : item.key === _appModeKey
                ? modeLabel
                : item.title

            return (
              <TableCell
                accessibilityLabel={accessibilityLabel}
                onPress={() => this._onPress(item)}
                testIDPrefix={`${testIDPrefix}_${item.key}`}
                testIDSuffix=''>
                <>
                  {item.key === _appModeKey && (
                    <Text
                      accessibilityLabel={modeLabel}
                      fontSizeLargestScale={PV.Fonts.largeSizes.md}
                      style={[table.cellText, globalTheme.tableCellTextPrimary]}>
                      {modeLabel}
                    </Text>
                  )}
                  {item.key === _membershipKey && (
                    <>
                      {!isLoggedIn && (
                        <Text
                          fontSizeLargestScale={PV.Fonts.largeSizes.md}
                          style={[table.cellText, globalTheme.tableCellTextPrimary]}>
                          {`${translate('Membership')}`}
                        </Text>
                      )}
                      {isLoggedIn && (
                        <Text
                          fontSizeLargestScale={PV.Fonts.largeSizes.md}
                          style={[table.cellText, membershipTextStyle]}>
                          {membershipStatus}
                        </Text>
                      )}
                    </>
                  )}
                  {item.key !== _appModeKey && item.key !== _membershipKey && (
                    <Text
                      fontSizeLargestScale={PV.Fonts.largeSizes.md}
                      style={[table.cellText, globalTheme.tableCellTextPrimary]}>
                      {item.title}
                    </Text>
                  )}
                </>
              </TableCell>
            )
          }}
          renderSectionHeader={({ section }) => (
            <TableSectionSelectors
              disableFilter
              includePadding
              selectedFilterLabel={section.title}
              textStyle={[globalTheme.headerText, core.sectionHeaderText]}
            />
          )}
          sections={[
            { title: translate('Features'), data: featureOptions },
            { title: translate('Other'), data: otherOptions }
          ]}
          stickySectionHeadersEnabled={false}
        />
        {this.state.isLoading && <ActivityIndicator isOverlay testID={testIDPrefix} transparent={false} />}
      </View>
    )
  }
}

const _aboutKey = 'About'
const _addPodcastByRSSKey = 'AddPodcastByRSS'
const _appModeKey = 'AppMode'
const _bitcoinWalletKey = 'BitcoinWallet'
const _contactKey = 'Contact'
const _loginKey = 'Login'
const _logoutKey = 'Logout'
const _membershipKey = 'Membership'
const _privacyPolicyKey = 'PrivacyPolicy'
const _settingsKey = 'Settings'
const _supportKey = 'Support'
const _termsOfServiceKey = 'TermsOfService'
const _importOpml = 'ImportOpml'
const _exportOpml = 'ExportOpml'

const allMoreFeatures = [
  {
    title: translate('Login'),
    key: _loginKey,
    routeName: PV.RouteNames.AuthNavigator
  },
  {
    title: translate('Add Custom RSS Feed'),
    key: _addPodcastByRSSKey,
    routeName: PV.RouteNames.AddPodcastByRSSScreen
  },
  {
    title: translate('Mode'),
    key: _appModeKey,
    routeName: PV.RouteNames.AppModeScreen
  },
  {
    title: translate('Bitcoin Wallet'),
    key: _bitcoinWalletKey
  },
  {
    title: translate('Settings'),
    key: _settingsKey,
    routeName: PV.RouteNames.SettingsScreen
  },
  {
    title: translate('Import OPML'),
    key: _importOpml
  },
  {
    title: translate('Export OPML'),
    key: _exportOpml
  },
  {
    title: translate('Log out'),
    key: _logoutKey
  }
]
