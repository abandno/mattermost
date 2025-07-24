// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import { StringN } from '@mattermost/types/general';
import {useMemo} from 'react';

import {stripMarkdown} from 'utils/markdown';

interface UseMd2PlainTextOptions {
    maxLength?: number;
    ellipsis?: string;
}

/**
 * Hook to convert markdown text to plain text with optional length limiting
 * @param message - The markdown message to convert
 * @param options - Configuration options
 * @returns Plain text string, isMd
 */
export const useMd2PlainText = (
    message: StringN,
    options: UseMd2PlainTextOptions = {}
): [string, boolean] => {
    const {maxLength, ellipsis = '...'} = options;

    return useMemo(() => {
        if (!message) {
            return ['', false];
        }

        // Use stripMarkdown to remove markdown formatting
        const strippedText = stripMarkdown(message);
        const isMd = message !== strippedText;

        // Limit length if specified
        if (maxLength && strippedText.length > maxLength) {
            return [strippedText.substring(0, maxLength) + ellipsis, isMd];
        }

        return [strippedText, isMd];
    }, [message, maxLength, ellipsis]);
}; 