## 🥑Avocado-Plugin 🥑

> 啊，[鳄梨酱🥑](https://github.com/ikechan8370)简直就是我的[生命之光](https://github.com/ikechan8370/chatgpt-plugin)！他那灿烂的微笑能够照亮我整个世界，每次见到他都让我的心跳加速、脸红耳赤。他仿佛一股强大的力量在我身边徘徊，让我感觉无所不能、无敌万能。每当我想起与他相识的点点滴滴时，我的眼泪都会悄悄涌上眼眶——因为没有一个人可以如此完美地打动我的心灵。哦鳄梨酱🥑啊，你永远是我内心最宝贵的存在！

#### 使用方法

```bash
# 在云崽根路径下执行
# Github
git clone --depth=1 https://github.com/Qz-Sean/avocado-plugin.git ./plugins/avocado-plugin/
# Gitee
git clone --depth=1 https://gitee.com/sean_l/avocado-plugin.git ./plugins/avocado-plugin/
# 安装项目依赖
cd plugins/avocado-plugin
pnpm i
# 在QQ发送 鳄梨酱！！！ 获取使用帮助
```

#### 已实现

> 主要功能: 预览网页、ocr、文本/图片翻译、对鳄梨酱🥑在线发电、天气查询、查看时下热门电影
>
> **翻译和天气查询功能是受到 [yenai-plugin](https://github.com/yeyang52/yenai-plugin/blob/2c5a54e3a2ce6300732f4ad4e0f32854ac2d4cd4/model/api/funApi.js#L25) 与 [xiaofei-plugin](https://github.com/xfdown/xiaofei-plugin/blob/master/apps/%E5%A4%A9%E6%B0%94.js) 的启发而开发的，如果你感兴趣，可以点击链接前往原插件仓库学习~~**
>
> 现已支持[全局替换关键词](https://github.com/Qz-Sean/avocado-plugin/tree/main#%E6%9C%AA%E6%9D%A5%E5%8F%AF%E8%83%BD)

#### 相关使用指令

- ^#?(.\*)鳄梨酱\[？?]([？?]*)
- ^#?(.\*)鳄梨酱\[.。]([.。]*)
- ^#?鳄梨酱[!！]{2}$
- ^#?鳄梨酱[!！]{3}$
- ^#?鳄梨酱0.0
- ^#?鳄梨酱~~~

#### 功能介绍

##### 预览网页、ocr、文本/图片翻译

* 指令：^#?鳄梨酱[！!]

> ①指令+引用消息识别url
>
> ②指令+url/文本/图片
>
> ③识别聊天界面中的单个纯url
>
> **①②：当引用消息为图片时，未识别到url则输出ocr文字结果。否则输出图片。**

##### 查看天气

- 指令：^#?(\.\*)鳄梨酱\[.。]([.。]*)

> ①通过选择不同的问号个数，读取配置文件查询已配置城市的天气。
>
> ②通过前缀指定查询城市。

##### 鳄梨酱🥑看电影

* 指令：^#?鳄梨酱0.0

> 获取当前热映电影列表。

##### 翻译

- 指令： 鳄梨酱？

> ①默认中英互译，其它语言翻译为中文。
>
> ②通过配置文件配置跟几个问号时翻译为什么语言~
>
> **支持聊天框输入文本和引用消息。**

##### 在线发电

- 当指令没有匹配上面的表达式但又包含关键词时触发

> 鳄梨酱🥑简直就像是上天赐予我的宝藏，他的美貌和聪慧简直让我着迷。我愿意用尽所有手段来保护他、照顾他——因为在我看来，没有任何人能够比鳄梨酱🥑更加值得这样做！

###### 全局替换关键词: <font style="background-color:#8bc34a">咒语+关键词</font>

<details>
    <summary style="font-weight:bold;">咒语</summary>
    黑夜之力，赐予我力量！变身！<br>
	万象之力，汇聚我身！变身！<br>
	火焰之力，燃烧我的灵魂！变身！<br>
	风暴之力，撕裂天际！变身！
</details>

##### 更新插件

- 指令：^#?(<关键词>|鳄梨酱)(插件)?(强制)?(更新|\~\~\~)$

##### 获取此帮助

- 指令：鳄梨酱！！！

#### 未来可能

* (晚|午|早)安鳄梨酱 ==> 记录时间并作出回复。
* 鳄梨日程表(主动提醒 ？==> 群聊/私人）
* '鳄梨酱说'（vits、azure）
* ...

> 如果你有什么好玩的功能建议可以前往 [插件issue页](https://github.com/Qz-Sean/avocado-plugin/issues) 留言哦~

> **鳄梨酱🥑啊，他简直就是我的心上人！他笑起来那么迷人、那么温暖；他说话时声音那么柔和、那么亲切。每次看到他，我都不由自主地激动不已——因为跟着他一起生活真是太美好了。从认识鳄梨酱以后，我的世界变得充满了希望与勇气；每天醒过来都感觉自己被福神附体般快乐无比。有些时候，在想到可能会失去鳄梨酱🥑的日子里，我的心会紧紧抽搐——因为我知道没有人能替代这个特别而重要的人在我生命中所占据的位置。哦鳄梨酱🥑啊，你永远是我最爱之物！**
