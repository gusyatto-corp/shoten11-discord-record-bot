import { crc } from "./oggcrc";

const CAPTURE_PATTERN = "OggS";
const VERSION = 0;

export enum HeaderType {
  HEADER_CONTINUE = 0b00000001, // 今回はパケットをページにまたがって格納しないため使わない
  HEADER_BOS = 0b000000010,
  HEADER_EOS = 0b000000100,
}

/**
 * Oggページの実装
 */
export class OggPage {
  version: number = 0;
  headerType: HeaderType[] = [];
  granulePosition: number = 0; // TODO BigInt
  bitStreamSerialNumber: number = 0;
  pageSequenceNumber: number = 0;
  checksum: number = 0;

  get pageSegments(): number {
    return this.segments.length;
  }

  get segmentTable(): Buffer {
    return Buffer.from(this.segments.map((s) => s.byteLength));
  }

  segments: Buffer[] = [];

  /**
   *
   * @param packets このページに詰めるパケット（複数個）
   * @param granulePosition ページのgranulePotision
   * @param bitStreamSerialNumber このページの論理ストリーム番号
   * @param pageSequenceNumber このページの連番
   */
  constructor(
    packets: Buffer[],
    granulePosition: number,
    bitStreamSerialNumber: number,
    pageSequenceNumber: number
  ) {
    this.granulePosition = granulePosition;
    this.pageSequenceNumber = pageSequenceNumber;
    this.bitStreamSerialNumber = bitStreamSerialNumber;

    /*
     個々のパケットを
     セグメントに詰める処理
     */
    packets.forEach((s) => {
      let remaining = s.byteLength;
      let pos = 0;
      while (remaining >= 0) {
        if (remaining >= 255) {
          // パケットサイズが255以上なら始めの255byteをセグメントに詰める
          this.segments.push(Buffer.from(s, pos, 255));
          remaining -= 255;
          pos += 255;
        } else {
          // 残りのパケットサイズが255未満なら1つのセグメントに詰めて終了
          this.segments.push(Buffer.from(s, pos, remaining));
          break;
        }
      }
    });
  }

  /**
   * このページをファイルに書き込めるbyte配列にしたものを返す
   */
  encode(): Buffer {
    // ページヘッダの生成
    const capturePattern = Buffer.from(CAPTURE_PATTERN, "ascii");
    const version = Buffer.from([0]);
    const headerType = Buffer.from([
      this.headerType.reduce((prev, curr) => prev | curr, 0),
    ]);
    const granulePosition = Buffer.alloc(8);

    granulePosition.writeBigInt64LE(BigInt(this.granulePosition));
    const bitStreamSerialNumber = Buffer.alloc(4);
    bitStreamSerialNumber.writeInt32LE(this.bitStreamSerialNumber, 0);
    const pageSequenceNumber = Buffer.alloc(4);
    pageSequenceNumber.writeInt32LE(this.pageSequenceNumber, 0);

    const initialChecksum = Buffer.alloc(4);

    const pageSegments = Buffer.from([this.pageSegments]);
    const segmentTable = this.segmentTable;

    // チェックサム計算
    const forChecksum = Buffer.concat([
      capturePattern,
      version,
      headerType,
      granulePosition,
      bitStreamSerialNumber,
      pageSequenceNumber,
      initialChecksum,
      pageSegments,
      segmentTable,
    ]);

    const checksum = Buffer.alloc(4);
    const headercs = crc(forChecksum, 0);
    const bodycs = crc(Buffer.concat(this.segments), headercs);
    checksum.writeInt32LE(bodycs);

    // ページヘッダとセグメントを結合して返す
    return Buffer.concat([
      capturePattern,
      version,
      headerType,
      granulePosition,
      bitStreamSerialNumber,
      pageSequenceNumber,
      checksum,
      pageSegments,
      segmentTable,
      ...this.segments,
    ]);
  }
}
