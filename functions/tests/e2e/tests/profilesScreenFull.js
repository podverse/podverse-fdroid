/* eslint-disable max-len */
const { getDriver } = require('../driver/driverFactory')
const { elementByIdAndClickAndTest, elementByIdClick, goBackKey, noTestLabel } = require('../driver/helpers/elements')
const { sendKeysToElementById } = require('../driver/helpers/sendKeys')
const { confirmAndroidAlert } = require('../driver/helpers/alerts')



const test_profilesScreenFull = async () => {
  console.log('_Profiles Screen Full_')
  const driver = getDriver()
  
    // Log In Premium

// Login
await elementByIdAndClickAndTest('tab_more_screen', 'more_screen_view')
await elementByIdAndClickAndTest('more_screen_Login_table_cell_wrapper', 'auth_screen_sign_up_button')
await sendKeysToElementById('login_email_text_input', 'premium@stage.podverse.fm', 'Valid Login Email Input')
await sendKeysToElementById('login_password_text_input', 'Aa!1asdf', 'Valid Login Password Input')
await elementByIdClick('login_submit_button')
await driver.sleep(7000)

try {
  await confirmAndroidAlert()
} catch (err) {
  console.log('confirmAndroidAlert err')
  console.log(err)
}

    // My Library Screen
  await elementByIdAndClickAndTest('tab_my_library_screen', 'my_library_screen_view')

    // Profiles Screen
  await elementByIdAndClickAndTest('my_library_screen_Profiles_table_cell_wrapper', 'profiles_screen_view')
  await elementByIdAndClickAndTest('profiles_screen_profile_0', 'profile_screen_view')
  // TODO: Click succeeds but check fails
  await elementByIdAndClickAndTest('profile_screen_subscribe_button', 'profile_screen_is_not_subscribed')
  await elementByIdAndClickAndTest('profile_screen_subscribe_button', 'profile_screen_is_subscribed')
  await driver.back()
  await driver.back()


    // Log Out

  await elementByIdAndClickAndTest('tab_more_screen', 'more_screen_view')
  await elementByIdAndClickAndTest('more_screen_Logout_table_cell_wrapper', 'more_screen_view')
  await elementByIdAndClickAndTest('tab_podcasts_screen', 'podcasts_screen_view')
}

module.exports = {
  test_profilesScreenFull
}
