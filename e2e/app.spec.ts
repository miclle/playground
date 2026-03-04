import { browser } from '@wdio/globals'

describe('Playground Electron App', () => {
  beforeEach(async () => {
    // Wait for app to be ready
    await browser.pause(1000)
  })

  it('should launch the application', async () => {
    // Check that the window is visible
    const title = await browser.getTitle()
    if (!title) {
      throw new Error('Expected title to exist')
    }
  })

  it('should display the title bar', async () => {
    // Wait for the title bar to be visible
    const titleBar = await browser.$('.flex.items-center.h-8')
    await titleBar.waitForExist({ timeout: 5000 })
    const isDisplayed = await titleBar.isDisplayed()
    if (!isDisplayed) {
      throw new Error('Expected title bar to be displayed')
    }
  })

  it('should show file tree panel', async () => {
    // Check for file tree component
    const fileTree = await browser.$('.flex.flex-col.h-full')
    await fileTree.waitForExist({ timeout: 5000 })
    const isDisplayed = await fileTree.isDisplayed()
    if (!isDisplayed) {
      throw new Error('Expected file tree to be displayed')
    }
  })

  it('should open settings dialog when clicking settings button', async () => {
    // Find and click the settings button
    const settingsBtn = await browser.$('button[title="Settings"]')
    await settingsBtn.waitForClickable({ timeout: 5000 })
    await settingsBtn.click()

    // Wait for settings dialog
    const settingsDialog = await browser.$('.fixed.inset-0.z-50')
    await settingsDialog.waitForExist({ timeout: 5000 })
    const isDisplayed = await settingsDialog.isDisplayed()
    if (!isDisplayed) {
      throw new Error('Expected settings dialog to be displayed')
    }

    // Close settings
    const closeBtn = await browser.$('button[class*="hover:bg-accent"]')
    await closeBtn.click()
  })

  it('should open project selector when clicking project button', async () => {
    // Find and click the project selector button
    const projectBtn = await browser.$('button[title="Select Project"]')
    await projectBtn.waitForClickable({ timeout: 5000 })
    await projectBtn.click()

    // Wait for project selector dialog
    const projectDialog = await browser.$('h2=Projects')
    await projectDialog.waitForExist({ timeout: 5000 })
    const isDisplayed = await projectDialog.isDisplayed()
    if (!isDisplayed) {
      throw new Error('Expected project dialog to be displayed')
    }
  })
})
