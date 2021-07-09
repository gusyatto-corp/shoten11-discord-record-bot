import { HeaderType, OggPage } from "./page";

/**
 * Oggファイルの実装
 */
export class Ogg {
  // Oggファイルは複数個のOggページから構成される
  pages: OggPage[] = [];
  // 連番保持用
  pageSeq: { [bitStreamSerialNumber: number]: number } = {};

  /**
   * ページを追加する
   * @param packets ページに含まれるパケット
   * @param bitStreamSerialNumber 論理ストリーム番号
   * @param granulePosition 再生位置
   */
  append(
    packets: Buffer[],
    bitStreamSerialNumber: number,
    granulePosition: number
  ) {
    const isFirstPage =
      typeof this.pageSeq[bitStreamSerialNumber] === "undefined";
    if (isFirstPage) {
      this.pageSeq[bitStreamSerialNumber] = 0;
    }

    const page = new OggPage(
      packets,
      granulePosition,
      bitStreamSerialNumber,
      this.pageSeq[bitStreamSerialNumber]
    );

    if (isFirstPage) page.headerType = [HeaderType.HEADER_BOS];

    this.pages.push(page);
    this.pageSeq[bitStreamSerialNumber]++;
  }

  /**
   * Oggファイルをファイルに書き込めるbyte列に変換
   */
  encode(): Buffer {
    // 論理ストリーム内で最終ページ達にHEADER_EOSをつける
    let pageFlag: { [bitStreamSerialNumber: number]: boolean } = {};
    Object.keys(this.pageSeq).forEach(
      (bitStreamSerialNumber) =>
        (pageFlag[parseInt(bitStreamSerialNumber)] = false)
    );
    for (let i = this.pages.length - 1; i >= 0; i++) {
      if (!pageFlag[this.pages[i].bitStreamSerialNumber]) {
        this.pages[i].headerType = [HeaderType.HEADER_EOS];
        pageFlag[this.pages[i].bitStreamSerialNumber] = true;
      }
      // すべての論理ストリームの最終ページにEOSをつけ終わったら早期離脱
      if (Object.values(pageFlag).every((v) => v)) break;
    }
    return Buffer.concat(this.pages.map((p) => p.encode()));
  }
}
