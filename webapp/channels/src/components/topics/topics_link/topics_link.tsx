// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import classNames from 'classnames';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {useDispatch} from 'react-redux';
import {Link, useRouteMatch} from 'react-router-dom';
import {useSelector} from 'react-redux';

import {selectLhsItem} from 'actions/views/lhs';
import {LhsItemType, LhsPage} from 'types/store/lhs';

import type {GlobalState} from 'types/store';

const TopicsLink = () => {
    const {formatMessage} = useIntl();
    const dispatch = useDispatch();

    const {url} = useRouteMatch();
    const isTopicsUrlMatch = useRouteMatch('/:team/topics');
    const urlMatches = Boolean(isTopicsUrlMatch);

    const isNavLinkActive = useCallback(() => urlMatches, [urlMatches]);

    const openTopics = useCallback((e) => {
        e.stopPropagation();
        dispatch(selectLhsItem(LhsItemType.Page, LhsPage.Topics));
    }, [dispatch]);

    return (
        <ul className='SidebarTopics NavGroupContent nav nav-pills__container'>
            <li
                id={'sidebar-topics-button'}
                className={classNames('SidebarChannel', {
                    active: urlMatches,
                })}
                tabIndex={-1}
            >
                <Link
                    onClick={openTopics}
                    to={`${url}/topics`}
                    id='sidebarItem_topics'
                    draggable='false'
                    className='SidebarLink sidebar-item'
                    tabIndex={0}
                    isActive={isNavLinkActive}
                >
                    <span className='icon'>
                        <i className='icon icon-comment-outline'/>
                    </span>
                    <div className='SidebarChannelLinkLabel_wrapper'>
                        <span className='SidebarChannelLinkLabel sidebar-item__name'>
                            {formatMessage({id: 'topics.sidebarLink', defaultMessage: 'Topics'})}
                        </span>
                    </div>
                </Link>
            </li>
        </ul>
    );
};

export default TopicsLink; 