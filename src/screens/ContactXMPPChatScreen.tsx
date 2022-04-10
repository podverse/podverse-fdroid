import { Alert, Linking, StyleSheet } from 'react-native'
import React from 'reactn'
import { ScrollView, Text, TextLink } from '../components'
import { translate } from '../lib/i18n'
import { PV } from '../resources'

type Props = {
  navigation?: any
}

const testIDPrefix = 'contact_xmpp_chat_screen'

export class ContactXMPPChatScreen extends React.Component<Props> {
  static navigationOptions = () => ({
    title: translate('Official chat')
  })

  _handleWebClientLinkPress = () => {
    Alert.alert(PV.Alerts.LEAVING_APP.title, PV.Alerts.LEAVING_APP.message, [
      { text: 'Cancel' },
      { text: 'Yes', onPress: () => Linking.openURL(PV.URLs.xmpp.webClientUrl) }
    ])
  }

  render() {

    return (
      <ScrollView contentContainerStyle={styles.scrollViewContent} testID={`${testIDPrefix}_view`}>
        <Text style={styles.headerText}>{translate('ContactXMPPText1')}</Text>
        <Text style={styles.text}>{translate('ContactXMPPText2')}</Text>
        <TextLink onPress={this._handleWebClientLinkPress} style={styles.linkText} text={PV.URLs.xmpp.webClientUrl} />
        <Text style={styles.text}>{translate('ContactXMPPChatRooms')}</Text>
        <Text selectable style={styles.url}>{PV.URLs.xmpp.serverDomain}</Text>
        <Text style={styles.text}>{translate('ContactXMPPServerGroups')}</Text>
        <Text selectable style={styles.url}>{PV.URLs.xmpp.serverGroups}</Text>
      </ScrollView>
    )
  }
}


const styles = StyleSheet.create({
  divider: {
    marginVertical: 16
  },
  headerText: {
    fontSize: PV.Fonts.sizes.xxl
  },
  linkText: {
    fontSize: PV.Fonts.sizes.xxl,
    marginTop: 8
  },
  scrollViewContent: {
    padding: 15,
    paddingTop: 20
  },
  text: {
    fontSize: PV.Fonts.sizes.xxl,
    marginTop: 32
  },
  url: {
    fontSize: PV.Fonts.sizes.xxl
  }
})
