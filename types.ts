export interface VaultFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: Blob;
  createdAt: number;
}

export enum AuthMode {
  LOADING = 'LOADING',
  SETUP = 'SETUP',
  LOGIN = 'LOGIN',
  RECOVERY = 'RECOVERY',
  UNLOCKED = 'UNLOCKED'
}

export interface UserConfig {
  key: string;
  value: any;
}
