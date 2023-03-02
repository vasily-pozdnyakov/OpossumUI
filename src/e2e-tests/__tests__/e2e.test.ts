// SPDX-FileCopyrightText: Meta Platforms, Inc. and its affiliates
// SPDX-FileCopyrightText: TNG Technology Consulting GmbH <https://www.tngtech.com>
//
// SPDX-License-Identifier: Apache-2.0

import { ElectronApplication, Page } from 'playwright';
import {
  conditionalTest,
  E2E_TEST_TIMEOUT,
  EXPECT_TIMEOUT,
  getApp,
  getButtonWithName,
  getElementWithAriaLabel,
  getElementWithText,
} from '../test-helpers/test-helpers';
import * as os from 'os';
import fs from 'fs';
import { expect, test } from '@playwright/test';
import { ButtonText } from '../../Frontend/enums/enums';

test.setTimeout(E2E_TEST_TIMEOUT);

test.describe('The OpossumUI', () => {
  let app: ElectronApplication;
  let window: Page;

  test.beforeEach(async () => {
    app = await getApp();
    window = await app.firstWindow();
    await window.waitForLoadState();
  });

  test.afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  test('should launch app', async () => {
    expect(await window.title()).toBe('OpossumUI');
  });

  test('should find view buttons', async () => {
    await getElementWithText(window, 'Audit');
    await getElementWithText(window, 'Attribution');
    await getElementWithText(window, 'Report');
  });
});

test.describe('Open .opossum file via command line', () => {
  let app: ElectronApplication;
  let window: Page;

  test.beforeEach(async () => {
    app = await getApp(
      'src/e2e-tests/test-resources/opossum_input_and_output_e2e.opossum'
    );
    window = await app.firstWindow();
    await window.waitForLoadState();
  });

  test.afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  test('should open file when provided as command line arg', async () => {
    await getElementWithText(window, 'Frontend');

    const electronBackendEntry = await getElementWithText(
      window,
      'ElectronBackend'
    );
    await electronBackendEntry.click();
  });

  test('should show signals and attributions in accordions', async () => {
    const electronBackendEntry = await getElementWithText(
      window,
      'ElectronBackend'
    );
    await electronBackendEntry.click();

    await expect(window.locator(`text=${'jQuery, 16.13.1'}`)).toBeVisible({
      timeout: EXPECT_TIMEOUT,
    });

    await expect(window.locator(`text=${'Apache'}`)).toHaveCount(1, {
      timeout: EXPECT_TIMEOUT,
    });

    const signalsInFolderContentEntry = await getElementWithText(
      window,
      'Signals in Folder Content'
    );
    await signalsInFolderContentEntry.click();

    await expect(window.locator(`text=${'jQuery, 16.13.1'}`)).toBeHidden();
  });
});

test.describe('Open outdated .json file via command line', () => {
  let app: ElectronApplication;
  let window: Page;

  test.beforeEach(async () => {
    app = await getApp('src/e2e-tests/test-resources/opossum_input_e2e.json');
    window = await app.firstWindow();
    await window.waitForLoadState();
  });

  test.afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  test('should open FileSupportPopup when .json file is provided as command line arg', async () => {
    const header = 'Warning: Outdated input file format';
    const fileSupportPopupEntry = await getElementWithText(window, header);
    expect(fileSupportPopupEntry).toBeVisible({
      timeout: EXPECT_TIMEOUT,
    });
    const keepOldFileFormatButton = await getButtonWithName(
      window,
      ButtonText.Keep
    );
    expect(keepOldFileFormatButton).toBeVisible({
      timeout: EXPECT_TIMEOUT,
    });
  });

  test('should open file when provided as command line arg', async () => {
    const keepOldFileFormatButton = await getButtonWithName(
      window,
      ButtonText.Keep
    );
    await keepOldFileFormatButton.click();

    await getElementWithText(window, 'Frontend');

    const electronBackendEntry = await getElementWithText(
      window,
      'ElectronBackend'
    );
    await electronBackendEntry.click();

    fs.unlinkSync(
      'src/e2e-tests/test-resources/opossum_input_e2e_attributions.json'
    );
  });

  test('should show signals and attributions in accordions', async () => {
    const keepOldFileFormatButton = await getButtonWithName(
      window,
      ButtonText.Keep
    );
    await keepOldFileFormatButton.click();

    const electronBackendEntry = await getElementWithText(
      window,
      'ElectronBackend'
    );
    await electronBackendEntry.click();

    await expect(window.locator(`text=${'jQuery, 16.13.1'}`)).toBeVisible({
      timeout: EXPECT_TIMEOUT,
    });

    // Apache appears in both 'signals in folder content' and 'attributions in folder content' accordions
    await expect(window.locator(`text=${'Apache'}`)).toHaveCount(2, {
      timeout: EXPECT_TIMEOUT,
    });

    const signalsInFolderContentEntry = await getElementWithText(
      window,
      'Signals in Folder Content'
    );
    await signalsInFolderContentEntry.click();

    await expect(window.locator(`text=${'jQuery, 16.13.1'}`)).toBeHidden();

    fs.unlinkSync(
      'src/e2e-tests/test-resources/opossum_input_e2e_attributions.json'
    );
  });

  // getOpenLinkListener does not work properly on Linux
  conditionalTest(os.platform() !== 'linux')(
    'should open an error popup if the base url is invalid',
    async () => {
      const keepOldFileFormatButton = await getButtonWithName(
        window,
        ButtonText.Keep
      );
      await keepOldFileFormatButton.click();

      const electronBackendEntry = await getElementWithText(
        window,
        'ElectronBackend'
      );
      await electronBackendEntry.click();
      const openLinkIcon = await getElementWithAriaLabel(
        window,
        'link to open'
      );
      await openLinkIcon.click();

      await getElementWithText(window, 'Cannot open link.');

      const typesEntry = await getElementWithText(window, 'Types');
      await typesEntry.click();

      const anotherOpenLinkIcon = await getElementWithAriaLabel(
        window,
        'link to open'
      );
      await anotherOpenLinkIcon.click();

      await getElementWithText(window, 'Cannot open link.');

      fs.unlinkSync(
        'src/e2e-tests/test-resources/opossum_input_e2e_attributions.json'
      );
    }
  );
});
