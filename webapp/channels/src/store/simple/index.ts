import { combineReducers } from 'redux'
import quote from './quote'

// 桥接: 导出 reducers , 在 reducers 导入. 让其还能自动被注册
export const reducers = combineReducers({
    quote,
})