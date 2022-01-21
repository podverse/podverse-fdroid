import { Image, Platform, View } from 'react-native'
import Config from 'react-native-config'
import { createAppContainer, createSwitchNavigator } from 'react-navigation'
import { createStackNavigator, NavigationStackOptions, NavigationStackProp } from 'react-navigation-stack'
import { createBottomTabNavigator } from 'react-navigation-tabs'
import React, { Component } from 'react'
import { DownloadsActiveBadge, ErrorBoundary, NavSearchIcon, PVTabBar, TabBarLabel } from './components'
import { PV } from './resources'
import {
  AboutScreen,
  AddPodcastByRSSAuthScreen,
  AddPodcastByRSSScreen,
  AuthScreen,
  ClipsScreen,
  ContactScreen,
  DownloadsScreen,
  EditPlaylistScreen,
  EditProfileScreen,
  EmailVerificationScreen,
  EpisodeMediaRefScreen,
  EpisodeScreen,
  EpisodesScreen,
  FAQScreen,
  FilterScreen,
  FundingScreen,
  HistoryScreen,
  LNPaySignupScreen,
  MakeClipScreen,
  MembershipScreen,
  MoreScreen,
  MyLibraryScreen,
  OnboardingScreen,
  PlayerScreen,
  PlaylistsAddToScreen,
  PlaylistScreen,
  PlaylistsScreen,
  PodcastScreen,
  PodcastsScreen,
  PrivacyPolicyScreen,
  ProfileScreen,
  ProfilesScreen,
  QueueScreen,
  SearchScreen,
  SettingsScreen,
  SettingsScreenAccount,
  SettingsScreenAdvanced,
  SettingsScreenVisualDesign,
  SettingsScreenDownloads,
  SettingsScreenHistory,
  SettingsScreenPlayer,
  SettingsScreenQueue,
  SleepTimerScreen,
  StartPodcastFromTimeScreen,
  SupportScreen,
  TermsOfServiceScreen,
  ValueTagConsentScreen,
  ValueTagPreviewScreen,
  ValueTagSetupScreen,
  WebPageScreen
} from './screens'
import { darkTheme } from './styles'
import { PodcastInfoScreen } from './screens/PodcastInfoScreen'
import { translate } from './lib/i18n'

const defaultNavigationOptions = ({ navigation }) => {
  return {
    headerStyle: { backgroundColor: PV.Colors.ink, shadowColor: 'transparent' },
    title: PV.Tabs.Podcasts.title,
    headerTintColor: darkTheme.text.color,
    headerTitleStyle: {
      fontWeight: 'bold'
    },
    headerRight: () => <NavSearchIcon navigation={navigation} />,
    // Prevent white screen flash on navigation on Android
    ...(Platform.OS === 'android' ? { animationEnabled: false } : {}),
    ...(Platform.OS === 'android' ? { backgroundColor: 'transparent' } : {})
  } as NavigationStackOptions
}

const AuthNavigator = createStackNavigator(
  {
    [PV.RouteNames.AuthScreen]: AuthScreen
  },
  {
    defaultNavigationOptions
  }
)

const PodcastsNavigator = createStackNavigator(
  {
    [PV.RouteNames.PodcastsScreen]: {
      screen: PodcastsScreen,
      path: PV.DeepLinks.Podcasts.path
    },
    [PV.RouteNames.PodcastScreen]: {
      screen: PodcastScreen,
      path: PV.DeepLinks.Podcast.path
    },
    [PV.RouteNames.PodcastInfoScreen]: {
      screen: PodcastInfoScreen
    },
    [PV.RouteNames.EpisodeScreen]: {
      screen: EpisodeScreen,
      path: PV.DeepLinks.Episode.path
    },
    [PV.RouteNames.EpisodeMediaRefScreen]: {
      screen: EpisodeMediaRefScreen
    }
  },
  {
    defaultNavigationOptions,
    initialRouteName: PV.RouteNames.PodcastsScreen,
    navigationOptions: {
      tabBarAccessibilityLabel: translate('Podcasts'),
      tabBarIcon: ({ tintColor }: { tintColor: any }) => (
        <Image source={PV.Tabs.Podcasts.icon} style={{ tintColor }} resizeMode={'contain'} />
      ),
      tabBarLabel: (props) => <TabBarLabel {...props} title={PV.Tabs.Podcasts.title} />,
      tabBarTestID: 'tab_podcasts_screen'.prependTestId()
    }
  }
)

const EpisodesNavigator = createStackNavigator(
  {
    [PV.RouteNames.EpisodesScreen]: EpisodesScreen,
    [PV.RouteNames.EpisodeScreen]: EpisodeScreen,
    [PV.RouteNames.EpisodeMediaRefScreen]: {
      screen: EpisodeMediaRefScreen
    }
  },
  {
    defaultNavigationOptions,
    navigationOptions: {
      tabBarIcon: ({ tintColor }: { tintColor: any }) => (
        <Image source={PV.Tabs.Episodes.icon} style={{ tintColor }} resizeMode={'contain'} />
      ),
      tabBarAccessibilityLabel: translate('Episodes'),
      tabBarLabel: (props) => <TabBarLabel {...props} title={PV.Tabs.Episodes.title} />,
      tabBarTestID: 'tab_episodes_screen'.prependTestId()
    },
  }
)

const ClipsNavigator = createStackNavigator(
  {
    [PV.RouteNames.ClipsScreen]: ClipsScreen
  },
  {
    defaultNavigationOptions,
    navigationOptions: {
      tabBarAccessibilityLabel: translate('Clips'),
      tabBarIcon: ({ tintColor }: { tintColor: any }) =>
        <Image source={PV.Tabs.Clips.icon} style={{ tintColor }} resizeMode={'contain'} />,
      tabBarLabel: (props) => <TabBarLabel {...props} title={PV.Tabs.Clips.title} />,
      tabBarTestID: 'tab_clips_screen'.prependTestId()
    }
  }
)

const SearchNavigator = createStackNavigator(
  {
    [PV.RouteNames.SearchScreen]: { screen: SearchScreen, path: '' }
  },
  {
    defaultNavigationOptions
  }
)

const FilterNavigator = createStackNavigator(
  {
    [PV.RouteNames.FilterScreen]: { screen: FilterScreen, path: '' }
  },
  {
    defaultNavigationOptions
  }
)

const MoreNavigator = createStackNavigator(
  {
    [PV.RouteNames.MoreScreen]: MoreScreen,
    [PV.RouteNames.SettingsScreen]: SettingsScreen,
    [PV.RouteNames.SettingsScreenAccount]: SettingsScreenAccount,
    [PV.RouteNames.SettingsScreenAdvanced]: SettingsScreenAdvanced,
    [PV.RouteNames.SettingsScreenVisualDesign]: SettingsScreenVisualDesign,
    [PV.RouteNames.SettingsScreenDownloads]: SettingsScreenDownloads,
    [PV.RouteNames.SettingsScreenHistory]: SettingsScreenHistory,
    [PV.RouteNames.SettingsScreenPlayer]: SettingsScreenPlayer,
    [PV.RouteNames.SettingsScreenQueue]: SettingsScreenQueue,
    [PV.RouteNames.MembershipScreen]: MembershipScreen,
    [PV.RouteNames.ContactScreen]: ContactScreen,
    [PV.RouteNames.SupportScreen]: SupportScreen,
    [PV.RouteNames.AboutScreen]: AboutScreen,
    [PV.RouteNames.TermsOfServiceScreen]: TermsOfServiceScreen,
    [PV.RouteNames.LNPaySignupScreen]: LNPaySignupScreen,
    [PV.RouteNames.PrivacyPolicyScreen]: PrivacyPolicyScreen,
    [PV.RouteNames.FAQScreen]: FAQScreen,
    [PV.RouteNames.ValueTagSetupScreen]: ValueTagSetupScreen
  },
  {
    defaultNavigationOptions,
    navigationOptions: {
      tabBarAccessibilityLabel: translate('More'),
      tabBarIcon: ({ tintColor }: { tintColor: any }) => {
        return (
          <View>
            <Image source={PV.Tabs.More.icon} style={{ tintColor }} resizeMode={'contain'} />
          </View>
        )
      },
      tabBarLabel: (props) => <TabBarLabel {...props} title={translate('More')} />,
      tabBarTestID: 'tab_more_screen'.prependTestId()
    }
  }
)

const MyLibraryNavigator = createStackNavigator(
  {
    [PV.RouteNames.MyLibraryScreen]: MyLibraryScreen,
    [PV.RouteNames.HistoryScreen]: HistoryScreen,
    [PV.RouteNames.DownloadsScreen]: DownloadsScreen,
    [PV.RouteNames.PlaylistScreen]: {
      screen: PlaylistScreen,
      path: PV.DeepLinks.Playlist.path
    },
    [PV.RouteNames.QueueScreen]: QueueScreen,
    [PV.RouteNames.MyProfileScreen]: ProfileScreen,
    [PV.RouteNames.EditProfileScreen]: EditProfileScreen,
    [PV.RouteNames.PlaylistsScreen]: {
      screen: PlaylistsScreen,
      path: PV.DeepLinks.Playlists.path
    },
    [PV.RouteNames.EditPlaylistScreen]: EditPlaylistScreen,
    [PV.RouteNames.ProfilesScreen]: {
      screen: ProfilesScreen,
      path: PV.DeepLinks.Profiles.path
    },
    [PV.RouteNames.ProfileScreen]: {
      screen: ProfileScreen,
      path: PV.DeepLinks.Profile.path
    }
  },
  {
    initialRouteName: PV.RouteNames.MyLibraryScreen,
    defaultNavigationOptions,
    navigationOptions: {
      tabBarAccessibilityLabel: translate('My Library'),
      // eslint-disable-next-line react/prop-types
      tabBarIcon: ({ tintColor }: { tintColor: any }) => {
        return (
          <View>
            <Image source={PV.Tabs.Queue.icon} style={{ tintColor }} resizeMode={'contain'} />
            <DownloadsActiveBadge />
          </View>
        )
      },
      tabBarLabel: (props) => <TabBarLabel {...props} title='My Library' />,
      tabBarTestID: 'tab_my_library_screen'.prependTestId()
    }
  }
)

const OnboardingNavigator = createStackNavigator(
  {
    [PV.RouteNames.OnboardingScreen]: OnboardingScreen,
    [PV.RouteNames.AuthNavigator]: AuthNavigator
  },
  {
    initialRouteName: PV.RouteNames.OnboardingScreen,
    mode: 'modal',
    headerMode: 'none'
  }
)

const allTabs = {
  Podcasts: {
    screen: PodcastsNavigator,
    path: ''
  },
  Episodes: EpisodesNavigator,
  'MyLibrary': { screen: MyLibraryNavigator, path: '' },
  // Remove this after the 'My Library' string is no longer used in NAV_STACK_TABS .env vars
  'My Library': { screen: MyLibraryNavigator, path: '' },
  Clips: ClipsNavigator,
  More: { screen: MoreNavigator, path: PV.DeepLinks.Search.path }
}

const tabsList = Config.NAV_STACK_TABS.split(',')

const tabs = {}
tabsList.forEach((tabName: string) => {
  tabs[tabName] = allTabs[tabName]
})

const TabNavigator = createBottomTabNavigator(tabs, {
  tabBarComponent: (props: any) => <PVTabBar {...props} />
})

const PlayerNavigator = createStackNavigator(
  {
    [PV.RouteNames.PlayerScreen]: {
      screen: PlayerScreen,
      path: PV.DeepLinks.Clip.path
    },
    [PV.RouteNames.MakeClipScreen]: { screen: MakeClipScreen, navigationOptions: { gestureEnabled: false } },
    [PV.RouteNames.QueueScreen]: QueueScreen,
    [PV.RouteNames.PlayerFAQScreen]: FAQScreen,
    [PV.RouteNames.PlayerMyProfileScreen]: ProfileScreen,
    [PV.RouteNames.PlayerMembershipScreen]: MembershipScreen
  },
  {
    defaultNavigationOptions
  }
)

const PlaylistsAddToNavigator = createStackNavigator(
  {
    [PV.RouteNames.PlaylistsAddToScreen]: PlaylistsAddToScreen
  },
  {
    defaultNavigationOptions
  }
)

const SleepTimerNavigator = createStackNavigator(
  {
    [PV.RouteNames.SleepTimerScreen]: SleepTimerScreen
  },
  {
    defaultNavigationOptions
  }
)

const StartPodcastFromTimeNavigator = createStackNavigator(
  {
    [PV.RouteNames.StartPodcastFromTimeScreen]: StartPodcastFromTimeScreen
  },
  {
    defaultNavigationOptions
  }
)

const WebPageNavigator = createStackNavigator(
  {
    [PV.RouteNames.WebPageScreen]: WebPageScreen
  },
  {
    defaultNavigationOptions
  }
)

const EmailVerificationNavigator = createStackNavigator(
  {
    [PV.RouteNames.EmailVerificationScreen]: EmailVerificationScreen
  },
  {
    defaultNavigationOptions
  }
)

const AddPodcastByRSSURLNavigator = createStackNavigator(
  {
    [PV.RouteNames.AddPodcastByRSSScreen]: {
      screen: AddPodcastByRSSScreen,
      path: PV.DeepLinks.AddByRSSPodcastFeedUrl.path
    }
  },
  {
    defaultNavigationOptions
  }
)

const AddPodcastByRSSAuthNavigator = createStackNavigator(
  {
    [PV.RouteNames.AddPodcastByRSSAuthScreen]: AddPodcastByRSSAuthScreen
  },
  {
    defaultNavigationOptions
  }
)

const FundingScreenNavigator = createStackNavigator(
  {
    [PV.RouteNames.FundingScreen]: {
      screen: FundingScreen
    },
  },
  {
    defaultNavigationOptions
  }
)

const ValueTagOnboardingNavigator = createStackNavigator(
  {
    [PV.RouteNames.ValueTagPreviewScreen]: {
      screen: ValueTagPreviewScreen
    },
    [PV.RouteNames.ValueTagConsentScreen]: {
      screen: ValueTagConsentScreen
    }
  },
  {
    defaultNavigationOptions
  }
)

const MainApp = createStackNavigator(
  {
    [PV.RouteNames.TabNavigator]: { screen: TabNavigator, path: '' },
    [PV.RouteNames.AuthNavigator]: AuthNavigator,
    [PV.RouteNames.PlayerNavigator]: { screen: PlayerNavigator, path: '' },
    PlaylistsAddToNavigator,
    SearchNavigator,
    FilterNavigator,
    SleepTimerNavigator,
    StartPodcastFromTimeNavigator,
    WebPageNavigator,
    EmailVerificationNavigator,
    FundingScreenNavigator,
    [PV.RouteNames.AddPodcastByRSSScreen]: {
      screen: AddPodcastByRSSURLNavigator,
      path: ''
    },
    AddPodcastByRSSAuthNavigator,
    ValueTagOnboardingNavigator
  },
  {
    mode: 'modal',
    headerMode: 'none'
  }
)

const SwitchNavigator = createSwitchNavigator(
  {
    MainApp: { screen: MainApp, path: '' },
    Onboarding: OnboardingNavigator
  },
  {
    initialRouteName: PV.RouteNames.MainApp
  }
)

type Props = {
  navigation: NavigationStackProp
}

type State = Record<string, unknown>

class AppNavigator extends Component<Props, State> {
  static router = SwitchNavigator.router
  render() {
    const { navigation } = this.props
    return (
      <ErrorBoundary navigation={navigation}>
        <SwitchNavigator navigation={navigation} />
      </ErrorBoundary>
    )
  }
}

const App = createAppContainer(AppNavigator)
const prefix = PV.DeepLinks.prefix

export default () => <App uriPrefix={prefix} theme="dark"/>
