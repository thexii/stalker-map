import { TraderSectionBuyConfig, TraderSectionDicountConfig, TraderSectionSellConfig, TraderSectionSupplyConfig } from "./trader-section-configs";

export class TraderSectionsConfig {
  public trader: string;
  public sell: TraderSectionSellConfig[];
  public buy: TraderSectionBuyConfig[];
  public supply: TraderSectionSupplyConfig[];
  public discount: TraderSectionDicountConfig[];
/*"tarder": "escape_trader_name",
      "sell": [
        {
          "condition": "",
          "enabledBuies": [""],
          "enabledSupplies": [""]
        },
        {
          "condition": "esc_bring_habar_complete",
          "enabledBuies": ["esc_bring_habar_complete"],
          "enabledSupplies": ["esc_bring_habar_complete", "gar_story_got_info_from_digger"]
        }
      ],
      "buy": [
        {
          "condition": "",
          "enabledSells": [""],
          "enabledSupplies": [""]
        },
        {
          "condition": "esc_bring_habar_complete",
          "enabledSells": ["esc_bring_habar_complete"],
          "enabledSupplies": ["esc_bring_habar_complete", "gar_story_got_info_from_digger"]
        }
      ],
      "supply": [
        {
          "condition": "",
          "enabledSells": [""],
          "enabledBuies": [""]
        },
        {
          "condition": "esc_bring_habar_complete",
          "enabledSells": ["esc_bring_habar_complete"],
          "enabledBuies": ["esc_bring_habar_complete"]
        },
        {
          "condition": "gar_story_got_info_from_digger",
          "enabledSells": ["esc_bring_habar_complete"],
          "enabledBuies": ["esc_bring_habar_complete"]
        }
      ]*/
}
