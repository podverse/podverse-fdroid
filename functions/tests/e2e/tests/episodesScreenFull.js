/* eslint-disable max-len */
const { getDriver } = require('../driver/driverFactory')
const { elementByIdAndClickAndTest, elementByIdClick, elementByIdHasText, elementCheckIfNotPresent, goBackKey, noTestLabel } = require('../driver/helpers/elements')
const test_episodesScreenFull = async () => {
  console.log('_Episodes Screen Full_')
  const driver = getDriver()

  await elementByIdAndClickAndTest('tab_episodes_screen', 'episodes_screen_view')

  //START FILTER TESTS

  // await elementByIdHasText('episodes_screen_dropdown_button_text', 'top - week')
  // await elementByIdHasText('episodes_screen_table_section_header_title_text', 'All Podcasts')

  // await elementByIdAndClickAndTest('episodes_screen_dropdown_button', 'filter_screen_view')

  // await elementByIdAndClickAndTest('filter_screen_all-podcasts', 'filter_screen_all-podcasts_check_icon_button') //1a
  // await elementByIdAndClickAndTest('filter_screen_downloaded', 'filter_screen_downloaded_check_icon_button') //2a

  // //go back
  // await elementByIdClick('filter_screen_nav_header_button_text')
  // //check title text
  // await elementByIdHasText('episodes_screen_table_section_header_title_text', 'Downloaded')
  // //navigate back to filter screen
  // await elementByIdAndClickAndTest('episodes_screen_dropdown_button', 'filter_screen_view')

  // await elementCheckIfNotPresent('filter_screen_subscribed_check_icon_button') //1b
  // await elementByIdAndClickAndTest('filter_screen_subscribed', 'filter_screen_subscribed_check_icon_button') //8a
  
  // //go back
  // await elementByIdClick('filter_screen_nav_header_button_text')
  // //check title text
  // await elementByIdHasText('episodes_screen_table_section_header_title_text', 'Subscribed')
  // //navigate back to filter screen
  // await elementByIdAndClickAndTest('episodes_screen_dropdown_button', 'filter_screen_view')

  // await elementCheckIfNotPresent('filter_screen_downloaded_check_icon_button') //2b
  // await elementByIdAndClickAndTest('filter_screen_top-past-day', 'filter_screen_top-past-day_check_icon_button') //3a

  // //go back
  // await elementByIdClick('filter_screen_nav_header_button_text')
  // //check dropdown text
  // await elementByIdHasText('episodes_screen_dropdown_button_text', 'top - day')
  // //navigate back to filter screen
  // await elementByIdAndClickAndTest('episodes_screen_dropdown_button', 'filter_screen_view')

  // await elementByIdAndClickAndTest('filter_screen_top-past-week', 'filter_screen_top-past-week_check_icon_button') //4a
  // await elementCheckIfNotPresent('filter_screen_top-past-day_check_icon_button') //3b

  // //go back
  // await elementByIdClick('filter_screen_nav_header_button_text')
  // //check dropdown text
  // await elementByIdHasText('episodes_screen_dropdown_button_text', 'top - week')
  // //navigate back to filter screen
  // await elementByIdAndClickAndTest('episodes_screen_dropdown_button', 'filter_screen_view')

  // await elementByIdAndClickAndTest('filter_screen_top-past-month', 'filter_screen_top-past-month_check_icon_button') //5a
  // await elementCheckIfNotPresent('filter_screen_top-past-week_check_icon_button') //4b

  // //go back
  // await elementByIdClick('filter_screen_nav_header_button_text')
  // //check dropdown text
  // await elementByIdHasText('episodes_screen_dropdown_button_text', 'top - month')
  // //navigate back to filter screen
  // await elementByIdAndClickAndTest('episodes_screen_dropdown_button', 'filter_screen_view')

  // await elementByIdAndClickAndTest('filter_screen_top-past-year', 'filter_screen_top-past-year_check_icon_button') //6a
  // await elementCheckIfNotPresent('filter_screen_top-past-month_check_icon_button') //5b

  // //go back
  // await elementByIdClick('filter_screen_nav_header_button_text')
  // //check dropdown text
  // await elementByIdHasText('episodes_screen_dropdown_button_text', 'top - year')
  // //navigate back to filter screen
  // await elementByIdAndClickAndTest('episodes_screen_dropdown_button', 'filter_screen_view')
  
  // await elementByIdAndClickAndTest('filter_screen_top-all-time', 'filter_screen_top-all-time_check_icon_button') //7a
  // await elementCheckIfNotPresent('filter_screen_top-past-year_check_icon_button') //6b

  // //go back
  // await elementByIdClick('filter_screen_nav_header_button_text')
  // //check dropdown text
  // await elementByIdHasText('episodes_screen_dropdown_button_text', 'top - all time')
  // //navigate back to filter screen
  // await elementByIdAndClickAndTest('episodes_screen_dropdown_button', 'filter_screen_view')

  // await elementByIdAndClickAndTest('filter_screen_top-past-year', 'filter_screen_top-past-year_check_icon_button')
  // await elementCheckIfNotPresent('filter_screen_top-all-time_check_icon_button') //7b
  // await elementByIdAndClickAndTest('filter_screen_category', 'filter_screen_category_check_icon_button')

  // //go back
  // await elementByIdClick('filter_screen_nav_header_button_text')
  // //check text
  // await elementByIdHasText('episodes_screen_table_section_header_title_text', 'Arts')
  // //navigate back to filter screen
  // await elementByIdAndClickAndTest('episodes_screen_dropdown_button', 'filter_screen_view')

  // await elementCheckIfNotPresent('filter_screen_podcasts_check_icon_button') //8b

  // await elementByIdAndClickAndTest('filter_screen_all-podcasts', 'filter_screen_all-podcasts_check_icon_button') //1a
  // await elementByIdClick('filter_screen_top-past-week')

  // await elementByIdAndClickAndTest('filter_screen_nav_header_button_text', 'episodes_screen_view')
  
  //END FILTER TESTS

  await elementByIdClick('episodes_screen_episode_item_0_time_remaining_widget_toggle_play')

  await elementByIdClick('episodes_screen_episode_item_0_more_button')
  await elementByIdClick('episodes_screen_action_sheet_cancel_button')

  await elementByIdClick('episodes_screen_episode_item_0_more_button')
  await elementByIdClick('episodes_screen_action_sheet_stream_button')
  
  await elementByIdClick('episodes_screen_episode_item_0_more_button')
  await elementByIdClick('episodes_screen_action_sheet_queue_next_button')

  await elementByIdClick('episodes_screen_episode_item_0_more_button')
  await elementByIdClick('episodes_screen_action_sheet_queue_last_button')
 
  await elementByIdClick('episodes_screen_episode_item_0_more_button')
  await elementByIdClick('episodes_screen_action_sheet_queue_next_button')

  await elementByIdClick('episodes_screen_episode_item_0_more_button')
  await elementByIdClick('episodes_screen_action_sheet_share_button')
  await driver.back()

  // test loading spinner displays

  await elementByIdClick('episodes_screen_episode_item_0_download_button_icon_icon_button')

  await elementByIdClick('episodes_screen_episode_item_0_more_button')
  await elementByIdAndClickAndTest('episodes_screen_action_sheet_go_to_podcast_button', 'podcast_screen_view')
  await driver.back()
  await elementByIdAndClickAndTest('tab_podcasts_screen', 'podcasts_screen_view')


}

module.exports = {
  test_episodesScreenFull
}
