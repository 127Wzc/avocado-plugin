import fetch from 'node-fetch'
import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'
import { avocadoRender, generateRandomHeader, sleep, splitArray } from '../utils/common.js'
import { getBonkersBabble } from './avocadoPsycho.js'
import { singerMap, singerTypeMap } from '../utils/const.js'
import {
  findSong,
  getFavList,
  getGreetMsg,
  getSingerHotList,
  getMusicDetail,
  getSingerDetail,
  getSingerId,
  getSingerRankingList,
  sendMusic
} from '../utils/music.js'

export class AvocadoMusic extends plugin {
  constructor () {
    super({
      name: '鳄梨酱！！！ => Dance',
      dsc: '鳄梨酱！！！',
      event: 'message',
      priority: 300,
      rule: [
        {
          reg: `^#?(鳄梨酱|${global.God}|点歌)#(随机|热门)?(华语|欧美|韩国|日本)?(.*)`,
          fnc: 'pickMusic'
        },
        {
          reg: `^(来点好听的|${global.God}[~～]|下一首|切歌|听歌|换歌|下一曲)$`,
          fnc: 'randomMusic'
        },
        {
          reg: '^#?设置音乐[cC][kK](.*)',
          fnc: 'setMusicCK',
          permission: 'master'
        },
        {
          reg: '^#?设置歌手.+',
          fnc: 'setSinger'
        },
        {
          reg: '^#?重新获取音乐数据',
          fnc: 'reloadMusicInfo'
        },
        {
          reg: '^#?了解(.+)',
          fnc: 'getSinger'
        },
        {
          reg: '^#?(华语|中国|欧美|韩国|日本)歌手榜',
          fnc: 'getSingerRankingList'
        }
        // {
        //   reg: '^#?(华语|欧美|韩国|日本)歌手榜',
        //   fnc: 'getSingerRankingList'
        // }
      ]
    })

    this.task = [
      {
        cron: '15 7 * * *',
        // cron: '*/1 * * * *',
        name: 'Good morning',
        fnc: this.sayGoodMorning
      },
      {
        cron: '5 12 * * *',
        // cron: '*/1 * * * *',
        name: 'Good afternoon',
        fnc: this.sayGoodAfternoon
      },
      {
        cron: '30 23 * * *',
        // cron: '*/1 * * * *',
        name: 'Nightly-night',
        fnc: this.sayGoodnight
      }
    ]
  }

  async sendBoradCast () {
    // 咕咕咕
  }

  async pickMusic (e) {
    if (!Config.wyy) {
      await e.reply('你还没有设置音乐ck呢~')
      return false
    }
    const regex = new RegExp(`^#?(${global.God}|鳄梨酱|点歌)#(随机|热门)?(华语|欧美|韩国|日本)?(.*)`)
    const match = e.msg.trim().match(regex)
    const selectType = match[2] ? match[2] : ''
    const query = match[4] ? match[4].replace(/[，,]/g, ',') : ''
    const { isRandom, isHotList } = { isRandom: selectType === '随机', isHotList: selectType === '热门' }
    const isSinger = query ? !!(await getSingerId(query)) : false

    let singerType = singerTypeMap[match[3]] || Math.ceil(Math.random() * 4)
    let hotList
    if (isSinger) hotList = await getSingerHotList(e.sender.user_id, query)
    // 指令包含类型 =》 随机|热门
    if (selectType) {
      // 存在点歌参数
      if (query) {
        if (isRandom) { // 随机点歌
          // 点歌参数是否为歌手名
          if (isSinger) {
            let song = hotList[Math.floor(Math.random() * hotList.length)]
            const data = {
              param: song.songName,
              isRandom: false,
              songId: song.songId,
              from: 'random'
            }
            song = await findSong(data)
            if (!song) {
              const img = await avocadoRender(`### 没有找到名为 ${query} 的歌曲呢...试试其他选择吧~\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '', renderType: 1 })
              if (img) await e.reply(img)
              return
            }
            await sendMusic(e, song)
            return true
          } else {
            if (/歌手|音乐人/.test(query)) {
              const singerRankingList = await getSingerRankingList(e.sender.user_id, singerType)
              const picked = singerRankingList[Math.floor(Math.random() * singerRankingList.length)]
              const singerInfo = await getSingerDetail(picked.id)
              const replyMsg = []
              for (const key in singerInfo) {
                replyMsg.push([singerInfo[key]].join('').length ? `${singerMap[key]}：${singerInfo[key]}\n` : '')
              }
              const img = await avocadoRender(replyMsg.join(''), { title: '', caption: '', footer: `你想不想继续了解${singerInfo.name}的热门单曲呢~`, renderType: 1 })
              if (img) await e.reply(img)
              await getSingerHotList(e.sender.user_id, singerInfo.name)
              await redis.set(`AVOCADO:MUSIC_${e.sender.user_id}_FROM`, 'randomSinger', { EX: 60 * 10 })
              e.startTime = new Date()
              e.contextDuration = 180
              this.setContext('isContinue', e.isGroup, e.contextDuration, e)
              return true
            }
            // 随机歌名点歌
            const data = { param: query, isRandom, songId: '', from: 'random' }
            const song = await findSong(data)
            if (!song) {
              const img = await avocadoRender(`### 没有找到名为${query}的歌曲呢...试试其他选择吧~\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '', renderType: 1 })
              if (img) await e.reply(img)
              return
            }
            await sendMusic(e, song)
            return true
          }
        }
        if (isHotList) { // 指令包含’热门‘参数
          if (singerType) { // 指令包含歌手类型
            if (/歌手|音乐人/.test(query)) { // 点歌参数为歌手|音乐人
              const singerRankingList = await getSingerRankingList(e.sender.user_id, singerType)
              const hotSingers = splitArray(singerRankingList.map(obj => `${obj.index}: ${obj.name}`), 3)
              const img = await avocadoRender(hotSingers, {
                title: `热门${match[3]}歌手`,
                caption: '',
                footer: '有没有你感兴趣的歌手呢~你想了解谁呢~',
                renderType: 2
              })
              logger.mark('start pickHotSinger context')
              await e.reply(img)
              e.startTime = new Date()
              e.contextDuration = 120
              this.setContext('pickHotSinger', e.isGroup, e.contextDuration, e)
              logger.mark('start pickHotSinger context')
              return true
            }
          }
          if (isSinger) { // 点歌参数为歌手名
            const text = splitArray(hotList.map(obj => `${obj.index}: ${obj.songName}\n`), 2)
            const img = await avocadoRender(text, { title: `${query}-热门播放50`, caption: '', footer: '可通过发送对应序号获取音乐~', renderType: 2 })
            if (img) await e.reply(img)
            e.startTime = new Date()
            e.contextDuration = 120
            this.setContext('selectHotListMusic', e.isGroup, e.contextDuration, e)
            logger.mark('start selectHotListMusic context')
            return true
          }
          // const img = await avocadoRender(`### 没有找到名为 ${query} 的歌手呢...\n### 当前指令只支持 \`热门[歌手(名称)|音乐人]\` 哦！试试其他选择吧~\n- 鳄梨酱#热门李健\n- 鳄梨酱#热门歌手\n- 鳄梨酱#热门音乐人\n\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '', renderType: 1 })
          // if (img) await e.reply(img)
          // return true
        }
      } else if (!query) { // 没有任何点歌参数
        if (isRandom) {
          await e.reply(`什么？可通过发送 '${global.God}#随机+歌手名' 随机播放歌手的热门单曲哦！`)
          return false
        }
        if (isHotList) {
          await e.reply(`你是不是想了解最近的热门歌手呢？可通过发送 '${global.God}#热门+歌手' 获取今日热门歌手哦！`)
          return false
        }
      }
    } else if (query) { // 没有指定点歌类型但有点歌参数
      if (isSinger) {
        const text = splitArray(hotList.map(obj => `${obj.index}: ${obj.songName}\n`), 2)
        const img = await avocadoRender(text, { title: `${query}-热门播放50`, caption: '', footer: '可通过发送对应序号获取音乐~', renderType: 2 })
        if (img) await e.reply(img)
        e.startTime = new Date()
        e.contextDuration = 120
        this.setContext('selectHotListMusic', e.isGroup, e.contextDuration, e)
        logger.mark('start selectHotListMusic context')
        return true
      }
      // 正常点歌
      const data = { param: query, isRandom: false, songId: '', from: '' }
      const song = await findSong(data)
      if (Array.isArray(song)) {
        const text = splitArray(song.map(obj => `${obj.index}: ${obj.name} by ${obj.singer}`), 2)
        await e.reply('哎呀，找不到您想听的歌曲啦~(>_<)~不要难过，看看下面的列表吧！说不定您会在这里找到自己心仪的歌曲呢！(≧∇≦)ﾉ 发送对应序号即可选择歌曲哦~ 或者发送 0 取消点歌呦~(＾Ｕ＾)ノ~ＹＯ')
        const img = await avocadoRender(text, { title: null, caption: '', footer: '', renderType: 2 })
        if (img) await e.reply(img)
        e.songName = query
        e.startTime = new Date()
        e.contextDuration = 120
        this.setContext('wrongFind', e.isGroup, e.contextDuration, e)
        logger.mark('start wrongFind context')
        return true
      }
      if (!song) {
        const img = await avocadoRender(`### 没有找到名为 ${query} 的歌曲呢...\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '', renderType: 1 })
        if (img) await e.reply(img)
        return true
      }
      await sendMusic(e, song)
      return true
    } else { // 没有指定点歌类型且没有任何点歌参数
      await e.reply('告诉我你想听什么吧~')
      return true
    }
  }

  async wrongFind (e) {
    const senderFromChatGpt = e.senderFromChatGpt || this.e.senderFromChatGpt
    const startTime = e.startTime || this.e.startTime
    const contextDuration = e.contextDuration || this.e.contextDuration
    if (senderFromChatGpt !== this.e.sender.user_id) {
      logger.warn('当前正处于连续上下文对话中，非发起人不予回复！距离本次对话结束还剩 ' + Math.floor((contextDuration - (new Date() - startTime) / 1000)) + ' 秒！')
      return
    }
    if (typeof this.e.msg !== 'string') { return }
    logger.mark('wrongFind:', this.e.msg)
    // 从上次对话中获取歌名
    const songList = JSON.parse(await redis.get(`AVOCADO:MUSIC_${e.songName}`))
    const reg = new RegExp(`^((0)|(${songList.map(item => item.index).join('|')})|(${songList.map(item => item.name).join('|').replace(/\*/g, ' fuckWords ').replace(/\(/g, '（').replace(/\)/g, '）').replace(/\./g, ' ')}))$`)
    if (!reg.test(this.e.msg)) {
      const count = await redis.get('AVOCADO_REQUESTCOUNT')
      if (!count) {
        await this.reply('告诉我序号吧，回复0结束点歌。')
        await redis.set('AVOCADO_REQUESTCOUNT', 1, { EX: 60 * 1.5 })
      }
    } else {
      if (/0/.test(this.e.msg)) {
        await this.e.reply(`${global.God}！！！`)
        logger.mark('finish wrongFind')
        this.finish('wrongFind', this.e.isGroup, this.e)
        return true
      }
      const selectedMusic = songList.find(eachSong => eachSong.index === parseInt(this.e.msg) || eachSong.name === this.e.msg)
      const songName = selectedMusic?.name
      const songId = selectedMusic?.id
      logger.warn('第二次点歌: ', !!songList, selectedMusic, songName, songId)
      if (!(songName && songId)) return false
      const data = {
        param: songName,
        isRandom: false,
        songId,
        from: 'reChoose'
      }
      const song = await findSong(data)
      let res
      if (song) {
        res = sendMusic(this.e, song)
      } else {
        const img = await avocadoRender(`### 没有找到名为${songName}的歌曲呢...\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '', renderType: 1 })
        if (img) await this.e.reply(img)
        logger.mark('finish wrongFind')
        this.finish('wrongFind', this.e.isGroup, this.e)
      }
      if (!res) {
        logger.error('res:', res)
      }
      logger.mark('finish wrongFind')
      this.finish('wrongFind', this.e.isGroup, this.e)
    }
  }

  async pickHotSinger (e) {
    const senderFromChatGpt = e.senderFromChatGpt || this.e.senderFromChatGpt
    const startTime = e.startTime || this.e.startTime
    const contextDuration = e.contextDuration || this.e.contextDuration
    if (senderFromChatGpt !== this.e.sender.user_id) {
      logger.warn('当前正处于连续上下文对话中，非发起人不予回复！距离本次对话结束还剩 ' + Math.floor((contextDuration - (new Date() - startTime) / 1000)) + ' 秒！')
      return
    }
    if (typeof this.e.msg !== 'string') { return }
    logger.mark('pickHotSinger:', this.e.msg)
    const hotSingers = await getSingerRankingList(this.e.sender.user_id, await redis.get(`AVOCADO:MUSIC_${this.e.sender.user_id}_SINGERTYPE`))
    const reg = new RegExp(`^((0)|(${hotSingers.map(item => item.index).join('|')})|(${hotSingers.map(item => item.name).join('|').replace(/\*/g, ' fuckWords ').replace(/\(/g, '（').replace(/\)/g, '）').replace(/\./g, ' ')}))$`)
    let img
    if (!reg.test(this.e.msg)) {
      const count = await redis.get('AVOCADO_REQUESTCOUNT')
      if (!count) {
        img = await avocadoRender(`### 没有找到名为 ${this.e.msg} 的歌手呢...试试其他选择吧~\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '', renderType: 1 })
        if (img) await this.reply(img)
        await redis.set('AVOCADO_REQUESTCOUNT', 1, { EX: 60 * 3 })
      }
      return true
    } else {
      if (parseInt(this.e.msg) === 0) {
        logger.mark('finish pickHotSinger')
        this.finish('pickHotSinger', this.e.isGroup, this.e)
        return true
      }
      const pickedSinger = hotSingers.find(item => item.index === parseInt(this.e.msg) || item.name === this.e.msg)
      const singerId = pickedSinger.id
      const singerName = pickedSinger.name
      const singerInfo = await getSingerDetail(singerId)
      let replyMsg = []
      for (const key in singerInfo) {
        replyMsg.push([singerInfo[key]].join('').length ? `${singerMap[key]}：${singerInfo[key]}\n` : '')
      }
      img = await avocadoRender(replyMsg.join(''), { title: '', caption: '', footer: `你想不想继续了解${singerName}的热门单曲呢~`, renderType: 1 })
      if (img) await this.e.reply(img)
      // 保存用户的选择
      await getSingerHotList(this.e.sender.user_id, singerName)
      logger.mark('finish pickHotSinger')
      this.finish('pickHotSinger', this.e.isGroup, this.e)
      this.e.startTime = Date.now()
      this.e.contextDuration = 180
      this.e.senderFromChatGpt = e.senderFromChatGpt
      this.setContext('isContinue', this.e.isGroup, this.e.contextDuration, this.e)
      logger.mark('start isContinue context')
      return true
    }
  }

  async getSinger (e) {
    const singer = e.msg.trim().replace(/#?了解/, '')
    logger.mark('singer: ', singer)
    const singerId = await getSingerId(singer)
    if (!singerId) {
      const img = await avocadoRender(`### 没有找到名为 ${singer} 的歌手呢...\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '', renderType: 1 })
      if (img) await this.reply(img)
      return true
    }

    const singerInfo = await getSingerDetail(singerId)
    let replyMsg = []
    for (const key in singerInfo) {
      replyMsg.push([singerInfo[key]].join('').length ? `${singerMap[key]}：${singerInfo[key]}\n` : '')
    }
    const img = await avocadoRender(replyMsg.join(''), { title: '', caption: '', footer: `你想不想继续了解${singer}的热门单曲呢~`, renderType: 1 })
    await getSingerHotList(this.e.sender.user_id, singer)
    if (img) {
      await this.reply(img)
    }
    e.startTime = new Date()
    e.contextDuration = 120
    this.setContext('isContinue', e.isGroup, e.contextDuration, e)
    logger.mark('start isContinue context')
    return true
  }

  async isContinue (e) {
    const senderFromChatGpt = e.senderFromChatGpt || this.e.senderFromChatGpt
    const startTime = e.startTime || this.e.startTime
    const contextDuration = e.contextDuration || this.e.contextDuration
    if (senderFromChatGpt !== this.e.sender.user_id) {
      logger.warn('当前正处于连续上下文对话中，非发起人不予回复！距离本次对话结束还剩 ' + Math.floor((contextDuration - (new Date() - startTime) / 1000)) + ' 秒！')
      return
    }
    if (typeof this.e.msg !== 'string') { return }
    logger.mark('isContinue: ', this.e.msg)
    const reg = /算了|0|想|1|换/
    if (!reg.test(this.e.msg)) {
      const count = await redis.get('AVOCADO_REQUESTCOUNT')
      if (!count) {
        const img = await avocadoRender(`### 🤔💭 想要呢？还是算了呢？\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '', renderType: 1 })
        if (img) await this.reply(img)
        await redis.set('AVOCADO_REQUESTCOUNT', 1, { EX: 60 * 3 })
      }
      return true
    } else {
      if (/算了|0/.test(this.e.msg)) {
        await this.e.reply(`${global.God}！！！`)
        logger.mark('finish isContinue')
        this.finish('isContinue', this.e.isGroup, this.e)
        return true
      }
      if (/换/.test(this.e.msg)) {
        const from = await redis.get(`AVOCADO:MUSIC_${this.e.sender.user_id}_FROM`)
        if (from === 'randomSinger') {
          const singerRankingList = await getSingerRankingList(this.e.sender.user_id, Math.ceil(Math.random() * 4))
          const picked = singerRankingList[Math.floor(Math.random() * singerRankingList.length)]
          const singerInfo = await getSingerDetail(picked.id)
          const replyMsg = []
          for (const key in singerInfo) {
            replyMsg.push([singerInfo[key]].join('').length ? `${singerMap[key]}：${singerInfo[key]}\n` : '')
          }
          const img = await avocadoRender(replyMsg.join(''), { title: '', caption: '', footer: `你愿意继续了解${singerInfo.name}最受欢迎的单曲吗~☺️`, renderType: 1 })
          if (img) await this.reply(img)
          await getSingerHotList(this.e.sender.user_id, singerInfo.name)
          this.finish('isContinue', this.e.isGroup, this.e)
          logger.mark('finish isContinue context')
          this.e.startTime = new Date()
          this.e.contextDuration = 180
          this.setContext('isContinue', this.e.isGroup, this.e.contextDuration, this.e)
          logger.mark('start isContinue context')
          return true
        }
      }
      const hotList = JSON.parse(await redis.get(`AVOCADO:MUSIC_${this.e.sender.user_id}_HOTLIST`))
      const singer = hotList.find(obj => obj.singer.length === 1).singer[0]
      const text = splitArray(hotList.map(obj => `${obj.index}: ${obj.songName}`), 2)
      const img = await avocadoRender(text, { title: `${singer}-热门播放50`, caption: '', footer: '', renderType: 2 })
      if (img) await this.reply(img)
      this.finish('isContinue', this.e.isGroup, this.e)
      logger.mark('finish isContinue context')
      this.e.startTime = new Date()
      this.e.contextDuration = 180
      this.setContext('selectHotListMusic', this.e.isGroup, this.e.contextDuration, this.e)
      logger.mark('start selectHotListMusic context')
      return true
    }
  }

  async selectHotListMusic (e) {
    const senderFromChatGpt = e.senderFromChatGpt || this.e.senderFromChatGpt
    const startTime = e.startTime || this.e.startTime
    const contextDuration = e.contextDuration || this.e.contextDuration
    if (senderFromChatGpt !== this.e.sender.user_id) {
      logger.warn('当前正处于连续上下文对话中，非发起人不予回复！距离本次对话结束还剩 ' + Math.floor((contextDuration - (new Date() - startTime) / 1000)) + ' 秒！')
      return
    }
    logger.mark('selectHotListMusic: ', this.e.msg)
    if (typeof this.e.msg !== 'string') { return }
    const hotList = JSON.parse(await redis.get(`AVOCADO:MUSIC_${this.e.sender.user_id}_HOTLIST`))
    const reg = new RegExp(`^((0)|(${hotList.map(item => item.index).join('|')})|(${hotList.map(item => item.songName).join('|').replace(/\*/g, ' fuckWords ').replace(/\(/g, '（').replace(/\)/g, '）').replace(/\./g, ' ')}))$`)
    let res, img
    if (!reg.test(this.e.msg)) {
      // img = await avocadoRender(`### 没有找到 ${this.e.msg} 呢...试试其他选择吧~\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '' })
      // if (img) await this.reply(img)
    } else {
      if (parseInt(this.e.msg) === 0) {
        logger.mark('finish selectHotListMusic')
        this.finish('selectHotListMusic', this.e.isGroup, this.e)
        return true
      }
      const selectedMusic = hotList.find(eachSong => eachSong.index === parseInt(this.e.msg) || eachSong.songName === this.e.msg)
      const songName = selectedMusic?.songName
      const songId = selectedMusic?.songId
      logger.mark('点歌: ', !!hotList, selectedMusic, songName, songId)
      if (!(songName && songId)) return false
      const data = {
        param: songName,
        isRandom: false,
        songId,
        from: 'hot'
      }
      const song = await findSong(data)
      if (song) {
        res = sendMusic(this.e, song)
      } else {
        const img = await avocadoRender(`### 没有找到名为${songName}的歌曲呢...\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '', renderType: 1 })
        if (img) await this.e.reply(img)
        logger.mark('finish selectHotListMusic')
        this.finish('selectHotListMusic', this.e.isGroup, this.e)
      }
      if (!res) {
        logger.error('res:', res)
      }
    }
  }

  async reloadMusicInfo (e) {
    if (!Config.wyy) {
      await this.reply('你还没有设置音乐ck呢~')
      return false
    }
    const userData = await redis.get(`AVOCADO:MUSIC_${e.sender.user_id}_FAVSINGER`)
    if (!userData) {
      await this.reply('你还没有设置歌手')
      return false
    } else {
      const singerId = JSON.parse(userData).singerId
      await this.reply('正在更新歌曲数据...')
      const res = await getFavList(e.sender.user_id, singerId)
      if (res) {
        await this.reply('成功了！')
      }
    }
  }

  async randomMusic (e) {
    if (!Config.wyy) {
      await this.reply('你还没有设置音乐ck呢~')
      return false
    }
    const userData = await redis.get(`AVOCADO:MUSIC_${e.sender.user_id}_FAVSONGLIST`)
    const songList = JSON.parse(userData)
    if (!songList) {
      await this.reply('我还不知道你喜欢听谁的歌呢ο(=•ω＜=)ρ⌒☆\n通过 #设置歌手 告诉我吧~')
      return false
    }
    const selectedMusic = songList[Math.floor(songList.length * Math.random())]
    const musicDetail = await getMusicDetail(selectedMusic)
    await sendMusic(this.e, musicDetail)
    return true
  }

  async setMusicCK (e) {
    let ck = e.msg.trim().match(/^#?设置音乐[cC][kK](.*)/)[1]
    if (ck) {
      Config.wyy = ck
      await this.reply('设置成功')
    } else {
      await this.reply('设置失败')
    }
  }

  async setSinger (e) {
    if (!Config.wyy) {
      await this.reply('你还没有设置音乐ck呢~')
      return false
    }
    let singer = e.msg.trim().replace(/^#?设置歌手\s*/, '')
    const userSinger = await redis.get(`AVOCADO:MUSIC_${e.sender.user_id}_FAVSINGER`)
    let singerId
    if (userSinger) {
      const data = JSON.parse(userSinger)
      const uSinger = data.singer
      if (singer === uSinger) {
        await this.reply('设置成功')
        return false
      }
    }
    let url = `http://110.41.21.181:3000/cloudsearch?keywords=${encodeURI(singer)}&limit=1`

    const headers = generateRandomHeader()
    const options = {
      method: 'GET',
      headers
    }
    const response = await fetch(url, options)
    let res = await response.json()
    if (res.code !== 200) { return false }
    const songs = res.result.songs
    // songs.forEach(item => {
    //   let lowerCaseSinger = singer.toLowerCase()
    //   singerId = item.ar.find(item => item.name.toLowerCase() === lowerCaseSinger || (item?.tns.length ? item?.tns[0]?.toLowerCase() === lowerCaseSinger : false) || (item?.alias.length ? item?.alias[0]?.toLowerCase() === lowerCaseSinger : false) || (item?.alia ? (item?.alia.length ? item?.alia[0]?.toLowerCase() === lowerCaseSinger : false) : false))?.id
    // })
    songs.forEach(item => {
      const lowerCaseSinger = singer.toLowerCase()
      singerId = item.ar.find(arItem => [arItem.name, arItem?.tns?.[0], arItem?.alias?.[0], arItem?.alia?.[0]].some(name => name?.toLowerCase() === lowerCaseSinger))?.id
    })
    if (!singerId) {
      await this.reply(`找不到名为${singer}的歌手，请检查名称是否输入完整。`)
      return false
    }
    const data = {
      singer,
      singerId
    }
    await redis.set(`AVOCADO:MUSIC_${e.sender.user_id}_FAVSINGER`, JSON.stringify(data))
    await this.reply('设置成功')
    await this.reply('正在获取歌曲数据...')
    res = await getFavList(e.sender.user_id, singerId)
    if (res) {
      await this.reply('成功了！')
    }
  }

  async getSingerRankingList (e) {
    const singerType = e.msg.match(/^#?(华语|中国|欧美|韩国|日本)歌手榜/)[1]
    const singerRankingList = await getSingerRankingList(e.sender.user_id, singerTypeMap[singerType])
    const text = splitArray(singerRankingList.map(item => `${item.index}: ${item.name}${item.transName ? '(' + item.transName + ')' : ''}`), 2)
    const img = await avocadoRender(text, { title: `${singerType}歌手榜`, caption: '', footer: '有没有你感兴趣的歌手呢~告诉我你想听谁的歌吧~', renderType: 2 })
    await this.reply(img)
    this.setContext('pickRankingSinger', e.isGroup, 120, e)
    logger.mark('start pickRankingSinger context')
    return true
  }

  async pickRankingSinger (e) {
    if (typeof this.e.msg !== 'string') { return }
    const singerType = await redis.get(`AVOCADO:MUSIC_${this.e.sender.user_id}_SINGERTYPE`)
    const list = await getSingerRankingList('', singerType)
    const reg = new RegExp(`^(0|(${list.map(item => item.index).join('|')})|(${list.map(item => item.name).join('|').replace(/\*/g, ' fuckWords ').replace(/\(/g, '（').replace(/\)/g, '）').replace(/\./g, ' ')})|(${list.map(item => item.transName).join('|').replace(/\*/g, '')}))$`)
    if (!reg.test(this.e.msg)) {
      const img = await avocadoRender(`### 没有找到 ${this.e.msg} 呢...试试其他选择吧~\n${await getBonkersBabble({}, global.God, 'native')}`, { title: '', caption: '', footer: '', renderType: 1 })
      if (img) await this.reply(img)
    } else {
      if (parseInt(this.e.msg) === 0) {
        this.finish('pickRankingSinger', this.e.isGroup, this.e)
        return true
      }
      const pickedSinger = list.find(item => item.index === parseInt(this.e.msg) || item.name === this.e.msg || item.transName === this.e.msg)
      const singerId = pickedSinger.id
      const singerName = pickedSinger.name
      const singerInfo = await getSingerDetail(singerId)
      let replyMsg = []
      for (const key in singerInfo) {
        replyMsg.push([singerInfo[key]].join('').length ? `${singerMap[key]}：${singerInfo[key]}\n` : '')
      }
      const img = await avocadoRender(replyMsg.join(''), { title: '', caption: '', footer: `你想不想继续了解${singerName}的热门单曲呢~`, renderType: 1 })
      await getSingerHotList(this.e.sender.user_id, singerName)
      if (img) {
        await this.reply(img)
      }
      this.finish('pickRankingSinger', this.e.isGroup, this.e)
      logger.mark('finish pickRankingSinger context')
      this.setContext('isContinue', this.e.isGroup, 180, this.e)
      logger.mark('start isContinue context')
      return true
    }
  }

  async sayGoodMorning () {
    if (!Config.apiKey && !Config.apiBaseUrl) {
      logger.warn('未配置apiKey或apiBaseUrl')
      return false
    }
    let [replyMsg, songId, songName] = await getGreetMsg(105402228, 1)
    let data = { param: songName, songId, isRandom: false, from: 'goodMorning' }
    let song = await findSong(data)
    // 重试一次
    if (!song) {
      [replyMsg, songId, songName] = await getGreetMsg(105402228, 1)
      data = { param: songName, songId, isRandom: false, from: 'goodMorning' }
      song = await findSong(data)
    }
    let toSend = Config.initiativeGroups || []
    let img
    if (replyMsg && song) {
      let comments = song?.comments.map(item => [`🌻${item[1]}`]).join('\n\n')
      if (comments.length) {
        img = await avocadoRender(comments, { title: '🌻早上好呀🌻', caption: '', footer: '', renderType: 1 })
      }
      for (const element of toSend) {
        if (!element) {
          continue
        }
        let groupId = parseInt(element)
        if (Bot.getGroupList().get(groupId)) {
          await Bot.sendGroupMsg(groupId, replyMsg)
          const e = {}
          e.group = {}
          e.groupId = groupId
          e.group.gid = groupId
          e.isGroup = true
          song.autoSend = true
          song.from = 'greet'
          await sendMusic(e, song)
          await sleep(2000)
          if (img) {
            await Bot.sendGroupMsg(groupId, img)
            await sleep(2000)
          }
        } else {
          logger.warn('机器人不在要发送的群组里。' + groupId)
        }
      }
    }
  }

  async sayGoodAfternoon () {
    if (!Config.apiKey && !Config.apiBaseUrl) {
      logger.warn('未配置apiKey或apiBaseUrl')
      return false
    }
    let [replyMsg, songId, songName] = await getGreetMsg(2878202769, 2)
    let data = { param: songName, songId, isRandom: false, from: 'goodAfternoon' }
    let song = await findSong(data)
    // 重试一次
    if (!song) {
      [replyMsg, songId, songName] = await getGreetMsg(2878202769, 2)
      data = { param: songName, songId, isRandom: false, from: 'goodAfternoon' }
      song = await findSong(data)
    }
    let toSend = Config.initiativeGroups || []
    let img
    if (replyMsg && song) {
      let comments = song?.comments.map(item => [`🌊${item[1]}`]).join('\n\n')
      if (comments.length) {
        img = await avocadoRender(comments, { title: '🍴大家中午好呀！！', caption: '', footer: '', renderType: 1 })
      }
      for (const element of toSend) {
        if (!element) {
          continue
        }
        let groupId = parseInt(element)
        if (Bot.getGroupList().get(groupId)) {
          await Bot.sendGroupMsg(groupId, replyMsg)
          const e = {}
          e.group = {}
          e.groupId = groupId
          e.group.gid = groupId
          e.isGroup = true
          song.autoSend = true
          song.from = 'greet'
          await sendMusic(e, song)
          await sleep(2000)
          if (img) {
            await Bot.sendGroupMsg(groupId, img)
            await sleep(2000)
          }
        } else {
          logger.warn('机器人不在要发送的群组里。' + groupId)
        }
      }
    }
  }

  async sayGoodnight () {
    if (!Config.apiKey && !Config.apiBaseUrl) {
      logger.warn('未配置apiKey或apiBaseUrl')
      return false
    }
    try {
      let [replyMsg, songId, songName] = await getGreetMsg(7350109521, 3)
      let data = { param: songName, songId, isRandom: false, from: 'goodnight' }
      let song = await findSong(data)
      if (!song) {
        [replyMsg, songId, songName] = await getGreetMsg(7350109521, 3)
        data = { param: songName, songId, isRandom: false, from: 'goodnight' }
        song = await findSong(data)
      }
      let toSend = Config.initiativeGroups || []
      let img
      if (replyMsg && song) {
        let comments = song?.comments.map(item => [`🌛${item[1]}`]).join('\n\n')
        if (comments.length) {
          img = await avocadoRender(comments, { title: '晚安😴', caption: '', footer: '', renderType: 1 })
        }
        for (const element of toSend) {
          if (!element) {
            continue
          }
          let groupId = parseInt(element)
          if (Bot.getGroupList().get(groupId)) {
            await Bot.sendGroupMsg(groupId, replyMsg)
            const e = {}
            e.group = {}
            e.groupId = groupId
            e.group.gid = groupId
            e.isGroup = true
            song.autoSend = true
            song.from = 'greet'
            await sendMusic(e, song)
            await sleep(2000)
            if (img) {
              await Bot.sendGroupMsg(groupId, img)
              await sleep(2000)
            }
          } else {
            logger.warn('机器人不在要发送的群组里。' + groupId)
          }
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }

  /**
   * @param msg 发送的消息
   * @param quote 是否引用回复
   * @param data.recallMsg 群聊是否撤回消息，0-120秒，0不撤回
   * @param data.at 是否at用户
   */
  reply (msg = '', quote = false, data = {}) {
    if (!this.e.reply || !msg) return false
    return this.e.reply(msg, quote, data)
  }

  /**
   * @param {boolean} isGroup
   * @param {Object} e
   * @returns {string}
   */
  conKey (isGroup = false, e = {}) {
    try {
      const groupId = this.e?.group_id || e.group_id
      const userId = this?.userId || this.e?.user_id || e.user_id
      if (isGroup) {
        return `${this.name}.${groupId}`
      } else {
        return `${this.name}.${userId}`
      }
    } catch (err) {
      logger.error(err)
    }
  }

  /**
   * @param {string} type 执行方法
   * @param {boolean} isGroup 是否群聊
   * @param {number} time 操作时间，默认120秒
   * @param {Object} e
   */
  setContext (type, isGroup = false, time = 120, e = {}) {
    let key = this.conKey(isGroup, e)
    // logger.warn('key:', key)
    if (!stateArr[key]) {
      stateArr[key] = {}
    }
    // this.e ->  this.e || e
    // bug fixed, 不知道第一次为什么没有拿到this.e
    stateArr[key][type] = this.e || e
    // setContext: pickHotSinger undefined
    // logger.warn('setContext:',type, stateArr[key][type])
    if (time) {
      /** 操作时间 */
      setTimeout(() => {
        if (stateArr[key][type]) {
          delete stateArr[key][type]
          // this.e.reply('操作超时已取消', true)
        }
      }, time * 1000)
    }
  }

  getContext () {
    let key = this.conKey()
    return stateArr[key]
  }

  getContextGroup () {
    let key = this.conKey(true)
    return stateArr[key]
  }

  /**
   * @param type 执行方法
   * @param isGroup 是否群聊
   * @param {Object} e
   */
  finish (type, isGroup = false, e = {}) {
    if (stateArr[this.conKey(isGroup, e)] && stateArr[this.conKey(isGroup, e)][type]) {
      delete stateArr[this.conKey(isGroup, e)][type]
    }
  }
}
let stateArr = {}
