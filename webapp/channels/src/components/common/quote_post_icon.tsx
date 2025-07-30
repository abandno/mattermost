
import QuoteIcon from 'components/widgets/icons/quote_icon';
import WithTooltip from 'components/with_tooltip';
import React from 'react';
import { useIntl } from 'react-intl';
import { Locations } from 'utils/constants';

type Props = {
    location?: keyof typeof Locations;
    handleQuoteClick?: React.EventHandler<React.MouseEvent>;
    searchStyle?: string;
    quoteCount?: number;
    postId?: string;
    extraClass?: string;
}

const QuotePostIcon = ({
    location = 'CENTER',
    quoteCount = 0,
    extraClass = '',
    handleQuoteClick,
    postId,
}: Props) => {
    const intl = useIntl();

    const quoteTitle = intl.formatMessage({
        id: 'accessibility.button.quote',
        defaultMessage: 'Quote',
    });

    let iconStyle = 'post-menu__item post-menu__item--wide';

    let countSpan: JSX.Element | null = null;
    if (quoteCount > 0) {
        countSpan = (
            <span className='post-menu__comment-count'>
                {quoteCount}
            </span>
        );
    }

    return (
        <WithTooltip
            title={quoteTitle}
        >
            <button
                id={`${location}_quoteIcon_${postId}`}
                aria-label={quoteTitle.toLowerCase()}
                className={`${iconStyle} ${extraClass}`}
                onClick={handleQuoteClick}
            >
                <span className='d-flex align-items-center'>
                    <QuoteIcon className='icon icon--small' />
                    {countSpan}
                </span>
            </button>
        </WithTooltip>
    );
}


export default QuotePostIcon;