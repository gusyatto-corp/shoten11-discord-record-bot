# 愚者と技術 vol.1 Oggから見るメディアファイルのなかみ

技術書典11にて頒布した [愚者と技術 vol.1](https://techbookfest.org/product/4650928265232384) 2章「Oggから見るメディアファイルのなかみ」のサンプルプロジェクトです。

Oggの生成に自前実装を用いたDiscord録音botのサンプルです。

node.js v14で動作確認済み

## プロジェクト構造


```
src
├── index.ts        DiscordBotの実装
└── ogg             oggの生成に関する実装
    ├── index.ts    Oggの実装
    ├── oggcrc.ts   Oggチェックサム計算
    ├── opus.ts     Opusストリームを持つOggの実装
    └── page.ts     Oggページの実装
```

## 実行

事前にDiscordBotを作成し、

- Voice/Connect
- Voice/Speech

の権限を持たせて任意のサーバに参加させておく必要があります。

```
$ yarn install
$ BOT_TOKEN="xxxxxxxxxx" yarn start
```
