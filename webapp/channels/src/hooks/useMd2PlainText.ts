// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
 * @returns Plain text string
 */
export const useMd2PlainText = (
    message: string | undefined | null,
    options: UseMd2PlainTextOptions = {}
): string => {
    const {maxLength, ellipsis = '...'} = options;

    return useMemo(() => {
        if (!message) {
            return '';
        }

        // Use stripMarkdown to remove markdown formatting
        const strippedText = stripMarkdown(message);

        // Limit length if specified
        if (maxLength && strippedText.length > maxLength) {
            return strippedText.substring(0, maxLength) + ellipsis;
        }

        return strippedText;
    }, [message, maxLength, ellipsis]);
}; 