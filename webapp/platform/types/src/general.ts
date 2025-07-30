// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type { ClientConfig, ClientLicense } from './config';
import type { UserPropertyField } from './properties';
import type { IDMappedObjects } from './utilities';

export type GeneralState = {
    config: Partial<ClientConfig>;
    firstAdminVisitMarketplaceStatus: boolean;
    firstAdminCompleteSetup: boolean;
    license: ClientLicense;
    serverVersion: string;
    customProfileAttributes: IDMappedObjects<UserPropertyField>;
    cwsAvailability: 'pending' | 'available' | 'unavailable' | 'not_applicable';
};

export type SystemSetting = {
    name: string;
    value: string;
};

export type NU<T> = T | null | undefined;

export type StringN = NU<string>;

export type NumberN = NU<number>;

export type AlphaNum = string | number;

export type AlphaNumN = NU<AlphaNum>;

export type AlphaNumNArray = AlphaNumN[];

export type AlphaNumNObject = {
    [key: string]: AlphaNumN;
};
