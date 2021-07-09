import Discord from "discord.js";
import { OggOpus } from "./ogg/opus";
import fs from "fs";
import { Readable } from "stream";

const client = new Discord.Client();

client.once("ready", () => {
  console.log(
    "準備完了\nbotが閲覧できる任意のテキストチャンネルで「join」と入力してください"
  );
});

// Discordから流れてくるOpusパケットは2ch 48000Hzと決め打ちされている
const oggOpus = new OggOpus(2, 48000);

let connection: Discord.VoiceConnection;
let audioStream: Readable;

client.on("message", async (message) => {
  // 1. joinメッセージを飛ばしたユーザーがボイスちゃんねるに参加していたらbotもそこに参加
  if (message.content === "join" && message.member?.voice.channel) {
    connection = await message.member.voice.channel.join();
    // 2. Opusパケットが流れてくるStreamを取得
    audioStream = connection.receiver.createStream(message.member, {
      mode: "opus",
      end: "manual",
    });
    audioStream.on("data", (packet) => {
      // 3. OggOpusクラスにパケットを追加
      oggOpus.appendOpusPacket(packet, 960);
    });
    audioStream.on("close", () => {
      // 4. 音声ストリームが閉じたら今までのデータを record.ogg として保存
      fs.writeFileSync("./record.ogg", oggOpus.encode());
    });
    console.log(
      `${message.member.displayName}の音声を録音しています（終了するにはテキストチャンネルで「leave」と入力してください）`
    );
  } else if (message.content === "leave") {
    // leaveメッセージを感知したら通話から離脱
    audioStream.destroy();
    connection.disconnect();
  }
});

if (!process.env.BOT_TOKEN) {
  console.log("BOT_TOKEN 環境変数を指定してください");
  process.exit(1);
}
client.login(process.env.BOT_TOKEN);
