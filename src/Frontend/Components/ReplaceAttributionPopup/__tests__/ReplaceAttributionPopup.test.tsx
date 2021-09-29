// SPDX-FileCopyrightText: Facebook, Inc. and its affiliates
// SPDX-FileCopyrightText: TNG Technology Consulting GmbH <https://www.tngtech.com>
//
// SPDX-License-Identifier: Apache-2.0

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { ButtonTitle, PopupType } from '../../../enums/enums';
import { getOpenPopup } from '../../../state/selectors/view-selector';
import {
  EnhancedTestStore,
  renderComponentWithStore,
} from '../../../test-helpers/render-component-with-store';

import { ReplaceAttributionPopup } from '../ReplaceAttributionPopup';
import { openPopup } from '../../../state/actions/view-actions/view-actions';
import { loadFromFile } from '../../../state/actions/resource-actions/load-actions';
import { getParsedInputFile } from '../../../test-helpers/test-helpers';
import {
  setAttributionIdMarkedForReplacement,
  setSelectedAttributionId,
} from '../../../state/actions/resource-actions/attribution-view-simple-actions';
import { Attributions, Resources } from '../../../../shared/shared-types';
import { IpcRenderer } from 'electron';
import { IpcChannel } from '../../../../shared/ipc-channels';

function setupTestState(store: EnhancedTestStore): void {
  const testResources: Resources = {
    thirdParty: {
      'package_1.tr.gz': 1,
      'package_2.tr.gz': 1,
    },
  };
  const testAttributions: Attributions = {
    test_selected_id: { packageName: 'React' },
    test_marked_id: { packageName: 'Vue' },
  };
  const testResourcesToManualAttributions = {
    'package_1.tr.gz': ['test_selected_id'],
    'package_2.tr.gz': ['test_marked_id'],
  };
  store.dispatch(openPopup(PopupType.ReplaceAttributionPopup));
  store.dispatch(setSelectedAttributionId('test_selected_id'));
  store.dispatch(setAttributionIdMarkedForReplacement('test_marked_id'));
  store.dispatch(
    loadFromFile(
      getParsedInputFile(
        testResources,
        testAttributions,
        testResourcesToManualAttributions
      )
    )
  );
}

let originalIpcRenderer: IpcRenderer;

describe('ReplaceAttributionPopup and do not change view', () => {
  beforeAll(() => {
    originalIpcRenderer = global.window.ipcRenderer;
    global.window.ipcRenderer = {
      on: jest.fn(),
      removeListener: jest.fn(),
      invoke: jest.fn(),
    } as unknown as IpcRenderer;
  });

  beforeEach(() => jest.clearAllMocks());

  afterAll(() => {
    // Important to restore the original value.
    global.window.ipcRenderer = originalIpcRenderer;
  });

  test('renders a ReplaceAttributionPopup and click cancel', () => {
    const { store } = renderComponentWithStore(<ReplaceAttributionPopup />);
    setupTestState(store);

    expect(screen.queryByText('Replacing an attribution')).toBeTruthy();
    expect(screen.queryByText('React')).toBeTruthy();
    expect(screen.queryByText('Vue')).toBeTruthy();

    fireEvent.click(screen.queryByText(ButtonTitle.Cancel) as Element);
    expect(getOpenPopup(store.getState())).toBe(null);
  });

  test('renders a ReplaceAttributionPopup and click replace', () => {
    const { store } = renderComponentWithStore(<ReplaceAttributionPopup />);
    setupTestState(store);

    expect(screen.queryByText('Replacing an attribution')).toBeTruthy();
    expect(screen.queryByText('React')).toBeTruthy();
    expect(screen.queryByText('Vue')).toBeTruthy();

    fireEvent.click(screen.queryByText(ButtonTitle.Replace) as Element);
    expect(getOpenPopup(store.getState())).toBe(null);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      IpcChannel['SaveFile'],
      {
        manualAttributions: { test_selected_id: { packageName: 'React' } },
        resolvedExternalAttributions: new Set(),
        resourcesToAttributions: {
          'package_1.tr.gz': ['test_selected_id'],
          'package_2.tr.gz': ['test_selected_id'],
        },
      }
    );
  });
});
