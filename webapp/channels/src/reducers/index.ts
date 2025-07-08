// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import plugins from './plugins';
import storage from './storage';
import views from './views';
// 桥接过来自动注册
import {reducers as simple} from '../store/simple';

export default {
    views,
    plugins,
    storage,
    simple,
};
