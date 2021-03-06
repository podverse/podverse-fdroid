const { getDriver } = require('../driverFactory')
const { logKeyEnd, logKeyStart, logTestInfo } = require('../../utils/logger')

const sendKeysToElementById = async (id, textString, testLabel) => {
  const driver = getDriver()
  logTestInfo(logKeyStart, id, testLabel)
  await driver.waitForElementByAccessibilityId(id, 10000)
  const element = await driver.elementByAccessibilityId(id);
  await element.sendKeys(textString)
  logTestInfo(logKeyEnd, id, testLabel)
}

const clearTextField = async (id, testLabel) => {
  const driver = getDriver()
  logTestInfo(logKeyStart, id, testLabel)
  const element = await driver.elementByAccessibilityId(id);
  await element.clear();
  logTestInfo(logKeyEnd, id, testLabel)
}

module.exports = {
  clearTextField,
  sendKeysToElementById
}
