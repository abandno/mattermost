// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

export default function QuoteIcon(props: React.HTMLAttributes<HTMLSpanElement>) {
    return (
        <span {...props} className={`icon ${props.className || ''}`}>
            <svg
                width="16px"
                height="14px"
                viewBox="0 0 16 14"
                fill="currentColor"
            >
                {/* 左引号 */}
                <path d="M3.5 7C3.5 8.3807 2.3807 9.5 1 9.5V11C3.20914 11 5 9.20914 5 7V4.5C5 3.11929 3.88071 2 2.5 2V3.5C3.32843 3.5 4 4.17157 4 5V7C4 7.27614 3.77614 7.5 3.5 7.5C3.22386 7.5 3 7.27614 3 7V5C3 4.44772 2.55228 4 2 4V5.5C2.55228 5.5 3 5.94772 3 6.5V7Z"/>
                {/* 右引号 */}
                {/* <path d="M13.5 7C13.5 8.3807 12.3807 9.5 11 9.5V11C13.2091 11 15 9.20914 15 7V4.5C15 3.11929 13.8807 2 12.5 2V3.5C13.3284 3.5 14 4.17157 14 5V7C14 7.27614 13.7761 7.5 13.5 7.5C13.2239 7.5 13 7.27614 13 7V5C13 4.44772 12.5523 4 12 4V5.5C12.5523 5.5 13 5.94772 13 6.5V7Z"/> */}
            </svg>
        </span>
    );
} 