import { Alert, Linking } from 'react-native'
import { translate } from '../lib/i18n'

export const displayFOSSPurchaseAlert = () => {
  Alert.alert(translate('Leaving App'), translate('FOSS purchase alert text'), [
    { text: translate('Cancel') },
    {
      text: translate('Renew Membership'),
      onPress: () => Linking.openURL('https://podverse.fm/extend-membership')
    }
  ])
}
