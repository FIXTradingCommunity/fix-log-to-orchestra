export interface GitStandardFile {
  download_url: string;
  git_url: string;
  html_url: string;
  name: string;
  path: string;
  sha: string;
  size: number;
  type: string;
  url: string;
  _links: any;
}

export interface FixStandardFile extends Blob {
  path?: string;
  name?: string;
}

export interface IDecodedUserData {
  at_hash: string;
  sub: string;
  firstname: string;
  Employer: string;
  "Zip/Postcode": string | null;
  iss: string;
  groups: string[] | null;
  Title: null;
  Website: null;
  "State/Region": string | null;
  "City": string | null;
  "Street Address 1": string | null;
  "Job Title": string | null;
  nonce: string | null;
  "Street Address 2": string | null;
  lastname: string;
  aud: string[];
  auth_time: string;
  Country: string | null;
  exp: number;
  iat: number;
  email: string;
}

export interface IDecoded {
  exp?: number;
}

export interface ErrorMsg {
  title: string,
  message: string
}