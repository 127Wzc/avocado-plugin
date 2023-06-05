import plugin from '../../../lib/plugins/plugin.js'
import { segment } from 'icqq'
import path from 'path'
import { Config } from '../utils/config.js'
import { translate, translateLangSupports } from '../utils/translate.js'
import {
  getImageOcrText, getImg, getMovieList,
  getSourceMsg,
  makeForwardMsg
} from '../utils/common.js'
import { getAreaInfo, weather } from '../utils/weather.js'
import fetch from 'node-fetch'
import { __dirname, cities, md, movieKeyMap, urlRegex } from '../utils/const.js'
import puppeteerManager from '../utils/puppeteer.js'

export class AvocadoRuleALL extends plugin {
  constructor (e) {
    super({
      name: '鳄梨酱',
      dsc: '收纳了一些日常使用的一些小工具~',
      event: 'message',
      priority: 300,
      rule: [
        {
          /** 命令正则匹配 */
          reg: new RegExp(`^${urlRegex.toString().slice(1, -2)}$`, 'i'),
          /** 执行方法 */
          fnc: 'avocadoPreview'
        },
        {
          reg: '^#?(.*)鳄梨酱[!！]{3}$',
          fnc: 'avocadoHelp'
        },
        {
          reg: '^#?鳄梨酱[!！]{2}$',
          fnc: 'avocadoPsycho'
        },
        {
          reg: '^#?(.*)鳄梨酱[！!]',
          fnc: 'avocadoImg'
        },
        {
          reg: '^#?(.*)鳄梨酱[?？]([?？]*)',
          fnc: 'avocadoTranslate'
        },
        {
          reg: '^#?(.*)鳄梨酱[.。]([.。]*)',
          fnc: 'avocadoWeather'
        },
        {
          reg: '^#?鳄梨酱0.0',
          fnc: 'avocadoMovie'
        }
      ]
    })
  }

  async avocadoImg (e) {
    if (e.source) {
      let msgType, msgInfo
      const isImg = await getImg(e)
      if (isImg.length) {
        [msgType, msgInfo] = await getImageOcrText(e) || ['', []]
      } else {
        [msgType, msgInfo] = await getSourceMsg(e) || ['', []]
      }
      if (msgType === 'xml') {
        await this.reply('xml信息目前还无能为力哦~')
        return true
      }
      if (!msgType) {
        await this.reply('鳄梨酱！！！')
        await this.avocadoRender(e, '# 鳄梨酱！！！')
        return true
      }
      if (!msgInfo) {
        [msgType, msgInfo] = await getImageOcrText(e)
      }
      logger.warn('msgInfo: ', msgInfo)
      logger.warn('msgType: ', msgType)
      if (msgType === 'text') {
        for (const item of msgInfo) {
          await this.avocadoRender(e, item)
        }
        return true
      }
      if (msgType === 'url') {
        for (const item of msgInfo) {
          await this.avocadoPreview(e, item)
        }
        return true
      }
      // 当遇到文字与图片混合的信息时，只会返回图片ocr的结果
      if (msgType === 'ocr') {
        let url
        // let replyMsg = []
        for (const item of msgInfo) {
          url = item.replace('\n', '').trim()
          if (urlRegex.test(url)) {
            url = url.startsWith('http') ? url : 'http://' + url
            await this.avocadoPreview(e, url)
          }
        }
        // 没有是识别到url。发送ocr结果
        let replyMsg = await makeForwardMsg(e, msgInfo, '鳄梨酱！')
        await this.reply(replyMsg)
        return true
      }
    } else {
      let msg
      // msg = e.msg.trim().replace(/#?鳄梨酱([！!]+)\s?/, '')
      msg = e.msg.trim().match(/#?鳄梨酱([！!]+)\s?(.*)/)
      logger.warn(msg)
      // 当为鳄梨酱！！！！时获取其ocr结果
      if (msg[1].length === 4) {
        let [, ocrRes] = await getImageOcrText(e) || ''
        if (ocrRes) {
          let replyMsg = await makeForwardMsg(e, ocrRes, '鳄梨酱！')
          await this.reply(replyMsg, e.isGroup)
        }
        return true
      }
      if (!msg[2].length) {
        await this.reply('鳄梨酱！！！')
        return true
      }
      // 存在链接和其他信息混合时，只预览链接
      if (urlRegex.test(msg)) {
        // 提取链接
        let urlList = msg
          .replace(/[\n\r，。、！？；：“”‘’（）【】`·《》〈〉「」『』﹃﹄〔〕]/g, ' ')
          .match(new RegExp(`(${urlRegex.toString().slice(1, -2)})`, 'ig'))
        logger.warn('urlList:', urlList)
        for (let item of urlList) {
          logger.warn('item: ', item)
          item = item.startsWith('http') ? item : 'http://' + item
          await this.avocadoPreview(this, item)
        }
        return true
      } else {
        await this.avocadoRender(this, msg)
        return true
      }
    }
  }

  async avocadoRender (e, param = '') {
    let text
    if (param.length) {
      text = param
    } else {
      if (e.source) {
        let msgType, msgInfo
        const isImg = await getImg(e)
        if (isImg.length) {
          [msgType, msgInfo] = await getImageOcrText(e) || ['', []]
        } else {
          [msgType, msgInfo] = await getSourceMsg(e) || ['', []]
        }
        if (msgType === 'xml') {
          await this.reply('xml信息目前还无能为力哦~')
          return true
        }
        if (!msgType) {
          await this.reply('鳄梨酱！！！')
          await this.avocadoRender(e, '# 鳄梨酱！！！')
          return true
        }
        text = msgInfo
        for (const item of text) {
          await this.avocadoRender(this, item)
        }
      } else {
        text = e.msg.trim().replace(/#?(鳄梨酱[！!]|md)\s?/, '')
      }
    }
    // 递归终止
    if (Array.isArray(text)) return true
    const markdownHtml = md.render(text)
    const tplFile = path.join(__dirname, '..', 'resources', 'markdown.html')
    let data = {
      markdownHtml,
      tplFile,
      quality: 100
    }
    try {
      await puppeteerManager.init()
      const page = await puppeteerManager.newPage()
      await this.reply(await page.screenshot('markdown', data))
      await puppeteerManager.closePage(page)
      await puppeteerManager.close()
    } catch (error) {
      logger.error(`${e.msg}图片生成失败:${error}`)
      await puppeteerManager.close()
      await this.reply(`图片生成失败:${error}`)
    }
  }

  async avocadoPreview (e, param = '') {
    let url
    if (param.length) {
      url = param
    } else {
      if (e.source) {
        let msgType, msgInfo
        const isImg = await getImg(e)
        if (isImg.length) {
          [msgType, msgInfo] = await getImageOcrText(e) || ['', []]
        } else {
          [msgType, msgInfo] = await getSourceMsg(e) || ['', []]
        }
        if (msgType === 'xml') {
          await this.reply('xml信息目前还无能为力哦~')
          return true
        }
        if (!url || msgType === 'text') {
          await this.reply('鳄梨酱！！！')
          return false
        }
        if (msgType === 'url') {
          for (const item of msgInfo) {
            await this.avocadoPreview(this, item)
          }
        } else if (msgType === 'ocr') {
          let i
          for (const item of url) {
            i = item.replace('\n', '').trim()
            if (urlRegex.test(i)) {
              i = i.startsWith('http') ? i : 'http://' + i
            }
            await this.avocadoPreview(this, i)
          }
        }
      } else {
        let msg = e.msg.trim().replace(/#?鳄梨酱[！!]\s?/, '')
        url = msg.match(urlRegex)[0]
        url = url.startsWith('http') ? url : 'http://' + url
      }
    }
    // 递归终止
    if (Array.isArray(url)) return true
    await puppeteerManager.init()
    const page = await puppeteerManager.newPage()
    try {
      await page.goto(url, { timeout: 120000 })
      await page.setViewport({
        width: 1920,
        height: 1080
      })
      await page.waitForTimeout(1000 * 10)
      // await page.waitForNavigation({ timeout: 10000 })
      await this.reply(segment.image(await page.screenshot({ fullPage: true })))
      await puppeteerManager.closePage(page)
      await puppeteerManager.close()
    } catch (error) {
      logger.error(`${e.msg}图片生成失败:${error}`)
      await puppeteerManager.close()
      await this.reply(`图片生成失败:${error}`)
    }
  }

  async avocadoHelp (e) {
    await puppeteerManager.init()
    const page = await puppeteerManager.newPage()
    try {
      const filePath = path.join(__dirname, '..', 'resources', 'README.html')
      await page.goto(`file://${filePath}`, { timeout: 120000 })
      await page.waitForTimeout(1000 * 3)
      await page.evaluate(() => {
        const p = document.createElement('p')
        p.style.textAlign = 'center'
        p.style.fontSize = '20px'
        p.style.marginTop = '-5px'
        p.style.fontWeight = 'bold'
        p.textContent = 'Created By Yunzai-Bot & Avocado-Plugin'
        document.querySelector('#write').appendChild(p)
      })

      // await page.waitForNavigation({ timeout: 10000 })
      await this.reply(segment.image(await page.screenshot({ fullPage: true, type: 'jpeg', quality: 100 })))
      await puppeteerManager.closePage(page)
      await puppeteerManager.close()
    } catch (error) {
      logger.error(`${e.msg}图片生成失败:${error}`)
      await puppeteerManager.close()
      await this.reply(`图片生成失败:${error}`)
    }
    return true
  }

  async avocadoWeather (e) {
    let targetArea
    const areaConfig = Config.targetArea || []
    let match = e.msg.trim().match(/^#?(.*)鳄梨酱[.。]([.。]*)/)
    if (match[1]) {
      targetArea = match[1]
      if (!(await getAreaInfo(this, targetArea))) {
        await this.reply(`还不支持${match[1]}鳄梨酱ヾ(≧O≦)〃嗷~`, e.isGroup)
        return false
      }
    } else if (match[2]) {
      targetArea = areaConfig.length > (match[2].length)
        ? areaConfig[match[2].length]
        : cities[Math.floor(Math.random() * cities.length)]
    } else {
      targetArea = areaConfig[0] || cities[Math.floor(Math.random() * cities.length)]
    }
    logger.warn('查询天气: ', targetArea)
    let result = await weather(e, targetArea)
    await this.reply(result ? segment.image(result) : '没有找到这个鳄梨酱😞', e.isGroup)
    return true
  }

  async avocadoTranslate (e, languageCode = '', param = '') {
    let pendingText, langCode
    const codeConfig = Config.translateLang
    logger.warn(codeConfig)
    // [?？]([?？]+) => 使match结果和配置数组的索引保持一致
    const translateRegex = /^#?(.*)鳄梨酱[?？]([?？]*)/
    const match = this.e.msg.trim().match(translateRegex)
    if (match[1]) {
      langCode = translateLangSupports.find(item => item.label === match[1])?.code || 'auto'
      if (langCode === 'auto') {
        await this.reply(`还不支持${match[1]}鳄梨酱ヾ(≧O≦)〃嗷~`, e.isGroup)
      }
    } else if (match[2]) {
      langCode = codeConfig.length > (match[2].length - 1)
        ? codeConfig[match[2].length - 1].charAt(0)
        : languageCode || 'auto'
    } else {
      langCode = 'auto'
    }
    if (param.length) {
      pendingText = param
      langCode = languageCode
    } else {
      if (e.source) {
        let msgType, msgInfo
        const isImg = await getImg(e)
        logger.warn('isImg:', isImg)
        if (isImg.length) {
          [msgType, msgInfo] = await getImageOcrText(e) || ['', []]
        } else {
          [msgType, msgInfo] = await getSourceMsg(e) || ['', []]
        }
        logger.warn('msgType:', msgType)
        logger.warn('msgInfo:', msgInfo)
        if (msgType === 'xml') {
          await this.reply('xml信息目前还无能为力哦~')
          return true
        }
        if (msgType === 'url') {
          await this.reply('www.iLove鳄梨酱.icu')
          return false
        }
        if (msgType === 'text') {
          pendingText = msgInfo
        }
        if (msgType === 'ocr') {
          let i
          for (const item of msgInfo) {
            i = item.replace(/\n\r/, '').trim().replace(translateRegex, '')
            if (urlRegex.test(i)) {
              await this.reply('www.iLove鳄梨酱.icu')
              return false
            }
            await this.avocadoTranslate(this, langCode, i)
          }
        }
      } else {
        pendingText = this.e.msg.trim().replace(translateRegex, '')
      }
    }
    logger.warn('pendingText:', pendingText)
    logger.warn('langCode:', langCode)
    // 递归终止
    if (pendingText === undefined || langCode === undefined) return true
    let result = await translate(pendingText, langCode)
    await this.reply(result)
    return true
  }

  async avocadoPsycho (e) {
    let url = 'https://xiaobapi.top/api/xb/api/onset.php?name=鳄梨酱'
    try {
      let response = await fetch(url)
      if (response.status === 200) {
        let json = await response.json()
        if (json.code === 1 && json.data) {
          await this.reply(json.data)
        } else {
          await e.reply('发电失败(ノへ￣、)：' + json.toString())
          return true
        }
      }
    } catch (err) {
      logger.error('发电失败(ノへ￣、)：', err)
      await e.reply('发电失败(ノへ￣、)：' + err)
      return false
    }
  }

  async avocadoMovie (e) {
    let mainInfoList
    if (await redis.get('AVOCADO:MOVIE_EXPIRE')) {
      mainInfoList = JSON.parse(await redis.get('AVOCADO:MOVIE_DETAILS'))
    } else {
      await this.reply('更新数据中...请稍等...')
      try {
        mainInfoList = await getMovieList(this)
        await redis.set('AVOCADO:MOVIE_DETAILS', JSON.stringify(mainInfoList))
        await redis.set('AVOCADO:MOVIE_EXPIRE', 1, { EX: 60 * 60 * 24 })
      } catch (error) {
        this.reply(`啊哦!${error}`)
        return false
      }
    }
    let scList = mainInfoList
      .filter(item => item.id)
      .map(item => {
        let sc = item.sc
        let n
        if (sc !== 0) {
          return `${item.nm} -> 评分: ${sc}`
        } else if (item.viewable === 1) {
          const releaseDate = new Date(item.rt)
          const now = new Date()
          const diffTime = Math.abs(now.getTime() - releaseDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays > 15) {
            n = '大概率烂片~'
          } else if (diffDays > 7) {
            n = '成分复杂...'
          } else {
            n = '是新片哦~'
          }
        } else {
          n = '预售'
        }
        return `${item.nm} -> ${n}`
      })
    await e.reply(`最近的热映影片有\n${scList.join('\n')},\n你想了解关于哪一部影片的详细信息呢~`)
    this.setContext('pickMe', false, 180)
  }

  async pickMe (e) {
    const msg = this.e.msg.trim()
    if (msg === '超!是鳄梨酱啊!') {
      await this.reply('鳄梨酱!!!')
      this.finish('pickMe')
      return true
    }
    let mainInfoList = JSON.parse(await redis.get('AVOCADO:MOVIE_DETAILS'))
    if (!mainInfoList.map(item => item.nm).includes(msg)) {
      await this.reply('...')
      return
    }
    let selectedMovie = mainInfoList.filter(item => item.nm === msg)[0]
    logger.warn(selectedMovie)
    let transformedMoviesDetails = []
    Object.keys(movieKeyMap).map(async key => {
      // 空值不要
      if (!selectedMovie[key]) return false
      let img
      if (key === 'img') {
        img = segment.image(selectedMovie[key])
        transformedMoviesDetails.push(img)
        transformedMoviesDetails.push('\n')
        return true
      }
      if (key === 'nm') {
        transformedMoviesDetails.push(`${movieKeyMap[key]}: ${selectedMovie[key]}\n`)
        return true
      }
      if (key === 'sc' && selectedMovie.sc !== 0) {
        transformedMoviesDetails.push(`${movieKeyMap[key]}: ${selectedMovie[key]}\n`)
        return true
      }
      if (key === 'videoName') {
        transformedMoviesDetails.push(`${movieKeyMap[key]}: ${selectedMovie[key]}\n`)
        return true
      }
      if (key === 'videourl') {
        transformedMoviesDetails.push(`${selectedMovie[key]}`)
        transformedMoviesDetails.push('\n')
        return true
      }
      if (key === 'photos') {
        let photo
        transformedMoviesDetails.push(`${movieKeyMap[key]}: \n`)
        for (const i of selectedMovie[key]) {
          photo = segment.image(i)
          transformedMoviesDetails.push(photo)
        }
        return true
      }
      transformedMoviesDetails.push(`${movieKeyMap[key]}: ${selectedMovie[key]}\n`)
      return true
    })
    await this.reply(await makeForwardMsg(e, [transformedMoviesDetails], '鳄门...🙏'))
    await this.reply('可继续选择影片~~输入 超!是鳄梨酱啊! 结束此次操作¡¡¡( •̀ ᴗ •́ )و!!!')
  }
}
