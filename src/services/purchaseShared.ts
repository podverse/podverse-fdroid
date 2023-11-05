import { Alert, Linking } from 'react-native'
import { translate } from '../lib/i18n'

export const displayFOSSPurchaseAlert = () => {
  Alert.alert(translate('Leaving App'), translate('FOSS purchase alert text'), [
    { text: translate('Cancel') },
    {
      text: translate('Renew Membership'),
      // use r.podverse.fm redirect to avoid app catching the URL as a deep link
      onPress: () => Linking.openURL('https://r.podverse.fm/extend-membership')
    }
  ])
}
