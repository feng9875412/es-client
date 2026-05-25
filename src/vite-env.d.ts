/// <reference types="vite/client" />

declare module '@json2csv/plainjs' {
  export class Parser {
    constructor(opts?: Record<string, any>);
    parse(data: any): string;
  }
}
interface Window {
  mode: string,
  referrer: string,
}

interface ImportMetaEnv {
  // 发行版
  VITE_MODE: string;
  VITE_PLATFORM: string;
  VITE_REFERRER: string;
  VITE_HOMENAME: string;
}
