import { fiatCurrencies, stableCoins } from './currency';

export enum TradeType {
  UNKNOWN,
  BUY = 'Buy',
  SELL = 'Sell',
}

export class Trade {
  date: Date = new Date();
  assetName: string = '';
  price: number = 0;
  volume: number = 0;
  totalAmount: number = 0;
  tradeType: TradeType = TradeType.UNKNOWN;
  currency: string = '';
  fee: number = 0;

  constructor(header: string[], tradeRecord: string[]) {
    this.parseTradeRecord(header, tradeRecord);
  }

  private parseTradeRecord(header: string[], tradeRecord: string[]) {
    const marketIndex = header.indexOf('Market');
    const priceIndex = header.indexOf('Price');
    const volumeIndex = header.indexOf('Volume');
    const totalIndex = header.indexOf('Total (Price x Volume)');
    const tradeTypeIndex = header.indexOf('Trade Type');
    const currencyIndex = header.indexOf('Fee Paid in');
    const feeIndex = header.indexOf('Fee Amount');

    const market = tradeRecord[marketIndex];
    this.assetName = this.getAsset(market);
    this.currency = tradeRecord[currencyIndex];
    this.price = this.toInr(parseFloat(tradeRecord[priceIndex]));
    this.volume = parseFloat(tradeRecord[volumeIndex]);
    this.totalAmount = this.toInr(parseFloat(tradeRecord[totalIndex]));
    this.tradeType = this.getTradeType(tradeRecord[tradeTypeIndex]);
    this.fee = this.toInr(parseFloat(tradeRecord[feeIndex]));
  }

  private getAsset(market: string) {
    for (const currency of stableCoins.concat(fiatCurrencies)) {
      market = market.replace(currency, '');
    }

    return market;
  }

  private toInr(amount: number) {
    if (this.currency === 'INR') {
      return amount;
    }

    // TODO: get USDT and USD to INR price rates via API
    const currencyRates = { USDT: 75 };

    //@ts-ignore
    return currencyRates[this.currency] * amount;
  }

  private getTradeType(tradeType: string): TradeType {
    switch (tradeType) {
      case TradeType.BUY:
        return TradeType.BUY;

      case TradeType.SELL:
        return TradeType.SELL;

      default:
        return TradeType.UNKNOWN;
    }
  }
}
