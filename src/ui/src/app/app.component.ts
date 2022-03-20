import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { Trade, TradeType } from './trade';

type portfolioSummary = {
  assets: Map<string, assetSummary>; // key: asset name, value: assetSummary
  investedAmout: number;
  currentAmout: number;
  profitLossAmount: number;
  profitLossPercentage: number;
};

type assetSummary = {
  name: string;
  volume: number;
  investedAmout: number;
  currentAmout?: number;
  averageCostPrice: number; // Average cost price of each token when purchased
  currentMarketPrice?: number; // Current market price of each token
  profitLossAmount?: number;
  profitLossPercentage?: number;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private portfolio: portfolioSummary = {
    assets: new Map<string, assetSummary>(),
    investedAmout: 0,
    currentAmout: 0,
    profitLossAmount: 0,
    profitLossPercentage: 0,
  };

  // TODO: calculate realized value per year and overall
  public realizedProfitLoss = 0;
  public totalFees = 0;

  public doneParsingReport = true;

  public onFileChanged(fileChangeEvent: any) {
    const file = fileChangeEvent.target.files[0];

    const reader: FileReader = new FileReader();
    reader.onload = (fileLoadEvent: any) => this.onFileLoad(fileLoadEvent);
    reader.readAsBinaryString(file);
  }

  private onFileLoad(fileLoadEvent: any) {
    const binarystring: string = fileLoadEvent.target.result;
    const workbook = XLSX.read(binarystring, { type: 'binary' });

    const sheetName = 'Exchange Trades';
    const worksheet = workbook.Sheets[sheetName];

    /* save data */
    const data = XLSX.utils.sheet_to_json(worksheet, {
      blankrows: false,
      header: 1,
      raw: true,
      rawNumbers: true,
    }); // to get 2d array pass 2nd parameter as object {header: 1}

    this.parseReport(data);
  }

  private parseReport(data: any[]) {
    this.doneParsingReport = false;

    /**
     * 1. Realized Profit/Loss on each crypto and in total
     * 2. Unrealized Profit/Loss on each crypto and in total (use api https://coinmarketcap.com/api/documentation/v1/ )
     */
    const header: string[] = data[0];

    for (let index = data.length - 1; index > 0; --index) {
      const trade = new Trade(header, data[index]);

      // For instance when market is USDTINR, getAsset() method would return empty string
      if (trade.assetName === '') {
        continue;
      }

      this.totalFees += trade.fee

      if (trade.tradeType === TradeType.BUY) {
        this.buy(trade);
      } else if (trade.tradeType === TradeType.SELL) {
        this.sell(trade);
      }

      console.log('realized profit / loss:', this.realizedProfitLoss);
    }

    this.doneParsingReport = true;
  }

  private buy(trade: Trade) {
    let asset: assetSummary;

    if (this.portfolio.assets.has(trade.assetName)) {
      asset = this.portfolio.assets.get(trade.assetName)!;
      asset.volume += trade.volume;
      asset.investedAmout += trade.totalAmount;
      asset.averageCostPrice = asset.investedAmout / asset.volume;
    } else {
      asset = {
        name: trade.assetName,
        volume: trade.volume,
        investedAmout: trade.totalAmount,
        averageCostPrice: trade.totalAmount / trade.volume,
      };
    }

    console.log('bought:', asset);

    this.portfolio.assets.set(trade.assetName, asset);
  }

  private sell(trade: Trade) {
    const asset = this.portfolio.assets.get(trade.assetName)!;

    this.realizedProfitLoss +=
      (trade.price - asset.averageCostPrice) * trade.volume;

    console.log('sold:', trade);

    asset.volume -= trade.volume;
    asset.investedAmout = asset.volume * asset.averageCostPrice;
    asset.averageCostPrice = asset.investedAmout / asset.volume;

    asset.volume === 0
      ? this.portfolio.assets.delete(trade.assetName)
      : this.portfolio.assets.set(trade.assetName, asset);
  }
}
