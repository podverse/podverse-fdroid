import { Alert, Linking, StyleSheet } from 'react-native'
import React from 'reactn'
import { ScrollView, Text, View } from '../components'
import { PV } from '../resources'
import { gaTrackPageView } from '../services/googleAnalytics'

type Props = {}

type State = {}

export class AboutScreen extends React.Component<Props, State> {
  static navigationOptions = {
    title: 'About'
  }

  componentDidMount() {
    gaTrackPageView('/about', 'About Screen')
  }

  showLeavingAppAlert = (url: string) => {
    Alert.alert(PV.Alerts.LEAVING_APP.title, PV.Alerts.LEAVING_APP.message, [
      { text: 'Cancel' },
      { text: 'Yes', onPress: () => Linking.openURL(url) }
    ])
  }

  render() {
    return (
      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <Text style={styles.text}>
            {
              'Create and share highlights of your favorite podcasts with Podverse! '
              + 'Available on iOS, Android, and web. Sign up today and get 1 year of Podverse premium for free.'
            }
          </Text>
          <View style={styles.separator} />
          <Text style={styles.text}>
            {
              'All Podverse software is provided under an open source, copyleft license. '
              + 'That means anyone can download, modify, and use Podverse software for any purpose for free, '
              + 'as long as they also share their changes to the code. '
              + 'We believe open source transparency is necessary to create technology that respects its users, '
              + 'and copyleft sharing ensures that technology can never be monopolized.'
            }
          </Text>
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Team</Text>
          <Text style={styles.text}>
            {
              'Mitch Downey – Programmer\n\nCreon Creonopoulos - Programmer\n\nGary Johnson – Designer'
            }
          </Text>
        </ScrollView>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  content: {
    flex: 1
  },
  scrollViewContent: {
    padding: 15,
    paddingTop: 20
  },
  separator: {
    width: '100%',
    height: 1,
    backgroundColor: PV.Colors.grayLight,
    marginVertical: 15
  },
  link: {
    color: PV.Colors.blue
  },
  sectionTitle: {
    marginBottom: 15,
    fontSize: PV.Fonts.sizes.xl,
    color: PV.Colors.grayLight,
    fontWeight: PV.Fonts.weights.semibold
  },
  text: {
    fontSize: PV.Fonts.sizes.md
  }
})