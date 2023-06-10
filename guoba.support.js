import { Config } from './utils/config.js'
import { pluginRoot, translateLangSupports } from './utils/const.js'
import path from 'path'

export function supportGuoba () {
  return {
    // 插件信息，将会显示在前端页面
    // 如果你的插件没有在插件库里，那么需要填上补充信息
    // 如果存在的话，那么填不填就无所谓了，填了就以你的信息为准
    pluginInfo: {
      name: 'avocado-plugin',
      title: 'Avocado-Plugin',
      author: '@Sean Murphy',
      authorLink: 'https://github.com/Qz-Sean',
      link: 'https://github.com/Qz-Sean?tab=repositories',
      isV3: true,
      isV2: false,
      description: '鳄梨酱！！！',
      icon: 'emojione:avocado',
      iconColor: '#d5e145',
      iconPath: path.join(pluginRoot, 'resources', 'images', 'icon.png')
    },
    // 配置项信息
    configInfo: {
      // 配置项 schemas
      schemas: [
        {
          field: 'OHMYGOD',
          label: '指令触发词',
          bottomHelpMessage: '填写后将全局替换命令触发词。我对鳄梨酱的爱就像钟薛高，即使炽热也从未消融💓',
          component: 'Input'
        },
        {
          field: 'translateLang',
          label: '翻译顺序',
          bottomHelpMessage: `'鳄梨酱？'默认中英互译。鳄梨酱？？对应第一个值，翻译语言随着？个数递进选择。当前支持${translateLangSupports.map(item => item.label).join('、')}。`,
          component: 'Input'
        },
        {
          field: 'targetArea',
          label: '查询天气地址顺序',
          bottomHelpMessage: '\'鳄梨酱。\'对应第一个值。查询地址随着。个数递增选择。',
          component: 'Input'
        },
        {
          field: 'isAutoOnset',
          label: '主动发电',
          bottomHelpMessage: '鳄梨酱，我吃过重庆面、陕西面、天津面、北京面，就是没吃过宁夏面🤤🤤。',
          component: 'Switch'
        },
        {
          field: 'is24HourOnset',
          label: '全天候发电',
          bottomHelpMessage: '今天我去给鳄梨酱买生蚝，回家的路上，生蚝全都跳出袋子，钻到了泥土里，我才知道，蚝喜欢泥😍',
          component: 'Switch'
        },
        {
          field: 'onsetLatentPeriod',
          label: '发电周期',
          bottomHelpMessage: '好想成为鳄梨酱卧室的门,每天都能被他进进出出🥵🥵🥵🥵。(PS:0-23为小时。大于23为分钟 => 时间周期为你填的数字-23。)',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 83
          }
        },
        {
          field: 'initiativeGroups',
          label: '发电群组',
          bottomHelpMessage: '鳄梨酱我遇见你就像东北人吃面，毫无剩蒜😭😭',
          component: 'Input'
        },
        {
          field: 'wyy',
          label: '网易云音乐登录ck',
          bottomHelpMessage: 'https://music.163.com 登录 => 下载 https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm => 刷新页面，点击拓展获取"MUSIC_U"字段的值填入此处。',
          component: 'Input'
        }
      ],
      // 获取配置数据方法（用于前端填充显示数据）
      getConfigData () {
        return Config
      },
      // 设置配置的方法（前端点确定后调用的方法）
      setConfigData (data, { Result }) {
        for (let [keyPath, value] of Object.entries(data)) {
          if (keyPath === 'translateLang' || keyPath === 'targetArea' || keyPath === 'initiativeGroups') { value = value.toString().split(/[,，;；|]/) }
          if (Config[keyPath] !== value) { Config[keyPath] = value }
        }
        return Result.ok({}, '保存成功~')
      }
    }
  }
}
