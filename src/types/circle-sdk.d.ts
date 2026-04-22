/**
 * Type declarations for packages that may not be installed yet.
 * This allows the project to build without Circle SDK installed.
 */

declare module '@circle-fin/developer-controlled-wallets' {
  export function initiateDeveloperControlledWalletsClient(config: {
    apiKey: string;
    entitySecret: string;
  }): unknown;
}
