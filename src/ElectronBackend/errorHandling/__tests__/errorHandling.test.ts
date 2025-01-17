// SPDX-FileCopyrightText: Meta Platforms, Inc. and its affiliates
// SPDX-FileCopyrightText: TNG Technology Consulting GmbH <https://www.tngtech.com>
// SPDX-FileCopyrightText: Nico Carl <nicocarl@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0
import { BrowserWindow, dialog, WebContents } from 'electron';

import { AllowedFrontendChannels } from '../../../shared/ipc-channels';
import { SendErrorInformationArgs } from '../../../shared/shared-types';
import { loadInputAndOutputFromFilePath } from '../../input/importFromFile';
import {
  createListenerCallbackWithErrorHandling,
  getMessageBoxContentForErrorsWrapper,
  getMessageBoxForErrors,
} from '../errorHandling';

jest.mock('electron', () => ({
  dialog: {
    showMessageBox: jest.fn(() => {
      return Promise.resolve({
        response: 0,
      });
    }),
  },
  app: { exit: jest.fn(), getName: jest.fn(), getVersion: jest.fn() },
}));

jest.mock('../../input/importFromFile', () => ({
  loadInputAndOutputFromFilePath: jest.fn(),
}));

jest.mock('../../main/listeners', () => ({
  getOpenFileListener: jest.fn(() => jest.fn()),
}));

describe('error handling', () => {
  describe('createListenerCallbackWithErrorHandling', () => {
    it('returns a wrapper that calls the input function with the same parameters', async () => {
      const mainWindow = {
        webContents: { send: jest.fn() },
      } as unknown as BrowserWindow;

      const testFunction = jest.fn();
      const testArgs = {
        arg1: '1',
        arg2: true,
      };

      await createListenerCallbackWithErrorHandling(
        mainWindow,
        testFunction,
      )(testArgs);
      expect(testFunction).toHaveBeenCalledTimes(1);
      expect(testFunction).toHaveBeenCalledWith(
        expect.objectContaining(testArgs),
      );
    });

    it('shows errors from the input function in a messageBox', async () => {
      const mainWindow = {
        webContents: { send: jest.fn() },
      } as unknown as BrowserWindow;

      function testFunction(): void {
        throw new Error('TEST_ERROR');
      }

      await createListenerCallbackWithErrorHandling(mainWindow, testFunction)();

      expect(dialog.showMessageBox).toBeCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Error in app backend: TEST_ERROR',
          buttons: ['Reload File', 'Quit'],
        }),
      );
    });
  });

  describe('getMessageBoxContentForErrors', () => {
    it('for backend errors', () => {
      const testError = new Error('TEST_ERROR');
      const messageBoxContentForBackendErrors =
        getMessageBoxContentForErrorsWrapper(
          true,
          testError.stack,
        )(testError.message);
      expect(messageBoxContentForBackendErrors.detail).toContain(
        'Error: TEST_ERROR',
      );
      expect(messageBoxContentForBackendErrors.message).toEqual(
        'Error in app backend: TEST_ERROR',
      );
    });

    it('for frontend errors', () => {
      const testError = new Error('TEST_ERROR');
      const messageBoxContentForBackendErrors =
        getMessageBoxContentForErrorsWrapper(
          false,
          testError.stack,
        )(testError.message);
      expect(messageBoxContentForBackendErrors.detail).toContain(
        'Error: TEST_ERROR',
      );
      expect(messageBoxContentForBackendErrors.message).toEqual(
        'Error in app frontend: TEST_ERROR',
      );
    });
  });

  describe('getMessageBoxForErrors', () => {
    it('returns a messageBox', async () => {
      const sendErrorInformationArgs: SendErrorInformationArgs = {
        error: { message: 'errorMessage', name: 'Error' },
        errorInfo: { componentStack: 'componentStack' },
      };

      const mockCallback = jest.fn();
      const mainWindow = {
        webContents: { send: mockCallback as unknown } as WebContents,
      } as unknown as BrowserWindow;

      await getMessageBoxForErrors(
        sendErrorInformationArgs.error.message,
        sendErrorInformationArgs.errorInfo.componentStack,
        mainWindow,
        false,
      );

      expect(dialog.showMessageBox).toBeCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Error in app frontend: errorMessage',
          detail: 'Stack trace: componentStack',
          buttons: ['Reload File', 'Quit'],
        }),
      );

      expect(mockCallback.mock.calls.length).toBe(1);
      expect(mockCallback.mock.calls[0][0]).toContain(
        AllowedFrontendChannels.RestoreFrontend,
      );
      expect(loadInputAndOutputFromFilePath).toBeCalled();
    });
  });
});
