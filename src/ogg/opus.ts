import { Ogg } from ".";
import { OggPage } from "./page";

const OPUS_VERSION = 1;
const OPUS_BIT_STREAM_NUMBER = 1;

/**
 * Opusストリームを1つ持つOggファイルの実装
 */
export class OggOpus extends Ogg {
  granulePosition = 0;
  lastGranulePosition = 0;

  /**
   * @param channel 音声のチャンネル数
   * @param sampleRate 音声のサンプルレート
   */
  constructor(channel: number, sampleRate: number) {
    super();

    // OpusHeadの生成
    const magicSignature = Buffer.from("OpusHead", "ascii");
    const version = Buffer.from([OPUS_VERSION]);
    const channelCount = Buffer.from([channel]);
    const preSkip = Buffer.alloc(2);
    preSkip.writeInt16LE(3840); // pre-skip 推奨値
    const inputSampleRate = Buffer.alloc(4);
    inputSampleRate.writeUInt32LE(sampleRate);
    const gain = Buffer.from([0, 0]);
    const mappingFamiliy = Buffer.from([0]);

    const header = Buffer.concat([
      magicSignature,
      version,
      channelCount,
      preSkip,
      inputSampleRate,
      gain,
      mappingFamiliy,
    ]);

    // 初めのページとして追加
    this.append([header], OPUS_BIT_STREAM_NUMBER, 0);

    // OpusTags(メタ情報)の生成
    const opustags = Buffer.from("OpusTags", "ascii");
    const vendorString = Buffer.from("SIY1121_OggEncoder", "utf-8");
    const vendorStringLength = Buffer.alloc(4);
    vendorStringLength.writeUInt32LE(vendorString.byteLength);

    const userString = Buffer.from("foo", "utf-8");
    const userStringLength = Buffer.alloc(4);
    userStringLength.writeUInt32LE(userString.byteLength);

    const tags = Buffer.concat([
      opustags,
      vendorStringLength,
      vendorString,
      userStringLength,
      userString,
    ]);

    this.append([tags], OPUS_BIT_STREAM_NUMBER, 0);
  }

  tmpPackets: Buffer[] = [];

  /**
   * いくつのOpusパケットを一つのページに入れるか
   * （本来はページに含められる最大サイズを考慮する必要があるが、今回は決め打ち）
   */
  packCount = 10;

  /**
   * Opusパケットを追加する
   * @param packet 1つのOpusパケット
   * @param samples このパケットに含まれる音声サンプル数
   */
  appendOpusPacket(packet: Buffer, samples: number) {
    this.granulePosition += samples;
    if (this.tmpPackets.length === this.packCount) {
      this.append(
        this.tmpPackets,
        OPUS_BIT_STREAM_NUMBER,
        this.lastGranulePosition
      );
      this.tmpPackets = [packet];
      this.lastGranulePosition = this.granulePosition - samples;
    } else this.tmpPackets.push(packet);
  }

  /**
   * Oggファイルをファイルに書き込めるbyte列に変換
   */
  encode(): Buffer {
    // 残っているOpusパケットを追加
    if (this.tmpPackets.length > 0) {
      this.append(
        this.tmpPackets,
        OPUS_BIT_STREAM_NUMBER,
        this.lastGranulePosition
      );
      this.tmpPackets = [];
      this.lastGranulePosition = this.granulePosition;
    }
    return super.encode();
  }
}
