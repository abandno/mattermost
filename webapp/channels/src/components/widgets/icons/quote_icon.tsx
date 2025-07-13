// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

// export default function QuoteIcon(props: React.HTMLAttributes<HTMLSpanElement>) {
//     return (
//         <span {...props} className={`icon ${props.className || ''}`}>
//             <svg
//                 width="16px"
//                 height="14px"
//                 viewBox="0 0 16 14"
//                 fill="currentColor"
//             >
//                 {/* Left quote */}
//                 <path d="M3.5 7C3.5 8.3807 2.3807 9.5 1 9.5V11C3.20914 11 5 9.20914 5 7V4.5C5 3.11929 3.88071 2 2.5 2V3.5C3.32843 3.5 4 4.17157 4 5V7C4 7.27614 3.77614 7.5 3.5 7.5C3.22386 7.5 3 7.27614 3 7V5C3 4.44772 2.55228 4 2 4V5.5C2.55228 5.5 3 5.94772 3 6.5V7Z" />
//                 {/* Right quote */}
//                 <path d="M10.5 7C10.5 8.3807 9.3807 9.5 8 9.5V11C10.2091 11 12 9.20914 12 7V4.5C12 3.11929 10.8807 2 9.5 2V3.5C10.3284 3.5 11 4.17157 11 5V7C11 7.27614 10.7761 7.5 10.5 7.5C10.2239 7.5 10 7.27614 10 7V5C10 4.44772 9.55228 4 9 4V5.5C9.55228 5.5 10 5.94772 10 6.5V7Z" />
//             </svg>
//         </span>
//     );
// } 

export default function QuoteIcon(props: React.HTMLAttributes<HTMLSpanElement>) {
    return (
        <span  {...props} className={`icon ${props.className || ''}`}>
            <svg
                version="1.1" width="24" height="24" viewBox="0 0 24 24"
            >
                <path d="M11 18V10H9.12L11.12 6H5.38L3 10.76V18M9 16H5V11.24L6.62 8H7.88L5.88 12H9M21 18V10H19.12L21.12 6H15.38L13 10.76V18M19 16H15V11.24L16.62 8H17.88L15.88 12H19Z" />
            </svg>
        </span>
    )
}