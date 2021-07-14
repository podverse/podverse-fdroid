import { StyleSheet } from 'react-native'
import React from 'reactn'
import { ActivityIndicator, ComparisonTable, Text, TextLink, View } from '../components'
import { translate } from '../lib/i18n'
import { hasValidNetworkConnection } from '../lib/network'
import { getMembershipExpiration, getMembershipStatus, readableDate, testProps } from '../lib/utility'
import { PV } from '../resources'
import { displayFOSSPurchaseAlert } from '../services/purchaseShared'
import { getAuthUserInfo } from '../state/actions/auth'
import { getMembershipTextStyle } from '../styles'

type Props = {
  navigation?: any
}

type State = {
  disableButton: boolean
  isLoading: boolean
  showNoInternetConnectionMessage?: boolean
}

const testIDPrefix = 'membership_screen'

export class MembershipScreen extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)

    this.state = {
      disableButton: false,
      isLoading: true
    }
  }

  static navigationOptions = () => ({
      title: translate('Membership')
    })

  async componentDidMount() {
    try {
      await getAuthUserInfo()
    } catch (error) {
      //
    }

    const hasInternetConnection = await hasValidNetworkConnection()

    this.setState({
      isLoading: false,
      showNoInternetConnectionMessage: !hasInternetConnection
    })
  }

  handleRenewPress = () => {
    displayFOSSPurchaseAlert()
  }

  handleSignUpPress = () => {
    this.setState({ disableButton: true }, () => {
      (async () => {
        await this.props.navigation.navigate(PV.RouteNames.AuthScreen, {
          showSignUp: true,
          title: translate('Sign Up')
        })
        this.setState({ disableButton: false })
      })()
    })
  }

  render() {
    const { disableButton, isLoading, showNoInternetConnectionMessage } = this.state
    const { globalTheme, session } = this.global
    const { isLoggedIn, userInfo } = session
    const membershipStatus = getMembershipStatus(userInfo)
    const membershipTextStyle = getMembershipTextStyle(globalTheme, membershipStatus)
    const expirationDate = getMembershipExpiration(userInfo)

    return (
      <View style={styles.wrapper} {...testProps('membership_screen_view')}>
        {isLoading && isLoggedIn && <ActivityIndicator fillSpace />}
        {!isLoading && showNoInternetConnectionMessage && (
          <View style={styles.textRowCentered}>
            <Text style={[styles.subText, { textAlign: 'center' }]}>
              {translate('Connect to the internet and reload this page to sign up for Premium')}
            </Text>
          </View>
        )}
        {!isLoading && isLoggedIn && !!membershipStatus && (
          <View>
            <View style={styles.textRow}>
              <Text
                fontSizeLargestScale={PV.Fonts.largeSizes.md}
                style={styles.label}
                testID={`${testIDPrefix}_status_label`}>
                {translate('Status')}{' '}
              </Text>
              <Text
                fontSizeLargestScale={PV.Fonts.largeSizes.md}
                style={[styles.text, membershipTextStyle]}
                testID={`${testIDPrefix}_status_membership`}>
                {membershipStatus}
              </Text>
            </View>
            <View style={styles.textRow}>
              <Text
                fontSizeLargestScale={PV.Fonts.largeSizes.md}
                style={styles.label}
                testID={`${testIDPrefix}_expires`}>
                  {`${translate('Expires')}: `}
              </Text>
              <Text
                fontSizeLargestScale={PV.Fonts.largeSizes.md}
                style={styles.text}
                testID={`${testIDPrefix}_expiration_date`}>
                {readableDate(expirationDate)}
              </Text>
            </View>
            <View style={styles.textRowCentered}>
              <TextLink
                disabled={disableButton}
                fontSizeLargestScale={PV.Fonts.largeSizes.md}
                onPress={this.handleRenewPress}
                style={styles.subText}
                {...testProps(`${testIDPrefix}_renew_membership`)}>
                {translate('Renew Membership')}
              </TextLink>
            </View>
          </View>
        )}
        {!isLoading && !isLoggedIn && (
          <View>
            <View style={styles.textRowCentered}>
              <Text fontSizeLargestScale={PV.Fonts.largeSizes.md} style={styles.subTextCentered}>
                {translate('Get 1 year of Premium for free')}
              </Text>
            </View>
            <View style={styles.textRowCentered}>
              <Text fontSizeLargestScale={PV.Fonts.largeSizes.md} style={styles.subTextCentered}>
                {translate('10 per year after that')}
              </Text>
            </View>
            <View style={styles.textRowCentered}>
              <TextLink
                disabled={disableButton}
                fontSizeLargestScale={PV.Fonts.largeSizes.md}
                onPress={this.handleSignUpPress}
                style={styles.subText}
                {...testProps(`${testIDPrefix}_sign_up`)}>
                {translate('Sign Up')}
              </TextLink>
            </View>
          </View>
        )}
        {!isLoading && (
          <View style={styles.tableWrapper}>
            <ComparisonTable
              column1Title={translate('Free')}
              column2Title={translate('Premium')}
              data={comparisonData}
              mainTitle='Features'
            />
          </View>
        )}
      </View>
    )
  }
}

const comparisonData = [
  {
    text: translate('subscribe to podcasts'),
    column1: true,
    column2: true
  },
  {
    text: translate('download episodes'),
    column1: true,
    column2: true
  },
  {
    text: translate('drag-and-drop queue'),
    column1: true,
    column2: true
  },
  {
    text: translate('sleep timer'),
    column1: true,
    column2: true
  },
  // {
  //   text: translate('light - dark mode'),
  //   column1: true,
  //   column2: true
  // },
  {
    text: translate('create and share clips'),
    column1: false,
    column2: true
  },
  {
    text: translate('sync your subscriptions on all devices'),
    column1: false,
    column2: true
  },
  {
    text: translate('sync your queue on all devices'),
    column1: false,
    column2: true
  },
  {
    text: translate('create playlists'),
    column1: false,
    column2: true
  },
  {
    text: translate('download a backup of your data'),
    column1: false,
    column2: true
  },
  {
    text: translate('support free and open source software'),
    column1: true,
    column2: true
  }
]

const styles = StyleSheet.create({
  label: {
    fontSize: PV.Fonts.sizes.xl,
    fontWeight: PV.Fonts.weights.bold
  },
  subText: {
    fontSize: PV.Fonts.sizes.xl,
    fontWeight: PV.Fonts.weights.semibold,
    paddingVertical: 4
  },
  subTextCentered: {
    fontSize: PV.Fonts.sizes.xl,
    fontWeight: PV.Fonts.weights.semibold,
    textAlign: 'center'
  },
  tableWrapper: {
    flex: 1,
    marginTop: 12
  },
  text: {
    fontSize: PV.Fonts.sizes.xl,
    fontWeight: PV.Fonts.weights.semibold
  },
  textCentered: {
    fontSize: PV.Fonts.sizes.xl,
    fontWeight: PV.Fonts.weights.semibold,
    textAlign: 'center'
  },
  textRow: {
    flexDirection: 'row',
    margin: 8
  },
  textRowCentered: {
    flexDirection: 'row',
    marginHorizontal: 8,
    marginVertical: 4,
    justifyContent: 'center',
    textAlign: 'center'
  },
  wrapper: {
    flex: 1,
    paddingTop: 8
  }
})
