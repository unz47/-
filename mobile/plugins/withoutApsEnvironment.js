const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * ローカル通知のみ使用（expo-notifications・週次インサイト）。
 * expo-notifications が prebuild で付ける `aps-environment`（＝リモートプッシュ/APNs 用の
 * Push Notifications capability）を削除する。リモート通知は使わず、無料 Apple ID では
 * この capability を有効化できないため、付いたままだと実機ビルドが署名で失敗する。
 * expo-notifications より後に適用すること（後勝ちで削除する）。
 */
module.exports = function withoutApsEnvironment(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["aps-environment"];
    return cfg;
  });
};
